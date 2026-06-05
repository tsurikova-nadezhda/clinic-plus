CREATE TABLE "sent_reminders" (
	"id" text PRIMARY KEY NOT NULL,
	"activity_id" text NOT NULL,
	"minutes_before" integer NOT NULL,
	"sent_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "sent_reminders" ADD CONSTRAINT "sent_reminders_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sent_reminders_activity_min_idx" ON "sent_reminders" USING btree ("activity_id","minutes_before");