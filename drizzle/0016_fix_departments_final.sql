-- Drop the existing departments table if it exists
DROP TABLE IF EXISTS departments CASCADE;

-- Create the departments table with all required columns
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    allocated_storage INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default departments
INSERT INTO departments (name, description, allocated_storage)
VALUES 
    ('Finance', 'Financial management and accounting', 0),
    ('HR', 'Human Resources management', 0),
    ('Legal and Compliance', 'Legal affairs and regulatory compliance', 0),
    ('IT', 'Information Technology and systems', 0),
    ('Records Management', 'Document and records management', 0)
ON CONFLICT (name) DO NOTHING;

-- Create an index on the name column for faster lookups
CREATE INDEX idx_departments_name ON departments(name);

-- Update any existing foreign key references to use UUID
ALTER TABLE users 
    ALTER COLUMN department_id TYPE UUID USING department_id::uuid;

ALTER TABLE files 
    ALTER COLUMN department_id TYPE UUID USING department_id::uuid; 