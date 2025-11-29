from django.core.management.base import BaseCommand
from django.utils import timezone
import logging
import requests
import json
from datetime import datetime, timedelta
import random

from services.fhir_service import FHIRService
from services.fhir_mappers import (
    fhir_patient_to_django,
    fhir_practitioner_to_django,
    fhir_location_to_django,
    django_room_to_fhir,
    django_doctor_to_fhir
)
from apps.operating_rooms.models import (
    Patient, Doctor, OperatingRoom, Equipment, Material, Operation
)

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Generuje mock data pomoci IRIS FHIR a Synthea'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--patients',
            type=int,
            default=50,
            help='Pocet pacientu k vygenerovani'
        )
        parser.add_argument(
            '--doctors',
            type=int,
            default=15,
            help='Pocet doktoru k vytvoreni'
        )
        parser.add_argument(
            '--rooms',
            type=int,
            default=20,
            help='Pocet operacnich salu'
        )
        parser.add_argument(
            '--sync-only',
            action='store_true',
            help='Pouze synchronizovat existujici FHIR data do Django'
        )
        parser.add_argument(
            '--load-synthea',
            action='store_true',
            help='Nahrat existujici Synthea data z iris-fhir-template-master/data/fhir'
        )
    
    def handle(self, *args, **options):
        self.fhir_service = FHIRService()
        
        # Test pripojeni k FHIR serveru
        self.stdout.write('Testuji pripojeni k FHIR serveru...')
        if not self.fhir_service.test_connection():
            self.stdout.write(self.style.ERROR(
                'Nelze se pripojit k FHIR serveru. '
                'Ujistete se, ze Docker container fhir-server bezi.'
            ))
            return
        self.stdout.write(self.style.SUCCESS('FHIR server je dostupny'))
        
        if options['sync_only']:
            self.sync_from_fhir()
            return
        
        if options['load_synthea']:
            self.load_synthea_data()
            return
        
        # Generovat nova data
        self.stdout.write(self.style.WARNING(
            f"Generuji nova FHIR data: "
            f"{options['patients']} pacientu, "
            f"{options['doctors']} doktoru, "
            f"{options['rooms']} salu"
        ))
        
        # 1. Vytvorit operacni saly
        self.create_operating_rooms(options['rooms'])
        
        # 2. Vytvorit doktory
        self.create_doctors(options['doctors'])
        
        # 3. Vygenerovat pacienty
        self.generate_patients(options['patients'])
        
        # 4. Synchronizovat pacienty z FHIR do Django
        self.sync_patients_from_fhir()
        
        self.stdout.write(self.style.SUCCESS('Generovani dokonceno!'))
        self.print_statistics()
    
    def load_synthea_data(self):
        """Nahraje existujici Synthea data do FHIR serveru"""
        self.stdout.write('Nahravam Synthea data do FHIR serveru...')
        
        # Data jsou uz v FHIR serveru - staci je synchronizovat
        self.sync_from_fhir()
    
    def sync_from_fhir(self):
        """Synchronizuje vsechna data z FHIR serveru do Django"""
        self.stdout.write('Synchronizuji data z FHIR serveru...')
        
        # Synchronizovat pacienty
        patients_synced = self.sync_patients_from_fhir()
        self.stdout.write(self.style.SUCCESS(
            f'Synchronizovano {patients_synced} pacientu'
        ))
        
        # Synchronizovat praktikujici (doktory)
        doctors_synced = self.sync_practitioners_from_fhir()
        self.stdout.write(self.style.SUCCESS(
            f'Synchronizovano {doctors_synced} doktoru'
        ))
        
        # Synchronizovat lokace (saly)
        rooms_synced = self.sync_locations_from_fhir()
        self.stdout.write(self.style.SUCCESS(
            f'Synchronizovano {rooms_synced} operacnich salu'
        ))
    
    def sync_patients_from_fhir(self):
        """Synchronizuje pacienty z FHIR do Django"""
        try:
            result = self.fhir_service.search_patients({'_count': 1000})
            entries = result.get('entry', [])
            
            synced_count = 0
            error_count = 0
            for entry in entries:
                try:
                    fhir_patient = entry.get('resource', {})
                    patient_data = fhir_patient_to_django(fhir_patient)
                    
                    # Vytvorit nebo aktualizovat pacienta
                    patient, created = Patient.objects.update_or_create(
                        fhir_id=patient_data['fhir_id'],
                        defaults=patient_data
                    )
                    patient.fhir_last_synced = timezone.now()
                    patient.save()
                    
                    synced_count += 1
                    if created:
                        self.stdout.write(f'  + Vytvoren pacient: {patient}')
                    else:
                        self.stdout.write(f'  ~ Aktualizovan pacient: {patient}')
                except Exception as e:
                    error_count += 1
                    logger.error(f'Chyba pri synchronizaci pacientu: {str(e)}')
                    # Pokracovat s dalsim pacientem
            
            if error_count > 0:
                self.stdout.write(self.style.WARNING(
                    f'  ! {error_count} pacientu se nepodařilo synchronizovat'
                ))
            
            return synced_count
        except Exception as e:
            logger.error(f'Chyba pri ziskavani pacientu z FHIR: {str(e)}')
            self.stdout.write(self.style.ERROR(f'Chyba: {str(e)}'))
            return 0
    
    def sync_practitioners_from_fhir(self):
        """Synchronizuje praktikujici (doktory) z FHIR do Django"""
        try:
            result = self.fhir_service.search_practitioners({'_count': 1000})
            entries = result.get('entry', [])
            
            synced_count = 0
            error_count = 0
            for entry in entries:
                try:
                    fhir_practitioner = entry.get('resource', {})
                    doctor_data = fhir_practitioner_to_django(fhir_practitioner)
                    
                    # Vytvorit nebo aktualizovat doktora
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
                    error_count += 1
                    logger.error(f'Chyba pri synchronizaci doktora: {str(e)}')
                    # Pokracovat s dalsim doktorem
            
            if error_count > 0:
                self.stdout.write(self.style.WARNING(
                    f'  ! {error_count} doktoru se nepodařilo synchronizovat'
                ))
            
            return synced_count
        except Exception as e:
            logger.error(f'Chyba pri ziskavani doktoru z FHIR: {str(e)}')
            self.stdout.write(self.style.ERROR(f'Chyba: {str(e)}'))
            return 0
    
    def sync_locations_from_fhir(self):
        """Synchronizuje lokace (saly) z FHIR do Django"""
        try:
            result = self.fhir_service.search_locations({'_count': 1000})
            entries = result.get('entry', [])
            
            synced_count = 0
            for entry in entries:
                fhir_location = entry.get('resource', {})
                room_data = fhir_location_to_django(fhir_location)
                
                # Vytvorit nebo aktualizovat sal
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
            
            return synced_count
        except Exception as e:
            logger.error(f'Chyba pri synchronizaci salu: {str(e)}')
            self.stdout.write(self.style.ERROR(f'Chyba: {str(e)}'))
            return 0
    
    def create_operating_rooms(self, count):
        """Vytvori operacni saly a synchronizuje do FHIR"""
        self.stdout.write(f'Vytvarim {count} operacnich salu...')
        
        for i in range(1, count + 1):
            room, created = OperatingRoom.objects.get_or_create(
                room_number=f"OS-{i:02d}",
                defaults={
                    'name': f"Operacni sal {i}",
                    'floor': (i - 1) // 5 + 1,
                    'capacity': 1,
                    'is_active': True
                }
            )
            
            if created or not room.fhir_id:
                # Synchronizovat do FHIR
                try:
                    room.sync_to_fhir()
                    self.stdout.write(f'  + Sal {room.room_number} vytvoren a synchronizovan do FHIR')
                except Exception as e:
                    self.stdout.write(self.style.ERROR(
                        f'  ! Chyba pri synchronizaci salu {room.room_number}: {str(e)}'
                    ))
    
    def create_doctors(self, count):
        """Vytvori doktory a synchronizuje do FHIR"""
        self.stdout.write(f'Vytvarim {count} doktoru...')
        
        doctors_data = [
            ('Jan', 'Novák', 'Chirurgie', 1200),
            ('Marie', 'Svobodová', 'Kardiochirurgie', 1500),
            ('Petr', 'Dvořák', 'Neurochirurgie', 1600),
            ('Eva', 'Němcová', 'Ortopédie', 1300),
            ('Tomáš', 'Procházka', 'Chirurgie', 1250),
            ('Jana', 'Veselá', 'Urologie', 1400),
            ('Martin', 'Černý', 'ORL', 1200),
            ('Lenka', 'Marková', 'Gynekologie', 1350),
            ('Pavel', 'Kučera', 'Onkochirurgie', 1550),
            ('Petra', 'Horáková', 'Plastická chirurgie', 1450),
            ('Jiří', 'Novotný', 'Chirurgie', 1280),
            ('Anna', 'Malá', 'Gynekologie', 1320),
            ('Lukáš', 'Pospíšil', 'Ortopédie', 1380),
            ('Michaela', 'Králová', 'Onkochirurgie', 1520),
            ('David', 'Růžička', 'Plastická chirurgie', 1480),
        ]
        
        for idx, (first, last, spec, rate) in enumerate(doctors_data[:count], 1):
            doctor, created = Doctor.objects.get_or_create(
                license_number=f"LIC-{idx:05d}",
                defaults={
                    'first_name': first,
                    'last_name': last,
                    'specialization': spec,
                    'hourly_rate': rate,
                    'is_active': True
                }
            )
            
            if created or not doctor.fhir_id:
                # Synchronizovat do FHIR
                try:
                    doctor.sync_to_fhir()
                    self.stdout.write(f'  + Doktor {doctor} vytvoren a synchronizovan do FHIR')
                except Exception as e:
                    self.stdout.write(self.style.ERROR(
                        f'  ! Chyba pri synchronizaci doktora {doctor}: {str(e)}'
                    ))
    
    def generate_patients(self, count):
        """Vygeneruje nove pacienty pomoci Synthea a nahraje je do FHIR serveru"""
        self.stdout.write(f'Generuji {count} pacientu pomoci Synthea...')
        
        try:
            import subprocess
            import os
            import glob
            
            # Cesta k output složce
            output_dir = '/tmp/synthea_output'
            
            # Vymazat starou output složku
            if os.path.exists(output_dir):
                import shutil
                shutil.rmtree(output_dir)
            os.makedirs(output_dir, exist_ok=True)
            
            # Spustit Synthea Docker kontejner
            self.stdout.write(f'  Spoustim Synthea Docker kontejner pro {count} pacientu...')
            
            docker_cmd = [
                'docker', 'run', '--rm',
                '-v', f'{output_dir}:/output',
                '--name', 'synthea-generator',
                '--network', 'hackjakbrno_app-network',
                'intersystemsdc/irisdemo-base-synthea:version-1.3.4',
                '-p', str(count)
            ]
            
            result = subprocess.run(
                docker_cmd,
                capture_output=True,
                text=True,
                timeout=300  # 5 minut timeout
            )
            
            if result.returncode != 0:
                self.stdout.write(self.style.ERROR(
                    f'Chyba pri spousteni Synthea: {result.stderr}'
                ))
                # Fallback na jednoduchou implementaci
                return self.generate_simple_patients(count)
            
            self.stdout.write(self.style.SUCCESS('  Synthea data vygenerovana'))
            
            # Načíst vygenerované JSON soubory
            fhir_dir = os.path.join(output_dir, 'fhir')
            if not os.path.exists(fhir_dir):
                self.stdout.write(self.style.ERROR('  FHIR složka nenalezena'))
                return self.generate_simple_patients(count)
            
            json_files = glob.glob(os.path.join(fhir_dir, '*.json'))
            self.stdout.write(f'  Nalezeno {len(json_files)} FHIR souboru')
            
            # Nahrát každý soubor do FHIR serveru
            uploaded_count = 0
            for json_file in json_files:
                try:
                    with open(json_file, 'r', encoding='utf-8') as f:
                        bundle_data = json.load(f)
                    
                    # Nahrát bundle do FHIR serveru
                    self.fhir_service.create_bundle(bundle_data)
                    uploaded_count += 1
                    
                    self.stdout.write(f'  + Nahran soubor: {os.path.basename(json_file)}')
                    
                except Exception as e:
                    logger.error(f'Chyba pri nahravani souboru {json_file}: {str(e)}')
                    self.stdout.write(self.style.WARNING(
                        f'  ! Chyba pri nahravani {os.path.basename(json_file)}: {str(e)}'
                    ))
            
            self.stdout.write(self.style.SUCCESS(
                f'Uspesne nahrano {uploaded_count} Synthea souboru do FHIR serveru'
            ))
            
            return uploaded_count
            
        except subprocess.TimeoutExpired:
            self.stdout.write(self.style.ERROR('Synthea generovani trvalo prilis dlouho'))
            return self.generate_simple_patients(count)
        except Exception as e:
            logger.error(f'Chyba pri pouziti Synthea: {str(e)}')
            self.stdout.write(self.style.WARNING(
                f'Synthea selhala, pouzivam jednoduchou implementaci: {str(e)}'
            ))
            return self.generate_simple_patients(count)
    
    def generate_simple_patients(self, count):
        """Fallback: Vygeneruje jednoduche pacienty bez Synthea"""
        self.stdout.write(f'Generuji {count} jednoduchych pacientu...')
        
        # Ceska jmena a prijmeni
        first_names_male = [
            'Jan', 'Petr', 'Josef', 'Pavel', 'Martin', 'Tomáš', 'Jaroslav', 'Miroslav',
            'Zdeněk', 'Václav', 'Jiří', 'Lukáš', 'Milan', 'Karel', 'Michal', 'František',
            'Jakub', 'David', 'Ondřej', 'Ladislav', 'Stanislav', 'Filip', 'Aleš', 'Roman'
        ]
        first_names_female = [
            'Marie', 'Jana', 'Eva', 'Anna', 'Hana', 'Lenka', 'Kateřina', 'Věra',
            'Alena', 'Petra', 'Lucie', 'Jitka', 'Martina', 'Jaroslava', 'Michaela',
            'Helena', 'Veronika', 'Tereza', 'Barbora', 'Kristýna', 'Markéta', 'Monika'
        ]
        last_names = [
            'Novák', 'Svoboda', 'Novotný', 'Dvořák', 'Černý', 'Procházka', 'Kučera',
            'Veselý', 'Horák', 'Němec', 'Pokorný', 'Marek', 'Pospíšil', 'Král',
            'Jelínek', 'Růžička', 'Beneš', 'Fiala', 'Sedláček', 'Doležal', 'Zeman',
            'Kolář', 'Navrátil', 'Čermák', 'Urban', 'Vaněk', 'Blažek', 'Krejčí'
        ]
        
        created_count = 0
        error_count = 0
        
        for i in range(count):
            try:
                # Náhodný výběr pohlaví
                gender = random.choice(['male', 'female'])
                
                # Výběr jména podle pohlaví
                if gender == 'male':
                    first_name = random.choice(first_names_male)
                else:
                    first_name = random.choice(first_names_female)
                
                last_name = random.choice(last_names)
                
                # Náhodné datum narození (18-90 let)
                age_days = random.randint(18*365, 90*365)
                birth_date = datetime.now() - timedelta(days=age_days)
                birth_date_str = birth_date.strftime('%Y-%m-%d')
                
                # Vytvoření FHIR Patient zdroje
                patient_fhir = {
                    'resourceType': 'Patient',
                    'active': True,
                    'name': [{
                        'use': 'official',
                        'family': last_name,
                        'given': [first_name]
                    }],
                    'gender': gender,
                    'birthDate': birth_date_str,
                    'identifier': [{
                        'system': 'https://medichub.example.org/patient-id',
                        'value': f'PAT-{random.randint(100000, 999999)}'
                    }]
                }
                
                # Vytvoření pacienta v FHIR serveru
                result = self.fhir_service.create_patient(patient_fhir)
                created_count += 1
                
                patient_id = result.get('id', 'unknown')
                self.stdout.write(f'  + Vytvoren pacient v FHIR: {first_name} {last_name} (ID: {patient_id})')
                
            except Exception as e:
                error_count += 1
                logger.error(f'Chyba pri generovani pacienta: {str(e)}')
                self.stdout.write(self.style.ERROR(f'  ! Chyba pri generovani pacienta: {str(e)}'))
        
        if error_count > 0:
            self.stdout.write(self.style.WARNING(
                f'Vygenerovano {created_count} pacientu, {error_count} chyb'
            ))
        else:
            self.stdout.write(self.style.SUCCESS(
                f'Uspesne vygenerovano {created_count} pacientu'
            ))
        
        return created_count
    
    def print_statistics(self):
        """Vypise statistiky dat"""
        self.stdout.write('\n' + '='*50)
        self.stdout.write(self.style.SUCCESS('STATISTIKY:'))
        self.stdout.write(f'Operacni saly:  {OperatingRoom.objects.count()}')
        self.stdout.write(f'  - S FHIR ID:  {OperatingRoom.objects.exclude(fhir_id__isnull=True).count()}')
        self.stdout.write(f'Doktori:        {Doctor.objects.count()}')
        self.stdout.write(f'  - S FHIR ID:  {Doctor.objects.exclude(fhir_id__isnull=True).count()}')
        self.stdout.write(f'Pacienti:       {Patient.objects.count()}')
        self.stdout.write(f'  - S FHIR ID:  {Patient.objects.exclude(fhir_id__isnull=True).count()}')
        self.stdout.write(f'Operace:        {Operation.objects.count()}')
        self.stdout.write('='*50)

