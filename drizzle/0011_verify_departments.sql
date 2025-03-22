-- Verify departments table exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'departments') THEN
        CREATE TABLE departments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL UNIQUE,
            description TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    END IF;
END $$;

-- Insert default departments if they don't exist
INSERT INTO departments (name, description)
VALUES 
    ('Finance', 'Financial management and accounting'),
    ('HR', 'Human Resources management'),
    ('Legal and Compliance', 'Legal affairs and regulatory compliance'),
    ('IT', 'Information Technology and systems'),
    ('Records Management', 'Document and records management')
ON CONFLICT (name) DO NOTHING; 