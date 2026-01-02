# 🏥 MedicHub - Operating Room Management System

<p align="center">
  <strong>Modern Operating Room Management Dashboard with FHIR Integration</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#api-documentation">API</a>
</p>

---

## 📋 Overview

MedicHub is a comprehensive operating room management system designed for healthcare facilities. It provides real-time monitoring of operating room utilization, cost tracking, equipment lifecycle management, and seamless integration with FHIR-compliant health information systems.

### Key Capabilities

- 📊 **Real-time Dashboard** - Monitor all operating rooms with live status updates
- 💰 **Cost Analytics** - Automatic calculation of operation costs (equipment depreciation, materials, staff)
- 🔄 **FHIR Integration** - Full HL7 FHIR R4 compliance with InterSystems IRIS Health
- 📅 **Smart Scheduling** - Intelligent operation scheduling with conflict detection
- 🏥 **Multi-role Access** - Customized views for doctors, nurses, and administrators
- 📈 **Advanced Analytics** - Detailed reports on room utilization and resource optimization

---

## ✨ Features

### For Hospital Administrators
- **Complete Dashboard Overview** - Real-time visualization of all 20+ operating rooms
- **Cost Breakdown Analysis** - Detailed cost tracking per operation with equipment depreciation, materials, and labor costs
- **Resource Optimization** - Identify bottlenecks and optimize room scheduling
- **KPI Monitoring** - Track key performance indicators and utilization metrics

### For Medical Staff
- **Patient Management** - Comprehensive patient records with medical history
- **Operation Scheduling** - Calendar view with drag-and-drop scheduling
- **Perioperative Protocols** - Digital forms for pre/during/post-operative documentation
- **Equipment Tracking** - Monitor equipment usage, maintenance, and lifecycle

### For Nurses
- **Room Preparation** - Checklists for room setup and sterilization
- **Inventory Management** - Track materials and supplies with EAN-13 barcode support
- **Real-time Updates** - Live notifications for operation status changes

---

## 🛠 Tech Stack

### Backend
- **Framework**: Django 5.0 with Django REST Framework
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **FHIR Server**: InterSystems IRIS Health Community Edition
- **Task Queue**: Celery with Redis broker
- **Architecture**: Modular Monolith (easily scalable to microservices)

### Frontend
- **Framework**: Next.js 14 (React 18)
- **Styling**: Tailwind CSS 3
- **UI Components**: Headless UI, Material-UI
- **Charts**: Recharts, FullCalendar
- **State Management**: React Query (TanStack Query)
- **Real-time**: Socket.io

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Web Server**: Nginx (production)
- **Static Files**: WhiteNoise
- **CORS**: django-cors-headers

---

## 🚀 Getting Started

### Prerequisites

- Docker & Docker Compose
- Git
- (Optional) Node.js 18+ and Python 3.11+ for local development

### Quick Start with Docker

1. **Clone the repository**
   ```bash
   git clone https://github.com/Plokar/HackJakBrno.git
   cd medichub
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the development environment**
   ```bash
   docker-compose -f docker-compose.dev.yml up --build
   ```

4. **Initialize the database**
   ```bash
   docker-compose -f docker-compose.dev.yml exec backend python manage.py migrate
   docker-compose -f docker-compose.dev.yml exec backend python manage.py createsuperuser
   ```

5. **Load sample data (optional)**
   ```bash
   docker-compose -f docker-compose.dev.yml exec backend python manage.py generate_fhir_data --load-synthea
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000/api
   - Admin Panel: http://localhost:8000/admin
   - FHIR Server: http://localhost:32783/fhir/r4

---

## 📐 Architecture

### Modular Monolith Design

The backend is structured as a modular monolith, allowing for easy migration to microservices in the future:

```
backend/
├── apps/                    # Domain modules (bounded contexts)
│   ├── operating_rooms/     # Core operating room management
│   ├── authentication/      # User authentication & authorization
│   └── items/              # Generic items module
├── services/                # Business logic layer
│   ├── fhir_service.py     # FHIR server integration
│   ├── fhir_mappers.py     # Django ↔ FHIR mappings
│   ├── nis_integration.py  # Hospital system integration
│   └── caching_service.py  # FHIR data caching
├── core/                    # Shared utilities
└── config/                  # Django configuration
```

### FHIR Integration Architecture

All core entities synchronize with the FHIR server:
- **Patient** → FHIR Patient resource
- **Doctor** → FHIR Practitioner resource
- **OperatingRoom** → FHIR Location resource
- **Operation** → FHIR Procedure resource
- **Equipment** → FHIR Device resource
- **Material** → FHIR SupplyDelivery resource

### Data Flow

