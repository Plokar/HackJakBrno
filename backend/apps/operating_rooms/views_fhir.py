"""
FHIR API Views - REST API endpointy pro FHIR integraci
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.management import call_command
from io import StringIO
import logging

from services.fhir_service import FHIRService
from services.fhir_mappers import (
    fhir_patient_to_django,
    fhir_practitioner_to_django,
    fhir_location_to_django
)
from .models import Patient, Doctor, OperatingRoom, Operation
from .serializers import PatientSerializer, DoctorSerializer, OperatingRoomSerializer

logger = logging.getLogger(__name__)


class FHIRPatientViewSet(viewsets.ViewSet):
    """ViewSet pro FHIR Patient operations"""
    # permission_classes = [IsAuthenticated]  # Použít default z settings (AllowAny pro vývoj)
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.fhir_service = FHIRService()
    
    def list(self, request):
        """Seznam vsech pacientu z Django (cache)"""
        patients = Patient.objects.all()
        serializer = PatientSerializer(patients, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """Vyhledat pacienty v FHIR serveru"""
        params = dict(request.query_params)
        
        try:
            result = self.fhir_service.search_patients(params)
            entries = result.get('entry', [])
            
            # Convertovat FHIR resources na Django format
            patients_data = []
            for entry in entries:
                fhir_patient = entry.get('resource', {})
                patient_data = fhir_patient_to_django(fhir_patient)
                patients_data.append(patient_data)
            
            return Response({
                'count': len(patients_data),
                'results': patients_data,
                'fhir_response': result
            })
        except Exception as e:
            logger.error(f'Error searching patients: {str(e)}')
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def generate(self, request):
        """Vygenerovat nove pacienty pomoci Synthea/FHIR"""
        count = request.data.get('count', 50)
        
        try:
            # Spustit management command pro generovani dat
            out = StringIO()
            call_command(
                'generate_fhir_data',
                '--patients', count,
                stdout=out
            )
            
            output = out.getvalue()
            
            return Response({
                'message': f'Vygenerovano {count} pacientu',
                'output': output,
                'total_patients': Patient.objects.count()
            })
        except Exception as e:
            logger.error(f'Error generating patients: {str(e)}')
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def sync_from_fhir(self, request):
        """Synchronizovat pacienty z FHIR do Django"""
        try:
            out = StringIO()
            call_command(
                'generate_fhir_data',
                '--sync-only',
                stdout=out
            )
            
            output = out.getvalue()
            
            return Response({
                'message': 'Synchronizace dokoncena',
                'output': output,
                'total_patients': Patient.objects.count()
            })
        except Exception as e:
            logger.error(f'Error syncing patients: {str(e)}')
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def sync_to_fhir(self, request, pk=None):
        """Synchronizovat konkretniho pacienta do FHIR"""
        try:
            patient = Patient.objects.get(pk=pk)
            result = patient.sync_to_fhir()
            
            return Response({
                'message': f'Pacient {patient} synchronizovan do FHIR',
                'fhir_id': patient.fhir_id,
                'fhir_resource': result
            })
        except Patient.DoesNotExist:
            return Response(
                {'error': 'Pacient nenalezen'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f'Error syncing patient to FHIR: {str(e)}')
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class FHIRPractitionerViewSet(viewsets.ViewSet):
    """ViewSet pro FHIR Practitioner (Doctor) operations"""
    # permission_classes = [IsAuthenticated]  # Použít default z settings (AllowAny pro vývoj)
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.fhir_service = FHIRService()
    
    def list(self, request):
        """Seznam vsech doktoru z Django (cache)"""
        doctors = Doctor.objects.all()
        serializer = DoctorSerializer(doctors, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """Vyhledat doktory v FHIR serveru"""
        params = dict(request.query_params)
        
        try:
            result = self.fhir_service.search_practitioners(params)
            entries = result.get('entry', [])
            
            # Convertovat FHIR resources na Django format
            doctors_data = []
            for entry in entries:
                fhir_practitioner = entry.get('resource', {})
                doctor_data = fhir_practitioner_to_django(fhir_practitioner)
                doctors_data.append(doctor_data)
            
            return Response({
                'count': len(doctors_data),
                'results': doctors_data,
                'fhir_response': result
            })
        except Exception as e:
            logger.error(f'Error searching practitioners: {str(e)}')
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def sync_from_fhir(self, request):
        """Synchronizovat doktory z FHIR do Django"""
        try:
            result = self.fhir_service.search_practitioners({'_count': 1000})
            entries = result.get('entry', [])
            
            synced_count = 0
            for entry in entries:
                fhir_practitioner = entry.get('resource', {})
                doctor_data = fhir_practitioner_to_django(fhir_practitioner)
                
                doctor, created = Doctor.objects.update_or_create(
                    fhir_id=doctor_data['fhir_id'],
                    defaults=doctor_data
                )
                synced_count += 1
            
            return Response({
                'message': f'Synchronizovano {synced_count} doktoru',
                'total_doctors': Doctor.objects.count()
            })
        except Exception as e:
            logger.error(f'Error syncing practitioners: {str(e)}')
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class FHIRLocationViewSet(viewsets.ViewSet):
    """ViewSet pro FHIR Location (Operating Room) operations"""
    # permission_classes = [IsAuthenticated]  # Použít default z settings (AllowAny pro vývoj)
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.fhir_service = FHIRService()
    
    def list(self, request):
        """Seznam vsech operacnich salu z Django (cache)"""
        rooms = OperatingRoom.objects.all()
        serializer = OperatingRoomSerializer(rooms, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """Vyhledat operacni saly v FHIR serveru"""
        params = dict(request.query_params)
        
        try:
            result = self.fhir_service.search_locations(params)
            entries = result.get('entry', [])
            
            # Convertovat FHIR resources na Django format
            rooms_data = []
            for entry in entries:
                fhir_location = entry.get('resource', {})
                room_data = fhir_location_to_django(fhir_location)
                rooms_data.append(room_data)
            
            return Response({
                'count': len(rooms_data),
                'results': rooms_data,
                'fhir_response': result
            })
        except Exception as e:
            logger.error(f'Error searching locations: {str(e)}')
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def sync_all_to_fhir(self, request):
        """Synchronizovat vsechny saly do FHIR"""
        try:
            rooms = OperatingRoom.objects.all()
            synced_count = 0
            
            for room in rooms:
                try:
                    room.sync_to_fhir()
                    synced_count += 1
                except Exception as e:
                    logger.error(f'Error syncing room {room}: {str(e)}')
            
            return Response({
                'message': f'Synchronizovano {synced_count}/{rooms.count()} salu',
                'total_rooms': OperatingRoom.objects.count()
            })
        except Exception as e:
            logger.error(f'Error syncing rooms to FHIR: {str(e)}')
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class FHIRProcedureViewSet(viewsets.ViewSet):
    """ViewSet pro FHIR Procedure (Operation) operations"""
    # permission_classes = [IsAuthenticated]  # Použít default z settings (AllowAny pro vývoj)
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.fhir_service = FHIRService()
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """Vyhledat procedury (operace) v FHIR serveru"""
        params = dict(request.query_params)
        
        try:
            result = self.fhir_service.search_procedures(params)
            
            return Response({
                'count': result.get('total', 0),
                'results': result.get('entry', []),
                'fhir_response': result
            })
        except Exception as e:
            logger.error(f'Error searching procedures: {str(e)}')
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def sync_to_fhir(self, request, pk=None):
        """Synchronizovat konkretni operaci do FHIR"""
        try:
            operation = Operation.objects.get(pk=pk)
            result = operation.sync_to_fhir()
            
            return Response({
                'message': f'Operace {operation} synchronizovana do FHIR',
                'fhir_id': operation.fhir_id,
                'fhir_resource': result
            })
        except Operation.DoesNotExist:
            return Response(
                {'error': 'Operace nenalezena'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f'Error syncing operation to FHIR: {str(e)}')
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class FHIRDeviceViewSet(viewsets.ViewSet):
    """ViewSet pro FHIR Device (Equipment) operations"""
    # permission_classes = [IsAuthenticated]  # Použít default z settings (AllowAny pro vývoj)
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.fhir_service = FHIRService()
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """Vyhledat zarizeni v FHIR serveru"""
        params = dict(request.query_params)
        
        try:
            result = self.fhir_service.search_devices(params)
            
            return Response({
                'count': result.get('total', 0),
                'results': result.get('entry', []),
                'fhir_response': result
            })
        except Exception as e:
            logger.error(f'Error searching devices: {str(e)}')
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class FHIRServerViewSet(viewsets.ViewSet):
    """ViewSet pro obecne FHIR server operace"""
    # permission_classes = [IsAuthenticated]  # Použít default z settings (AllowAny pro vývoj)
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.fhir_service = FHIRService()
    
    @action(detail=False, methods=['get'])
    def metadata(self, request):
        """Získat metadata FHIR serveru"""
        try:
            metadata = self.fhir_service.get_metadata()
            return Response(metadata)
        except Exception as e:
            logger.error(f'Error getting FHIR metadata: {str(e)}')
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def status(self, request):
        """Zkontrolovat stav pripojeni k FHIR serveru"""
        is_connected = self.fhir_service.test_connection()
        
        return Response({
            'connected': is_connected,
            'fhir_server_url': self.fhir_service.base_url,
            'status': 'online' if is_connected else 'offline'
        })

