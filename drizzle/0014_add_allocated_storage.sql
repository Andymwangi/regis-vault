-- Add allocated_storage column to departments table
ALTER TABLE departments
ADD COLUMN IF NOT EXISTS allocated_storage INTEGER DEFAULT 0; 