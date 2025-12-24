-- ===========================================
-- LIBERAR QUARTO RUÍNAS (ID 2)
-- Rode isso no Supabase SQL Editor
-- ===========================================

UPDATE quartos 
SET status_29_02 = 'disponivel', status_30_03 = 'disponivel'
WHERE nome_praia = 'Ruínas';

-- Ou se quiser liberar TODOS os quartos:
-- UPDATE quartos SET status_29_02 = 'disponivel', status_30_03 = 'disponivel';

-- Verificar resultado:
SELECT id, nome_praia, status_29_02, status_30_03 FROM quartos;
