from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import datetime, timedelta
import random
from apps.operating_rooms.models import (
    OperatingRoom, Patient, Doctor, Equipment, Material,
    Operation, PerioperativeProtocol, EquipmentUsage, MaterialUsage
)


class Command(BaseCommand):
    help = 'Naplní databázi mockup daty pro Medic Hub'

    def handle(self, *args, **options):
        self.stdout.write('Začínám generovat mockup data...')
        
        # Smazat stará data
        self.stdout.write('Mažu stará data...')
        MaterialUsage.objects.all().delete()
        EquipmentUsage.objects.all().delete()
        PerioperativeProtocol.objects.all().delete()
        Operation.objects.all().delete()
        Material.objects.all().delete()
        Equipment.objects.all().delete()
        Doctor.objects.all().delete()
        Patient.objects.all().delete()
        OperatingRoom.objects.all().delete()
        
        # Vytvořit operační sály (20 sálů)
        self.stdout.write('Vytvářím operační sály...')
        rooms = []
        for i in range(1, 21):
            room = OperatingRoom.objects.create(
                name=f"Operační sál {i}",
                room_number=f"OS-{i:02d}",
                floor=(i - 1) // 5 + 1,
                capacity=1,
                is_active=True
            )
            rooms.append(room)
        self.stdout.write(self.style.SUCCESS(f'Vytvořeno {len(rooms)} operačních sálů'))
        
        # Vytvořit doktory
        self.stdout.write('Vytvářím doktory...')
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
        ]
        doctors = []
        for idx, (first, last, spec, rate) in enumerate(doctors_data, 1):
            doctor = Doctor.objects.create(
                first_name=first,
                last_name=last,
                specialization=spec,
                license_number=f"LIC-{idx:05d}",
                hourly_rate=rate,
                is_active=True
            )
            doctors.append(doctor)
        self.stdout.write(self.style.SUCCESS(f'Vytvořeno {len(doctors)} doktorů'))
        
        # Vytvořit pacienty
        self.stdout.write('Vytvářím pacienty...')
        patients_data = [
            ('Jan', 'Svoboda', '751015/1234', '1975-10-15', 'Akutní apendicitida'),
            ('Marie', 'Nováková', '820305/5678', '1982-03-05', 'Cholecystolithiáza'),
            ('Petr', 'Dvořák', '900712/9876', '1990-07-12', 'Herniotomie'),
            ('Eva', 'Černá', '650420/4321', '1965-04-20', 'Kardiochirurgický výkon'),
            ('Tomáš', 'Veselý', '780825/8765', '1978-08-25', 'Fraktura femuru'),
            ('Jana', 'Marková', '920201/2345', '1992-02-01', 'Spondylodéza'),
            ('Martin', 'Procházka', '850615/6789', '1985-06-15', 'Nefrolitotomie'),
            ('Lenka', 'Horáková', '740910/3456', '1974-09-10', 'Tonzilektomie'),
            ('Pavel', 'Novotný', '880520/7890', '1988-05-20', 'Laparoskopie'),
            ('Petra', 'Kučerová', '950130/4567', '1995-01-30', 'Mastektomie'),
            ('Jiří', 'Němec', '720805/5678', '1972-08-05', 'Artroskopie kolene'),
            ('Anna', 'Malá', '830215/8901', '1983-02-15', 'Císařský řez'),
            ('Lukáš', 'Pospíšil', '910925/2345', '1991-09-25', 'Kyčelní kloub'),
            ('Michaela', 'Králová', '870410/6789', '1987-04-10', 'Odstranění nádoru'),
            ('David', 'Růžička', '940705/1234', '1994-07-05', 'Plastická operace'),
        ]
        patients = []
        for first, last, birth_num, dob, diag in patients_data:
            patient = Patient.objects.create(
                first_name=first,
                last_name=last,
                birth_number=birth_num,
                date_of_birth=datetime.strptime(dob, '%Y-%m-%d').date(),
                diagnosis=diag,
                medical_history='Standardní anamnéza, bez závažných komplikací.'
            )
            patients.append(patient)
        self.stdout.write(self.style.SUCCESS(f'Vytvořeno {len(patients)} pacientů'))
        
        # Vytvořit přístroje
        self.stdout.write('Vytvářím přístroje...')
        equipment_data = [
            ('Operační mikroskop Zeiss', 'MICRO-001', 'Mikroskopy', 2500000, 10000),
            ('Elektrokauter Valleylab', 'ELEC-001', 'Elektrokatery', 350000, 5000),
            ('Anestézní přístroj Dräger', 'ANES-001', 'Anestézie', 1200000, 15000),
            ('Endoskopická věž Storz', 'ENDO-001', 'Endoskopie', 2800000, 8000),
            ('C-rameno RTG Siemens', 'RTG-001', 'Zobrazování', 4500000, 12000),
            ('Laparoskopická souprava', 'LAP-001', 'Laparoskopie', 800000, 6000),
            ('Monitorovací systém Philips', 'MON-001', 'Monitoring', 450000, 20000),
            ('Defibrilátor Zoll', 'DEF-001', 'Resuscitace', 250000, 10000),
            ('Ultrazvuk GE', 'UZ-001', 'Zobrazování', 1500000, 15000),
            ('Infúzní pumpa Braun', 'INF-001', 'Infúzní technika', 120000, 8000),
            ('Chirurgická svítilna LED', 'LED-001', 'Osvětlení', 380000, 25000),
            ('Operační stůl Maquet', 'STUL-001', 'Operační stoly', 950000, 30000),
        ]
        equipment_list = []
        for name, code, cat, price, lifetime in equipment_data:
            used_hours = random.randint(0, int(lifetime * 0.7))
            equip = Equipment.objects.create(
                name=name,
                equipment_code=code,
                category=cat,
                purchase_date=datetime.now().date() - timedelta(days=random.randint(365, 1825)),
                purchase_price=price,
                lifetime_hours=lifetime,
                used_hours=used_hours,
                is_operational=True
            )
            equipment_list.append(equip)
        self.stdout.write(self.style.SUCCESS(f'Vytvořeno {len(equipment_list)} přístrojů'))
        
        # Vytvořit materiál
        self.stdout.write('Vytvářím materiál...')
        materials_data = [
            ('Chirurgické rukavice sterilní', '8594012345678', 'Ochrana', 'balení', 45),
            ('Stříkačka 10ml', '8594012345685', 'Jednorázové', 'ks', 8),
            ('Jehla injekční 21G', '8594012345692', 'Jednorázové', 'ks', 3),
            ('Roušky chirurgické', '8594012345708', 'Ochrana', 'balení', 120),
            ('Sterilní čtverce', '8594012345715', 'Obvazový materiál', 'balení', 35),
            ('Skalpel sterilní', '8594012345722', 'Nástroje', 'ks', 15),
            ('Katétr močový', '8594012345739', 'Jednorázové', 'ks', 45),
            ('Chirurgický šicí materiál', '8594012345746', 'Sutury', 'balení', 280),
            ('Drén Redon', '8594012345753', 'Drenáže', 'ks', 95),
            ('Chirurgická síťka', '8594012345760', 'Implantáty', 'ks', 1200),
            ('Dezinfekce 500ml', '8594012345777', 'Dezinfekce', 'ks', 65),
            ('Náplast fixační', '8594012345784', 'Obvazový materiál', 'balení', 25),
        ]
        materials = []
        for name, ean, cat, unit, price in materials_data:
            mat = Material.objects.create(
                name=name,
                ean_code=ean,
                category=cat,
                unit=unit,
                unit_price=price,
                stock_quantity=random.randint(50, 500),
                minimum_stock=20,
                is_disposable=True
            )
            materials.append(mat)
        self.stdout.write(self.style.SUCCESS(f'Vytvořeno {len(materials)} materiálů'))
        
        # Vytvořit operace
        self.stdout.write('Vytvářím operace...')
        operations = []
        statuses = ['scheduled', 'scheduled', 'scheduled', 'completed']
        
        # Nejdřív vytvořit několik běžících operací pro dnes
        now = timezone.now()
        today_start = now.replace(hour=8, minute=0, second=0, microsecond=0)
        
        # 3-5 aktuálně běžících operací
        num_in_progress = random.randint(3, 5)
        for i in range(num_in_progress):
            # Operace začala před 1-3 hodinami
            hours_ago = random.randint(1, 3)
            scheduled_start = now - timedelta(hours=hours_ago)
            duration = random.randint(3, 5)
            scheduled_end = scheduled_start + timedelta(hours=duration)
            
            operation = Operation.objects.create(
                patient=random.choice(patients),
                operating_room=rooms[i],  # Každá v jiném sále
                primary_doctor=random.choice(doctors),
                operation_type=random.choice([
                    'Laparoskopická cholecystektomie',
                    'Artroskopie kolenního kloubu',
                    'Appendektomie',
                    'Herniotomie',
                    'Kardiochirurgický výkon',
                    'Spondylodéza',
                    'Nefrolitotomie',
                    'Tonzilektomie',
                    'Plastická rekonstrukce',
                    'Onkochirurgický výkon'
                ]),
                scheduled_start=scheduled_start,
                scheduled_end=scheduled_end,
                actual_start=scheduled_start,
                status='in_progress',
                is_emergency=random.random() < 0.1,
                notes='Operace probíhá'
            )
            
            # Přidat asistující doktory
            assisting = random.sample([d for d in doctors if d != operation.primary_doctor], k=random.randint(1, 2))
            operation.assisting_doctors.set(assisting)
            operations.append(operation)
        
        # Pak vytvořit plánované operace pro dnes a budoucnost
        for i in range(25):
            days_offset = i // 5
            hour_offset = (i % 5) * 2 + 10  # 10, 12, 14, 16, 18
            
            scheduled_start = today_start + timedelta(days=days_offset, hours=hour_offset - 8)
            duration = random.randint(2, 4)
            scheduled_end = scheduled_start + timedelta(hours=duration)
            
            # Pouze plánované nebo dokončené
            if days_offset == 0 and scheduled_start < now:
                status = 'completed'
            else:
                status = random.choice(statuses)
            
            operation = Operation.objects.create(
                patient=random.choice(patients),
                operating_room=random.choice(rooms),
                primary_doctor=random.choice(doctors),
                operation_type=random.choice([
                    'Laparoskopická cholecystektomie',
                    'Artroskopie kolenního kloubu',
                    'Appendektomie',
                    'Herniotomie',
                    'Kardiochirurgický výkon',
                    'Spondylodéza',
                    'Nefrolitotomie',
                    'Tonzilektomie',
                    'Plastická rekonstrukce',
                    'Onkochirurgický výkon'
                ]),
                scheduled_start=scheduled_start,
                scheduled_end=scheduled_end,
                status=status,
                is_emergency=random.random() < 0.1,
                notes='Standardní průběh operace'
            )
            
            # Pokud je operace dokončená, nastavit skutečný čas
            if status == 'completed':
                operation.actual_start = operation.scheduled_start
                operation.actual_end = operation.scheduled_end + timedelta(minutes=random.randint(-30, 30))
                operation.save()
            
            # Přidat asistující doktory
            assisting = random.sample([d for d in doctors if d != operation.primary_doctor], k=random.randint(1, 2))
            operation.assisting_doctors.set(assisting)
            
            operations.append(operation)
        
        self.stdout.write(self.style.SUCCESS(f'Vytvořeno {len(operations)} operací (včetně {num_in_progress} běžících)'))
        
        # Vytvořit peroperační protokoly pro dokončené operace
        self.stdout.write('Vytvářím peroperační protokoly...')
        completed_ops = [op for op in operations if op.status == 'completed']
        
        for operation in completed_ops:
            # Náklady na personál
            duration = float(operation.duration_hours) if operation.duration_hours else 0.0
            staff_cost = (
                float(operation.primary_doctor.hourly_rate) * duration +
                sum(float(d.hourly_rate) for d in operation.assisting_doctors.all()) * duration
            )
            
            protocol = PerioperativeProtocol.objects.create(
                operation=operation,
                anesthesia_type=random.choice(['Celková anestézie', 'Spinální anestézie', 'Lokální anestézie']),
                procedure_notes='Operace proběhla bez komplikací. Pacient toleroval výkon dobře.',
                complications='',
                total_staff_cost=staff_cost,
                total_equipment_cost=0,
                total_material_cost=0
            )
            
            # Přidat použité přístroje
            used_equipment = random.sample(equipment_list, k=random.randint(3, 6))
            for equip in used_equipment:
                hours = duration
                cost = float(equip.hourly_depreciation) * hours
                EquipmentUsage.objects.create(
                    protocol=protocol,
                    equipment=equip,
                    hours_used=hours,
                    cost=cost
                )
                protocol.total_equipment_cost += cost
                equip.used_hours += int(hours)
                equip.save()
            
            # Přidat použitý materiál
            used_materials = random.sample(materials, k=random.randint(5, 10))
            for mat in used_materials:
                quantity = random.randint(1, 5)
                cost = float(mat.unit_price) * quantity
                MaterialUsage.objects.create(
                    protocol=protocol,
                    material=mat,
                    quantity_used=quantity,
                    cost=cost
                )
                protocol.total_material_cost += cost
                mat.stock_quantity -= quantity
                mat.save()
            
            protocol.save()
        
        self.stdout.write(self.style.SUCCESS(f'Vytvořeno {len(completed_ops)} peroperačních protokolů'))
        
        self.stdout.write(self.style.SUCCESS('Mockup data úspěšně vytvořena!'))
        self.stdout.write(f'Operační sály: {OperatingRoom.objects.count()}')
        self.stdout.write(f'Doktoři: {Doctor.objects.count()}')
        self.stdout.write(f'Pacienti: {Patient.objects.count()}')
        self.stdout.write(f'Přístroje: {Equipment.objects.count()}')
        self.stdout.write(f'Materiál: {Material.objects.count()}')
        self.stdout.write(f'Operace: {Operation.objects.count()}')
        self.stdout.write(f'Protokoly: {PerioperativeProtocol.objects.count()}')
