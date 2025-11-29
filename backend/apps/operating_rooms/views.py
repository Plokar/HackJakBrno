from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Q, Sum
from django.utils import timezone
from datetime import datetime, timedelta
from .models import (
    OperatingRoom, Patient, Doctor, Equipment, Material,
    Operation, PerioperativeProtocol, EquipmentUsage, MaterialUsage
)
from .serializers import (
    OperatingRoomSerializer, PatientSerializer, DoctorSerializer,
    EquipmentSerializer, MaterialSerializer, OperationListSerializer,
    OperationDetailSerializer, OperationCreateSerializer, PerioperativeProtocolSerializer,
    DashboardStatsSerializer, EquipmentUsageSerializer, MaterialUsageSerializer
)


class OperatingRoomViewSet(viewsets.ModelViewSet):
    queryset = OperatingRoom.objects.all()
    serializer_class = OperatingRoomSerializer
    
    @action(detail=True, methods=['get'], url_path='detail')
    def room_detail(self, request, pk=None):
        """Získat detailní informace o sále včetně aktuální operace"""
        room = self.get_object()
        today = timezone.now().date()
        
        # Aktuální operace
        current_operation = room.operations.filter(status='in_progress').first()
        
        # Nadcházející operace
        upcoming_operations = room.operations.filter(
            scheduled_start__gte=timezone.now(),
            status='scheduled'
        ).order_by('scheduled_start')[:5]
        
        # Statistiky pro dnešek
        operations_today = room.operations.filter(
            scheduled_start__date=today
        ).count()
        
        # Vytížení dnes
        total_hours_today = sum(
            op.duration_hours or 0 
            for op in room.operations.filter(scheduled_start__date=today)
        )
        utilization_today = (total_hours_today / 8 * 100) if total_hours_today else 0
        
        # Operace tento týden
        week_start = today - timedelta(days=today.weekday())
        operations_week = room.operations.filter(
            scheduled_start__date__gte=week_start
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
            'utilization_today': round(utilization_today, 2),
            'operations_week': operations_week,
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
        
        # Předpokládáme 8 hodin/den dostupnosti
        available_hours = days * 8
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
    
    def get_serializer_class(self):
        if self.action == 'create':
            return OperationCreateSerializer
        elif self.action == 'retrieve':
            return OperationDetailSerializer
        return OperationListSerializer
    
    def create(self, request, *args, **kwargs):
        """Vytvoření nové operace včetně pacienta"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        operation = serializer.save()
        
        # Vrátit detailní serializér pro odpověď
        response_serializer = OperationDetailSerializer(operation)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
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
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Získat statistiky pro dashboard"""
        today = timezone.now().date()
        
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
            
            # Aktuální běžící operace
            current_operation = room.operations.filter(status='in_progress').first()
            
            # Nadcházející operace
            next_operation = room.operations.filter(
                scheduled_start__gte=timezone.now(),
                status='scheduled'
            ).order_by('scheduled_start').first()
            
            total_hours = sum(op.duration_hours or 0 for op in operations_today_room)
            utilization = (total_hours / 8 * 100) if total_hours else 0
            
            # Určit status místnosti
            if current_operation:
                status = 'active'
            else:
                status = 'available'
            
            room_data = {
                'id': room.id,
                'name': room.name,
                'room_number': room.room_number,
                'building': f'Patro {room.floor}',
                'status': status,
                'utilization': round(utilization, 2),
                'scheduledToday': operations_today_room.count(),
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
            scheduled_start__gte=timezone.now(),
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
