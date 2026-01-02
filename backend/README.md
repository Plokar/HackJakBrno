# 🏥 MedicHub Backend - REST API & FHIR Integration

<p align="center">
  <strong>Django REST API with HL7 FHIR R4 Integration</strong>
</p>

---

## 📋 Overview

The MedicHub backend is a **modular monolith** designed for scalability, maintainability, and seamless healthcare data interoperability. It provides a comprehensive REST API for operating room management with full FHIR R4 compliance.

### Key Features

- 🏗️ **Modular Monolith Architecture** - Domain-driven design with bounded contexts
- 🔄 **FHIR R4 Integration** - Bidirectional sync with InterSystems IRIS Health
- 🚀 **RESTful API** - Django REST Framework with ViewSets
- 📊 **Real-time Updates** - WebSocket support via Django Channels
- ⚡ **Async Task Queue** - Celery with Redis for background jobs
- 🔐 **Enterprise Security** - JWT authentication, RBAC, GDPR compliance
- 📈 **Comprehensive Testing** - pytest with high coverage

---

## 🏗️ Architecture

### Modular Monolith Structure

```
backend/
├── apps/                           # Domain modules (bounded contexts)
│   ├── authentication/             # User authentication & authorization
│   ├── items/                      # Generic items module
│   └── operating_rooms/            # 🏥 Core: Operating room management
│       ├── models.py               # Domain models with FHIR fields
│       ├── views.py                # Standard REST API views
│       ├── views_fhir.py           # FHIR-specific endpoints
│       ├── views_nurse.py          # Nurse-specific workflows
│       ├── serializers.py          # DRF serializers
│       ├── urls.py                 # URL routing
│       ├── admin.py                # Django admin
│       ├── management/             # Custom management commands
│       │   └── commands/
│       │       ├── generate_fhir_data.py   # FHIR data generator
│       │       ├── init_doctors.py         # Initialize doctors
│       │       ├── init_operating_rooms.py # Initialize rooms
│       │       └── import_excel_data.py    # Import from Excel
│       └── tests/                  # Unit & integration tests
│
├── services/                       # 🎯 Business logic layer
│   ├── fhir_service.py             # FHIR server communication
│   ├── fhir_mappers.py             # Django ↔ FHIR mappings
│   ├── fhir_protocol_service.py    # Protocol FHIR operations
│   ├── sync_service.py             # Data synchronization
│   ├── nis_integration.py          # Hospital system integration
│   ├── caching_service.py          # FHIR data caching
│   ├── security_service.py         # GDPR & security services
│   └── items_service.py            # Generic items service
│
├── consumers/                      # WebSocket consumers
│   └── fhir_consumer.py            # Real-time FHIR updates
│
├── core/                           # 🔧 Shared utilities
│   ├── models.py                   # Base models (TimeStampedModel, etc.)
│   ├── exceptions.py               # Custom exceptions
│   ├── utils.py                    # Utility functions
│   ├── authentication.py           # Auth utilities
│   └── middleware.py               # Custom middleware
│
├── config/                         # ⚙️ Django configuration
│   ├── settings.py                 # Base settings
│   ├── settings_dev.py             # Development settings
│   ├── settings_prod.py            # Production settings
│   ├── settings_fhir.py            # FHIR-specific settings
│   ├── urls.py                     # Root URL configuration
│   ├── wsgi.py                     # WSGI application
│   ├── asgi.py                     # ASGI application (WebSockets)
│   └── celery.py                   # Celery configuration
│
├── data/                           # CSV data files
│   ├── equipment.csv
│   ├── material.csv
│   ├── personal.csv
│   ├── employee_costs.csv
│   └── sterilization_tools.csv
│
├── scripts/                        # Utility scripts
│   └── convert_xlsx_to_csv.py
│
├── manage.py                       # Django management CLI
├── requirements.txt                # Production dependencies
├── requirements-dev.txt            # Development dependencies
├── pytest.ini                      # pytest configuration
├── conftest.py                     # pytest fixtures
├── Dockerfile                      # Production container
├── Dockerfile.dev                  # Development container
├── entrypoint.sh                   # Container entrypoint
└── wait-for-fhir.sh               # FHIR server wait script
```

---

## 🎯 Architecture Principles

### 1. **Layered Architecture**

```
┌─────────────────────────────────────────┐
│     HTTP Layer (Views/Controllers)      │  ← Thin layer: request/response
├─────────────────────────────────────────┤
│      Business Logic (Services)          │  ← Core logic, orchestration
├─────────────────────────────────────────┤
│      Data Layer (Models/ORM)            │  ← Database operations
├─────────────────────────────────────────┤
│      External APIs (FHIR, NIS)          │  ← External integrations
└─────────────────────────────────────────┘
```

