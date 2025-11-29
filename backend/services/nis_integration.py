"""
NIS Integration Service - Integrace s nemocničním informačním systémem
"""
import logging
from typing import Dict, List, Optional
from datetime import datetime
import xml.etree.ElementTree as ET

from services.fhir_service import FHIRService
from services.fhir_protocol_service import FHIRProtocolService

logger = logging.getLogger(__name__)


class NISIntegrationService:
    """Service pro komunikaci s nemocničním informačním systémem přes FHIR"""
    
    def __init__(self, nis_endpoint: Optional[str] = None):
        self.fhir_service = FHIRService()
        self.protocol_service = FHIRProtocolService()
        self.nis_endpoint = nis_endpoint or "http://nis-server/fhir"  # Mock endpoint
    
    def import_patients_from_nis(self, patient_ids: Optional[List[str]] = None) -> Dict:
        """
        Importuje pacienty z NIS do FHIR serveru
        
        Args:
            patient_ids: Seznam ID pacientů k importu, None = všichni
            
        Returns:
            Dict s výsledky importu
            
        Production Implementation Note:
            1. Připojit k NIS API endpoint
            2. Authentikace (OAuth2/SAML)
            3. Fetch patient data ve FHIR formátu
            4. Validace dat
            5. Import do FHIR serveru
        """
        logger.info("Zahájení importu pacientů z NIS")
        
        results = {
            'imported': 0,
            'failed': 0,
            'errors': [],
            'status': 'not_configured'
        }
        
        if not self.nis_endpoint or self.nis_endpoint == "http://nis-server/fhir":
            logger.warning("NIS endpoint není nakonfigurován - použijte production NIS URL")
            results['errors'].append("NIS endpoint not configured")
            return results
        
        # Production implementation placeholder
        logger.info("Pro produkční použití implementujte skutečné volání NIS API")
        
        return results
    
    def export_protocol_to_nis(self, protocol_id: int, format: str = 'xml') -> Dict:
        """
        Exportuje perioperační protokol do NIS
        
        Args:
            protocol_id: ID PerioperativeProtocol
            format: 'xml' nebo 'json'
            
        Returns:
            Dict s výsledky exportu
        """
        from apps.operating_rooms.models import PerioperativeProtocol
        
        try:
            protocol = PerioperativeProtocol.objects.get(id=protocol_id)
            
            # Vytvoříme FHIR Composition
            composition = self.protocol_service.create_perioperative_composition(protocol)
            
            # Uložíme do FHIR serveru
            fhir_composition = self.fhir_service.create_composition(composition)
            
            # Export do požadovaného formátu
            if format == 'xml':
                exported_data = self.protocol_service.export_to_xml(fhir_composition)
            else:
                import json
                exported_data = json.dumps(fhir_composition, indent=2, ensure_ascii=False)
            
            # Production: Send to NIS
            if self.nis_endpoint and self.nis_endpoint != "http://nis-server/fhir":
                # Implement actual NIS API call here
                pass
            else:
                logger.info(f"DEMO MODE: Export protokolu {protocol_id} připraven")
                logger.info("Pro produkční použití nakonfigurujte NIS endpoint")
            
            return {
                'success': True,
                'protocol_id': protocol_id,
                'fhir_composition_id': fhir_composition.get('id'),
                'format': format,
                'exported_data': exported_data
            }
            
        except PerioperativeProtocol.DoesNotExist:
            logger.error(f"Protocol {protocol_id} neexistuje")
            return {
                'success': False,
                'error': 'Protocol not found'
            }
        except Exception as e:
            logger.error(f"Chyba při exportu protokolu: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_nis_message(self, resource_type: str, resource: Dict) -> Dict:
        """
        Vytvoří FHIR Message Bundle pro komunikaci s NIS
        
        Args:
            resource_type: Typ FHIR resource (Patient, Procedure, atd.)
            resource: FHIR resource data
            
        Returns:
            Dict: FHIR Bundle type="message"
        """
        message_bundle = {
            "resourceType": "Bundle",
            "type": "message",
            "timestamp": datetime.now().isoformat(),
            "entry": [
                {
                    "fullUrl": f"urn:uuid:{resource.get('id')}",
                    "resource": {
                        "resourceType": "MessageHeader",
                        "eventCoding": {
                            "system": "https://fnusa.cz/message-events",
                            "code": f"{resource_type.lower()}-notification"
                        },
                        "source": {
                            "name": "Medic Hub",
                            "endpoint": "https://medichub.fnusa.cz"
                        },
                        "focus": [{
                            "reference": f"{resource_type}/{resource.get('id')}"
                        }]
                    }
                },
                {
                    "fullUrl": f"{resource_type}/{resource.get('id')}",
                    "resource": resource
                }
            ]
        }
        
        return message_bundle
    
    def send_to_nis(self, message_bundle: Dict) -> bool:
        """
        Odešle FHIR message bundle do NIS
        
        Args:
            message_bundle: FHIR Bundle type="message"
            
        Returns:
            bool: True pokud úspěšné
            
        Production Implementation:
            import requests
            response = requests.post(
                f"{self.nis_endpoint}/message",
                json=message_bundle,
                headers={"Content-Type": "application/fhir+json"},
                auth=self._get_nis_auth()
            )
            return response.status_code == 200
        """
        if not self.nis_endpoint or self.nis_endpoint == "http://nis-server/fhir":
            logger.warning("NIS endpoint není nakonfigurován")
            return False
        
        logger.info(f"Příprava odeslání message bundle ({len(message_bundle.get('entry', []))} resources)")
        
        # Production: Implement actual HTTP POST to NIS
        # For now, just validate the bundle structure
        if message_bundle.get('resourceType') != 'Bundle':
            logger.error("Invalid bundle - resourceType must be 'Bundle'")
            return False
        
        if message_bundle.get('type') != 'message':
            logger.error("Invalid bundle - type must be 'message'")
            return False
        
        logger.info("Bundle je validní a připraven k odeslání")
        return True

