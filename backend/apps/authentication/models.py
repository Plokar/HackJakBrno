from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver


class UserProfile(models.Model):
    """Rozšíření User modelu o role a další informace"""
    ROLE_CHOICES = [
        ('doctor', 'Doktor'),
        ('admin', 'Administrátor'),
        ('nurse', 'Sestra'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='doctor')
    phone_number = models.CharField(max_length=20, blank=True)
    department = models.CharField(max_length=100, blank=True)
    
    class Meta:
        db_table = 'user_profiles'
    
    def __str__(self):
        return f"{self.user.username} ({self.get_role_display()})"


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Automaticky vytvoří profil při vytvoření uživatele"""
    if created:
        UserProfile.objects.create(user=instance)
