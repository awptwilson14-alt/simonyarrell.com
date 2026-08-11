import { pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

/**
 * AI-generated product photos — one per unique catalog item.
 *
 * Many catalog pieces have no usable retailer photo (hotlink-protected CDNs,
 * missing feeds), which previously left a brand-monogram tile in look
 * details. Each such item now gets a studio-style product photo generated
 * ONCE (Gemini image model), cached here forever and served via
 * GET /api/item-image. Keyed by the normalized brand|name|color item key so
 * every look combination that reuses the same piece reuses the same photo.
 */
export const generatedItemImages = pgTable(
  "generated_item_images",
  {
    id: serial("id").primaryKey(),
    /** normalized `brand|name|color` */
    itemKey: text("item_key").notNull(),
    brand: text("brand").notNull(),
    name: text("name").notNull(),
    category: text("category"),
    color: text("color"),
    mime: text("mime").notNull(),
    /** raw base64 image payload (no data: prefix) */
    dataBase64: text("data_base64").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    itemKeyUq: uniqueIndex("generated_item_images_item_key_uq").on(t.itemKey),
  }),
);

export type GeneratedItemImage = typeof generatedItemImages.$inferSelect;
