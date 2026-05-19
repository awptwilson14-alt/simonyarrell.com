/**
 * Maison Simon — Dynamic Outfit Engine
 *
 * Assembles unique, budget-filtered outfit looks from a 200+ item catalog
 * spanning 80+ brands across all price tiers. Respects gender, occasion,
 * style, and budget. Tracks shown outfits per session so looks never repeat.
 */

import type { Look, OutfitPiece } from "@/constants/data";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CatalogItem {
  id: string;
  name: string;
  brand: string;
  price: number;
  category: "top" | "bottom" | "dress" | "outerwear" | "shoes" | "bag" | "accessories" | "jewelry";
  styles: string[];
  occasions: string[];
  genders: Array<"women" | "men" | "unisex">;
  colors: string[];
  imageUrl: string;
  purchaseUrl: string;
}

interface GenerateParams {
  gender: string;       // "Women" | "Men" | "Unisex"
  occasion: string;     // "Casual" | "Date Night" | "Work" | "Vacation" | "Event" | "Streetwear" | "Evening" | "Party"
  budget: string;       // e.g. "$500–$1500"
  prompt?: string;
  favoriteStyles?: string[];
  count?: number;       // how many looks to generate (default 6)
}

// ─── Session dedup tracker ───────────────────────────────────────────────────
// Module-level: persists across calls within an app session
const _shownFingerprints = new Set<string>();

