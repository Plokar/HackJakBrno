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

# Odebrat CSRF middleware pro demo
MIDDLEWARE = [m for m in MIDDLEWARE if 'CsrfViewMiddleware' not in m]

# Přidat MockAuthMiddleware PO AuthenticationMiddleware (musí být za ním, aby přepsal uživatele)
# Nejdřív zkontrolovat, zda už tam není
if 'core.middleware.MockAuthMiddleware' not in MIDDLEWARE:
    auth_index = MIDDLEWARE.index('django.contrib.auth.middleware.AuthenticationMiddleware')
    MIDDLEWARE.insert(auth_index + 1, 'core.middleware.MockAuthMiddleware')

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

# Pro DEMO - vypnout CSRF ochranu úplně a použít MockAuthentication
REST_FRAMEWORK = {
    **REST_FRAMEWORK,  # Převzít základní nastavení
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'core.authentication.MockAuthentication',  # Použít mock autentizaci
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
}

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