**Benefits:**
- Clear separation of concerns
- Testable business logic
- Reusable services across views, Celery tasks, and CLI commands

### 2. **Bounded Contexts (Apps)**

Each app in `apps/` represents a **bounded context**:
- Self-contained domain logic
- Own models, views, serializers
- Communicates with other apps via services
- Can be extracted to microservice in the future

### 3. **FHIR-First Data Model**

All core models include FHIR integration fields:

```python
class Patient(TimeStampedModel):
    # Django fields
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    
    # FHIR integration
    fhir_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    fhir_resource_json = models.JSONField(null=True, blank=True)
    fhir_last_synced = models.DateTimeField(null=True, blank=True)
    
    def sync_to_fhir(self):
        """Synchronize to FHIR server"""
        
    def sync_from_fhir(self):
        """Load from FHIR server"""
```

---

## 🗂️ Data Models

### Core Entities

| Model | FHIR Resource | Description |
|-------|---------------|-------------|
| `Patient` | Patient | Patient demographics and medical history |
| `Doctor` | Practitioner | Medical practitioners with specializations |
| `OperatingRoom` | Location | Operating room details and capacity |
| `Operation` | Procedure | Scheduled surgical procedures |
| `Equipment` | Device | Medical devices with lifecycle tracking |
| `Material` | SupplyDelivery | Consumables with EAN-13 barcodes |
| `PerioperativeProtocol` | DocumentReference | Pre/intra/post-operative documentation |
| `EquipmentUsage` | - | Equipment usage tracking |
| `MaterialUsage` | - | Material consumption tracking |
| `OperationTool` | Device | Surgical instruments |
| `ToolUsage` | - | Instrument usage tracking |

### Relationships

```
Operation
├── performed_in → OperatingRoom
├── performed_on → Patient
├── performed_by → Doctor (primary)
├── assisted_by → [Doctor] (many)
├── has → PerioperativeProtocol
├── uses → [EquipmentUsage]
├── consumes → [MaterialUsage]
└── requires → [ToolUsage]
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- PostgreSQL 15+
- Redis 7+
- InterSystems IRIS Health (FHIR server)

### Installation

#### 1. **Create Virtual Environment**

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

#### 2. **Install Dependencies**

```bash
# Production dependencies
pip install -r requirements.txt

# Development dependencies (includes testing tools)
pip install -r requirements-dev.txt
```

#### 3. **Environment Configuration**

Create `.env` file in the backend directory:

```env
# Django
DJANGO_SECRET_KEY=your-secret-key-here
DJANGO_DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DJANGO_SETTINGS_MODULE=config.settings_dev

# Database
POSTGRES_DB=medichub
POSTGRES_USER=medichub_user
POSTGRES_PASSWORD=secure_password
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# FHIR Server
FHIR_SERVER_URL=http://localhost:32783/fhir/r4
IRIS_USERNAME=SuperUser
IRIS_PASSWORD=SYS

# Redis
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

#### 4. **Database Setup**

```bash
# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Initialize operating rooms
python manage.py init_operating_rooms

# Initialize doctors
python manage.py init_doctors
```

#### 5. **Load Sample Data**

```bash
# Generate FHIR test data (uses Synthea if available)
python manage.py generate_fhir_data --load-synthea

# Or generate fresh data
python manage.py generate_fhir_data --patients 50

# Import from Excel
python manage.py import_excel_data
```

#### 6. **Run Development Server**

```bash
# Django development server
python manage.py runserver

# Or with ASGI for WebSockets
daphne -b 0.0.0.0 -p 8000 config.asgi:application
```

#### 7. **Start Celery Workers** (Optional)

```bash
# In a separate terminal
celery -A config worker -l info

# Celery beat for scheduled tasks
celery -A config beat -l info
```

---

## 📡 API Endpoints

### Base URL
```
http://localhost:8000/api/operating-rooms/
```

### Standard REST Endpoints

#### Operating Rooms
```http
GET    /rooms/                    # List all rooms
POST   /rooms/                    # Create new room
GET    /rooms/{id}/               # Get room details
PUT    /rooms/{id}/               # Update room
PATCH  /rooms/{id}/               # Partial update
DELETE /rooms/{id}/               # Delete room
```

#### Patients
```http
GET    /patients/                 # List patients
POST   /patients/                 # Create patient
GET    /patients/{id}/            # Patient details
PUT    /patients/{id}/            # Update patient
DELETE /patients/{id}/            # Delete patient
```

