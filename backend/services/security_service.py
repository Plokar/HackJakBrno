"""
Security Service - GDPR compliance a security funkce pro FHIR data
"""
import logging
from typing import Dict, List
from datetime import datetime, timedelta
from django.utils import timezone

logger = logging.getLogger(__name__)


class GDPRService:
    """Service pro GDPR compliance operace"""
    
    @staticmethod
    def anonymize_patient_fhir(fhir_patient: Dict) -> Dict:
        """
        Anonymizuje FHIR Patient resource pro reporty a statistiky
        
        Args:
            fhir_patient: FHIR Patient resource
            
        Returns:
            Dict: Anonymizovaný FHIR Patient resource
        """
        anonymized = fhir_patient.copy()
        
        # Odstranit identifikační údaje
        if 'name' in anonymized:
            anonymized['name'] = [{
                'family': 'ANONYMIZED',
                'given': ['ANONYMIZED']
            }]
        
        # Odstranit adresy
        if 'address' in anonymized:
            anonymized['address'] = []
        
        # Odstranit telefonní čísla a emaily
        if 'telecom' in anonymized:
            anonymized['telecom'] = []
        
        # Odstranit specifické identifikátory (rodné číslo)
        if 'identifier' in anonymized:
            anonymized['identifier'] = [
                {
                    'system': 'https://fnusa.cz/patient-id',
                    'value': 'ANONYMIZED'
                }
            ]
        
        # Zachovat pouze rok narození (ne celé datum)
        if 'birthDate' in anonymized:
            birth_date = datetime.fromisoformat(anonymized['birthDate'])
            anonymized['birthDate'] = f"{birth_date.year}-01-01"
        
        # Přidat anonymization extension
        if 'extension' not in anonymized:
            anonymized['extension'] = []
        
        anonymized['extension'].append({
            'url': 'https://fnusa.cz/anonymized',
            'valueBoolean': True
        })
        
        anonymized['extension'].append({
            'url': 'https://fnusa.cz/anonymized-at',
            'valueDateTime': datetime.now().isoformat()
        })
        
        return anonymized
    
    @staticmethod
    def delete_patient_data(patient_id: int, reason: str) -> Dict:
        """
        GDPR - Právo na výmaz dat pacienta
        
        Args:
            patient_id: Django Patient ID
            reason: Důvod výmazu
            
        Returns:
            Dict s výsledky operace
        """
        from apps.operating_rooms.models import Patient
        from services.fhir_service import FHIRService
        
        try:
            patient = Patient.objects.get(id=patient_id)
            fhir_id = patient.fhir_id
            
            # Audit log
            logger.info(f"GDPR DELETE: Pacient {patient_id}, důvod: {reason}")
            
            # Smazat z FHIR serveru
            if fhir_id:
                fhir_service = FHIRService()
                try:
                    fhir_service.delete_patient(fhir_id)
                except Exception as e:
                    logger.error(f"Chyba při mazání z FHIR: {str(e)}")
            
            # Smazat z Django
            patient_name = str(patient)
            patient.delete()
            
            return {
                'success': True,
                'patient_id': patient_id,
                'patient_name': patient_name,
                'fhir_id': fhir_id,
                'deleted_at': timezone.now().isoformat(),
                'reason': reason
            }
            
        except Patient.DoesNotExist:
            return {
                'success': False,
                'error': 'Patient not found'
            }
        except Exception as e:
            logger.error(f"Chyba při GDPR delete: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    @staticmethod
    def export_patient_data(patient_id: int) -> Dict:
        """
        GDPR - Právo na přenositelnost dat
        
        Args:
            patient_id: Django Patient ID
            
        Returns:
            Dict se všemi daty pacienta ve strojově čitelném formátu
        """
        from apps.operating_rooms.models import Patient
        
        try:
            patient = Patient.objects.get(id=patient_id)
            
            # Export Django dat
            django_data = {
                'patient': {
                    'id': patient.id,
                    'first_name': patient.first_name,
                    'last_name': patient.last_name,
                    'birth_number': patient.birth_number,
                    'date_of_birth': patient.date_of_birth.isoformat(),
                    'diagnosis': patient.diagnosis,
                    'medical_history': patient.medical_history
                },
                'operations': [],
                'fhir_resource': patient.fhir_resource_json
            }
            
            # Přidat operace
            for operation in patient.operations.all():
                django_data['operations'].append({
                    'id': operation.id,
                    'type': operation.operation_type,
                    'scheduled_start': operation.scheduled_start.isoformat() if operation.scheduled_start else None,
                    'status': operation.status,
                    'fhir_resource': operation.fhir_resource_json
                })
            
            return {
                'success': True,
                'data': django_data,
                'export_format': 'json',
                'exported_at': timezone.now().isoformat()
            }
            
        except Patient.DoesNotExist:
            return {
                'success': False,
                'error': 'Patient not found'
            }


class AuditService:
    """Service pro audit trail všech operací s citlivými daty"""
    
    @staticmethod
    def log_access(user, resource_type: str, resource_id: str, action: str):
        """
        Zaloguje přístup k citlivým datům
        
        Args:
            user: Django User
            resource_type: Typ resource (Patient, Procedure, atd.)
            resource_id: ID resource
            action: Akce (read, create, update, delete)
        """
        logger.info(
            f"AUDIT: User {user.username} ({user.id}) "
            f"provedl {action} na {resource_type}/{resource_id}"
        )
        
        # Production: Store in dedicated audit table
        # Example implementation:
        # from apps.audit.models import AuditLog
        # AuditLog.objects.create(
        #     user=user,
        #     resource_type=resource_type,
        #     resource_id=resource_id,
        #     action=action,
        #     timestamp=timezone.now(),
        #     ip_address=get_client_ip(request)
        # )
    
    @staticmethod
    def get_access_log(resource_type: str, resource_id: str, limit: int = 100) -> List[Dict]:
        """
        Získá audit log pro konkrétní resource
        
        Production Implementation:
            from apps.audit.models import AuditLog
            logs = AuditLog.objects.filter(
                resource_type=resource_type,
                resource_id=resource_id
            ).order_by('-timestamp')[:limit]
            
            return [{
                'user': log.user.username,
                'action': log.action,
                'timestamp': log.timestamp.isoformat(),
                'ip_address': log.ip_address
            } for log in logs]
        """
        # Placeholder - returns empty list until audit table is created
        logger.info(f"Audit log query pro {resource_type}/{resource_id}")
        return []


class FHIRSecurityService:
    """Service pro security operace na FHIR datech"""
    
    @staticmethod
    def validate_fhir_resource(resource: Dict) -> bool:
        """
        Validuje FHIR resource před uložením
        
        Args:
            resource: FHIR resource
            
        Returns:
            bool: True pokud validní
        """
        # Základní validace
        if 'resourceType' not in resource:
            return False
        
        # Production: Use fhir.resources for detailed validation
        # Example:
        # from fhir.resources.patient import Patient
        # try:
        #     Patient.parse_obj(resource)
        #     return True
        # except ValidationError:
        #     return False
        
        return True
    
    @staticmethod
    def sanitize_input(data: str) -> str:
        """Sanitizuje uživatelský input před uložením do FHIR"""
        # Odstranit potenciálně nebezpečné znaky
        dangerous_chars = ['<', '>', '"', "'", '&']
        sanitized = data
        for char in dangerous_chars:
            sanitized = sanitized.replace(char, '')
        
        return sanitized.strip()
    
    @staticmethod
    def check_fhir_permissions(user, resource_type: str, action: str) -> bool:
        """
        Zkontroluje oprávnění uživatele k FHIR resource
        
        Args:
            user: Django User
            resource_type: Typ FHIR resource
            action: Akce (read, write, delete)
            
        Returns:
            bool: True pokud má oprávnění
        """
        # Production: Implement proper role-based access control
        # Example implementation with user roles:
        # from apps.users.models import UserRole
        # user_role = user.profile.role
        # 
        # PERMISSIONS = {
        #     'admin': {'*': ['read', 'write', 'delete']},
        #     'doctor': {
        #         'Patient': ['read', 'write'],
        #         'Procedure': ['read', 'write'],
        #         'Observation': ['read', 'write']
        #     },
        #     'nurse': {
        #         'Patient': ['read'],
        #         'Material': ['read', 'write'],
        #         'SupplyDelivery': ['read', 'write']
        #     }
        # }
        # return action in PERMISSIONS.get(user_role, {}).get(resource_type, [])
        
        # Current simplified implementation:
        if user.is_superuser:
            return True
        
        if user.is_staff:
            # Staff může číst všechno, psát většinu
            if action == 'delete':
                return False
            return True
        
        # Ostatní - pouze read
        return action == 'read'

