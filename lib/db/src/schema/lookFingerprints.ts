import { pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

/**
 * GLOBAL look-combination registry — the cross-user "never generate the same
 * look twice" memory. Every fingerprint (sorted product-key combo) that any
 * client has ever shown is burned here; clients hydrate this set on startup
 * and register new combos after generating, so a combination shown to ONE
 * user can never be produced again for ANY user.
 *
 * Complements (does not replace) the per-device AsyncStorage mirror in the
 * mobile app, which keeps working offline.
 */
export const lookFingerprints = pgTable(
  "look_fingerprints",
  {
    id: serial("id").primaryKey(),
    fingerprint: text("fingerprint").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    fingerprintUq: uniqueIndex("look_fingerprints_fingerprint_uq").on(
      t.fingerprint,
    ),
  }),
);

export type LookFingerprint = typeof lookFingerprints.$inferSelect;