#### Operations
```http
GET    /operations/               # List operations
POST   /operations/               # Schedule operation
GET    /operations/{id}/          # Operation details
GET    /operations/{id}/costs/    # Cost breakdown analysis
PUT    /operations/{id}/          # Update operation
DELETE /operations/{id}/          # Cancel operation
```

#### Equipment & Materials
```http
GET    /equipment/                # List equipment
POST   /equipment/                # Add equipment
GET    /materials/                # List materials
POST   /materials/                # Add material
```

#### Dashboard
```http
GET    /dashboard/stats/          # Real-time statistics
GET    /dashboard/utilization/    # Room utilization metrics
```

### FHIR Integration Endpoints

#### FHIR Patients
```http
GET    /fhir/patients/                      # List FHIR patients
GET    /fhir/patients/search/               # Search FHIR patients
POST   /fhir/patients/generate/             # Generate test patients
POST   /fhir/patients/sync_from_fhir/       # Sync all from FHIR
POST   /fhir/patients/{id}/sync_to_fhir/    # Sync one to FHIR
```

#### FHIR Practitioners
```http
GET    /fhir/practitioners/                      # List practitioners
POST   /fhir/practitioners/sync_from_fhir/       # Sync from FHIR
POST   /fhir/practitioners/{id}/sync_to_fhir/    # Sync to FHIR
```

#### FHIR Locations (Rooms)
```http
GET    /fhir/locations/                      # List locations
POST   /fhir/locations/sync_from_fhir/       # Sync from FHIR
POST   /fhir/locations/{id}/sync_to_fhir/    # Sync to FHIR
```

#### FHIR Procedures (Operations)
```http
GET    /fhir/procedures/                      # List procedures
POST   /fhir/procedures/sync_from_fhir/       # Sync from FHIR
POST   /fhir/procedures/{id}/sync_to_fhir/    # Sync to FHIR
```

#### FHIR Server Status
```http
GET    /fhir/server/                         # Server status
GET    /fhir/server/metadata/                # FHIR capability statement
GET    /fhir/server/health/                  # Health check
```

### Nurse-Specific Endpoints
```http
GET    /nurse/operations/                    # Nurse operation view
POST   /nurse/operations/{id}/start/         # Mark operation started
POST   /nurse/operations/{id}/complete/      # Mark operation completed
GET    /nurse/operations/{id}/checklist/     # Pre-op checklist
```

---

## 🧪 Testing

### Run Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=apps --cov=services --cov=core

# Run specific test file
pytest apps/operating_rooms/tests/test_models.py

# Run with verbose output
pytest -v

# Run with print statements
pytest -s
```

### Test Structure

```
apps/operating_rooms/tests/
├── __init__.py
├── test_models.py              # Model tests
├── test_views.py               # View tests
├── test_serializers.py         # Serializer tests
├── test_fhir_integration.py    # FHIR integration tests
└── test_services.py            # Service layer tests
```

### Writing Tests

```python
import pytest
from apps.operating_rooms.models import Patient

@pytest.mark.django_db
class TestPatientModel:
    def test_create_patient(self):
        patient = Patient.objects.create(
            first_name="John",
            last_name="Doe",
            date_of_birth="1990-01-01"
        )
        assert patient.id is not None
        assert str(patient) == "John Doe"
    
    def test_sync_to_fhir(self, mocker):
        # Mock FHIR service
        mock_fhir = mocker.patch('services.fhir_service.FHIRService')
        patient = Patient.objects.create(...)
        
        result = patient.sync_to_fhir()
        
        assert patient.fhir_id is not None
        mock_fhir.assert_called_once()
```

---

## 🛠️ Management Commands

### Custom Django Commands

#### Generate FHIR Data
```bash
# Sync existing Synthea data from FHIR server
python manage.py generate_fhir_data --load-synthea

# Generate new patients
python manage.py generate_fhir_data --patients 50

# Sync only (no generation)
python manage.py generate_fhir_data --sync-only

# With verbose output
python manage.py generate_fhir_data --patients 10 -v 2
```

#### Initialize Operating Rooms
```bash
# Create standard set of operating rooms
python manage.py init_operating_rooms

# Or specify number
python manage.py init_operating_rooms --count 20
```

#### Initialize Doctors
```bash
# Create sample doctors with specializations
python manage.py init_doctors
```

#### Import Excel Data
```bash
# Import equipment, materials, and costs from Excel
python manage.py import_excel_data
```

---

## 🔧 Services Layer

### FHIR Service

Main service for FHIR server communication:

```python
from services.fhir_service import FHIRService

