ALTER TABLE "files" ADD COLUMN "url" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "thumbnail_url" varchar(255);--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "status" varchar(20) DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "last_modified" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_url" varchar(255);