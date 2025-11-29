"""
Django management command pro import dat z CSV souborů do databáze
"""
import csv
from decimal import Decimal
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.operating_rooms.models import Doctor, Material, Equipment, OperationTool


class Command(BaseCommand):
    help = 'Importuje data z CSV souboru do databaze a synchronizuje s FHIR'

    def add_arguments(self, parser):
        parser.add_argument(
            '--sync-fhir',
            action='store_true',
            help='Synchronizovat data s FHIR serverem po importu',
        )

    def handle(self, *args, **options):
        sync_fhir = options['sync_fhir']
        
        self.stdout.write(self.style.SUCCESS('Zahajuji import dat z CSV souboru...'))
        
        with transaction.atomic():
            # Import personalů
            self.import_staff()
            
            # Import materiálu
            self.import_materials()
            
            # Import přístrojů
            self.import_equipment()
            
            # Import operačních nástrojů
            self.import_operation_tools()
        
        self.stdout.write(self.style.SUCCESS('Import dokoncen!'))
        
        # Synchronizace s FHIR
        if sync_fhir:
            self.sync_to_fhir()

    def import_staff(self):
        """Import personálu z personal.csv a employee_costs.csv"""
        self.stdout.write('Importuji personal...')
        
        # Načtení dat z obou souborů
        personal_data = {}
        costs_data = {}
        
        # Načtení personal.csv
        try:
            with open('data/personal.csv', 'r', encoding='utf-8-sig') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    name = row['Jméno Zaměstnance']
                    personal_data[name] = {
                        'role': row['Role / Profese'],
                        'workplace': row['Pracoviště / Blok'],
                        'phone': row['Kontakt Mobil'],
                        'email': row['Kontakt Email']
                    }
        except FileNotFoundError:
            self.stdout.write(self.style.ERROR('Soubor data/personal.csv nenalezen!'))
            return
        
        # Načtení employee_costs.csv
        try:
            with open('data/employee_costs.csv', 'r', encoding='utf-8-sig') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    name = row['Jméno a Příjmení']
                    costs_data[name] = {
                        'position': row['Pracovní Pozice (Dle Obrázku)'],
                        'salary': row['Měsíční Hrubá Mzda (Kč Fikt.)'],
                        'bonuses': row['Měsíční Odměny/Příplatky (Kč Fikt.)'],
                        'total_cost': row['Celkové Měsíční Náklady Zaměstnavatele (CEN, Kč Fikt.)']
                    }
        except FileNotFoundError:
            self.stdout.write(self.style.ERROR('Soubor data/employee_costs.csv nenalezen!'))
            return
        
        # Sloučení dat a vytvoření lékařů
        created_count = 0
        updated_count = 0
        license_counter = 1
        
        for name, personal_info in personal_data.items():
            # Rozdělení jména
            name_parts = name.replace('MUDr.', '').replace('Mgr.', '').replace('Bc.', '').strip().split()
            if len(name_parts) < 2:
                continue
            
            first_name = name_parts[0]
            last_name = ' '.join(name_parts[1:])
            
            # Získání nákladů
            cost_info = costs_data.get(name, {})
            
            # Výpočet hodinové sazby (měsíční náklady / 160 hodin)
            total_cost = cost_info.get('total_cost', '0')
            if isinstance(total_cost, str):
                total_cost = total_cost.replace(' ', '')
            hourly_rate = Decimal(total_cost) / Decimal('160') if total_cost else Decimal('0')
            
            # Specialization z role
            specialization = personal_info['role']
            
            # Generování unikátního čísla licence
            # Formát: LIC-YYYYMMDD-XXXXX kde XXXXX je pořadové číslo
            from datetime import datetime
            date_str = datetime.now().strftime('%Y%m%d')
            license_number = f'LIC-{date_str}-{license_counter:05d}'
            
            # Vytvoření nebo aktualizace doktora
            doctor, created = Doctor.objects.update_or_create(
                first_name=first_name,
                last_name=last_name,
                defaults={
                    'specialization': specialization,
                    'hourly_rate': hourly_rate,
                    'license_number': license_number,
                    'is_active': True,
                }
            )
            
            if created:
                created_count += 1
                license_counter += 1
            else:
                updated_count += 1
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Personal: Vytvoreno {created_count}, Aktualizovano {updated_count}'
            )
        )

    def import_materials(self):
        """Import materiálu z material.csv"""
        self.stdout.write('Importuji material...')
        
        try:
            with open('data/material.csv', 'r', encoding='utf-8-sig') as f:
                reader = csv.DictReader(f)
                created_count = 0
                updated_count = 0
                
                for row in reader:
                    name = row['Název Nástroje / Materiálu']
                    category = row['Kategorie']
                    ean_code = row['Kód EAN-13 '].strip()
                    unit_price = Decimal(row['Cena za Kus (Kč Fiktivní)'])
                    
                    material, created = Material.objects.update_or_create(
                        ean_code=ean_code,
                        defaults={
                            'name': name,
                            'category': category,
                            'unit': 'ks',
                            'unit_price': unit_price,
                            'stock_quantity': 100,  # Výchozí stav skladu
                            'minimum_stock': 10,
                            'is_disposable': True,
                        }
                    )
                    
                    if created:
                        created_count += 1
                    else:
                        updated_count += 1
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Material: Vytvoreno {created_count}, Aktualizovano {updated_count}'
                    )
                )
        except FileNotFoundError:
            self.stdout.write(self.style.ERROR('Soubor data/material.csv nenalezen!'))

    def import_equipment(self):
        """Import přístrojů z equipment.csv"""
        self.stdout.write('Importuji pristroje...')
        
        try:
            with open('data/equipment.csv', 'r', encoding='utf-8-sig') as f:
                reader = csv.DictReader(f)
                created_count = 0
                updated_count = 0
                skipped_count = 0
                
                for row in reader:
                    name = row['Název Přístroje']
                    category = row['Kategorie']
                    equipment_code = row['Inventární Číslo (Pro Skenování)']
                    
                    # Ošetření hodnoty "Není relevantní"
                    lifetime_str = row['Odhadovaná Životnost (Provozní Hodiny)']
                    if lifetime_str == 'Není relevantní' or not lifetime_str.strip():
                        # Použít výchozí hodnotu podle kategorie
                        lifetime_hours = 30000
                    else:
                        try:
                            lifetime_hours = int(lifetime_str)
                        except ValueError:
                            self.stdout.write(
                                self.style.WARNING(
                                    f'Nemohu parsovat zivotnost pro {name}: {lifetime_str}, pouzivam vychozi 30000'
                                )
                            )
                            lifetime_hours = 30000
                    
                    udi_data = row.get('Fiktivní UDI-PI Datový Klíč (GS1 DataMatrix Data)', '')
                    
                    # Fiktivní nákupní cena (založená na kategorii a životnosti)
                    purchase_price = Decimal(lifetime_hours) * Decimal('2.5')
                    
                    # Fiktivní datum nákupu (poslední 2 roky)
                    days_ago = hash(equipment_code) % 730  # 0-730 dní
                    purchase_date = date.today() - timedelta(days=days_ago)
                    
                    equipment, created = Equipment.objects.update_or_create(
                        equipment_code=equipment_code,
                        defaults={
                            'name': name,
                            'category': category,
                            'purchase_date': purchase_date,
                            'purchase_price': purchase_price,
                            'lifetime_hours': lifetime_hours,
                            'used_hours': 0,
                            'is_operational': True,
                        }
                    )
                    
                    if created:
                        created_count += 1
                    else:
                        updated_count += 1
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Pristroje: Vytvoreno {created_count}, Aktualizovano {updated_count}'
                    )
                )
        except FileNotFoundError:
            self.stdout.write(self.style.ERROR('Soubor data/equipment.csv nenalezen!'))

    def import_operation_tools(self):
        """Import operačních nástrojů z sterilization_tools.csv"""
        self.stdout.write('Importuji operacni nastroje...')
        
        try:
            with open('data/sterilization_tools.csv', 'r', encoding='utf-8-sig') as f:
                reader = csv.DictReader(f)
                created_count = 0
                updated_count = 0
                
                for row in reader:
                    name = row['Název Nástroje']
                    category = row['Kategorie']
                    inventory_code = row['Fiktivní Inventární Kód']
                    sterilization_cost = Decimal(row['Cena Sterilizace (Kč/Použití Fikt.)'])
                    udi_code = row['UDI DataMatrix Kód (GS1 Formát)']
                    
                    tool, created = OperationTool.objects.update_or_create(
                        inventory_code=inventory_code,
                        defaults={
                            'name': name,
                            'category': category,
                            'sterilization_cost': sterilization_cost,
                            'udi_code': udi_code,
                            'quantity': 10,  # Výchozí množství
                            'lifespan': 1000,  # Fiktivní životnost
                            'unit': 'použití',
                            'status': 'good',
                        }
                    )
                    
                    if created:
                        created_count += 1
                    else:
                        updated_count += 1
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Operacni nastroje: Vytvoreno {created_count}, Aktualizovano {updated_count}'
                    )
                )
        except FileNotFoundError:
            self.stdout.write(self.style.ERROR('Soubor data/sterilization_tools.csv nenalezen!'))

    def sync_to_fhir(self):
        """Synchronizace všech dat s FHIR serverem"""
        self.stdout.write(self.style.WARNING('Zahajuji synchronizaci s FHIR serverem...'))
        
        # Synchronizace doktorů
        doctors = Doctor.objects.all()
        self.stdout.write(f'Synchronizuji {doctors.count()} doktoru...')
        synced_doctors = 0
        for doctor in doctors:
            try:
                doctor.sync_to_fhir()
                synced_doctors += 1
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Chyba pri synchronizaci doktora {doctor}: {e}')
                )
        
        self.stdout.write(
            self.style.SUCCESS(f'Doktori: Synchronizovano {synced_doctors}/{doctors.count()}')
        )
        
        # Synchronizace materiálů
        materials = Material.objects.all()
        self.stdout.write(f'Synchronizuji {materials.count()} materialu...')
        synced_materials = 0
        for material in materials:
            try:
                material.sync_to_fhir()
                synced_materials += 1
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Chyba pri synchronizaci materialu {material}: {e}')
                )
        
        self.stdout.write(
            self.style.SUCCESS(f'Materialy: Synchronizovano {synced_materials}/{materials.count()}')
        )
        
        # Synchronizace přístrojů
        equipment = Equipment.objects.all()
        self.stdout.write(f'Synchronizuji {equipment.count()} pristroju...')
        synced_equipment = 0
        for equip in equipment:
            try:
                equip.sync_to_fhir()
                synced_equipment += 1
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Chyba pri synchronizaci pristroje {equip}: {e}')
                )
        
        self.stdout.write(
            self.style.SUCCESS(f'Pristroje: Synchronizovano {synced_equipment}/{equipment.count()}')
        )
        
        self.stdout.write(self.style.SUCCESS('Synchronizace s FHIR dokoncena!'))
