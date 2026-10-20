import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { timestamps, user } from "./auth";

// One Asaas subscription per account; plan/cycle/status follow src/lib/billing-rules.ts.
export const subscription = pgTable("subscription", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  asaasCustomerId: text("asaas_customer_id").notNull(),
  asaasSubscriptionId: text("asaas_subscription_id").notNull().unique(),
  plan: text("plan").notNull(),
  cycle: text("cycle").notNull(),
  status: text("status").notNull(),
  periodEnd: timestamp("period_end", { withTimezone: true }),
  overdueSince: timestamp("overdue_since", { withTimezone: true }),
  // Plan change applied at the next renewal.
  scheduledPlan: text("scheduled_plan"),
  // URL of the customer's currently open charge: set at checkout, refreshed on later events.
  invoiceUrl: text("invoice_url"),
  ...timestamps,
});

// Processed Asaas webhook events, keyed by the Asaas event id for idempotency.
export const billingEvent = pgTable("billing_event", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
});

export type Subscription = typeof subscription.$inferSelect;
export type NewSubscription = typeof subscription.$inferInsert;
export type BillingEvent = typeof billingEvent.$inferSelect;
