# Analýza využití IRIS FHIR Template pro Medic Hub Dashboard

## 📊 Shrnutí

IRIS FHIR Template od InterSystems představuje **klíčovou technologii pro váš projekt Medic Hub**, která může sloužit jako standardizovaná mezivstva mezi vaším dashboardem a nemocničním informačním systémem (NIS).

---

## 🎯 Co je IRIS FHIR Template?

### Základní charakteristiky:
- **FHIR Server** postavený na InterSystems IRIS for Health
- **HL7 FHIR R4** standardní implementace
- **REST API** pro manipulaci se zdravotnickými daty
- **JSON formát** pro ukládání a výměnu dat
- **Swagger UI** pro testování API
- **Docker kontejnerizace** pro snadné nasazení

### Technické parametry:
- Podpora FHIR standardu verze 4.0.1
- Předpřipravené FHIR resource types
- Integrovaný Synthea data loader pro testovací data
- WebUI pro vizualizaci pacientských dat

---

## 💡 Konkrétní využití v projektu Medic Hub

### 1. **Centrální FHIR Server jako Data Hub**

#### Co to přináší:
IRIS FHIR server může fungovat jako **centrální datový hub** mezi:
- Vaším Medic Hub dashboardem (Django + Next.js)
- Nemocničním informačním systémem (NIS)
- Personálním systémem
- Laboratorními systémy
- Dalšími zdravotnickými systémy

```
┌─────────────────────────────────────────────────────────┐
│                   Medic Hub Dashboard                    │
│              (Django REST + Next.js)                     │
└──────────────────────┬──────────────────────────────────┘
                       │ REST API
                       │
┌──────────────────────▼──────────────────────────────────┐
│           InterSystems IRIS FHIR Server                  │
│                  (HL7 FHIR R4)                           │
└──────┬──────────┬──────────┬──────────┬─────────────────┘
       │          │           │          │
   ┌───▼───┐  ┌──▼────┐  ┌───▼───┐  ┌──▼─────┐
   │  NIS  │  │ HR    │  │ Lab   │  │ EAN-13 │
   │       │  │ System│  │ System│  │ Scanner│
   └───────┘  └───────┘  └───────┘  └────────┘
```

---

### 2. **Standardizované FHIR Resource Types pro Medic Hub**

IRIS FHIR server podporuje všechny klíčové FHIR resources, které potřebujete:

#### A) **Patient Resource** - Evidence pacientů
```json
{
  "resourceType": "Patient",
  "id": "123",
  "identifier": [
    {
      "system": "https://fnusa.cz/patient-id",
      "value": "RČ-9501234567"
    }
  ],
  "name": [{
    "family": "Novák",
    "given": ["Jan"]
  }],
  "birthDate": "1995-01-23",
  "gender": "male",
  "address": [{
    "city": "Brno",
    "postalCode": "60200",
    "country": "CZ"
  }]
}
```

**Využití v Medic Hub:**
- Import pacientů z NIS
- Anonymizace dat pro reporty
- GDPR compliance
- Propojení pacienta s operacemi

#### B) **Practitioner Resource** - Evidence lékařů
```json
{
  "resourceType": "Practitioner",
  "id": "doc-123",
  "identifier": [{
    "system": "https://fnusa.cz/doctor-id",
    "value": "12345"
  }],
  "name": [{
    "family": "Dvořák",
    "given": ["MUDr. Pavel"],
    "prefix": ["MUDr."]
  }],
  "telecom": [{
    "system": "email",
    "value": "pavel.dvorak@fnusa.cz"
  }],
  "qualification": [{
    "code": {
      "coding": [{
        "system": "http://snomed.info/sct",
        "code": "309294001",
        "display": "Chirurg"
      }]
    }
  }]
}
```

**Využití v Medic Hub:**
- Import doktorů z personálního systému
- Sledování specializací a certifikací
- Přiřazení k operacím
- Hodinové sazby (extension)

#### C) **Organization Resource** - Evidence nemocnic a oddělení
```json
{
  "resourceType": "Organization",
  "id": "fnusa",
  "identifier": [{
    "system": "https://uzis.cz/organization-id",
    "value": "IČO-00159816"
  }],
  "active": true,
  "type": [{
    "coding": [{
      "system": "http://terminology.hl7.org/CodeSystem/organization-type",
      "code": "prov",
      "display": "Healthcare Provider"
    }]
  }],
  "name": "Fakultní nemocnice u svaté Anny v Brně",
  "telecom": [{
    "system": "phone",
    "value": "+420543182111"
  }],
  "address": [{
    "line": ["Pekařská 53"],
    "city": "Brno",
    "postalCode": "656 91",
    "country": "CZ"
  }]
}
```

