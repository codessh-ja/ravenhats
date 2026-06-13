-- Migracion: Agregar campo payment_reminder_sent a orders
-- Ejecutar en tu servidor MySQL

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payment_reminder_sent BOOLEAN DEFAULT FALSE 
AFTER stock_deducted;
