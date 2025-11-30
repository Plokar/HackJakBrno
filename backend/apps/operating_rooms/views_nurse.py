"""
API endpointy pro práci sestřičky s operacemi
Správa personálu, nástrojů, materiálů a výpočet nákladů
"""
from rest_framework import viewsets, status, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.utils import timezone
from decimal import Decimal

from .models import (
    Operation, Doctor, OperationTool, Material, Equipment,
    PerioperativeProtocol, EquipmentUsage, MaterialUsage, ToolUsage
)
from .serializers_staff import (
    OperationStaffDetailSerializer, AddPersonnelSerializer,
    AddToolSerializer, AddMaterialSerializer, AddEquipmentSerializer,
    OperationCostSummarySerializer, ToolUsageSerializer,
    MaterialUsageDetailSerializer, EquipmentUsageDetailSerializer
)


class OperationNurseViewSet(mixins.RetrieveModelMixin,
                            mixins.ListModelMixin,
                            viewsets.GenericViewSet):
    """ViewSet pro práci sestřičky s operacemi"""
    
    queryset = Operation.objects.all()
    serializer_class = OperationStaffDetailSerializer
    
    @action(detail=True, methods=['post'], url_path='add-personnel')
    def add_personnel(self, request, pk=None):
        """Přidat nebo změnit personál k operaci"""
        try:
            operation = Operation.objects.get(pk=pk)
        except Operation.DoesNotExist:
            return Response(
                {'error': 'Operace neexistuje'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = AddPersonnelSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Přiřadit primárního lékaře
        if 'primary_doctor_id' in serializer.validated_data:
            if serializer.validated_data['primary_doctor_id']:
                operation.primary_doctor_id = serializer.validated_data['primary_doctor_id']
            else:
                operation.primary_doctor = None
        
        # Přiřadit asistující lékaře
        if 'assisting_doctor_ids' in serializer.validated_data:
            operation.assisting_doctors.set(serializer.validated_data['assisting_doctor_ids'])
        
        operation.save()
        
        # Spočítat náklady na personál
        personnel_cost = self._calculate_personnel_cost(operation)
        
        # Vytvořit nebo aktualizovat protokol
        protocol, created = PerioperativeProtocol.objects.get_or_create(
            operation=operation,
            defaults={'total_staff_cost': personnel_cost}
        )
        if not created:
            protocol.total_staff_cost = personnel_cost
            protocol.save()
        
        return Response({
            'message': 'Personál byl úspěšně přiřazen',
            'personnel_cost': personnel_cost
        })
    
    @action(detail=True, methods=['post'], url_path='add-tool')
    def add_tool(self, request, pk=None):
        """Přidat nástroj k operaci"""
        try:
            operation = Operation.objects.get(pk=pk)
        except Operation.DoesNotExist:
            return Response(
                {'error': 'Operace neexistuje'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = AddToolSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        tool = OperationTool.objects.get(id=serializer.validated_data['tool_id'])
        quantity = serializer.validated_data['quantity']
        
        # Kontrola dostupnosti
        if tool.quantity < quantity:
            return Response(
                {'error': f'Nedostatek nástroje na skladě. Dostupné: {tool.quantity}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Vytvoř nebo získej protokol
        protocol, created = PerioperativeProtocol.objects.get_or_create(
            operation=operation
        )
        
        # Vypočítat náklady
        cost = (tool.sterilization_cost or Decimal('0')) * quantity
        
        # Přidat nástroj do protokolu
        with transaction.atomic():
            tool_usage, usage_created = ToolUsage.objects.get_or_create(
                protocol=protocol,
                tool=tool,
                defaults={'quantity_used': quantity, 'cost': cost}
            )
            
            if not usage_created:
                # Aktualizovat množství
                protocol.total_tools_cost -= tool_usage.cost
                tool.quantity += tool_usage.quantity_used  # Vrátit staré
                
                tool_usage.quantity_used = quantity
                tool_usage.cost = cost
                tool_usage.save()
            
            # Odečíst ze skladu
            tool.quantity -= quantity
            tool.save()
            
            # Aktualizovat celkové náklady
            protocol.total_tools_cost += cost
            protocol.save()
        
        return Response({
            'message': 'Nástroj byl přidán',
            'tool_usage': {
                'tool_name': tool.name,
                'quantity': quantity,
                'unit_cost': tool.sterilization_cost,
                'total_cost': cost
            },
            'total_tools_cost': protocol.total_tools_cost
        })
    
    @action(detail=True, methods=['post'], url_path='add-material')
    def add_material(self, request, pk=None):
        """Přidat materiál k operaci"""
        try:
            operation = Operation.objects.get(pk=pk)
        except Operation.DoesNotExist:
            return Response(
                {'error': 'Operace neexistuje'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = AddMaterialSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        material = Material.objects.get(id=serializer.validated_data['material_id'])
        quantity = serializer.validated_data['quantity']
        
        # Vytvoř nebo získej protokol
        protocol, created = PerioperativeProtocol.objects.get_or_create(
            operation=operation
        )
        
        # Vypočítat náklady
        cost = material.unit_price * quantity
        
        # Přidat materiál do protokolu
        with transaction.atomic():
            material_usage = MaterialUsage.objects.create(
                protocol=protocol,
                material=material,
                quantity_used=quantity,
                cost=cost
            )
            
            # Odečíst ze skladu
            material.stock_quantity -= quantity
            material.save()
            
            # Aktualizovat celkové náklady
            protocol.total_material_cost += cost
            protocol.save()
        
        return Response({
            'message': 'Materiál byl přidán',
            'material_usage': {
                'material_name': material.name,
                'quantity': quantity,
                'unit_price': material.unit_price,
                'total_cost': cost
            },
            'total_material_cost': protocol.total_material_cost,
            'remaining_stock': material.stock_quantity
        })
    
    @action(detail=True, methods=['post'], url_path='add-equipment')
    def add_equipment(self, request, pk=None):
        """Přidat přístroj k operaci"""
        try:
            operation = Operation.objects.get(pk=pk)
        except Operation.DoesNotExist:
            return Response(
                {'error': 'Operace neexistuje'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = AddEquipmentSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        equipment = Equipment.objects.get(id=serializer.validated_data['equipment_id'])
        hours_used = serializer.validated_data['estimated_hours']
        
        # Vytvoř nebo získej protokol
        protocol, created = PerioperativeProtocol.objects.get_or_create(
            operation=operation
        )
        
        # Vypočítat náklady
        cost = equipment.hourly_depreciation * hours_used
        
        # Přidat přístroj do protokolu
        with transaction.atomic():
            equipment_usage, usage_created = EquipmentUsage.objects.get_or_create(
                protocol=protocol,
                equipment=equipment,
                defaults={'hours_used': hours_used, 'cost': cost}
            )
            
            if not usage_created:
                # Aktualizovat hodiny
                protocol.total_equipment_cost -= equipment_usage.cost
                equipment.used_hours -= int(equipment_usage.hours_used)
                
                equipment_usage.hours_used = hours_used
                equipment_usage.cost = cost
                equipment_usage.save()
            
            # Aktualizovat využité hodiny přístroje
            equipment.used_hours += int(hours_used)
            equipment.save()
            
            # Aktualizovat celkové náklady
            protocol.total_equipment_cost += cost
            protocol.save()
        
        return Response({
            'message': 'Přístroj byl přidán',
            'equipment_usage': {
                'equipment_name': equipment.name,
                'hours_used': hours_used,
                'hourly_rate': equipment.hourly_depreciation,
                'total_cost': cost
            },
            'total_equipment_cost': protocol.total_equipment_cost
        })
    
    @action(detail=True, methods=['get'], url_path='cost-summary')
    def get_cost_summary(self, request, pk=None):
        """Získat souhrn nákladů na operaci"""
        try:
            operation = Operation.objects.get(pk=pk)
        except Operation.DoesNotExist:
            return Response(
                {'error': 'Operace neexistuje'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Spočítat náklady na personál
        personnel_cost = self._calculate_personnel_cost(operation)
        personnel_details = self._get_personnel_details(operation)
        
        # Získat protokol pokud existuje
        try:
            protocol = operation.protocol
            tools_cost = protocol.total_tools_cost
            materials_cost = protocol.total_material_cost
            equipment_cost = protocol.total_equipment_cost
            
            # Detaily
            tools_details = self._get_tools_details(protocol)
            materials_details = self._get_materials_details(protocol)
            equipment_details = self._get_equipment_details(protocol)
        except PerioperativeProtocol.DoesNotExist:
            tools_cost = Decimal('0')
            materials_cost = Decimal('0')
            equipment_cost = Decimal('0')
            tools_details = []
            materials_details = []
            equipment_details = []
        
        total_cost = personnel_cost + tools_cost + materials_cost + equipment_cost
        
        summary = {
            'personnel_cost': personnel_cost,
            'tools_cost': tools_cost,
            'materials_cost': materials_cost,
            'equipment_cost': equipment_cost,
            'total_cost': total_cost,
            'personnel_details': personnel_details,
            'tools_details': tools_details,
            'materials_details': materials_details,
            'equipment_details': equipment_details
        }
        
        serializer = OperationCostSummarySerializer(summary)
        return Response(serializer.data)
    
    def _calculate_personnel_cost(self, operation):
        """Vypočítat náklady na personál"""
        if not operation.duration_hours or operation.duration_hours == 0:
            # Použít odhadovanou délku
            if operation.scheduled_start and operation.scheduled_end:
                delta = operation.scheduled_end - operation.scheduled_start
                hours = Decimal(str(delta.total_seconds() / 3600))
            else:
                hours = Decimal('0')
        else:
            hours = Decimal(str(operation.duration_hours))
        
        total_cost = Decimal('0')
        
        # Primární lékař
        if operation.primary_doctor:
            total_cost += operation.primary_doctor.hourly_rate * hours
        
        # Asistující lékaři
        for doctor in operation.assisting_doctors.all():
            total_cost += doctor.hourly_rate * hours
        
        return total_cost
    
    def _get_personnel_details(self, operation):
        """Získat detaily personálu"""
        details = []
        
        if not operation.duration_hours or operation.duration_hours == 0:
            if operation.scheduled_start and operation.scheduled_end:
                delta = operation.scheduled_end - operation.scheduled_start
                hours = Decimal(str(delta.total_seconds() / 3600))
            else:
                hours = Decimal('0')
        else:
            hours = Decimal(str(operation.duration_hours))
        
        # Primární lékař
        if operation.primary_doctor:
            details.append({
                'doctor_id': operation.primary_doctor.id,
                'first_name': operation.primary_doctor.first_name,
                'last_name': operation.primary_doctor.last_name,
                'specialization': operation.primary_doctor.specialization,
                'hourly_rate': operation.primary_doctor.hourly_rate,
                'role': 'primary',
                'estimated_cost': operation.primary_doctor.hourly_rate * hours
            })
        
        # Asistující lékaři
        for doctor in operation.assisting_doctors.all():
            details.append({
                'doctor_id': doctor.id,
                'first_name': doctor.first_name,
                'last_name': doctor.last_name,
                'specialization': doctor.specialization,
                'hourly_rate': doctor.hourly_rate,
                'role': 'assisting',
                'estimated_cost': doctor.hourly_rate * hours
            })
        
        return details
    
    def _get_tools_details(self, protocol):
        """Získat detaily použitých nástrojů"""
        details = []
        for usage in ToolUsage.objects.filter(protocol=protocol):
            details.append({
                'tool_id': usage.tool.id,
                'name': usage.tool.name,
                'category': usage.tool.category,
                'inventory_code': usage.tool.inventory_code or '',
                'sterilization_cost': usage.tool.sterilization_cost or Decimal('0'),
                'quantity': usage.quantity_used,
                'total_cost': usage.cost
            })
        return details
    
    def _get_materials_details(self, protocol):
        """Získat detaily použitých materiálů"""
        return list(MaterialUsage.objects.filter(protocol=protocol))
    
    def _get_equipment_details(self, protocol):
        """Získat detaily použitých přístrojů"""
        return list(EquipmentUsage.objects.filter(protocol=protocol))
    
    @action(detail=True, methods=['delete'], url_path='remove-tool/(?P<tool_usage_id>[^/.]+)')
    def remove_tool(self, request, pk=None, tool_usage_id=None):
        """Odebrat nástroj z operace"""
        try:
            operation = Operation.objects.get(pk=pk)
            protocol = operation.protocol
            tool_usage = ToolUsage.objects.get(id=tool_usage_id, protocol=protocol)
        except (Operation.DoesNotExist, PerioperativeProtocol.DoesNotExist, ToolUsage.DoesNotExist):
            return Response(
                {'error': 'Záznam nenalezen'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        with transaction.atomic():
            # Vrátit nástroje na sklad
            tool = tool_usage.tool
            tool.quantity += tool_usage.quantity_used
            tool.save()
            
            # Odečíst náklady
            protocol.total_tools_cost -= tool_usage.cost
            protocol.save()
            
            # Smazat záznam
            tool_usage.delete()
        
        return Response({'message': 'Nástroj byl odebrán'})
    
    @action(detail=True, methods=['delete'], url_path='remove-material/(?P<material_usage_id>[^/.]+)')
    def remove_material(self, request, pk=None, material_usage_id=None):
        """Odebrat materiál z operace"""
        try:
            operation = Operation.objects.get(pk=pk)
            protocol = operation.protocol
            material_usage = MaterialUsage.objects.get(id=material_usage_id, protocol=protocol)
        except (Operation.DoesNotExist, PerioperativeProtocol.DoesNotExist, MaterialUsage.DoesNotExist):
            return Response(
                {'error': 'Záznam nenalezen'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        with transaction.atomic():
            # Vrátit materiál na sklad
            material = material_usage.material
            material.stock_quantity += material_usage.quantity_used
            material.save()
            
            # Odečíst náklady
            protocol.total_material_cost -= material_usage.cost
            protocol.save()
            
            # Smazat záznam
            material_usage.delete()
        
        return Response({'message': 'Materiál byl odebrán'})
    
    @action(detail=True, methods=['post'], url_path='complete-preparation')
    def complete_preparation(self, request, pk=None):
        """Dokončit přípravu operace sestrou"""
        try:
            operation = Operation.objects.get(pk=pk)
        except Operation.DoesNotExist:
            return Response(
                {'error': 'Operace neexistuje'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Kontrola stavu operace
        if operation.status not in ['approved', 'scheduled']:
            return Response(
                {'error': 'Přípravu lze dokončit pouze u schválených operací'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Kontrola, zda je přiřazen lékařský tým
        if not operation.primary_doctor:
            return Response(
                {'error': 'Operace musí mít přiřazeného primárního lékaře'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Změnit stav na naplánováno
        operation.status = 'scheduled'
        operation.save()
        
        return Response({
            'message': 'Příprava operace byla úspěšně dokončena',
            'status': operation.status
        })
