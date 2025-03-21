-- Drop temporary columns if they exist
ALTER TABLE "files" DROP COLUMN IF EXISTS "new_id";
ALTER TABLE "users" DROP COLUMN IF EXISTS "new_id";
ALTER TABLE "departments" DROP COLUMN IF EXISTS "new_id";
ALTER TABLE "file_tags" DROP COLUMN IF EXISTS "new_id";
ALTER TABLE "shared_files" DROP COLUMN IF EXISTS "new_id";

-- Drop foreign key constraints with CASCADE
ALTER TABLE "file_tags" DROP CONSTRAINT IF EXISTS "file_tags_file_id_files_id_fk" CASCADE;
ALTER TABLE "ocr_results" DROP CONSTRAINT IF EXISTS "ocr_results_file_id_files_id_fk" CASCADE;
ALTER TABLE "shared_files" DROP CONSTRAINT IF EXISTS "shared_files_file_id_files_id_fk" CASCADE;
ALTER TABLE "shared_files" DROP CONSTRAINT IF EXISTS "shared_files_shared_with_user_id_users_id_fk" CASCADE;
ALTER TABLE "shared_files" DROP CONSTRAINT IF EXISTS "shared_files_shared_by_user_id_users_id_fk" CASCADE;
ALTER TABLE "files" DROP CONSTRAINT IF EXISTS "files_user_id_users_id_fk" CASCADE;
ALTER TABLE "files" DROP CONSTRAINT IF EXISTS "files_department_id_departments_id_fk" CASCADE;
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_department_id_departments_id_fk" CASCADE;
ALTER TABLE "activity_logs" DROP CONSTRAINT IF EXISTS "activity_logs_user_id_users_id_fk" CASCADE;
ALTER TABLE "sessions" DROP CONSTRAINT IF EXISTS "sessions_user_id_users_id_fk" CASCADE;

-- Drop primary key constraints with CASCADE
ALTER TABLE "files" DROP CONSTRAINT IF EXISTS "files_pkey" CASCADE;
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_pkey" CASCADE;
ALTER TABLE "departments" DROP CONSTRAINT IF EXISTS "departments_pkey" CASCADE;
ALTER TABLE "file_tags" DROP CONSTRAINT IF EXISTS "file_tags_pkey" CASCADE;
ALTER TABLE "shared_files" DROP CONSTRAINT IF EXISTS "shared_files_pkey" CASCADE;

-- Create temporary columns with UUID type
ALTER TABLE "files" ADD COLUMN "new_id" uuid DEFAULT gen_random_uuid();
ALTER TABLE "users" ADD COLUMN "new_id" uuid DEFAULT gen_random_uuid();
ALTER TABLE "departments" ADD COLUMN "new_id" uuid DEFAULT gen_random_uuid();
ALTER TABLE "file_tags" ADD COLUMN "new_id" uuid DEFAULT gen_random_uuid();
ALTER TABLE "shared_files" ADD COLUMN "new_id" uuid DEFAULT gen_random_uuid();

-- Drop the old id columns
ALTER TABLE "files" DROP COLUMN IF EXISTS "id";
ALTER TABLE "users" DROP COLUMN IF EXISTS "id";
ALTER TABLE "departments" DROP COLUMN IF EXISTS "id";
ALTER TABLE "file_tags" DROP COLUMN IF EXISTS "id";
ALTER TABLE "shared_files" DROP COLUMN IF EXISTS "id";

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

-- Create new tables with UUID columns
CREATE TABLE "departments_new" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "users_new" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" text NOT NULL,
  "name" text,
  "department_id" uuid REFERENCES "departments_new" ("id"),
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "files_new" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "path" text NOT NULL,
  "size" bigint NOT NULL,
  "type" text NOT NULL,
  "user_id" uuid REFERENCES "users_new" ("id"),
  "department_id" uuid REFERENCES "departments_new" ("id"),
  "allocated_storage" bigint DEFAULT 0,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "file_tags_new" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "file_id" uuid REFERENCES "files_new" ("id"),
  "tag" text NOT NULL,
  "category" text NOT NULL,
  "confidence" real,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "shared_files_new" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "file_id" uuid REFERENCES "files_new" ("id"),
  "shared_by_user_id" uuid REFERENCES "users_new" ("id"),
  "shared_with_user_id" uuid REFERENCES "users_new" ("id"),
  "permission" text NOT NULL,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "activity_logs_new" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid REFERENCES "users_new" ("id"),
  "action" text NOT NULL,
  "details" text,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "sessions_new" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid REFERENCES "users_new" ("id"),
  "expires" timestamp NOT NULL,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "ocr_results_new" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "file_id" uuid REFERENCES "files_new" ("id"),
  "text" text NOT NULL,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);

