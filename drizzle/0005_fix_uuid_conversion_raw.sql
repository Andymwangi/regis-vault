-- Drop foreign key constraints first
ALTER TABLE "file_tags" DROP CONSTRAINT IF EXISTS "file_tags_file_id_files_id_fk";
ALTER TABLE "ocr_results" DROP CONSTRAINT IF EXISTS "ocr_results_file_id_files_id_fk";
ALTER TABLE "shared_files" DROP CONSTRAINT IF EXISTS "shared_files_file_id_files_id_fk";
ALTER TABLE "shared_files" DROP CONSTRAINT IF EXISTS "shared_files_shared_with_user_id_users_id_fk";
ALTER TABLE "shared_files" DROP CONSTRAINT IF EXISTS "shared_files_shared_by_user_id_users_id_fk";
ALTER TABLE "files" DROP CONSTRAINT IF EXISTS "files_user_id_users_id_fk";
ALTER TABLE "files" DROP CONSTRAINT IF EXISTS "files_department_id_departments_id_fk";
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_department_id_departments_id_fk";
ALTER TABLE "activity_logs" DROP CONSTRAINT IF EXISTS "activity_logs_user_id_users_id_fk";
ALTER TABLE "sessions" DROP CONSTRAINT IF EXISTS "sessions_user_id_users_id_fk";

-- First, create temporary columns with UUID type
ALTER TABLE "files" ADD COLUMN "new_id" uuid DEFAULT gen_random_uuid();
ALTER TABLE "users" ADD COLUMN "new_id" uuid DEFAULT gen_random_uuid();
ALTER TABLE "departments" ADD COLUMN "new_id" uuid DEFAULT gen_random_uuid();
ALTER TABLE "file_tags" ADD COLUMN "new_id" uuid DEFAULT gen_random_uuid();
ALTER TABLE "shared_files" ADD COLUMN "new_id" uuid DEFAULT gen_random_uuid();

-- Drop the old primary key constraints
ALTER TABLE "files" DROP CONSTRAINT "files_pkey";
ALTER TABLE "users" DROP CONSTRAINT "users_pkey";
ALTER TABLE "departments" DROP CONSTRAINT "departments_pkey";
ALTER TABLE "file_tags" DROP CONSTRAINT "file_tags_pkey";
ALTER TABLE "shared_files" DROP CONSTRAINT "shared_files_pkey";

-- Drop the old id columns
ALTER TABLE "files" DROP COLUMN "id";
ALTER TABLE "users" DROP COLUMN "id";
ALTER TABLE "departments" DROP COLUMN "id";
ALTER TABLE "file_tags" DROP COLUMN "id";
ALTER TABLE "shared_files" DROP COLUMN "id";

-- Rename the new columns to id
ALTER TABLE "files" RENAME COLUMN "new_id" TO "id";
ALTER TABLE "users" RENAME COLUMN "new_id" TO "id";
ALTER TABLE "departments" RENAME COLUMN "new_id" TO "id";
ALTER TABLE "file_tags" RENAME COLUMN "new_id" TO "id";
ALTER TABLE "shared_files" RENAME COLUMN "new_id" TO "id";

-- Add primary key constraints
ALTER TABLE "files" ADD PRIMARY KEY ("id");
ALTER TABLE "users" ADD PRIMARY KEY ("id");
ALTER TABLE "departments" ADD PRIMARY KEY ("id");
ALTER TABLE "file_tags" ADD PRIMARY KEY ("id");
ALTER TABLE "shared_files" ADD PRIMARY KEY ("id");

-- Update foreign key references
ALTER TABLE "files" 
  ALTER COLUMN "user_id" TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN "department_id" TYPE uuid USING gen_random_uuid();

ALTER TABLE "file_tags" 
  ALTER COLUMN "file_id" TYPE uuid USING gen_random_uuid();

ALTER TABLE "shared_files" 
  ALTER COLUMN "file_id" TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN "shared_by_user_id" TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN "shared_with_user_id" TYPE uuid USING gen_random_uuid();

ALTER TABLE "users" 
  ALTER COLUMN "department_id" TYPE uuid USING gen_random_uuid();

ALTER TABLE "activity_logs" 
  ALTER COLUMN "user_id" TYPE uuid USING gen_random_uuid();

ALTER TABLE "sessions" 
  ALTER COLUMN "user_id" TYPE uuid USING gen_random_uuid();

-- Re-add foreign key constraints
ALTER TABLE "file_tags" ADD CONSTRAINT "file_tags_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "files" ("id");
ALTER TABLE "ocr_results" ADD CONSTRAINT "ocr_results_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "files" ("id");
ALTER TABLE "shared_files" ADD CONSTRAINT "shared_files_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "files" ("id");
ALTER TABLE "shared_files" ADD CONSTRAINT "shared_files_shared_with_user_id_users_id_fk" FOREIGN KEY ("shared_with_user_id") REFERENCES "users" ("id");
ALTER TABLE "shared_files" ADD CONSTRAINT "shared_files_shared_by_user_id_users_id_fk" FOREIGN KEY ("shared_by_user_id") REFERENCES "users" ("id");
ALTER TABLE "files" ADD CONSTRAINT "files_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users" ("id");
ALTER TABLE "files" ADD CONSTRAINT "files_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "departments" ("id");
ALTER TABLE "users" ADD CONSTRAINT "users_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "departments" ("id");
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users" ("id");
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users" ("id"); 