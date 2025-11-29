"""
FHIR-specific Django settings
"""
import os

# FHIR Server Configuration
FHIR_SERVER_URL = os.getenv('FHIR_SERVER_URL', 'http://fhir-server:52773/fhir/r4')
FHIR_SERVER_EXTERNAL_URL = os.getenv('FHIR_SERVER_EXTERNAL_URL', 'http://localhost:32783/fhir/r4')

# FHIR Extensions URLs
FHIR_EXTENSIONS = {
    'patient_rc': 'https://fnusa.cz/patient-rc',
    'patient_diagnosis': 'https://fnusa.cz/patient-diagnosis',
    'patient_medical_history': 'https://fnusa.cz/patient-medical-history',
    'device_cost': 'https://fnusa.cz/device-cost',
    'device_lifetime': 'https://fnusa.cz/device-lifetime-hours',
    'device_used_hours': 'https://fnusa.cz/device-used-hours',
    'device_purchase_date': 'https://fnusa.cz/device-purchase-date',
    'device_maintenance_date': 'https://fnusa.cz/device-maintenance-date',
    'material_ean': 'https://fnusa.cz/material-ean',
    'material_unit_price': 'https://fnusa.cz/material-unit-price',
    'material_minimum_stock': 'https://fnusa.cz/material-minimum-stock',
    'material_disposable': 'https://fnusa.cz/material-disposable',
    'material_cost': 'https://fnusa.cz/material-cost',
    'material_batch': 'https://fnusa.cz/material-batch',
    'procedure_cost_breakdown': 'https://fnusa.cz/procedure-cost-breakdown',
    'procedure_emergency': 'https://fnusa.cz/procedure-emergency',
    'procedure_duration': 'https://fnusa.cz/procedure-duration',
    'doctor_hourly_rate': 'https://fnusa.cz/doctor-hourly-rate',
    'location_floor': 'https://fnusa.cz/location-floor',
    'location_capacity': 'https://fnusa.cz/location-capacity',
    'protocol_cost_breakdown': 'https://fnusa.cz/protocol-cost-breakdown',
    'anonymized': 'https://fnusa.cz/anonymized',
    'anonymized_at': 'https://fnusa.cz/anonymized-at',
}

# FHIR Coding Systems
FHIR_CODING_SYSTEMS = {
    'icd10': 'http://hl7.org/fhir/sid/icd-10',
    'uzis': 'https://uzis.cz/coding-system',
    'snomed': 'http://snomed.info/sct',
    'loinc': 'http://loinc.org',
}

# Celery Configuration
CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', 'redis://redis:6379/0')
CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', 'redis://redis:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'Europe/Prague'

# Django Channels Configuration
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [(os.getenv('REDIS_HOST', 'redis'), 6379)],
        },
    },
}

# Cache Configuration
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': os.getenv('REDIS_URL', 'redis://redis:6379/1'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
        'KEY_PREFIX': 'medichub',
        'TIMEOUT': 300,  # 5 minut default
    }
}

# Logging pro FHIR operace
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'fhir_file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': 'logs/fhir.log',
            'formatter': 'verbose',
        },
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'services.fhir_service': {
            'handlers': ['fhir_file', 'console'],
            'level': 'INFO',
            'propagate': False,
        },
        'services.sync_service': {
            'handlers': ['fhir_file', 'console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

