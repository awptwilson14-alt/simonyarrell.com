import {
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
 * Affiliate product catalog — the server-side product database backing the
 * affiliate monetization flow. Each row is one sellable product with both the
 * raw retailer URL and the affiliate (monetized) URL, plus the network that
 * pays the commission. Populated/maintained by the owner via the admin
 * endpoints in `routes/affiliate.ts`.
 */
export const affiliateProducts = pgTable(
  "affiliate_products",
  {
    id: serial("id").primaryKey(),
    productName: text("product_name").notNull(),
    brand: text("brand").notNull(),
    category: text("category").notNull(),
    retailer: text("retailer").notNull(),
    retailPrice: numeric("retail_price", { precision: 12, scale: 2 }),
    salePrice: numeric("sale_price", { precision: 12, scale: 2 }),
    currency: text("currency").notNull().default("USD"),
    /** Image URLs (first = primary). */
    images: text("images").array().notNull().default([]),
    description: text("description"),
    color: text("color"),
    /** Available sizes (e.g. ["S","M","L"] or ["38","39"]). */
    sizes: text("sizes").array().notNull().default([]),
    affiliateUrl: text("affiliate_url").notNull(),
    originalUrl: text("original_url").notNull(),
    sku: text("sku"),
    commissionNetwork: text("commission_network").notNull().default("skimlinks"),
    /** Network-assigned advertiser id for this retailer (from the network UI). */
    advertiserId: text("advertiser_id"),
    /** active | pending | applied | not_partnered | rejected | expired */
    affiliateStatus: text("affiliate_status").notNull().default("pending"),
    /** When the affiliate relationship/link for this product was last verified. */
    lastAffiliateCheck: timestamp("last_affiliate_check", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    // One row per retailer SKU when a SKU is provided (nulls don't collide).
    retailerSkuUq: uniqueIndex("affiliate_products_retailer_sku_uq").on(t.retailer, t.sku),
  }),
);

export type AffiliateProductRow = typeof affiliateProducts.$inferSelect;

/**
 * Affiliate click log — one row per BUY tap. Powers the owner analytics
 * dashboard (daily clicks, top brands/products/retailers/outfits, conversion,
 * revenue). `purchased` + `commissionEarned` start empty and are filled in
 * when a conversion is reported (networks report offline, so this is a
 * manual/import step).
 */
export const affiliateClicks = pgTable(
  "affiliate_clicks",
  {
  id: serial("id").primaryKey(),
  /** Anonymous per-install user id (RevenueCat appUserId when available). */
  userId: text("user_id"),
  productName: text("product_name").notNull(),
  brand: text("brand").notNull(),
  category: text("category"),
  retailer: text("retailer"),
  /** Affiliate network expected to pay (e.g. skimlinks). */
  network: text("network").notNull().default("skimlinks"),
  /** Interaction type: product_view | shop_click | retailer_click |
   *  affiliate_click | outfit_click | buy_outfit_click */
  eventType: text("event_type").notNull().default("affiliate_click"),
  /** Look/outfit context when the tap came from a look detail. */
  lookName: text("look_name"),
  /** Raw destination URL (pre-affiliate-wrap) for retailer attribution. */
  url: text("url"),
  priceCents: integer("price_cents"),
  purchased: timestamp("purchased_at", { withTimezone: true }),
  commissionEarned: numeric("commission_earned", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    // The stats dashboard filters + groups on created_at for every window.
    createdAtIdx: index("affiliate_clicks_created_at_idx").on(t.createdAt),
  }),
);

export type AffiliateClickRow = typeof affiliateClicks.$inferSelect;
