"""
Serializers pro správu personálu, nástrojů a materiálů u operací
"""
from rest_framework import serializers
from decimal import Decimal
from .models import (
    Operation, Doctor, OperationTool, Material, Equipment,
    PerioperativeProtocol, EquipmentUsage, MaterialUsage
)


class OperationStaffDetailSerializer(serializers.Serializer):
    """Serializer pro zobrazení personálu u operace s náklady"""
    doctor_id = serializers.IntegerField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    specialization = serializers.CharField()
    hourly_rate = serializers.DecimalField(max_digits=10, decimal_places=2)
    role = serializers.CharField()  # 'primary' nebo 'assisting'
    estimated_cost = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)


class AddPersonnelSerializer(serializers.Serializer):
    """Serializer pro přidání personálu k operaci"""
    primary_doctor_id = serializers.IntegerField(required=False, allow_null=True)
    assisting_doctor_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True
    )
    
    def validate_primary_doctor_id(self, value):
        if value and not Doctor.objects.filter(id=value).exists():
            raise serializers.ValidationError("Primární lékař neexistuje")
        return value
    
    def validate_assisting_doctor_ids(self, value):
        for doctor_id in value:
            if not Doctor.objects.filter(id=doctor_id).exists():
                raise serializers.ValidationError(f"Asistující lékař s ID {doctor_id} neexistuje")
        return value


class AddToolSerializer(serializers.Serializer):
    """Serializer pro přidání nástroje k operaci"""
    tool_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1, default=1)
    
    def validate_tool_id(self, value):
        if not OperationTool.objects.filter(id=value).exists():
            raise serializers.ValidationError("Nástroj neexistuje")
        return value


class AddMaterialSerializer(serializers.Serializer):
    """Serializer pro přidání materiálu k operaci"""
    material_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)
    
    def validate(self, data):
        try:
            material = Material.objects.get(id=data['material_id'])
            if material.stock_quantity < data['quantity']:
                raise serializers.ValidationError(
                    f"Nedostatek materiálu na skladě. Dostupné: {material.stock_quantity}, požadováno: {data['quantity']}"
                )
        except Material.DoesNotExist:
            raise serializers.ValidationError("Materiál neexistuje")
        
        return data


class AddEquipmentSerializer(serializers.Serializer):
    """Serializer pro přidání přístroje k operaci"""
    equipment_id = serializers.IntegerField()
    estimated_hours = serializers.DecimalField(max_digits=5, decimal_places=2, min_value=0)
    
    def validate_equipment_id(self, value):
        try:
            equipment = Equipment.objects.get(id=value)
            if not equipment.is_operational:
                raise serializers.ValidationError("Přístroj není v provozu")
        except Equipment.DoesNotExist:
            raise serializers.ValidationError("Přístroj neexistuje")
        return value


class ToolUsageSerializer(serializers.Serializer):
    """Serializer pro zobrazení použitých nástrojů"""
    tool_id = serializers.IntegerField()
    name = serializers.CharField()
    category = serializers.CharField()
    inventory_code = serializers.CharField()
    sterilization_cost = serializers.DecimalField(max_digits=10, decimal_places=2)
    quantity = serializers.IntegerField()
    total_cost = serializers.DecimalField(max_digits=12, decimal_places=2)


class MaterialUsageDetailSerializer(serializers.ModelSerializer):
    """Detailní serializer pro použitý materiál"""
    material_name = serializers.CharField(source='material.name')
    material_ean = serializers.CharField(source='material.ean_code')
    unit = serializers.CharField(source='material.unit')
    unit_price = serializers.DecimalField(source='material.unit_price', max_digits=10, decimal_places=2)
    
    class Meta:
        model = MaterialUsage
        fields = ['id', 'material_id', 'material_name', 'material_ean', 'unit', 
                  'unit_price', 'quantity_used', 'cost', 'scanned_at']


class EquipmentUsageDetailSerializer(serializers.ModelSerializer):
    """Detailní serializer pro použitý přístroj"""
    equipment_name = serializers.CharField(source='equipment.name')
    equipment_code = serializers.CharField(source='equipment.equipment_code')
    hourly_depreciation = serializers.DecimalField(
        source='equipment.hourly_depreciation',
        max_digits=10,
        decimal_places=2
    )
    
    class Meta:
        model = EquipmentUsage
        fields = ['id', 'equipment_id', 'equipment_name', 'equipment_code',
                  'hourly_depreciation', 'hours_used', 'cost']


class OperationCostSummarySerializer(serializers.Serializer):
    """Serializer pro souhrn nákladů operace"""
    personnel_cost = serializers.DecimalField(max_digits=12, decimal_places=2)
    tools_cost = serializers.DecimalField(max_digits=12, decimal_places=2)
    materials_cost = serializers.DecimalField(max_digits=12, decimal_places=2)
    equipment_cost = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_cost = serializers.DecimalField(max_digits=12, decimal_places=2)
    
    personnel_details = serializers.ListField(child=OperationStaffDetailSerializer())
    tools_details = serializers.ListField(child=ToolUsageSerializer())
    materials_details = serializers.ListField(child=MaterialUsageDetailSerializer())
    equipment_details = serializers.ListField(child=EquipmentUsageDetailSerializer())
