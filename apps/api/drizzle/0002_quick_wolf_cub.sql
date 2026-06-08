CREATE TABLE "daily_push_log" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"day_key" text NOT NULL,
	"sent_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "daily_push_kind_day_idx" ON "daily_push_log" USING btree ("kind","day_key");