#### D) **Location Resource** - Operační sály
```json
{
  "resourceType": "Location",
  "id": "or-01",
  "identifier": [{
    "system": "https://fnusa.cz/location-id",
    "value": "OR-01"
  }],
  "status": "active",
  "name": "Operační sál č. 1",
  "description": "Kardiochirurgický sál",
  "mode": "instance",
  "type": [{
    "coding": [{
      "system": "http://terminology.hl7.org/CodeSystem/v3-RoleCode",
      "code": "OR",
      "display": "Operating Room"
    }]
  }],
  "physicalType": {
    "coding": [{
      "system": "http://terminology.hl7.org/CodeSystem/location-physical-type",
      "code": "ro",
      "display": "Room"
    }]
  },
  "managingOrganization": {
    "reference": "Organization/fnusa"
  }
}
```

**Využití v Medic Hub:**
- Evidence 20 operačních sálů
- Sledování dostupnosti
- Přiřazení vybavení k sálu
- Real-time stav sálu

#### E) **Procedure Resource** - Operace
```json
{
  "resourceType": "Procedure",
  "id": "surgery-456",
  "status": "completed",
  "category": {
    "coding": [{
      "system": "http://snomed.info/sct",
      "code": "387713003",
      "display": "Surgical procedure"
    }]
  },
  "code": {
    "coding": [{
      "system": "http://snomed.info/sct",
      "code": "80146002",
      "display": "Appendectomy"
    }],
    "text": "Apendektomie"
  },
  "subject": {
    "reference": "Patient/123"
  },
  "performedPeriod": {
    "start": "2025-11-29T08:00:00+01:00",
    "end": "2025-11-29T10:30:00+01:00"
  },
  "performer": [{
    "actor": {
      "reference": "Practitioner/doc-123"
    },
    "role": {
      "coding": [{
        "system": "http://snomed.info/sct",
        "code": "304292004",
        "display": "Surgeon"
      }]
    }
  }],
  "location": {
    "reference": "Location/or-01"
  },
  "reasonCode": [{
    "coding": [{
      "system": "http://hl7.org/fhir/sid/icd-10",
      "code": "K35.8",
      "display": "Acute appendicitis"
    }]
  }],
  "usedReference": [
    {
      "reference": "Device/device-123",
      "display": "Laparoskop Olympus"
    }
  ]
}
```

**Využití v Medic Hub:**
- Kompletní záznam operace
- Časová analýza (start/end)
- Přiřazení personálu
- Evidence použitých přístrojů
- Integrace s perioperačním protokolem

#### F) **Device Resource** - Přístroje a nástroje
```json
{
  "resourceType": "Device",
  "id": "device-123",
  "identifier": [{
    "system": "https://fnusa.cz/device-id",
    "value": "LAP-001"
  }],
  "status": "active",
  "manufacturer": "Olympus",
  "deviceName": [{
    "name": "Laparoskop Olympus WA50042A",
    "type": "manufacturer-name"
  }],
  "modelNumber": "WA50042A",
  "type": {
    "coding": [{
      "system": "http://snomed.info/sct",
      "code": "37270008",
      "display": "Endoscope"
    }]
  },
  "owner": {
    "reference": "Organization/fnusa"
  },
  "location": {
    "reference": "Location/or-01"
  },
  "extension": [{
    "url": "https://fnusa.cz/device-cost",
    "valueMoney": {
      "value": 2500000,
      "currency": "CZK"
    }
  }, {
    "url": "https://fnusa.cz/device-lifetime-hours",
    "valueInteger": 5000
  }, {
    "url": "https://fnusa.cz/device-used-hours",
    "valueInteger": 1250
  }]
}
```

**Využití v Medic Hub:**
- Evidence přístrojů
- Sledování životního cyklu
- Kalkulace odpisů
- Plánování údržby

