from django.core.management.base import BaseCommand
from django.utils import timezone
import logging

from services.fhir_service import FHIRService
from services.fhir_mappers import fhir_location_to_django
from apps.operating_rooms.models import OperatingRoom

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Inicializuje operacni saly v IRIS FHIR serveru pokud jeste neexistuji'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Vytvořit sály i když už nějaké existují'
        )
        parser.add_argument(
            '--count',
            type=int,
            default=10,
            help='Pocet salu k vytvoreni (default: 10)'
        )
    
    def handle(self, *args, **options):
        self.fhir_service = FHIRService()
        
        # Test pripojeni k FHIR serveru
        self.stdout.write('Testuji pripojeni k FHIR serveru...')
        if not self.fhir_service.test_connection():
            self.stdout.write(self.style.ERROR(
                'Nelze se pripojit k FHIR serveru. Preskakuji inicializaci salu.'
            ))
            return
        
        self.stdout.write(self.style.SUCCESS('FHIR server je dostupny'))
        
        # Zkontrolovat zda uz existuji saly v FHIR
        try:
            result = self.fhir_service.search_locations({'_count': 10})
            existing_count = result.get('total', len(result.get('entry', [])))
            
            if existing_count > 0 and not options['force']:
                self.stdout.write(self.style.WARNING(
                    f'V FHIR serveru uz existuje {existing_count} salu. '
                    f'Preskakuji inicializaci. Pouzijte --force pro vytvoreni novych.'
                ))
                # Synchronizovat existujici saly do Django
                self.sync_existing_rooms()
                return
            
            # Vytvorit defaultni saly
            self.stdout.write(f'Vytvarim {options["count"]} operacnich salu...')
            self.create_default_rooms(options['count'])
            
            self.stdout.write(self.style.SUCCESS('Inicializace salu dokoncena!'))
            self.print_statistics()
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(
                f'Chyba pri inicializaci salu: {str(e)}'
            ))
            logger.error(f'Error in init_operating_rooms: {str(e)}', exc_info=True)
    
    def sync_existing_rooms(self):
        """Synchronizuje existujici saly z FHIR do Django"""
        try:
            result = self.fhir_service.search_locations({'_count': 1000})
            entries = result.get('entry', [])
            
            synced_count = 0
            for entry in entries:
                try:
                    fhir_location = entry.get('resource', {})
                    room_data = fhir_location_to_django(fhir_location)
                    
                    room, created = OperatingRoom.objects.update_or_create(
                        fhir_id=room_data['fhir_id'],
                        defaults=room_data
                    )
                    room.fhir_last_synced = timezone.now()
                    room.save()
                    
                    synced_count += 1
                    if created:
                        self.stdout.write(f'  + Vytvoren sal: {room}')
                    else:
                        self.stdout.write(f'  ~ Aktualizovan sal: {room}')
                except Exception as e:
                    logger.error(f'Chyba pri synchronizaci salu: {str(e)}')
            
            self.stdout.write(self.style.SUCCESS(
                f'Synchronizovano {synced_count} salu z FHIR'
            ))
        except Exception as e:
            logger.error(f'Chyba pri synchronizaci salu: {str(e)}')
    
    def create_default_rooms(self, count):
        """Vytvori defaultni sadu operacnich salu"""
        created_count = 0
        
        for i in range(1, count + 1):
            try:
                room_number = f"OS-{i:02d}"
                
                # Vytvorit v Django
                room, created = OperatingRoom.objects.get_or_create(
                    room_number=room_number,
                    defaults={
                        'name': f"Operacni sal {i}",
                        'floor': (i - 1) // 5 + 1,  # 5 salu na patro
                        'capacity': 1,
                        'is_active': True
                    }
                )
                
                # Synchronizovat do FHIR
                if created or not room.fhir_id:
                    try:
                        room.sync_to_fhir()
                        created_count += 1
                        self.stdout.write(self.style.SUCCESS(
                            f'  + Vytvoren sal: {room.name} (Patro {room.floor})'
                        ))
                    except Exception as e:
                        self.stdout.write(self.style.ERROR(
                            f'  ! Chyba pri synchronizaci salu {room_number} do FHIR: {str(e)}'
                        ))
                        # Smazat z Django pokud se nepodařilo synchronizovat do FHIR
                        room.delete()
                else:
                    self.stdout.write(f'  ~ Sal uz existuje: {room}')
                    
            except Exception as e:
                self.stdout.write(self.style.ERROR(
                    f'  ! Chyba pri vytvareni salu OS-{i:02d}: {str(e)}'
                ))
                logger.error(f'Error creating room: {str(e)}', exc_info=True)
        
        self.stdout.write(self.style.SUCCESS(
            f'Vytvoreno {created_count} novych salu'
        ))
    
    def print_statistics(self):
        """Vypise statistiky salu"""
        self.stdout.write('\n' + '='*50)
        self.stdout.write(self.style.SUCCESS('STATISTIKY SALU:'))
        self.stdout.write(f'Saly v Django:     {OperatingRoom.objects.count()}')
        self.stdout.write(f'  - S FHIR ID:     {OperatingRoom.objects.exclude(fhir_id__isnull=True).count()}')
        self.stdout.write(f'  - Aktivni:       {OperatingRoom.objects.filter(is_active=True).count()}')
        self.stdout.write('='*50)
