"""
Production-specific Django settings
Import this in production environment
"""
from .settings import *  # noqa
from .settings_fhir import *  # noqa
import os

# Security settings
DEBUG = False
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY')  # Must be set in environment

if not SECRET_KEY:
    raise ValueError("DJANGO_SECRET_KEY must be set in production")

ALLOWED_HOSTS = os.getenv('DJANGO_ALLOWED_HOSTS', '').split(',')

# Security middleware
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# HSTS
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Database - use environment variables
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('POSTGRES_DB'),
        'USER': os.getenv('POSTGRES_USER'),
        'PASSWORD': os.getenv('POSTGRES_PASSWORD'),
        'HOST': os.getenv('DB_HOST', 'db'),
        'PORT': os.getenv('DB_PORT', '5432'),
        'CONN_MAX_AGE': 600,
        'OPTIONS': {
            'connect_timeout': 10,
        }
    }
}

# Static and media files
STATIC_ROOT = '/var/www/static/'
MEDIA_ROOT = '/var/www/media/'

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '[{levelname}] {asctime} {name} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': '/var/log/medichub/django.log',
            'maxBytes': 1024 * 1024 * 15,  # 15MB
            'backupCount': 10,
            'formatter': 'verbose',
        },
        'fhir_file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': '/var/log/medichub/fhir.log',
            'maxBytes': 1024 * 1024 * 15,
            'backupCount': 10,
            'formatter': 'verbose',
        },
        'error_file': {
            'level': 'ERROR',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': '/var/log/medichub/errors.log',
            'maxBytes': 1024 * 1024 * 15,
            'backupCount': 10,
            'formatter': 'verbose',
        },
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file', 'error_file', 'console'],
            'level': 'INFO',
            'propagate': False,
        },
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
        'services.nis_integration': {
            'handlers': ['fhir_file', 'console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# Email configuration for error reporting
ADMINS = [
    ('Admin', os.getenv('ADMIN_EMAIL', 'admin@fnusa.cz')),
]
MANAGERS = ADMINS

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'noreply@fnusa.cz')
SERVER_EMAIL = DEFAULT_FROM_EMAIL

# FHIR Server - production URL
FHIR_SERVER_URL = os.getenv('FHIR_SERVER_URL', 'http://fhir-server:52773/fhir/r4')
FHIR_SERVER_EXTERNAL_URL = os.getenv('FHIR_SERVER_EXTERNAL_URL', 'https://fhir.fnusa.cz/fhir/r4')

# NIS Integration - production endpoint
NIS_ENDPOINT = os.getenv('NIS_ENDPOINT')  # Must be configured in production
NIS_AUTH_TYPE = os.getenv('NIS_AUTH_TYPE', 'oauth2')  # oauth2, saml, basic
NIS_CLIENT_ID = os.getenv('NIS_CLIENT_ID')
NIS_CLIENT_SECRET = os.getenv('NIS_CLIENT_SECRET')

# Performance optimizations
CONN_MAX_AGE = 600

# Template caching
TEMPLATES[0]['OPTIONS']['loaders'] = [
    ('django.template.loaders.cached.Loader', [
        'django.template.loaders.filesystem.Loader',
        'django.template.loaders.app_directories.Loader',
    ]),
]

