# Implementační plán - Medic Hub Dashboard
## Analýza zadání a návrh řešení pro produkční systém

---

## 📋 Souhrn požadavků

Dashboard pro sledování vytížení a nákladů operačních sálů pro Fakultní nemocnice u svaté Anny v Brně s následujícími klíčovými funkcemi:

- **Automatické zpracování dat** z nemocničního informačního systému (NIS)
- **Vizualizace vytížení** 20 operačních sálů v reálném čase
- **Sledování prostojů** a počtu výkonů
- **Kalkulace nákladů** na operace (odpisy přístrojů, materiál, mzdy)
- **Optimalizace** plánování operací a využití zdrojů

---

## 🎯 Klíčové funkcionality dle uživatelských rolí

### 1. Super uživatel (Admin) - Vedoucí lékař
**Stávající:** Základní správa systému  
**Co přidat:**
- ✅ **Modul harmonogramu operací** - Kalendářní zobrazení s přehledem všech 20 sálů
- ✅ **Schvalovací workflow** - Systém pro schvalování plánovaných operací
- ✅ **Detailní evidence pacientů** - Propojení s NIS, zobrazení diagnóz a historií
- ✅ **Dashboard přehledů** - Real-time zobrazení vytížení, prostojů a KPI metrik
- ✅ **Reportovací modul** - Generování grafických výstupů a statistik
- ✅ **Konfigurace sálů** - Správa 20 operačních sálů, jejich vybavení a parametrů

### 2. Sestřička (Zdravotní personál)
**Stávající:** Základní operace  
**Co přidat:**
- ✅ **Správa personálu** - Evidence doktorů z personálního systému
- ✅ **Schedule doktorů** - Zobrazení rozpisu služeb a dostupnosti
- ✅ **Rozklikávací profily** - Detail každého doktora s hodinovou sazbou a specializací
- ✅ **Evidence nástrojů (tools)** - Správa chirurgických nástrojů a jejich dostupnosti
- ✅ **Sledování operací** - Kdo právě operuje, v jakém sále, jakou operaci
- ✅ **Perioperační protokol** - Digitální formulář pro záznam průběhu operace

### 3. Během operace
**Stávající:** Není implementováno  

### 4. Po operaci
**Stávající:** Není implementováno  
**Co přidat:**
- ✅ **Kalkulace nákladů** - Automatický výpočet celkových nákladů na operaci:
  - Hodinové sazby lékařů a personálu
  - Spotřeba jednorázových materiálů
  - Odpisy přístrojů podle odpracovaných hodin
  - Energie a režijní náklady
- ✅ **Grafické výstupy** - Vizualizace nákladů, časové analýzy, efektivity
- ✅ **Export dat** - PDF reporty, XML export pro NIS

---

## 🏗️ Architektura systému - Co implementovat

### Backend (Django REST Framework)
**Nové moduly k vytvoření:**

#### 1. **App: `operating_schedule`** - Harmonogram operací
```
Modely:
- OperationSchedule (datum, čas, sál, status, schválení)
- ScheduleApproval (admin, timestamp, poznámky)
- TimeSlot (časové okno, dostupnost sálu)
```

#### 2. **App: `medical_staff`** - Personální systém
```
Modely:
- Doctor (jméno, specializace, hodinová sazba, certifikace)
- DoctorSchedule (rozvrh služeb, dostupnost)
- StaffAssignment (přiřazení personálu k operaci)
- JobPosition (pozice, role, oprávnění)
```

#### 3. **App: `medical_devices`** - Přístroje a nástroje
```
Modely:
- MedicalDevice (název, výrobce, cena, životnost v hodinách)
- DeviceUsage (operace, zařízení, doba použití, odpisy)
- DeviceLifecycle (tracking životního cyklu, zbývající hodiny)
- DeviceMaintenance (servisní záznamy, kalibrace)
```

