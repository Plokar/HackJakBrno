"""
Script pro převod Excel souborů na CSV
"""
import pandas as pd
import os
from pathlib import Path


def convert_xlsx_to_csv():
    """Převede Data1.xlsx a data2.xlsx na CSV soubory"""
    
    base_dir = Path(__file__).parent.parent
    
    # Data1.xlsx - obsahuje 3 listy: personál, materiál, přístroje
    data1_path = base_dir / 'Data1.xlsx'
    if data1_path.exists():
        print(f"Zpracovavam {data1_path}")
        
        # List 1 - Personál
        try:
            df_personal = pd.read_excel(data1_path, sheet_name=0)
            output_path = base_dir / 'data' / 'personal.csv'
            output_path.parent.mkdir(exist_ok=True)
            df_personal.to_csv(output_path, index=False, encoding='utf-8-sig')
            print(f"  - Personal ulozen do {output_path}")
            print(f"    Sloupce: {list(df_personal.columns)}")
        except Exception as e:
            print(f"  - Chyba pri cteni personaluListu 1: {e}")
        
        # List 2 - Materiál
        try:
            df_material = pd.read_excel(data1_path, sheet_name=1)
            output_path = base_dir / 'data' / 'material.csv'
            df_material.to_csv(output_path, index=False, encoding='utf-8-sig')
            print(f"  - Material ulozen do {output_path}")
            print(f"    Sloupce: {list(df_material.columns)}")
        except Exception as e:
            print(f"  - Chyba pri cteni materialu (List 2): {e}")
        
        # List 3 - Přístroje
        try:
            df_equipment = pd.read_excel(data1_path, sheet_name=2)
            output_path = base_dir / 'data' / 'equipment.csv'
            df_equipment.to_csv(output_path, index=False, encoding='utf-8-sig')
            print(f"  - Equipment ulozen do {output_path}")
            print(f"    Sloupce: {list(df_equipment.columns)}")
        except Exception as e:
            print(f"  - Chyba pri cteni pristroju (List 3): {e}")
    else:
        print(f"Soubor {data1_path} nenalezen!")
    
    # data2.xlsx - náklady na zaměstnance a nástroje ke sterilizaci
    data2_path = base_dir / 'data2.xlsx'
    if data2_path.exists():
        print(f"\nZpracovavam {data2_path}")
        
        # List 1 - Náklady na zaměstnance
        try:
            df_employee_costs = pd.read_excel(data2_path, sheet_name=0)
            output_path = base_dir / 'data' / 'employee_costs.csv'
            output_path.parent.mkdir(exist_ok=True)
            df_employee_costs.to_csv(output_path, index=False, encoding='utf-8-sig')
            print(f"  - Naklady na zamestnance ulozeny do {output_path}")
            print(f"    Sloupce: {list(df_employee_costs.columns)}")
        except Exception as e:
            print(f"  - Chyba pri cteni nakladu na zamestnance (List 1): {e}")
        
        # List 2 - Nástroje ke sterilizaci
        try:
            df_sterilization_tools = pd.read_excel(data2_path, sheet_name=1)
            output_path = base_dir / 'data' / 'sterilization_tools.csv'
            df_sterilization_tools.to_csv(output_path, index=False, encoding='utf-8-sig')
            print(f"  - Nastroje ke sterilizaci ulozeny do {output_path}")
            print(f"    Sloupce: {list(df_sterilization_tools.columns)}")
        except Exception as e:
            print(f"  - Chyba pri cteni nastroju ke sterilizaci (List 2): {e}")
    else:
        print(f"Soubor {data2_path} nenalezen!")
    
    print("\nKonverze dokoncena!")


if __name__ == '__main__':
    convert_xlsx_to_csv()
