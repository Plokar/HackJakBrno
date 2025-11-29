from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    OperatingRoomViewSet, PatientViewSet, DoctorViewSet,
    EquipmentViewSet, MaterialViewSet, OperationViewSet,
    PerioperativeProtocolViewSet, DashboardViewSet, OperationToolViewSet
)
from .views_fhir import (
    FHIRPatientViewSet, FHIRPractitionerViewSet, FHIRLocationViewSet,
    FHIRProcedureViewSet, FHIRDeviceViewSet, FHIRServerViewSet
)
from .views_nurse import OperationNurseViewSet

router = DefaultRouter()
router.register(r'rooms', OperatingRoomViewSet)
router.register(r'patients', PatientViewSet)
router.register(r'doctors', DoctorViewSet)
router.register(r'equipment', EquipmentViewSet)
router.register(r'materials', MaterialViewSet)
router.register(r'operations', OperationViewSet)
router.register(r'protocols', PerioperativeProtocolViewSet)
router.register(r'dashboard', DashboardViewSet, basename='dashboard')
router.register(r'tools', OperationToolViewSet, basename='tools')

# Nurse API endpoints - správa personálu, nástrojů a materiálů
router.register(r'nurse/operations', OperationNurseViewSet, basename='nurse-operations')

# FHIR API endpoints
router.register(r'fhir/patients', FHIRPatientViewSet, basename='fhir-patients')
router.register(r'fhir/practitioners', FHIRPractitionerViewSet, basename='fhir-practitioners')
router.register(r'fhir/locations', FHIRLocationViewSet, basename='fhir-locations')
router.register(r'fhir/procedures', FHIRProcedureViewSet, basename='fhir-procedures')
router.register(r'fhir/devices', FHIRDeviceViewSet, basename='fhir-devices')
router.register(r'fhir/server', FHIRServerViewSet, basename='fhir-server')

urlpatterns = [
    path('', include(router.urls)),
]