#### 4. **App: `materials`** - Materiály a spotřební materiál
```
Modely:
- Material (název, EAN-13 kód, cena, kategorie)
- MaterialUsage (operace, materiál, množství, čas skenu)
- MaterialStock (skladové zásoby, min. množství, dodavatel)
- ScanLog (EAN sken, timestamp, uživatel, operace)
```

#### 5. **App: `patients`** - Evidence pacientů
```
Modely:
- Patient (jméno, datum narození, rodné číslo, pojišťovna)
- MedicalHistory (diagnózy, alergie, předchozí operace)
- PatientOperation (propojení pacienta s operací)
- Insurance (typ pojištění, pokrytí nákladů)
```

#### 6. **App: `cost_tracking`** - Sledování nákladů
```
Modely:
- OperationCost (celkové náklady, breakdown)
- LaborCost (mzdové náklady personálu)
- MaterialCost (náklady na materiály)
- DepreciationCost (odpisy přístrojů)
- OverheadCost (režijní náklady - energie, údržba)
```

#### 7. **App: `perioperative_protocol`** - Perioperační protokol
```
Modely:
- ProtocolEntry (digitální protokol operace)
- OperationPhase (předoperační, peroperační, pooperační)
- ProtocolDocument (export do XML/PDF)
- ComplianceCheck (kontrola úplnosti dat)
```

#### 8. **App: `analytics`** - Analytika a reporty
```
Modely:
- RoomUtilization (vytížení sálu, prostoje, efektivita)
- CostAnalytics (analýza nákladů, trendy)
- PerformanceMetrics (KPI metriky, benchmarking)
- CustomReport (uživatelské reporty)
```

#### 9. **App: `nis_integration`** - Integrace s NIS
```
Moduly:
- NIS API Client (propojení s nemocničním informačním systémem)
- Data Sync Service (synchronizace dat pacientů, operací)
- XML/PDF Import/Export (export perioperačních protokolů)
- Data Mapping (mapování struktur mezi systémy)
```

#### 10. **Services vrstva**
```
Nové služby:
- cost_calculation_service.py (kalkulace nákladů)
- scheduling_service.py (optimalizace harmonogramu)
- device_lifecycle_service.py (správa životního cyklu)
- scan_processing_service.py (zpracování EAN-13 skenů)
- report_generation_service.py (generování reportů)
- real_time_tracking_service.py (real-time sledování operací)
```

### Frontend (Next.js + React)

**Nové komponenty k vytvoření:**

#### 1. **Dashboard komponenty**
```
- RealTimeDashboard.js (živé sledování vytížení)
- RoomStatusGrid.js (přehled všech 20 sálů)
- UtilizationChart.js (grafy vytížení)
- CostOverview.js (přehled nákladů)
- AlertsPanel.js (upozornění na prostoje, problémy)
```

#### 2. **Kalendář a plánování**
```
- OperationCalendar.js (kalendář operací - Tailwind UI)
- ScheduleTimeline.js (časová osa dne)
- RoomBooking.js (rezervace sálu)
- ConflictResolver.js (řešení kolizí v harmonogramu)
- ApprovalWorkflow.js (schvalovací proces)
```

#### 3. **Personál**
```
- DoctorList.js (seznam doktorů)
- DoctorProfile.js (detail doktora + schedule)
- StaffSchedule.js (rozpis služeb)
- AssignStaffModal.js (přiřazení personálu k operaci)
```

#### 4. **Operace**
```
- OperationDetail.js (detail operace)
- LiveOperationTracker.js (živé sledování probíhající operace)
- MaterialScanner.js (rozhraní pro skenování EAN-13)
- DeviceUsageLog.js (evidence použitých přístrojů)
- PerioperativeForm.js (digitální protokol)
```

#### 5. **Pacienti**
```
- PatientList.js (seznam pacientů)
- PatientDetail.js (detail pacienta + anamnéza)
- MedicalHistoryView.js (zdravotní historie)
```

