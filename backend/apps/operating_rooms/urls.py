from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    OperatingRoomViewSet, PatientViewSet, DoctorViewSet,
    EquipmentViewSet, MaterialViewSet, OperationViewSet,
    PerioperativeProtocolViewSet, DashboardViewSet, OperationToolViewSet
)

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

urlpatterns = [
    path('', include(router.urls)),
]
