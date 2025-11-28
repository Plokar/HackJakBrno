from django.contrib import admin
from .models import (
    OperatingRoom, Patient, Doctor, Equipment, Material,
    Operation, PerioperativeProtocol, EquipmentUsage, MaterialUsage
)


@admin.register(OperatingRoom)
class OperatingRoomAdmin(admin.ModelAdmin):
    list_display = ['room_number', 'name', 'floor', 'capacity', 'is_active']
    list_filter = ['is_active', 'floor']
    search_fields = ['name', 'room_number']


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ['last_name', 'first_name', 'birth_number', 'date_of_birth']
    search_fields = ['first_name', 'last_name', 'birth_number']


@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):
    list_display = ['last_name', 'first_name', 'specialization', 'hourly_rate', 'is_active']
    list_filter = ['is_active', 'specialization']
    search_fields = ['first_name', 'last_name', 'license_number']


@admin.register(Equipment)
class EquipmentAdmin(admin.ModelAdmin):
    list_display = ['name', 'equipment_code', 'category', 'used_hours', 'lifetime_hours', 'remaining_lifetime_percent', 'is_operational']
    list_filter = ['is_operational', 'category']
    search_fields = ['name', 'equipment_code']


@admin.register(Material)
class MaterialAdmin(admin.ModelAdmin):
    list_display = ['name', 'ean_code', 'category', 'unit_price', 'stock_quantity', 'minimum_stock']
    list_filter = ['category', 'is_disposable']
    search_fields = ['name', 'ean_code']


@admin.register(Operation)
class OperationAdmin(admin.ModelAdmin):
    list_display = ['operation_type', 'patient', 'operating_room', 'primary_doctor', 'scheduled_start', 'status', 'is_emergency']
    list_filter = ['status', 'is_emergency', 'operating_room']
    search_fields = ['operation_type', 'patient__first_name', 'patient__last_name']
    filter_horizontal = ['assisting_doctors']


@admin.register(PerioperativeProtocol)
class PerioperativeProtocolAdmin(admin.ModelAdmin):
    list_display = ['operation', 'total_staff_cost', 'total_equipment_cost', 'total_material_cost', 'total_cost']
    search_fields = ['operation__operation_type']


@admin.register(EquipmentUsage)
class EquipmentUsageAdmin(admin.ModelAdmin):
    list_display = ['protocol', 'equipment', 'hours_used', 'cost']


@admin.register(MaterialUsage)
class MaterialUsageAdmin(admin.ModelAdmin):
    list_display = ['protocol', 'material', 'quantity_used', 'cost', 'scanned_at']
