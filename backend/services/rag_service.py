from typing import Dict, List, Optional

from django.conf import settings
from django.utils import timezone
from groq import Groq

from apps.operating_rooms.models import Patient
from services.clinical_notes_service import (
    ClinicalNoteEmbeddingBuilder,
    ClinicalNoteSearchService,
    ClinicalNoteSyncService
)


SYSTEM_PROMPT = (
    "Jsi asistent pro perioperační péči. Pracuješ pouze s poskytnutým kontextem, "
    "odpovídáš česky, stručně a vždy uveď odkazy na poznámky ve tvaru [N], kde N odpovídá "
    "číslování poznámek v zadaném kontextu. Pokud informace chybí, otevřeně to přiznej."
)


class ClinicalNoteRAGService:
    """End-to-end RAG orchestrátor pro pacienta."""

    def __init__(
        self,
        search_service: Optional[ClinicalNoteSearchService] = None,
        sync_service: Optional[ClinicalNoteSyncService] = None,
        embedding_builder: Optional[ClinicalNoteEmbeddingBuilder] = None,
        groq_client: Optional[Groq] = None,
    ):
        if not settings.GROQ_API_KEY:
            raise RuntimeError("Není nastaven GROQ_API_KEY – nelze generovat AI přehled.")

        self.search_service = search_service or ClinicalNoteSearchService()
        self.sync_service = sync_service or ClinicalNoteSyncService()
        self.embedding_builder = embedding_builder or ClinicalNoteEmbeddingBuilder()
        self.client = groq_client or Groq(api_key=settings.GROQ_API_KEY)
        self.model_name = getattr(settings, 'GROQ_MODEL_NAME', 'meta-llama/llama-4-scout-17b-16e-instruct')

    def generate_patient_summary(
        self,
        patient: Patient,
        question: str,
        refresh: bool = False,
        top_k: int = 4
    ) -> Dict[str, any]:
        refresh_stats = None
        if refresh or not patient.clinical_notes.exists():
            refresh_stats = self.sync_service.sync_patient(patient)
            if refresh_stats.get('pending_embedding'):
                self.embedding_builder.build_for_patient(patient)

        search_output = self.search_service.search(patient, question, top_k=top_k)
        sources = search_output.get('results', [])

        if not sources:
            return {
                'answer': "V dostupných klinických poznámkách nebyly nalezeny žádné informace k položenému dotazu.",
                'sources': [],
                'available': search_output.get('available', 0),
                'refreshed': bool(refresh_stats),
                'refresh_stats': refresh_stats,
                'generated_at': timezone.now().isoformat(),
            }

        answer = self._call_groq(patient, question, sources)

        public_sources = [
            {
                'note_id': item['note_id'],
                'fhir_document_id': item['fhir_document_id'],
                'category': item['category'],
                'doc_status': item['doc_status'],
                'author': item['author'],
                'indexed_at': item['indexed_at'],
                'score': round(item['score'], 4),
                'excerpt': item['excerpt'],
                'source_reference': item['source_reference'],
            }
            for item in sources
        ]

        return {
            'answer': answer,
            'sources': public_sources,
            'available': search_output.get('available', 0),
            'refreshed': bool(refresh_stats),
            'refresh_stats': refresh_stats,
            'generated_at': timezone.now().isoformat(),
        }

    def _call_groq(self, patient: Patient, question: str, sources: List[Dict]) -> str:
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": self._build_prompt(patient, question, sources)
            }
        ]

        completion = self.client.chat.completions.create(
            model=self.model_name,
            messages=messages,
            temperature=0.3,
            max_completion_tokens=800,
            top_p=1,
            stream=False,
        )

        choice = completion.choices[0]
        return choice.message.content.strip() if choice.message and choice.message.content else ''

    @staticmethod
    def _build_prompt(patient: Patient, question: str, sources: List[Dict]) -> str:
        patient_line = f"Pacient: {patient.first_name} {patient.last_name}"
        if patient.date_of_birth:
            patient_line += f", narozen {patient.date_of_birth.isoformat()}"

        context_blocks = []
        for idx, item in enumerate(sources, 1):
            header = f"[{idx}] Kategorie: {item.get('category') or 'Neuvedeno'}; Autor: {item.get('author') or 'Neuvedeno'}; Datum: {item.get('indexed_at') or 'Neuvedeno'}"
            context_blocks.append(f"{header}\n{item.get('content', '')}")

        context_text = "\n\n".join(context_blocks)

        return (
            f"{patient_line}\n"
            f"Dotaz: {question}\n\n"
            f"Relevantní klinické poznámky:\n{context_text}\n\n"
            "Odpověz česky, strukturovaně (max tři odstavce) a přidej citace ke konkrétním poznámkám."
        )
