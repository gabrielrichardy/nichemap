CREATE TABLE "profile_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"taken_on" date NOT NULL,
	"followers" integer NOT NULL,
	"media_count" integer NOT NULL,
	"engagement_pct" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "profile_snapshots_username_taken_on_idx" ON "profile_snapshots" USING btree ("username","taken_on");