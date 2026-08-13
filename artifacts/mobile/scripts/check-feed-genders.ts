/**
 * Regression check: feed gender sanitation.
 *
 * Runs the exact sanitation pass the app runs at load time
 * (lib/feedSanitize.ts) against the raw Shopify feed and asserts the
 * invariants that killed the "men's pant in a women's look" bug.
 *
 * Run with plain Node (type stripping, no build step):
 *   node scripts/check-feed-genders.ts
 */

import { SHOPIFY_FEED } from "../lib/catalogFeed.ts";
import { sanitizeFeedCatalog, isSwimName } from "../lib/feedSanitize.ts";
import type { CatalogItem } from "../lib/outfitEngine.ts";

let failures = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    failures++;
    console.error("FAIL:", msg);
  }
}

// Work on copies — never mutate the raw feed rows from a test.
const catalog = (SHOPIFY_FEED as unknown as CatalogItem[]).map((i) => ({
  ...i,
  genders: [...i.genders],
}));
sanitizeFeedCatalog(catalog);

const APPAREL = new Set(["top", "bottom", "outerwear", "dress"]);
const byId = new Map(catalog.map((i) => [i.id, i]));

// 1. No blanket tags survive.
for (const i of catalog) {
  assert(
    !(
      i.genders.includes("men") &&
      i.genders.includes("women") &&
      i.genders.includes("unisex")
    ),
    `blanket tag survived: ${i.id}`,
  );
}

// 2. No swimwear survives.
for (const i of catalog) {
  assert(!isSwimName(i.name), `swimwear survived: ${i.id} (${i.name})`);
}

// 3. No pure-unisex APPAREL — a garment is never guessed into both genders.
for (const i of catalog) {
  const explicitlyUnisex = /\bunisex\b/i.test(`${i.name} ${i.purchaseUrl ?? ""}`);
  assert(
    explicitlyUnisex ||
      !(APPAREL.has(i.category) && i.genders.length === 1 && i.genders[0] === "unisex"),
    `unisex apparel survived: ${i.id} (${i.name}, ${i.category})`,
  );
}

// 4. Representative cases from the observed bug + review.
const kvitfjell = byId.get("sf_norseprojects_kvitfjell-relaxed-cotton-twill-pant-dark-navy");
assert(!!kvitfjell && kvitfjell.genders.length === 1 && kvitfjell.genders[0] === "men",
  `Norse Projects Kvitfjell pant must be men-only, got ${JSON.stringify(kvitfjell?.genders)}`);

const frankies = catalog.filter((i) => /frankies bikinis/i.test(i.name));
assert(frankies.length === 0, "Frankies Bikinis (swim) items must be removed");

for (const i of catalog) {
  if (/\bst\.?\s?agni\b|\bguizio\b|\basta resort\b/i.test(i.name)) {
    assert(i.genders.length === 1 && i.genders[0] === "women",
      `women's third-party line must be women-only: ${i.id} (${i.name})`);
  }
  if (i.brand === "Khaite" || i.brand === "STAUD" || i.brand === "Ulla Johnson") {
    assert(!i.genders.includes("men"), `women-house brand leaked to men: ${i.id}`);
  }
  if ((i.brand === "Noah" || i.brand === "Jjjjound" || i.brand === "3sixteen") && APPAREL.has(i.category)) {
    assert(!i.genders.includes("women"), `men-house brand apparel leaked to women: ${i.id} (${i.name})`);
  }
  if (/\bdress (shirt|pant)/i.test(i.name)) {
    assert(!(i.genders.length === 1 && i.genders[0] === "women"),
      `"dress shirt/pant" misread as women's garment: ${i.id} (${i.name})`);
  }
}

// 5. Hand-narrowed rows are preserved verbatim (non-blanket, no marker/keyword
// overrides): sample any authored ["men","unisex"] rows still present.
const authoredDual = (SHOPIFY_FEED as unknown as CatalogItem[]).filter(
  (i) =>
    i.genders.length === 2 &&
    i.genders.includes("men") &&
    i.genders.includes("unisex"),
);
assert(authoredDual.length > 0, "expected some authored men|unisex rows in the raw feed");

console.log(
  `checked ${catalog.length} sanitized feed items (${SHOPIFY_FEED.length - catalog.length} removed as swim/unclassifiable)`,
);
if (failures > 0) {
  console.error(`${failures} failure(s)`);
  process.exit(1);
}
console.log("all feed gender invariants hold");
