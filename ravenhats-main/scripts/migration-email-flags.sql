-- ============================================================
-- MIGRATION: Email Duplicate Control Flags
-- Purpose: Track which emails have been sent to prevent duplicates
-- ============================================================

-- Add email tracking flags to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS email_confirmed_sent BOOLEAN DEFAULT FALSE AFTER confirmation_email_sent,
ADD COLUMN IF NOT EXISTS email_preparing_sent BOOLEAN DEFAULT FALSE AFTER email_confirmed_sent,
ADD COLUMN IF NOT EXISTS email_shipped_sent BOOLEAN DEFAULT FALSE AFTER email_preparing_sent,
ADD COLUMN IF NOT EXISTS email_delivered_sent BOOLEAN DEFAULT FALSE AFTER email_shipped_sent;

-- Migrate existing confirmation_email_sent data to new column
UPDATE orders 
SET email_confirmed_sent = confirmation_email_sent 
WHERE confirmation_email_sent IS NOT NULL AND confirmation_email_sent = TRUE;

-- For orders that were shipped, mark shipping email as sent
UPDATE orders 
SET email_shipped_sent = TRUE 
WHERE status IN ('shipped', 'delivered') AND tracking_number IS NOT NULL;

-- For orders that were delivered, mark delivery email as sent
UPDATE orders 
SET email_delivered_sent = TRUE 
WHERE status = 'delivered';

-- Add index for quick filtering of orders needing emails
CREATE INDEX IF NOT EXISTS idx_orders_email_status ON orders(status, payment_status, email_confirmed_sent, email_preparing_sent, email_shipped_sent, email_delivered_sent);

-- Log migration
SELECT 'Migration: Email duplicate control flags added successfully' AS status;
