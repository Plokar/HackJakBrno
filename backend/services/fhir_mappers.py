"""
FHIR Mappers - Převod mezi Django modely a FHIR resources
"""
from datetime import datetime, date
from typing import Dict, Optional, List
import logging

logger = logging.getLogger(__name__)


def django_patient_to_fhir(patient) -> Dict:
    """
    Převede Django Patient model na FHIR Patient resource
    
    Args:
        patient: Django Patient model instance
        
    Returns:
        Dict: FHIR Patient resource
    """
    birth_date_str = patient.date_of_birth.isoformat() if patient.date_of_birth else None
    
    # Extrahovat pohlaví z rodného čísla (CZ specific)
    gender = 'unknown'
    if patient.birth_number and len(patient.birth_number) >= 10:
        month = int(patient.birth_number[2:4])
        if month > 50:
            gender = 'female'
        else:
            gender = 'male'
    
    fhir_patient = {
        "resourceType": "Patient",
        "identifier": [
            {
                "system": "https://fnusa.cz/patient-id",
                "value": str(patient.id)
            },
            {
                "system": "https://fnusa.cz/birth-number",
                "value": patient.birth_number
            }
        ],
        "name": [
            {
                "family": patient.last_name,
                "given": [patient.first_name],
                "use": "official"
            }
        ],
        "birthDate": birth_date_str,
        "gender": gender
    }
    
    # Přidat diagnosis jako extension
    if patient.diagnosis:
        fhir_patient["extension"] = [
            {
                "url": "https://fnusa.cz/patient-diagnosis",
                "valueString": patient.diagnosis
            }
        ]
    
    # Přidat medical history
    if patient.medical_history:
        if "extension" not in fhir_patient:
            fhir_patient["extension"] = []
        fhir_patient["extension"].append({
            "url": "https://fnusa.cz/patient-medical-history",
            "valueString": patient.medical_history
        })
    
    return fhir_patient


def fhir_patient_to_django(fhir_patient: Dict) -> Dict:
    """
    Převede FHIR Patient resource na Django Patient data
    
    Args:
        fhir_patient: FHIR Patient resource dict
        
    Returns:
        Dict: Data pro Django Patient model
    """
    # Extrahovat jméno
    first_name = ''
    last_name = ''
    if fhir_patient.get('name'):
        name = fhir_patient['name'][0]
        first_name = name.get('given', [''])[0] if name.get('given') else ''
        last_name = name.get('family', '')
    
    # Extrahovat rodné číslo
    birth_number = None
    for identifier in fhir_patient.get('identifier', []):
        if identifier.get('system') == 'https://fnusa.cz/birth-number':
            value = identifier.get('value', '').strip()
            birth_number = value if value else None
            break
    
    # Extrahovat datum narození
    birth_date = None
    if fhir_patient.get('birthDate'):
        birth_date = datetime.strptime(fhir_patient['birthDate'], '%Y-%m-%d').date()
    
    # Extrahovat diagnosis z extensions
    diagnosis = ''
    medical_history = ''
    for ext in fhir_patient.get('extension', []):
        if ext.get('url') == 'https://fnusa.cz/patient-diagnosis':
            diagnosis = ext.get('valueString', '')
        elif ext.get('url') == 'https://fnusa.cz/patient-medical-history':
            medical_history = ext.get('valueString', '')
    
    return {
        'first_name': first_name,
        'last_name': last_name,
        'birth_number': birth_number,
        'date_of_birth': birth_date,
        'diagnosis': diagnosis,
        'medical_history': medical_history,
        'fhir_id': fhir_patient.get('id'),
        'fhir_resource_json': fhir_patient
    }


def django_doctor_to_fhir(doctor) -> Dict:
    """
    Převede Django Doctor model na FHIR Practitioner resource
    """
    fhir_practitioner = {
        "resourceType": "Practitioner",
        "identifier": [
            {
                "system": "https://fnusa.cz/doctor-id",
                "value": str(doctor.id)
            },
            {
                "system": "https://fnusa.cz/license-number",
                "value": doctor.license_number
            }
        ],
        "active": doctor.is_active,
        "name": [
            {
                "family": doctor.last_name,
                "given": [doctor.first_name],
                "prefix": ["MUDr."],
                "use": "official"
            }
        ],
        "qualification": [
            {
                "code": {
                    "coding": [
                        {
                            "system": "https://fnusa.cz/specialization",
                            "code": doctor.specialization,
                            "display": doctor.specialization
                        }
                    ],
                    "text": doctor.specialization
                }
            }
        ],
        "extension": [
            {
                "url": "https://fnusa.cz/doctor-hourly-rate",
                "valueMoney": {
                    "value": float(doctor.hourly_rate),
                    "currency": "CZK"
                }
            }
        ]
    }
    
    return fhir_practitioner


