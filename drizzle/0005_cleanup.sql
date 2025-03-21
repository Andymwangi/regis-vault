-- Drop temporary columns if they exist
ALTER TABLE "files" DROP COLUMN IF EXISTS "new_id";
ALTER TABLE "users" DROP COLUMN IF EXISTS "new_id";
ALTER TABLE "departments" DROP COLUMN IF EXISTS "new_id";
ALTER TABLE "file_tags" DROP COLUMN IF EXISTS "new_id";
ALTER TABLE "shared_files" DROP COLUMN IF EXISTS "new_id"; 