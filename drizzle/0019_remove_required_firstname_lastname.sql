-- Make first_name and last_name columns nullable
ALTER TABLE "users" ALTER COLUMN "first_name" DROP NOT NULL;
ALTER TABLE "users" ALTER COLUMN "last_name" DROP NOT NULL;

-- Ensure name column is properly populated for all users
UPDATE "users" SET "name" = "first_name" || ' ' || "last_name" WHERE "name" IS NULL; 