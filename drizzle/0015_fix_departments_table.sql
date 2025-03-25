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
INSERT INTO departments (name, description)
VALUES 
    ('Finance', 'Financial management and accounting'),
    ('HR', 'Human Resources management'),
    ('Legal and Compliance', 'Legal affairs and regulatory compliance'),
    ('IT', 'Information Technology and systems'),
    ('Records Management', 'Document and records management')
ON CONFLICT (name) DO NOTHING; 