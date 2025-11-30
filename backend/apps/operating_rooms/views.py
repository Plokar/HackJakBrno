from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Q, Sum
from django.utils import timezone
from datetime import datetime, timedelta
import csv
import io
from .models import (
    OperatingRoom, Patient, Doctor, Equipment, Material,
    Operation, PerioperativeProtocol, EquipmentUsage, MaterialUsage,
    OperationTool
)
from .serializers import (
    OperatingRoomSerializer, PatientSerializer, DoctorSerializer,
    EquipmentSerializer, MaterialSerializer, OperationListSerializer,
    OperationDetailSerializer, OperationCreateSerializer, PerioperativeProtocolSerializer,
    DashboardStatsSerializer, EquipmentUsageSerializer, MaterialUsageSerializer,
    OperationToolSerializer,
    OperationApprovalSerializer, OperationStaffAssignmentSerializer
)


class OperatingRoomViewSet(viewsets.ModelViewSet):
    queryset = OperatingRoom.objects.all()
    serializer_class = OperatingRoomSerializer
    
    @action(detail=True, methods=['get'], url_path='detail')
    def room_detail(self, request, pk=None):
        """Získat detailní informace o sále včetně aktuální operace"""
        room = self.get_object()
        today = timezone.now().date()
        now = timezone.now()
        
        # Aktuální operace (pouze ty, které opravdu probíhají TEĎKA)
        current_operation = room.operations.filter(
            status='in_progress',
            scheduled_start__lte=now,
            scheduled_end__gte=now
        ).first()
        
        # Nadcházející operace
        upcoming_operations = room.operations.filter(
            scheduled_start__gt=now,
            status='scheduled'
        ).order_by('scheduled_start')[:5]
        
        # Statistiky pro dnešek
        operations_today_list = room.operations.filter(scheduled_start__date=today)
        operations_today = operations_today_list.count()
        urgent_today = operations_today_list.filter(is_emergency=True).count()
        
        # Průměrná délka operací dnes
        operations_with_duration = [op for op in operations_today_list if op.duration_hours]
        avg_duration_hours = sum(op.duration_hours for op in operations_with_duration) / len(operations_with_duration) if operations_with_duration else 0
        
        # Operace tento týden
        week_start = today - timedelta(days=today.weekday())
        operations_week = room.operations.filter(
            scheduled_start__date__gte=week_start
        ).count()
        
        # Počet dokončených operací tento týden
        completed_this_week = room.operations.filter(
            scheduled_start__date__gte=week_start,
            status='completed'
        ).count()
        
        # Počet nadcházejících operací (příštích 7 dní)
        week_end = today + timedelta(days=7)
        upcoming_count = room.operations.filter(
            scheduled_start__date__gte=today,
            scheduled_start__date__lte=week_end,
            status='scheduled'
        ).count()
        
        # Sestavení odpovědi
        response_data = {
            'id': room.id,
            'name': room.name,
            'room_number': room.room_number,
            'building': f'Patro {room.floor}',
            'capacity': room.capacity,
            'status': 'available',
            'operations_today': operations_today,
            'urgent_today': urgent_today,
            'avg_duration_hours': round(avg_duration_hours, 1),
            'operations_week': operations_week,
            'completed_this_week': completed_this_week,
            'upcoming_count': upcoming_count,
        }
        
        # Přidat aktuální operaci
        if current_operation:
            response_data['status'] = 'active'
            assisting_doctors = [
                f"Dr. {doc.first_name} {doc.last_name}"
                for doc in current_operation.assisting_doctors.all()
            ]
            
            response_data['currentOperation'] = {
                'id': current_operation.id,
                'type': current_operation.operation_type,
                'patient': f"{current_operation.patient.first_name} {current_operation.patient.last_name}",
                'patient_birth_number': current_operation.patient.birth_number,
                'surgeon': f"Dr. {current_operation.primary_doctor.first_name} {current_operation.primary_doctor.last_name}",
                'surgeon_specialization': current_operation.primary_doctor.specialization,
                'assisting_doctors': assisting_doctors,
                'startTime': current_operation.actual_start.isoformat() if current_operation.actual_start else current_operation.scheduled_start.isoformat(),
                'estimatedEnd': current_operation.scheduled_end.isoformat() if current_operation.scheduled_end else None,
                'is_emergency': current_operation.is_emergency,
                'notes': current_operation.notes or '',
            }
        
        # Přidat nadcházející operace
        if upcoming_operations.exists():
            response_data['upcoming_operations'] = [
                {
                    'id': op.id,
                    'type': op.operation_type,
                    'patient': f"{op.patient.first_name} {op.patient.last_name}",
                    'surgeon': f"Dr. {op.primary_doctor.first_name} {op.primary_doctor.last_name}",
                    'scheduledTime': op.scheduled_start.isoformat(),
                    'estimated_duration': op.duration_hours,
                }
                for op in upcoming_operations
            ]
        else:
            response_data['upcoming_operations'] = []
        
        return Response(response_data)
    
    @action(detail=True, methods=['get'])
    def schedule(self, request, pk=None):
        """Získat rozpis operací pro daný sál"""
        room = self.get_object()
        date_str = request.query_params.get('date')
        
        if date_str:
            date = datetime.strptime(date_str, '%Y-%m-%d').date()
            operations = room.operations.filter(
                scheduled_start__date=date
            )
        else:
            operations = room.operations.filter(
                scheduled_start__gte=timezone.now()
            )[:10]
        
        serializer = OperationListSerializer(operations, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def utilization(self, request, pk=None):
        """Statistika vytížení sálu"""
        room = self.get_object()
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now() - timedelta(days=days)
        
        operations = room.operations.filter(
            scheduled_start__gte=start_date,
            status__in=['completed', 'in_progress']
        )
        
        total_hours = 0
        for op in operations:
            if op.duration_hours:
                total_hours += op.duration_hours
        
        # Sály jsou otevřené 24 hodin denně (0-24h)
        available_hours = days * 24
        utilization_percent = (total_hours / available_hours * 100) if available_hours > 0 else 0
        
        return Response({
            'room': room.name,
            'period_days': days,
            'total_operations': operations.count(),
            'total_hours': round(total_hours, 2),
            'available_hours': available_hours,
            'utilization_percent': round(utilization_percent, 2)
        })


class PatientViewSet(viewsets.ModelViewSet):
    queryset = Patient.objects.all()
    serializer_class = PatientSerializer
    
    @action(detail=False, methods=['get'])
    def search_by_birth_number(self, request):
        """Vyhledání pacienta podle rodného čísla"""
        birth_number = request.query_params.get('birth_number', None)
        if not birth_number:
            return Response({'error': 'Zadejte rodné číslo'}, status=400)
        
        try:
            patient = Patient.objects.get(birth_number=birth_number)
            serializer = PatientSerializer(patient)
            return Response(serializer.data)
        except Patient.DoesNotExist:
            return Response({'error': 'Pacient nenalezen'}, status=404)
    
    @action(detail=True, methods=['get'])
    def operations(self, request, pk=None):
        """Historie operací pacienta"""
        patient = self.get_object()
        operations = patient.operations.all()
        serializer = OperationListSerializer(operations, many=True)
        return Response(serializer.data)


class DoctorViewSet(viewsets.ModelViewSet):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer
    
    @action(detail=True, methods=['get'])
    def schedule(self, request, pk=None):
        """Rozpis doktora"""
        doctor = self.get_object()
        date_str = request.query_params.get('date')
        
        if date_str:
            date = datetime.strptime(date_str, '%Y-%m-%d').date()
            operations = Operation.objects.filter(
                Q(primary_doctor=doctor) | Q(assisting_doctors=doctor),
                scheduled_start__date=date
            ).distinct()
        else:
            operations = Operation.objects.filter(
                Q(primary_doctor=doctor) | Q(assisting_doctors=doctor),
                scheduled_start__gte=timezone.now()
            ).distinct()[:10]
        
        serializer = OperationListSerializer(operations, many=True)
        return Response(serializer.data)


class EquipmentViewSet(viewsets.ModelViewSet):
    queryset = Equipment.objects.all()
    serializer_class = EquipmentSerializer
    
    @action(detail=False, methods=['get'])
    def low_lifetime(self, request):
        """Přístroje s nízkou zbývající životností"""
        threshold = float(request.query_params.get('threshold', 20))
        equipment = []
        
        for eq in Equipment.objects.filter(is_operational=True):
            if eq.remaining_lifetime_percent < threshold:
                equipment.append(eq)
        
        serializer = self.get_serializer(equipment, many=True)
        return Response(serializer.data)


class MaterialViewSet(viewsets.ModelViewSet):
    queryset = Material.objects.all()
    serializer_class = MaterialSerializer
    
    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        """Materiál s nízkým stavem skladu"""
        from django.db.models import F
        materials = Material.objects.filter(
            stock_quantity__lte=F('minimum_stock')
        )
        serializer = self.get_serializer(materials, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def scan(self, request):
        """Skenování EAN kódu materiálu"""
        ean_code = request.data.get('ean_code')
        try:
            material = Material.objects.get(ean_code=ean_code)
            serializer = self.get_serializer(material)
            return Response(serializer.data)
        except Material.DoesNotExist:
            return Response(
                {'error': 'Materiál s tímto EAN kódem nebyl nalezen'},
                status=status.HTTP_404_NOT_FOUND
            )


class OperationViewSet(viewsets.ModelViewSet):
    queryset = Operation.objects.all().order_by('-created_at')  # Nejnovější operace první
    # permission_classes = [IsAuthenticated]  # Vypnuto pro demo - používáme MockAuthMiddleware
    
    def get_serializer_class(self):
        if self.action == 'create':
            return OperationCreateSerializer
        elif self.action == 'retrieve':
            return OperationDetailSerializer
        return OperationListSerializer
    
    def get_serializer_context(self):
        """Přidat request do kontextu serializeru"""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def create(self, request, *args, **kwargs):
        """Vytvoření nové operace - pouze pro doktory"""
        # Debug logging
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"CREATE OPERATION: User={request.user}, Type={type(request.user)}")
        logger.info(f"Has profile: {hasattr(request.user, 'profile')}")
        if hasattr(request.user, 'profile'):
            logger.info(f"Profile role: {request.user.profile.role}")
        
        # Kontrola, že uživatel je doktor
        if not hasattr(request.user, 'profile') or request.user.profile.role != 'doctor':
            logger.warning(f"403 - User denied: has_profile={hasattr(request.user, 'profile')}, role={request.user.profile.role if hasattr(request.user, 'profile') else 'NO PROFILE'}")
            return Response(
                {'error': 'Pouze doktoři mohou vytvářet operace'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        operation = serializer.save()
        
        # Vrátit detailní serializér pro odpověď
        response_serializer = OperationDetailSerializer(operation)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        """Aktualizace operace - admin může zrušit a přeplánovat schválené operace"""
        operation = self.get_object()
        partial = kwargs.pop('partial', False)
        
        # Admin může aktualizovat schválené/naplánované operace (zrušit, přeplánovat)
        if hasattr(request.user, 'profile') and request.user.profile.role == 'admin':
            if operation.status in ['approved', 'scheduled']:
                # Admin může aktualizovat status (zrušit) nebo scheduled_start/scheduled_end (přeplánovat)
                # Použít OperationListSerializer pro update, protože má fields = '__all__'
                serializer = OperationListSerializer(operation, data=request.data, partial=partial, context={'request': request})
                if serializer.is_valid():
                    serializer.save()
                    # Načíst aktualizovanou operaci a vrátit detailní serializer
                    operation.refresh_from_db()
                    response_serializer = OperationDetailSerializer(operation)
                    return Response(response_serializer.data)
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            else:
                return Response(
                    {'error': 'Admin může upravovat pouze schválené nebo naplánované operace'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Ostatní role nemohou aktualizovat operace přes update endpoint
        return Response(
            {'error': 'Nemáte oprávnění k úpravě operace'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    def partial_update(self, request, *args, **kwargs):
        """PATCH request - stejné jako update s partial=True"""
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)
    
    @action(detail=True, methods=['post'], url_path='submit-for-approval')
    def submit_for_approval(self, request, pk=None):
        """Odeslat operaci ke schválení - pouze doktor, který ji vytvořil"""
        operation = self.get_object()
        
        # Kontrola oprávnění (pro DEMO: pokud je created_by NULL, povolit)
        if operation.created_by and operation.created_by != request.user:
            return Response(
                {'error': 'Můžete odeslat ke schválení pouze své operace'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if operation.status != 'draft':
            return Response(
                {'error': 'Operaci lze odeslat ke schválení pouze ve stavu "Návrh"'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        operation.status = 'pending_approval'
        operation.save()
        
        serializer = self.get_serializer(operation)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], url_path='approve')
    def approve_operation(self, request, pk=None):
        """Schválit operaci - pouze admin"""
        operation = self.get_object()
        
        # Kontrola, že uživatel je admin
        if not hasattr(request.user, 'profile') or request.user.profile.role != 'admin':
            return Response(
                {'error': 'Pouze administrátoři mohou schvalovat operace'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if operation.status != 'pending_approval':
            return Response(
                {'error': 'Operaci lze schválit pouze ve stavu "Čeká na schválení"'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        print(f"DEBUG approve: request.data = {request.data}")
        serializer = OperationApprovalSerializer(data=request.data)
        if not serializer.is_valid():
            print(f"DEBUG approve: serializer.errors = {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        if serializer.validated_data['approved']:
            operation.status = 'approved'
            # Pro DEMO: approved_by nastavit na None, protože MockUser není Django User
            operation.approved_by = None
            operation.approved_at = timezone.now()
            if serializer.validated_data.get('notes'):
                operation.notes = f"{operation.notes}\n\nPoznámka admina: {serializer.validated_data['notes']}"
            operation.save()
            response_serializer = OperationDetailSerializer(operation)
            return Response(response_serializer.data)
        else:
            # Operace zamítnuta - smazat ji
            operation.delete()
            return Response(
                {'message': 'Operace byla zamítnuta a smazána', 'reason': serializer.validated_data.get('notes', '')},
                status=status.HTTP_200_OK
            )
    
    @action(detail=True, methods=['post'], url_path='assign-staff')
    def assign_staff(self, request, pk=None):
        """Přiřadit personál k operaci - pouze sestra"""
        operation = self.get_object()
        
        # Kontrola, že uživatel je sestra
        if not hasattr(request.user, 'profile') or request.user.profile.role != 'nurse':
            return Response(
                {'error': 'Pouze sestry mohou přiřazovat personál'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if operation.status != 'approved':
            return Response(
                {'error': 'Personál lze přiřadit pouze ke schválené operaci'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = OperationStaffAssignmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Přiřadit asistující doktory
        if 'assisting_doctor_ids' in serializer.validated_data:
            operation.assisting_doctors.set(serializer.validated_data['assisting_doctor_ids'])
        
        # Aktualizovat poznámky
        if serializer.validated_data.get('notes'):
            operation.notes = f"{operation.notes}\n\nPoznámka sestry: {serializer.validated_data['notes']}"
        
        # Změnit status na naplánováno
        operation.status = 'scheduled'
        operation.save()
        
        response_serializer = OperationDetailSerializer(operation)
        return Response(response_serializer.data)
    
    @action(detail=False, methods=['get'])
    def my_operations(self, request):
        """Operace vytvořené přihlášeným uživatelem"""
        operations = Operation.objects.filter(created_by=request.user)
        serializer = self.get_serializer(operations, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='pending-approval')
    def pending_approval(self, request):
        """Operace čekající na schválení - pro adminy"""
        if not hasattr(request.user, 'profile') or request.user.profile.role != 'admin':
            return Response(
                {'error': 'Pouze administrátoři mohou zobrazit operace čekající na schválení'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        operations = Operation.objects.filter(status='pending_approval')
        serializer = self.get_serializer(operations, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='approved-operations')
    def approved_operations(self, request):
        """Schválené operace čekající na přiřazení personálu - pro sestry"""
        if not hasattr(request.user, 'profile') or request.user.profile.role != 'nurse':
            return Response(
                {'error': 'Pouze sestry mohou zobrazit schválené operace'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        operations = Operation.objects.filter(status='approved')
        serializer = self.get_serializer(operations, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def today(self, request):
        """Operace pro dnešní den"""
        today = timezone.now().date()
        operations = Operation.objects.filter(
            scheduled_start__date=today
        )
        serializer = self.get_serializer(operations, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Aktuálně probíhající operace"""
        operations = Operation.objects.filter(status='in_progress')
        serializer = self.get_serializer(operations, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        """Zahájit operaci"""
        operation = self.get_object()
        operation.status = 'in_progress'
        operation.actual_start = timezone.now()
        operation.save()
        serializer = self.get_serializer(operation)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Dokončit operaci"""
        operation = self.get_object()
        operation.status = 'completed'
        operation.actual_end = timezone.now()
        operation.save()
        serializer = self.get_serializer(operation)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'], url_path='auto-update-statuses')
    def auto_update_statuses(self, request):
        """Automaticky aktualizovat statusy všech operací na základě času"""
        now = timezone.now()
        
        # 1. Spustit operace, které měly začít
        scheduled_to_start = Operation.objects.filter(
            status='scheduled',
            scheduled_start__lte=now,
            scheduled_end__gte=now
        )
        started_count = 0
        for op in scheduled_to_start:
            op.status = 'in_progress'
            if not op.actual_start:
                op.actual_start = op.scheduled_start
            op.save(update_fields=['status', 'actual_start'])
            started_count += 1
        
        # 2. Ukončit operace, které měly skončit
        operations_to_complete = Operation.objects.filter(
            status='in_progress',
            scheduled_end__lt=now
        )
        completed_count = 0
        for op in operations_to_complete:
            op.status = 'completed'
            if not op.actual_end:
                op.actual_end = op.scheduled_end
            op.save(update_fields=['status', 'actual_end'])
            completed_count += 1
        
        return Response({
            'message': 'Statusy operací byly aktualizovány',
            'started': started_count,
            'completed': completed_count,
            'timestamp': now.isoformat()
        })


class PerioperativeProtocolViewSet(viewsets.ModelViewSet):
    queryset = PerioperativeProtocol.objects.all()
    serializer_class = PerioperativeProtocolSerializer
    
    @action(detail=True, methods=['post'])
    def add_equipment(self, request, pk=None):
        """Přidat použitý přístroj"""
        protocol = self.get_object()
        equipment_id = request.data.get('equipment_id')
        hours_used = float(request.data.get('hours_used', 0))
        
        equipment = Equipment.objects.get(id=equipment_id)
        cost = equipment.hourly_depreciation * hours_used
        
        usage = EquipmentUsage.objects.create(
            protocol=protocol,
            equipment=equipment,
            hours_used=hours_used,
            cost=cost
        )
        
        # Aktualizovat celkové náklady
        protocol.total_equipment_cost += cost
        protocol.save()
        
        # Aktualizovat využité hodiny přístroje
        equipment.used_hours += int(hours_used)
        equipment.save()
        
        serializer = EquipmentUsageSerializer(usage)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_material(self, request, pk=None):
        """Přidat použitý materiál"""
        protocol = self.get_object()
        material_id = request.data.get('material_id')
        quantity_used = int(request.data.get('quantity_used', 1))
        
        material = Material.objects.get(id=material_id)
        cost = material.unit_price * quantity_used
        
        usage = MaterialUsage.objects.create(
            protocol=protocol,
            material=material,
            quantity_used=quantity_used,
            cost=cost
        )
        
        # Aktualizovat celkové náklady
        protocol.total_material_cost += cost
        protocol.save()
        
        # Aktualizovat stav skladu
        material.stock_quantity -= quantity_used
        material.save()
        
        serializer = MaterialUsageSerializer(usage)
        return Response(serializer.data)


class DashboardViewSet(viewsets.ViewSet):
    """Dashboard API pro přehled statistik"""
    
    def _auto_update_operation_statuses(self):
        """Automaticky aktualizovat statusy operací na základě času"""
        now = timezone.now()
        
        # 1. Automaticky spustit operace, které měly začít
        scheduled_to_start = Operation.objects.filter(
            status='scheduled',
            scheduled_start__lte=now,
            scheduled_end__gte=now
        )
        for op in scheduled_to_start:
            op.status = 'in_progress'
            if not op.actual_start:
                op.actual_start = op.scheduled_start
            op.save(update_fields=['status', 'actual_start'])
            print(f"Auto-started operation {op.id}: {op.operation_type}")
        
        # 2. Automaticky ukončit operace, které měly skončit
        operations_to_complete = Operation.objects.filter(
            status='in_progress',
            scheduled_end__lt=now
        )
        for op in operations_to_complete:
            op.status = 'completed'
            if not op.actual_end:
                op.actual_end = op.scheduled_end
            op.save(update_fields=['status', 'actual_end'])
            print(f"Auto-completed operation {op.id}: {op.operation_type}")
        
        return {
            'started': scheduled_to_start.count(),
            'completed': operations_to_complete.count()
        }
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Získat statistiky pro dashboard"""
        # Automaticky aktualizovat statusy operací před zobrazením statistik
        auto_update_result = self._auto_update_operation_statuses()
        print(f"Auto-update: started={auto_update_result['started']}, completed={auto_update_result['completed']}")
        
        today = timezone.now().date()
        now = timezone.now()
        
        # Základní statistiky
        total_rooms = OperatingRoom.objects.filter(is_active=True).count()
        active_operations = Operation.objects.filter(status='in_progress').count()
        operations_today = Operation.objects.filter(
            scheduled_start__date=today
        ).count()
        total_patients = Patient.objects.count()
        
        # Vytížení sálů s detailními informacemi pro frontend
        rooms = OperatingRoom.objects.filter(is_active=True)
        room_utilization = []
        
        for room in rooms:
            # Operace pro dnešek
            operations_today_room = room.operations.filter(
                scheduled_start__date=today
            )
            
            # Aktuální běžící operace (pouze ty, které opravdu probíhají TEĎKA)
            current_operation = room.operations.filter(
                status='in_progress',
                scheduled_start__lte=now,
                scheduled_end__gte=now
            ).first()
            
            # Nadcházející operace
            next_operation = room.operations.filter(
                scheduled_start__gt=now,
                status='scheduled'
            ).order_by('scheduled_start').first()
            
            # Určit status místnosti
            if current_operation:
                status = 'active'
            else:
                status = 'available'
            
            # Počet urgentních operací dnes
            urgent_today = operations_today_room.filter(is_emergency=True).count()
            
            # Průměrná délka operací dnes (v hodinách)
            operations_with_duration = [op for op in operations_today_room if op.duration_hours]
            avg_duration = sum(op.duration_hours for op in operations_with_duration) / len(operations_with_duration) if operations_with_duration else 0
            
            # Počet nadcházejících operací (příštích 7 dní)
            week_end = today + timedelta(days=7)
            upcoming_count = room.operations.filter(
                scheduled_start__date__gte=today,
                scheduled_start__date__lte=week_end,
                status='scheduled'
            ).count()
            
            # Počet dokončených operací tento týden
            week_start = today - timedelta(days=today.weekday())
            completed_this_week = room.operations.filter(
                scheduled_start__date__gte=week_start,
                status='completed'
            ).count()
            
            room_data = {
                'id': room.id,
                'name': room.name,
                'room_number': room.room_number,
                'building': f'Patro {room.floor}',
                'status': status,
                'scheduledToday': operations_today_room.count(),
                'urgentToday': urgent_today,
                'avgDurationHours': round(avg_duration, 1),
                'upcomingCount': upcoming_count,
                'completedThisWeek': completed_this_week,
            }
            
            # Přidat informace o aktuální operaci
            if current_operation:
                room_data['currentOperation'] = {
                    'id': current_operation.id,
                    'type': current_operation.operation_type,
                    'startTime': current_operation.scheduled_start.isoformat() if current_operation.scheduled_start else None,
                    'estimatedEnd': current_operation.scheduled_end.isoformat() if current_operation.scheduled_end else None,
                    'surgeon': f"Dr. {current_operation.primary_doctor.first_name} {current_operation.primary_doctor.last_name}" if current_operation.primary_doctor else 'N/A',
                    'patient': f"{current_operation.patient.first_name} {current_operation.patient.last_name}" if current_operation.patient else 'N/A',
                }
            
            # Přidat informace o nadcházející operaci
            if next_operation and not current_operation:
                room_data['nextOperation'] = {
                    'id': next_operation.id,
                    'scheduledTime': next_operation.scheduled_start.isoformat() if next_operation.scheduled_start else None,
                    'type': next_operation.operation_type,
                }
            
            room_utilization.append(room_data)
        
        # Nadcházející operace
        upcoming_operations = Operation.objects.filter(
            scheduled_start__gte=now,
            status='scheduled'
        ).order_by('scheduled_start')[:10]
        
        data = {
            'total_rooms': total_rooms,
            'active_operations': active_operations,
            'operations_today': operations_today,
            'total_patients': total_patients,
            'room_utilization': room_utilization,
            'upcoming_operations': OperationListSerializer(upcoming_operations, many=True).data
        }
        
        return Response(data)


class OperationToolViewSet(viewsets.ModelViewSet):
    """ViewSet pro správu operačních nástrojů s podporou CSV importu"""
    queryset = OperationTool.objects.all()
    serializer_class = OperationToolSerializer
    parser_classes = [MultiPartParser, FormParser]
    
    @action(detail=False, methods=['post'], url_path='upload-csv')
    def upload_csv(self, request):
        """
        Upload CSV souboru s nástroji a import do databáze
        
        Očekávaný formát CSV (semicolon-delimited):
        #;Název Nástroje;Kategorie;Fiktivní Inventární Kód;Cena Sterilizace (Kč/Použití Fikt.);UDI DataMatrix Kód (GS1 Formát)
        """
        if 'file' not in request.FILES:
            return Response(
                {'error': 'Soubor nebyl nahrán. Použijte klíč "file" pro upload.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        csv_file = request.FILES['file']
        
        # Ověření, že se jedná o CSV soubor
        if not csv_file.name.endswith('.csv'):
            return Response(
                {'error': 'Soubor musí být ve formátu CSV (.csv)'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Přečtení CSV souboru (semicolon delimiter, UTF-8-sig pro BOM)
            decoded_file = csv_file.read().decode('utf-8-sig')
            io_string = io.StringIO(decoded_file)
            reader = csv.DictReader(io_string, delimiter=';')
            
            imported = 0
            updated = 0
            errors = []
            
            for row_num, row in enumerate(reader, start=2):  # Start at 2 (header is row 1)
                try:
                    # Mapování CSV sloupců na model fields (Czech column names)
                    name = row.get('Název Nástroje', '').strip()
                    category = row.get('Kategorie', '').strip()
                    inventory_code = row.get('Fiktivní Inventární Kód', '').strip()
                    sterilization_cost_str = row.get('Cena Sterilizace (Kč/Použití Fikt.)', '').strip()
                    udi_code = row.get('UDI DataMatrix Kód (GS1 Formát)', '').strip()
                    
                    # Validace povinných polí
                    if not name:
                        errors.append(f'Řádek {row_num}: Chybí název nástroje')
                        continue
                    
                    if not category:
                        errors.append(f'Řádek {row_num}: Chybí kategorie')
                        continue
                    
                    # Konverze ceny sterilizace (Czech format: comma as decimal separator)
                    sterilization_cost = None
                    if sterilization_cost_str:
                        try:
                            # Nahradit čárku tečkou pro Python float
                            cost_str = sterilization_cost_str.replace(',', '.')
                            sterilization_cost = float(cost_str)
                        except ValueError:
                            errors.append(f'Řádek {row_num}: Neplatná cena sterilizace: {sterilization_cost_str}')
                            # Continue anyway, set to None
                    
                    # Výchozí hodnoty
                    quantity = 0  # Not in CSV, default to 0
                    lifespan = None  # Not in CSV
                    unit = 'použití'  # Default
                    status_val = 'good'  # Default
                    
                    # Automatické určení statusu na základě ceny (volitelné)
                    if sterilization_cost:
                        if sterilization_cost > 50:
                            status_val = 'warning'
                        elif sterilization_cost > 60:
                            status_val = 'critical'
                    
                    # Vytvoření nebo aktualizace záznamu (podle inventárního kódu nebo názvu)
                    lookup_field = {}
                    if inventory_code:
                        lookup_field['inventory_code'] = inventory_code
                    else:
                        lookup_field['name'] = name
                        lookup_field['category'] = category
                    
                    tool, created = OperationTool.objects.update_or_create(
                        **lookup_field,
                        defaults={
                            'name': name,
                            'category': category,
                            'inventory_code': inventory_code if inventory_code else None,
                            'sterilization_cost': sterilization_cost,
                            'udi_code': udi_code if udi_code else None,
                            'quantity': quantity,
                            'lifespan': lifespan,
                            'unit': unit,
                            'status': status_val,
                        }
                    )
                    
                    if created:
                        imported += 1
                    else:
                        updated += 1
                        
                except Exception as e:
                    errors.append(f'Řádek {row_num}: Chyba při zpracování - {str(e)}')
                    continue
            
            result = {
                'message': 'CSV soubor byl úspěšně zpracován',
                'imported': imported,
                'updated': updated,
                'total_processed': imported + updated,
            }
            
            if errors:
                result['errors'] = errors
                result['error_count'] = len(errors)
            
            return Response(result, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': f'Chyba při zpracování CSV souboru: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'], url_path='export-csv')
    def export_csv(self, request):
        """
        Export všech nástrojů do CSV formátu (semicolon-delimited, Czech format)
        """
        response = Response(content_type='text/csv; charset=utf-8-sig')
        response['Content-Disposition'] = 'attachment; filename="operation_tools.csv"'
        
        writer = csv.writer(response, delimiter=';')
        writer.writerow(['#', 'Název Nástroje', 'Kategorie', 'Fiktivní Inventární Kód', 
                        'Cena Sterilizace (Kč/Použití Fikt.)', 'UDI DataMatrix Kód (GS1 Formát)'])
        
        tools = OperationTool.objects.all()
        for idx, tool in enumerate(tools, start=1):
            # Konverze ceny zpět na český formát (čárka místo tečky)
            cost_str = ''
            if tool.sterilization_cost:
                cost_str = str(tool.sterilization_cost).replace('.', ',')
            
            writer.writerow([
                idx,
                tool.name,
                tool.category,
                tool.inventory_code or '',
                cost_str,
                tool.udi_code or ''
            ])
        
        return response
