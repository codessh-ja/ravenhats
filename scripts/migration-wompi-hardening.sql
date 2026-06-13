-- Migration: Wompi Integration Hardening
-- Purpose: Add idempotency controls for email sending and improve payment tracking
-- Date: 2026-03-30
-- 
-- IMPORTANT: Run these commands one by one if MySQL doesn't support IF NOT EXISTS

-- 1. Add confirmation_email_sent flag to orders table
-- This prevents duplicate emails when webhooks are received multiple times
-- MySQL syntax (no IF NOT EXISTS support for ADD COLUMN):
ALTER TABLE orders ADD COLUMN confirmation_email_sent BOOLEAN DEFAULT FALSE;

-- 2. Add indexes for faster lookups (ignore errors if already exist)
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_payments_transaction_id ON payments(wompi_transaction_id);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_payment_method ON orders(payment_method);

-- 3. Mark existing approved orders as already notified
-- This prevents sending emails for orders that were already processed before this migration
UPDATE orders 
SET confirmation_email_sent = TRUE 
WHERE payment_status = 'approved';

-- 4. DATA CONSISTENCY CHECK (run these to verify your data is clean)
-- Find orders with payment_status='approved' but no wompi_transaction_id (should return nothing for Wompi orders)
-- SELECT order_number, payment_status, payment_method FROM orders 
-- WHERE payment_status = 'approved' AND payment_method != 'COD' AND payment_reference IS NULL;

-- Find any COD orders that mistakenly have payment_status='approved' (COD should be 'pending' until manual confirmation)
-- SELECT order_number, payment_status, payment_method FROM orders 
-- WHERE payment_method = 'COD' AND payment_status = 'approved';

-- 5. SAFETY: Ensure COD orders never have confirmation_email_sent = TRUE via webhook
-- (COD orders get their own email flow in /api/orders POST handler)
-- No action needed - just verification

-- =================================================================
-- VERIFICATION QUERIES (run after migration to ensure data integrity)
-- =================================================================

-- 6. Verify no COD orders have wompi data (should return 0 rows)
-- SELECT order_number, payment_method, payment_reference 
-- FROM orders 
-- WHERE payment_method = 'COD' AND payment_reference IS NOT NULL;

-- 7. Verify all approved Wompi orders have transaction records
-- SELECT o.order_number, o.payment_status, p.wompi_transaction_id 
-- FROM orders o
-- LEFT JOIN payments p ON o.id = p.order_id
-- WHERE o.payment_status = 'approved' AND o.payment_method != 'COD' AND p.id IS NULL;

-- 8. Find any mismatched states (payment approved but order not confirmed)
-- SELECT order_number, status, payment_status, payment_method 
-- FROM orders 
-- WHERE payment_status = 'approved' AND status NOT IN ('confirmed', 'processing', 'shipped', 'delivered');

-- 9. Find duplicate payments (same transaction processed twice)
-- SELECT wompi_transaction_id, COUNT(*) as cnt 
-- FROM payments 
-- GROUP BY wompi_transaction_id 
-- HAVING cnt > 1;

-- 10. Check email flags for consistency
-- SELECT 
--   payment_status,
--   payment_method,
--   confirmation_email_sent,
--   COUNT(*) as count
-- FROM orders 
-- GROUP BY payment_status, payment_method, confirmation_email_sent
-- ORDER BY payment_status, payment_method;
