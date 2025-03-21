CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"description" text NOT NULL,
	"metadata" json,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"id" serial PRIMARY KEY NOT NULL,
	"endpoint" varchar(255) NOT NULL,
	"max_requests" integer NOT NULL,
	"window_ms" integer NOT NULL,
	"description" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" varchar(255) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"last_activity" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(255) NOT NULL,
	"value" json NOT NULL,
	"description" text,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "users" RENAME COLUMN "department" TO "department_id";--> statement-breakpoint
ALTER TABLE "file_tags" DROP CONSTRAINT "file_tags_tag_id_tags_id_fk";
--> statement-breakpoint
ALTER TABLE "shared_files" DROP CONSTRAINT "shared_files_shared_with_department_id_departments_id_fk";
--> statement-breakpoint
ALTER TABLE "departments" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "departments" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "departments" ALTER COLUMN "name" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "file_tags" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "file_tags" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "file_tags" ALTER COLUMN "file_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "file_tags" ALTER COLUMN "file_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "department_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "status" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "shared_files" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "shared_files" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "shared_files" ALTER COLUMN "file_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "shared_files" ALTER COLUMN "file_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "shared_files" ALTER COLUMN "shared_with_user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "shared_files" ALTER COLUMN "shared_with_user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "first_name" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "last_name" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "status" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "departments" ADD COLUMN "allocated_storage" bigint DEFAULT 0;--> statement-breakpoint
ALTER TABLE "departments" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "file_tags" ADD COLUMN "tag" varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE "file_tags" ADD COLUMN "category" varchar(50) DEFAULT 'other' NOT NULL;--> statement-breakpoint
ALTER TABLE "file_tags" ADD COLUMN "confidence" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "file_tags" ADD COLUMN "created_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "file_tags" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "shared_files" ADD COLUMN "shared_by_user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "shared_files" ADD COLUMN "permission" varchar(50) DEFAULT 'view' NOT NULL;--> statement-breakpoint
ALTER TABLE "shared_files" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_files" ADD CONSTRAINT "shared_files_shared_by_user_id_users_id_fk" FOREIGN KEY ("shared_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_tags" DROP COLUMN "tag_id";--> statement-breakpoint
ALTER TABLE "files" DROP COLUMN "path";--> statement-breakpoint
ALTER TABLE "files" DROP COLUMN "is_public";--> statement-breakpoint
ALTER TABLE "files" DROP COLUMN "is_deleted";--> statement-breakpoint
ALTER TABLE "files" DROP COLUMN "last_modified";--> statement-breakpoint
ALTER TABLE "shared_files" DROP COLUMN "shared_with_department_id";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "password_hash";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "phone_number";