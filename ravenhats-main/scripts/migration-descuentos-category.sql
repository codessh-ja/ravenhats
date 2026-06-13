-- Migration: Add manual discount category field
-- This separates "product has discount price" from "product shows in Descuentos category"

-- Add column for manual discount category selection
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS show_in_descuentos BOOLEAN DEFAULT FALSE;

-- Add index for faster filtering
CREATE INDEX IF NOT EXISTS idx_show_in_descuentos ON products(show_in_descuentos);

-- Note: This allows products to:
-- 1. Have a discount (compare_at_price > price) but NOT appear in Descuentos
-- 2. Appear in Descuentos category with or without a discount price
-- The show_in_descuentos flag is a marketing decision, independent of actual pricing
