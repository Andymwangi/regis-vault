-- First, ensure we have the uuid-ossp extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create a temporary table with UUID
CREATE TABLE "activity_logs_new" (
  "id" SERIAL PRIMARY KEY,
  "user_id" uuid REFERENCES "users"("id") NOT NULL,
  "action" varchar(255) NOT NULL,
  "details" text,
  "created_at" timestamp DEFAULT now()
);

-- Copy data from old table to new table
INSERT INTO "activity_logs_new" ("user_id", "action", "details", "created_at")
SELECT "user_id", "action", "details", "created_at"
FROM "activity_logs";

-- Drop the old table
DROP TABLE "activity_logs";

-- Rename the new table to the original name
ALTER TABLE "activity_logs_new" RENAME TO "activity_logs"; 