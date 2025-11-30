import hashlib
import logging
from dataclasses import dataclass
from typing import Dict, Iterable, List, Optional, Sequence

import numpy as np
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.operating_rooms.models import Patient, PatientClinicalNote
from services.document_reference_service import DocumentReferenceService

try:
    from sentence_transformers import SentenceTransformer
except ImportError:  # pragma: no cover - handled runtime
    SentenceTransformer = None

logger = logging.getLogger(__name__)


def chunk_list(items: Sequence, size: int) -> Iterable[Sequence]:
    for idx in range(0, len(items), size):
        yield items[idx:idx + size]


class NoteEmbeddingService:
    """Zodpovídá za výpočet embeddingů pro klinické poznámky."""

    _model = None
    _model_name = None

    def __init__(self, model_name: Optional[str] = None):
        self.model_name = model_name or getattr(settings, 'NOTE_EMBEDDING_MODEL', 'all-MiniLM-L6-v2')

    def _ensure_model(self):
        if SentenceTransformer is None:
            raise RuntimeError("Knihovna sentence-transformers není nainstalována – spusťte pip install sentence-transformers.")
        if NoteEmbeddingService._model is None or NoteEmbeddingService._model_name != self.model_name:
            logger.info("Načítám embedding model %s", self.model_name)
            NoteEmbeddingService._model = SentenceTransformer(self.model_name)
            NoteEmbeddingService._model_name = self.model_name
        return NoteEmbeddingService._model

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        model = self._ensure_model()
        vectors = model.encode(
            texts,
            normalize_embeddings=True,
            show_progress_bar=False,
        )
        return vectors.tolist()

    def embed_text(self, text: str) -> List[float]:
        return self.embed_texts([text])[0]


@dataclass
class SyncStats:
    created: int = 0
    updated: int = 0
    unchanged: int = 0

    def as_dict(self) -> Dict[str, int]:
        total = self.created + self.updated + self.unchanged
        return {
            'created': self.created,
            'updated': self.updated,
            'unchanged': self.unchanged,
            'total': total,
            'pending_embedding': self.created + self.updated,
        }


class ClinicalNoteSyncService:
    """Zajistí načtení DocumentReference z FHIR a uložení do DB."""

    def __init__(self, document_service: Optional[DocumentReferenceService] = None):
        self.document_service = document_service or DocumentReferenceService()

    def sync_patient(self, patient: Patient) -> Dict[str, int]:
        if not patient.fhir_id:
            return {'created': 0, 'updated': 0, 'unchanged': 0, 'total': 0, 'pending_embedding': 0}

        notes = self.document_service.fetch_patient_notes(patient.fhir_id)
        stats = SyncStats()

        for note in notes:
            self._upsert_note(patient, note, stats)

        logger.info(
            "Synchronizace klinických poznámek pacienta %s dokončena: %s",
            patient.id,
            stats.as_dict(),
        )
        return stats.as_dict()

    @staticmethod
    def _hash_text(text: str) -> str:
        return hashlib.sha256(text.encode('utf-8')).hexdigest()

    @transaction.atomic
    def _upsert_note(self, patient: Patient, note_payload: Dict, stats: SyncStats) -> None:
        note_hash = self._hash_text(note_payload['note_text'])
        defaults = {
            'note_text': note_payload['note_text'],
            'note_hash': note_hash,
            'doc_status': note_payload.get('doc_status') or '',
            'category': note_payload.get('category') or '',
            'author': note_payload.get('author') or '',
            'indexed_at': note_payload.get('indexed_at'),
            'source_reference': note_payload.get('source_reference') or '',
            'source_payload': note_payload.get('raw_resource'),
        }

        try:
            note = PatientClinicalNote.objects.get(
                patient=patient,
                fhir_document_id=note_payload['fhir_id']
            )
            text_changed = note.note_hash != note_hash
            for field, value in defaults.items():
                setattr(note, field, value)
            if text_changed:
                note.embedding = None
                note.embedding_model = ''
                note.embedding_last_updated = None
                note.sync_status = 'pending'
                stats.updated += 1
            else:
                stats.unchanged += 1
            note.save()
        except PatientClinicalNote.DoesNotExist:
            PatientClinicalNote.objects.create(
                patient=patient,
                fhir_document_id=note_payload['fhir_id'],
                **defaults,
                embedding=None,
                embedding_model='',
                embedding_last_updated=None,
                sync_status='pending',
            )
            stats.created += 1


