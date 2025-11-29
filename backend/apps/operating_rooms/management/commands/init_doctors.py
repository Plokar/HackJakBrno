from django.core.management.base import BaseCommand
from django.utils import timezone
import logging

from services.fhir_service import FHIRService
from services.fhir_mappers import fhir_practitioner_to_django, django_doctor_to_fhir
from apps.operating_rooms.models import Doctor

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Inicializuje doktory v IRIS FHIR serveru pokud jeste neexistuji'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Vytvořit doktory i když už někteří existují'
        )
    
    def handle(self, *args, **options):
        self.fhir_service = FHIRService()
        
        # Test pripojeni k FHIR serveru
        self.stdout.write('Testuji pripojeni k FHIR serveru...')
        if not self.fhir_service.test_connection():
            self.stdout.write(self.style.ERROR(
                'Nelze se pripojit k FHIR serveru. Preskakuji inicializaci doktoru.'
            ))
            return
        
        self.stdout.write(self.style.SUCCESS('FHIR server je dostupny'))
        
        # Zkontrolovat zda uz existuji doktori v FHIR
        try:
            result = self.fhir_service.search_practitioners({'_count': 10})
            existing_count = result.get('total', len(result.get('entry', [])))
            
            if existing_count > 0 and not options['force']:
                self.stdout.write(self.style.WARNING(
                    f'V FHIR serveru uz existuje {existing_count} doktoru. '
                    f'Preskakuji inicializaci. Pouzijte --force pro vytvoreni novych.'
                ))
                # Synchronizovat existujici doktory do Django
                self.sync_existing_doctors()
                return
            
            # Vytvorit defaultni doktory
            self.stdout.write('Vytvarim defaultni doktory...')
            self.create_default_doctors()
            
            self.stdout.write(self.style.SUCCESS('Inicializace doktoru dokoncena!'))
            self.print_statistics()
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(
                f'Chyba pri inicializaci doktoru: {str(e)}'
            ))
            logger.error(f'Error in init_doctors: {str(e)}', exc_info=True)
    
    def sync_existing_doctors(self):
        """Synchronizuje existujici doktory z FHIR do Django"""
        try:
            result = self.fhir_service.search_practitioners({'_count': 1000})
            entries = result.get('entry', [])
            
            synced_count = 0
            for entry in entries:
                try:
                    fhir_practitioner = entry.get('resource', {})
                    doctor_data = fhir_practitioner_to_django(fhir_practitioner)
                    
                    doctor, created = Doctor.objects.update_or_create(
                        fhir_id=doctor_data['fhir_id'],
                        defaults=doctor_data
                    )
                    doctor.fhir_last_synced = timezone.now()
                    doctor.save()
                    
                    synced_count += 1
                    if created:
                        self.stdout.write(f'  + Vytvoren doktor: {doctor}')
                    else:
                        self.stdout.write(f'  ~ Aktualizovan doktor: {doctor}')
                except Exception as e:
                    logger.error(f'Chyba pri synchronizaci doktora: {str(e)}')
            
            self.stdout.write(self.style.SUCCESS(
                f'Synchronizovano {synced_count} doktoru z FHIR'
            ))
        except Exception as e:
            logger.error(f'Chyba pri synchronizaci doktoru: {str(e)}')
    
    def create_default_doctors(self):
        """Vytvori defaultni sadu doktoru"""
        doctors_data = [
            ('Jan', 'Novák', 'Chirurgie', 'LIC-00001', 1200),
            ('Marie', 'Svobodová', 'Kardiochirurgie', 'LIC-00002', 1500),
            ('Petr', 'Dvořák', 'Neurochirurgie', 'LIC-00003', 1600),
            ('Eva', 'Němcová', 'Ortopédie', 'LIC-00004', 1300),
            ('Tomáš', 'Procházka', 'Chirurgie', 'LIC-00005', 1250),
            ('Jana', 'Veselá', 'Urologie', 'LIC-00006', 1400),
            ('Martin', 'Černý', 'ORL', 'LIC-00007', 1200),
            ('Lenka', 'Marková', 'Gynekologie', 'LIC-00008', 1350),
            ('Pavel', 'Kučera', 'Onkochirurgie', 'LIC-00009', 1550),
            ('Petra', 'Horáková', 'Plastická chirurgie', 'LIC-00010', 1450),
            ('Jiří', 'Novotný', 'Chirurgie', 'LIC-00011', 1280),
            ('Anna', 'Malá', 'Gynekologie', 'LIC-00012', 1320),
            ('Lukáš', 'Pospíšil', 'Ortopédie', 'LIC-00013', 1380),
            ('Michaela', 'Králová', 'Onkochirurgie', 'LIC-00014', 1520),
            ('David', 'Růžička', 'Plastická chirurgie', 'LIC-00015', 1480),
        ]
        
        created_count = 0
        
        for first_name, last_name, specialization, license_number, hourly_rate in doctors_data:
            try:
                # Vytvorit v Django
                doctor, created = Doctor.objects.get_or_create(
                    license_number=license_number,
                    defaults={
                        'first_name': first_name,
                        'last_name': last_name,
                        'specialization': specialization,
                        'hourly_rate': hourly_rate,
                        'is_active': True
                    }
                )
                
                # Synchronizovat do FHIR
                if created or not doctor.fhir_id:
                    try:
                        fhir_data = django_doctor_to_fhir(doctor)
                        fhir_result = self.fhir_service.create_practitioner(fhir_data)
                        
                        doctor.fhir_id = fhir_result.get('id')
                        doctor.fhir_resource_json = fhir_result
                        doctor.fhir_last_synced = timezone.now()
                        doctor.save()
                        
                        created_count += 1
                        self.stdout.write(self.style.SUCCESS(
                            f'  + Vytvoren doktor: Dr. {first_name} {last_name} ({specialization})'
                        ))
                    except Exception as e:
                        self.stdout.write(self.style.ERROR(
                            f'  ! Chyba pri synchronizaci doktora {first_name} {last_name} do FHIR: {str(e)}'
                        ))
                        # Smazat z Django pokud se nepodařilo synchronizovat do FHIR
                        doctor.delete()
                else:
                    self.stdout.write(f'  ~ Doktor uz existuje: {doctor}')
                    
            except Exception as e:
                self.stdout.write(self.style.ERROR(
                    f'  ! Chyba pri vytvareni doktora {first_name} {last_name}: {str(e)}'
                ))
                logger.error(f'Error creating doctor: {str(e)}', exc_info=True)
        
        self.stdout.write(self.style.SUCCESS(
            f'Vytvoreno {created_count} novych doktoru'
        ))
    
    def print_statistics(self):
        """Vypise statistiky doktoru"""
        self.stdout.write('\n' + '='*50)
        self.stdout.write(self.style.SUCCESS('STATISTIKY DOKTORU:'))
        self.stdout.write(f'Doktori v Django:  {Doctor.objects.count()}')
        self.stdout.write(f'  - S FHIR ID:     {Doctor.objects.exclude(fhir_id__isnull=True).count()}')
        self.stdout.write(f'  - Aktivni:       {Doctor.objects.filter(is_active=True).count()}')
        self.stdout.write('='*50)
