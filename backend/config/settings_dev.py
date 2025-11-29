"""Development settings"""
from .settings import *

DEBUG = True

ALLOWED_HOSTS = ['*']

# Development apps
INSTALLED_APPS += [
    'debug_toolbar',
]

MIDDLEWARE = [
    'debug_toolbar.middleware.DebugToolbarMiddleware',
] + MIDDLEWARE

# Debug toolbar config
INTERNAL_IPS = [
    '127.0.0.1',
    'localhost',
]

# CORS pro development - povolujeme všechny origins pro lokální vývoj
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

# CSRF pro development - vypnout pro API endpointy
CSRF_TRUSTED_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:8000']
CSRF_COOKIE_SECURE = False
CSRF_COOKIE_SAMESITE = None

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'DEBUG',
    },
}

# Email backend pro development (console)
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
