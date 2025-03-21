-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create a temporary table with UUID
CREATE TABLE "departments_new" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "description" text,
  "allocated_storage" integer DEFAULT 0,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Copy data from old table to new table
INSERT INTO "departments_new" ("name", "description", "allocated_storage", "created_at", "updated_at")
SELECT "name", "description", "allocated_storage", "created_at", "updated_at"
FROM "departments";

-- Drop the old table
DROP TABLE "departments";

-- Rename the new table to the original name
ALTER TABLE "departments_new" RENAME TO "departments";

-- Update foreign key references in users table
ALTER TABLE "users" 
  ALTER COLUMN "department_id" TYPE uuid USING department_id::text::uuid;

-- Update foreign key references in files table
ALTER TABLE "files" 
  ALTER COLUMN "department_id" TYPE uuid USING department_id::text::uuid; 