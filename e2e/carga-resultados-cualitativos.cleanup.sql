-- Cleanup del E2E KAN-207: revierte la config cualitativa y el valor escrito en el seed.
USE laboratorio;
-- 1) sacar overrides de test (Plaquetas 90004 / Leucocitos 90003) → vuelven a QUANTITATIVE (sin override)
DELETE FROM tenant_determination_override WHERE tenant_id = 1 AND determination_catalog_id IN (90003, 90004);
-- 2) restaurar valores originales del result 53010
UPDATE determinations SET result_value = '250000' WHERE id = 54013; -- Plaquetas
UPDATE determinations SET result_value = '14.2'   WHERE id = 54010; -- Hemoglobina
-- 3) borrar historial de carga generado por el test
DELETE FROM determination_load_history
 WHERE analytical_result_id = 53010 AND new_value IN ('Reactivo', 'No reactivo', '13.9');
-- 4) borrar las categorías cualitativas de test
DELETE FROM qualitative_category_value
 WHERE category_id IN (SELECT id FROM qualitative_category WHERE tenant_id = 1 AND name LIKE 'E2E %');
DELETE FROM qualitative_category WHERE tenant_id = 1 AND name LIKE 'E2E %';