def fhir_practitioner_to_django(fhir_practitioner: Dict) -> Dict:
    """Převede FHIR Practitioner resource na Django Doctor data"""
    # Extrahovat jméno
    first_name = ''
    last_name = ''
    if fhir_practitioner.get('name'):
        name = fhir_practitioner['name'][0]
        first_name = name.get('given', [''])[0] if name.get('given') else ''
        last_name = name.get('family', '')
    
    # Extrahovat license number
    license_number = None
    for identifier in fhir_practitioner.get('identifier', []):
        if identifier.get('system') == 'https://fnusa.cz/license-number':
            value = identifier.get('value', '').strip()
            license_number = value if value else None
            break
    
    # Extrahovat specializaci
    specialization = ''
    if fhir_practitioner.get('qualification'):
        qual = fhir_practitioner['qualification'][0]
        specialization = qual.get('code', {}).get('text', '')
    
    # Extrahovat hodinovou sazbu
    hourly_rate = 0
    for ext in fhir_practitioner.get('extension', []):
        if ext.get('url') == 'https://fnusa.cz/doctor-hourly-rate':
            hourly_rate = ext.get('valueMoney', {}).get('value', 0)
    
    return {
        'first_name': first_name,
        'last_name': last_name,
        'license_number': license_number,
        'specialization': specialization,
        'hourly_rate': hourly_rate,
        'is_active': fhir_practitioner.get('active', True),
        'fhir_id': fhir_practitioner.get('id'),
        'fhir_resource_json': fhir_practitioner
    }


def django_room_to_fhir(room) -> Dict:
    """Převede Django OperatingRoom model na FHIR Location resource"""
    fhir_location = {
        "resourceType": "Location",
        "identifier": [
            {
                "system": "https://fnusa.cz/location-id",
                "value": str(room.id)
            },
            {
                "system": "https://fnusa.cz/room-number",
                "value": room.room_number
            }
        ],
        "status": "active" if room.is_active else "inactive",
        "name": room.name,
        "description": f"Operační sál číslo {room.room_number}, {room.floor}. patro",
        "mode": "instance",
        "type": [
            {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/v3-RoleCode",
                        "code": "OR",
                        "display": "Operating Room"
                    }
                ]
            }
        ],
        "physicalType": {
            "coding": [
                {
                    "system": "http://terminology.hl7.org/CodeSystem/location-physical-type",
                    "code": "ro",
                    "display": "Room"
                }
            ]
        },
        "extension": [
            {
                "url": "https://fnusa.cz/location-floor",
                "valueInteger": room.floor
            },
            {
                "url": "https://fnusa.cz/location-capacity",
                "valueInteger": room.capacity
            }
        ]
    }
    
    return fhir_location


def fhir_location_to_django(fhir_location: Dict) -> Dict:
    """Převede FHIR Location resource na Django OperatingRoom data"""
    # Extrahovat room number
    room_number = ''
    for identifier in fhir_location.get('identifier', []):
        if identifier.get('system') == 'https://fnusa.cz/room-number':
            room_number = identifier.get('value', '')
            break
    
    # Extrahovat floor a capacity z extensions
    floor = 1
    capacity = 1
    for ext in fhir_location.get('extension', []):
        if ext.get('url') == 'https://fnusa.cz/location-floor':
            floor = ext.get('valueInteger', 1)
        elif ext.get('url') == 'https://fnusa.cz/location-capacity':
            capacity = ext.get('valueInteger', 1)
    
    return {
        'name': fhir_location.get('name', ''),
        'room_number': room_number,
        'floor': floor,
        'capacity': capacity,
        'is_active': fhir_location.get('status') == 'active',
        'fhir_id': fhir_location.get('id'),
        'fhir_resource_json': fhir_location
    }


