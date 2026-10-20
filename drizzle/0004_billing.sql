CREATE TABLE "billing_event" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "subscription" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"asaas_customer_id" text NOT NULL,
	"asaas_subscription_id" text NOT NULL,
	"plan" text NOT NULL,
	"cycle" text NOT NULL,
	"status" text NOT NULL,
	"period_end" timestamp with time zone,
	"overdue_since" timestamp with time zone,
	"scheduled_plan" text,
	"invoice_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "subscription_asaas_subscription_id_unique" UNIQUE("asaas_subscription_id")
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "complimentary" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;