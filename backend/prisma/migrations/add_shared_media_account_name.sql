-- Add accountName to SharedMedia
ALTER TABLE IF EXISTS "SharedMedia"
ADD COLUMN IF NOT EXISTS "accountName" TEXT;
