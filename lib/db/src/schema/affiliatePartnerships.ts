import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Affiliate partnerships — one row per retailer/network relationship. The
 * SOURCE OF TRUTH for who can monetize what; product-table affiliate fields
 * are cache fields only. Maintained by the owner via the admin endpoints in
 * `routes/affiliate.ts`.
 *
 * RULES (Rakuten / central-resolver spec):
 * - Only rows with status "active" may generate an affiliate link. Pending /
 *   applied / rejected / expired / suspended / unavailable / not_partnered
 *   are NEVER treated as active.
 * - `deepLinkTemplate` must be an AUTHORIZED tracking-link template taken
 *   from the network's own deep-link tools (e.g. Rakuten Advertising's link
 *   generator), with the literal placeholder {url} where the encoded
 *   destination PDP belongs. The system never constructs or guesses tracking
 *   URLs, advertiser IDs, offer IDs, MIDs, or parameters.
 * - `priority` is the configurable resolver order (lower wins). Ties fall
 *   back to the default network order: direct → rakuten → awin → impact →
 *   cj → skimlinks.
 * - `commissionRate` is informational for the admin dashboard ONLY. It must
 *   never feed the styling/ranking engine.
 */
export const affiliatePartnerships = pgTable(
  "affiliate_partnerships",
  {
    id: serial("id").primaryKey(),
    /** Retailer hostname key, lowercase, no www — e.g. "mrporter.com". */
    retailer: text("retailer").notNull(),
    /** Network paying commission: direct | rakuten | awin | impact | cj | skimlinks | ... */
    network: text("network").notNull(),
    /** Network-assigned advertiser identifier (informational, from the network UI). */
    advertiserId: text("advertiser_id"),
    /** active | pending | applied | rejected | expired | suspended | unavailable | not_partnered */
    status: text("status").notNull().default("pending"),
    /** Informational only — NEVER used by the styling engine. Percent, e.g. "7.5". */
    commissionRate: numeric("commission_rate", { precision: 5, scale: 2 }),
    /** Attribution cookie window in days (informational). */
    cookieWindowDays: integer("cookie_window_days"),
    /** Resolver priority — lower wins. Default 100 = use network default order. */
    priority: integer("priority").notNull().default(100),
    /** ISO country code this relationship covers; null = all countries. */
    country: text("country"),
    /** Whether the network allows deep-linking for this advertiser. */
    deepLinkEnabled: boolean("deep_link_enabled").notNull().default(true),
    /** Whether a product feed is available (feed importer, informational). */
    productFeedEnabled: boolean("product_feed_enabled").notNull().default(false),
    /** Whether a server API integration is configured for this network. */
    apiEnabled: boolean("api_enabled").notNull().default(false),
    /** Relationship validity window; null = open-ended. */
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    /** Authorized tracking-link template containing {url}. Null ⇒ cannot monetize. */
    deepLinkTemplate: text("deep_link_template"),
    /** When the owner last verified the relationship in the network dashboard. */
    lastAffiliateCheck: timestamp("last_affiliate_check", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    retailerNetworkUq: uniqueIndex("affiliate_partnerships_retailer_network_uq").on(
      t.retailer,
      t.network,
    ),
  }),
);

export type AffiliatePartnershipRow = typeof affiliatePartnerships.$inferSelect;

/**
 * Affiliate link cache — one row per generated monetized link. The original
 * URL is NEVER overwritten; the affiliate URL is regenerable at any time from
 * the partnership template. `clickCount` powers cheap per-link stats and the
 * background validator can expire rows (`status` = "expired") when the
 * backing partnership stops being active.
 */
export const affiliateLinks = pgTable(
  "affiliate_links",
  {
    id: serial("id").primaryKey(),
    /** affiliate_products.id when the product exists in the product DB. */
    productId: integer("product_id"),
    /** Retailer hostname key (matches affiliate_partnerships.retailer). */
    retailer: text("retailer").notNull(),
    network: text("network").notNull(),
    advertiserId: text("advertiser_id"),
    originalUrl: text("original_url").notNull(),
    affiliateUrl: text("affiliate_url").notNull(),
    /** active | expired */
    status: text("status").notNull().default("active"),
    generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    clickCount: integer("click_count").notNull().default(0),
  },
  (t) => ({
    // The resolver looks up by exact original URL + network.
    originalNetworkUq: uniqueIndex("affiliate_links_original_network_uq").on(
      t.originalUrl,
      t.network,
    ),
    retailerIdx: index("affiliate_links_retailer_idx").on(t.retailer),
  }),
);

export type AffiliateLinkRow = typeof affiliateLinks.$inferSelect;