class ClinicalNoteEmbeddingBuilder:
    """Spočítá embeddingy pro poznámky čekající na zpracování."""

    def __init__(
        self,
        embedding_service: Optional[NoteEmbeddingService] = None,
        batch_size: Optional[int] = None
    ):
        self.embedding_service = embedding_service or NoteEmbeddingService()
        self.batch_size = batch_size or getattr(settings, 'NOTE_EMBEDDING_BATCH_SIZE', 16)

    def build_for_patient(self, patient: Patient) -> Dict[str, int]:
        notes = list(
            PatientClinicalNote.objects.filter(
                patient=patient,
                sync_status__in=['pending', 'failed']
            ).order_by('id')
        )
        return self._process_notes(notes)

    def build_for_notes(self, note_ids: List[int]) -> Dict[str, int]:
        notes = list(
            PatientClinicalNote.objects.filter(id__in=note_ids).order_by('id')
        )
        return self._process_notes(notes)

    def _process_notes(self, notes: List[PatientClinicalNote]) -> Dict[str, int]:
        if not notes:
            return {'processed': 0, 'failed': 0}

        processed = 0
        failed = 0
        for batch in chunk_list(notes, self.batch_size):
            texts = [note.note_text for note in batch]
            try:
                vectors = self.embedding_service.embed_texts(texts)
            except Exception as exc:  # pragma: no cover - log and retry later
                logger.exception("Výpočet embeddingů selhal: %s", exc)
                for note in batch:
                    note.sync_status = 'failed'
                    note.save(update_fields=['sync_status'])
                    failed += 1
                continue

            now = timezone.now()
            for note, vector in zip(batch, vectors):
                note.embedding = [float(x) for x in vector]
                note.embedding_model = self.embedding_service.model_name
                note.embedding_last_updated = now
                note.sync_status = 'ready'
                note.save(update_fields=[
                    'embedding',
                    'embedding_model',
                    'embedding_last_updated',
                    'sync_status',
                ])
                processed += 1

        logger.info("Embeddingy spočítány pro %s poznámek, chybné: %s", processed, failed)
        return {'processed': processed, 'failed': failed}


class ClinicalNoteSearchService:
    """Provádí semantické vyhledávání nad embedded poznámkami."""

    def __init__(self, embedding_service: Optional[NoteEmbeddingService] = None):
        self.embedding_service = embedding_service or NoteEmbeddingService()

    def search(self, patient: Patient, question: str, top_k: int = 3) -> Dict[str, List[Dict]]:
        notes = list(
            PatientClinicalNote.objects.filter(
                patient=patient,
                sync_status='ready',
                embedding__isnull=False
            ).order_by('-indexed_at')
        )
        if not notes:
            return {'results': [], 'available': 0}

        query_vec = np.array(self.embedding_service.embed_text(question))
        scored = []
        for note in notes:
            vector = np.array(note.embedding or [])
            if vector.size == 0:
                continue
            score = float(np.dot(query_vec, vector))
            scored.append({
                'note_id': note.id,
                'fhir_document_id': note.fhir_document_id,
                'score': score,
                'category': note.category,
                'doc_status': note.doc_status,
                'author': note.author,
                'indexed_at': note.indexed_at.isoformat() if note.indexed_at else None,
                'excerpt': note.note_text[:600],
                'content': note.note_text,
                'source_reference': note.source_reference,
            })

        scored.sort(key=lambda item: item['score'], reverse=True)
        return {
            'results': scored[:top_k],
            'available': len(scored),
        }
