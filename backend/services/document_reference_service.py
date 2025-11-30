import base64
from datetime import datetime
from typing import Any, Dict, List, Optional

from services.fhir_service import FHIRService


class DocumentReferenceService:
    """Načítá a dekóduje DocumentReference resources z FHIR serveru (IRIS)."""

    def __init__(self, fhir_service: Optional[FHIRService] = None):
        self.fhir_service = fhir_service or FHIRService()

    def fetch_patient_notes(self, patient_fhir_id: str, limit: int = 200) -> List[Dict[str, Any]]:
        """Vrátí dekódované klinické poznámky pro daného pacienta."""
        if not patient_fhir_id:
            return []

        params = {
            'subject': f'Patient/{patient_fhir_id}',
            '_count': limit,
            '_sort': '-_lastUpdated'
        }
        bundle = self.fhir_service.search_document_references(params)
        collected = self._bundle_to_notes(bundle)

        next_link = self._get_next_link(bundle)
        while next_link:
            bundle = self.fhir_service._make_request('GET', next_link)
            collected.extend(self._bundle_to_notes(bundle))
            next_link = self._get_next_link(bundle)

        return collected

    def _bundle_to_notes(self, bundle: Optional[Dict[str, Any]]) -> List[Dict[str, Any]]:
        if not bundle:
            return []
        notes: List[Dict[str, Any]] = []
        for entry in bundle.get('entry', []):
            resource = entry.get('resource', {})
            attachment = self._extract_attachment(resource)
            if not attachment:
                continue

            text = self._decode_attachment(attachment)
            if not text:
                continue

            notes.append({
                'fhir_id': resource.get('id'),
                'doc_status': resource.get('docStatus'),
                'category': self._extract_category(resource),
                'author': self._extract_author(resource),
                'indexed_at': self._parse_datetime(resource.get('indexed')),
                'note_text': text.strip(),
                'source_reference': attachment.get('url') or attachment.get('title', ''),
                'raw_resource': resource,
            })
        return notes

    @staticmethod
    def _extract_attachment(resource: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        contents = resource.get('content') or []
        if not contents:
            return None
        return contents[0].get('attachment')

    @staticmethod
    def _decode_attachment(attachment: Dict[str, Any]) -> str:
        data = attachment.get('data')
        if not data:
            return ''
        try:
            decoded = base64.b64decode(data, validate=False)
            charset = attachment.get('charset', 'utf-8')
            return decoded.decode(charset, errors='ignore')
        except (ValueError, UnicodeDecodeError):
            return ''

    @staticmethod
    def _extract_category(resource: Dict[str, Any]) -> str:
        categories = resource.get('category') or []
        if not categories:
            return ''
        coding = categories[0].get('coding') or []
        if coding:
            display = coding[0].get('display')
            if display:
                return display
            code = coding[0].get('code')
            if code:
                return code
        return categories[0].get('text', '')

    @staticmethod
    def _extract_author(resource: Dict[str, Any]) -> str:
        authors = resource.get('author') or []
        if not authors:
            return ''
        author = authors[0]
        if 'display' in author:
            return author['display']
        if 'reference' in author:
            return author['reference']
        return ''

    @staticmethod
    def _parse_datetime(value: Optional[str]) -> Optional[datetime]:
        if not value:
            return None
        try:
            return datetime.fromisoformat(value.replace('Z', '+00:00'))
        except ValueError:
            return None

    @staticmethod
    def _get_next_link(bundle: Optional[Dict[str, Any]]) -> Optional[str]:
        if not bundle:
            return None
        for link in bundle.get('link', []):
            if link.get('relation') == 'next':
                return link.get('url')
        return None