def django_operation_to_fhir(operation) -> Dict:
    """Převede Django Operation model na FHIR Procedure resource"""
    # Status mapping
    status_map = {
        'draft': 'preparation',
        'pending_approval': 'preparation',
        'approved': 'preparation',
        'scheduled': 'preparation',
        'in_progress': 'in-progress',
        'completed': 'completed',
        'cancelled': 'stopped'
    }
    
    fhir_procedure = {
        "resourceType": "Procedure",
        "status": status_map.get(operation.status, 'preparation'),
        "code": {
            "text": operation.operation_type
        }
    }
    
    # Patient reference
    if operation.patient and operation.patient.fhir_id:
        fhir_procedure["subject"] = {
            "reference": f"Patient/{operation.patient.fhir_id}"
        }
    
    # Time period
    if operation.actual_start and operation.actual_end:
        fhir_procedure["performedPeriod"] = {
            "start": operation.actual_start.isoformat(),
            "end": operation.actual_end.isoformat()
        }
    elif operation.scheduled_start and operation.scheduled_end:
        fhir_procedure["performedPeriod"] = {
            "start": operation.scheduled_start.isoformat(),
            "end": operation.scheduled_end.isoformat()
        }
    
    # Doctor/performer
    if operation.primary_doctor and operation.primary_doctor.fhir_id:
        fhir_procedure["performer"] = [
            {
                "actor": {
                    "reference": f"Practitioner/{operation.primary_doctor.fhir_id}"
                },
                "function": {
                    "coding": [
                        {
                            "system": "http://snomed.info/sct",
                            "code": "304292004",
                            "display": "Surgeon"
                        }
                    ]
                }
            }
        ]
    
    # Location (operating room)
    if operation.operating_room and operation.operating_room.fhir_id:
        fhir_procedure["location"] = {
            "reference": f"Location/{operation.operating_room.fhir_id}"
        }
    
    # Notes
    if operation.notes:
        fhir_procedure["note"] = [
            {
                "text": operation.notes
            }
        ]
    
    # Emergency flag
    if operation.is_emergency:
        fhir_procedure["extension"] = [
            {
                "url": "https://fnusa.cz/procedure-emergency",
                "valueBoolean": True
            }
        ]
    
    return fhir_procedure


def django_equipment_to_fhir(equipment) -> Dict:
    """Převede Django Equipment model na FHIR Device resource"""
    fhir_device = {
        "resourceType": "Device",
        "identifier": [
            {
                "system": "https://fnusa.cz/device-id",
                "value": str(equipment.id)
            },
            {
                "system": "https://fnusa.cz/equipment-code",
                "value": equipment.equipment_code
            }
        ],
        "status": "active" if equipment.is_operational else "inactive",
        "deviceName": [
            {
                "name": equipment.name,
                "type": "user-friendly-name"
            }
        ],
        "type": {
            "text": equipment.category
        },
        "extension": [
            {
                "url": "https://fnusa.cz/device-cost",
                "valueMoney": {
                    "value": float(equipment.purchase_price),
                    "currency": "CZK"
                }
            },
            {
                "url": "https://fnusa.cz/device-lifetime-hours",
                "valueInteger": equipment.lifetime_hours
            },
            {
                "url": "https://fnusa.cz/device-used-hours",
                "valueInteger": equipment.used_hours
            },
            {
                "url": "https://fnusa.cz/device-purchase-date",
                "valueDate": equipment.purchase_date.isoformat()
            }
        ]
    }
    
    if equipment.maintenance_date:
        fhir_device["extension"].append({
            "url": "https://fnusa.cz/device-maintenance-date",
            "valueDate": equipment.maintenance_date.isoformat()
        })
    
    return fhir_device


def django_material_to_fhir_supply(material) -> Dict:
    """Převede Django Material model na FHIR SupplyRequest/SupplyDelivery resource"""
    # Pro materiál používáme SupplyRequest jako katalogovou položku
    fhir_supply = {
        "resourceType": "SupplyRequest",
        "status": "active",
        "category": {
            "coding": [
                {
                    "system": "http://terminology.hl7.org/CodeSystem/supply-kind",
                    "code": "device" if not material.is_disposable else "central",
                    "display": material.category
                }
            ]
        },
        "itemCodeableConcept": {
            "coding": [
                {
                    "system": "https://fnusa.cz/material-ean",
                    "code": material.ean_code,
                    "display": material.name
                }
            ]
        },
        "quantity": {
            "value": material.stock_quantity,
            "unit": material.unit
        },
        "extension": [
            {
                "url": "https://fnusa.cz/material-unit-price",
                "valueMoney": {
                    "value": float(material.unit_price),
                    "currency": "CZK"
                }
            },
            {
                "url": "https://fnusa.cz/material-minimum-stock",
                "valueInteger": material.minimum_stock
            },
            {
                "url": "https://fnusa.cz/material-disposable",
                "valueBoolean": material.is_disposable
            }
        ]
    }
    
    return fhir_supply

