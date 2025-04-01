-- Drop the function and associated triggers
DROP FUNCTION IF EXISTS copy_password_to_hash() CASCADE;
        
-- Recreate the function with proper text type handling
CREATE OR REPLACE FUNCTION copy_password_to_hash()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.password IS NOT NULL AND NEW.password <> '' THEN
        -- Use explicit casting to handle text/varchar type differences
        NEW.password := NEW.password::text;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
        
-- Recreate the trigger with proper handling
CREATE TRIGGER password_hash_trigger
BEFORE INSERT OR UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION copy_password_to_hash(); 