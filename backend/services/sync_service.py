"""
Synchronizační service pro pravidelnou synchronizaci dat mezi Django a FHIR serverem
"""
from celery import shared_task
from django.utils import timezone
import logging

from services.fhir_service import FHIRService
from services.fhir_mappers import (
    fhir_patient_to_django,
    fhir_practitioner_to_django,
    fhir_location_to_django
)
from apps.operating_rooms.models import Patient, Doctor, OperatingRoom, Operation

logger = logging.getLogger(__name__)


@shared_task
def sync_all_to_fhir():
    """
    Synchronizovat všechna Django data do FHIR serveru
    Použití: Při prvotním nahrání dat nebo full resync
    """
    logger.info("Začátek synchronizace všech dat do FHIR")
    
    results = {
        'patients': 0,
        'doctors': 0,
        'rooms': 0,
        'operations': 0,
        'errors': []
    }
    
    # Synchronizovat pacienty
    for patient in Patient.objects.all():
        try:
            patient.sync_to_fhir()
            results['patients'] += 1
        except Exception as e:
            logger.error(f"Error syncing patient {patient.id}: {str(e)}")
            results['errors'].append(f"Patient {patient.id}: {str(e)}")
    
    # Synchronizovat doktory
    for doctor in Doctor.objects.all():
        try:
            doctor.sync_to_fhir()
            results['doctors'] += 1
        except Exception as e:
            logger.error(f"Error syncing doctor {doctor.id}: {str(e)}")
            results['errors'].append(f"Doctor {doctor.id}: {str(e)}")
    
    # Synchronizovat sály
    for room in OperatingRoom.objects.all():
        try:
            room.sync_to_fhir()
            results['rooms'] += 1
        except Exception as e:
            logger.error(f"Error syncing room {room.id}: {str(e)}")
            results['errors'].append(f"Room {room.id}: {str(e)}")
    
    # Synchronizovat operace
    for operation in Operation.objects.all():
        try:
            if operation.patient.fhir_id and operation.operating_room.fhir_id:
                operation.sync_to_fhir()
                results['operations'] += 1
        except Exception as e:
            logger.error(f"Error syncing operation {operation.id}: {str(e)}")
            results['errors'].append(f"Operation {operation.id}: {str(e)}")
    
    logger.info(f"Synchronizace dokončena: {results}")
    return results


@shared_task
def sync_from_fhir_periodic():
    """
    Pravidelná synchronizace z FHIR serveru do Django (každých 5 minut)
    Použití: Celery Beat periodický task
    """
    logger.info("Začátek periodické synchronizace z FHIR")
    
    fhir_service = FHIRService()
    results = {
        'patients': 0,
        'doctors': 0,
        'rooms': 0,
        'timestamp': timezone.now().isoformat(),
        'errors': []
    }
    
    try:
        # Synchronizovat pacienty
        patient_result = fhir_service.search_patients({'_count': 1000})
        for entry in patient_result.get('entry', []):
            try:
                fhir_patient = entry.get('resource', {})
                patient_data = fhir_patient_to_django(fhir_patient)
                
                patient, created = Patient.objects.update_or_create(
                    fhir_id=patient_data['fhir_id'],
                    defaults=patient_data
                )
                patient.fhir_last_synced = timezone.now()
                patient.save()
                results['patients'] += 1
            except Exception as e:
                logger.error(f"Error syncing patient: {str(e)}")
                results['errors'].append(str(e))
        
        # Synchronizovat doktory
        doctor_result = fhir_service.search_practitioners({'_count': 1000})
        for entry in doctor_result.get('entry', []):
            try:
                fhir_practitioner = entry.get('resource', {})
                doctor_data = fhir_practitioner_to_django(fhir_practitioner)
                
                doctor, created = Doctor.objects.update_or_create(
                    fhir_id=doctor_data['fhir_id'],
                    defaults=doctor_data
                )
                doctor.fhir_last_synced = timezone.now()
                doctor.save()
                results['doctors'] += 1
            except Exception as e:
                logger.error(f"Error syncing doctor: {str(e)}")
                results['errors'].append(str(e))
        
        # Synchronizovat sály
        room_result = fhir_service.search_locations({'_count': 1000})
        for entry in room_result.get('entry', []):
            try:
                fhir_location = entry.get('resource', {})
                room_data = fhir_location_to_django(fhir_location)
                
                room, created = OperatingRoom.objects.update_or_create(
                    fhir_id=room_data['fhir_id'],
                    defaults=room_data
                )
                room.fhir_last_synced = timezone.now()
                room.save()
                results['rooms'] += 1
            except Exception as e:
                logger.error(f"Error syncing room: {str(e)}")
                results['errors'].append(str(e))
        
    except Exception as e:
        logger.error(f"Kritická chyba při periodické synchronizaci: {str(e)}")
        results['errors'].append(f"Critical: {str(e)}")
    
    logger.info(f"Periodická synchronizace dokončena: {results}")
    return results


@shared_task
def check_fhir_server_health():
    """
    Kontrola zdraví FHIR serveru (každou minutu)
    """
    fhir_service = FHIRService()
    is_healthy = fhir_service.test_connection()
    
    if not is_healthy:
        logger.error("FHIR server není dostupný!")
        # TODO: Poslat alert adminimostratorovi
    
    return {
        'healthy': is_healthy,
        'timestamp': timezone.now().isoformat()
    }


@shared_task
def sync_operation_to_fhir(operation_id):
    """
    Asynchronně synchronizovat konkrétní operaci do FHIR
    Použití: Po vytvoření/úpravě operace
    """
    try:
        operation = Operation.objects.get(id=operation_id)
        result = operation.sync_to_fhir()
        logger.info(f"Operace {operation_id} synchronizována do FHIR")
        return {'success': True, 'fhir_id': operation.fhir_id}
    except Exception as e:
        logger.error(f"Chyba při synchronizaci operace {operation_id}: {str(e)}")
        return {'success': False, 'error': str(e)}