```
┌─────────────┐      ┌──────────────┐      ┌──────────────┐
│   Next.js   │ ←──→ │    Django    │ ←──→ │ IRIS FHIR    │
│   Frontend  │      │   REST API   │      │   Server     │
└─────────────┘      └──────────────┘      └──────────────┘
                             ↕
                     ┌──────────────┐
                     │  PostgreSQL  │
                     │   Database   │
                     └──────────────┘
```

---

## 📡 API Documentation

### Core Endpoints

#### Operating Rooms
```
GET    /api/operating-rooms/          # List all operating rooms
POST   /api/operating-rooms/          # Create new room
GET    /api/operating-rooms/{id}/     # Get room details
PUT    /api/operating-rooms/{id}/     # Update room
DELETE /api/operating-rooms/{id}/     # Delete room
```

#### Operations
```
GET    /api/operations/               # List operations
POST   /api/operations/               # Schedule new operation
GET    /api/operations/{id}/          # Operation details
GET    /api/operations/{id}/costs/    # Cost breakdown
```

#### FHIR Integration
```
GET    /api/operating-rooms/fhir/patients/search/         # Search FHIR patients
POST   /api/operating-rooms/fhir/patients/generate/       # Generate test data
POST   /api/operating-rooms/fhir/patients/sync_from_fhir/ # Sync from FHIR
POST   /api/operating-rooms/fhir/patients/{id}/sync_to_fhir/ # Sync to FHIR
GET    /api/operating-rooms/fhir/server/                  # FHIR server status
```

#### Dashboard
```
GET    /api/medic/dashboard/stats/    # Real-time dashboard statistics
GET    /api/medic/rooms/{id}/status/  # Individual room status
```

---

## 🔧 Development

### Local Development (without Docker)

#### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements-dev.txt
python manage.py migrate
python manage.py runserver
```

#### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Running Tests

```bash
# Backend tests
docker-compose -f docker-compose.dev.yml exec backend pytest

# Frontend tests (if configured)
cd frontend
npm test
```

### Code Quality

```bash
# Backend linting
cd backend
flake8 .
black .

# Frontend linting
cd frontend
npm run lint
```

---

## 🌟 Advanced Features

### FHIR Extensions

Custom extensions for hospital-specific data:
- `procedure-cost-breakdown` - Detailed operation cost tracking
- `device-cost` - Equipment purchase price
- `device-lifetime-hours` - Equipment expected lifetime
- `device-used-hours` - Equipment usage tracking
- `material-unit-price` - Material cost per unit
- `doctor-hourly-rate` - Practitioner hourly rate

### Equipment Lifecycle Management

Automatic tracking of:
- Purchase price and acquisition date
- Expected lifetime in hours
- Current usage hours
- Calculated depreciation per hour
- Remaining lifetime percentage

### EAN-13 Barcode Support

Materials can be tracked with EAN-13 barcodes for:
- Inventory management
- Quick material lookup
- Supply chain integration

---

## 📊 Data Model

### Core Entities

- **OperatingRoom** - Operating room details with capacity and status
- **Patient** - Patient demographic and medical history
- **Doctor** - Practitioner information and specializations
- **Operation** - Scheduled procedures with assigned resources
- **Equipment** - Medical devices with lifecycle tracking
- **Material** - Consumables and supplies
- **PerioperativeProtocol** - Pre/intra/post-operative documentation

### Relationships

- Operations are performed in OperatingRooms by Doctors on Patients
- Equipment and Materials are consumed during Operations
- PerioperativeProtocols document each Operation phase
- All entities sync bidirectionally with FHIR server

---

## 🔐 Security

- **Authentication**: JWT-based authentication with refresh tokens
- **Authorization**: Role-based access control (RBAC)
- **GDPR Compliance**: Data anonymization and audit logging
- **FHIR Security**: OAuth2 integration ready
- **API Security**: CORS configuration, rate limiting

---

## 📝 Environment Variables

Create a `.env` file in the root directory:

```env
# Django
DJANGO_SECRET_KEY=your-secret-key-here
DJANGO_DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
POSTGRES_DB=medichub
POSTGRES_USER=medichub_user
POSTGRES_PASSWORD=secure_password

# FHIR Server
FHIR_SERVER_URL=http://fhir-server:52773/fhir/r4
IRIS_USERNAME=SuperUser
IRIS_PASSWORD=SYS

# Redis
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

## 🙏 Acknowledgments

- Built for Fakultní nemocnice u svaté Anny v Brně (St. Anne's University Hospital Brno)
- FHIR integration powered by [InterSystems IRIS Health](https://www.intersystems.com/products/intersystems-iris-for-health/)
- Test data generated with [Synthea™](https://synthetichealth.github.io/synthea/)


<p align="center">Made with ❤️ for healthcare professionals</p>
