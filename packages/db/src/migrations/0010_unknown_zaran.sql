CREATE TABLE "access_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"reason" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by" text,
	"review_comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reciters" ADD COLUMN "arabic_name" text;--> statement-breakpoint
ALTER TABLE "reciters" ADD COLUMN "country" text;--> statement-breakpoint
ALTER TABLE "reciters" ADD COLUMN "birth_year" integer;--> statement-breakpoint
ALTER TABLE "reciters" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "reciters" ADD COLUMN "avatar_url" text;--> statement-breakpoint
ALTER TABLE "albums" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "moderator_notes" text;--> statement-breakpoint
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "access_requests_user_id_idx" ON "access_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "access_requests_status_idx" ON "access_requests" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "access_requests_one_pending_per_user" ON "access_requests" USING btree ("user_id") WHERE status = 'pending';