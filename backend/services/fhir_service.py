import logging
import requests
from datetime import datetime
from typing import Dict, List, Optional, Any
from django.conf import settings

logger = logging.getLogger(__name__)


class FHIRService:
    """Service pro komunikaci s IRIS FHIR serverem"""
    
    def __init__(self, base_url: Optional[str] = None):
        self.base_url = base_url or getattr(
            settings, 
            'FHIR_SERVER_URL', 
            'http://fhir-server:52773/fhir/r4'
        )
        self.headers = {
            'Accept': 'application/fhir+json',
            'Content-Type': 'application/fhir+json;charset=UTF-8'
        }
        logger.info(f"FHIR Service initialized with base URL: {self.base_url}")
    
    def _make_request(self, method: str, endpoint: str, data: Optional[Dict] = None) -> Optional[Dict]:
        """Provede HTTP request na FHIR server"""
        if endpoint.startswith('http'):
            url = endpoint
        else:
            base = self.base_url.rstrip('/')
            url = f"{base}/{endpoint.lstrip('/')}"
        try:
            response = requests.request(
                method=method,
                url=url,
                json=data,
                headers=self.headers,
                timeout=30
            )
            response.raise_for_status()
            return response.json() if response.content else None
        except requests.exceptions.RequestException as e:
            logger.error(f"FHIR request failed: {method} {url} - {str(e)}")
            raise
    
    # ==================== PATIENT OPERATIONS ====================
    
    def get_patient(self, fhir_id: str) -> Optional[Dict]:
        """Načte pacienta z FHIR serveru"""
        return self._make_request('GET', f'Patient/{fhir_id}')
    
    def search_patients(self, params: Optional[Dict] = None) -> Dict:
        """Vyhledá pacienty podle parametrů"""
        query_string = '&'.join([f"{k}={v}" for k, v in (params or {}).items()])
        endpoint = f'Patient?{query_string}' if query_string else 'Patient'
        return self._make_request('GET', endpoint)
    
    def create_patient(self, patient_data: Dict) -> Dict:
        """Vytvoří nového pacienta v FHIR serveru"""
        return self._make_request('POST', 'Patient', patient_data)
    
    def update_patient(self, fhir_id: str, patient_data: Dict) -> Dict:
        """Aktualizuje pacienta v FHIR serveru"""
        return self._make_request('PUT', f'Patient/{fhir_id}', patient_data)
    
    def delete_patient(self, fhir_id: str) -> None:
        """Smaže pacienta z FHIR serveru"""
        self._make_request('DELETE', f'Patient/{fhir_id}')
    
    # ==================== PRACTITIONER OPERATIONS ====================
    
    def get_practitioner(self, fhir_id: str) -> Optional[Dict]:
        """Načte praktikujícího lékaře z FHIR serveru"""
        return self._make_request('GET', f'Practitioner/{fhir_id}')
    
    def search_practitioners(self, params: Optional[Dict] = None) -> Dict:
        """Vyhledá praktikující lékaře"""
        query_string = '&'.join([f"{k}={v}" for k, v in (params or {}).items()])
        endpoint = f'Practitioner?{query_string}' if query_string else 'Practitioner'
        return self._make_request('GET', endpoint)
    
    def create_practitioner(self, practitioner_data: Dict) -> Dict:
        """Vytvoří nového praktikujícího lékaře"""
        return self._make_request('POST', 'Practitioner', practitioner_data)
    
    def update_practitioner(self, fhir_id: str, practitioner_data: Dict) -> Dict:
        """Aktualizuje praktikujícího lékaře"""
        return self._make_request('PUT', f'Practitioner/{fhir_id}', practitioner_data)
    
    # ==================== LOCATION OPERATIONS ====================
    
    def get_location(self, fhir_id: str) -> Optional[Dict]:
        """Načte lokaci (operační sál) z FHIR serveru"""
        return self._make_request('GET', f'Location/{fhir_id}')
    
    def search_locations(self, params: Optional[Dict] = None) -> Dict:
        """Vyhledá lokace"""
        query_string = '&'.join([f"{k}={v}" for k, v in (params or {}).items()])
        endpoint = f'Location?{query_string}' if query_string else 'Location'
        return self._make_request('GET', endpoint)
    
    def create_location(self, location_data: Dict) -> Dict:
        """Vytvoří novou lokaci (operační sál)"""
        return self._make_request('POST', 'Location', location_data)
    
    def update_location(self, fhir_id: str, location_data: Dict) -> Dict:
        """Aktualizuje lokaci"""
        return self._make_request('PUT', f'Location/{fhir_id}', location_data)
    
    # ==================== PROCEDURE OPERATIONS ====================
    
    def get_procedure(self, fhir_id: str) -> Optional[Dict]:
        """Načte proceduru (operaci) z FHIR serveru"""
        return self._make_request('GET', f'Procedure/{fhir_id}')
    
    def search_procedures(self, params: Optional[Dict] = None) -> Dict:
        """Vyhledá procedury"""
        query_string = '&'.join([f"{k}={v}" for k, v in (params or {}).items()])
        endpoint = f'Procedure?{query_string}' if query_string else 'Procedure'
        return self._make_request('GET', endpoint)
    
    def create_procedure(self, procedure_data: Dict) -> Dict:
        """Vytvoří novou proceduru (operaci)"""
        return self._make_request('POST', 'Procedure', procedure_data)
    
    def update_procedure(self, fhir_id: str, procedure_data: Dict) -> Dict:
        """Aktualizuje proceduru"""
        return self._make_request('PUT', f'Procedure/{fhir_id}', procedure_data)
    
    # ==================== DEVICE OPERATIONS ====================
    
    def get_device(self, fhir_id: str) -> Optional[Dict]:
        """Načte zařízení (přístroj) z FHIR serveru"""
        return self._make_request('GET', f'Device/{fhir_id}')
    
    def search_devices(self, params: Optional[Dict] = None) -> Dict:
        """Vyhledá zařízení"""
        query_string = '&'.join([f"{k}={v}" for k, v in (params or {}).items()])
        endpoint = f'Device?{query_string}' if query_string else 'Device'
        return self._make_request('GET', endpoint)
    
    def create_device(self, device_data: Dict) -> Dict:
        """Vytvoří nové zařízení"""
        return self._make_request('POST', 'Device', device_data)
    
    def update_device(self, fhir_id: str, device_data: Dict) -> Dict:
        """Aktualizuje zařízení"""
        return self._make_request('PUT', f'Device/{fhir_id}', device_data)
    
    # ==================== SUPPLY DELIVERY OPERATIONS ====================
    
    def get_supply_delivery(self, fhir_id: str) -> Optional[Dict]:
        """Načte dodávku materiálu z FHIR serveru"""
        return self._make_request('GET', f'SupplyDelivery/{fhir_id}')
    
    def search_supply_deliveries(self, params: Optional[Dict] = None) -> Dict:
        """Vyhledá dodávky materiálu"""
        query_string = '&'.join([f"{k}={v}" for k, v in (params or {}).items()])
        endpoint = f'SupplyDelivery?{query_string}' if query_string else 'SupplyDelivery'
        return self._make_request('GET', endpoint)
    
    def create_supply_delivery(self, supply_data: Dict) -> Dict:
        """Vytvoří novou dodávku materiálu"""
        return self._make_request('POST', 'SupplyDelivery', supply_data)
    
    # ==================== DOCUMENT REFERENCE ====================
    
    def get_document_reference(self, fhir_id: str) -> Optional[Dict]:
        """Načte DocumentReference resource"""
        return self._make_request('GET', f'DocumentReference/{fhir_id}')
    
    def search_document_references(self, params: Optional[Dict] = None) -> Dict:
        """Vyhledá DocumentReference resources podle parametrů"""
        query_string = '&'.join([f"{k}={v}" for k, v in (params or {}).items()])
        endpoint = f'DocumentReference?{query_string}' if query_string else 'DocumentReference'
        return self._make_request('GET', endpoint)
    
    # ==================== APPOINTMENT OPERATIONS ====================
    
    def get_appointment(self, fhir_id: str) -> Optional[Dict]:
        """Načte appointment z FHIR serveru"""
        return self._make_request('GET', f'Appointment/{fhir_id}')
    
    def search_appointments(self, params: Optional[Dict] = None) -> Dict:
        """Vyhledá appointments"""
        query_string = '&'.join([f"{k}={v}" for k, v in (params or {}).items()])
        endpoint = f'Appointment?{query_string}' if query_string else 'Appointment'
        return self._make_request('GET', endpoint)
    
    def create_appointment(self, appointment_data: Dict) -> Dict:
        """Vytvoří nový appointment"""
        return self._make_request('POST', 'Appointment', appointment_data)
    
    def update_appointment(self, fhir_id: str, appointment_data: Dict) -> Dict:
        """Aktualizuje appointment"""
        return self._make_request('PUT', f'Appointment/{fhir_id}', appointment_data)
    
    # ==================== COMPOSITION OPERATIONS ====================
    
    def get_composition(self, fhir_id: str) -> Optional[Dict]:
        """Načte composition (perioperační protokol) z FHIR serveru"""
        return self._make_request('GET', f'Composition/{fhir_id}')
    
    def create_composition(self, composition_data: Dict) -> Dict:
        """Vytvoří novou composition"""
        return self._make_request('POST', 'Composition', composition_data)
    
    def update_composition(self, fhir_id: str, composition_data: Dict) -> Dict:
        """Aktualizuje composition"""
        return self._make_request('PUT', f'Composition/{fhir_id}', composition_data)
    
    # ==================== BUNDLE OPERATIONS ====================
    
    def create_bundle(self, bundle_data: Dict) -> Dict:
        """Vytvoří bundle (pro bulk operace)"""
        return self._make_request('POST', '', bundle_data)
    
    def get_metadata(self) -> Dict:
        """Získá metadata FHIR serveru"""
        return self._make_request('GET', 'metadata')
    
    # ==================== UTILITY METHODS ====================
    
    def test_connection(self) -> bool:
        """Otestuje připojení k FHIR serveru"""
        try:
            metadata = self.get_metadata()
            return metadata is not None and metadata.get('resourceType') == 'CapabilityStatement'
        except Exception as e:
            logger.error(f"FHIR server connection test failed: {str(e)}")
            return False

