-- =====================================================
-- MIGRACION: Sistema de Abonos (Pagos Parciales)
-- Para MySQL 5.7+
-- =====================================================

USE ravenhats_db;

-- =====================================================
-- 1. AGREGAR COLUMNA amount_paid A accounting_transactions
-- Cache del total abonado para no hacer SUM() en cada query
-- =====================================================

ALTER TABLE accounting_transactions 
ADD COLUMN amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER total;

-- Setear amount_paid = total para transacciones ya aprobadas
UPDATE accounting_transactions 
SET amount_paid = total 
WHERE payment_status = 'approved' AND amount_paid = 0;

-- =====================================================
-- 2. TABLA DE ABONOS (PAGOS PARCIALES)
-- =====================================================

CREATE TABLE IF NOT EXISTS accounting_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transaction_id INT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_method ENUM('wompi', 'cod', 'transfer', 'cash', 'nequi', 'daviplata', 'other') NOT NULL DEFAULT 'cash',
  payment_reference VARCHAR(255) NULL,
  notes TEXT NULL,
  payment_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (transaction_id) REFERENCES accounting_transactions(id) ON DELETE CASCADE,
  INDEX idx_transaction_id (transaction_id),
  INDEX idx_payment_date (payment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- VERIFICACION
-- =====================================================
SELECT 'Migracion de abonos completada' as info;
SELECT COUNT(*) as transacciones_actualizadas FROM accounting_transactions WHERE amount_paid > 0;
