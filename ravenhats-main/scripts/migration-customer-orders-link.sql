-- Migracion: Agregar customer_id a orders y vincular ordenes existentes
-- Ejecutar si la columna customer_id no existe o esta vacia

-- 1. Agregar columna customer_id si no existe
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id INT DEFAULT NULL;

-- 2. Agregar indice para mejorar performance
ALTER TABLE orders ADD INDEX IF NOT EXISTS idx_orders_customer_id (customer_id);
ALTER TABLE orders ADD INDEX IF NOT EXISTS idx_orders_customer_email (customer_email);

-- 3. Vincular ordenes existentes con clientes registrados
UPDATE orders o
INNER JOIN customers c ON LOWER(o.customer_email) = LOWER(c.email)
SET o.customer_id = c.id
WHERE o.customer_id IS NULL;

-- 4. Verificar resultados
SELECT 
  'Ordenes vinculadas' as metric,
  COUNT(*) as count
FROM orders 
WHERE customer_id IS NOT NULL
UNION ALL
SELECT 
  'Ordenes sin vincular' as metric,
  COUNT(*) as count
FROM orders 
WHERE customer_id IS NULL
UNION ALL
SELECT 
  'Total clientes' as metric,
  COUNT(*) as count
FROM customers;
