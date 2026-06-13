-- =====================================================
-- MIGRACION: Sistema Contable para RavenHats
-- Para MySQL 5.7+
-- =====================================================

USE ravenhats_db;

-- =====================================================
-- 1. TABLA DE TRANSACCIONES CONTABLES
-- Registra TODAS las ventas: online (automaticas) y fisicas (manuales)
-- =====================================================

CREATE TABLE IF NOT EXISTS accounting_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  
  -- Tipo: 'online_sale', 'physical_sale', 'refund', 'expense', 'adjustment'
  type ENUM('online_sale', 'physical_sale', 'refund', 'expense', 'adjustment') NOT NULL,
  
  -- Metodo de pago: 'wompi', 'cod', 'transfer', 'cash', 'nequi', 'daviplata', 'other'
  payment_method ENUM('wompi', 'cod', 'transfer', 'cash', 'nequi', 'daviplata', 'other') NOT NULL,
  
  -- Estado del pago
  payment_status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved',
  
  -- Referencia al pedido online (NULL si es venta fisica)
  order_id INT NULL,
  order_number VARCHAR(50) NULL,
  
  -- Datos del cliente (para ventas fisicas puede ser manual)
  customer_name VARCHAR(255) NULL,
  customer_phone VARCHAR(50) NULL,
  customer_email VARCHAR(255) NULL,
  
  -- Montos
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  shipping_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL,
  
  -- Detalles
  description TEXT NULL,
  notes TEXT NULL,
  
  -- Comprobante o referencia de pago
  payment_reference VARCHAR(255) NULL,
  
  -- Quien registro (admin username)
  created_by VARCHAR(100) DEFAULT 'system',
  
  -- Fecha de la transaccion (puede ser diferente a created_at)
  transaction_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
  INDEX idx_type (type),
  INDEX idx_payment_method (payment_method),
  INDEX idx_payment_status (payment_status),
  INDEX idx_transaction_date (transaction_date),
  INDEX idx_order_id (order_id),
  INDEX idx_created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 2. ITEMS DE TRANSACCIONES (para ventas fisicas)
-- =====================================================

CREATE TABLE IF NOT EXISTS accounting_transaction_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transaction_id INT NOT NULL,
  product_id INT NULL,
  product_name VARCHAR(255) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (transaction_id) REFERENCES accounting_transactions(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  INDEX idx_transaction_id (transaction_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 3. MIGRAR VENTAS ONLINE EXISTENTES AL SISTEMA CONTABLE
-- (Solo ordenes con pago aprobado que aun no esten registradas)
-- =====================================================

INSERT INTO accounting_transactions (
  type, payment_method, payment_status, order_id, order_number,
  customer_name, customer_phone, customer_email,
  subtotal, shipping_cost, total,
  description, created_by, transaction_date, created_at
)
SELECT 
  'online_sale' as type,
  CASE 
    WHEN o.payment_method = 'COD' THEN 'cod'
    WHEN o.payment_method = 'WOMPI' THEN 'wompi'
    ELSE 'other'
  END as payment_method,
  'approved' as payment_status,
  o.id as order_id,
  o.order_number,
  CONCAT(o.customer_first_name, ' ', o.customer_last_name) as customer_name,
  o.customer_phone,
  o.customer_email,
  o.subtotal,
  o.shipping_cost,
  o.total,
  CONCAT('Venta online - Pedido ', o.order_number) as description,
  'system' as created_by,
  o.created_at as transaction_date,
  o.created_at
FROM orders o
WHERE o.payment_status = 'approved'
  AND o.id NOT IN (SELECT COALESCE(order_id, 0) FROM accounting_transactions WHERE order_id IS NOT NULL);

-- =====================================================
-- VERIFICACION
-- =====================================================
SELECT 'Transacciones migradas:' as info, COUNT(*) as total FROM accounting_transactions;
