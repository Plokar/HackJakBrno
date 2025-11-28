from rest_framework import serializers
from .models import (
    OperatingRoom, Patient, Doctor, Equipment, Material,
    Operation, PerioperativeProtocol, EquipmentUsage, MaterialUsage
)


class OperatingRoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = OperatingRoom
        fields = '__all__'


class PatientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Patient
        fields = '__all__'


class DoctorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Doctor
        fields = '__all__'


class EquipmentSerializer(serializers.ModelSerializer):
    hourly_depreciation = serializers.ReadOnlyField()
    remaining_lifetime_percent = serializers.ReadOnlyField()
    
    class Meta:
        model = Equipment
        fields = '__all__'


class MaterialSerializer(serializers.ModelSerializer):
    class Meta:
        model = Material
        fields = '__all__'


class OperationListSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    room_name = serializers.SerializerMethodField()
    doctor_name = serializers.SerializerMethodField()
    duration_hours = serializers.ReadOnlyField()
    
    class Meta:
        model = Operation
        fields = '__all__'
    
    def get_patient_name(self, obj):
        return f"{obj.patient.first_name} {obj.patient.last_name}"
    
    def get_room_name(self, obj):
        return obj.operating_room.name
    
    def get_doctor_name(self, obj):
        return f"Dr. {obj.primary_doctor.first_name} {obj.primary_doctor.last_name}"


class OperationDetailSerializer(serializers.ModelSerializer):
    patient = PatientSerializer(read_only=True)
    operating_room = OperatingRoomSerializer(read_only=True)
    primary_doctor = DoctorSerializer(read_only=True)
    assisting_doctors = DoctorSerializer(many=True, read_only=True)
    duration_hours = serializers.ReadOnlyField()
    
    class Meta:
        model = Operation
        fields = '__all__'


class EquipmentUsageSerializer(serializers.ModelSerializer):
    equipment_name = serializers.SerializerMethodField()
    
    class Meta:
        model = EquipmentUsage
        fields = '__all__'
    
    def get_equipment_name(self, obj):
        return obj.equipment.name


class MaterialUsageSerializer(serializers.ModelSerializer):
    material_name = serializers.SerializerMethodField()
    
    class Meta:
        model = MaterialUsage
        fields = '__all__'
    
    def get_material_name(self, obj):
        return obj.material.name


class PerioperativeProtocolSerializer(serializers.ModelSerializer):
    operation = OperationDetailSerializer(read_only=True)
    equipment_used = EquipmentUsageSerializer(source='equipmentusage_set', many=True, read_only=True)
    materials_used = MaterialUsageSerializer(source='materialusage_set', many=True, read_only=True)
    total_cost = serializers.ReadOnlyField()
    
    class Meta:
        model = PerioperativeProtocol
        fields = '__all__'


class DashboardStatsSerializer(serializers.Serializer):
    """Serializer pro statistiky dashboardu"""
    total_rooms = serializers.IntegerField()
    active_operations = serializers.IntegerField()
    operations_today = serializers.IntegerField()
    total_patients = serializers.IntegerField()
    room_utilization = serializers.ListField()
    upcoming_operations = OperationListSerializer(many=True)
