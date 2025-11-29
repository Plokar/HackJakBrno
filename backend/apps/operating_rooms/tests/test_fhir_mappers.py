"""
Tests pro FHIR Mappers
"""
import pytest
from datetime import date, datetime
from services.fhir_mappers import (
    django_patient_to_fhir,
    fhir_patient_to_django,
    django_doctor_to_fhir,
    fhir_practitioner_to_django,
    django_room_to_fhir,
    fhir_location_to_django
)
from apps.operating_rooms.models import Patient, Doctor, OperatingRoom


@pytest.mark.django_db
class TestPatientMappers:
    """Testy pro Patient mappery"""
    
    def test_django_patient_to_fhir(self):
        """Test převodu Django Patient -> FHIR"""
        patient = Patient.objects.create(
            first_name='Jan',
            last_name='Novák',
            birth_number='9001011234',
            date_of_birth=date(1990, 1, 1),
            diagnosis='Test diagnosis',
            medical_history='Test history'
        )
        
        fhir_patient = django_patient_to_fhir(patient)
        
        assert fhir_patient['resourceType'] == 'Patient'
        assert fhir_patient['name'][0]['family'] == 'Novák'
        assert fhir_patient['name'][0]['given'] == ['Jan']
        assert fhir_patient['birthDate'] == '1990-01-01'
        assert fhir_patient['gender'] == 'male'  # z rodného čísla
    
    def test_fhir_patient_to_django(self):
        """Test převodu FHIR -> Django Patient"""
        fhir_patient = {
            'resourceType': 'Patient',
            'id': 'fhir-123',
            'name': [{
                'family': 'Svoboda',
                'given': ['Petr']
            }],
            'birthDate': '1985-05-15',
            'identifier': [
                {
                    'system': 'https://fnusa.cz/birth-number',
                    'value': '8505155678'
                }
            ],
            'extension': [
                {
                    'url': 'https://fnusa.cz/patient-diagnosis',
                    'valueString': 'FHIR Diagnosis'
                }
            ]
        }
        
        django_data = fhir_patient_to_django(fhir_patient)
        
        assert django_data['first_name'] == 'Petr'
        assert django_data['last_name'] == 'Svoboda'
        assert django_data['birth_number'] == '8505155678'
        assert django_data['fhir_id'] == 'fhir-123'
        assert django_data['diagnosis'] == 'FHIR Diagnosis'


@pytest.mark.django_db
class TestDoctorMappers:
    """Testy pro Doctor/Practitioner mappery"""
    
    def test_django_doctor_to_fhir(self):
        """Test převodu Django Doctor -> FHIR Practitioner"""
        doctor = Doctor.objects.create(
            first_name='Marie',
            last_name='Dvořáková',
            specialization='Chirurgie',
            license_number='LIC-12345',
            hourly_rate=1500,
            is_active=True
        )
        
        fhir_practitioner = django_doctor_to_fhir(doctor)
        
        assert fhir_practitioner['resourceType'] == 'Practitioner'
        assert fhir_practitioner['name'][0]['family'] == 'Dvořáková'
        assert fhir_practitioner['name'][0]['given'] == ['Marie']
        assert fhir_practitioner['active'] is True
        assert fhir_practitioner['qualification'][0]['code']['text'] == 'Chirurgie'
        
        # Zkontrolovat hourly rate extension
        hourly_rate_ext = next(
            ext for ext in fhir_practitioner['extension']
            if ext['url'] == 'https://fnusa.cz/doctor-hourly-rate'
        )
        assert hourly_rate_ext['valueMoney']['value'] == 1500
        assert hourly_rate_ext['valueMoney']['currency'] == 'CZK'


@pytest.mark.django_db
class TestRoomMappers:
    """Testy pro OperatingRoom/Location mappery"""
    
    def test_django_room_to_fhir(self):
        """Test převodu Django OperatingRoom -> FHIR Location"""
        room = OperatingRoom.objects.create(
            name='Operační sál 1',
            room_number='OS-01',
            floor=2,
            capacity=1,
            is_active=True
        )
        
        fhir_location = django_room_to_fhir(room)
        
        assert fhir_location['resourceType'] == 'Location'
        assert fhir_location['name'] == 'Operační sál 1'
        assert fhir_location['status'] == 'active'
        assert fhir_location['type'][0]['coding'][0]['code'] == 'OR'
        
        # Zkontrolovat extensions
        floor_ext = next(
            ext for ext in fhir_location['extension']
            if ext['url'] == 'https://fnusa.cz/location-floor'
        )
        assert floor_ext['valueInteger'] == 2
    
    def test_fhir_location_to_django(self):
        """Test převodu FHIR Location -> Django OperatingRoom"""
        fhir_location = {
            'resourceType': 'Location',
            'id': 'loc-123',
            'name': 'Test Sál',
            'status': 'active',
            'identifier': [{
                'system': 'https://fnusa.cz/room-number',
                'value': 'OS-99'
            }],
            'extension': [
                {
                    'url': 'https://fnusa.cz/location-floor',
                    'valueInteger': 3
                },
                {
                    'url': 'https://fnusa.cz/location-capacity',
                    'valueInteger': 2
                }
            ]
        }
        
        django_data = fhir_location_to_django(fhir_location)
        
        assert django_data['name'] == 'Test Sál'
        assert django_data['room_number'] == 'OS-99'
        assert django_data['floor'] == 3
        assert django_data['capacity'] == 2
        assert django_data['is_active'] is True
        assert django_data['fhir_id'] == 'loc-123'

