-- First, create temporary columns with UUID type
ALTER TABLE "files" ADD COLUMN "new_id" uuid;
ALTER TABLE "users" ADD COLUMN "new_id" uuid;
ALTER TABLE "departments" ADD COLUMN "new_id" uuid;
ALTER TABLE "file_tags" ADD COLUMN "new_id" uuid;
ALTER TABLE "shared_files" ADD COLUMN "new_id" uuid;

-- Update the new columns with UUID values
UPDATE "files" SET "new_id" = gen_random_uuid();
UPDATE "users" SET "new_id" = gen_random_uuid();
UPDATE "departments" SET "new_id" = gen_random_uuid();
UPDATE "file_tags" SET "new_id" = gen_random_uuid();
UPDATE "shared_files" SET "new_id" = gen_random_uuid();

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

-- Set default values
ALTER TABLE "files" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "departments" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "file_tags" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "shared_files" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- Update foreign key references
ALTER TABLE "files" ALTER COLUMN "user_id" TYPE uuid USING (gen_random_uuid());
ALTER TABLE "files" ALTER COLUMN "department_id" TYPE uuid USING (gen_random_uuid());
ALTER TABLE "file_tags" ALTER COLUMN "file_id" TYPE uuid USING (gen_random_uuid());
ALTER TABLE "shared_files" ALTER COLUMN "file_id" TYPE uuid USING (gen_random_uuid());
ALTER TABLE "shared_files" ALTER COLUMN "shared_by_user_id" TYPE uuid USING (gen_random_uuid());
ALTER TABLE "shared_files" ALTER COLUMN "shared_with_user_id" TYPE uuid USING (gen_random_uuid());
ALTER TABLE "users" ALTER COLUMN "department_id" TYPE uuid USING (gen_random_uuid());
ALTER TABLE "activity_logs" ALTER COLUMN "user_id" TYPE uuid USING (gen_random_uuid());
ALTER TABLE "sessions" ALTER COLUMN "user_id" TYPE uuid USING (gen_random_uuid()); 