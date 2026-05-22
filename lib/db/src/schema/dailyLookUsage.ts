import {
  pgTable,
  serial,
  text,
  integer,
  date,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const dailyLookUsage = pgTable(
  "daily_look_usage",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    date: date("date").notNull(),
    looksGenerated: integer("looks_generated").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    userDateUq: uniqueIndex("daily_look_usage_user_date_uq").on(
      t.userId,
      t.date,
    ),
  }),
);

export const insertDailyLookUsageSchema = createInsertSchema(
  dailyLookUsage,
).omit({ id: true, updatedAt: true });

export type DailyLookUsage = typeof dailyLookUsage.$inferSelect;
export type InsertDailyLookUsage = z.infer<typeof insertDailyLookUsageSchema>;
