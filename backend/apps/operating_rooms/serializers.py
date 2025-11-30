from django.db.models import Q
from rest_framework import serializers
from .models import (
    OperatingRoom, Patient, Doctor, Equipment, Material,
    Operation, PerioperativeProtocol, EquipmentUsage, MaterialUsage,
    OperationTool
)


class OperatingRoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = OperatingRoom
        fields = '__all__'


class OperationSummarySerializer(serializers.ModelSerializer):
    room = serializers.SerializerMethodField()
    primary_doctor_name = serializers.SerializerMethodField()
    patient_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Operation
        fields = [
            'id',
            'operation_type',
            'status',
            'status_display',
            'scheduled_start',
            'scheduled_end',
            'actual_start',
            'actual_end',
            'duration_hours',
            'room',
            'primary_doctor_name',
            'patient_name',
            'is_emergency',
        ]

    def get_room(self, obj):
        if obj.operating_room:
            return {
                'id': obj.operating_room.id,
                'name': obj.operating_room.name,
                'room_number': obj.operating_room.room_number,
            }
        return None

    def get_primary_doctor_name(self, obj):
        if obj.primary_doctor:
            return f"Dr. {obj.primary_doctor.first_name} {obj.primary_doctor.last_name}"
        return None

    def get_patient_name(self, obj):
        if obj.patient:
            return f"{obj.patient.first_name} {obj.patient.last_name}"
        return None


class PatientSerializer(serializers.ModelSerializer):
    operations = serializers.SerializerMethodField()
    active_operation = serializers.SerializerMethodField()

    class Meta:
        model = Patient
        fields = '__all__'

    def get_operations(self, obj):
        operations = obj.operations.order_by('-scheduled_start')[:10]
        return OperationSummarySerializer(operations, many=True).data

    def get_active_operation(self, obj):
        operation = obj.operations.filter(
            status__in=['in_progress', 'scheduled']
        ).order_by('-status', '-scheduled_start').first()
        if operation:
            return OperationSummarySerializer(operation).data
        return None


