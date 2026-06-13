-- Migration: Add email_cancelled_sent flag for idempotency
-- This flag prevents duplicate cancellation emails

-- Add email_cancelled_sent column if not exists
SET @column_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'orders' 
    AND COLUMN_NAME = 'email_cancelled_sent'
);

SET @sql = IF(@column_exists = 0,
    'ALTER TABLE orders ADD COLUMN email_cancelled_sent BOOLEAN DEFAULT FALSE AFTER email_delivered_sent',
    'SELECT "Column email_cancelled_sent already exists"'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Log migration
SELECT 'Migration completed: email_cancelled_sent flag added to orders table' AS status;
