"""
ASGI config pro Medic Hub - pro WebSocket podporu
"""
import os
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Inicializovat Django ASGI aplikaci co nejdříve
django_asgi_app = get_asgi_application()

# Import channels routing po inicializaci Django
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.urls import path
from consumers.fhir_consumer import FHIROperationConsumer, FHIRRoomStatusConsumer

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AuthMiddlewareStack(
        URLRouter([
            path("ws/operations/", FHIROperationConsumer.as_asgi()),
            path("ws/rooms/", FHIRRoomStatusConsumer.as_asgi()),
        ])
    ),
})

