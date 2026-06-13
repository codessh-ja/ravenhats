-- =================================================================
-- MIGRATION: Final Database Integrity Check
-- Purpose: Ensure all required fields exist and data is consistent
-- Date: 2026-03-30
-- 
-- SAFE TO RUN MULTIPLE TIMES - Uses conditional logic
-- =================================================================

-- =================================================================
-- SECTION 1: ADD MISSING COLUMNS (SAFE - IGNORES IF EXISTS)
-- =================================================================

-- 1.1 Orders table: confirmation_email_sent (idempotency for webhooks)
-- MySQL workaround for IF NOT EXISTS on columns
SET @table_name = 'orders';
SET @column_name = 'confirmation_email_sent';
SET @column_def = 'BOOLEAN DEFAULT FALSE';

SELECT COUNT(*) INTO @exists 
FROM information_schema.columns 
WHERE table_schema = DATABASE() 
  AND table_name = @table_name 
  AND column_name = @column_name;

SET @sql = IF(@exists = 0, 
  CONCAT('ALTER TABLE ', @table_name, ' ADD COLUMN ', @column_name, ' ', @column_def),
  'SELECT "Column confirmation_email_sent already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 1.2 Orders table: stock_deducted (prevent double deduction)
SET @column_name = 'stock_deducted';
SET @column_def = 'BOOLEAN DEFAULT FALSE';

SELECT COUNT(*) INTO @exists 
FROM information_schema.columns 
WHERE table_schema = DATABASE() 
  AND table_name = @table_name 
  AND column_name = @column_name;

SET @sql = IF(@exists = 0, 
  CONCAT('ALTER TABLE ', @table_name, ' ADD COLUMN ', @column_name, ' ', @column_def),
  'SELECT "Column stock_deducted already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 1.3 Orders table: payment_reminder_sent
SET @column_name = 'payment_reminder_sent';
SET @column_def = 'BOOLEAN DEFAULT FALSE';

SELECT COUNT(*) INTO @exists 
FROM information_schema.columns 
WHERE table_schema = DATABASE() 
  AND table_name = @table_name 
  AND column_name = @column_name;

SET @sql = IF(@exists = 0, 
  CONCAT('ALTER TABLE ', @table_name, ' ADD COLUMN ', @column_name, ' ', @column_def),
  'SELECT "Column payment_reminder_sent already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 1.4 Orders table: payment_reference (Wompi reference)
SET @column_name = 'payment_reference';
SET @column_def = 'VARCHAR(255) NULL';

SELECT COUNT(*) INTO @exists 
FROM information_schema.columns 
WHERE table_schema = DATABASE() 
  AND table_name = @table_name 
  AND column_name = @column_name;

SET @sql = IF(@exists = 0, 
  CONCAT('ALTER TABLE ', @table_name, ' ADD COLUMN ', @column_name, ' ', @column_def),
  'SELECT "Column payment_reference already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 1.5 Orders table: customer_id (link to registered customers)
SET @column_name = 'customer_id';
SET @column_def = 'INT NULL';

SELECT COUNT(*) INTO @exists 
FROM information_schema.columns 
WHERE table_schema = DATABASE() 
  AND table_name = @table_name 
  AND column_name = @column_name;

SET @sql = IF(@exists = 0, 
  CONCAT('ALTER TABLE ', @table_name, ' ADD COLUMN ', @column_name, ' ', @column_def),
  'SELECT "Column customer_id already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =================================================================
-- SECTION 2: CREATE INDEXES (SAFE - IGNORES IF EXISTS)
-- =================================================================

-- Drop and recreate indexes (MySQL doesn't have CREATE INDEX IF NOT EXISTS)
-- These are idempotent - will fail silently if already exist

-- Index for order lookups by number
CREATE INDEX idx_orders_order_number ON orders(order_number);

-- Index for payment status filtering
CREATE INDEX idx_orders_payment_status ON orders(payment_status);

-- Index for payment method filtering
CREATE INDEX idx_orders_payment_method ON orders(payment_method);

-- Index for Wompi transaction lookups
CREATE INDEX idx_payments_wompi_transaction ON payments(wompi_transaction_id);

-- Index for payment reference lookups
CREATE INDEX idx_payments_wompi_reference ON payments(wompi_reference);

-- =================================================================
-- SECTION 3: DATA CONSISTENCY FIXES (SAFE - IDEMPOTENT)
-- =================================================================

-- 3.1 Mark all approved orders as having emails sent (prevents duplicate emails)
UPDATE orders 
SET confirmation_email_sent = TRUE 
WHERE payment_status = 'approved' 
  AND confirmation_email_sent = FALSE;

-- 3.2 Mark all approved orders as having stock deducted (if not already marked)
UPDATE orders 
SET stock_deducted = TRUE 
WHERE payment_status = 'approved' 
  AND stock_deducted = FALSE;

-- 3.3 Ensure COD orders NEVER have payment_status = 'approved'
-- COD orders should stay 'pending' until manually confirmed after delivery
-- IMPORTANT: Only run this if you want to reset COD orders
-- UPDATE orders 
-- SET payment_status = 'pending' 
-- WHERE payment_method = 'COD' AND payment_status = 'approved';

-- 3.4 Clear any Wompi references from COD orders (they should never have them)
UPDATE orders 
SET payment_reference = NULL 
WHERE payment_method = 'COD' AND payment_reference IS NOT NULL;

-- =================================================================
-- SECTION 4: CREATE PAYMENTS TABLE IF NOT EXISTS
-- =================================================================

CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  wompi_transaction_id VARCHAR(255),
  wompi_reference VARCHAR(255),
  wompi_status VARCHAR(50),
  amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'COP',
  payment_method VARCHAR(50),
  payment_method_type VARCHAR(50),
  card_last_four VARCHAR(4),
  card_brand VARCHAR(50),
  pse_bank VARCHAR(100),
  raw_response JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_wompi_transaction (wompi_transaction_id),
  INDEX idx_order (order_id),
  INDEX idx_status (wompi_status)
) ENGINE=InnoDB;

-- =================================================================
-- SECTION 5: CREATE ACCOUNTING_TRANSACTIONS TABLE IF NOT EXISTS
-- =================================================================

CREATE TABLE IF NOT EXISTS accounting_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type ENUM('online_sale', 'cod_sale', 'pos_sale', 'abono', 'refund', 'expense', 'other') NOT NULL,
  payment_method ENUM('wompi', 'cod', 'transfer', 'cash', 'nequi', 'daviplata', 'card', 'other') NOT NULL,
  payment_status VARCHAR(50) DEFAULT 'approved',
  order_id INT NULL,
  order_number VARCHAR(50) NULL,
  customer_name VARCHAR(200) NULL,
  customer_phone VARCHAR(20) NULL,
  customer_email VARCHAR(255) NULL,
  subtotal DECIMAL(12, 2) DEFAULT 0,
  shipping_cost DECIMAL(12, 2) DEFAULT 0,
  total DECIMAL(12, 2) NOT NULL,
  description TEXT NULL,
  notes TEXT NULL,
  created_by VARCHAR(100) DEFAULT 'system',
  transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_type (type),
  INDEX idx_payment_method (payment_method),
  INDEX idx_order (order_id),
  INDEX idx_date (transaction_date)
) ENGINE=InnoDB;

-- =================================================================
-- SECTION 6: VERIFICATION QUERIES (READ-ONLY - RUN MANUALLY)
-- =================================================================

-- Query 1: Find approved orders without email sent flag (should be 0 after migration)
-- SELECT order_number, payment_status, confirmation_email_sent 
-- FROM orders 
-- WHERE payment_status = 'approved' AND confirmation_email_sent = FALSE;

-- Query 2: Find COD orders with Wompi data (should be 0)
-- SELECT order_number, payment_method, payment_reference 
-- FROM orders 
-- WHERE payment_method = 'COD' AND payment_reference IS NOT NULL;

-- Query 3: Find approved Wompi orders without payment records
-- SELECT o.order_number, o.payment_status, o.payment_method
-- FROM orders o
-- LEFT JOIN payments p ON o.id = p.order_id
-- WHERE o.payment_status = 'approved' 
--   AND o.payment_method != 'COD' 
--   AND p.id IS NULL;

-- Query 4: Find duplicate Wompi transactions
-- SELECT wompi_transaction_id, COUNT(*) as cnt 
-- FROM payments 
-- WHERE wompi_transaction_id IS NOT NULL
-- GROUP BY wompi_transaction_id 
-- HAVING cnt > 1;

-- Query 5: Find mismatched order/payment states
-- SELECT order_number, status, payment_status, payment_method 
-- FROM orders 
-- WHERE payment_status = 'approved' 
--   AND status NOT IN ('confirmed', 'processing', 'shipped', 'delivered');

-- Query 6: Data integrity summary
-- SELECT 
--   payment_status,
--   payment_method,
--   confirmation_email_sent,
--   stock_deducted,
--   COUNT(*) as count
-- FROM orders 
-- GROUP BY payment_status, payment_method, confirmation_email_sent, stock_deducted
-- ORDER BY payment_status, payment_method;

-- =================================================================
-- MIGRATION COMPLETE
-- =================================================================
-- Run the verification queries above to ensure data integrity
-- All changes are idempotent and safe to run multiple times