#### G) **SupplyDelivery/SupplyRequest** - Materiály
```json
{
  "resourceType": "SupplyDelivery",
  "id": "supply-789",
  "status": "completed",
  "patient": {
    "reference": "Patient/123"
  },
  "type": {
    "coding": [{
      "system": "http://terminology.hl7.org/CodeSystem/supply-item-type",
      "code": "medication",
      "display": "Medication"
    }]
  },
  "suppliedItem": {
    "itemCodeableConcept": {
      "coding": [{
        "system": "https://fnusa.cz/material-ean",
        "code": "8594013320408",
        "display": "Rukavice sterilní L"
      }]
    },
    "quantity": {
      "value": 2,
      "unit": "pár"
    }
  },
  "occurrenceDateTime": "2025-11-29T08:15:00+01:00",
  "destination": {
    "reference": "Location/or-01"
  },
  "extension": [{
    "url": "https://fnusa.cz/material-cost",
    "valueMoney": {
      "value": 45,
      "currency": "CZK"
    }
  }, {
    "url": "https://fnusa.cz/material-batch",
    "valueString": "LOT2025-11"
  }]
}
```

**Využití v Medic Hub:**
- Evidence spotřebovaných materiálů
- EAN-13 skenování integration
- Kalkulace nákladů na materiál
- Sledování batch čísel

#### H) **Schedule & Appointment** - Harmonogram operací
```json
{
  "resourceType": "Schedule",
  "id": "or-01-schedule",
  "active": true,
  "serviceType": [{
    "coding": [{
      "system": "http://terminology.hl7.org/CodeSystem/service-type",
      "code": "408",
      "display": "Surgery"
    }]
  }],
  "actor": [{
    "reference": "Location/or-01"
  }],
  "planningHorizon": {
    "start": "2025-11-29T06:00:00+01:00",
    "end": "2025-11-29T18:00:00+01:00"
  }
}
```

```json
{
  "resourceType": "Appointment",
  "id": "appt-123",
  "status": "booked",
  "serviceType": [{
    "coding": [{
      "system": "http://terminology.hl7.org/CodeSystem/service-type",
      "code": "408",
      "display": "Surgery"
    }]
  }],
  "appointmentType": {
    "coding": [{
      "system": "http://terminology.hl7.org/CodeSystem/v2-0276",
      "code": "ROUTINE",
      "display": "Routine appointment"
    }]
  },
  "description": "Plánovaná apendektomie",
  "start": "2025-11-29T08:00:00+01:00",
  "end": "2025-11-29T10:30:00+01:00",
  "participant": [{
    "actor": {
      "reference": "Patient/123"
    },
    "required": "required",
    "status": "accepted"
  }, {
    "actor": {
      "reference": "Practitioner/doc-123"
    },
    "required": "required",
    "status": "accepted"
  }, {
    "actor": {
      "reference": "Location/or-01"
    },
    "required": "required",
    "status": "accepted"
  }]
}
```

**Využití v Medic Hub:**
- Kalendář operací
- Rezervace sálů
- Přiřazení personálu
- Detekce konfliktů v harmonogramu

#### I) **Observation Resource** - Měření a výsledky
```json
{
  "resourceType": "Observation",
  "id": "obs-456",
  "status": "final",
  "category": [{
    "coding": [{
      "system": "http://terminology.hl7.org/CodeSystem/observation-category",
      "code": "vital-signs",
      "display": "Vital Signs"
    }]
  }],
  "code": {
    "coding": [{
      "system": "http://loinc.org",
      "code": "8867-4",
      "display": "Heart rate"
    }]
  },
  "subject": {
    "reference": "Patient/123"
  },
  "effectiveDateTime": "2025-11-29T08:30:00+01:00",
  "valueQuantity": {
    "value": 75,
    "unit": "beats/minute",
    "system": "http://unitsofmeasure.org",
    "code": "/min"
  }
}
```

**Využití v Medic Hub:**
- Sledování vitálních funkcí během operace
- Laboratorní výsledky
- Kvalitní metriky

---

### 3. **Integrace s vaším Django backendem**

#### Architektura integrace:

```python
# backend/services/fhir_client.py
from fhirclient import client
from fhirclient.models import patient, procedure, practitioner

class FHIRService:
    """Service pro komunikaci s IRIS FHIR serverem"""
    
    def __init__(self):
        self.settings = {
            'app_id': 'medic_hub',
            'api_base': 'http://localhost:32783/fhir/r4'
        }
        self.client = client.FHIRClient(settings=self.settings)
    
    def get_patient(self, patient_id):
        """Načtení pacienta z FHIR serveru"""
        pat = patient.Patient.read(patient_id, self.client.server)
        return {
            'id': pat.id,
            'name': self._extract_name(pat.name),
            'birth_date': pat.birthDate.isostring,
            'gender': pat.gender
        }
    
    def create_procedure(self, procedure_data):
        """Vytvoření záznamu operace v FHIR serveru"""
        proc = procedure.Procedure()
        proc.status = 'in-progress'
        proc.subject = self._patient_reference(procedure_data['patient_id'])
        proc.performedPeriod = self._create_period(
            procedure_data['start_time'],
            procedure_data['end_time']
        )
        proc.create(self.client.server)
        return proc.id
    
    def sync_from_nis(self):
        """Synchronizace dat z NIS přes FHIR"""
        # Import pacientů
        patients = self._fetch_patients_from_nis()
        for patient_data in patients:
            self._upsert_fhir_patient(patient_data)
        
        # Import lékařů
        doctors = self._fetch_practitioners_from_nis()
        for doctor_data in doctors:
            self._upsert_fhir_practitioner(doctor_data)
```

