/**
 * Feed sanitation — load-time repair of the auto-generated Shopify feed.
 *
 * The scraped feed (lib/catalogFeed.ts, NEVER hand-edited) has two known
 * data-quality defects that must be corrected before any look generation:
 *
 * 1. CATEGORY: garments occasionally land in the wrong slot (tees tagged
 *    "bottom", blazers tagged "bag"), letting a t-shirt fill the "bottom"
 *    of a look. We re-infer the slot from the product NAME for feed items
 *    ONLY (id prefix "sf_"); hand-curated rows are trusted as authored.
 *
 * 2. GENDER: nearly every feed row is blanket-tagged
 *    `genders:["men","women","unisex"]`, which defeats the engine's gender
 *    gate entirely — a men's Norse Projects pant "legitimately" passed the
 *    women's gate in a real generated look. We re-derive gender from strong
 *    signals, in priority order:
 *      a. Explicit name / PDP-handle markers ("Women's", "WMNS", "W's" /
 *         "Men's", "M's") — always win.
 *      b. Women-only garment types (bikini, dress, skirt, heels, …) and
 *         known women's third-party lines (St. Agni, GUIZIO, …).
 *      c. Brand house gender for demonstrably single-gender stores — applied
 *         ONLY when the row still carries the exact three-value blanket tag;
 *         any other authored combination is preserved verbatim.
 *      d. Otherwise: shared non-apparel (sneakers, caps, bags, jewelry)
 *         collapses to ["unisex"]; ambiguous APPAREL is REMOVED from the
 *         catalog — a garment must never be guessed into a gendered look.
 *
 * 3. SWIMWEAR: swim pieces are removed entirely — a bikini top was observed
 *    anchoring the "top" slot of an everyday $1,700 look.
 *
 * This module is deliberately free of asset/require imports so the committed
 * regression check (scripts/check-feed-genders.ts) can run it under plain
 * Node against the raw feed.
 */

import type { CatalogItem } from "./outfitEngine";

// ─── Category re-inference ──────────────────────────────────────────────────
// Strong garment head-nouns (shirt / tee / jacket / …) are matched BEFORE
// ambiguous fabric / cut words, so "Short-Sleeve Shirt" stays a top while
// "Board Short" stays a bottom. Dress/gown names are left untouched — they
// collide with the top matcher and aren't a source of the mislabel bug.
const _CAT_SHOE = /\b(sneakers?|boots?|loafers?|heels?|sandals?|mules?|derbys?|oxfords?|trainers?|pumps?|clogs?|espadrilles?|moccasins?|brogues?|slippers?|footwear)\b/i;
const _CAT_BAG = /\b(bags?|totes?|clutch|clutches|backpacks?|crossbody|satchels?|pouch|pouches|purses?|hobo|wallets?|holdall|duffels?|duffles?|briefcase|messenger)\b/i;
const _CAT_DRESSY = /\b(dress|gown)\b/i;
const _CAT_TOP = /\b(t-?shirts?|tees?|polos?|hoodies?|sweatshirts?|sweaters?|blouses?|henleys?|camis|camisoles?|turtlenecks?|crewnecks?|tanks?|pullovers?|knits?|shirts?|tops?)\b/i;
const _CAT_OUTER = /\b(jackets?|coats?|blazers?|parkas?|trench|overcoats?|anoraks?|windbreakers?|bombers?|puffers?|peacoats?|raincoats?)\b/i;
const _CAT_BOTTOM = /\b(jeans?|trousers?|pants?|chinos?|shorts?|skirts?|leggings?|cargos?|sweatpants?|joggers?|slacks?|culottes?|bermudas?)\b/i;
const _CAT_APPLY = new Set<CatalogItem["category"]>(["top", "bottom", "outerwear", "shoes", "bag"]);

export function reinferFeedCategory(
  name: string,
  current: CatalogItem["category"],
): CatalogItem["category"] {
  // Socks are not an outfit slot garment — "Grid Knit Run Socks" must not
  // become a "top" via the knit matcher; park them in accessories.
  if (/\bsocks?\b/i.test(name)) return "accessories";
  if (_CAT_SHOE.test(name)) return "shoes";
  if (_CAT_BAG.test(name)) return "bag";
  if (_CAT_DRESSY.test(name)) return current;
  if (_CAT_TOP.test(name)) return "top";
  if (_CAT_OUTER.test(name)) return "outerwear";
  if (_CAT_BOTTOM.test(name)) return "bottom";
  return current;
}

