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
    OperationDetailSerializer, PerioperativeProtocolSerializer,
    DashboardStatsSerializer, EquipmentUsageSerializer, MaterialUsageSerializer
)


class OperatingRoomViewSet(viewsets.ModelViewSet):
    queryset = OperatingRoom.objects.all()
    serializer_class = OperatingRoomSerializer
    
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
    queryset = Operation.objects.all()
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return OperationDetailSerializer
        return OperationListSerializer
    
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
        
        # Vytížení sálů
        rooms = OperatingRoom.objects.filter(is_active=True)
        room_utilization = []
        
        for room in rooms:
            operations = room.operations.filter(
                scheduled_start__date=today
            )
            total_hours = sum(op.duration_hours or 0 for op in operations)
            utilization = (total_hours / 8 * 100) if total_hours else 0
            
            room_utilization.append({
                'room_id': room.id,
                'room_name': room.name,
                'room_number': room.room_number,
                'operations_count': operations.count(),
                'total_hours': round(total_hours, 2),
                'utilization_percent': round(utilization, 2),
                'status': 'in_use' if operations.filter(status='in_progress').exists() else 'available'
            })
        
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
