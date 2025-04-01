-- Migrate users table to the new schema
-- Create name column
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "name" text;

-- Update name with concatenated firstName and lastName
UPDATE "users" SET "name" = "first_name" || ' ' || "last_name" WHERE "name" IS NULL;

-- Make name column not null after filling it
ALTER TABLE "users" ALTER COLUMN "name" SET NOT NULL;

-- Update status field to ensure consistency
ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'active';

-- Add remaining changes for email and password to use text type
ALTER TABLE "users" ALTER COLUMN "email" TYPE text;
ALTER TABLE "users" ALTER COLUMN "password" TYPE text;

-- We're not dropping the first_name/last_name columns yet to ensure backward compatibility
-- This can be done in a future migration after confirming everything works 