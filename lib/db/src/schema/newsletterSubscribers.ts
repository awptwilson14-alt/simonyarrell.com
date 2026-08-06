import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Newsletter signups from the "Stay Ahead of Luxury Fashion" landing section.
 * Emails are normalized (trimmed, lowercased) before insert; the unique index
 * on `email` makes re-subscribes idempotent.
 */
export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: serial("id").primaryKey(),
  /** Normalized (trimmed, lowercase) email address. */
  email: text("email").notNull().unique(),
  /** Where the signup came from (e.g. "landing"). */
  source: text("source"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const insertNewsletterSubscriberSchema = createInsertSchema(
  newsletterSubscribers,
).omit({ id: true, createdAt: true });

export type NewsletterSubscriberRow = typeof newsletterSubscribers.$inferSelect;
export type InsertNewsletterSubscriber = z.infer<
  typeof insertNewsletterSubscriberSchema
>;
