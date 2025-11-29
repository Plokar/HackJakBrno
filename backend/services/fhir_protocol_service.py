"""
FHIR Perioperative Protocol Service - Generování FHIR Composition z perioperačního protokolu
"""
from typing import Dict, List
from datetime import datetime
import logging

from services.fhir_service import FHIRService

logger = logging.getLogger(__name__)


class FHIRProtocolService:
    """Service pro práci s perioperačními protokoly jako FHIR Composition"""
    
    def __init__(self):
        self.fhir_service = FHIRService()
    
    def create_perioperative_composition(self, protocol) -> Dict:
        """
        Vytvoří FHIR Composition resource z PerioperativeProtocol modelu
        
        Args:
            protocol: PerioperativeProtocol model instance
            
        Returns:
            Dict: FHIR Composition resource
        """
        operation = protocol.operation
        
        composition = {
            "resourceType": "Composition",
            "status": "final",
            "type": {
                "coding": [{
                    "system": "http://loinc.org",
                    "code": "28570-0",
                    "display": "Procedure note"
                }],
                "text": "Perioperační protokol"
            },
            "date": datetime.now().isoformat(),
            "title": f"Perioperační protokol - {operation.operation_type}",
            "section": []
        }
        
        # Subject - pacient
        if operation.patient and operation.patient.fhir_id:
            composition["subject"] = {
                "reference": f"Patient/{operation.patient.fhir_id}",
                "display": str(operation.patient)
            }
        
        # Author - primární doktor
        if operation.primary_doctor and operation.primary_doctor.fhir_id:
            composition["author"] = [{
                "reference": f"Practitioner/{operation.primary_doctor.fhir_id}",
                "display": str(operation.primary_doctor)
            }]
        
        # Encounter - reference na operaci (Procedure)
        if operation.fhir_id:
            composition["encounter"] = {
                "reference": f"Procedure/{operation.fhir_id}"
            }
        
        # 1. Předoperační fáze
        preop_section = {
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
                "div": f"<div xmlns='http://www.w3.org/1999/xhtml'><p>Typ anestezie: {protocol.anesthesia_type}</p></div>"
            }
        }
        composition["section"].append(preop_section)
        
        # 2. Peroperační fáze
        intraop_section = {
            "title": "Peroperační fáze",
            "code": {
                "coding": [{
                    "system": "https://fnusa.cz/protocol-section",
                    "code": "intraop",
                    "display": "Intraoperative"
                }]
            },
            "text": {
                "status": "generated",
                "div": f"<div xmlns='http://www.w3.org/1999/xhtml'><p>{protocol.procedure_notes}</p></div>"
            },
            "section": []
        }
        
        # 2a. Použité přístroje
        equipment_entries = []
        for equipment_usage in protocol.equipmentusage_set.all():
            if equipment_usage.equipment.fhir_id:
                equipment_entries.append({
                    "reference": f"Device/{equipment_usage.equipment.fhir_id}",
                    "display": f"{equipment_usage.equipment.name} ({equipment_usage.hours_used}h)"
                })
        
        if equipment_entries:
            intraop_section["section"].append({
                "title": "Použité přístroje",
                "code": {
                    "coding": [{
                        "system": "https://fnusa.cz/protocol-section",
                        "code": "devices",
                        "display": "Devices Used"
                    }]
                },
                "entry": equipment_entries
            })
        
        # 2b. Spotřebované materiály
        material_entries = []
        for material_usage in protocol.materialusage_set.all():
            # Pro materiály vytvoříme SupplyDelivery resource
            supply_delivery = self._create_supply_delivery(material_usage, operation)
            if supply_delivery:
                material_entries.append({
                    "reference": f"SupplyDelivery/{supply_delivery.get('id')}",
                    "display": f"{material_usage.material.name} ({material_usage.quantity_used} {material_usage.material.unit})"
                })
        
        if material_entries:
            intraop_section["section"].append({
                "title": "Spotřebované materiály",
                "code": {
                    "coding": [{
                        "system": "https://fnusa.cz/protocol-section",
                        "code": "materials",
                        "display": "Materials Used"
                    }]
                },
                "entry": material_entries
            })
        
        # 2c. Operační tým
        team_entries = []
        if operation.primary_doctor and operation.primary_doctor.fhir_id:
            team_entries.append({
                "reference": f"Practitioner/{operation.primary_doctor.fhir_id}",
                "display": f"{operation.primary_doctor} (Primární chirurg)"
            })
        
        for doctor in operation.assisting_doctors.all():
            if doctor.fhir_id:
                team_entries.append({
                    "reference": f"Practitioner/{doctor.fhir_id}",
                    "display": f"{doctor} (Asistent)"
                })
        
        if team_entries:
            intraop_section["section"].append({
                "title": "Operační tým",
                "code": {
                    "coding": [{
                        "system": "https://fnusa.cz/protocol-section",
                        "code": "team",
                        "display": "Surgical Team"
                    }]
                },
                "entry": team_entries
            })
        
        composition["section"].append(intraop_section)
        
        # 3. Pooperační fáze
        postop_section = {
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
                "div": f"<div xmlns='http://www.w3.org/1999/xhtml'><p>Komplikace: {protocol.complications or 'Žádné'}</p></div>"
            }
        }
        composition["section"].append(postop_section)
        
        # 4. Náklady (jako extension na composition)
        composition["extension"] = [
            {
                "url": "https://fnusa.cz/protocol-cost-breakdown",
                "extension": [
                    {
                        "url": "staff-cost",
                        "valueMoney": {
                            "value": float(protocol.total_staff_cost),
                            "currency": "CZK"
                        }
                    },
                    {
                        "url": "equipment-cost",
                        "valueMoney": {
                            "value": float(protocol.total_equipment_cost),
                            "currency": "CZK"
                        }
                    },
                    {
                        "url": "material-cost",
                        "valueMoney": {
                            "value": float(protocol.total_material_cost),
                            "currency": "CZK"
                        }
                    },
                    {
                        "url": "total-cost",
                        "valueMoney": {
                            "value": float(protocol.total_cost),
                            "currency": "CZK"
                        }
                    }
                ]
            }
        ]
        
        return composition
    
    def _create_supply_delivery(self, material_usage, operation) -> Dict:
        """Vytvoří FHIR SupplyDelivery resource pro použitý materiál"""
        supply_delivery = {
            "resourceType": "SupplyDelivery",
            "status": "completed",
            "type": {
                "coding": [{
                    "system": "http://terminology.hl7.org/CodeSystem/supply-item-type",
                    "code": "device",
                    "display": "Medical Device"
                }]
            },
            "suppliedItem": {
                "itemCodeableConcept": {
                    "coding": [{
                        "system": "https://fnusa.cz/material-ean",
                        "code": material_usage.material.ean_code,
                        "display": material_usage.material.name
                    }]
                },
                "quantity": {
                    "value": material_usage.quantity_used,
                    "unit": material_usage.material.unit
                }
            },
            "occurrenceDateTime": material_usage.scanned_at.isoformat(),
            "extension": [
                {
                    "url": "https://fnusa.cz/material-cost",
                    "valueMoney": {
                        "value": float(material_usage.cost),
                        "currency": "CZK"
                    }
                }
            ]
        }
        
        # Patient reference
        if operation.patient and operation.patient.fhir_id:
            supply_delivery["patient"] = {
                "reference": f"Patient/{operation.patient.fhir_id}"
            }
        
        # Destination - operační sál
        if operation.operating_room and operation.operating_room.fhir_id:
            supply_delivery["destination"] = {
                "reference": f"Location/{operation.operating_room.fhir_id}"
            }
        
        # Uložit do FHIR serveru
        try:
            result = self.fhir_service.create_supply_delivery(supply_delivery)
            return result
        except Exception as e:
            logger.error(f'Error creating SupplyDelivery: {str(e)}')
            return None
    
    def export_to_xml(self, composition: Dict) -> str:
        """
        Export FHIR Composition do XML formátu
        
        Note: Pro produkční použití nainstalovat fhir.resources a použít:
        from fhir.resources.composition import Composition
        comp = Composition.parse_obj(composition)
        return comp.xml()
        """
        import json
        import xml.etree.ElementTree as ET
        
        # Vytvoření základního XML stromu
        root = ET.Element('Composition', xmlns='http://hl7.org/fhir')
        
        # Resource Type
        resource_type = ET.SubElement(root, 'resourceType')
        resource_type.set('value', composition.get('resourceType', 'Composition'))
        
        # ID
        if composition.get('id'):
            id_elem = ET.SubElement(root, 'id')
            id_elem.set('value', composition['id'])
        
        # Status
        if composition.get('status'):
            status_elem = ET.SubElement(root, 'status')
            status_elem.set('value', composition['status'])
        
        # Title
        if composition.get('title'):
            title_elem = ET.SubElement(root, 'title')
            title_elem.set('value', composition['title'])
        
        # Date
        if composition.get('date'):
            date_elem = ET.SubElement(root, 'date')
            date_elem.set('value', composition['date'])
        
        # Sections
        for section in composition.get('section', []):
            section_elem = ET.SubElement(root, 'section')
            section_title = ET.SubElement(section_elem, 'title')
            section_title.set('value', section.get('title', ''))
        
        return ET.tostring(root, encoding='unicode', method='xml')
    
    def export_to_pdf(self, composition: Dict) -> bytes:
        """
        Export FHIR Composition do PDF formátu
        
        Note: Pro produkční použití nainstalovat weasyprint nebo reportlab
        """
        try:
            from weasyprint import HTML, CSS
            from io import BytesIO
            
            # Vytvoření HTML z composition
            html_content = self._composition_to_html(composition)
            
            # CSS styling
            css_string = """
                body { font-family: Arial, sans-serif; margin: 40px; }
                h1 { color: #2c3e50; }
                h2 { color: #34495e; margin-top: 20px; }
                .section { margin-bottom: 20px; padding: 10px; border-left: 3px solid #3498db; }
                .cost-breakdown { background-color: #ecf0f1; padding: 15px; border-radius: 5px; }
            """
            
            # Generate PDF
            pdf_output = BytesIO()
            HTML(string=html_content).write_pdf(pdf_output, stylesheets=[CSS(string=css_string)])
            
            return pdf_output.getvalue()
            
        except ImportError:
            logger.warning("WeasyPrint not installed, falling back to simple text export")
            # Fallback - vrátit text verzi
            import json
            text = json.dumps(composition, indent=2, ensure_ascii=False)
            return text.encode('utf-8')
    
    def _composition_to_html(self, composition: Dict) -> str:
        """Převede FHIR Composition na HTML"""
        html_parts = ['<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>']
        
        # Title
        html_parts.append(f'<h1>{composition.get("title", "Perioperační protokol")}</h1>')
        
        # Date
        if composition.get('date'):
            html_parts.append(f'<p><strong>Datum:</strong> {composition["date"]}</p>')
        
        # Subject
        if composition.get('subject'):
            html_parts.append(f'<p><strong>Pacient:</strong> {composition["subject"].get("display", "N/A")}</p>')
        
        # Sections
        for section in composition.get('section', []):
            html_parts.append(f'<div class="section">')
            html_parts.append(f'<h2>{section.get("title", "")}</h2>')
            
            # Text
            if section.get('text', {}).get('div'):
                html_parts.append(section['text']['div'])
            
            # Entries
            if section.get('entry'):
                html_parts.append('<ul>')
                for entry in section['entry']:
                    html_parts.append(f'<li>{entry.get("display", entry.get("reference", ""))}</li>')
                html_parts.append('</ul>')
            
            # Subsections
            for subsection in section.get('section', []):
                html_parts.append(f'<h3>{subsection.get("title", "")}</h3>')
                if subsection.get('entry'):
                    html_parts.append('<ul>')
                    for entry in subsection['entry']:
                        html_parts.append(f'<li>{entry.get("display", "")}</li>')
                    html_parts.append('</ul>')
            
            html_parts.append('</div>')
        
        # Cost breakdown
        if composition.get('extension'):
            cost_ext = next(
                (ext for ext in composition['extension'] 
                 if ext.get('url') == 'https://fnusa.cz/protocol-cost-breakdown'),
                None
            )
            if cost_ext:
                html_parts.append('<div class="cost-breakdown">')
                html_parts.append('<h2>Nákladové rozpad</h2>')
                html_parts.append('<table>')
                for item in cost_ext.get('extension', []):
                    url = item.get('url', '')
                    value = item.get('valueMoney', {})
                    amount = value.get('value', 0)
                    currency = value.get('currency', 'CZK')
                    html_parts.append(f'<tr><td>{url.replace("-", " ").title()}</td><td>{amount} {currency}</td></tr>')
                html_parts.append('</table>')
                html_parts.append('</div>')
        
        html_parts.append('</body></html>')
        return ''.join(html_parts)

