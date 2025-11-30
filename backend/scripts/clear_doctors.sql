-- SQL skript pro smazání dat personálů z databáze
-- Spustit pomocí: docker exec -i medichub_db psql -U appuser -d appdb < scripts/clear_doctors.sql

-- Nejdříve smazat záznamy z tabulek, které mají cizí klíče na doctors
DELETE FROM operations WHERE primary_doctor_id IN (SELECT id FROM doctors);
DELETE FROM operations_assisting_doctors WHERE doctor_id IN (SELECT id FROM doctors);

-- Pak smazat samotné doktory
DELETE FROM doctors;

-- Resetovat sekvenci ID na 1
ALTER SEQUENCE doctors_id_seq RESTART WITH 1;

-- Zobrazit počet zbývajících záznamů
SELECT COUNT(*) as remaining_doctors FROM doctors;