#### 6. **Náklady a reporty**
```
- CostBreakdown.js (rozpad nákladů operace)
- CostChart.js (grafy nákladů)
- ReportGenerator.js (generátor reportů)
- ExportPanel.js (export do XML/PDF)
- FinancialDashboard.js (finanční přehled)
```

#### 7. **Správa zařízení**
```
- DeviceInventory.js (inventář přístrojů)
- DeviceLifecycle.js (životní cyklus přístroje)
- MaintenanceSchedule.js (plán údržby)
```

---

## 🔌 Integrace s externími systémy

### 1. **Nemocniční informační systém (NIS)**
**Co implementovat:**
- REST API klient pro komunikaci s NIS
- Automatický import dat pacientů (identifikace, pojištění, diagnózy)
- Export perioperačních protokolů ve formátu XML/FHIR
- Synchronizace v reálném čase nebo dávkové zpracování
- Autentizace a zabezpečení (HL7 standardy)

### 2. **Personální systém**
**Co implementovat:**
- Import seznamu lékařů a jejich specializací
- Synchronizace hodinových sazeb
- Import rozpisů služeb (shifts)
- Job positions a role

### 3. **Skenování EAN-13**
**Co implementovat:**
- Webové rozhraní pro USB/Bluetooth skenery
- Mobilní aplikace pro skenování (React Native/PWA)
- Validace EAN-13 kódů
- Offline režim s následnou synchronizací
- Real-time přenos do systému přes WebSocket

### 4. **Dodavatelské systémy**
**Co implementovat:**
- Import katalogů materiálů a přístrojů
- Automatická aktualizace cen
- Tracking dodávek a skladových zásob

---

## 📊 Datová struktura a relace

### Klíčové entity a jejich vztahy:

```
OperatingRoom (1) <---> (N) Operation
Operation (1) <---> (N) MaterialUsage
Operation (1) <---> (N) DeviceUsage
Operation (1) <---> (N) StaffAssignment
Operation (1) <---> (1) Patient
Operation (1) <---> (1) OperationCost
Operation (1) <---> (1) PerioperativeProtocol

Doctor (1) <---> (N) StaffAssignment
Doctor (1) <---> (1) DoctorSchedule

Material (1) <---> (N) MaterialUsage
MedicalDevice (1) <---> (N) DeviceUsage
MedicalDevice (1) <---> (1) DeviceLifecycle
```

---

## 📈 Real-time funkcionalita

### Co implementovat pomocí WebSocket/Django Channels:

1. **Live Dashboard Updates**
   - Aktuální stav všech 20 sálů
   - Probíhající operace
   - Čekající pacienti

2. **Real-time Notifications**
   - Upozornění na blížící se konec operace
   - Dostupnost sálu pro další operaci

3. **Live Cost Tracking**
   - Průběžná kalkulace nákladů během operace
   - Upozornění při překročení rozpočtu


---

## 📱 Mobilní rozhraní

### Co implementovat:

1. **PWA (Progressive Web App)**
   - Responsivní design pro tablety a mobilní telefony

2. **Mobilní funkce**
   - Rychlý přehled rozpisů služeb
   - Notifikace o změnách v harmonogramu

---

## 🔒 Bezpečnost a GDPR compliance

### Co implementovat:

1. **Autentizace a autorizace**
   - Multi-faktorová autentizace (MFA)
   - Role-based access control (RBAC)
   - Audit log všech přístupů k citlivým datům

2. **Šifrování dat**
   - Šifrování dat v klidu (databáze)
   - TLS/SSL pro přenos dat
   - Anonymizace dat pro reporty a analýzy

3. **GDPR compliance**
   - Právo na výmaz dat pacienta
   - Export dat ve strojově čitelném formátu
   - Consent management
   - Data retention policies

4. **Audit a logování**
   - Kompletní audit trail všech operací
   - Sledování přístupu k pacientským datům
   - Automatické reporty bezpečnostních incidentů

---

## 📉 Kalkulace nákladů - Detailní implementace