export function resetShownLooks() {
  _shownFingerprints.clear();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uns(id: string, w = 480, h = 680) {
  return `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&auto=format&q=80`;
}

function parseBudget(budget: string): { min: number; max: number } {
  if (budget.startsWith("Under")) return { min: 0, max: 500 };
  if (budget.includes("$6000+") || budget === "$6000+") return { min: 6000, max: 40000 };
  const nums = budget.replace(/[$,]/g, "").split(/[–-]/).map(Number);
  if (nums.length === 2) return { min: nums[0], max: nums[1] };
  return { min: 500, max: 1500 };
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function fingerprint(ids: string[]): string {
  return [...ids].sort().join("|");
}

// ─── Deterministic hash — same look always gets same image ───────────────────

function hashStr(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// ─── Look hero image pools — 12+ per style so cards never repeat ─────────────

const LOOK_IMAGE_POOLS: Record<string, Array<{ uri: string }>> = {
  "Old Money": [
    { uri: uns("1507003211169-0a1dd7228f2d", 600, 900) },
    { uri: uns("1521572163474-6864f9cf17ab", 600, 900) },
    { uri: uns("1552902865-b72c031ac5ea", 600, 900) },
    { uri: uns("1591047139829-d91aecb6caea", 600, 900) },
    { uri: uns("1503342217505-b0a15ec3261c", 600, 900) },
    { uri: uns("1543163521-1bf539c55dd2", 600, 900) },
    { uri: uns("1441986300917-64674bd600d8", 600, 900) },
    { uri: uns("1469334031218-e382a71b716b", 600, 900) },
    { uri: uns("1529139574466-a303027bc851", 600, 900) },
    { uri: uns("1516762121899-c04ad64fc6e0", 600, 900) },
    { uri: uns("1539109136090-3bb05fd40e9d", 600, 900) },
    { uri: uns("1549068106-b024baf0f72a", 600, 900) },
    { uri: uns("1483985988355-763728e1cfc4", 600, 900) },
    { uri: uns("1509631179647-0177331693ae", 600, 900) },
  ],
  "Luxury Streetwear": [
    { uri: uns("1556821840-3a63f15732ce", 600, 900) },
    { uri: uns("1542272054537-4845f1353d17", 600, 900) },
    { uri: uns("1539008835657-9e8e9680c956", 600, 900) },
    { uri: uns("1624378441164-f3b5a4ec2a53", 600, 900) },
    { uri: uns("1529139574466-a303027bc851", 600, 900) },
    { uri: uns("1469334031218-e382a71b716b", 600, 900) },
    { uri: uns("1509631179647-0177331693ae", 600, 900) },
    { uri: uns("1483985988355-763728e1cfc4", 600, 900) },
    { uri: uns("1485968579580-fc6f488d40d5", 600, 900) },
    { uri: uns("1558618666-fcd25c85cd64", 600, 900) },
    { uri: uns("1525507119028-ed4c629a60a3", 600, 900) },
    { uri: uns("1583744757-f2c17db12c94", 600, 900) },
    { uri: uns("1516762121899-c04ad64fc6e0", 600, 900) },
  ],
  "Techwear": [
    { uri: uns("1539008835657-9e8e9680c956", 600, 900) },
    { uri: uns("1624378441164-f3b5a4ec2a53", 600, 900) },
    { uri: uns("1556821840-3a63f15732ce", 600, 900) },
    { uri: uns("1485968579580-fc6f488d40d5", 600, 900) },
    { uri: uns("1509631179647-0177331693ae", 600, 900) },
    { uri: uns("1469334031218-e382a71b716b", 600, 900) },
    { uri: uns("1558618666-fcd25c85cd64", 600, 900) },
    { uri: uns("1525507119028-ed4c629a60a3", 600, 900) },
    { uri: uns("1529139574466-a303027bc851", 600, 900) },
    { uri: uns("1483985988355-763728e1cfc4", 600, 900) },
  ],
  "Vacation Luxe": [
    { uri: uns("1515886657613-9f3515b0c78f", 600, 900) },
    { uri: uns("1503342217505-b0a15ec3261c", 600, 900) },
    { uri: uns("1473496169904-658ba7574b0d", 600, 900) },
    { uri: uns("1441986300917-64674bd600d8", 600, 900) },
    { uri: uns("1469334031218-e382a71b716b", 600, 900) },
    { uri: uns("1529139574466-a303027bc851", 600, 900) },
    { uri: uns("1516762121899-c04ad64fc6e0", 600, 900) },
    { uri: uns("1549068106-b024baf0f72a", 600, 900) },
    { uri: uns("1483985988355-763728e1cfc4", 600, 900) },
    { uri: uns("1509631179647-0177331693ae", 600, 900) },
    { uri: uns("1543163521-1bf539c55dd2", 600, 900) },
    { uri: uns("1552902865-b72c031ac5ea", 600, 900) },
  ],
  "Evening": [
    { uri: uns("1566174053879-31528523f8ae", 600, 900) },
    { uri: uns("1515886657613-9f3515b0c78f", 600, 900) },
    { uri: uns("1543163521-1bf539c55dd2", 600, 900) },
    { uri: uns("1441986300917-64674bd600d8", 600, 900) },
    { uri: uns("1503342217505-b0a15ec3261c", 600, 900) },
    { uri: uns("1469334031218-e382a71b716b", 600, 900) },
    { uri: uns("1509631179647-0177331693ae", 600, 900) },
    { uri: uns("1549068106-b024baf0f72a", 600, 900) },
    { uri: uns("1539109136090-3bb05fd40e9d", 600, 900) },
    { uri: uns("1483985988355-763728e1cfc4", 600, 900) },
    { uri: uns("1529139574466-a303027bc851", 600, 900) },
    { uri: uns("1516762121899-c04ad64fc6e0", 600, 900) },
  ],
  "Clean Minimal": [
    { uri: uns("1503342217505-b0a15ec3261c", 600, 900) },
    { uri: uns("1507003211169-0a1dd7228f2d", 600, 900) },
    { uri: uns("1552902865-b72c031ac5ea", 600, 900) },
    { uri: uns("1521572163474-6864f9cf17ab", 600, 900) },
    { uri: uns("1441986300917-64674bd600d8", 600, 900) },
    { uri: uns("1469334031218-e382a71b716b", 600, 900) },
    { uri: uns("1516762121899-c04ad64fc6e0", 600, 900) },
    { uri: uns("1549068106-b024baf0f72a", 600, 900) },
    { uri: uns("1509631179647-0177331693ae", 600, 900) },
    { uri: uns("1543163521-1bf539c55dd2", 600, 900) },
    { uri: uns("1539109136090-3bb05fd40e9d", 600, 900) },
    { uri: uns("1483985988355-763728e1cfc4", 600, 900) },
  ],
  "Business": [
    { uri: uns("1507003211169-0a1dd7228f2d", 600, 900) },
    { uri: uns("1591047139829-d91aecb6caea", 600, 900) },
    { uri: uns("1552902865-b72c031ac5ea", 600, 900) },
    { uri: uns("1521572163474-6864f9cf17ab", 600, 900) },
    { uri: uns("1441986300917-64674bd600d8", 600, 900) },
    { uri: uns("1529139574466-a303027bc851", 600, 900) },
    { uri: uns("1539109136090-3bb05fd40e9d", 600, 900) },
    { uri: uns("1549068106-b024baf0f72a", 600, 900) },
    { uri: uns("1469334031218-e382a71b716b", 600, 900) },
    { uri: uns("1516762121899-c04ad64fc6e0", 600, 900) },
    { uri: uns("1509631179647-0177331693ae", 600, 900) },
    { uri: uns("1503342217505-b0a15ec3261c", 600, 900) },
  ],
  "Y2K Revival": [
    { uri: uns("1515886657613-9f3515b0c78f", 600, 900) },
    { uri: uns("1542272054537-4845f1353d17", 600, 900) },
    { uri: uns("1556821840-3a63f15732ce", 600, 900) },
    { uri: uns("1503342217505-b0a15ec3261c", 600, 900) },
    { uri: uns("1441986300917-64674bd600d8", 600, 900) },
    { uri: uns("1469334031218-e382a71b716b", 600, 900) },
    { uri: uns("1529139574466-a303027bc851", 600, 900) },
    { uri: uns("1558618666-fcd25c85cd64", 600, 900) },
    { uri: uns("1525507119028-ed4c629a60a3", 600, 900) },
    { uri: uns("1509631179647-0177331693ae", 600, 900) },
    { uri: uns("1543163521-1bf539c55dd2", 600, 900) },
    { uri: uns("1485968579580-fc6f488d40d5", 600, 900) },
  ],
  "Formal": [
    { uri: uns("1507003211169-0a1dd7228f2d", 600, 900) },
    { uri: uns("1543163521-1bf539c55dd2", 600, 900) },
    { uri: uns("1566174053879-31528523f8ae", 600, 900) },
    { uri: uns("1549068106-b024baf0f72a", 600, 900) },
    { uri: uns("1441986300917-64674bd600d8", 600, 900) },
    { uri: uns("1552902865-b72c031ac5ea", 600, 900) },
    { uri: uns("1591047139829-d91aecb6caea", 600, 900) },
    { uri: uns("1509631179647-0177331693ae", 600, 900) },
    { uri: uns("1516762121899-c04ad64fc6e0", 600, 900) },
    { uri: uns("1469334031218-e382a71b716b", 600, 900) },
    { uri: uns("1539109136090-3bb05fd40e9d", 600, 900) },
    { uri: uns("1483985988355-763728e1cfc4", 600, 900) },
  ],
  "default": [
    { uri: uns("1507003211169-0a1dd7228f2d", 600, 900) },
    { uri: uns("1515886657613-9f3515b0c78f", 600, 900) },
    { uri: uns("1556821840-3a63f15732ce", 600, 900) },
    { uri: uns("1539008835657-9e8e9680c956", 600, 900) },
    { uri: uns("1552902865-b72c031ac5ea", 600, 900) },
    { uri: uns("1503342217505-b0a15ec3261c", 600, 900) },
    { uri: uns("1543163521-1bf539c55dd2", 600, 900) },
    { uri: uns("1441986300917-64674bd600d8", 600, 900) },
    { uri: uns("1469334031218-e382a71b716b", 600, 900) },
    { uri: uns("1529139574466-a303027bc851", 600, 900) },
  ],
};

// Deterministic per look — same outfit fingerprint → same image every time
function getLookImage(style: string, seed: string): { uri: string } {
  const pool = LOOK_IMAGE_POOLS[style] ?? LOOK_IMAGE_POOLS["default"];
  return pool[hashStr(seed) % pool.length];
}

// ─── Per-category piece image pools — varies by item id so same category ─────
//     items all show different thumbnail photos in the detail screen

const PIECE_IMAGE_POOLS: Record<string, string[]> = {
  top: [
    uns("1503342217505-b0a15ec3261c"), uns("1521572163474-6864f9cf17ab"),
    uns("1558618666-fcd25c85cd64"),    uns("1525507119028-ed4c629a60a3"),
    uns("1583744757-f2c17db12c94"),    uns("1529139574466-a303027bc851"),
    uns("1549068106-b024baf0f72a"),    uns("1516762121899-c04ad64fc6e0"),
    uns("1441986300917-64674bd600d8"), uns("1539109136090-3bb05fd40e9d"),
    uns("1485968579580-fc6f488d40d5"), uns("1483985988355-763728e1cfc4"),
  ],
  bottom: [
    uns("1552902865-b72c031ac5ea"),    uns("1542272054537-4845f1353d17"),
    uns("1515886657613-9f3515b0c78f"), uns("1624378441164-f3b5a4ec2a53"),
    uns("1469334031218-e382a71b716b"), uns("1483985988355-763728e1cfc4"),
    uns("1509631179647-0177331693ae"), uns("1485968579580-fc6f488d40d5"),
    uns("1529139574466-a303027bc851"), uns("1516762121899-c04ad64fc6e0"),
    uns("1549068106-b024baf0f72a"),    uns("1558618666-fcd25c85cd64"),
  ],
  dress: [
    uns("1566174053879-31528523f8ae"), uns("1515886657613-9f3515b0c78f"),
    uns("1543163521-1bf539c55dd2"),    uns("1503342217505-b0a15ec3261c"),
    uns("1441986300917-64674bd600d8"), uns("1469334031218-e382a71b716b"),
    uns("1529139574466-a303027bc851"), uns("1549068106-b024baf0f72a"),
    uns("1516762121899-c04ad64fc6e0"), uns("1539109136090-3bb05fd40e9d"),
    uns("1483985988355-763728e1cfc4"), uns("1509631179647-0177331693ae"),
  ],
  outerwear: [
    uns("1591047139829-d91aecb6caea"), uns("1507003211169-0a1dd7228f2d"),
    uns("1539008835657-9e8e9680c956"), uns("1556821840-3a63f15732ce"),
    uns("1441986300917-64674bd600d8"), uns("1469334031218-e382a71b716b"),
    uns("1509631179647-0177331693ae"), uns("1483985988355-763728e1cfc4"),
    uns("1485968579580-fc6f488d40d5"), uns("1583744757-f2c17db12c94"),
    uns("1529139574466-a303027bc851"), uns("1521572163474-6864f9cf17ab"),
  ],
  shoes: [
    uns("1543163521-1bf539c55dd2"),    uns("1608256246005-4e6b4e65f82c"),
    uns("1542291026-7eec264c27ff"),    uns("1515347619252-60a4bf4fff4f"),
    uns("1491553895911-0055eca6402d"), uns("1614252235316-8c857d38b5f4"),
    uns("1529139574466-a303027bc851"), uns("1483985988355-763728e1cfc4"),
    uns("1469334031218-e382a71b716b"), uns("1516762121899-c04ad64fc6e0"),
    uns("1558618666-fcd25c85cd64"),    uns("1525507119028-ed4c629a60a3"),
  ],
  bag: [
    uns("1548036328-c9fa89d128fa"),    uns("1584917865442-de89df76afd3"),
    uns("1590874175748-39b18e7ab1e9"), uns("1571513800374-841571dbf2e2"),
    uns("1553062407-98421e9b72b9"),    uns("1566150905458-1bf1fb572f8e"),
    uns("1548036328-c9fa89d128fa"),    uns("1584917865442-de89df76afd3"),
    uns("1441986300917-64674bd600d8"), uns("1469334031218-e382a71b716b"),
  ],
  accessories: [
    uns("1473496169904-658ba7574b0d"), uns("1523275335684-37898b6baf30"),
    uns("1611558709798-e009c8fd7706"), uns("1526170375885-4d8ecf77b99f"),
    uns("1558618666-fcd25c85cd64"),    uns("1525507119028-ed4c629a60a3"),
    uns("1549068106-b024baf0f72a"),    uns("1441986300917-64674bd600d8"),
    uns("1469334031218-e382a71b716b"), uns("1483985988355-763728e1cfc4"),
  ],
  jewelry: [
    uns("1599643477877-530eb83abc8e"), uns("1523275335684-37898b6baf30"),
    uns("1526170375885-4d8ecf77b99f"), uns("1611558709798-e009c8fd7706"),
    uns("1441986300917-64674bd600d8"), uns("1469334031218-e382a71b716b"),
    uns("1483985988355-763728e1cfc4"), uns("1509631179647-0177331693ae"),
    uns("1549068106-b024baf0f72a"),    uns("1516762121899-c04ad64fc6e0"),
  ],
};

function getPieceImage(category: string, itemId: string): string {
  const pool = PIECE_IMAGE_POOLS[category] ?? [
    uns("1507003211169-0a1dd7228f2d"),
    uns("1515886657613-9f3515b0c78f"),
  ];
  return pool[hashStr(itemId) % pool.length];
}

// ─── Look name / description generators ──────────────────────────────────────

const LOOK_NAMES: Record<string, string[]> = {
  Casual: ["Sunday Edit", "Off-Duty Luxe", "Weekend Uniform", "Relaxed Authority", "The Easy Day", "Laid-Back Elegance", "Casual Royalty", "The Soft Hour", "Golden Hour Casual", "Quiet Morning"],
  "Date Night": ["Dinner at Eight", "La Dolce Vita", "The Seduction", "Velvet Night", "Champagne Evening", "Midnight Allure", "Candlelit Confidence", "After Dark", "The Rendezvous", "First Impression"],
  Work: ["Corner Office", "The Power Play", "Boardroom Presence", "Executive Edit", "Quiet Authority", "The Professional", "Boardroom Chic", "Dressed for Impact", "The 9-to-5 Luxe", "Sharp & Minimal"],
  Vacation: ["Côte d'Azur", "Island Money", "Resort Royalty", "Golden Sands", "Mediterranean Edit", "Yacht Club", "The Riviera Look", "Sun-Drenched Luxe", "Bougainvillea Hours", "Amalfi Afternoon"],
  Event: ["Red Carpet Ready", "The Statement", "Opening Night", "Gala Presence", "Front Row", "Grand Entrance", "The Moment", "All Eyes Here", "Ceremony Edit", "Award Season"],
  Streetwear: ["Block-to-Runway", "The Drop", "Street Archives", "Urban Blueprint", "Concrete Luxe", "The Flex", "City Uniform", "Street Level", "The Culture", "Downtown Edit"],
  Evening: ["Midnight Garden", "Noir Elegance", "The Gown", "Evening Ritual", "Black Tie Reborn", "The Velvet Hour", "Soirée Supreme", "Starlit Glamour", "Opulent Evening", "The Grand Look"],
  Party: ["Main Character", "The Afterparty", "Disco Heaven", "Glitter & Gold", "Night Frequency", "Party Season", "Euphoric Edit", "Club Luxe", "Electric Night", "The Entrance"],
  Formal: ["The Black Tie", "White Tie & Tails", "Grande Ceremony", "The Tuxedo Edit", "Gala Royale", "The Floor-Length Moment", "Couture Formality", "The Dress Code", "Champagne & Silk", "The Invitation"],
};

const LOOK_DESCRIPTIONS: Record<string, string[]> = {
  Casual: [
    "Effortless luxury for when doing nothing is doing everything.",
    "Refined simplicity — where comfort meets quiet confidence.",
    "The art of looking dressed without trying too hard.",
    "Understated and impeccable for the unscheduled day.",
    "For the morning that stretches into evening without a plan.",
  ],
  "Date Night": [
    "Dressed to fascinate. Every detail is intentional.",
    "The look that makes someone forget what they were saying.",
    "A careful study in attraction — silk, structure, and silence.",
    "Confidence is the accessory. Everything else just supports it.",
    "For an evening that deserves to be remembered.",
  ],
  Work: [
    "Authority without effort. Precision without rigidity.",
    "When the clothes communicate before you've said a word.",
    "Structured, sharp, and entirely in control.",
    "The uniform of someone who doesn't need to prove anything.",
    "Professional power, dressed in impeccable restraint.",
  ],
  Vacation: [
    "Money doesn't shout — it floats on silk.",
    "Dressed like the water is warm and the rosé is cold.",
    "The definition of sun-kissed sophistication.",
    "Luxury untucked — free, but entirely considered.",
    "For a schedule that only reads: sea, sun, repeat.",
  ],
  Event: [
    "A look built for the photographs and the memories.",
    "When the occasion demands everything, give it this.",
    "Dressed for the front row, dressed for the moment.",
    "Standing still is not an option. Neither is blending in.",
    "The room notices. You pretend not to notice.",
  ],
  Streetwear: [
    "The street is the runway. Act accordingly.",
    "Luxury that moves at the speed of the city.",
    "Premium drip engineered for the concrete landscape.",
    "Heritage brands meet fresh-out-the-box energy.",
    "Every corner is a catwalk. Dress like it.",
  ],
  Evening: [
    "The night deserves something spectacular.",
    "Where candlelight meets couture — this is the look.",
    "Dressed for an evening that should never end.",
    "Opulence, restraint, and the perfect amount of drama.",
    "Black tie or not — this is the standard.",
  ],
  Formal: [
    "Black tie is a promise. This look keeps it.",
    "When the dress code demands everything, bring more.",
    "Precision-cut, floor-length, and impossible to ignore.",
    "Heritage tailoring meets modern grandeur.",
    "Dressed for history — yours and theirs.",
  ],
  Party: [
    "Arrive like an event. Leave like a memory.",
    "Maximum energy, maximum impact, maximum you.",
    "The night only starts when you walk in.",
    "Dressed to dance, to dazzle, and to disappear at the right moment.",
    "Because some nights call for your best possible self.",
  ],
};

// ─── Color palettes — each look picks one and biases all pieces toward it ─────

const COLOR_PALETTES: Array<{ name: string; colors: string[] }> = [
  { name: "Ivory & Camel",    colors: ["Ivory", "Camel", "Champagne", "Cream", "Sand", "Stone", "Oatmeal", "Ecru", "Beige"] },
  { name: "All Black",        colors: ["Black", "Charcoal", "Graphite", "Slate"] },
  { name: "Navy & Cobalt",    colors: ["Navy", "Cobalt", "Soft Blue", "Sky Blue", "Blue", "Blue Stripe"] },
  { name: "Earth Tones",      colors: ["Rust", "Terracotta", "Brown", "Cognac", "Chocolate", "Dark Brown", "Tan", "Khaki"] },
  { name: "Blush & Rose",     colors: ["Blush", "Pink", "Dusty Pink", "Lilac", "Rose", "Nude", "Soft Pink"] },
  { name: "Emerald Forest",   colors: ["Emerald", "Forest", "Sage", "Olive", "Green"] },
  { name: "Pure White",       colors: ["White", "Ivory", "Cream", "Ecru", "Off-White", "Chalk"] },
  { name: "Gold & Metallics", colors: ["Gold", "Champagne", "Silver", "Crystal", "Gold/Diamond"] },
  { name: "Power Red",        colors: ["Red", "Burgundy", "Crimson", "Wine", "Cherry"] },
  { name: "Warm Neutrals",    colors: ["Stone", "Sand", "Nude", "Beige", "Tan", "Cream", "Oatmeal", "Camel"] },
  { name: "Monochrome Grey",  colors: ["Grey", "Charcoal", "Graphite", "Silver", "Stone", "Slate"] },
  { name: "Deep Jewels",      colors: ["Emerald", "Navy", "Burgundy", "Cobalt", "Crimson", "Sapphire"] },
];

function paletteMatch(itemColors: string[], paletteColors: string[]): boolean {
  return itemColors.some((c) =>
    paletteColors.some(
      (pc) =>
        c.toLowerCase().includes(pc.toLowerCase()) ||
        pc.toLowerCase().includes(c.toLowerCase())
    )
  );
}

function pickPaletteColor(itemColors: string[], paletteColors: string[]): string {
  const aligned = itemColors.filter((c) =>
    paletteColors.some(
      (pc) =>
        c.toLowerCase().includes(pc.toLowerCase()) ||
        pc.toLowerCase().includes(c.toLowerCase())
    )
  );
  return aligned.length > 0 ? pick(aligned) : pick(itemColors);
}

function generateLookName(occasion: string): string {
  const names = LOOK_NAMES[occasion] ?? LOOK_NAMES["Casual"];
  return pick(names);
}

function generateDescription(occasion: string): string {
  const descs = LOOK_DESCRIPTIONS[occasion] ?? LOOK_DESCRIPTIONS["Casual"];
  return pick(descs);
}

// ─── Massive Catalog — 200+ items, 80+ brands ────────────────────────────────

const CATALOG: CatalogItem[] = [
  // ── TOPS — Women ──────────────────────────────────────────────────────────
  { id: "t001", name: "Silk Charmeuse Blouse", brand: "Loro Piana", price: 980, category: "top", styles: ["Old Money", "Business", "Clean Minimal"], occasions: ["Work", "Casual", "Date Night", "Event"], genders: ["women"], colors: ["Ivory", "Champagne"], imageUrl: uns("1503342217505-b0a15ec3261c"), purchaseUrl: "https://www.loropiana.com" },
  { id: "t002", name: "Fitted Cashmere Turtleneck", brand: "Brunello Cucinelli", price: 890, category: "top", styles: ["Old Money", "Clean Minimal"], occasions: ["Work", "Casual", "Date Night"], genders: ["women"], colors: ["Camel", "Ivory", "Black"], imageUrl: uns("1503342217505-b0a15ec3261c"), purchaseUrl: "https://www.brunellocucinelli.com" },
  { id: "t003", name: "Bias-Cut Silk Camisole", brand: "The Row", price: 680, category: "top", styles: ["Clean Minimal", "Old Money", "Evening"], occasions: ["Casual", "Date Night", "Vacation", "Event"], genders: ["women"], colors: ["Cream", "Sand", "Black"], imageUrl: uns("1503342217505-b0a15ec3261c"), purchaseUrl: "https://www.therow.com" },
  { id: "t004", name: "Structured Corset Top", brand: "Balmain", price: 890, category: "top", styles: ["Evening", "Luxury Streetwear"], occasions: ["Event", "Party", "Date Night"], genders: ["women"], colors: ["Black", "Gold"], imageUrl: uns("1503342217505-b0a15ec3261c"), purchaseUrl: "https://www.balmain.com" },
  { id: "t005", name: "Logo Band Tee", brand: "Balenciaga", price: 450, category: "top", styles: ["Luxury Streetwear"], occasions: ["Casual", "Streetwear"], genders: ["women", "men"], colors: ["Black", "White", "Grey"], imageUrl: uns("1556821840-3a63f15732ce"), purchaseUrl: "https://www.balenciaga.com" },
  { id: "t006", name: "Relaxed Linen Shirt", brand: "Toteme", price: 320, category: "top", styles: ["Clean Minimal", "Old Money", "Vacation Luxe"], occasions: ["Casual", "Vacation", "Work"], genders: ["women"], colors: ["White", "Sand", "Cobalt"], imageUrl: uns("1503342217505-b0a15ec3261c"), purchaseUrl: "https://www.toteme-studio.com" },
  { id: "t007", name: "Draped Jersey Top", brand: "Jacquemus", price: 290, category: "top", styles: ["Clean Minimal", "Vacation Luxe", "Y2K Revival"], occasions: ["Casual", "Vacation", "Date Night", "Party"], genders: ["women"], colors: ["White", "Pink", "Terracotta"], imageUrl: uns("1503342217505-b0a15ec3261c"), purchaseUrl: "https://www.jacquemus.com" },
  { id: "t008", name: "Silk Button-Down", brand: "Equipment", price: 278, category: "top", styles: ["Old Money", "Business", "Vacation Luxe"], occasions: ["Work", "Casual", "Date Night", "Vacation"], genders: ["women"], colors: ["Ivory", "Soft Blue", "Blush"], imageUrl: uns("1503342217505-b0a15ec3261c"), purchaseUrl: "https://www.equipmentfr.com" },
  { id: "t009", name: "Cotton Piqué Polo", brand: "Polo Ralph Lauren", price: 165, category: "top", styles: ["Old Money", "Clean Minimal"], occasions: ["Casual", "Vacation", "Streetwear"], genders: ["women", "men"], colors: ["White", "Navy", "Blush"], imageUrl: uns("1521572163474-6864f9cf17ab"), purchaseUrl: "https://www.ralphlauren.com" },
  { id: "t010", name: "Smocked Puff-Sleeve Top", brand: "Ganni", price: 225, category: "top", styles: ["Y2K Revival", "Vacation Luxe"], occasions: ["Casual", "Vacation", "Party", "Date Night"], genders: ["women"], colors: ["Floral", "Sage", "Lilac"], imageUrl: uns("1503342217505-b0a15ec3261c"), purchaseUrl: "https://www.ganni.com" },
  { id: "t011", name: "Cropped Blazer Top", brand: "A.P.C.", price: 340, category: "top", styles: ["Business", "Clean Minimal", "Old Money"], occasions: ["Work", "Date Night", "Event"], genders: ["women"], colors: ["Ecru", "Navy", "Black"], imageUrl: uns("1503342217505-b0a15ec3261c"), purchaseUrl: "https://www.apc.fr" },
  { id: "t012", name: "Mesh Crystal Top", brand: "Versace", price: 1100, category: "top", styles: ["Evening", "Y2K Revival"], occasions: ["Party", "Event", "Date Night"], genders: ["women"], colors: ["Gold", "Silver", "Black"], imageUrl: uns("1503342217505-b0a15ec3261c"), purchaseUrl: "https://www.versace.com" },
  { id: "t013", name: "Merino Crewneck Sweater", brand: "Zara", price: 59, category: "top", styles: ["Clean Minimal", "Old Money"], occasions: ["Casual", "Work"], genders: ["women", "men"], colors: ["Oatmeal", "Black", "Forest"], imageUrl: uns("1521572163474-6864f9cf17ab"), purchaseUrl: "https://www.zara.com" },
  { id: "t014", name: "Ribbed Tank Top", brand: "COS", price: 45, category: "top", styles: ["Clean Minimal", "Vacation Luxe"], occasions: ["Casual", "Vacation", "Streetwear"], genders: ["women"], colors: ["White", "Black", "Stone"], imageUrl: uns("1503342217505-b0a15ec3261c"), purchaseUrl: "https://www.cosstores.com" },
  { id: "t015", name: "Satin Bandeau Top", brand: "PrettyLittleThing", price: 28, category: "top", styles: ["Y2K Revival"], occasions: ["Party", "Date Night"], genders: ["women"], colors: ["Black", "Nude", "Red"], imageUrl: uns("1503342217505-b0a15ec3261c"), purchaseUrl: "https://www.prettylittlething.com" },
  { id: "t016", name: "Chunky Knit Crop", brand: "Reformation", price: 148, category: "top", styles: ["Y2K Revival", "Clean Minimal"], occasions: ["Casual", "Date Night"], genders: ["women"], colors: ["Cream", "Brown", "Rust"], imageUrl: uns("1521572163474-6864f9cf17ab"), purchaseUrl: "https://www.thereformation.com" },
  { id: "t017", name: "Logo Hoodie Oversized", brand: "Balenciaga", price: 890, category: "top", styles: ["Luxury Streetwear"], occasions: ["Casual", "Streetwear"], genders: ["women", "men"], colors: ["Black", "Grey", "Washed White"], imageUrl: uns("1556821840-3a63f15732ce"), purchaseUrl: "https://www.balenciaga.com" },
  { id: "t018", name: "Face-Patch Hoodie", brand: "Acne Studios", price: 380, category: "top", styles: ["Luxury Streetwear", "Clean Minimal"], occasions: ["Casual", "Streetwear"], genders: ["women", "men"], colors: ["Dusty Pink", "Blue", "Grey"], imageUrl: uns("1556821840-3a63f15732ce"), purchaseUrl: "https://www.acnestudios.com" },
  { id: "t019", name: "Oasi Cashmere Polo", brand: "Loro Piana", price: 1290, category: "top", styles: ["Old Money"], occasions: ["Casual", "Vacation", "Work"], genders: ["men"], colors: ["Camel", "Navy", "Stone"], imageUrl: uns("1521572163474-6864f9cf17ab"), purchaseUrl: "https://www.loropiana.com" },
  { id: "t020", name: "Oxford Button-Down", brand: "Ralph Lauren Purple Label", price: 595, category: "top", styles: ["Old Money", "Business"], occasions: ["Work", "Casual", "Date Night"], genders: ["men"], colors: ["White", "Blue Stripe", "Pink"], imageUrl: uns("1521572163474-6864f9cf17ab"), purchaseUrl: "https://www.ralphlauren.com" },
  { id: "t021", name: "Slim-Fit Merino Crewneck", brand: "John Smedley", price: 265, category: "top", styles: ["Old Money", "Business"], occasions: ["Work", "Casual", "Date Night"], genders: ["men"], colors: ["Navy", "Camel", "Charcoal"], imageUrl: uns("1521572163474-6864f9cf17ab"), purchaseUrl: "https://www.johnsmedley.com" },
  { id: "t022", name: "Graphic Archive Tee", brand: "Fear of God", price: 295, category: "top", styles: ["Luxury Streetwear"], occasions: ["Casual", "Streetwear"], genders: ["men", "women"], colors: ["Black", "White", "Vintage Grey"], imageUrl: uns("1556821840-3a63f15732ce"), purchaseUrl: "https://fearofgod.com" },
  { id: "t023", name: "Linen Band-Collar Shirt", brand: "Massimo Dutti", price: 89, category: "top", styles: ["Clean Minimal", "Old Money", "Vacation Luxe"], occasions: ["Casual", "Vacation", "Work"], genders: ["men"], colors: ["White", "Sand", "Sky Blue"], imageUrl: uns("1521572163474-6864f9cf17ab"), purchaseUrl: "https://www.massimodutti.com" },
  { id: "t024", name: "Drop-Shoulder Tee", brand: "SHEIN", price: 12, category: "top", styles: ["Casual", "Streetwear"], occasions: ["Casual", "Streetwear"], genders: ["women", "men"], colors: ["White", "Black", "Sage"], imageUrl: uns("1503342217505-b0a15ec3261c"), purchaseUrl: "https://www.shein.com" },
  { id: "t025", name: "Ruched Bodysuit", brand: "Fashion Nova", price: 24, category: "top", styles: ["Y2K Revival"], occasions: ["Party", "Date Night"], genders: ["women"], colors: ["Black", "Nude", "Red"], imageUrl: uns("1503342217505-b0a15ec3261c"), purchaseUrl: "https://www.fashionnova.com" },
  { id: "t026", name: "Baby Cashmere Turtleneck", brand: "Brunello Cucinelli", price: 1950, category: "top", styles: ["Old Money", "Clean Minimal"], occasions: ["Work", "Casual", "Date Night"], genders: ["men"], colors: ["Ivory", "Cognac", "Slate"], imageUrl: uns("1521572163474-6864f9cf17ab"), purchaseUrl: "https://www.brunellocucinelli.com" },
  { id: "t027", name: "Tweed Boucle Top", brand: "Chanel", price: 2800, category: "top", styles: ["Old Money", "Business", "Evening"], occasions: ["Work", "Event", "Date Night"], genders: ["women"], colors: ["Ivory/Black", "Pink/Gold", "Navy/Gold"], imageUrl: uns("1503342217505-b0a15ec3261c"), purchaseUrl: "https://www.chanel.com" },
  { id: "t028", name: "GORE-TEX Active Top", brand: "Acronym", price: 680, category: "top", styles: ["Techwear"], occasions: ["Casual", "Streetwear"], genders: ["men", "women"], colors: ["Black", "Graphite"], imageUrl: uns("1539008835657-9e8e9680c956"), purchaseUrl: "https://www.acrnm.com" },
  { id: "t029", name: "Cropped Utility Jacket Top", brand: "Stone Island", price: 540, category: "top", styles: ["Techwear", "Luxury Streetwear"], occasions: ["Casual", "Streetwear"], genders: ["men"], colors: ["Black", "Sage", "Navy"], imageUrl: uns("1539008835657-9e8e9680c956"), purchaseUrl: "https://www.stoneisland.com" },
  { id: "t030", name: "Silk Evening Blouse", brand: "Valentino", price: 1480, category: "top", styles: ["Evening", "Old Money"], occasions: ["Event", "Date Night", "Work"], genders: ["women"], colors: ["Blush", "Red", "Black"], imageUrl: uns("1503342217505-b0a15ec3261c"), purchaseUrl: "https://www.valentino.com" },

  // ── FIGS Scrubs — Women ───────────────────────────────────────────────────
  { id: "figs_t01", name: "Catarina One-Pocket Scrub Top", brand: "FIGS", price: 38, category: "top", styles: ["Business", "Clean Minimal"], occasions: ["Work"], genders: ["women"], colors: ["Ceil Blue", "Navy", "Slate", "Hunter Green", "Black", "Burgundy"], imageUrl: uns("1584820688313-b22ef25a6b29"), purchaseUrl: "https://www.wearfigs.com" },
  { id: "figs_t02", name: "Rafaela Raglan Scrub Top", brand: "FIGS", price: 42, category: "top", styles: ["Business", "Clean Minimal"], occasions: ["Work"], genders: ["women"], colors: ["Navy", "Black", "Heather Grey", "Royal Blue", "Mulberry"], imageUrl: uns("1584820688313-b22ef25a6b29"), purchaseUrl: "https://www.wearfigs.com" },
  { id: "figs_t03", name: "Bria Reversible Scrub Top", brand: "FIGS", price: 52, category: "top", styles: ["Business"], occasions: ["Work"], genders: ["women"], colors: ["Ceil Blue", "Black", "Olive", "Slate"], imageUrl: uns("1584820688313-b22ef25a6b29"), purchaseUrl: "https://www.wearfigs.com" },
  { id: "figs_t04", name: "Yola Cross-Back Scrub Top", brand: "FIGS", price: 38, category: "top", styles: ["Business", "Clean Minimal"], occasions: ["Work"], genders: ["women"], colors: ["Navy", "Royal Blue", "Sage", "Mulberry", "Burgundy"], imageUrl: uns("1584820688313-b22ef25a6b29"), purchaseUrl: "https://www.wearfigs.com" },
  { id: "figs_t05", name: "Casma Three-Pocket Scrub Top", brand: "FIGS", price: 38, category: "top", styles: ["Business"], occasions: ["Work"], genders: ["women"], colors: ["Hunter Green", "Navy", "Dusty Blue", "Ceil Blue"], imageUrl: uns("1584820688313-b22ef25a6b29"), purchaseUrl: "https://www.wearfigs.com" },

  // ── FIGS Scrubs — Men ─────────────────────────────────────────────────────
  { id: "figs_t06", name: "Pisco One-Pocket Scrub Top", brand: "FIGS", price: 42, category: "top", styles: ["Business", "Clean Minimal"], occasions: ["Work"], genders: ["men"], colors: ["Navy", "Black", "Heather Grey", "Ceil Blue", "Slate"], imageUrl: uns("1584820688313-b22ef25a6b29"), purchaseUrl: "https://www.wearfigs.com" },
  { id: "figs_t07", name: "Leon Two-Pocket Scrub Top", brand: "FIGS", price: 38, category: "top", styles: ["Business"], occasions: ["Work"], genders: ["men"], colors: ["Navy", "Black", "Hunter Green", "Slate", "Royal Blue"], imageUrl: uns("1584820688313-b22ef25a6b29"), purchaseUrl: "https://www.wearfigs.com" },
  { id: "figs_t08", name: "Axim Utility Scrub Top", brand: "FIGS", price: 48, category: "top", styles: ["Business", "Techwear"], occasions: ["Work"], genders: ["men"], colors: ["Black", "Graphite", "Navy", "Charcoal"], imageUrl: uns("1584820688313-b22ef25a6b29"), purchaseUrl: "https://www.wearfigs.com" },

  // ── BOTTOMS — Women ───────────────────────────────────────────────────────
  { id: "b001", name: "Wide-Leg Wool Trouser", brand: "Jil Sander", price: 890, category: "bottom", styles: ["Clean Minimal", "Business", "Old Money"], occasions: ["Work", "Event", "Date Night"], genders: ["women"], colors: ["Ivory", "Camel", "Charcoal"], imageUrl: uns("1552902865-b72c031ac5ea"), purchaseUrl: "https://www.jilsander.com" },
  { id: "b002", name: "Crystal Mini Skirt", brand: "Versace", price: 1350, category: "bottom", styles: ["Evening", "Y2K Revival"], occasions: ["Party", "Event", "Date Night"], genders: ["women"], colors: ["Gold", "Silver", "Black"], imageUrl: uns("1515886657613-9f3515b0c78f"), purchaseUrl: "https://www.versace.com" },
  { id: "b003", name: "Tailored Wide-Leg Trousers", brand: "Toteme", price: 520, category: "bottom", styles: ["Clean Minimal", "Old Money", "Business"], occasions: ["Work", "Casual", "Date Night"], genders: ["women"], colors: ["Black", "Cream", "Chocolate"], imageUrl: uns("1552902865-b72c031ac5ea"), purchaseUrl: "https://www.toteme-studio.com" },
  { id: "b004", name: "Straight-Leg Denim", brand: "Agolde", price: 248, category: "bottom", styles: ["Y2K Revival", "Casual"], occasions: ["Casual", "Streetwear", "Date Night"], genders: ["women"], colors: ["Indigo", "Light Wash", "Black"], imageUrl: uns("1542272054537-4845f1353d17"), purchaseUrl: "https://www.agolde.com" },
  { id: "b005", name: "Plissé Midi Skirt", brand: "Jacquemus", price: 480, category: "bottom", styles: ["Clean Minimal", "Vacation Luxe"], occasions: ["Casual", "Vacation", "Date Night", "Event"], genders: ["women"], colors: ["Pink", "White", "Terracotta"], imageUrl: uns("1515886657613-9f3515b0c78f"), purchaseUrl: "https://www.jacquemus.com" },
  { id: "b006", name: "Low-Rise Barrel Jeans", brand: "Agolde", price: 238, category: "bottom", styles: ["Y2K Revival", "Luxury Streetwear"], occasions: ["Casual", "Streetwear", "Party"], genders: ["women"], colors: ["Medium Wash", "Black", "Light Wash"], imageUrl: uns("1542272054537-4845f1353d17"), purchaseUrl: "https://www.agolde.com" },
  { id: "b007", name: "Tweed Mini Skirt", brand: "Chanel", price: 2600, category: "bottom", styles: ["Old Money", "Business"], occasions: ["Work", "Event", "Date Night"], genders: ["women"], colors: ["Ivory/Black", "Pink/Gold", "Navy"], imageUrl: uns("1515886657613-9f3515b0c78f"), purchaseUrl: "https://www.chanel.com" },
  { id: "b008", name: "Asymmetric Satin Skirt", brand: "Ganni", price: 280, category: "bottom", styles: ["Y2K Revival", "Evening"], occasions: ["Party", "Date Night", "Event"], genders: ["women"], colors: ["Champagne", "Emerald", "Cobalt"], imageUrl: uns("1515886657613-9f3515b0c78f"), purchaseUrl: "https://www.ganni.com" },
  { id: "b009", name: "Linen Wide Trousers", brand: "COS", price: 115, category: "bottom", styles: ["Clean Minimal", "Vacation Luxe"], occasions: ["Casual", "Work", "Vacation"], genders: ["women", "men"], colors: ["White", "Stone", "Terracotta"], imageUrl: uns("1552902865-b72c031ac5ea"), purchaseUrl: "https://www.cosstores.com" },
  { id: "b010", name: "Baggy Cargo Trousers", brand: "Carhartt WIP", price: 145, category: "bottom", styles: ["Techwear", "Luxury Streetwear"], occasions: ["Casual", "Streetwear"], genders: ["women", "men"], colors: ["Black", "Olive", "Stone"], imageUrl: uns("1552902865-b72c031ac5ea"), purchaseUrl: "https://www.carhartt-wip.com" },
  { id: "b011", name: "Sequin Party Skirt", brand: "ASOS", price: 65, category: "bottom", styles: ["Y2K Revival", "Evening"], occasions: ["Party", "Date Night"], genders: ["women"], colors: ["Silver", "Gold", "Black"], imageUrl: uns("1515886657613-9f3515b0c78f"), purchaseUrl: "https://www.asos.com" },
  { id: "b012", name: "Crochet Mini Skirt", brand: "Cider", price: 32, category: "bottom", styles: ["Vacation Luxe", "Y2K Revival"], occasions: ["Vacation", "Casual", "Party"], genders: ["women"], colors: ["White", "Beige", "Coral"], imageUrl: uns("1515886657613-9f3515b0c78f"), purchaseUrl: "https://www.shopcider.com" },
  { id: "b013", name: "Vinyl Mini Skirt", brand: "Fashion Nova", price: 35, category: "bottom", styles: ["Y2K Revival"], occasions: ["Party", "Date Night"], genders: ["women"], colors: ["Black", "Red"], imageUrl: uns("1515886657613-9f3515b0c78f"), purchaseUrl: "https://www.fashionnova.com" },

  // ── BOTTOMS — Men ─────────────────────────────────────────────────────────
  { id: "b014", name: "Slim Flannel Trouser", brand: "Ralph Lauren Purple Label", price: 695, category: "bottom", styles: ["Old Money", "Business"], occasions: ["Work", "Date Night", "Event"], genders: ["men"], colors: ["Charcoal", "Navy", "Stone"], imageUrl: uns("1552902865-b72c031ac5ea"), purchaseUrl: "https://www.ralphlauren.com" },
  { id: "b015", name: "Slim Wool Trouser", brand: "Incotex", price: 480, category: "bottom", styles: ["Old Money", "Business"], occasions: ["Work", "Date Night", "Casual"], genders: ["men"], colors: ["Dark Brown", "Grey", "Navy"], imageUrl: uns("1552902865-b72c031ac5ea"), purchaseUrl: "https://www.incotex.com" },
  { id: "b016", name: "Relaxed Chino", brand: "Polo Ralph Lauren", price: 165, category: "bottom", styles: ["Old Money", "Casual"], occasions: ["Casual", "Work", "Date Night"], genders: ["men"], colors: ["Stone", "Khaki", "Navy"], imageUrl: uns("1552902865-b72c031ac5ea"), purchaseUrl: "https://www.ralphlauren.com" },
  { id: "b017", name: "Slim Raw-Edge Denim", brand: "Acne Studios", price: 320, category: "bottom", styles: ["Luxury Streetwear", "Casual"], occasions: ["Casual", "Date Night", "Streetwear"], genders: ["men"], colors: ["Indigo", "Black", "Grey"], imageUrl: uns("1542272054537-4845f1353d17"), purchaseUrl: "https://www.acnestudios.com" },
  { id: "b018", name: "Cargo Jogger", brand: "Stone Island Shadow", price: 680, category: "bottom", styles: ["Techwear", "Luxury Streetwear"], occasions: ["Casual", "Streetwear"], genders: ["men"], colors: ["Black", "Slate"], imageUrl: uns("1624378441164-f3b5a4ec2a53"), purchaseUrl: "https://www.stoneisland.com" },
  { id: "b019", name: "Baggy Carpenter Denim", brand: "Amiri", price: 680, category: "bottom", styles: ["Luxury Streetwear"], occasions: ["Casual", "Streetwear", "Date Night"], genders: ["men"], colors: ["Indigo", "Black"], imageUrl: uns("1542272054537-4845f1353d17"), purchaseUrl: "https://www.amiri.com" },
  { id: "b020", name: "Technical Track Pant", brand: "Acronym", price: 890, category: "bottom", styles: ["Techwear"], occasions: ["Casual", "Streetwear"], genders: ["men"], colors: ["Black", "Graphite"], imageUrl: uns("1624378441164-f3b5a4ec2a53"), purchaseUrl: "https://www.acrnm.com" },
  { id: "b021", name: "Linen Drawstring Trouser", brand: "Massimo Dutti", price: 79, category: "bottom", styles: ["Clean Minimal", "Vacation Luxe"], occasions: ["Casual", "Vacation"], genders: ["men"], colors: ["Ecru", "Navy", "Beige"], imageUrl: uns("1552902865-b72c031ac5ea"), purchaseUrl: "https://www.massimodutti.com" },
  { id: "b022", name: "Slim Tailored Trouser", brand: "Acne Studios", price: 480, category: "bottom", styles: ["Clean Minimal", "Business"], occasions: ["Work", "Date Night", "Event"], genders: ["men"], colors: ["Black", "Charcoal", "Navy"], imageUrl: uns("1552902865-b72c031ac5ea"), purchaseUrl: "https://www.acnestudios.com" },

  // ── FIGS Scrub Bottoms — Women ────────────────────────────────────────────
  { id: "figs_b01", name: "Zamora Jogger Scrub Pants", brand: "FIGS", price: 42, category: "bottom", styles: ["Business", "Clean Minimal"], occasions: ["Work"], genders: ["women"], colors: ["Ceil Blue", "Navy", "Slate", "Hunter Green", "Black", "Burgundy"], imageUrl: uns("1584820688313-b22ef25a6b29"), purchaseUrl: "https://www.wearfigs.com" },
  { id: "figs_b02", name: "Ames Cargo Scrub Pants", brand: "FIGS", price: 52, category: "bottom", styles: ["Business", "Techwear"], occasions: ["Work"], genders: ["women"], colors: ["Navy", "Black", "Hunter Green", "Olive", "Slate"], imageUrl: uns("1584820688313-b22ef25a6b29"), purchaseUrl: "https://www.wearfigs.com" },
  { id: "figs_b03", name: "Kade Scrub Shorts", brand: "FIGS", price: 38, category: "bottom", styles: ["Business", "Clean Minimal"], occasions: ["Work", "Casual"], genders: ["women"], colors: ["Navy", "Black", "Heather Grey", "Ceil Blue"], imageUrl: uns("1584820688313-b22ef25a6b29"), purchaseUrl: "https://www.wearfigs.com" },
  { id: "figs_b04", name: "Rafaela Drawstring Scrub Pants", brand: "FIGS", price: 46, category: "bottom", styles: ["Business", "Clean Minimal"], occasions: ["Work"], genders: ["women"], colors: ["Burgundy", "Royal Blue", "Mulberry", "Slate", "Dusty Blue"], imageUrl: uns("1584820688313-b22ef25a6b29"), purchaseUrl: "https://www.wearfigs.com" },

  // ── FIGS Scrub Bottoms — Men ──────────────────────────────────────────────
  { id: "figs_b05", name: "Yola Jogger Scrub Pant", brand: "FIGS", price: 42, category: "bottom", styles: ["Business", "Clean Minimal"], occasions: ["Work"], genders: ["men"], colors: ["Navy", "Black", "Heather Grey", "Slate", "Ceil Blue"], imageUrl: uns("1584820688313-b22ef25a6b29"), purchaseUrl: "https://www.wearfigs.com" },
  { id: "figs_b06", name: "Axim Cargo Scrub Pant", brand: "FIGS", price: 52, category: "bottom", styles: ["Business", "Techwear"], occasions: ["Work"], genders: ["men"], colors: ["Black", "Navy", "Hunter Green", "Graphite", "Slate"], imageUrl: uns("1584820688313-b22ef25a6b29"), purchaseUrl: "https://www.wearfigs.com" },
  { id: "figs_b07", name: "Cairo Relaxed Scrub Pant", brand: "FIGS", price: 38, category: "bottom", styles: ["Business", "Clean Minimal"], occasions: ["Work"], genders: ["men"], colors: ["Navy", "Black", "Slate", "Royal Blue", "Charcoal"], imageUrl: uns("1584820688313-b22ef25a6b29"), purchaseUrl: "https://www.wearfigs.com" },

  // ── DRESSES — Women ───────────────────────────────────────────────────────
  { id: "d001", name: "Column Gown", brand: "Valentino Haute Couture", price: 5800, category: "dress", styles: ["Evening", "Old Money"], occasions: ["Event", "Party"], genders: ["women"], colors: ["Crimson", "Ivory", "Black"], imageUrl: uns("1566174053879-31528523f8ae"), purchaseUrl: "https://www.valentino.com" },
  { id: "d002", name: "Silk Bias Slip Dress", brand: "Reformation", price: 248, category: "dress", styles: ["Vacation Luxe", "Y2K Revival", "Clean Minimal"], occasions: ["Vacation", "Date Night", "Casual", "Party"], genders: ["women"], colors: ["Champagne", "Sage", "Terracotta"], imageUrl: uns("1515886657613-9f3515b0c78f"), purchaseUrl: "https://www.thereformation.com" },
  { id: "d003", name: "Cashmere Kaftan", brand: "Loro Piana", price: 3600, category: "dress", styles: ["Vacation Luxe", "Old Money"], occasions: ["Vacation", "Casual", "Event"], genders: ["women"], colors: ["Sand", "Sky", "Soft Pink"], imageUrl: uns("1515886657613-9f3515b0c78f"), purchaseUrl: "https://www.loropiana.com" },
  { id: "d004", name: "Mini Shirt Dress", brand: "Jacquemus", price: 580, category: "dress", styles: ["Clean Minimal", "Vacation Luxe"], occasions: ["Casual", "Date Night", "Vacation"], genders: ["women"], colors: ["White", "Beige", "Yellow"], imageUrl: uns("1515886657613-9f3515b0c78f"), purchaseUrl: "https://www.jacquemus.com" },
  { id: "d005", name: "Smocked Floral Maxi", brand: "Ganni", price: 395, category: "dress", styles: ["Y2K Revival", "Vacation Luxe"], occasions: ["Vacation", "Casual", "Party", "Date Night"], genders: ["women"], colors: ["Floral", "Ditsy Print"], imageUrl: uns("1515886657613-9f3515b0c78f"), purchaseUrl: "https://www.ganni.com" },
  { id: "d006", name: "Bandage Bodycon Dress", brand: "Hervé Léger", price: 1290, category: "dress", styles: ["Evening", "Y2K Revival"], occasions: ["Party", "Event", "Date Night"], genders: ["women"], colors: ["Black", "Champagne", "Crimson"], imageUrl: uns("1566174053879-31528523f8ae"), purchaseUrl: "https://www.hervelegerbrand.com" },
  { id: "d007", name: "Sequin Mini Dress", brand: "ASOS", price: 75, category: "dress", styles: ["Y2K Revival", "Evening"], occasions: ["Party", "Date Night"], genders: ["women"], colors: ["Gold", "Silver", "Black"], imageUrl: uns("1566174053879-31528523f8ae"), purchaseUrl: "https://www.asos.com" },
  { id: "d008", name: "Tailored Blazer Dress", brand: "Balmain", price: 2100, category: "dress", styles: ["Business", "Evening", "Old Money"], occasions: ["Work", "Event", "Date Night"], genders: ["women"], colors: ["Black", "Ivory", "Camel"], imageUrl: uns("1507003211169-0a1dd7228f2d"), purchaseUrl: "https://www.balmain.com" },
  { id: "d009", name: "Velvet Midi Dress", brand: "Ba&sh", price: 340, category: "dress", styles: ["Evening", "Y2K Revival"], occasions: ["Date Night", "Party", "Event"], genders: ["women"], colors: ["Emerald", "Burgundy", "Navy"], imageUrl: uns("1566174053879-31528523f8ae"), purchaseUrl: "https://www.ba-sh.com" },
  { id: "d010", name: "Cut-Out Bodycon Mini", brand: "Fashion Nova", price: 42, category: "dress", styles: ["Y2K Revival"], occasions: ["Party", "Date Night"], genders: ["women"], colors: ["Black", "Red", "Nude"], imageUrl: uns("1515886657613-9f3515b0c78f"), purchaseUrl: "https://www.fashionnova.com" },
  { id: "d011", name: "Linen Shirt Dress", brand: "Mango", price: 69, category: "dress", styles: ["Casual", "Vacation Luxe"], occasions: ["Casual", "Vacation", "Work"], genders: ["women"], colors: ["White", "Ecru", "Sage"], imageUrl: uns("1515886657613-9f3515b0c78f"), purchaseUrl: "https://www.mango.com" },
  { id: "d012", name: "Feather-Trim Gown", brand: "Giambattista Valli", price: 4800, category: "dress", styles: ["Evening", "Avant-garde"], occasions: ["Event", "Party"], genders: ["women"], colors: ["Ivory", "Blush", "Red"], imageUrl: uns("1566174053879-31528523f8ae"), purchaseUrl: "https://www.giambattistavalli.com" },
  { id: "d013", name: "Shirtdress Midi", brand: "Arket", price: 145, category: "dress", styles: ["Clean Minimal", "Business"], occasions: ["Work", "Casual"], genders: ["women"], colors: ["White", "Blue Stripe", "Beige"], imageUrl: uns("1515886657613-9f3515b0c78f"), purchaseUrl: "https://www.arket.com" },

  // ── FORMAL GOWNS — Women ──────────────────────────────────────────────────
  { id: "fg01", name: "Strapless Ball Gown", brand: "Vera Wang", price: 3800, category: "dress", styles: ["Evening", "Old Money"], occasions: ["Formal", "Event"], genders: ["women"], colors: ["Ivory", "Blush", "Black", "White"], imageUrl: uns("1566174053879-31528523f8ae"), purchaseUrl: "https://www.verawang.com" },
  { id: "fg02", name: "Column Crepe Gown", brand: "Roland Mouret", price: 2400, category: "dress", styles: ["Evening", "Clean Minimal"], occasions: ["Formal", "Event"], genders: ["women"], colors: ["Black", "Midnight Blue", "Ivory", "Red"], imageUrl: uns("1566174053879-31528523f8ae"), purchaseUrl: "https://www.rolandmouret.com" },
  { id: "fg03", name: "Duchess Satin Ball Gown", brand: "Oscar de la Renta", price: 5200, category: "dress", styles: ["Evening", "Old Money"], occasions: ["Formal", "Event"], genders: ["women"], colors: ["Champagne", "Blush", "Crimson", "Ivory"], imageUrl: uns("1515886657613-9f3515b0c78f"), purchaseUrl: "https://www.oscardelarenta.com" },
  { id: "fg04", name: "Mermaid Silk Gown", brand: "Alexandre Vauthier", price: 4100, category: "dress", styles: ["Evening", "Y2K Revival"], occasions: ["Formal", "Event", "Party"], genders: ["women"], colors: ["Black", "Gold", "Silver", "Nude"], imageUrl: uns("1566174053879-31528523f8ae"), purchaseUrl: "https://www.alexandrevauthier.com" },
  { id: "fg05", name: "Tulle A-Line Gown", brand: "Giambattista Valli", price: 4800, category: "dress", styles: ["Evening", "Old Money"], occasions: ["Formal", "Event"], genders: ["women"], colors: ["Blush", "White", "Lilac", "Mint"], imageUrl: uns("1515886657613-9f3515b0c78f"), purchaseUrl: "https://www.giambattistavalli.com" },
  { id: "fg06", name: "Halter Neck Pleated Gown", brand: "Valentino", price: 5600, category: "dress", styles: ["Evening", "Old Money"], occasions: ["Formal", "Event"], genders: ["women"], colors: ["Ivory", "Black", "Red", "Blush"], imageUrl: uns("1566174053879-31528523f8ae"), purchaseUrl: "https://www.valentino.com" },
  { id: "fg07", name: "One-Shoulder Velvet Gown", brand: "Tom Ford", price: 3900, category: "dress", styles: ["Evening", "Old Money"], occasions: ["Formal", "Event", "Date Night"], genders: ["women"], colors: ["Black", "Burgundy", "Forest Green", "Navy"], imageUrl: uns("1566174053879-31528523f8ae"), purchaseUrl: "https://www.tomford.com" },
  { id: "fg08", name: "Empire Waist Chiffon Gown", brand: "Monique Lhuillier", price: 3200, category: "dress", styles: ["Evening", "Old Money"], occasions: ["Formal", "Event"], genders: ["women"], colors: ["Champagne", "Sage", "Dusty Blue", "Ivory"], imageUrl: uns("1515886657613-9f3515b0c78f"), purchaseUrl: "https://www.moniquelhuillier.com" },
  { id: "fg09", name: "Draped Georgette Gown", brand: "Elie Saab", price: 6200, category: "dress", styles: ["Evening", "Old Money"], occasions: ["Formal", "Event"], genders: ["women"], colors: ["Gold", "Blush", "Silver", "Ivory"], imageUrl: uns("1566174053879-31528523f8ae"), purchaseUrl: "https://www.eliesaab.com" },
  { id: "fg10", name: "Floral Appliqué Ball Gown", brand: "Zuhair Murad", price: 7400, category: "dress", styles: ["Evening", "Old Money"], occasions: ["Formal", "Event"], genders: ["women"], colors: ["White", "Blush", "Champagne", "Black"], imageUrl: uns("1515886657613-9f3515b0c78f"), purchaseUrl: "https://www.zuhairmurad.com" },
  { id: "fg11", name: "Tuxedo Power Gown", brand: "Saint Laurent", price: 4500, category: "dress", styles: ["Evening", "Clean Minimal"], occasions: ["Formal", "Event"], genders: ["women"], colors: ["Black", "White", "Ivory"], imageUrl: uns("1566174053879-31528523f8ae"), purchaseUrl: "https://www.ysl.com" },
  { id: "fg12", name: "Cape-Back Duchess Gown", brand: "Reem Acra", price: 5100, category: "dress", styles: ["Evening", "Old Money"], occasions: ["Formal", "Event"], genders: ["women"], colors: ["Ivory", "Blush", "Champagne", "Gold"], imageUrl: uns("1515886657613-9f3515b0c78f"), purchaseUrl: "https://www.reemacra.com" },

  // ── OUTERWEAR ─────────────────────────────────────────────────────────────
  { id: "o001", name: "Heritage Trench Coat", brand: "Burberry", price: 2490, category: "outerwear", styles: ["Old Money", "Business", "Clean Minimal"], occasions: ["Work", "Casual", "Date Night", "Event"], genders: ["women", "men"], colors: ["Honey", "Black", "Stone"], imageUrl: uns("1591047139829-d91aecb6caea"), purchaseUrl: "https://www.burberry.com" },
  { id: "o002", name: "GORE-TEX Shell Jacket", brand: "Acronym", price: 1990, category: "outerwear", styles: ["Techwear"], occasions: ["Casual", "Streetwear"], genders: ["men", "women"], colors: ["Black", "Graphite"], imageUrl: uns("1539008835657-9e8e9680c956"), purchaseUrl: "https://www.acrnm.com" },
  { id: "o003", name: "Camel Robe Coat", brand: "Max Mara", price: 3400, category: "outerwear", styles: ["Old Money", "Clean Minimal", "Business"], occasions: ["Work", "Casual", "Date Night", "Event"], genders: ["women"], colors: ["Camel", "Black", "Ivory"], imageUrl: uns("1591047139829-d91aecb6caea"), purchaseUrl: "https://www.maxmara.com" },
  { id: "o004", name: "Down Logo Puffer", brand: "Moncler", price: 1650, category: "outerwear", styles: ["Luxury Streetwear", "Old Money"], occasions: ["Casual", "Streetwear"], genders: ["women", "men"], colors: ["Black", "Navy", "Red"], imageUrl: uns("1591047139829-d91aecb6caea"), purchaseUrl: "https://www.moncler.com" },
  { id: "o005", name: "Technical Shell", brand: "Arc'teryx", price: 895, category: "outerwear", styles: ["Techwear"], occasions: ["Casual", "Streetwear"], genders: ["men", "women"], colors: ["Black", "Volcanic", "Cobalt"], imageUrl: uns("1539008835657-9e8e9680c956"), purchaseUrl: "https://www.arcteryx.com" },
  { id: "o006", name: "Structured Power Blazer", brand: "Balmain", price: 2900, category: "outerwear", styles: ["Business", "Evening", "Old Money"], occasions: ["Work", "Event", "Date Night"], genders: ["women", "men"], colors: ["Black", "Gold", "Ivory"], imageUrl: uns("1507003211169-0a1dd7228f2d"), purchaseUrl: "https://www.balmain.com" },
  { id: "o007", name: "Harris Tweed Blazer", brand: "Ralph Lauren", price: 1350, category: "outerwear", styles: ["Old Money", "Business"], occasions: ["Work", "Casual", "Date Night"], genders: ["men"], colors: ["Brown Plaid", "Navy", "Herringbone"], imageUrl: uns("1507003211169-0a1dd7228f2d"), purchaseUrl: "https://www.ralphlauren.com" },
  { id: "o008", name: "Double-Breasted Suit Jacket", brand: "Tom Ford", price: 3800, category: "outerwear", styles: ["Old Money", "Business", "Evening"], occasions: ["Work", "Event", "Date Night"], genders: ["men"], colors: ["Charcoal", "Black", "Navy"], imageUrl: uns("1507003211169-0a1dd7228f2d"), purchaseUrl: "https://www.tomford.com" },
  { id: "o009", name: "Oversized Wool Coat", brand: "COS", price: 390, category: "outerwear", styles: ["Clean Minimal"], occasions: ["Casual", "Work"], genders: ["women", "men"], colors: ["Charcoal", "Camel", "Off-White"], imageUrl: uns("1591047139829-d91aecb6caea"), purchaseUrl: "https://www.cosstores.com" },
  { id: "o010", name: "Faux Leather Biker", brand: "AllSaints", price: 499, category: "outerwear", styles: ["Luxury Streetwear", "Y2K Revival"], occasions: ["Casual", "Date Night", "Streetwear"], genders: ["women", "men"], colors: ["Black", "Tan"], imageUrl: uns("1591047139829-d91aecb6caea"), purchaseUrl: "https://www.allsaints.com" },
  { id: "o011", name: "Oversized Blazer", brand: "The Row", price: 2200, category: "outerwear", styles: ["Clean Minimal", "Old Money", "Business"], occasions: ["Work", "Date Night", "Event"], genders: ["women"], colors: ["Cream", "Camel", "Charcoal"], imageUrl: uns("1507003211169-0a1dd7228f2d"), purchaseUrl: "https://www.therow.com" },
  { id: "o012", name: "Logo Windbreaker", brand: "Off-White", price: 1290, category: "outerwear", styles: ["Luxury Streetwear", "Techwear"], occasions: ["Casual", "Streetwear"], genders: ["men", "women"], colors: ["Black", "Yellow"], imageUrl: uns("1539008835657-9e8e9680c956"), purchaseUrl: "https://www.off---white.com" },
  { id: "o013", name: "Perfect Blazer", brand: "Zara", price: 149, category: "outerwear", styles: ["Business", "Clean Minimal"], occasions: ["Work", "Date Night", "Casual"], genders: ["women", "men"], colors: ["Black", "Ecru", "Plaid"], imageUrl: uns("1507003211169-0a1dd7228f2d"), purchaseUrl: "https://www.zara.com" },
  { id: "o014", name: "Cashmere Overcoat", brand: "Kiton", price: 8900, category: "outerwear", styles: ["Old Money", "Business"], occasions: ["Work", "Event"], genders: ["men"], colors: ["Charcoal", "Camel", "Navy"], imageUrl: uns("1591047139829-d91aecb6caea"), purchaseUrl: "https://www.kiton.com" },

  // ── FORMAL SUITS & TUXEDOS — Men ─────────────────────────────────────────
  { id: "fs01", name: "Classic Black Tuxedo Jacket", brand: "Tom Ford", price: 4800, category: "outerwear", styles: ["Evening", "Old Money"], occasions: ["Formal", "Event"], genders: ["men"], colors: ["Black"], imageUrl: uns("1507003211169-0a1dd7228f2d"), purchaseUrl: "https://www.tomford.com" },
  { id: "fs02", name: "Peak-Lapel Tuxedo Jacket", brand: "Brioni", price: 6200, category: "outerwear", styles: ["Evening", "Old Money"], occasions: ["Formal", "Event"], genders: ["men"], colors: ["Black", "Midnight Blue"], imageUrl: uns("1507003211169-0a1dd7228f2d"), purchaseUrl: "https://www.brioni.com" },
  { id: "fs03", name: "Shawl-Lapel Dinner Jacket", brand: "Ralph Lauren Purple Label", price: 3900, category: "outerwear", styles: ["Evening", "Old Money"], occasions: ["Formal", "Event"], genders: ["men"], colors: ["Black", "White", "Ivory"], imageUrl: uns("1552902865-b72c031ac5ea"), purchaseUrl: "https://www.ralphlauren.com" },
  { id: "fs04", name: "Single-Breasted Suit Jacket", brand: "Canali", price: 2800, category: "outerwear", styles: ["Business", "Old Money"], occasions: ["Formal", "Work", "Event"], genders: ["men"], colors: ["Charcoal", "Navy", "Black", "Mid Grey"], imageUrl: uns("1591047139829-d91aecb6caea"), purchaseUrl: "https://www.canali.com" },
  { id: "fs05", name: "Double-Breasted Suit Jacket", brand: "Ermenegildo Zegna", price: 3400, category: "outerwear", styles: ["Business", "Old Money"], occasions: ["Formal", "Work", "Event"], genders: ["men"], colors: ["Charcoal", "Navy", "Dark Brown", "Slate"], imageUrl: uns("1591047139829-d91aecb6caea"), purchaseUrl: "https://www.zegna.com" },
  { id: "fs06", name: "Velvet Smoking Jacket", brand: "Gucci", price: 3600, category: "outerwear", styles: ["Evening", "Old Money"], occasions: ["Formal", "Event", "Party"], genders: ["men"], colors: ["Black", "Burgundy", "Forest Green", "Navy"], imageUrl: uns("1507003211169-0a1dd7228f2d"), purchaseUrl: "https://www.gucci.com" },
  { id: "fs07", name: "Three-Piece Suit Jacket", brand: "Huntsman Savile Row", price: 5500, category: "outerwear", styles: ["Business", "Old Money"], occasions: ["Formal", "Work", "Event"], genders: ["men"], colors: ["Charcoal", "Navy Pin Stripe", "Black", "Mid Grey"], imageUrl: uns("1552902865-b72c031ac5ea"), purchaseUrl: "https://www.huntsmansavilerow.com" },
  { id: "fs08", name: "Midnight Blue Tuxedo", brand: "Dolce & Gabbana", price: 4200, category: "outerwear", styles: ["Evening", "Old Money"], occasions: ["Formal", "Event"], genders: ["men"], colors: ["Midnight Blue", "Black"], imageUrl: uns("1507003211169-0a1dd7228f2d"), purchaseUrl: "https://www.dolcegabbana.com" },

  // ── FORMAL SHIRTS — Men ───────────────────────────────────────────────────
  { id: "fsh01", name: "Wing-Collar Tuxedo Shirt", brand: "Turnbull & Asser", price: 480, category: "top", styles: ["Evening", "Old Money"], occasions: ["Formal", "Event"], genders: ["men"], colors: ["White", "Ivory"], imageUrl: uns("1521572163474-6864f9cf17ab"), purchaseUrl: "https://www.turnbullandasser.com" },
  { id: "fsh02", name: "Pleated-Front Dress Shirt", brand: "Charvet", price: 620, category: "top", styles: ["Evening", "Old Money"], occasions: ["Formal", "Event"], genders: ["men"], colors: ["White", "Ivory", "Pale Blue"], imageUrl: uns("1521572163474-6864f9cf17ab"), purchaseUrl: "https://www.charvet.com" },
  { id: "fsh03", name: "French Cuff Formal Shirt", brand: "Brioni", price: 540, category: "top", styles: ["Business", "Old Money"], occasions: ["Formal", "Work", "Event"], genders: ["men"], colors: ["White", "Pale Blue", "Ivory", "Light Pink"], imageUrl: uns("1521572163474-6864f9cf17ab"), purchaseUrl: "https://www.brioni.com" },
  { id: "fsh04", name: "Marcella Bib Dress Shirt", brand: "Turnbull & Asser", price: 510, category: "top", styles: ["Evening", "Old Money"], occasions: ["Formal"], genders: ["men"], colors: ["White", "Ivory"], imageUrl: uns("1521572163474-6864f9cf17ab"), purchaseUrl: "https://www.turnbullandasser.com" },

  // ── FORMAL TROUSERS — Men ─────────────────────────────────────────────────
  { id: "ftr01", name: "Satin-Stripe Tuxedo Trousers", brand: "Tom Ford", price: 1200, category: "bottom", styles: ["Evening", "Old Money"], occasions: ["Formal", "Event"], genders: ["men"], colors: ["Black", "Midnight Blue"], imageUrl: uns("1552902865-b72c031ac5ea"), purchaseUrl: "https://www.tomford.com" },
  { id: "ftr02", name: "Flat-Front Dress Trousers", brand: "Canali", price: 680, category: "bottom", styles: ["Business", "Old Money"], occasions: ["Formal", "Work", "Event"], genders: ["men"], colors: ["Charcoal", "Navy", "Black", "Mid Grey"], imageUrl: uns("1552902865-b72c031ac5ea"), purchaseUrl: "https://www.canali.com" },
  { id: "ftr03", name: "Pleated Formal Trousers", brand: "Brioni", price: 980, category: "bottom", styles: ["Evening", "Old Money"], occasions: ["Formal", "Event"], genders: ["men"], colors: ["Black", "Charcoal", "Midnight Blue"], imageUrl: uns("1552902865-b72c031ac5ea"), purchaseUrl: "https://www.brioni.com" },
  { id: "ftr04", name: "Wide-Leg Formal Trouser", brand: "Ermenegildo Zegna", price: 790, category: "bottom", styles: ["Business", "Old Money"], occasions: ["Formal", "Work", "Event"], genders: ["men"], colors: ["Charcoal", "Navy", "Slate", "Black"], imageUrl: uns("1552902865-b72c031ac5ea"), purchaseUrl: "https://www.zegna.com" },

  // ── SHOES — Women ─────────────────────────────────────────────────────────
  { id: "s001", name: "Slingback Kitten Heel", brand: "Miu Miu", price: 780, category: "shoes", styles: ["Old Money", "Business", "Y2K Revival"], occasions: ["Work", "Date Night", "Event", "Casual"], genders: ["women"], colors: ["Nude", "Black", "Red"], imageUrl: uns("1543163521-1bf539c55dd2"), purchaseUrl: "https://www.miumiu.com" },
  { id: "s002", name: "Crystal-Embellished Pump", brand: "Manolo Blahnik", price: 1250, category: "shoes", styles: ["Evening", "Old Money"], occasions: ["Event", "Date Night", "Party"], genders: ["women"], colors: ["Black", "Nude", "Silver"], imageUrl: uns("1543163521-1bf539c55dd2"), purchaseUrl: "https://www.manoloblahnik.com" },
  { id: "s003", name: "Square-Toe Boot", brand: "Bottega Veneta", price: 1350, category: "shoes", styles: ["Clean Minimal", "Old Money", "Luxury Streetwear"], occasions: ["Casual", "Work", "Date Night", "Event"], genders: ["women"], colors: ["Black", "Cognac", "Ivory"], imageUrl: uns("1608256246005-4e6b4e65f82c"), purchaseUrl: "https://www.bottegaveneta.com" },
  { id: "s004", name: "Woven Flat Sandal", brand: "Bottega Veneta", price: 780, category: "shoes", styles: ["Vacation Luxe", "Old Money", "Clean Minimal"], occasions: ["Vacation", "Casual"], genders: ["women"], colors: ["Tan", "Black", "Ivory"], imageUrl: uns("1515347619252-60a4bf4fff4f"), purchaseUrl: "https://www.bottegaveneta.com" },
  { id: "s005", name: "Leather Sneaker", brand: "Common Projects", price: 580, category: "shoes", styles: ["Clean Minimal", "Luxury Streetwear"], occasions: ["Casual", "Streetwear"], genders: ["women"], colors: ["White", "Black", "Tan"], imageUrl: uns("1542291026-7eec264c27ff"), purchaseUrl: "https://www.commonprojects.com" },
  { id: "s006", name: "Platform Mule", brand: "Versace", price: 680, category: "shoes", styles: ["Y2K Revival", "Evening"], occasions: ["Party", "Date Night", "Event"], genders: ["women"], colors: ["Gold", "Silver", "Black"], imageUrl: uns("1543163521-1bf539c55dd2"), purchaseUrl: "https://www.versace.com" },
  { id: "s007", name: "Amina Calf Satin Pump", brand: "Amina Muaddi", price: 680, category: "shoes", styles: ["Evening", "Y2K Revival"], occasions: ["Event", "Party", "Date Night"], genders: ["women"], colors: ["Crimson", "Black", "Nude"], imageUrl: uns("1543163521-1bf539c55dd2"), purchaseUrl: "https://www.aminamuaddi.com" },
  { id: "s008", name: "Platform Sneaker", brand: "Stella McCartney", price: 680, category: "shoes", styles: ["Luxury Streetwear", "Y2K Revival"], occasions: ["Casual", "Streetwear"], genders: ["women"], colors: ["White", "Black"], imageUrl: uns("1542291026-7eec264c27ff"), purchaseUrl: "https://www.stellamccartney.com" },
  { id: "s009", name: "Miller Sandal", brand: "Tory Burch", price: 258, category: "shoes", styles: ["Old Money", "Vacation Luxe"], occasions: ["Vacation", "Casual"], genders: ["women"], colors: ["Gold", "Ivory", "Black"], imageUrl: uns("1515347619252-60a4bf4fff4f"), purchaseUrl: "https://www.toryburch.com" },
  { id: "s010", name: "Pointed-Toe Flat", brand: "A.P.C.", price: 380, category: "shoes", styles: ["Clean Minimal", "Old Money", "Business"], occasions: ["Work", "Casual", "Date Night"], genders: ["women"], colors: ["Black", "Nude", "Tan"], imageUrl: uns("1543163521-1bf539c55dd2"), purchaseUrl: "https://www.apc.fr" },
  { id: "s011", name: "Platform Ankle Boot", brand: "SHEIN", price: 38, category: "shoes", styles: ["Y2K Revival", "Casual"], occasions: ["Casual", "Party", "Date Night"], genders: ["women"], colors: ["Black", "White"], imageUrl: uns("1608256246005-4e6b4e65f82c"), purchaseUrl: "https://www.shein.com" },
  { id: "s012", name: "Strappy Stiletto", brand: "Fashion Nova", price: 45, category: "shoes", styles: ["Y2K Revival", "Evening"], occasions: ["Party", "Date Night"], genders: ["women"], colors: ["Black", "Gold", "Clear"], imageUrl: uns("1543163521-1bf539c55dd2"), purchaseUrl: "https://www.fashionnova.com" },
  { id: "s013", name: "Leather Derby", brand: "Sandro", price: 295, category: "shoes", styles: ["Business", "Clean Minimal", "Old Money"], occasions: ["Work", "Casual"], genders: ["women"], colors: ["Black", "Cognac"], imageUrl: uns("1608256246005-4e6b4e65f82c"), purchaseUrl: "https://www.sandro-paris.com" },

  // ── SHOES — Men ───────────────────────────────────────────────────────────
  { id: "s014", name: "Achilles Sneaker", brand: "Common Projects", price: 580, category: "shoes", styles: ["Clean Minimal", "Old Money", "Luxury Streetwear"], occasions: ["Casual", "Date Night", "Streetwear"], genders: ["men"], colors: ["White", "Black", "Tan"], imageUrl: uns("1542291026-7eec264c27ff"), purchaseUrl: "https://www.commonprojects.com" },
  { id: "s015", name: "Triple S Sneaker", brand: "Balenciaga", price: 1095, category: "shoes", styles: ["Luxury Streetwear", "Y2K Revival"], occasions: ["Casual", "Streetwear"], genders: ["men", "women"], colors: ["White", "Mixed", "Black"], imageUrl: uns("1491553895911-0055eca6402d"), purchaseUrl: "https://www.balenciaga.com" },
  { id: "s016", name: "GORE-TEX Sneaker", brand: "Rick Owens", price: 1150, category: "shoes", styles: ["Techwear", "Luxury Streetwear"], occasions: ["Casual", "Streetwear"], genders: ["men"], colors: ["Black", "Milk"], imageUrl: uns("1491553895911-0055eca6402d"), purchaseUrl: "https://www.rickowens.eu" },
  { id: "s017", name: "Oxford Brogue", brand: "Church's", price: 680, category: "shoes", styles: ["Old Money", "Business"], occasions: ["Work", "Date Night", "Event"], genders: ["men"], colors: ["Cognac", "Black", "Burgundy"], imageUrl: uns("1608256246005-4e6b4e65f82c"), purchaseUrl: "https://www.church-footwear.com" },
  { id: "s018", name: "Suede Penny Loafer", brand: "Gucci", price: 890, category: "shoes", styles: ["Old Money", "Casual", "Business"], occasions: ["Casual", "Work", "Date Night"], genders: ["men"], colors: ["Tan", "Navy", "Black"], imageUrl: uns("1614252235316-8c857d38b5f4"), purchaseUrl: "https://www.gucci.com" },
  { id: "s019", name: "Tabi Split-Toe Boot", brand: "Maison Margiela", price: 1450, category: "shoes", styles: ["Techwear", "Luxury Streetwear"], occasions: ["Casual", "Date Night", "Event"], genders: ["men"], colors: ["Black", "White"], imageUrl: uns("1608256246005-4e6b4e65f82c"), purchaseUrl: "https://www.maisonmargiela.com" },
  { id: "s020", name: "Air Force 1 Low", brand: "Nike", price: 110, category: "shoes", styles: ["Luxury Streetwear", "Casual"], occasions: ["Casual", "Streetwear"], genders: ["men", "women"], colors: ["White", "Black", "Triple Black"], imageUrl: uns("1542291026-7eec264c27ff"), purchaseUrl: "https://www.nike.com" },
  { id: "s021", name: "Canvas Court Shoe", brand: "Converse", price: 65, category: "shoes", styles: ["Casual", "Y2K Revival"], occasions: ["Casual", "Streetwear"], genders: ["men", "women"], colors: ["White", "Black", "Red"], imageUrl: uns("1542291026-7eec264c27ff"), purchaseUrl: "https://www.converse.com" },
  { id: "s022", name: "Trainer Sneaker", brand: "Veja", price: 195, category: "shoes", styles: ["Clean Minimal", "Casual"], occasions: ["Casual", "Streetwear"], genders: ["men", "women"], colors: ["White/Green", "White/Red", "All White"], imageUrl: uns("1542291026-7eec264c27ff"), purchaseUrl: "https://www.veja-store.com" },
  { id: "s023", name: "Sneaker Low Top", brand: "Golden Goose", price: 595, category: "shoes", styles: ["Luxury Streetwear", "Casual"], occasions: ["Casual", "Date Night", "Streetwear"], genders: ["men", "women"], colors: ["White Distressed", "Silver Star", "Black"], imageUrl: uns("1542291026-7eec264c27ff"), purchaseUrl: "https://www.goldengoose.com" },
  { id: "s024", name: "Woven Leather Sandal", brand: "Tod's", price: 420, category: "shoes", styles: ["Old Money", "Vacation Luxe"], occasions: ["Vacation", "Casual"], genders: ["men"], colors: ["Tan", "Dark Brown"], imageUrl: uns("1515347619252-60a4bf4fff4f"), purchaseUrl: "https://www.tods.com" },

  // ── FORMAL SHOES — Women ──────────────────────────────────────────────────
  { id: "fsw01", name: "Strappy Satin Stiletto", brand: "Jimmy Choo", price: 1250, category: "shoes", styles: ["Evening", "Old Money"], occasions: ["Formal", "Event", "Date Night"], genders: ["women"], colors: ["Silver", "Gold", "Black", "Nude"], imageUrl: uns("1543163521-1bf539c55dd2"), purchaseUrl: "https://www.jimmychoo.com" },
  { id: "fsw02", name: "Duchess Satin Heeled Mule", brand: "Manolo Blahnik", price: 1190, category: "shoes", styles: ["Evening", "Old Money"], occasions: ["Formal", "Event", "Date Night"], genders: ["women"], colors: ["Ivory", "Blush", "Black", "Red"], imageUrl: uns("1543163521-1bf539c55dd2"), purchaseUrl: "https://www.manoloblahnik.com" },
  { id: "fsw03", name: "Crystal-Bow Pump", brand: "Roger Vivier", price: 1480, category: "shoes", styles: ["Evening", "Old Money"], occasions: ["Formal", "Event"], genders: ["women"], colors: ["Silver", "Gold", "Black", "Nude"], imageUrl: uns("1543163521-1bf539c55dd2"), purchaseUrl: "https://www.rogervivier.com" },
  { id: "fsw04", name: "Pointed-Toe Evening Heel", brand: "Gianvito Rossi", price: 980, category: "shoes", styles: ["Evening", "Clean Minimal"], occasions: ["Formal", "Event", "Date Night"], genders: ["women"], colors: ["Nude", "Black", "Ivory", "Silver"], imageUrl: uns("1543163521-1bf539c55dd2"), purchaseUrl: "https://www.gianvitorossi.com" },
  { id: "fsw05", name: "Embellished Sandal Heel", brand: "René Caovilla", price: 1350, category: "shoes", styles: ["Evening", "Old Money"], occasions: ["Formal", "Event"], genders: ["women"], colors: ["Gold", "Silver", "Champagne", "Black"], imageUrl: uns("1543163521-1bf539c55dd2"), purchaseUrl: "https://www.renecaovilla.com" },

  // ── FORMAL SHOES — Men ────────────────────────────────────────────────────
  { id: "fsm01", name: "Patent Leather Oxford", brand: "John Lobb", price: 1850, category: "shoes", styles: ["Evening", "Old Money"], occasions: ["Formal", "Event", "Work"], genders: ["men"], colors: ["Black", "Midnight Blue"], imageUrl: uns("1608256246005-4e6b4e65f82c"), purchaseUrl: "https://www.johnlobb.com" },
  { id: "fsm02", name: "Captoe Derby Dress Shoe", brand: "Edward Green", price: 1620, category: "shoes", styles: ["Business", "Old Money"], occasions: ["Formal", "Work", "Event"], genders: ["men"], colors: ["Black", "Dark Brown", "Oxblood"], imageUrl: uns("1608256246005-4e6b4e65f82c"), purchaseUrl: "https://www.edwardgreen.com" },
  { id: "fsm03", name: "Velvet Evening Slipper", brand: "Crockett & Jones", price: 890, category: "shoes", styles: ["Evening", "Old Money"], occasions: ["Formal", "Event"], genders: ["men"], colors: ["Black", "Burgundy", "Navy", "Forest Green"], imageUrl: uns("1608256246005-4e6b4e65f82c"), purchaseUrl: "https://www.crockettandjones.com" },
  { id: "fsm04", name: "Whole-Cut Leather Oxford", brand: "Berluti", price: 2100, category: "shoes", styles: ["Evening", "Old Money"], occasions: ["Formal", "Event", "Work"], genders: ["men"], colors: ["Black", "Cognac", "Dark Brown"], imageUrl: uns("1608256246005-4e6b4e65f82c"), purchaseUrl: "https://www.berluti.com" },

  // ── BAGS ──────────────────────────────────────────────────────────────────
  { id: "g001", name: "Cassette Mini Bag", brand: "Bottega Veneta", price: 2990, category: "bag", styles: ["Clean Minimal", "Old Money", "Evening"], occasions: ["Work", "Date Night", "Event", "Casual"], genders: ["women"], colors: ["Black", "Cognac", "Ivory"], imageUrl: uns("1548036328-c9fa89d128fa"), purchaseUrl: "https://www.bottegaveneta.com" },
  { id: "g002", name: "Classic Flap Bag", brand: "Chanel", price: 9800, category: "bag", styles: ["Old Money", "Evening", "Business"], occasions: ["Event", "Date Night", "Work"], genders: ["women"], colors: ["Black", "Beige", "Navy"], imageUrl: uns("1584917865442-de89df76afd3"), purchaseUrl: "https://www.chanel.com" },
  { id: "g003", name: "Saddle Bag", brand: "Dior", price: 3900, category: "bag", styles: ["Old Money", "Luxury Streetwear", "Business"], occasions: ["Casual", "Work", "Date Night"], genders: ["women"], colors: ["Tan", "Black", "Denim"], imageUrl: uns("1590874175748-39b18e7ab1e9"), purchaseUrl: "https://www.dior.com" },
  { id: "g004", name: "Neverfull MM", brand: "Louis Vuitton", price: 2080, category: "bag", styles: ["Old Money", "Luxury Streetwear", "Business"], occasions: ["Work", "Casual", "Event"], genders: ["women"], colors: ["Monogram", "Damier Ebene"], imageUrl: uns("1571513800374-841571dbf2e2"), purchaseUrl: "https://us.louisvuitton.com" },
  { id: "g005", name: "Le Chiquito Mini", brand: "Jacquemus", price: 680, category: "bag", styles: ["Clean Minimal", "Vacation Luxe", "Y2K Revival"], occasions: ["Casual", "Date Night", "Vacation", "Party"], genders: ["women"], colors: ["Tan", "Pink", "White"], imageUrl: uns("1548036328-c9fa89d128fa"), purchaseUrl: "https://www.jacquemus.com" },
  { id: "g006", name: "Puzzle Small Bag", brand: "Loewe", price: 3100, category: "bag", styles: ["Clean Minimal", "Old Money"], occasions: ["Casual", "Work", "Date Night"], genders: ["women"], colors: ["Tan", "Black", "Ivory"], imageUrl: uns("1548036328-c9fa89d128fa"), purchaseUrl: "https://www.loewe.com" },
  { id: "g007", name: "Canvas Tote", brand: "Goyard", price: 1600, category: "bag", styles: ["Old Money", "Clean Minimal"], occasions: ["Casual", "Work"], genders: ["women", "men"], colors: ["Natural", "Black", "Red"], imageUrl: uns("1571513800374-841571dbf2e2"), purchaseUrl: "https://www.goyard.com" },
  { id: "g008", name: "Tabby Shoulder Bag", brand: "Coach", price: 495, category: "bag", styles: ["Old Money", "Casual"], occasions: ["Casual", "Work", "Date Night"], genders: ["women"], colors: ["Tan", "Black", "Chalk"], imageUrl: uns("1548036328-c9fa89d128fa"), purchaseUrl: "https://www.coach.com" },
  { id: "g009", name: "Explorer Backpack", brand: "Louis Vuitton", price: 2850, category: "bag", styles: ["Old Money", "Luxury Streetwear"], occasions: ["Casual", "Work", "Streetwear"], genders: ["men"], colors: ["Monogram", "Taiga Leather"], imageUrl: uns("1584917865442-de89df76afd3"), purchaseUrl: "https://us.louisvuitton.com" },
  { id: "g010", name: "Falabella Chain Bag", brand: "Stella McCartney", price: 1250, category: "bag", styles: ["Old Money", "Evening", "Y2K Revival"], occasions: ["Event", "Date Night", "Casual"], genders: ["women"], colors: ["Black", "Ivory", "Silver"], imageUrl: uns("1584917865442-de89df76afd3"), purchaseUrl: "https://www.stellamccartney.com" },
  { id: "g011", name: "Mini Crossbody Bag", brand: "ASOS", price: 48, category: "bag", styles: ["Casual", "Y2K Revival"], occasions: ["Casual", "Party", "Date Night"], genders: ["women"], colors: ["Black", "Tan", "White"], imageUrl: uns("1548036328-c9fa89d128fa"), purchaseUrl: "https://www.asos.com" },
  { id: "g012", name: "Croc-Effect Mini Bag", brand: "Zara", price: 69, category: "bag", styles: ["Casual", "Y2K Revival", "Evening"], occasions: ["Date Night", "Party", "Casual"], genders: ["women"], colors: ["Black", "White", "Red"], imageUrl: uns("1548036328-c9fa89d128fa"), purchaseUrl: "https://www.zara.com" },

  // ── ACCESSORIES ───────────────────────────────────────────────────────────
  { id: "a001", name: "Handwoven Straw Hat", brand: "Jacquemus", price: 390, category: "accessories", styles: ["Vacation Luxe", "Y2K Revival"], occasions: ["Vacation"], genders: ["women"], colors: ["Natural"], imageUrl: uns("1473496169904-658ba7574b0d"), purchaseUrl: "https://www.jacquemus.com" },
  { id: "a002", name: "Logo Cap", brand: "Gucci", price: 380, category: "accessories", styles: ["Luxury Streetwear"], occasions: ["Casual", "Streetwear"], genders: ["men", "women"], colors: ["Black", "Beige GG"], imageUrl: uns("1473496169904-658ba7574b0d"), purchaseUrl: "https://www.gucci.com" },
  { id: "a003", name: "Silk GG Scarf", brand: "Gucci", price: 490, category: "accessories", styles: ["Old Money", "Luxury Streetwear"], occasions: ["Casual", "Work", "Vacation"], genders: ["women"], colors: ["GG Print", "Floral"], imageUrl: uns("1611558709798-e009c8fd7706"), purchaseUrl: "https://www.gucci.com" },
  { id: "a004", name: "Tonneau Watch", brand: "Tom Ford", price: 3400, category: "accessories", styles: ["Old Money", "Business", "Evening"], occasions: ["Work", "Event", "Date Night"], genders: ["men"], colors: ["Steel/Brown", "Gold/Black"], imageUrl: uns("1523275335684-37898b6baf30"), purchaseUrl: "https://www.tomford.com" },
  { id: "a005", name: "Cashmere Blanket Scarf", brand: "Loro Piana", price: 1290, category: "accessories", styles: ["Old Money", "Business"], occasions: ["Work", "Casual"], genders: ["women", "men"], colors: ["Camel", "Navy/Red"], imageUrl: uns("1611558709798-e009c8fd7706"), purchaseUrl: "https://www.loropiana.com" },
  { id: "a006", name: "Baseball Cap", brand: "Polo Ralph Lauren", price: 65, category: "accessories", styles: ["Casual", "Vacation Luxe"], occasions: ["Casual", "Vacation", "Streetwear"], genders: ["women", "men"], colors: ["Navy", "White", "Pink"], imageUrl: uns("1473496169904-658ba7574b0d"), purchaseUrl: "https://www.ralphlauren.com" },
  { id: "a007", name: "Silver Link Belt", brand: "Versace", price: 690, category: "accessories", styles: ["Y2K Revival", "Evening", "Luxury Streetwear"], occasions: ["Party", "Date Night", "Event"], genders: ["women"], colors: ["Silver", "Gold"], imageUrl: uns("1611558709798-e009c8fd7706"), purchaseUrl: "https://www.versace.com" },
  { id: "a008", name: "Leather Belt", brand: "Hermès", price: 780, category: "accessories", styles: ["Old Money", "Business"], occasions: ["Work", "Casual", "Date Night"], genders: ["men"], colors: ["Cognac", "Black"], imageUrl: uns("1611558709798-e009c8fd7706"), purchaseUrl: "https://www.hermes.com" },

  // ── JEWELRY ───────────────────────────────────────────────────────────────
  { id: "j001", name: "Diamond Drop Earrings", brand: "Bulgari", price: 1900, category: "jewelry", styles: ["Evening", "Old Money"], occasions: ["Event", "Date Night", "Party"], genders: ["women"], colors: ["Gold/Diamond"], imageUrl: uns("1599643477877-530eb83abc8e"), purchaseUrl: "https://www.bulgari.com" },
  { id: "j002", name: "Gold Bamboo Hoops", brand: "Tory Burch", price: 168, category: "jewelry", styles: ["Old Money", "Casual", "Vacation Luxe"], occasions: ["Casual", "Work", "Vacation", "Date Night"], genders: ["women"], colors: ["Gold"], imageUrl: uns("1599643477877-530eb83abc8e"), purchaseUrl: "https://www.toryburch.com" },
  { id: "j003", name: "Bold Chain Necklace", brand: "ASOS", price: 22, category: "jewelry", styles: ["Y2K Revival", "Luxury Streetwear"], occasions: ["Party", "Date Night", "Casual"], genders: ["women", "men"], colors: ["Gold", "Silver"], imageUrl: uns("1599643477877-530eb83abc8e"), purchaseUrl: "https://www.asos.com" },
  { id: "j004", name: "Pearl Drop Earrings", brand: "Mikimoto", price: 2400, category: "jewelry", styles: ["Old Money", "Evening", "Business"], occasions: ["Event", "Work", "Date Night"], genders: ["women"], colors: ["White Pearl/Gold"], imageUrl: uns("1599643477877-530eb83abc8e"), purchaseUrl: "https://www.mikimoto.com" },
  { id: "j005", name: "Cuff Bracelet", brand: "Bottega Veneta", price: 980, category: "jewelry", styles: ["Clean Minimal", "Old Money", "Evening"], occasions: ["Event", "Date Night", "Work"], genders: ["women"], colors: ["Silver", "Gold"], imageUrl: uns("1599643477877-530eb83abc8e"), purchaseUrl: "https://www.bottegaveneta.com" },
];

// ─── Occasion Normalization ───────────────────────────────────────────────────

const OCCASION_MAP: Record<string, string[]> = {
  "Casual": ["Casual", "Vacation"],
  "Date Night": ["Date Night", "Evening", "Party"],
  "Work": ["Work", "Business"],
  "Vacation": ["Vacation", "Casual", "Resort"],
  "Event": ["Event", "Evening", "Party"],
  "Streetwear": ["Streetwear", "Casual"],
  "Evening": ["Evening", "Event", "Party", "Date Night"],
  "Party": ["Party", "Evening", "Date Night"],
  "Formal": ["Formal", "Event", "Evening"],
  "Resort": ["Vacation", "Casual"],
  "Street": ["Streetwear", "Casual"],
  "Cultural": ["Event", "Casual"],
};

// ─── Style map — what styles work for each occasion ──────────────────────────

const OCCASION_STYLES: Record<string, string[]> = {
  "Casual": ["Old Money", "Clean Minimal", "Luxury Streetwear", "Y2K Revival", "Vacation Luxe"],
  "Date Night": ["Old Money", "Clean Minimal", "Evening", "Y2K Revival"],
  "Work": ["Old Money", "Business", "Clean Minimal"],
  "Vacation": ["Vacation Luxe", "Clean Minimal", "Y2K Revival", "Old Money"],
  "Event": ["Evening", "Old Money", "Business", "Y2K Revival"],
  "Streetwear": ["Luxury Streetwear", "Techwear", "Y2K Revival"],
  "Evening": ["Evening", "Old Money", "Y2K Revival"],
  "Party": ["Y2K Revival", "Evening", "Luxury Streetwear"],
  "Formal": ["Evening", "Old Money", "Business"],
};

// ─── Look name style tags ─────────────────────────────────────────────────────

const STYLE_TAGS: Record<string, string[]> = {
  "Old Money": ["heritage", "quiet luxury", "tailored", "cashmere", "Italian craftsmanship"],
  "Clean Minimal": ["minimal", "architectural", "tonal", "refined basics", "structural"],
  "Luxury Streetwear": ["designer", "logo", "streetwear", "premium drip", "limited edition"],
  "Evening": ["evening", "glamour", "opulent", "statement", "couture"],
  "Business": ["power dressing", "tailored", "professional", "structured", "polished"],
  "Y2K Revival": ["y2k", "metallic", "low-rise", "bodycon", "2000s"],
  "Vacation Luxe": ["resort", "silk", "effortless", "sun-kissed", "luxe vacation"],
  "Formal": ["black tie", "tuxedo", "gown", "white tie", "couture", "ceremony"],
  "Techwear": ["technical", "utility", "functional", "GORE-TEX", "futuristic"],
};

// ─── Core engine ──────────────────────────────────────────────────────────────

export function generateLooks(params: GenerateParams): Look[] {
  const { gender, occasion, budget, prompt = "", favoriteStyles = [], count = 6 } = params;
  const { max: budgetMax } = parseBudget(budget);
  const genderKey = gender.toLowerCase() as "women" | "men" | "unisex";

  // Allowed occasions for filtering
  const allowedOccasions = OCCASION_MAP[occasion] ?? [occasion, "Casual"];

  // Style priorities: user's favorites first, then occasion defaults
  const occasionStyles = OCCASION_STYLES[occasion] ?? OCCASION_STYLES["Casual"];
  const stylePool = [
    ...favoriteStyles.filter((s) => occasionStyles.includes(s)),
    ...occasionStyles,
  ];

  // Gender filter
  function matchesGender(item: CatalogItem): boolean {
    if (genderKey === "unisex") return true;
    return item.genders.includes(genderKey) || item.genders.includes("unisex");
  }

  // Occasion filter (relaxed: at least one occasion matches)
  function matchesOccasion(item: CatalogItem): boolean {
    return item.occasions.some((o) => allowedOccasions.includes(o));
  }

  // Price filter: individual item should be affordable within budget
  function matchesBudget(item: CatalogItem): boolean {
    // An item shouldn't cost more than 80% of total budget on its own
    return item.price <= budgetMax * 0.8;
  }

  // Filtered pools per category
  function pool(cat: CatalogItem["category"]): CatalogItem[] {
    return CATALOG.filter(
      (item) =>
        item.category === cat &&
        matchesGender(item) &&
        matchesOccasion(item) &&
        matchesBudget(item)
    );
  }

  const tops = pool("top");
  const bottoms = pool("bottom");
  const dresses = pool("dress");
  const outerwear = pool("outerwear");
  const shoes = pool("shoes");
  const bags = pool("bag");
  const accessories = pool("accessories");
  const jewelry = pool("jewelry");

  const looks: Look[] = [];
  let attempts = 0;

  while (looks.length < count && attempts < 200) {
    attempts++;

    // Pick a dominant style and color palette for this look
    const dominantStyle = pick(stylePool.length > 0 ? stylePool : occasionStyles);
    const selectedPalette = pick(COLOR_PALETTES);

    // Decide outfit structure
    const useDress =
      genderKey === "women" &&
      dresses.length > 0 &&
      Math.random() > 0.5;

    const pieces: OutfitPiece[] = [];
    let total = 0;

    // Helper: pick style + palette-preferring item from a pool
    const stylePick = (pool_: CatalogItem[]): CatalogItem | null => {
      if (pool_.length === 0) return null;
      // Best: matches dominant style AND color palette
      const perfect = pool_.filter(
        (i) => i.styles.includes(dominantStyle) && paletteMatch(i.colors, selectedPalette.colors)
      );
      if (perfect.length > 0) return pick(perfect);
      // Good: matches dominant style
      const styleMatch = pool_.filter((i) => i.styles.includes(dominantStyle));
      if (styleMatch.length > 0) return pick(styleMatch);
      // OK: matches palette only
      const paletteOnly = pool_.filter((i) => paletteMatch(i.colors, selectedPalette.colors));
      if (paletteOnly.length > 0) return pick(paletteOnly);
      // Fallback: anything in the pool
      return pick(pool_);
    };

    const addPiece = (item: CatalogItem) => {
      pieces.push({
        id: item.id,
        name: item.name,
        brand: item.brand,
        price: item.price,
        category: item.category,
        color: pickPaletteColor(item.colors, selectedPalette.colors),
        imageUrl: getPieceImage(item.category, item.id),
        purchaseUrl: item.purchaseUrl,
      });
      total += item.price;
    };

    if (useDress) {
      // Structure: dress + shoes + (optional bag) + (optional jewelry)
      const dress = stylePick(dresses.filter((d) => d.price <= budgetMax * 0.7));
      if (!dress) continue;
      addPiece(dress);

      const affordableShoes = shoes.filter((s) => s.price + total <= budgetMax * 0.9);
      const shoe = stylePick(affordableShoes);
      if (!shoe) continue;
      addPiece(shoe);

      // Optional bag
      if (total < budgetMax * 0.8 && bags.length > 0) {
        const affordableBags = bags.filter((b) => b.price + total <= budgetMax);
        const bag = stylePick(affordableBags);
        if (bag) addPiece(bag);
      }

      // Optional jewelry
      if (total < budgetMax * 0.9 && jewelry.length > 0) {
        const affordableJewels = jewelry.filter((j) => j.price + total <= budgetMax);
        const jewel = stylePick(affordableJewels);
        if (jewel) addPiece(jewel);
      }
    } else {
      // Structure: top + bottom + shoes + (optional outerwear) + (optional bag/accessory)
      const top = stylePick(tops.filter((t) => t.price <= budgetMax * 0.5));
      if (!top) continue;
      addPiece(top);

      const affordableBottoms = bottoms.filter((b) => b.price + total <= budgetMax * 0.7);
      const bottom = stylePick(affordableBottoms);
      if (!bottom) continue;
      addPiece(bottom);

      const affordableShoes = shoes.filter((s) => s.price + total <= budgetMax * 0.85);
      const shoe = stylePick(affordableShoes);
      if (!shoe) continue;
      addPiece(shoe);

      // Optional outerwear (50% chance, or if budget has room)
      if (outerwear.length > 0 && total < budgetMax * 0.6 && Math.random() > 0.5) {
        const affordableOuter = outerwear.filter((o) => o.price + total <= budgetMax * 0.95);
        const outer = stylePick(affordableOuter);
        if (outer) addPiece(outer);
      }

      // Optional bag (for women mostly) or accessories
      const extras = genderKey === "women" ? bags : accessories;
      if (extras.length > 0 && total < budgetMax * 0.85) {
        const affordableExtras = extras.filter((e) => e.price + total <= budgetMax);
        const extra = stylePick(affordableExtras);
        if (extra) addPiece(extra);
      }
    }

    if (pieces.length < 2) continue;

    // Dedup check — fingerprint by sorted item ids
    const fp = fingerprint(pieces.map((p) => p.id));
    if (_shownFingerprints.has(fp)) continue;
    _shownFingerprints.add(fp);

    // Build the Look — use fp as image seed so each unique outfit gets a unique, consistent photo
    const lookName = generateLookName(occasion);
    const lookDesc = generateDescription(occasion);
    const tags = [
      occasion.toLowerCase(),
      selectedPalette.name.toLowerCase(),
      ...(STYLE_TAGS[dominantStyle] ?? []).slice(0, 2),
      pieces[0].brand.toLowerCase(),
    ];

    looks.push({
      id: `gen_${Date.now()}_${looks.length}_${Math.random().toString(36).substr(2, 6)}`,
      name: lookName,
      description: lookDesc,
      occasion,
      season: ["Spring", "Summer", "Autumn", "Winter", "All Season"][Math.floor(Math.random() * 5)],
      estimatedPrice: total,
      image: getLookImage(dominantStyle, fp),
      pieces,
      style: dominantStyle,
      tags,
    });
  }

  return shuffle(looks);
}