// ─── Gender re-inference ────────────────────────────────────────────────────
const _G_UNISEX_MARK = /\bunisex\b/i;
const _G_WOMEN_MARK = /\bwomen'?s?\b|\bwmns\b|\bw'?s\b|\bfemme\b|\bladies\b/i;
const _G_MEN_MARK = /\bmen'?s?\b|\bm'?s\b|\bhomme\b/i;
// "dress" is a women's garment ONLY as a head noun — "dress shirt/pant/shoe"
// is menswear vocabulary, so a negative lookahead guards those compounds.
const _G_WOMEN_GARMENT = /\b(bikinis?|bralettes?|bras?|dress(es)?(?!\s+(shirts?|pants?|trousers?|shoes?|boots?|belts?|socks?))|gowns?|skirts?|heels?|pumps?|camis?|camisoles?|bodysuits?|corsets?|miniskirts?|maxi|midi|one-?piece|swimsuits?|thongs?|leggings?|ballet flats?|mary jane)\b/i;
// Women's third-party lines carried by dual-gender stores (observed in the
// Kith feed): the line name in the product title is a reliable gender signal
// even when no garment keyword matches.
const _G_WOMEN_LINE = /\b(st\.?\s?agni|guizio|asta resort|frankies bikinis|sandy liang|paloma wool|jennie)\b/i;
const _G_BRAND_WOMEN = new Set(["STAUD", "Khaite", "Cult Gaia", "Ulla Johnson", "Mansur Gavriel", "Micas"]);
const _G_BRAND_MEN = new Set(["Noah", "Jjjjound", "Represent", "Saturdays NYC", "3sixteen", "Drake's", "Bode", "Satisfy", "Norse Projects", "Aimé Leon Dore", "Stüssy"]);
// Dual-gender stores with no reliable house default stay marker/keyword-only:
// Alex Mill, Bandit Running (W's/M's markers), Kith (carries women's
// third-party lines), Nanushka + Alo Yoga (both run men's lines).

/** Returns re-derived genders, or null when the item must be dropped. */
export function reinferFeedGenders(
  item: Pick<CatalogItem, "name" | "brand" | "category" | "genders" | "purchaseUrl">,
): CatalogItem["genders"] | null {
  const text = `${item.name} ${item.purchaseUrl ?? ""}`;
  // An explicit "Unisex" in the title/handle is a VERIFIED shared product.
  if (_G_UNISEX_MARK.test(text)) return ["unisex"];
  // "women" contains "men", so test the women marker first.
  if (_G_WOMEN_MARK.test(text)) return ["women"];
  if (_G_MEN_MARK.test(text)) return ["men"];
  if (_G_WOMEN_GARMENT.test(item.name)) return ["women"];
  if (_G_WOMEN_LINE.test(text)) return ["women"];
  // ONLY the exact generator blanket tag (men + women + unisex) is
  // untrusted; any other authored combination (e.g. ["men","women"] on
  // genuinely shared pieces) is preserved as-is.
  const blanket =
    item.genders.includes("men") &&
    item.genders.includes("women") &&
    item.genders.includes("unisex");
  if (!blanket) return item.genders; // hand-narrowed row — trust it
  if (_G_BRAND_WOMEN.has(item.brand)) return ["women"];
  if (_G_BRAND_MEN.has(item.brand)) return ["men"];
  // Still ambiguous. Garments are worn on the body — a wrong guess is the
  // exact bug this pass exists to kill, and ["unisex"] would admit the item
  // into BOTH genders' looks. Ambiguous blanket APPAREL is dropped from
  // generation entirely; shared non-apparel stays available as unisex.
  const apparel =
    item.category === "top" ||
    item.category === "bottom" ||
    item.category === "outerwear" ||
    item.category === "dress";
  return apparel ? null : ["unisex"];
}

const _G_SWIM = /\b(bikinis?|swim|swimsuits?|swimwear|one-?piece|trunks?|boardshorts?|rash ?guard)\b/i;

/** True when a product name reads as swimwear (never allowed in looks). */
export function isSwimName(name: string): boolean {
  return _G_SWIM.test(name);
}

/**
 * Mutates the merged catalog in place: fixes feed categories, re-derives
 * feed genders, and splices out swimwear + unclassifiable blanket apparel.
 * Applies to feed rows (id prefix "sf_") ONLY.
 */
export function sanitizeFeedCatalog(catalog: CatalogItem[]): void {
  for (const item of catalog) {
    if (item.id.startsWith("sf_") && _CAT_APPLY.has(item.category)) {
      item.category = reinferFeedCategory(item.name, item.category);
    }
  }
  for (let i = catalog.length - 1; i >= 0; i--) {
    const item = catalog[i];
    if (!item.id.startsWith("sf_")) continue;
    if (isSwimName(item.name)) {
      catalog.splice(i, 1);
      continue;
    }
    const genders = reinferFeedGenders(item);
    if (genders === null) {
      catalog.splice(i, 1); // unclassifiable blanket apparel — never guess
      continue;
    }
    item.genders = genders;
  }
}
