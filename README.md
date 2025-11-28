Medic Hub system
Vytvořte dashboard pro sledování vytížení a nákladů operačních sálů pro Fakultní nemocnice u svaté Anny v Brně. Návrh a vizualizace mají pokrýt: automatické zpracování dat z nemocničního informačního systému, zobrazení vytížení sálů, dobu prostojů, počet výkonů v reálném čase, a paralelně náklady na operaci (včetně odpisů přístrojů, spotřeby materiálu, nákladů na práci personálu). Cílem je zefektivnit plánování operací, optimalizovat využití přístrojů a nákladů a zlepšit rozhodování vedení nemocnice na základě objektivních dat.



- zobrazení vytíženost sálu 
- 20 operačních sálu 
    - > vybírý si z nich admin  


# super uživatel admin
- operace 
- > harmonogramu (kalendáře (tailwind))
- pacienty -> co mu je 


# sestřička 
- doktory -> personálního systému (výběr podle jobs)
    - rozkliknutí doktora a zobrazení schedule 
- tools
- kdo operuje

# věci při operaci 
- záznam toolu, jednorázových materiálů 

# věci po operaci 
- hodinová sasba pro doktory 
- grafické výstupy


# context:
Jinak pár informací co mě napadly:
schvalování plánů operací má na starost admin (vedoucí lékař v rámci operačních sálů)
Zajimavé je v rámci vytíženosti sledovat i jednotlivé přístroje, které jsou během operace použity. Každý přístroj má vlastní životní cyklus (dejme tomu z hlediska hodin) během kterého funguje. Počet hodin životnosti se odvíjí od každého přístroje (info od dodavatele). V naší problematice je možné ho určit odhadem.

Jinak bych rád jeste upresnil formát dat perioperacniho protokolu (jeden z kolegů se mě na to ptal)
10:38
RDBMS struktura
(tj. relační databáze). Data jsou uložena v tabulce a ideálně by měla mít návaznost na nemocničního informačního systém (což perioperacni protokol u nás v praxi nemá - měl by být součástí dokumentace pacienta). Z této formy jsou bězně exportovatelné do xml, nebo klidně i do pdf souboru.

Kdyz se bavime o digitalizaci tak vsechno musi mit kod aby slo polozku nebo cas evidovat.

Sken EAN-13 předá do počítače prostý 13místný textový řetězec.
Systém podle tohoto řetězce vyhledá odpovídající položku v databázi.
Jakmile ji najde, vytvoří nový SQL záznam o použití nebo pohybu dané položky (např. množství, čas, pracoviště).
Tím se ze skenu stane plnohodnotný datový záznam v systému.
10:41
Takova je funkcionalita
