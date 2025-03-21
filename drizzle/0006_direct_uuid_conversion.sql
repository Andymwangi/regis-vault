-- First, ensure we have the uuid-ossp extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create missing tables if they don't exist
CREATE TABLE IF NOT EXISTS "departments" (
  "id" serial PRIMARY KEY,
  "name" text NOT NULL,
  "description" text,
  "allocated_storage" bigint DEFAULT 0,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "users" (
  "id" serial PRIMARY KEY,
  "email" text NOT NULL,
  "first_name" varchar(255) NOT NULL,
  "last_name" varchar(255) NOT NULL,
  "password" varchar(255) NOT NULL,
  "department_id" integer REFERENCES "departments" ("id"),
  "role" varchar(50) NOT NULL DEFAULT 'user',
  "status" varchar(50) NOT NULL DEFAULT 'active',
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "files" (
  "id" serial PRIMARY KEY,
  "name" varchar(255) NOT NULL,
  "type" varchar(50) NOT NULL,
  "size" integer NOT NULL,
  "url" varchar(255) NOT NULL,
  "thumbnail_url" varchar(255),
  "user_id" integer REFERENCES "users" ("id") NOT NULL,
  "department_id" integer REFERENCES "departments" ("id"),
  "status" varchar(50) NOT NULL DEFAULT 'active',
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "file_tags" (
  "id" serial PRIMARY KEY,
  "file_id" integer REFERENCES "files" ("id") NOT NULL,
  "tag" varchar(100) NOT NULL,
  "category" varchar(50) NOT NULL DEFAULT 'other',
  "confidence" decimal(5,2),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "shared_files" (
  "id" serial PRIMARY KEY,
  "file_id" integer REFERENCES "files" ("id") NOT NULL,
  "shared_by_user_id" integer REFERENCES "users" ("id") NOT NULL,
  "shared_with_user_id" integer REFERENCES "users" ("id") NOT NULL,
  "permission" varchar(50) NOT NULL DEFAULT 'view',
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ocr_results" (
  "id" serial PRIMARY KEY,
  "file_id" integer REFERENCES "files" ("id") NOT NULL,
  "text" text NOT NULL,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "activity_logs" (
  "id" serial PRIMARY KEY,
  "user_id" integer REFERENCES "users" ("id") NOT NULL,
  "type" varchar(50) NOT NULL,
  "description" text NOT NULL,
  "metadata" json,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "sessions" (
  "id" serial PRIMARY KEY,
  "user_id" integer REFERENCES "users" ("id") NOT NULL,
  "token" varchar(255) NOT NULL,
  "active" boolean NOT NULL DEFAULT true,
  "last_activity" timestamp DEFAULT now(),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Drop default values and constraints
ALTER TABLE "files" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "departments" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "file_tags" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "shared_files" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "ocr_results" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "activity_logs" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "sessions" ALTER COLUMN "id" DROP DEFAULT;

-- Drop foreign key constraints
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

-- Drop primary key constraints
ALTER TABLE "files" DROP CONSTRAINT IF EXISTS "files_pkey";
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_pkey";
ALTER TABLE "departments" DROP CONSTRAINT IF EXISTS "departments_pkey";
ALTER TABLE "file_tags" DROP CONSTRAINT IF EXISTS "file_tags_pkey";
ALTER TABLE "shared_files" DROP CONSTRAINT IF EXISTS "shared_files_pkey";
ALTER TABLE "ocr_results" DROP CONSTRAINT IF EXISTS "ocr_results_pkey";
ALTER TABLE "activity_logs" DROP CONSTRAINT IF EXISTS "activity_logs_pkey";
ALTER TABLE "sessions" DROP CONSTRAINT IF EXISTS "sessions_pkey";

-- Convert id columns to UUID type
ALTER TABLE "files" 
  ALTER COLUMN "id" TYPE uuid USING uuid_generate_v4(),
  ALTER COLUMN "user_id" TYPE uuid USING uuid_generate_v4(),
  ALTER COLUMN "department_id" TYPE uuid USING uuid_generate_v4();

ALTER TABLE "users" 
  ALTER COLUMN "id" TYPE uuid USING uuid_generate_v4(),
  ALTER COLUMN "department_id" TYPE uuid USING uuid_generate_v4();

ALTER TABLE "departments" 
  ALTER COLUMN "id" TYPE uuid USING uuid_generate_v4();

ALTER TABLE "file_tags" 
  ALTER COLUMN "id" TYPE uuid USING uuid_generate_v4(),
  ALTER COLUMN "file_id" TYPE uuid USING uuid_generate_v4();

-- Update shared_files table
ALTER TABLE "shared_files" 
  ALTER COLUMN "id" TYPE uuid USING uuid_generate_v4(),
  ALTER COLUMN "file_id" TYPE uuid USING uuid_generate_v4(),
  ALTER COLUMN "shared_with_user_id" TYPE uuid USING uuid_generate_v4();

-- Update shared_by_user_id to UUID
ALTER TABLE "shared_files" 
  ALTER COLUMN "shared_by_user_id" TYPE uuid USING uuid_generate_v4();

ALTER TABLE "ocr_results" 
  ALTER COLUMN "id" TYPE uuid USING uuid_generate_v4(),
  ALTER COLUMN "file_id" TYPE uuid USING uuid_generate_v4();

ALTER TABLE "activity_logs" 
  ALTER COLUMN "id" TYPE uuid USING uuid_generate_v4(),
  ALTER COLUMN "user_id" TYPE uuid USING uuid_generate_v4();

ALTER TABLE "sessions" 
  ALTER COLUMN "id" TYPE uuid USING uuid_generate_v4(),
  ALTER COLUMN "user_id" TYPE uuid USING uuid_generate_v4();

-- Add default values for new rows
ALTER TABLE "files" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
ALTER TABLE "departments" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
ALTER TABLE "file_tags" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
ALTER TABLE "shared_files" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
ALTER TABLE "ocr_results" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
ALTER TABLE "activity_logs" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
ALTER TABLE "sessions" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();

-- Re-add primary key constraints
ALTER TABLE "files" ADD PRIMARY KEY ("id");
ALTER TABLE "users" ADD PRIMARY KEY ("id");
ALTER TABLE "departments" ADD PRIMARY KEY ("id");
ALTER TABLE "file_tags" ADD PRIMARY KEY ("id");
ALTER TABLE "shared_files" ADD PRIMARY KEY ("id");
ALTER TABLE "ocr_results" ADD PRIMARY KEY ("id");
ALTER TABLE "activity_logs" ADD PRIMARY KEY ("id");
ALTER TABLE "sessions" ADD PRIMARY KEY ("id");

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