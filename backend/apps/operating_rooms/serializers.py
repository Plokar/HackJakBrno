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


class OperationCreateSerializer(serializers.Serializer):
    """Serializer pro vytvoření operace včetně pacienta"""
    # Operation fields
    operation_type = serializers.CharField(max_length=200)
    operating_room_id = serializers.IntegerField()
    primary_doctor_id = serializers.IntegerField()
    scheduled_start = serializers.DateTimeField()
    scheduled_end = serializers.DateTimeField()
    is_emergency = serializers.BooleanField(default=False)
    notes = serializers.CharField(required=False, allow_blank=True)
    
    # Patient fields
    patient_first_name = serializers.CharField(max_length=100)
    patient_last_name = serializers.CharField(max_length=100)
    patient_birth_number = serializers.CharField(max_length=20)
    patient_date_of_birth = serializers.DateField()
    patient_diagnosis = serializers.CharField()
    patient_medical_history = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, data):
        # Validate that end time is after start time
        if data['scheduled_end'] <= data['scheduled_start']:
            raise serializers.ValidationError({
                'scheduled_end': 'Konec operace musí být po začátku'
            })
        
        # Validate that operating room exists
        if not OperatingRoom.objects.filter(id=data['operating_room_id']).exists():
            raise serializers.ValidationError({
                'operating_room_id': 'Operační sál neexistuje'
            })
        
        # Validate that doctor exists
        if not Doctor.objects.filter(id=data['primary_doctor_id']).exists():
            raise serializers.ValidationError({
                'primary_doctor_id': 'Lékař neexistuje'
            })
        
        return data
    
    def create(self, validated_data):
        # Create or get patient
        patient, created = Patient.objects.get_or_create(
            birth_number=validated_data['patient_birth_number'],
            defaults={
                'first_name': validated_data['patient_first_name'],
                'last_name': validated_data['patient_last_name'],
                'date_of_birth': validated_data['patient_date_of_birth'],
                'diagnosis': validated_data['patient_diagnosis'],
                'medical_history': validated_data.get('patient_medical_history', ''),
            }
        )
        
        # If patient exists, update their diagnosis and medical history
        if not created:
            patient.diagnosis = validated_data['patient_diagnosis']
            if validated_data.get('patient_medical_history'):
                patient.medical_history = validated_data['patient_medical_history']
            patient.save()
        
        # Create operation
        operation = Operation.objects.create(
            patient=patient,
            operating_room_id=validated_data['operating_room_id'],
            primary_doctor_id=validated_data['primary_doctor_id'],
            operation_type=validated_data['operation_type'],
            scheduled_start=validated_data['scheduled_start'],
            scheduled_end=validated_data['scheduled_end'],
            is_emergency=validated_data.get('is_emergency', False),
            notes=validated_data.get('notes', ''),
            status='scheduled'
        )
        
        return operation


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
