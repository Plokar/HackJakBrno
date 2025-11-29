"""
Django Channels WebSocket Consumer pro real-time FHIR updates
"""
import json
import logging
from datetime import datetime
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

logger = logging.getLogger(__name__)


class FHIROperationConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer pro real-time sledování operací"""
    
    async def connect(self):
        """Připojení klienta k WebSocket"""
        self.room_group_name = 'fhir_operations_live'
        
        # Přidat do group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        logger.info(f"WebSocket client připojen: {self.channel_name}")
        
        # Poslat aktuální stav při připojení
        await self.send_current_operations()
    
    async def disconnect(self, close_code):
        """Odpojení klienta"""
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        logger.info(f"WebSocket client odpojen: {self.channel_name}")
    
    async def receive(self, text_data):
        """Příjem zprávy od klienta"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'subscribe_operation':
                # Subscribe na konkrétní operaci
                operation_id = data.get('operation_id')
                await self.subscribe_to_operation(operation_id)
                
            elif message_type == 'update_operation_status':
                # Update stavu operace
                operation_id = data.get('operation_id')
                new_status = data.get('status')
                await self.update_operation_status(operation_id, new_status)
                
            elif message_type == 'ping':
                # Ping/pong pro keep-alive
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': str(datetime.now())
                }))
        
        except json.JSONDecodeError:
            logger.error("Neplatný JSON ve WebSocket zprávě")
        except Exception as e:
            logger.error(f"Chyba při zpracování WebSocket zprávy: {str(e)}")
    
    async def operation_update(self, event):
        """Handler pro operation update události z channel layer"""
        # Poslat update klientovi
        await self.send(text_data=json.dumps({
            'type': 'operation_update',
            'operation_id': event['operation_id'],
            'status': event['status'],
            'fhir_id': event.get('fhir_id'),
            'elapsed_time': event.get('elapsed_time'),
            'timestamp': event.get('timestamp')
        }))
    
    async def fhir_sync_notification(self, event):
        """Handler pro FHIR sync notifikace"""
        await self.send(text_data=json.dumps({
            'type': 'fhir_sync',
            'resource_type': event['resource_type'],
            'action': event['action'],
            'count': event.get('count', 0)
        }))
    
    @database_sync_to_async
    def send_current_operations(self):
        """Pošle aktuální stav všech operací"""
        from apps.operating_rooms.models import Operation
        from datetime import timedelta
        from django.utils import timezone
        
        # Operace probíhající nebo naplánované na dnes
        today = timezone.now().date()
        operations = Operation.objects.filter(
            scheduled_start__date=today
        ).select_related('patient', 'operating_room', 'primary_doctor')
        
        operations_data = []
        for op in operations:
            operations_data.append({
                'id': op.id,
                'fhir_id': op.fhir_id,
                'status': op.status,
                'operation_type': op.operation_type,
                'patient': str(op.patient) if op.patient else None,
                'room': str(op.operating_room) if op.operating_room else None,
                'doctor': str(op.primary_doctor) if op.primary_doctor else None,
                'scheduled_start': op.scheduled_start.isoformat() if op.scheduled_start else None,
                'scheduled_end': op.scheduled_end.isoformat() if op.scheduled_end else None
            })
        
        # Asynchronně poslat data
        import asyncio
        asyncio.create_task(self.send(text_data=json.dumps({
            'type': 'initial_state',
            'operations': operations_data
        })))
    
    @database_sync_to_async
    def subscribe_to_operation(self, operation_id):
        """Subscribe na updates konkrétní operace"""
        # Přidat do specifické group pro operaci
        group_name = f'operation_{operation_id}'
        
        import asyncio
        asyncio.create_task(
            self.channel_layer.group_add(group_name, self.channel_name)
        )
        
        logger.info(f"Client {self.channel_name} subscribe na operaci {operation_id}")
    
    @database_sync_to_async
    def update_operation_status(self, operation_id, new_status):
        """Update stavu operace a sync do FHIR"""
        from apps.operating_rooms.models import Operation
        from django.utils import timezone
        
        try:
            operation = Operation.objects.get(id=operation_id)
            operation.status = new_status
            
            # Nastavit actual_start/end podle statusu
            if new_status == 'in_progress' and not operation.actual_start:
                operation.actual_start = timezone.now()
            elif new_status == 'completed' and not operation.actual_end:
                operation.actual_end = timezone.now()
            
            operation.save()
            
            # Sync do FHIR
            try:
                operation.sync_to_fhir()
            except Exception as e:
                logger.error(f"Chyba při sync operace do FHIR: {str(e)}")
            
            # Broadcast update všem v group
            import asyncio
            asyncio.create_task(
                self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'operation_update',
                        'operation_id': operation_id,
                        'status': new_status,
                        'fhir_id': operation.fhir_id,
                        'timestamp': timezone.now().isoformat()
                    }
                )
            )
            
            logger.info(f"Operace {operation_id} updated to status: {new_status}")
            
        except Operation.DoesNotExist:
            logger.error(f"Operace {operation_id} neexistuje")
        except Exception as e:
            logger.error(f"Chyba při update operace: {str(e)}")


class FHIRRoomStatusConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer pro real-time status operačních sálů"""
    
    async def connect(self):
        """Připojení ke sledování stavu sálů"""
        self.room_group_name = 'fhir_rooms_status'
        
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        logger.info(f"Room status client připojen: {self.channel_name}")
        
        # Poslat aktuální stav sálů
        await self.send_room_status()
    
    async def disconnect(self, close_code):
        """Odpojení"""
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    async def room_status_update(self, event):
        """Handler pro room status update události"""
        await self.send(text_data=json.dumps({
            'type': 'room_status',
            'room_id': event['room_id'],
            'status': event['status'],
            'current_operation': event.get('current_operation'),
            'timestamp': event.get('timestamp')
        }))
    
    @database_sync_to_async
    def send_room_status(self):
        """Pošle aktuální stav všech sálů"""
        from apps.operating_rooms.models import OperatingRoom, Operation
        from django.utils import timezone
        
        now = timezone.now()
        rooms_data = []
        
        for room in OperatingRoom.objects.all():
            # Najít aktuální operaci v sále
            current_operation = Operation.objects.filter(
                operating_room=room,
                status='in_progress',
                actual_start__lte=now
            ).first()
            
            room_status = 'occupied' if current_operation else 'available'
            
            rooms_data.append({
                'id': room.id,
                'fhir_id': room.fhir_id,
                'room_number': room.room_number,
                'name': room.name,
                'status': room_status,
                'current_operation': {
                    'id': current_operation.id,
                    'type': current_operation.operation_type,
                    'patient': str(current_operation.patient)
                } if current_operation else None
            })
        
        # Asynchronně poslat
        import asyncio
        asyncio.create_task(self.send(text_data=json.dumps({
            'type': 'rooms_status',
            'rooms': rooms_data,
            'timestamp': now.isoformat()
        })))