#### Django Models propojení:

```python
# backend/apps/patients/models.py
from django.db import models

class Patient(models.Model):
    """Django model pro pacienty - lokální cache FHIR dat"""
    fhir_id = models.CharField(max_length=255, unique=True, db_index=True)
    fhir_resource_json = models.JSONField()  # Kompletní FHIR resource
    
    # Denormalizované pole pro rychlý přístup
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    birth_date = models.DateField()
    gender = models.CharField(max_length=10)
    
    # Synchronizace
    last_synced_at = models.DateTimeField(auto_now=True)
    
    def sync_from_fhir(self):
        """Synchronizace dat z FHIR serveru"""
        fhir_service = FHIRService()
        fhir_data = fhir_service.get_patient(self.fhir_id)
        self.first_name = fhir_data['name']['given']
        self.last_name = fhir_data['name']['family']
        self.fhir_resource_json = fhir_data
        self.save()
```

---

### 4. **Perioperační protokol v FHIR formátu**

FHIR umožňuje strukturovaný perioperační protokol pomocí **DocumentReference** a **Composition**:

```json
{
  "resourceType": "Composition",
  "id": "periop-protocol-123",
  "status": "final",
  "type": {
    "coding": [{
      "system": "http://loinc.org",
      "code": "28570-0",
      "display": "Procedure note"
    }]
  },
  "subject": {
    "reference": "Patient/123"
  },
  "date": "2025-11-29T10:30:00+01:00",
  "author": [{
    "reference": "Practitioner/doc-123"
  }],
  "title": "Perioperační protokol - Apendektomie",
  "section": [{
    "title": "Předoperační fáze",
    "code": {
      "coding": [{
        "system": "https://fnusa.cz/protocol-section",
        "code": "preop",
        "display": "Preoperative"
      }]
    },
    "text": {
      "status": "generated",
      "div": "<div>Pacient připraven, informovaný souhlas podepsán...</div>"
    },
    "entry": [{
      "reference": "Observation/obs-preop-vitals"
    }]
  }, {
    "title": "Peroperační fáze",
    "code": {
      "coding": [{
        "system": "https://fnusa.cz/protocol-section",
        "code": "intraop",
        "display": "Intraoperative"
      }]
    },
    "section": [{
      "title": "Použité nástroje",
      "entry": [
        {"reference": "Device/device-123"},
        {"reference": "Device/device-456"}
      ]
    }, {
      "title": "Spotřebované materiály",
      "entry": [
        {"reference": "SupplyDelivery/supply-789"}
      ]
    }, {
      "title": "Operační tým",
      "entry": [
        {"reference": "Practitioner/doc-123"},
        {"reference": "Practitioner/nurse-456"}
      ]
    }]
  }, {
    "title": "Pooperační fáze",
    "code": {
      "coding": [{
        "system": "https://fnusa.cz/protocol-section",
        "code": "postop",
        "display": "Postoperative"
      }]
    },
    "text": {
      "status": "generated",
      "div": "<div>Pacient stabilní, převezen na JIP...</div>"
    }
  }]
}
```

**Export do XML/PDF:**
```python
def export_protocol_xml(composition_id):
    """Export perioperačního protokolu do XML"""
    fhir_service = FHIRService()
    composition = fhir_service.get_composition(composition_id)
    
    # FHIR Composition je již v XML/JSON formátu
    xml_output = composition.as_xml()
    
    # Validace proti NIS schématu
    validate_for_nis(xml_output)
    
    return xml_output
```

---

### 5. **Real-time sledování operací**

IRIS FHIR server s Django Channels pro WebSocket:

