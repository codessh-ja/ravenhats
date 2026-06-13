-- =====================================================
-- MIGRACION: Sistema de Gestion de Pedidos V2
-- Para MySQL 5.7+
-- Ejecutar despues de todas las migraciones anteriores
-- =====================================================

USE ravenhats_db;

-- =====================================================
-- 1. TABLA: order_status_history
-- Registra todos los cambios de estado de los pedidos
-- con datos de quien hizo el cambio y notas
-- =====================================================

CREATE TABLE IF NOT EXISTS order_status_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  previous_status VARCHAR(50) NULL,
  new_status VARCHAR(50) NULL,
  previous_payment_status VARCHAR(50) NULL,
  new_payment_status VARCHAR(50) NULL,
  changed_by VARCHAR(100) DEFAULT 'system',
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_order_id (order_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 2. Agregar columna admin_notes a orders (si no existe)
-- =====================================================

-- Verificar si admin_notes ya existe en la tabla orders
-- Si ya existe, este ALTER dara error (ignorar)
-- ALTER TABLE orders ADD COLUMN admin_notes TEXT NULL AFTER customer_notes;
-- Nota: La columna admin_notes ya existe en el schema base, esta linea es solo referencia.

-- =====================================================
-- 3. Verificar que las columnas de tracking existen
-- =====================================================
-- Estas columnas ya existen en el schema base:
-- tracking_number VARCHAR(255)
-- tracking_url VARCHAR(500)
-- shipped_at TIMESTAMP NULL
-- delivered_at TIMESTAMP NULL

-- =====================================================
-- 4. Migrar historial basico de pedidos existentes
-- Registra un evento inicial para pedidos ya existentes
-- =====================================================

INSERT IGNORE INTO order_status_history (order_id, new_status, new_payment_status, changed_by, notes, created_at)
SELECT 
  id,
  status,
  payment_status,
  'system',
  'Estado inicial migrado',
  created_at
FROM orders
WHERE id NOT IN (SELECT DISTINCT order_id FROM order_status_history);

-- =====================================================
-- VERIFICACION
-- =====================================================
SELECT 'Migracion Order Management V2 completada' as info;
SELECT COUNT(*) as registros_historial FROM order_status_history;
SELECT COUNT(*) as total_pedidos FROM orders;
