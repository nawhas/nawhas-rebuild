ALTER TABLE "user" ADD COLUMN "username" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "trust_level" text DEFAULT 'new' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "access_requests" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "access_requests" ADD COLUMN "withdrawn_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "access_requests" ADD COLUMN "notified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "notified_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_idx" ON "user" USING btree (lower("username"));--> statement-breakpoint
CREATE INDEX "access_requests_pending_unnotified_idx" ON "access_requests" USING btree ("created_at") WHERE status = 'pending' AND notified_at IS NULL;--> statement-breakpoint
CREATE INDEX "submissions_pending_unnotified_idx" ON "submissions" USING btree ("created_at") WHERE status = 'pending' AND notified_at IS NULL;