-- Insert default departments if they don't exist
DO $$
BEGIN
    -- Finance Department
    IF NOT EXISTS (SELECT 1 FROM departments WHERE name = 'Finance') THEN
        INSERT INTO departments (name, description)
        VALUES ('Finance', 'Financial management and accounting');
    END IF;

    -- HR Department
    IF NOT EXISTS (SELECT 1 FROM departments WHERE name = 'HR') THEN
        INSERT INTO departments (name, description)
        VALUES ('HR', 'Human Resources management');
    END IF;

    -- Legal and Compliance Department
    IF NOT EXISTS (SELECT 1 FROM departments WHERE name = 'Legal and Compliance') THEN
        INSERT INTO departments (name, description)
        VALUES ('Legal and Compliance', 'Legal affairs and regulatory compliance');
    END IF;

    -- IT Department
    IF NOT EXISTS (SELECT 1 FROM departments WHERE name = 'IT') THEN
        INSERT INTO departments (name, description)
        VALUES ('IT', 'Information Technology and systems');
    END IF;

    -- Records Management Department
    IF NOT EXISTS (SELECT 1 FROM departments WHERE name = 'Records Management') THEN
        INSERT INTO departments (name, description)
        VALUES ('Records Management', 'Document and records management');
    END IF;
END $$; 