fhir_service = FHIRService()

# Create patient
fhir_data = {"resourceType": "Patient", ...}
result = fhir_service.create_patient(fhir_data)

# Get patient
patient = fhir_service.get_patient(patient_id)

# Search patients
patients = fhir_service.search_patients(family="Doe")

# Update patient
updated = fhir_service.update_patient(patient_id, fhir_data)
```

### FHIR Mappers

Bidirectional mapping between Django models and FHIR resources:

```python
from services.fhir_mappers import django_patient_to_fhir, fhir_patient_to_django

# Django → FHIR
patient = Patient.objects.get(id=1)
fhir_resource = django_patient_to_fhir(patient)

# FHIR → Django
fhir_data = {...}  # FHIR Patient resource
django_data = fhir_patient_to_django(fhir_data)
```

### Caching Service

FHIR data caching for performance:

```python
from services.caching_service import FHIRCacheService

cache = FHIRCacheService()

# Cache FHIR resource
cache.set_resource('Patient', patient_id, fhir_data, ttl=3600)

# Get cached resource
cached_data = cache.get_resource('Patient', patient_id)

# Invalidate cache
cache.invalidate_resource('Patient', patient_id)
```

### Security Service

GDPR compliance and audit logging:

```python
from services.security_service import GDPRService, AuditService

# Anonymize patient data
gdpr = GDPRService()
anonymized = gdpr.anonymize_patient(patient)

# Log audit event
audit = AuditService()
audit.log_access(user, patient, action='view')
```

---

## 🔐 Security

### Authentication

- JWT token-based authentication
- Token refresh mechanism
- Session management

### Authorization

- Role-based access control (RBAC)
- Permission classes for views
- Object-level permissions

### GDPR Compliance

- Data anonymization
- Audit logging
- Right to be forgotten
- Data export

### FHIR Security

- OAuth2 integration ready
- SMART on FHIR support prepared
- Secure communication with FHIR server

---

## 📊 Monitoring & Logging

### Application Logs

Logs are stored in `logs/` directory:
- `django.log` - Application logs
- `celery.log` - Celery task logs
- `fhir.log` - FHIR integration logs

### Log Configuration

```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': 'logs/django.log',
            'maxBytes': 1024 * 1024 * 5,  # 5MB
            'backupCount': 5,
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file'],
            'level': 'INFO',
        },
    },
}
```

---

## 🐳 Docker Deployment

### Development

```bash
# Build and start
docker-compose -f docker-compose.dev.yml up --build

# Run migrations
docker-compose -f docker-compose.dev.yml exec backend python manage.py migrate

# Access shell
docker-compose -f docker-compose.dev.yml exec backend python manage.py shell
```

### Production

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f backend

# Run management command
docker-compose exec backend python manage.py <command>
```

---

## 🔄 Adding a New Module

### Step 1: Create Module Structure

```bash
cd backend/apps
mkdir new_module
cd new_module
touch __init__.py models.py views.py urls.py serializers.py admin.py apps.py
mkdir tests
touch tests/__init__.py tests/test_models.py
```

### Step 2: Define App Configuration

```python
# apps/new_module/apps.py
from django.apps import AppConfig

class NewModuleConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.new_module'
    verbose_name = 'New Module'
```

### Step 3: Register in Settings

```python
# config/settings.py
INSTALLED_APPS = [
    # ...
    'apps.new_module',
]
```

### Step 4: Create Models

```python
# apps/new_module/models.py
from core.models import TimeStampedModel

class MyModel(TimeStampedModel):
    name = models.CharField(max_length=100)
    
    class Meta:
        db_table = 'my_models'
```

### Step 5: Create Serializers & Views

```python
# apps/new_module/serializers.py
from rest_framework import serializers
from .models import MyModel

class MyModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = MyModel
        fields = '__all__'

# apps/new_module/views.py
from rest_framework import viewsets
from .models import MyModel
from .serializers import MyModelSerializer

class MyModelViewSet(viewsets.ModelViewSet):
    queryset = MyModel.objects.all()
    serializer_class = MyModelSerializer
```

### Step 6: Configure URLs

```python
# apps/new_module/urls.py
from rest_framework.routers import DefaultRouter
from .views import MyModelViewSet

router = DefaultRouter()
router.register(r'items', MyModelViewSet)

urlpatterns = router.urls

# config/urls.py - add to main urlpatterns:
path('api/new-module/', include('apps.new_module.urls')),
```

### Step 7: Run Migrations

```bash
python manage.py makemigrations
python manage.py migrate
```