class DoctorSerializer(serializers.ModelSerializer):
    operations = serializers.SerializerMethodField()
    current_operations = serializers.SerializerMethodField()

    class Meta:
        model = Doctor
        fields = '__all__'

    def get_operations(self, obj):
        operations = Operation.objects.filter(
            Q(primary_doctor=obj) | Q(assisting_doctors=obj)
        ).order_by('-scheduled_start').distinct()[:10]
        return OperationSummarySerializer(operations, many=True).data

    def get_current_operations(self, obj):
        operations = Operation.objects.filter(
            Q(primary_doctor=obj) | Q(assisting_doctors=obj),
            status='in_progress'
        ).order_by('-scheduled_start').distinct()
        if not operations.exists():
            return []
        return OperationSummarySerializer(operations, many=True).data


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
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    approved_by_username = serializers.CharField(source='approved_by.username', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Operation
        fields = '__all__'
    
    def get_patient_name(self, obj):
        return f"{obj.patient.first_name} {obj.patient.last_name}"
    
    def get_room_name(self, obj):
        if obj.operating_room:
            return obj.operating_room.name
        return None  # Nebo 'Nepřiřazeno'
    
    def get_doctor_name(self, obj):
        if obj.primary_doctor:
            return f"Dr. {obj.primary_doctor.first_name} {obj.primary_doctor.last_name}"
        return None  # Nebo 'Nepřiřazeno'


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
    # Operation fields - některá pole jsou nepovinná podle role
    operation_type = serializers.CharField(max_length=200, required=False, allow_blank=True)
    operating_room_id = serializers.IntegerField(required=False, allow_null=True)
    primary_doctor_id = serializers.IntegerField(required=False, allow_null=True)
    scheduled_start = serializers.DateTimeField(required=False, allow_null=True)
    scheduled_end = serializers.DateTimeField(required=False, allow_null=True)
    is_emergency = serializers.BooleanField(default=False)
    notes = serializers.CharField(required=False, allow_blank=True)
    
    # Patient - buď ID existujícího pacienta nebo údaje pro vytvoření nového
    patient_id = serializers.IntegerField(required=False, allow_null=True)
    patient_first_name = serializers.CharField(max_length=100, required=False)
    patient_last_name = serializers.CharField(max_length=100, required=False)
    patient_birth_number = serializers.CharField(max_length=20, required=False)
    patient_date_of_birth = serializers.DateField(required=False)
    patient_diagnosis = serializers.CharField(required=False)
    patient_medical_history = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, data):
        # Validace pouze pokud jsou pole vyplněna
        
        # Validate patient - buď patient_id nebo všechny povinné údaje o pacientovi
        has_patient_id = data.get('patient_id') is not None
        has_patient_data = all([
            data.get('patient_first_name'),
            data.get('patient_last_name'),
            data.get('patient_birth_number'),
            data.get('patient_date_of_birth'),
            data.get('patient_diagnosis')
        ])
        
        if not has_patient_id and not has_patient_data:
            raise serializers.ValidationError({
                'patient': 'Musíte zadat buď ID existujícího pacienta, nebo všechny údaje pro vytvoření nového pacienta'
            })
        
        # Validate that patient exists (pokud je zadán patient_id)
        if has_patient_id:
            if not Patient.objects.filter(id=data['patient_id']).exists():
                raise serializers.ValidationError({
                    'patient_id': 'Pacient s tímto ID neexistuje'
                })
        
        # Validate that end time is after start time (pokud jsou obě vyplněna)
        if data.get('scheduled_end') and data.get('scheduled_start'):
            if data['scheduled_end'] <= data['scheduled_start']:
                raise serializers.ValidationError({
                    'scheduled_end': 'Konec operace musí být po začátku'
                })
        
        # Validate that operating room exists (pokud je vyplněn)
        if data.get('operating_room_id'):
            if not OperatingRoom.objects.filter(id=data['operating_room_id']).exists():
                raise serializers.ValidationError({
                    'operating_room_id': 'Operační sál neexistuje'
                })
        
        # Validate that doctor exists (pokud je vyplněn)
        if data.get('primary_doctor_id'):
            if not Doctor.objects.filter(id=data['primary_doctor_id']).exists():
                raise serializers.ValidationError({
                    'primary_doctor_id': 'Lékař neexistuje'
                })
        
        return data
    
    def create(self, validated_data):
        # Získat nebo vytvořit pacienta
        if validated_data.get('patient_id'):
            # Použít existujícího pacienta podle ID
            patient = Patient.objects.get(id=validated_data['patient_id'])
        else:
            # Vytvořit nebo získat pacienta podle rodného čísla
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
            
            # Pokud pacient existuje, aktualizovat jeho diagnózu a zdravotní historii
            if not created:
                patient.diagnosis = validated_data['patient_diagnosis']
                if validated_data.get('patient_medical_history'):
                    patient.medical_history = validated_data['patient_medical_history']
                patient.save()
        
        # Get request user from context
        request = self.context.get('request')
        # Pro DEMO: MockUser nemůže být přiřazen do ForeignKey, takže nastavíme created_by na None
        # V produkci by zde byl skutečný Django User
        created_by = None
        
        # Create operation - některá pole mohou být NULL podle workflow
        # Doktor vyplní jen pacienta, sestra přidá typ a personál, admin schválí a přiřadí sál
        operation = Operation.objects.create(
            patient=patient,
            operating_room_id=validated_data.get('operating_room_id'),
            primary_doctor_id=validated_data.get('primary_doctor_id'),
            operation_type=validated_data.get('operation_type', ''),
            scheduled_start=validated_data.get('scheduled_start'),
            scheduled_end=validated_data.get('scheduled_end'),
            is_emergency=validated_data.get('is_emergency', False),
            notes=validated_data.get('notes', ''),
            status='draft',  # Operace začíná jako návrh
            created_by=created_by
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


class OperationApprovalSerializer(serializers.Serializer):
    """Serializer pro schválení operace adminem"""
    approved = serializers.BooleanField()
    notes = serializers.CharField(required=False, allow_blank=True)


class OperationStaffAssignmentSerializer(serializers.Serializer):
    """Serializer pro přiřazení personálu sestrou"""
    assisting_doctor_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True
    )
    notes = serializers.CharField(required=False, allow_blank=True)
    
    def validate_assisting_doctor_ids(self, value):
        # Ověřit, že všichni doktoři existují
        from .models import Doctor
        for doctor_id in value:
            if not Doctor.objects.filter(id=doctor_id).exists():
                raise serializers.ValidationError(f"Doktor s ID {doctor_id} neexistuje")
        return value


class OperationToolSerializer(serializers.ModelSerializer):
    """Serializer pro operační nástroje"""
    is_low_stock = serializers.ReadOnlyField()
    
    class Meta:
        model = OperationTool
        fields = '__all__'
