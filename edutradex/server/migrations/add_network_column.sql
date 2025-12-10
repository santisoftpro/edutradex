-- Add network column to Withdrawal table
-- This is safe to run on production - it's a simple ALTER TABLE ADD COLUMN

-- Add the column (nullable, so existing rows are not affected)
ALTER TABLE "Withdrawal"
ADD COLUMN IF NOT EXISTS network VARCHAR(50);

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'Withdrawal' AND column_name = 'network';
