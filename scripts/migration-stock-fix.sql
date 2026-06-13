-- =====================================================
-- MIGRACION: Fix de Stock
-- Este script agrega la columna stock_deducted a la tabla orders
-- para controlar cuando se descuenta el stock (solo al aprobar pago)
-- =====================================================

-- Agregar columna stock_deducted (ejecutar primero)
ALTER TABLE orders ADD COLUMN stock_deducted BOOLEAN DEFAULT FALSE;

-- Marcar ordenes con pago aprobado como stock ya descontado
-- (para ordenes existentes que ya procesaron antes de este cambio)
UPDATE orders 
SET stock_deducted = TRUE 
WHERE payment_status = 'approved';

-- Crear indice para mejor rendimiento (MySQL 8.0+)
-- Si usas MySQL 5.7, comenta esta linea
CREATE INDEX idx_stock_deducted ON orders(stock_deducted);

-- Agregar columna updated_at a payments
ALTER TABLE payments ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- =====================================================
-- VERIFICACION
-- =====================================================
SELECT 
  'Ordenes totales' as metric, 
  COUNT(*) as value 
FROM orders
UNION ALL
SELECT 
  'Ordenes con stock descontado', 
  COUNT(*) 
FROM orders 
WHERE stock_deducted = TRUE
UNION ALL
SELECT 
  'Ordenes pendientes (sin descuento de stock)', 
  COUNT(*) 
FROM orders 
WHERE stock_deducted = FALSE;