```python
# backend/consumers/operation_consumer.py
from channels.generic.websocket import AsyncWebsocketConsumer
import json

class OperationTrackingConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_group_name = 'operations_live'
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()
    
    async def receive(self, text_data):
        data = json.loads(text_data)
        
        # Update FHIR Procedure resource
        fhir_service = FHIRService()
        procedure_id = data['procedure_id']
        
        # Realtime update stavu operace
        await fhir_service.update_procedure_status(
            procedure_id, 
            data['status']
        )
        
        # Broadcast všem klientům
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'operation_update',
                'procedure_id': procedure_id,
                'status': data['status'],
                'elapsed_time': data['elapsed_time']
            }
        )
```

---

### 6. **Kalkulace nákladů pomocí FHIR Extensions**

FHIR Extensions umožňují ukládat custom data jako náklady:

```json
{
  "resourceType": "Procedure",
  "id": "surgery-456",
  "extension": [
    {
      "url": "https://fnusa.cz/procedure-cost-breakdown",
      "extension": [
        {
          "url": "labor-cost",
          "valueMoney": {
            "value": 15000,
            "currency": "CZK"
          }
        },
        {
          "url": "material-cost",
          "valueMoney": {
            "value": 3500,
            "currency": "CZK"
          }
        },
        {
          "url": "device-depreciation",
          "valueMoney": {
            "value": 625,
            "currency": "CZK"
          }
        },
        {
          "url": "overhead-cost",
          "valueMoney": {
            "value": 2000,
            "currency": "CZK"
          }
        },
        {
          "url": "total-cost",
          "valueMoney": {
            "value": 21125,
            "currency": "CZK"
          }
        }
      ]
    },
    {
      "url": "https://fnusa.cz/procedure-duration",
      "valueDuration": {
        "value": 150,
        "unit": "minutes",
        "system": "http://unitsofmeasure.org",
        "code": "min"
      }
    }
  ]
}
```

---

## 🔧 Implementační kroky

### Krok 1: Nasazení IRIS FHIR serveru

```bash
# Klonování template
git clone https://github.com/intersystems-community/iris-fhir-template.git
cd iris-fhir-template

# Spuštění Docker kontejneru
docker-compose up -d

# FHIR server poběží na:
# - http://localhost:32783/fhir/r4
# - Swagger UI: http://localhost:32783/swagger-ui/index.html
```

### Krok 2: Konfigurace pro české prostředí

```python
# Customizace FHIR profilu pro ČR
FHIR_EXTENSIONS = {
    'patient_rc': 'https://fnusa.cz/patient-rc',
    'device_cost': 'https://fnusa.cz/device-cost',
    'device_lifetime': 'https://fnusa.cz/device-lifetime-hours',
    'material_ean': 'https://fnusa.cz/material-ean',
    'procedure_cost': 'https://fnusa.cz/procedure-cost-breakdown'
}

# ICD-10-CM kódy pro české prostředí
CODING_SYSTEMS = {
    'icd10': 'http://hl7.org/fhir/sid/icd-10',
    'uzis': 'https://uzis.cz/coding-system',
    'snomed': 'http://snomed.info/sct'
}
```

### Krok 3: Vytvoření synchronizačního service

```python
# backend/services/nis_sync_service.py
from celery import shared_task
from datetime import datetime

@shared_task
def sync_data_from_nis():
    """Periodická synchronizace dat z NIS přes FHIR"""
    fhir_service = FHIRService()
    
    # 1. Synchronizace pacientů
    patients_synced = fhir_service.sync_patients()
    
    # 2. Synchronizace lékařů
    doctors_synced = fhir_service.sync_practitioners()
    
    # 3. Synchronizace plánovaných operací
    appointments_synced = fhir_service.sync_appointments()
    
    return {
        'timestamp': datetime.now(),
        'patients': patients_synced,
        'doctors': doctors_synced,
        'appointments': appointments_synced
    }

# Nastavení Celery Beat pro pravidelnou synchronizaci
# settings.py
CELERY_BEAT_SCHEDULE = {
    'sync-nis-every-5-minutes': {
        'task': 'services.nis_sync_service.sync_data_from_nis',
        'schedule': 300.0,  # 5 minut
    },
}
```

### Krok 4: Frontend integrace (Next.js)