### 1. Odpisy přístrojů
```
Vzorec: (Pořizovací cena / Celková životnost v hodinách) × Doba použití
```
**Co sledovat:**
- Pořizovací cena přístroje
- Deklarovaná životnost (v hodinách provozu)
- Skutečně odpracované hodiny
- Zbývající životnost
- Plánovaná údržba a kalibrace

### 2. Spotřeba materiálu
```
Vzorec: Σ (Cena materiálu × Použité množství)
```
**Co sledovat:**
- EAN-13 kód každého použitého materiálu
- Aktuální nákupní cena
- Datum použití
- Batch číslo (pro sterilní materiál)
- Expirace

### 3. Mzdové náklady
```
Vzorec: Σ (Hodinová sazba × Odpracované hodiny) pro každého člena týmu
```
**Co sledovat:**
- Hodinové sazby jednotlivých pozic
- Příplatky (noční, víkendové)
- Čas zahájení a ukončení operace
- Přesčasy

### 4. Režijní náklady
```
Vzorec: (Celkové měsíční režie / Celkový počet hodin operací) × Doba operace
```
**Co sledovat:**
- Energie (elektřina, plyn, voda)
- Úklid a sterilizace
- Administrativa
- Odpisy budov

---

## 📊 Vizualizace a reporty

### Grafické výstupy k implementaci:

1. **Dashboard přehledy**
   - Heatmap vytížení sálů (24/7 vizualizace)
   - Gauge metriky (vytížení, efektivita, náklady)
   - Timeline probíhajících operací
   - Alerts a notifikace

2. **Analytické grafy**
   - Sloupcové grafy - srovnání nákladů po sálech
   - Liniové grafy - trendy vytížení v čase
   - Koláčové grafy - rozpad nákladů (materiál, mzdy, odpisy)
   - Gantt chart - harmonogram operací

3. **KPI metriky**
   - Průměrná doba operace podle typu
   - Využití sálu v % (target: 85%+)
   - Náklady na 1 hodinu operace
   - Prostoje mezi operacemi
   - ROI na jednotlivé přístroje

4. **Exportovatelné reporty**
   - PDF reporty pro vedení
   - Excel export surových dat
   - XML export pro NIS
   - Automatické měsíční/týdenní reporty

---

## 🛠️ Technologické požadavky

### Backend additions:
```
- Django Channels (WebSocket support)
- Celery + Redis (async tasks, real-time updates)
- Pandas + NumPy (data analytics)
- Matplotlib/Plotly (grafy pro reporty)
- python-barcode (generování EAN-13)
- lxml (XML processing pro NIS)
- reportlab nebo WeasyPrint (PDF generování)
- django-guardian (object-level permissions)
- django-auditlog (audit trail)
```

### Frontend additions:
```
- @fullcalendar/react (kalendář operací)
- recharts nebo Chart.js (vizualizace dat)
- react-scanner-detection (EAN-13 scanning)
- socket.io-client (WebSocket komunikace)
- react-query (data fetching & caching)
- react-table (tabulky s velkými daty)
- date-fns (práce s datumy)
- react-pdf (PDF preview/export)
- tailwindcss/forms (formuláře)
```

### Infrastructure:
```
- PostgreSQL (produkční databáze)
- Redis (caching, Celery broker, WebSocket)
- Nginx (reverse proxy, static files)
- Docker + Docker Compose (containerizace)
- SSL certifikáty (HTTPS)
- Monitoring: Sentry, Prometheus, Grafana
```

---

## 📝 Datové standardy

### Integrace s NIS - Standardy:
- **HL7 FHIR** - Healthcare integration standard
- **DICOM** - Medical imaging (pokud relevantní)
- **ICD-10** - International Classification of Diseases
- **DRG** - Diagnosis Related Groups
- **ÚZIS kódy** - České standardy zdravotnictví

### Formáty dat:
- XML (HL7/FHIR messages)
- JSON (REST API)
- PDF (reporty, protokoly)
- CSV/Excel (export dat)

---


