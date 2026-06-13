-- Script para configurar las llaves de Wompi en la base de datos
-- Ejecutar despues de mysql-schema.sql

USE ravenhats_db;

-- Insertar configuracion de Wompi (modo test)
INSERT INTO store_config (config_key, config_value) VALUES (
  'wompi',
  JSON_OBJECT(
    'enabled', true,
    'testMode', true,
    'publicKey', 'pub_test_LQ0KhPj4Dy3mK63fzEwcZOEXhWKgNu8A',
    'privateKey', 'prv_test_48pzrHKUjO2v2kqvttZnGKLqNwEVsowC',
    'integrityKey', 'test_integrity_UB311y4IsIDKPGAgJkoESmR2AYSFG4l6',
    'eventsSecret', 'test_events_LS9exbQMLf114XEvyYHitTbLEyd6rblk'
  )
) ON DUPLICATE KEY UPDATE config_value = VALUES(config_value);

-- Verificar que se inserto correctamente
SELECT * FROM store_config WHERE config_key = 'wompi';
