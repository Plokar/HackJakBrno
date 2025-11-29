"""
Celery konfigurace pro asynchronní tasky
"""
import os
from celery import Celery
from celery.schedules import crontab

# Nastavit default Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('medic_hub')

# Načíst konfiguraci z Django settings s prefixem CELERY_
app.config_from_object('django.conf:settings', namespace='CELERY')

# Automaticky najít tasks ve všech Django apps
app.autodiscover_tasks()

# Konfigurace Beat schedule pro periodické tasky
app.conf.beat_schedule = {
    'sync-from-fhir-every-5-minutes': {
        'task': 'services.sync_service.sync_from_fhir_periodic',
        'schedule': 300.0,  # 5 minut
    },
    'check-fhir-server-health': {
        'task': 'services.sync_service.check_fhir_server_health',
        'schedule': 60.0,  # 1 minuta
    },
}

@app.task(bind=True)
def debug_task(self):
    """Debug task pro testování Celery"""
    print(f'Request: {self.request!r}')