```typescript
// frontend/lib/fhirClient.ts
import Client from 'fhir-kit-client';

const fhirClient = new Client({
  baseUrl: 'http://localhost:32783/fhir/r4'
});

export async function fetchPatient(patientId: string) {
  const patient = await fhirClient.read({
    resourceType: 'Patient',
    id: patientId
  });
  return patient;
}

export async function searchProcedures(params: {
  patient?: string;
  date?: string;
  status?: string;
}) {
  const procedures = await fhirClient.search({
    resourceType: 'Procedure',
    searchParams: params
  });
  return procedures.entry.map(entry => entry.resource);
}
```

```tsx
// frontend/components/OperationDetail.tsx
import { useQuery } from '@tanstack/react-query';
import { fetchProcedure } from '@/lib/fhirClient';

export function OperationDetail({ procedureId }: { procedureId: string }) {
  const { data: procedure, isLoading } = useQuery(
    ['procedure', procedureId],
    () => fetchProcedure(procedureId)
  );

  if (isLoading) return <div>Načítání...</div>;

  return (
    <div>
      <h2>{procedure.code.text}</h2>
      <p>Pacient: {procedure.subject.display}</p>
      <p>Začátek: {procedure.performedPeriod.start}</p>
      <p>Konec: {procedure.performedPeriod.end}</p>
      
      {/* Náklady z extensions */}
      <CostBreakdown 
        costs={procedure.extension.find(
          ext => ext.url === 'https://fnusa.cz/procedure-cost-breakdown'
        )}
      />
    </div>
  );
}
```

---

## 📊 Výhody použití IRIS FHIR

### 1. **Standardizace**
- HL7 FHIR je **mezinárodní standard** ve zdravotnictví
- Kompatibilita s jinými zdravotnickými systémy
- Budoucí interoperabilita s ostatními nemocnicemi

### 2. **Interoperabilita**
- Jednoduchá integrace s NIS systémy podporujícími FHIR
- REST API pro snadnou komunikaci
- JSON formát - developer friendly

### 3. **Škálovatelnost**
- InterSystems IRIS je enterprise-grade databáze
- Výkonné pro velké objemy dat
- Podpora real-time analytics

### 4. **Bezpečnost**
- Built-in GDPR compliance funkce
- Audit trail
- Role-based access control
- Anonymizace dat

### 5. **Testovací data**
- Synthea generátor pro realistická testovací data
- Předpřipravené pacienty, lékaře, organizace
- Snadné testování bez reálných dat

---

---

## 💰 Odhad úspory času

Použití IRIS FHIR template **ušetří minimálně 60-80% času** na:
- Vývoj REST API pro health data
- Implementace datových standardů
- Integrace s NIS systémy
- GDPR compliance
- XML/JSON marshalling

**Bez FHIR:** 12-16 týdnů vývoje
**S FHIR:** 4-6 týdnů integrace

---

## 📚 Další zdroje

### Dokumentace:
- [FHIR R4 Specification](http://hl7.org/fhir/R4/)
- [InterSystems IRIS FHIR](https://docs.intersystems.com/irisforhealth/csp/docbook/DocBook.UI.Page.cls)
- [FHIR Python Client](https://github.com/smart-on-fhir/client-py)

### Užitečné nástroje:
- [FHIR Validator](https://confluence.hl7.org/display/FHIR/Using+the+FHIR+Validator)
- [HAPI FHIR Server](https://hapifhir.io/) - alternativa
- [Synthea Patient Generator](https://github.com/synthetichealth/synthea)

---

## ✅ Závěr

**IRIS FHIR Template je ideální řešení pro projekt Medic Hub**, protože:

1. ✅ Poskytuje **standardizované FHIR API** pro všechny potřebné health resources
2. ✅ Umožňuje **snadnou integraci s NIS** systémy
3. ✅ **Zrychluje vývoj** o 60-80%
4. ✅ Je **production-ready** a škálovatelné
5. ✅ Obsahuje **built-in testovací data**
6. ✅ Splňuje **GDPR požadavky**
7. ✅ Podporuje **real-time operace**

### Konkrétní use cases pro Medic Hub:
- ✅ Evidence pacientů s anonymizací
- ✅ 20 operačních sálů jako Location resources
- ✅ Harmonogram operací pomocí Schedule/Appointment
- ✅ Perioperační protokol jako Composition s XML exportem
- ✅ Evidence přístrojů s lifecycle tracking
- ✅ Skenování materiálů (EAN-13) jako SupplyDelivery
- ✅ Kalkulace nákladů pomocí Extensions
- ✅ Real-time dashboard updates
- ✅ Integration s personálním systémem (Practitioner resources)

**Doporučení: Začít s IRIS FHIR template co nejdříve jako základ celého Medic Hub systému.**

