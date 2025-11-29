# CSV Import pro Operační Nástroje

## Přehled

Systém umožňuje import operačních nástrojů a materiálu z CSV souboru do databáze.

## Formát CSV souboru

**DŮLEŽITÉ:** CSV soubor musí používat **středník (`;`)** jako oddělovač, ne čárku!

CSV soubor musí obsahovat následující sloupce (v tomto pořadí):

- **#** (volitelné): Číslo řádku - ignorováno při importu
- **Název Nástroje** (povinné): Název nástroje nebo materiálu
- **Kategorie** (povinné): Kategorie (např. "Všeobecná Chirurgie", "Ortopedie/Trauma", "Diatermie")
- **Fiktivní Inventární Kód** (volitelné): Unikátní inventární kód (např. "R-CH-0001")
- **Cena Sterilizace (Kč/Použití Fikt.)** (volitelné): Cena sterilizace v Kč, použijte čárku jako desetinný oddělovač (např. "15,5")
- **UDI DataMatrix Kód (GS1 Formát)** (volitelné): UDI kód ve formátu GS1

### Příklad CSV souboru:

```csv
#;Název Nástroje;Kategorie;Fiktivní Inventární Kód;Cena Sterilizace (Kč/Použití Fikt.);UDI DataMatrix Kód (GS1 Formát)
1;Chirurgický držák jehel (Standard);Všeobecná Chirurgie;R-CH-0001;15,5;(01)08591712245824(10)PP001225(21)251129090747
2;Skalpelová rukojeť č. 3;Všeobecná Chirurgie;R-CH-0002;12;(01)08591712245824(10)PP001225(21)251129090847
3;Péán (svorka) rovný 16 cm;Všeobecná Chirurgie;R-CH-0003;14,8;(01)08591712245824(10)PP001225(21)251129090947
```

## API Endpointy

### 1. Upload CSV souboru

**POST** `/api/medic/tools/upload-csv/`

**Request:**
- Content-Type: `multipart/form-data`
- Body: Form data s klíčem `file` obsahujícím CSV soubor

**Response:**
```json
{
  "message": "CSV soubor byl úspěšně zpracován",
  "imported": 10,
  "updated": 2,
  "total_processed": 12,
  "errors": [],
  "error_count": 0
}
```

**Příklad použití s curl:**
```bash
curl -X POST http://localhost:8000/api/medic/tools/upload-csv/ \
  -F "file=@operation_tools.csv"
```

**Příklad použití s Python requests:**
```python
import requests

url = 'http://localhost:8000/api/medic/tools/upload-csv/'
files = {'file': open('operation_tools.csv', 'rb')}
response = requests.post(url, files=files)
print(response.json())
```

### 2. Export do CSV

**GET** `/api/medic/tools/export-csv/`

Stáhne všechny nástroje z databáze jako CSV soubor.

### 3. CRUD operace

**GET** `/api/medic/tools/` - Seznam všech nástrojů
**POST** `/api/medic/tools/` - Vytvoření nového nástroje
**GET** `/api/medic/tools/{id}/` - Detail nástroje
**PUT/PATCH** `/api/medic/tools/{id}/` - Aktualizace nástroje
**DELETE** `/api/medic/tools/{id}/` - Smazání nástroje

## Chování při importu

- Pokud nástroj s daným názvem a kategorií již existuje, bude **aktualizován**
- Pokud nástroj neexistuje, bude **vytvořen nový**
- Chybné řádky jsou zaznamenány v odpovědi, ale nebrání importu ostatních řádků

## Validace

- **Název Nástroje** a **Kategorie** jsou povinné
- **Cena Sterilizace** musí používat čárku jako desetinný oddělovač (český formát: "15,5" místo "15.5")
- Pokud nástroj s daným **Fiktivním Inventárním Kódem** již existuje, bude aktualizován
- Pokud inventární kód chybí, použije se kombinace názvu a kategorie pro identifikaci

## Migrace databáze

Po přidání modelu je nutné vytvořit a aplikovat migraci:

```bash
python manage.py makemigrations operating_rooms
python manage.py migrate
```

## Šablona CSV

V souboru `operation_tools_template.csv` najdete příklad CSV souboru s ukázkovými daty.

