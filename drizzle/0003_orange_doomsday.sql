ALTER TABLE "activity_logs" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "departments" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "departments" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "departments" ALTER COLUMN "allocated_storage" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "file_tags" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "file_tags" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "file_tags" ALTER COLUMN "file_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "ocr_results" ALTER COLUMN "file_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "user_id" SET DATA TYPE integer;