from django.contrib import admin
from django.urls import path, include
from rest_framework.decorators import api_view
from rest_framework.response import Response


@api_view(['GET'])
def api_root(request):
    """Root API endpoint s informacemi o dostupných endpointech"""
    return Response({
        "message": "Medic Hub API - Fakultní nemocnice u svaté Anny",
        "version": "1.0.0",
        "endpoints": {
            "dashboard": "/api/medic/dashboard/stats/",
            "operating_rooms": "/api/medic/rooms/",
            "operations": "/api/medic/operations/",
            "patients": "/api/medic/patients/",
            "doctors": "/api/medic/doctors/",
            "equipment": "/api/medic/equipment/",
            "materials": "/api/medic/materials/",
            "protocols": "/api/medic/protocols/",
            "admin": "/admin/"
        }
    })


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', api_root, name='api-root'),
    path('api/medic/', include('apps.operating_rooms.urls')),
]
