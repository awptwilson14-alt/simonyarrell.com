import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Admin-managed promo / comp codes.
 *
 * The 4 launch codes (MAISON20/30/50, DIAMONDHOUSE) live in
 * artifacts/mobile/lib/promoCodes.ts as offline built-ins. THIS table holds
 * the codes the owner creates/edits in the in-app admin screen, so they take
 * effect for every customer's device (redemption falls back to /promo/lookup
 * after a built-in miss).
 *
 *   • kind="percent_off" → `percent` set (1..100), `tier` null
 *   • kind="grant_tier"  → `tier` set (a TierId), `percent` null
 */
export const promoCodes = pgTable("promo_codes", {
  id: serial("id").primaryKey(),
  /** Normalized (uppercase, no spaces) code the user types. */
  code: text("code").notNull().unique(),
  /** "percent_off" | "grant_tier" */
  kind: text("kind").notNull(),
  /** Discount percent for percent_off codes (null otherwise). */
  percent: integer("percent"),
  /** Granted TierId for grant_tier codes (null otherwise). */
  tier: text("tier"),
  /** Human-readable description shown in the active-promo banner + admin list. */
  label: text("label").notNull(),
  /** Inactive codes are hidden from lookup (cannot be redeemed). */
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const insertPromoCodeSchema = createInsertSchema(promoCodes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type PromoCodeRow = typeof promoCodes.$inferSelect;
export type InsertPromoCode = z.infer<typeof insertPromoCodeSchema>;