-- Insert data into new tables
INSERT INTO "departments_new" ("name", "created_at", "updated_at")
SELECT "name", "created_at", "updated_at"
FROM "departments";

INSERT INTO "users_new" ("email", "name", "department_id", "created_at", "updated_at")
SELECT u."email", u."name", d."id", u."created_at", u."updated_at"
FROM "users" u
LEFT JOIN "departments_new" d ON d."name" = (
  SELECT "name" FROM "departments" WHERE "id" = u."department_id"
);

INSERT INTO "files_new" ("name", "path", "size", "type", "user_id", "department_id", "allocated_storage", "created_at", "updated_at")
SELECT f."name", f."path", f."size", f."type", u."id", d."id", f."allocated_storage", f."created_at", f."updated_at"
FROM "files" f
LEFT JOIN "users_new" u ON u."email" = (
  SELECT "email" FROM "users" WHERE "id" = f."user_id"
)
LEFT JOIN "departments_new" d ON d."name" = (
  SELECT "name" FROM "departments" WHERE "id" = f."department_id"
);

INSERT INTO "file_tags_new" ("file_id", "tag", "category", "confidence", "created_at", "updated_at")
SELECT f."id", ft."tag", ft."category", ft."confidence", ft."created_at", ft."updated_at"
FROM "file_tags" ft
JOIN "files_new" f ON f."name" = (
  SELECT "name" FROM "files" WHERE "id" = ft."file_id"
);

INSERT INTO "shared_files_new" ("file_id", "shared_by_user_id", "shared_with_user_id", "permission", "created_at", "updated_at")
SELECT f."id", u1."id", u2."id", sf."permission", sf."created_at", sf."updated_at"
FROM "shared_files" sf
JOIN "files_new" f ON f."name" = (
  SELECT "name" FROM "files" WHERE "id" = sf."file_id"
)
JOIN "users_new" u1 ON u1."email" = (
  SELECT "email" FROM "users" WHERE "id" = sf."shared_by_user_id"
)
JOIN "users_new" u2 ON u2."email" = (
  SELECT "email" FROM "users" WHERE "id" = sf."shared_with_user_id"
);

INSERT INTO "activity_logs_new" ("user_id", "action", "details", "created_at")
SELECT u."id", al."action", al."details", al."created_at"
FROM "activity_logs" al
JOIN "users_new" u ON u."email" = (
  SELECT "email" FROM "users" WHERE "id" = al."user_id"
);

INSERT INTO "sessions_new" ("user_id", "expires", "created_at")
SELECT u."id", s."expires", s."created_at"
FROM "sessions" s
JOIN "users_new" u ON u."email" = (
  SELECT "email" FROM "users" WHERE "id" = s."user_id"
);

INSERT INTO "ocr_results_new" ("file_id", "text", "created_at")
SELECT f."id", ocr."text", ocr."created_at"
FROM "ocr_results" ocr
JOIN "files_new" f ON f."name" = (
  SELECT "name" FROM "files" WHERE "id" = ocr."file_id"
);

-- Drop old tables
DROP TABLE IF EXISTS "ocr_results";
DROP TABLE IF EXISTS "sessions";
DROP TABLE IF EXISTS "activity_logs";
DROP TABLE IF EXISTS "shared_files";
DROP TABLE IF EXISTS "file_tags";
DROP TABLE IF EXISTS "files";
DROP TABLE IF EXISTS "users";
DROP TABLE IF EXISTS "departments";

-- Rename new tables
ALTER TABLE "departments_new" RENAME TO "departments";
ALTER TABLE "users_new" RENAME TO "users";
ALTER TABLE "files_new" RENAME TO "files";
ALTER TABLE "file_tags_new" RENAME TO "file_tags";
ALTER TABLE "shared_files_new" RENAME TO "shared_files";
ALTER TABLE "activity_logs_new" RENAME TO "activity_logs";
ALTER TABLE "sessions_new" RENAME TO "sessions";
ALTER TABLE "ocr_results_new" RENAME TO "ocr_results"; 