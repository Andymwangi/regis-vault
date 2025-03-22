-- Insert default departments
INSERT INTO departments (name, description)
VALUES 
    ('Finance', 'Financial management and accounting'),
    ('HR', 'Human Resources management'),
    ('Legal and Compliance', 'Legal affairs and regulatory compliance'),
    ('IT', 'Information Technology and systems'),
    ('Records Management', 'Document and records management')
ON CONFLICT (name) DO NOTHING; 