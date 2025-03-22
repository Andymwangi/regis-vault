-- First, ensure we have the uuid-ossp extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('admin', 'manager', 'user');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
    CREATE TYPE user_status AS ENUM ('active', 'pending', 'suspended');
  END IF;
END
$$;

-- Update users table to use role enum
ALTER TABLE "users" 
  ALTER COLUMN "role" TYPE user_role USING role::user_role,
  ALTER COLUMN "status" TYPE user_status USING status::user_status;

-- Update sessions table to use UUID for user_id
ALTER TABLE "sessions" 
  ALTER COLUMN "id" DROP DEFAULT,
  ALTER COLUMN "id" TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
  ALTER COLUMN "user_id" TYPE uuid USING user_id::text::uuid;

-- Update file_tags table to use UUID
ALTER TABLE "file_tags" 
  ALTER COLUMN "id" DROP DEFAULT,
  ALTER COLUMN "id" TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
  ALTER COLUMN "file_id" TYPE uuid USING file_id::text::uuid;

-- Update tags table to use UUID
ALTER TABLE "tags" 
  ALTER COLUMN "id" DROP DEFAULT,
  ALTER COLUMN "id" TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- Update ocr_results table to use UUID
ALTER TABLE "ocr_results" 
  ALTER COLUMN "id" DROP DEFAULT,
  ALTER COLUMN "id" TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
  ALTER COLUMN "file_id" TYPE uuid USING file_id::text::uuid;

-- Add constraints to ensure department_id is required for non-admin users
ALTER TABLE "users"
  ADD CONSTRAINT "department_required_for_non_admin"
  CHECK (
    (role = 'admin') OR 
    (department_id IS NOT NULL)
  ); 