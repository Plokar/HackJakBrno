from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from apps.authentication.models import UserProfile


class Command(BaseCommand):
    help = 'Vytvoří 3 testovací uživatele: doktor, admin, sestra'

    def handle(self, *args, **options):
        users_data = [
            {
                'username': 'doktor',
                'email': 'doktor@hospital.cz',
                'password': 'doktor123',
                'first_name': 'Jan',
                'last_name': 'Novák',
                'role': 'doctor'
            },
            {
                'username': 'admin',
                'email': 'admin@hospital.cz',
                'password': 'admin123',
                'first_name': 'Marie',
                'last_name': 'Svobodová',
                'role': 'admin'
            },
            {
                'username': 'sestra',
                'email': 'sestra@hospital.cz',
                'password': 'sestra123',
                'first_name': 'Eva',
                'last_name': 'Dvořáková',
                'role': 'nurse'
            }
        ]

        for user_data in users_data:
            role = user_data.pop('role')
            username = user_data['username']
            
            # Zkontrolovat, zda uživatel již existuje
            if User.objects.filter(username=username).exists():
                self.stdout.write(
                    self.style.WARNING(f'Uživatel {username} již existuje, přeskakuji...')
                )
                continue
            
            # Vytvořit uživatele
            user = User.objects.create_user(**user_data)
            
            # Nastavit roli
            profile, created = UserProfile.objects.get_or_create(user=user)
            profile.role = role
            profile.save()
            
            self.stdout.write(
                self.style.SUCCESS(f'Vytvořen uživatel {username} s rolí {role}')
            )

        self.stdout.write(
            self.style.SUCCESS('\n=== Testovací uživatelé vytvořeni ===')
        )
        self.stdout.write('Doktor:')
        self.stdout.write('  Username: doktor')
        self.stdout.write('  Password: doktor123')
        self.stdout.write('  Role: Vytváří operace a přiřazuje pacienty\n')
        
        self.stdout.write('Admin:')
        self.stdout.write('  Username: admin')
        self.stdout.write('  Password: admin123')
        self.stdout.write('  Role: Schvaluje operace na daný termín\n')
        
        self.stdout.write('Sestra:')
        self.stdout.write('  Username: sestra')
        self.stdout.write('  Password: sestra123')
        self.stdout.write('  Role: Upravuje operační typ a přidává personál\n')
