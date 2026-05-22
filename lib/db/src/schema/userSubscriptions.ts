import { pgTable, serial, text, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userSubscriptions = pgTable(
  "user_subscriptions",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull().unique(),
    tier: text("tier").notNull(),
    status: text("status").notNull().default("active"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    userIdx: index("user_subscriptions_user_idx").on(t.userId),
  }),
);

export const insertUserSubscriptionSchema = createInsertSchema(
  userSubscriptions,
).omit({ id: true, updatedAt: true });

export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertUserSubscription = z.infer<
  typeof insertUserSubscriptionSchema
>;
