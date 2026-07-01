/**
 * Simon Yarrell — Dynamic Outfit Engine
 *
 * Assembles unique, budget-filtered outfit looks from a 200+ item catalog
 * spanning 80+ brands across all price tiers. Respects gender, occasion,
 * style, and budget. Tracks shown outfits per session so looks never repeat.
 */

import type { Look, OutfitPiece } from "@/constants/data";
import { TRENDS } from "@/constants/data";
import { isBadUnsId } from "@/constants/badImageIds";
import { CATALOG_EXTRAS } from "./catalogExtras";
import { SHOPIFY_FEED } from "./catalogFeed";
import { LOCAL_PRODUCT_ASSETS } from "../assets/images/catalog/_index";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CatalogItem {
  id: string;
  name: string;
  brand: string;
  price: number;
  category: "top" | "bottom" | "dress" | "outerwear" | "shoes" | "bag" | "accessories" | "jewelry";
  // Optional shoe sub-classification — used to filter shoes by use case
  // ("sneakers" | "dress" | "casual" | "work") when category === "shoes".
  shoeType?: "sneakers" | "dress" | "casual" | "work";
  styles: string[];
  occasions: string[];
  genders: Array<"women" | "men" | "unisex">;
  colors: string[];
  // Optional: a denylisted Unsplash id resolves to undefined via uns(),
  // and downstream UI (ResilientImage) renders the editorial fallback tile.
  imageUrl?: string;
  purchaseUrl: string;
  // ── Real-product enrichment (preferred when present) ──────────────────────
  // productImageUrl: a live photo of the actual item from a brand/retailer CDN.
  //   When set, the look-detail UI uses this instead of the placeholder pool.
  // directProductUrl: the exact PDP for the item. When set, the "Shop this look"
  //   buttons link straight to it instead of a brand-site search.
  productImageUrl?: string;
  directProductUrl?: string;
  /** Local bundled asset (output of `require("...png")`). Highest priority
   *  in the piece-image fallback chain — used for items with AI-generated
   *  product photos shipped in the app bundle (e.g. d001 Column Gown). */
  localProductImage?: number;
}

interface GenerateParams {
  gender: string;       // "Women" | "Men" | "Unisex"
  occasion: string;     // "Casual" | "Date Night" | "Work" | "Vacation" | "Event" | "Streetwear" | "Evening" | "Party"
  budget: string;       // e.g. "$500–$1500"
  prompt?: string;
  favoriteStyles?: string[];
  count?: number;       // how many looks to generate (default 6)
  // When the generation was triggered by tapping "GENERATE MY <CELEB> LOOK"
  // on a celebrity profile, the celeb's signatureBrands list is forwarded
  // here so the catalog picker can prefer those houses (mirrors batch 15's
  // style-based brand bias). Celeb-unique styles (e.g. "Houston Hip-Hop")
  // have no entry in STYLE_SIGNATURE_BRANDS, so this is the only way to
  // make a Drake-look actually feel Drake-coded.
  celebSignatureBrands?: string[];
  // Display name of the celebrity that triggered this generation, if any.
  // Stamped onto every produced Look as `inspiredBy` so the attribution
  // survives navigation into the look detail screen.
  celebName?: string;
  // Strict brand lock — set when the user tapped "STYLE WITH <BRAND>" on a
  // designer card in /shop (batch 83). When defined, every piece slot in
  // every generated look is filtered to ONLY items where `item.brand` is
  // an EXACT match for this string. No cross-brand pollution, even at the
  // relaxed tiers. If the brand has no items in a category (e.g. Louis
  // Vuitton in `top`), that slot is simply skipped — the look may be sparse
  // but it will be 100% on-brand.
  brandLock?: string;
  // Season the user is dressing for ("Spring" | "Summer" | "Autumn" |
  // "Winter" | "All Season" | undefined). When set to a specific season we
  // soft-narrow every clothing pool at construction to items whose inferred
  // seasons include the selected one — so a Summer pick won't surface wool
  // coats, a Winter pick won't surface linen tanks, etc. Soft means: if
  // the narrowing would leave too few items in a category (< 3), we drop
  // the season filter for that category so the look still assembles. Pure
  // accessories (jewelry, bag) are not season-filtered — they read year-
  // round. "All Season" and undefined disable the filter entirely.
  season?: string;
  // TV Show Inspirations flow (constants/tvShows.ts). When a TV muse drives the
  // generation this is true, changing two rules for this flow only:
  //   1. Looks are complete at top+bottom+shoes (women may substitute a dress
  //      and use skirts/sandals) — a handbag is NOT required (the women's-bag
  //      completeness rule is relaxed).
  //   2. NO catalog item may repeat anywhere across the generated grid, for any
  //      gender — full per-batch dedup, not just the Formal Remix occasion.
  tvInspiration?: boolean;
}

// ─── Session dedup tracker ───────────────────────────────────────────────────
// Module-level: persists across calls within an app session
const _shownFingerprints = new Set<string>();
const _shownNames = new Set<string>();

export function resetShownLooks() {
  _shownFingerprints.clear();
  _shownNames.clear();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uns(id: string, w = 480, h = 680): string | undefined {
  // Visual-audit denylist: see constants/badImageIds.ts. Blocked IDs return
  // undefined so the look-detail ResilientImage renders the editorial
  // brand-monogram fallback instead of a wrong/broken thumbnail.
  if (isBadUnsId(id)) return undefined;
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

// ─── Look image pools — gender-split so male profiles see male models, ────────
//     female profiles see female models. Each style has its own distinct set
//     of photo IDs (no cross-style sharing) so every category looks different.
//     Keys: "{Style}_{gender}" with "default_{gender}" fallback.

// All pools use ONLY local PNG assets — Unsplash URIs were failing to load
// (CORS/network) and rendering as solid-black cards. Local requires guarantee
// images render and visually match the style.
const LOOK_IMAGE_POOLS: Record<string, Array<{ uri: string } | number>> = {

  // ══ OLD MONEY ══════════════════════════════════════════════════════════════
  "Old Money_women": [
    require("../assets/images/looks/old_money_weekend_women.png"),
    require("../assets/images/looks/parisian_chic_women.png"),
    require("../assets/images/looks/dark_academia_women.png"),
    require("../assets/images/trends/old_money_women.png"),
    require("../assets/images/looks/cote_dazur_evening_women.png"),
  ],
  "Old Money_men": [
    require("../assets/images/looks/old_money_weekend_men.png"),
    require("../assets/images/looks/parisian_chic_men.png"),
    require("../assets/images/looks/dark_academia_men.png"),
    require("../assets/images/trends/old_money_men.png"),
    require("../assets/images/looks/cote_dazur_evening_men.png"),
    require("../assets/images/look_old_money.png"),
  ],

  // ══ LUXURY STREETWEAR ══════════════════════════════════════════════════════
  "Luxury Streetwear_women": [
    require("../assets/images/looks/luxury_streetwear_icon_women.png"),
    require("../assets/images/trends/luxury_streetwear_women.png"),
    require("../assets/images/looks/luxury_streetwear_icon_women.png"),
    require("../assets/images/looks/urban_minimalist_women.png"),
    require("../assets/images/looks/urban_architect_women.png"),
  ],
  "Luxury Streetwear_men": [
    require("../assets/images/looks/luxury_streetwear_icon_men.png"),
    require("../assets/images/trends/luxury_streetwear_men.png"),
    require("../assets/images/streetwear_hero_men.png"),
    require("../assets/images/streetwear_hero_men.png"),
    require("../assets/images/looks/urban_minimalist_men.png"),
    require("../assets/images/looks/urban_architect_men.png"),
    require("../assets/images/look_streetwear.png"),
  ],

  // ══ TECHWEAR ═══════════════════════════════════════════════════════════════
  "Techwear_women": [
    require("../assets/images/trends/techwear_women.png"),
    require("../assets/images/looks/urban_architect_women.png"),
    require("../assets/images/looks/urban_architect_women.png"),
  ],
  "Techwear_men": [
    require("../assets/images/trends/techwear_men.png"),
    require("../assets/images/looks/urban_architect_men.png"),
    require("../assets/images/looks/urban_architect_men.png"),
    require("../assets/images/look_techwear.png"),
  ],

  // ══ VACATION LUXE ══════════════════════════════════════════════════════════
  "Vacation Luxe_women": [
    require("../assets/images/looks/resort_billionaire_women.png"),
    require("../assets/images/looks/cote_dazur_evening_women.png"),
    require("../assets/images/trends/vacation_luxe_women.png"),
    require("../assets/images/occasions/vacation_women.png"),
  ],
  "Vacation Luxe_men": [
    require("../assets/images/looks/resort_billionaire_men.png"),
    require("../assets/images/looks/cote_dazur_evening_men.png"),
    require("../assets/images/trends/vacation_luxe_men.png"),
    require("../assets/images/occasions/vacation_men.png"),
    require("../assets/images/look_vacation.png"),
  ],

  // ══ EVENING ════════════════════════════════════════════════════════════════
  "Evening_women": [
    require("../assets/images/looks/gala_glamour_women.png"),
    require("../assets/images/looks/cote_dazur_evening_women.png"),
    require("../assets/images/looks/galerie_opening_women.png"),
    require("../assets/images/occasions/event_women.png"),
    require("../assets/images/occasions/date_women.png"),
  ],
  "Evening_men": [
    require("../assets/images/looks/gala_glamour_men.png"),
    require("../assets/images/looks/cote_dazur_evening_men.png"),
    require("../assets/images/looks/galerie_opening_men.png"),
    require("../assets/images/occasions/event_men.png"),
    require("../assets/images/occasions/date_men.png"),
  ],

  // ══ CLEAN MINIMAL ══════════════════════════════════════════════════════════
  "Clean Minimal_women": [
    require("../assets/images/looks/urban_minimalist_women.png"),
    require("../assets/images/looks/galerie_opening_women.png"),
    require("../assets/images/looks/parisian_chic_women.png"),
    require("../assets/images/trends/clean_minimal_women.png"),
    require("../assets/images/looks/urban_architect_women.png"),
  ],
  "Clean Minimal_men": [
    require("../assets/images/looks/urban_minimalist_men.png"),
    require("../assets/images/looks/galerie_opening_men.png"),
    require("../assets/images/looks/parisian_chic_men.png"),
    require("../assets/images/trends/clean_minimal_men.png"),
    require("../assets/images/looks/urban_architect_men.png"),
  ],

  // ══ BUSINESS ═══════════════════════════════════════════════════════════════
  "Business_women": [
    require("../assets/images/looks/power_dressing_women.png"),
    require("../assets/images/occasions/work_women.png"),
    require("../assets/images/looks/urban_minimalist_women.png"),
    require("../assets/images/looks/parisian_chic_women.png"),
  ],
  "Business_men": [
    require("../assets/images/looks/power_dressing_men.png"),
    require("../assets/images/occasions/work_men.png"),
    require("../assets/images/looks/urban_minimalist_men.png"),
    require("../assets/images/looks/parisian_chic_men.png"),
  ],

  // ══ Y2K REVIVAL ════════════════════════════════════════════════════════════
  "Y2K Revival_women": [
    require("../assets/images/looks/y2k_soiree_women.png"),
    require("../assets/images/trends/y2k_revival_women.png"),
    require("../assets/images/looks/gala_glamour_women.png"),
  ],
  "Y2K Revival_men": [
    require("../assets/images/looks/y2k_soiree_men.png"),
    require("../assets/images/trends/y2k_revival_men.png"),
    require("../assets/images/looks/gala_glamour_men.png"),
  ],

  // ══ FORMAL ══════════════════════════════════════════════════════════════════
  "Formal_women": [
    require("../assets/images/looks/gala_glamour_women.png"),
    require("../assets/images/occasions/formal_women.png"),
    require("../assets/images/looks/galerie_opening_women.png"),
  ],
  "Formal_men": [
    require("../assets/images/looks/gala_glamour_men.png"),
    require("../assets/images/occasions/formal_men.png"),
    require("../assets/images/looks/galerie_opening_men.png"),
  ],

  // ══ AVANT-GARDE ═════════════════════════════════════════════════════════════
  // Bold, theatrical, architectural — Gala drama, gallery-opening edge,
  // architectural lines, and high-shine Y2K statement looks.
  "Avant-garde_women": [
    require("../assets/images/looks/gala_glamour_women.png"),
    require("../assets/images/looks/galerie_opening_women.png"),
    require("../assets/images/looks/urban_architect_women.png"),
    require("../assets/images/looks/y2k_soiree_women.png"),
    require("../assets/images/trends/y2k_revival_women.png"),
  ],
  "Avant-garde_men": [
    require("../assets/images/looks/gala_glamour_men.png"),
    require("../assets/images/looks/galerie_opening_men.png"),
    require("../assets/images/looks/urban_architect_men.png"),
    require("../assets/images/looks/y2k_soiree_men.png"),
    require("../assets/images/trends/y2k_revival_men.png"),
  ],

  // ══ GENDER-NEUTRAL DEFAULTS (fallback) ═════════════════════════════════════
  "default_women": [
    require("../assets/images/looks/parisian_chic_women.png"),
    require("../assets/images/looks/urban_minimalist_women.png"),
    require("../assets/images/looks/galerie_opening_women.png"),
    require("../assets/images/looks/cote_dazur_evening_women.png"),
    require("../assets/images/looks/old_money_weekend_women.png"),
    require("../assets/images/looks/luxury_streetwear_icon_women.png"),
  ],
  "default_men": [
    require("../assets/images/looks/parisian_chic_men.png"),
    require("../assets/images/looks/urban_minimalist_men.png"),
    require("../assets/images/looks/galerie_opening_men.png"),
    require("../assets/images/looks/cote_dazur_evening_men.png"),
    require("../assets/images/looks/old_money_weekend_men.png"),
    require("../assets/images/looks/luxury_streetwear_icon_men.png"),
  ],
  // NOTE: Intentionally no gender-neutral "default" pool. Mixing men+women
  // images in a single fallback bucket let women's photos leak into male
  // profiles when the per-gender pools were exhausted during dedupe.
};

// Styles whose visual identity is so specific that we never let a generic
// occasion-based named override (e.g. "Downtown Edit", "Main Character")
// hijack the hero. For these styles, the curated style pool always wins so
// every card stays on-brand regardless of which occasion the look was
// generated for. Old Money must look dapper/elegant. Techwear must look
// utilitarian/dark. Y2K must look sparkly/retro. Etc. Every primary style
// pool was visually audited; each entry depicts the style it's named after.
const STYLE_LOCKED_TO_POOL = new Set<string>([
  "Old Money",
  "Luxury Streetwear",
  "Vacation Luxe",
  "Techwear",
  "Clean Minimal",
  "Y2K Revival",
  "Business",
  "Evening",
  "Formal",
  "Avant-garde",
]);

export function hasNamedLookImage(name: string): boolean {
  return Boolean(NAMED_LOOK_IMAGES[name]);
}

// Same intent as hasNamedLookImage but respects style locks. The look-detail
// hero check uses this so a locked style never displays a mismatched editorial.
export function hasNamedLookImageForStyle(name: string, style: string): boolean {
  if (STYLE_LOCKED_TO_POOL.has(style)) return false;
  return Boolean(NAMED_LOOK_IMAGES[name]);
}

// Stable key for any image source so we can detect dupes across {uri} and require()s.
function imageKey(src: { uri: string } | number | unknown): string {
  if (typeof src === "number") return `n:${src}`;
  if (src && typeof src === "object" && "uri" in (src as object)) {
    return `u:${(src as { uri: string }).uri}`;
  }
  return `x:${String(src)}`;
}

// Walk a list of looks and guarantee no two share the same hero image.
// On a collision, advance through the matching pool until a fresh image is found;
// if the whole pool is exhausted, fall back to default pools, then the original.
export function assignUniqueLookImages<T extends { id: string; name: string; style: string; image: { uri: string } | number }>(
  looks: T[],
  gender: string,
): T[] {
  const g = gender.toLowerCase() === "men" ? "men" : "women";
  const used = new Set<string>();
  return looks.map((look) => {
    const candidatePools: Array<Array<{ uri: string } | number>> = [];
    const locked = STYLE_LOCKED_TO_POOL.has(look.style);
    const stylePool = LOOK_IMAGE_POOLS[`${look.style}_${g}`];
    // For locked styles (e.g. Old Money), the curated style pool is the
    // ONLY allowed source. Named editorial overrides are skipped entirely.
    if (locked) {
      if (stylePool) candidatePools.push(stylePool);
    } else {
      const named = NAMED_LOOK_IMAGES[look.name];
      if (named) candidatePools.push([named[g]]);
      if (stylePool) candidatePools.push(stylePool);
    }
    candidatePools.push(LOOK_IMAGE_POOLS[`default_${g}`]!);

    let chosen: { uri: string } | number = look.image;
    const originalKey = imageKey(look.image);
    // Preserve intentional per-look hero (named/style) when it's still unique.
    if (!used.has(originalKey)) {
      used.add(originalKey);
      return { ...look, image: chosen };
    }
    // Collision — rotate through pools to find an unused candidate.
    let found = false;
    const seedBase = hashStr(`${look.id}|${look.name}|${look.style}`);
    outer: for (const pool of candidatePools) {
      for (let offset = 0; offset < pool.length; offset++) {
        const candidate = pool[(seedBase + offset) % pool.length]!;
        const k = imageKey(candidate);
        if (!used.has(k)) {
          chosen = candidate;
          used.add(k);
          found = true;
          break outer;
        }
      }
    }
    // Last-resort: scan every SAME-GENDER pool for an unused image. We
    // never cross genders here — a male profile must never receive a
    // women's editorial, even when all preferred pools are exhausted.
    if (!found) {
      const genderSuffix = `_${g}`;
      for (const [key, pool] of Object.entries(LOOK_IMAGE_POOLS)) {
        if (!key.endsWith(genderSuffix)) continue;
        for (const candidate of pool) {
          const k = imageKey(candidate);
          if (!used.has(k)) {
            chosen = candidate;
            used.add(k);
            found = true;
            break;
          }
        }
        if (found) break;
      }
    }
    if (!found) used.add(originalKey);
    return { ...look, image: chosen };
  });
}

// Specific named looks get a hand-picked, on-description editorial that overrides
// the generic style pool. Both gender variants supplied so profile switching works.
const NAMED_LOOK_IMAGES: Record<string, { men: number; women: number }> = {
  // ── STREETWEAR ────────────────────────────────────────────────────────────
  "Downtown Edit":     { men: require("../assets/images/streetwear_hero_men.png"),       women: require("../assets/images/looks/luxury_streetwear_icon_women.png") },
  "Concrete Luxe":     { men: require("../assets/images/looks/urban_architect_men.png"),       women: require("../assets/images/looks/urban_architect_women.png") },
  "The Culture":       { men: require("../assets/images/looks/urban_minimalist_men.png"),         women: require("../assets/images/looks/urban_minimalist_women.png") },
  "Block-to-Runway":   { men: require("../assets/images/looks/luxury_streetwear_icon_men.png"),    women: require("../assets/images/looks/luxury_streetwear_icon_women.png") },
  "The Drop":          { men: require("../assets/images/trends/luxury_streetwear_men.png"),        women: require("../assets/images/trends/luxury_streetwear_women.png") },
  "Street Archives":   { men: require("../assets/images/streetwear_hero_men.png"),                 women: require("../assets/images/looks/luxury_streetwear_icon_women.png") },
  "Urban Blueprint":   { men: require("../assets/images/looks/urban_architect_men.png"),           women: require("../assets/images/looks/urban_architect_women.png") },
  "The Flex":          { men: require("../assets/images/looks/luxury_streetwear_icon_men.png"),    women: require("../assets/images/looks/luxury_streetwear_icon_women.png") },
  "City Uniform":      { men: require("../assets/images/looks/urban_architect_men.png"),           women: require("../assets/images/looks/urban_architect_women.png") },
  "Street Level":      { men: require("../assets/images/look_streetwear.png"),                     women: require("../assets/images/looks/luxury_streetwear_icon_women.png") },

  // ── DATE NIGHT ────────────────────────────────────────────────────────────
  "Dinner at Eight":      { men: require("../assets/images/looks/cote_dazur_evening_men.png"),  women: require("../assets/images/looks/cote_dazur_evening_women.png") },
  "La Dolce Vita":        { men: require("../assets/images/looks/cote_dazur_evening_men.png"),  women: require("../assets/images/looks/cote_dazur_evening_women.png") },
  "The Seduction":        { men: require("../assets/images/looks/gala_glamour_men.png"),        women: require("../assets/images/looks/gala_glamour_women.png") },
  "Velvet Night":         { men: require("../assets/images/looks/y2k_soiree_men.png"),          women: require("../assets/images/looks/y2k_soiree_women.png") },
  "Champagne Evening":    { men: require("../assets/images/looks/gala_glamour_men.png"),        women: require("../assets/images/looks/gala_glamour_women.png") },
  "Midnight Allure":      { men: require("../assets/images/looks/y2k_soiree_men.png"),          women: require("../assets/images/looks/y2k_soiree_women.png") },
  "Candlelit Confidence": { men: require("../assets/images/looks/galerie_opening_men.png"),     women: require("../assets/images/looks/galerie_opening_women.png") },
  "After Dark":           { men: require("../assets/images/looks/y2k_soiree_men.png"),          women: require("../assets/images/looks/y2k_soiree_women.png") },
  "The Rendezvous":       { men: require("../assets/images/looks/cote_dazur_evening_men.png"),  women: require("../assets/images/looks/cote_dazur_evening_women.png") },
  "First Impression":     { men: require("../assets/images/looks/parisian_chic_men.png"),       women: require("../assets/images/looks/parisian_chic_women.png") },

  // ── WORK ──────────────────────────────────────────────────────────────────
  "Corner Office":       { men: require("../assets/images/looks/power_dressing_men.png"),   women: require("../assets/images/looks/power_dressing_women.png") },
  "The Power Play":      { men: require("../assets/images/looks/power_dressing_men.png"),   women: require("../assets/images/looks/power_dressing_women.png") },
  "Boardroom Presence":  { men: require("../assets/images/looks/power_dressing_men.png"),   women: require("../assets/images/looks/power_dressing_women.png") },
  "Executive Edit":      { men: require("../assets/images/looks/power_dressing_men.png"),   women: require("../assets/images/looks/power_dressing_women.png") },
  "Quiet Authority":     { men: require("../assets/images/looks/urban_minimalist_men.png"), women: require("../assets/images/looks/urban_minimalist_women.png") },
  "The Professional":    { men: require("../assets/images/occasions/work_men.png"),         women: require("../assets/images/occasions/work_women.png") },
  "Boardroom Chic":      { men: require("../assets/images/looks/power_dressing_men.png"),   women: require("../assets/images/looks/power_dressing_women.png") },
  "Dressed for Impact":  { men: require("../assets/images/looks/power_dressing_men.png"),   women: require("../assets/images/looks/power_dressing_women.png") },
  "The 9-to-5 Luxe":     { men: require("../assets/images/looks/urban_minimalist_men.png"), women: require("../assets/images/looks/urban_minimalist_women.png") },
  "Sharp & Minimal":     { men: require("../assets/images/looks/urban_minimalist_men.png"), women: require("../assets/images/looks/urban_minimalist_women.png") },

  // ── VACATION ──────────────────────────────────────────────────────────────
  "Côte d’Azur":         { men: require("../assets/images/looks/cote_dazur_evening_men.png"), women: require("../assets/images/looks/cote_dazur_evening_women.png") },
  "Island Money":        { men: require("../assets/images/looks/resort_billionaire_men.png"), women: require("../assets/images/looks/resort_billionaire_women.png") },
  "Resort Royalty":      { men: require("../assets/images/looks/resort_billionaire_men.png"), women: require("../assets/images/looks/resort_billionaire_women.png") },
  "Golden Sands":        { men: require("../assets/images/trends/vacation_luxe_men.png"),     women: require("../assets/images/trends/vacation_luxe_women.png") },
  "Mediterranean Edit":  { men: require("../assets/images/looks/cote_dazur_evening_men.png"), women: require("../assets/images/looks/cote_dazur_evening_women.png") },
  "Yacht Club":          { men: require("../assets/images/looks/resort_billionaire_men.png"), women: require("../assets/images/looks/resort_billionaire_women.png") },
  "The Riviera Look":    { men: require("../assets/images/looks/cote_dazur_evening_men.png"), women: require("../assets/images/looks/cote_dazur_evening_women.png") },
  "Sun-Drenched Luxe":   { men: require("../assets/images/occasions/vacation_men.png"),       women: require("../assets/images/occasions/vacation_women.png") },
  "Bougainvillea Hours": { men: require("../assets/images/looks/cote_dazur_evening_men.png"), women: require("../assets/images/looks/cote_dazur_evening_women.png") },
  "Amalfi Afternoon":    { men: require("../assets/images/look_vacation.png"),                women: require("../assets/images/trends/vacation_luxe_women.png") },

  // ── EVENT ─────────────────────────────────────────────────────────────────
  "Red Carpet Ready": { men: require("../assets/images/looks/gala_glamour_men.png"),    women: require("../assets/images/looks/gala_glamour_women.png") },
  "The Statement":    { men: require("../assets/images/looks/gala_glamour_men.png"),    women: require("../assets/images/looks/gala_glamour_women.png") },
  "Opening Night":    { men: require("../assets/images/looks/galerie_opening_men.png"), women: require("../assets/images/looks/galerie_opening_women.png") },
  "Gala Presence":    { men: require("../assets/images/looks/gala_glamour_men.png"),    women: require("../assets/images/looks/gala_glamour_women.png") },
  "Front Row":        { men: require("../assets/images/looks/galerie_opening_men.png"), women: require("../assets/images/looks/galerie_opening_women.png") },
  "Grand Entrance":   { men: require("../assets/images/looks/gala_glamour_men.png"),    women: require("../assets/images/looks/gala_glamour_women.png") },
  "The Moment":       { men: require("../assets/images/occasions/event_men.png"),       women: require("../assets/images/occasions/event_women.png") },
  "All Eyes Here":    { men: require("../assets/images/looks/gala_glamour_men.png"),    women: require("../assets/images/looks/gala_glamour_women.png") },
  "Ceremony Edit":    { men: require("../assets/images/looks/galerie_opening_men.png"), women: require("../assets/images/looks/galerie_opening_women.png") },
  "Award Season":     { men: require("../assets/images/looks/gala_glamour_men.png"),    women: require("../assets/images/looks/gala_glamour_women.png") },

  // ── EVENING ───────────────────────────────────────────────────────────────
  "Midnight Garden":   { men: require("../assets/images/looks/gala_glamour_men.png"),        women: require("../assets/images/looks/gala_glamour_women.png") },
  "Noir Elegance":     { men: require("../assets/images/looks/gala_glamour_men.png"),        women: require("../assets/images/looks/gala_glamour_women.png") },
  "The Gown":          { men: require("../assets/images/looks/gala_glamour_men.png"),        women: require("../assets/images/looks/gala_glamour_women.png") },
  "Evening Ritual":    { men: require("../assets/images/looks/cote_dazur_evening_men.png"),  women: require("../assets/images/looks/cote_dazur_evening_women.png") },
  "Black Tie Reborn":  { men: require("../assets/images/occasions/formal_men.png"),          women: require("../assets/images/occasions/formal_women.png") },
  "The Velvet Hour":   { men: require("../assets/images/looks/y2k_soiree_men.png"),          women: require("../assets/images/looks/y2k_soiree_women.png") },
  "Soirée Supreme":    { men: require("../assets/images/looks/gala_glamour_men.png"),        women: require("../assets/images/looks/gala_glamour_women.png") },
  "Starlit Glamour":   { men: require("../assets/images/looks/gala_glamour_men.png"),        women: require("../assets/images/looks/gala_glamour_women.png") },
  "Opulent Evening":   { men: require("../assets/images/looks/galerie_opening_men.png"),     women: require("../assets/images/looks/galerie_opening_women.png") },
  "The Grand Look":    { men: require("../assets/images/looks/gala_glamour_men.png"),        women: require("../assets/images/looks/gala_glamour_women.png") },

  // ── PARTY ─────────────────────────────────────────────────────────────────
  "Main Character":  { men: require("../assets/images/looks/y2k_soiree_men.png"),       women: require("../assets/images/looks/y2k_soiree_women.png") },
  "The Afterparty":  { men: require("../assets/images/trends/y2k_revival_men.png"),     women: require("../assets/images/trends/y2k_revival_women.png") },
  "Disco Heaven":    { men: require("../assets/images/looks/y2k_soiree_men.png"),       women: require("../assets/images/looks/y2k_soiree_women.png") },
  "Glitter & Gold":  { men: require("../assets/images/looks/gala_glamour_men.png"),     women: require("../assets/images/looks/gala_glamour_women.png") },
  "Night Frequency": { men: require("../assets/images/looks/y2k_soiree_men.png"),       women: require("../assets/images/looks/y2k_soiree_women.png") },
  "Party Season":    { men: require("../assets/images/trends/y2k_revival_men.png"),     women: require("../assets/images/trends/y2k_revival_women.png") },
  "Euphoric Edit":   { men: require("../assets/images/looks/y2k_soiree_men.png"),       women: require("../assets/images/looks/y2k_soiree_women.png") },
  "Club Luxe":       { men: require("../assets/images/looks/y2k_soiree_men.png"),       women: require("../assets/images/looks/y2k_soiree_women.png") },
  "Electric Night":  { men: require("../assets/images/trends/y2k_revival_men.png"),     women: require("../assets/images/trends/y2k_revival_women.png") },
  "The Entrance":    { men: require("../assets/images/looks/gala_glamour_men.png"),     women: require("../assets/images/looks/gala_glamour_women.png") },

  // ── FORMAL ────────────────────────────────────────────────────────────────
  "The Black Tie":             { men: require("../assets/images/occasions/formal_men.png"),       women: require("../assets/images/occasions/formal_women.png") },
  "White Tie & Tails":         { men: require("../assets/images/occasions/formal_men.png"),       women: require("../assets/images/looks/gala_glamour_women.png") },
  "Grande Ceremony":           { men: require("../assets/images/looks/gala_glamour_men.png"),     women: require("../assets/images/looks/gala_glamour_women.png") },
  "The Tuxedo Edit":           { men: require("../assets/images/occasions/formal_men.png"),       women: require("../assets/images/looks/gala_glamour_women.png") },
  "Gala Royale":               { men: require("../assets/images/looks/gala_glamour_men.png"),     women: require("../assets/images/looks/gala_glamour_women.png") },
  "The Floor-Length Moment":   { men: require("../assets/images/looks/gala_glamour_men.png"),     women: require("../assets/images/looks/gala_glamour_women.png") },
  "Couture Formality":         { men: require("../assets/images/looks/galerie_opening_men.png"),  women: require("../assets/images/looks/galerie_opening_women.png") },
  "The Dress Code":            { men: require("../assets/images/occasions/formal_men.png"),       women: require("../assets/images/occasions/formal_women.png") },
  "Champagne & Silk":          { men: require("../assets/images/looks/gala_glamour_men.png"),     women: require("../assets/images/looks/gala_glamour_women.png") },
  "The Invitation":            { men: require("../assets/images/looks/galerie_opening_men.png"),  women: require("../assets/images/looks/galerie_opening_women.png") },

  // ── CASUAL ────────────────────────────────────────────────────────────────
  "Sunday Edit":         { men: require("../assets/images/looks/parisian_chic_men.png"),       women: require("../assets/images/looks/parisian_chic_women.png") },
  "Off-Duty Luxe":       { men: require("../assets/images/looks/old_money_weekend_men.png"),   women: require("../assets/images/looks/old_money_weekend_women.png") },
  "Weekend Uniform":     { men: require("../assets/images/looks/old_money_weekend_men.png"),   women: require("../assets/images/looks/old_money_weekend_women.png") },
  "Relaxed Authority":   { men: require("../assets/images/looks/urban_minimalist_men.png"),    women: require("../assets/images/looks/urban_minimalist_women.png") },
  "The Easy Day":        { men: require("../assets/images/occasions/casual_men.png"),          women: require("../assets/images/occasions/casual_women.png") },
  "Laid-Back Elegance":  { men: require("../assets/images/looks/old_money_weekend_men.png"),   women: require("../assets/images/looks/old_money_weekend_women.png") },
  "Casual Royalty":      { men: require("../assets/images/looks/dark_academia_men.png"),       women: require("../assets/images/looks/dark_academia_women.png") },
  "The Soft Hour":       { men: require("../assets/images/looks/parisian_chic_men.png"),       women: require("../assets/images/looks/parisian_chic_women.png") },
  "Golden Hour Casual":  { men: require("../assets/images/looks/cote_dazur_evening_men.png"),  women: require("../assets/images/looks/cote_dazur_evening_women.png") },
  "Quiet Morning":       { men: require("../assets/images/looks/parisian_chic_men.png"),       women: require("../assets/images/looks/parisian_chic_women.png") },
};

// Deterministic per look — same outfit fingerprint → same image every time.
// Gender param ensures men see male models, women see female models.
// When a look's name has a hand-picked override, use that instead of the pool.
function getLookImage(style: string, seed: string, gender: string, name?: string): { uri: string } | number {
  const g = gender.toLowerCase() === "men" ? "men" : "women";
  // Locked styles ignore named overrides and always pull from their curated pool.
  if (name && NAMED_LOOK_IMAGES[name] && !STYLE_LOCKED_TO_POOL.has(style)) {
    return NAMED_LOOK_IMAGES[name][g];
  }
  // Strictly same-gender. Never fall through to a mixed pool.
  const pool =
    LOOK_IMAGE_POOLS[`${style}_${g}`] ??
    LOOK_IMAGE_POOLS[`default_${g}`]!;
  return pool[hashStr(seed) % pool.length]!;
}

// ─── Per-category piece image pools — varies by item id so same category ─────
//     items all show different thumbnail photos in the detail screen

// Pools contain `string | undefined` entries because `uns()` may return
// undefined for denylisted IDs. `getPieceImage` filters undefineds before
// indexing, so consumers receive either a real URL or undefined (→ fallback).
const PIECE_IMAGE_POOLS: Record<string, Array<string | undefined>> = {
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
  // ── Subcategory-specific pools for better image matching ──────────────────
  formal_gown: [
    uns("1566174053879-31528523f8ae"), uns("1515886657613-9f3515b0c78f"),
    uns("1496747986212-04f8d1b97f16"), uns("1518611012118-696072aa579a"),
    uns("1503342217505-b0a15ec3261c"), uns("1441986300917-64674bd600d8"),
    uns("1549068106-b024baf0f72a"),    uns("1509631179647-0177331693ae"),
    uns("1543163521-1bf539c55dd2"),    uns("1539109136090-3bb05fd40e9d"),
    uns("1469334031218-e382a71b716b"), uns("1529139574466-a303027bc851"),
  ],
  formal_suit: [
    uns("1507003211169-0a1dd7228f2d"), uns("1552902865-b72c031ac5ea"),
    uns("1591047139829-d91aecb6caea"), uns("1543163521-1bf539c55dd2"),
    uns("1517841905240-472988babdf9"), uns("1519085360753-af0119f7cbe7"),
    uns("1521572163474-6864f9cf17ab"), uns("1441986300917-64674bd600d8"),
    uns("1483985988355-763728e1cfc4"), uns("1509631179647-0177331693ae"),
    uns("1549068106-b024baf0f72a"),    uns("1469334031218-e382a71b716b"),
  ],
  formal_shirt: [
    uns("1521572163474-6864f9cf17ab"), uns("1507003211169-0a1dd7228f2d"),
    uns("1552902865-b72c031ac5ea"),    uns("1503342217505-b0a15ec3261c"),
    uns("1591047139829-d91aecb6caea"), uns("1441986300917-64674bd600d8"),
    uns("1549068106-b024baf0f72a"),    uns("1469334031218-e382a71b716b"),
  ],
  formal_trouser: [
    uns("1552902865-b72c031ac5ea"),    uns("1507003211169-0a1dd7228f2d"),
    uns("1591047139829-d91aecb6caea"), uns("1542272054537-4845f1353d17"),
    uns("1624378441164-f3b5a4ec2a53"), uns("1441986300917-64674bd600d8"),
    uns("1469334031218-e382a71b716b"), uns("1509631179647-0177331693ae"),
  ],
  formal_shoes_women: [
    uns("1543163521-1bf539c55dd2"),    uns("1614252235316-8c857d38b5f4"),
    uns("1515347619252-60a4bf4fff4f"), uns("1608256246005-4e6b4e65f82c"),
    uns("1542291026-7eec264c27ff"),    uns("1491553895911-0055eca6402d"),
    uns("1469334031218-e382a71b716b"), uns("1529139574466-a303027bc851"),
  ],
  formal_shoes_men: [
    uns("1608256246005-4e6b4e65f82c"), uns("1543163521-1bf539c55dd2"),
    uns("1515347619252-60a4bf4fff4f"), uns("1542291026-7eec264c27ff"),
    uns("1491553895911-0055eca6402d"), uns("1614252235316-8c857d38b5f4"),
    uns("1469334031218-e382a71b716b"), uns("1483985988355-763728e1cfc4"),
  ],
  scrub_top: [
    uns("1584820688313-b22ef25a6b29"), uns("1559839731-9bf2e0a4a218"),
    uns("1631815986858-a27780785fc3"), uns("1579684385127-1d5ef9f76e44"),
    uns("1584820688313-b22ef25a6b29"), uns("1614728894971-0e7c57df5c6c"),
    uns("1559839731-9bf2e0a4a218"),    uns("1631815986858-a27780785fc3"),
  ],
  scrub_bottom: [
    uns("1559839731-9bf2e0a4a218"),    uns("1584820688313-b22ef25a6b29"),
    uns("1614728894971-0e7c57df5c6c"), uns("1579684385127-1d5ef9f76e44"),
    uns("1631815986858-a27780785fc3"), uns("1584820688313-b22ef25a6b29"),
    uns("1614728894971-0e7c57df5c6c"), uns("1559839731-9bf2e0a4a218"),
  ],
  exec_suit_women: [
    uns("1503342217505-b0a15ec3261c"), uns("1441986300917-64674bd600d8"),
    uns("1469334031218-e382a71b716b"), uns("1529139574466-a303027bc851"),
    uns("1516762121899-c04ad64fc6e0"), uns("1509631179647-0177331693ae"),
    uns("1483985988355-763728e1cfc4"), uns("1541643600914-78b084683702"),
  ],
};

function getPieceImage(category: string, itemId: string): string | undefined {
  // Route by item ID prefix for contextually matched imagery
  const id = itemId.toLowerCase();
  let poolKey = category;
  if      (id.startsWith("exmt"))   poolKey = "formal_trouser";
  else if (id.startsWith("exm"))    poolKey = "formal_suit";
  else if (id.startsWith("exwt"))   poolKey = "formal_trouser";
  else if (id.startsWith("exw"))    poolKey = "exec_suit_women";
  else if (id.startsWith("fsh"))    poolKey = "formal_shirt";
  else if (id.startsWith("fsw"))    poolKey = "formal_shoes_women";
  else if (id.startsWith("fsm"))    poolKey = "formal_shoes_men";
  else if (id.startsWith("ftr"))    poolKey = "formal_trouser";
  else if (id.startsWith("fs"))     poolKey = "formal_suit";
  else if (id.startsWith("fg"))     poolKey = "formal_gown";
  else if (id.startsWith("figs_t")) poolKey = "scrub_top";
  else if (id.startsWith("figs_b")) poolKey = "scrub_bottom";

  const rawPool = PIECE_IMAGE_POOLS[poolKey] ?? PIECE_IMAGE_POOLS[category] ?? [];
  // Strip denylisted/undefined entries so we never index into a bad slot.
  const pool = rawPool.filter((u): u is string => typeof u === "string");
  if (pool.length === 0) return undefined;
  return pool[hashStr(itemId) % pool.length];
}

// ─── Shoe-type inference + occasion preference ──────────────────────────────
// When an existing catalog item doesn't have an explicit `shoeType`, infer one
// from its name so older items still participate in shoeType-aware matching.
function inferShoeType(item: CatalogItem): CatalogItem["shoeType"] | undefined {
  if (item.shoeType) return item.shoeType;
  if (item.category !== "shoes") return undefined;
  const n = item.name.toLowerCase();
  if (/(sneaker|trainer|samba|air force|af1|990|jordan|low-top|high-top|runner|running)/.test(n)) return "sneakers";
  if (/(oxford|loafer|pump|heel|brogue|derby|monk|slingback|stiletto|mary jane|d'orsay|kitten)/.test(n)) return "dress";
  if (/(work boot|hiking|moc-toe|moc toe|chukka|timberland|combat)/.test(n)) return "work";
  if (/(boot|sandal|mule|clog|espadrille|flat|ballet)/.test(n)) return "casual";
  return undefined;
}

// Map a normalized occasion to the shoe sub-types we prefer for it.
function preferredShoeTypes(occasion: string): Array<NonNullable<CatalogItem["shoeType"]>> {
  switch (occasion) {
    case "Work":               return ["dress", "casual"];
    case "Event":
    case "Evening":
    case "Party":              return ["dress"];
    // Formal Remix is the entire point of the occasion: tuxedos, suits, and
    // gowns intentionally paired with statement sneakers. Force sneakers
    // ONLY — anything else (oxfords, pumps) defeats the category's identity.
    case "Formal Remix":       return ["sneakers"];
    case "Date Night":         return ["dress", "casual", "sneakers"];
    case "Streetwear":         return ["sneakers", "casual"];
    case "Vacation":           return ["casual", "sneakers"];
    case "Casual":             return ["sneakers", "casual"];
    default:                   return ["sneakers", "casual", "dress"];
  }
}

// ─── Outfit-level formality coherence ──────────────────────────────────────
// Infer how dressed-up a piece is from its name + category. Used to keep an
// outfit visually uniform — jeans + tee should never land a dress oxford,
// and a tuxedo jacket should never land a graphic sneaker. Three tiers:
//   "casual"  — denim, tees, hoodies, joggers, sweats, shorts, sundresses
//   "dress"   — tuxedos, gowns, black-tie / evening / sequin pieces
//   "smart"   — blazers, tailored trousers, silk blouses, knits, chinos,
//               wool coats — the middle ground that goes either way
type Formality = "casual" | "smart" | "dress";
function inferPieceFormality(p: { name: string; category: string; shoeType?: CatalogItem["shoeType"] }): Formality {
  const n = p.name.toLowerCase();
  if (p.category === "shoes") {
    const t = p.shoeType
      ?? inferShoeType({ name: p.name, category: "shoes" } as CatalogItem);
    if (t === "sneakers" || t === "casual") return "casual";
    if (t === "dress") return "dress";
    return "smart";
  }
  if (/\b(tuxedo|gown|black.?tie|evening|sequin|ball.?gown|opera)\b/.test(n)) return "dress";
  if (/\b(tee|t-?shirt|graphic|hoodie|sweatshirt|tank|jogger|sweatpant|sweat pant|cargo|denim|jean|jeans|short|shorts|legging|tracksuit|track pant|crewneck sweatshirt)\b/.test(n)) return "casual";
  return "smart";
}

// Given the pieces already chosen for an outfit, return the shoe sub-types
// that will look coherent with them. Casual pieces ban dress shoes; dress
// pieces ban sneakers/casual shoes; an all-smart outfit avoids sneakers.
// Always intersected with the occasion preference so a Work look still
// can't end up in flip-flops just because the top is a polo.
function coherentShoeTypes(
  picked: Array<{ name: string; category: string; shoeType?: CatalogItem["shoeType"] }>,
  occasionPrefs: Array<NonNullable<CatalogItem["shoeType"]>>,
  occasion?: string,
): Array<NonNullable<CatalogItem["shoeType"]>> {
  // Formal Remix bypass: this occasion EXISTS to deliberately violate the
  // tux→oxford / gown→pump formality coherence rule. If we let the normal
  // logic run, a tuxedo top would force shoeType="dress" and the user would
  // never see the sneakers that define the remix. Honor the occasion prefs
  // verbatim (which preferredShoeTypes locks to ["sneakers"]).
  if (occasion === "Formal Remix") return occasionPrefs;
  const formalities = picked
    .filter((p) => p.category !== "shoes" && p.category !== "bag" && p.category !== "jewelry" && p.category !== "accessories")
    .map((p) => inferPieceFormality(p));
  if (formalities.length === 0) return occasionPrefs;
  const hasCasual = formalities.includes("casual");
  const hasDress = formalities.includes("dress");
  let allowed: Array<NonNullable<CatalogItem["shoeType"]>>;
  if (hasDress && !hasCasual) allowed = ["dress", "work"];
  else if (hasCasual && !hasDress) allowed = ["sneakers", "casual"];
  else if (hasCasual && hasDress) allowed = ["casual", "dress"]; // rare mixed
  else allowed = ["casual", "dress", "work"]; // smart only — skip sneakers
  const intersected = occasionPrefs.filter((t) => allowed.includes(t));
  // Fall back to outfit-derived allowed list if occasion prefs left nothing
  // (e.g. occasion=Event prefers only "dress" but outfit is jeans+tee — we'd
  // rather honor the outfit's casualness than force a clashing oxford).
  return intersected.length > 0 ? intersected : allowed;
}

// ─── Aesthetic-family grouping ───────────────────────────────────────────────
// Styles inside the same family share visual DNA (silhouette, fabric
// language, brand cohort) and can be mixed in one look without clashing.
// Mixing ACROSS families is what produced the user complaint —
// e.g. Y2K Revival shoes + Old Money tailoring + Techwear outerwear.
// Used as a tighter fallback than the catch-all "anything in pool" tier
// inside stylePick: if no piece matches the dominant style or palette,
// we'd rather pick a family-cousin than a true cross-family clash.
const STYLE_FAMILIES: Record<string, string> = {
  "Old Money":         "heritage",
  "Business":          "heritage",
  "Clean Minimal":     "heritage",
  "Evening":           "evening",
  "Avant-garde":       "evening",
  "Luxury Streetwear": "street",
  "Streetwear":        "street",
  "Y2K Revival":       "street",
  "Techwear":          "street",
  "Vacation Luxe":     "resort",
  // Casual is the broad default — group with heritage so a Casual-dominant
  // look still gets a sensible family fallback rather than no-op'ing.
  "Casual":            "heritage",
};
function familyOf(style: string): string | undefined {
  return STYLE_FAMILIES[style];
}
function inSameFamily(style: string, dominant: string): boolean {
  const f = familyOf(dominant);
  return f !== undefined && familyOf(style) === f;
}
function itemSharesFamily(item: CatalogItem, dominant: string): boolean {
  return item.styles.some((s) => s === dominant || inSameFamily(s, dominant));
}

// ─── Look-level formality anchor ────────────────────────────────────────────
// Decide BEFORE we pick pieces whether the whole look should read casual,
// smart, or dress. Every clothing pool is then filtered to that target
// (plus the adjacent neutral bucket) so a tuxedo trouser never lands with
// a graphic tee, and a wool blazer never lands on top of a hoodie. Shoe
// coherence is still enforced separately by `coherentShoeTypes` once the
// clothing is locked in.
//
// Formal Remix returns null on purpose: its identity IS mixing dressy
// pieces with statement sneakers, so the anchor must not constrain it.
function targetLookFormality(occasion: string, dominantStyle: string): Formality | null {
  if (occasion === "Formal Remix") return null;
  // Style first — by this point in the loop the engine has committed to a
  // visual vibe, so style outranks occasion as a formality signal.
  if (/Evening|Old Money/.test(dominantStyle)) return "dress";
  if (/Streetwear|Y2K|Vacation Luxe/.test(dominantStyle)) return "casual";
  if (/Business|Clean Minimal|Techwear/.test(dominantStyle)) return "smart";
  // Occasion fallback.
  if (/Formal|Event|Evening|Party|Date Night/.test(occasion)) return "dress";
  if (/Work|Business/.test(occasion)) return "smart";
  if (/Streetwear|Casual|Vacation|Resort|Street/.test(occasion)) return "casual";
  return "smart";
}

// Allowed formality buckets for a given anchor. "smart" is the neutral
// middle and pairs cleanly with either end; "casual" and "dress" are
// each other's hard opposites and never co-mingle (that's the whole bug
// we're closing — t-shirt + tuxedo trousers in the same look).
function compatibleFormalities(target: Formality): Formality[] {
  if (target === "casual") return ["casual", "smart"];
  if (target === "dress") return ["dress", "smart"];
  return ["smart", "dress"]; // smart leans up for the luxury vibe
}

// ─── Purchase URL builder — converts brand homepage to product search page ────
// So tapping "BUY" on any piece lands the user at a search results page
// for that exact product on the brand's own website.
function buildPurchaseUrl(item: CatalogItem): string {
  const base = item.purchaseUrl.replace(/\/$/, "");
  // Items that already have specific collection/search URLs (e.g. FIGS)
  if (base.includes("/collections/") || base.includes("/search?") || base.includes("/search/?")) {
    return base;
  }
  const q = encodeURIComponent(item.name);
  // Brand-specific search URL patterns
  if (base.includes("gucci.com"))           return `https://www.gucci.com/us/en/search?q=${q}`;
  if (base.includes("loropiana.com"))        return `https://www.loropiana.com/en/search?searchTerm=${q}`;
  if (base.includes("balenciaga.com"))       return `https://www.balenciaga.com/en-us/search?q=${q}`;
  if (base.includes("balmain.com"))          return `https://www.balmain.com/us/search?q=${q}`;
  if (base.includes("valentino.com"))        return `https://www.valentino.com/en-us/search?q=${q}`;
  if (base.includes("versace.com"))          return `https://www.versace.com/us/en/search?q=${q}`;
  if (base.includes("tomford.com"))          return `https://www.tomford.com/search?q=${q}`;
  if (base.includes("bottegaveneta.com"))    return `https://www.bottegaveneta.com/en-us/search?q=${q}`;
  if (base.includes("zegna.com"))            return `https://www.zegna.com/us-en/search/?q=${q}`;
  if (base.includes("jimmychoo.com"))        return `https://us.jimmychoo.com/en_us/search?q=${q}`;
  if (base.includes("manoloblahnik.com"))    return `https://www.manoloblahnik.com/us/search/?q=${q}`;
  if (base.includes("brioni.com"))           return `https://www.brioni.com/en_us/search/?q=${q}`;
  if (base.includes("canali.com"))           return `https://www.canali.com/en_ww/search/?q=${q}`;
  if (base.includes("brunellocucinelli.com")) return `https://www.brunellocucinelli.com/en/search?q=${q}`;
  if (base.includes("therow.com"))           return `https://www.therow.com/en-us/search?q=${q}`;
  if (base.includes("net-a-porter.com"))     return `https://www.net-a-porter.com/en-us/shop/search?q=${q}`;
  if (base.includes("farfetch.com"))         return `https://www.farfetch.com/shopping/search/?q=${q}`;
  if (base.includes("ssense.com"))           return `https://www.ssense.com/en-us/search/?q=${q}`;
  if (base.includes("mytheresa.com"))        return `https://www.mytheresa.com/en-us/search?searchterm=${q}`;
  if (base.includes("matches"))             return `https://www.matchesfashion.com/us/search?q=${q}`;
  if (base.includes("wearfigs.com"))         return `https://www.wearfigs.com/search?q=${q}`;
  if (base.includes("ralphlauren.com"))      return `https://www.ralphlauren.com/search?q=${q}`;
  if (base.includes("zara.com"))             return `https://www.zara.com/us/en/search?searchTerm=${q}`;
  if (base.includes("cos"))                  return `https://www.cosstores.com/en_usd/search/?q=${q}`;
  if (base.includes("acnestudios.com"))      return `https://www.acnestudios.com/us/en/search?q=${q}`;
  // Default: most modern e-commerce sites support /search?q=
  return `${base}/search?q=${q}`;
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
  "Formal Remix": ["Black Tie, Loud Sole", "Tuxedo Reimagined", "Gala Sneakers", "The Remix", "Formal Subverted", "Couture Kicks", "Red Carpet Rebel", "The Hybrid Edit", "Sneakers After Dark", "Gown Meets Sole"],
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
  "Formal Remix": [
    "Black-tie tailoring, statement sneakers — the rules, rewritten.",
    "Tuxedo on top, streetwear on the sole. A new kind of formal.",
    "Where the gala meets the drop. Couture pieces, accent kicks.",
    "Floor-length elegance grounded by a sneaker with something to say.",
    "Old-world tailoring, new-world footwear. Formal — but on your terms.",
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
  { name: "Executive Suite",  colors: ["Dark Navy", "Midnight Blue", "Dark Blue", "Charcoal", "Black", "Deep Charcoal", "Slate", "Dark Slate"] },
];

// Bias the random palette pick toward palettes that fit each style's identity.
// An Old Money look in "Power Red" or a Techwear look in "Blush & Rose" would
// fight the locked hero image; this keeps the whole card (image + colors)
// speaking the same language. Other styles fall back to the full COLOR_PALETTES.
const STYLE_PALETTE_BIAS: Record<string, string[]> = {
  "Old Money":         ["Ivory & Camel", "Earth Tones", "Warm Neutrals", "Navy & Cobalt", "Emerald Forest"],
  Techwear:            ["All Black", "Monochrome Grey", "Executive Suite"],
  "Clean Minimal":     ["Pure White", "Monochrome Grey", "Warm Neutrals", "All Black", "Ivory & Camel"],
  "Avant-garde":       ["All Black", "Deep Jewels", "Gold & Metallics", "Power Red", "Monochrome Grey"],
  "Luxury Streetwear": ["All Black", "Monochrome Grey", "Earth Tones", "Pure White"],
  "Vacation Luxe":     ["Ivory & Camel", "Pure White", "Blush & Rose", "Warm Neutrals"],
  "Y2K Revival":       ["Blush & Rose", "Power Red", "Gold & Metallics", "Deep Jewels"],
  Business:            ["Executive Suite", "Navy & Cobalt", "Monochrome Grey", "All Black"],
  Evening:             ["All Black", "Deep Jewels", "Gold & Metallics", "Power Red"],
  Formal:              ["All Black", "Pure White", "Deep Jewels"],
};

function pickPaletteForStyle(style: string): { name: string; colors: string[] } {
  const allowedNames = STYLE_PALETTE_BIAS[style];
  if (!allowedNames || allowedNames.length === 0) return pick(COLOR_PALETTES);
  const allowed = COLOR_PALETTES.filter((p) => allowedNames.includes(p.name));
  return allowed.length > 0 ? pick(allowed) : pick(COLOR_PALETTES);
}

// Season bias per style. Without this, a Vacation Luxe look could land
// "Winter" under a Riviera hero, or a Techwear utility-shell look could be
// tagged "Summer". The user sees this on the look detail page as
// "{occasion} · {season}". Styles not listed get the full season pool.
const ALL_SEASONS = ["Spring", "Summer", "Autumn", "Winter", "All Season"] as const;
const STYLE_SEASON_BIAS: Record<string, readonly string[]> = {
  "Vacation Luxe":     ["Spring", "Summer", "All Season"],
  "Y2K Revival":       ["Spring", "Summer", "All Season"],
  "Old Money":         ["Autumn", "Winter", "All Season", "Spring"],
  Techwear:            ["Autumn", "Winter", "All Season"],
  // Streetwear leans cooler — hoodies, layers, leather. Summer reads off-brand.
  "Luxury Streetwear": ["Autumn", "Winter", "Spring", "All Season"],
  // Architectural minimalism is season-agnostic but reads strongest in cooler tones.
  "Clean Minimal":     ["All Season", "Autumn", "Winter", "Spring"],
  // Dramatic volume + velvet/leather rarely scan as "Summer" on an editorial.
  "Avant-garde":       ["Autumn", "Winter", "All Season"],
  // Tailored wool/suiting — never tag as "Summer" beach look.
  Business:            ["Autumn", "Winter", "Spring", "All Season"],
  // Black-tie/velvet evening — overwhelmingly Autumn/Winter coded.
  Evening:             ["Autumn", "Winter", "All Season"],
  // Formal gowns/tuxedos — same cool-weather + all-season weighting.
  Formal:              ["Autumn", "Winter", "All Season", "Spring"],
};

function pickSeasonForStyle(style: string): string {
  const allowed = STYLE_SEASON_BIAS[style];
  return pick([...(allowed ?? ALL_SEASONS)]);
}

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

// For styles whose visual identity clashes with most occasion vocabularies,
// pull names from a style-specific pool instead of the occasion pool. Without
// this, an Old Money look generated for a Party would get a name like
// "Disco Heaven" — fighting the dapper hero the lock guarantees.
const STYLE_LOOK_NAMES: Record<string, string[]> = {
  "Old Money": [
    "The Heir", "Pedigree", "Inherited Calm", "Library Hours", "The Estate",
    "Lineage", "Quiet Wealth", "Riding Country", "Boarding School", "The Townhouse",
  ],
  Techwear: [
    "Tactical Drift", "Concrete Shadow", "Night Protocol", "System Override",
    "Off-Grid Luxe", "Engineered Calm", "Carbon Edit", "Modular City",
    "The Operator", "Future Functional",
  ],
  "Clean Minimal": [
    "Negative Space", "Architectural Calm", "The Quiet Edit", "Pure Form",
    "Monastery Hours", "Reduction", "Studied Restraint", "The Blank Page",
    "Geometric Hush", "The Essential",
  ],
  "Avant-garde": [
    "The Statement", "Theatrical", "Sculptural", "The Provocation",
    "Architectural Drama", "Beyond Form", "Avant Hour", "The Manifesto",
    "Wearable Art", "Couture Edge",
  ],
  "Luxury Streetwear": [
    "The Drop", "Block Royalty", "Concrete Couture", "Downtown Edit",
    "The Culture", "Street Archives", "Heritage Hype", "Off-Block Luxe",
    "City Frequency", "Premium Drip",
  ],
  "Y2K Revival": [
    "Millennium Glow", "Mall Couture", "Butterfly Hour", "Low-Rise Royalty",
    "Crystal Mesh", "Sparkle Decade", "The Throwback", "Disco Reboot",
    "Pop Princess", "Frosted Era",
  ],
  "Vacation Luxe": [
    "Côte d'Azur", "Amalfi Hour", "Riviera Royalty", "Yacht Club",
    "Bougainvillea", "Salt & Linen", "Capri Afternoon", "Mediterranean Edit",
    "Sun-Drenched", "Resort Money",
  ],
  Evening: [
    "Noir Elegance", "Midnight Garden", "The Velvet Hour", "Soirée Supreme",
    "Candlelit Allure", "Starlit Glamour", "After Dark Luxe", "The Black Pearl",
    "Opulent Evening", "Champagne Hour",
  ],
  Business: [
    "Corner Office", "Boardroom Presence", "Executive Edit", "The Power Play",
    "Quiet Authority", "C-Suite", "The Negotiator", "Tailored Command",
    "Dressed for Impact", "The Principal",
  ],
  Formal: [
    "The Black Tie", "White Tie & Tails", "Grande Ceremony", "Gala Royale",
    "The Tuxedo Edit", "Floor-Length Moment", "Couture Formality",
    "Champagne & Silk", "The Invitation", "Old-World Formality",
  ],
};

function generateLookName(occasion: string, style?: string): string {
  // Style-locked vocabularies override occasion to keep the card text aligned
  // with the locked image identity.
  const styleNames = style ? STYLE_LOOK_NAMES[style] : undefined;
  const names = styleNames ?? LOOK_NAMES[occasion] ?? LOOK_NAMES["Casual"];
  // Prefer names that haven't been shown yet — guarantees no duplicate names
  // within a session until the pool is exhausted, then resets gracefully.
  const fresh = names.filter((n) => !_shownNames.has(n));
  if (fresh.length === 0) {
    // Pool exhausted for this occasion — clear so future generations rotate.
    for (const n of names) _shownNames.delete(n);
  }
  const pool = fresh.length > 0 ? fresh : names;
  const chosen = pick(pool);
  _shownNames.add(chosen);
  return chosen;
}

// Same rationale as STYLE_LOOK_NAMES: for styles whose identity clashes with
// most occasion vocabularies, descriptions must also speak the style's
// language — not the occasion's — so card copy stays aligned with the locked hero.
const STYLE_LOOK_DESCRIPTIONS: Record<string, string[]> = {
  "Old Money": [
    "Inherited taste. Nothing announces itself. Everything is understood.",
    "Quiet luxury, generations deep — never new, never trying.",
    "The uniform of people who own the building, not rent the corner office.",
    "Tweed, cashmere, leather worn soft by time. The opposite of fashion.",
    "Heritage cut, library hush — dressed like the family album.",
  ],
  Techwear: [
    "Engineered fabrics, sealed seams, hardware that earns its place.",
    "Function as aesthetic — dressed for the city after dark.",
    "Tactical silhouettes, weather-sealed luxury, zero ornamentation.",
    "All black, all considered, every pocket purposeful.",
    "Future-leaning utility cut for movement, weather, and intent.",
  ],
  "Clean Minimal": [
    "Three pieces, perfect proportion, nothing extra. The discipline shows.",
    "Negative space is the statement. Restraint is the luxury.",
    "Architectural calm — every line decided, every detail removed.",
    "Reduced to essentials, finished with precision. Quiet by design.",
    "Monochrome, monumental, and entirely unbothered.",
  ],
  "Avant-garde": [
    "Sculptural, theatrical, and entirely uninterested in fitting in.",
    "Wearable architecture — the silhouette is the conversation.",
    "Form pushed past function. The room reorganizes around it.",
    "Conceptual cuts, dramatic volume, couture-edge fearlessness.",
    "Dressed like a manifesto. The rest of the room is footnotes.",
  ],
  "Luxury Streetwear": [
    "Heritage logos, fresh-out-the-box energy — the street is the runway.",
    "Premium drip engineered for concrete. Every label earns its place.",
    "Block-to-runway crossover — high fashion, higher altitude.",
    "Hoodies cut like couture, sneakers chosen like jewelry.",
    "Where the culture meets the atelier. Loud on purpose, never accidental.",
  ],
  "Y2K Revival": [
    "Mall couture reborn — sparkle, mesh, and a low-rise renaissance.",
    "Butterflies, crystal, and the unapologetic shine of the 2000s.",
    "Pop princess energy — every surface catches light, on purpose.",
    "Frosted, glossed, and entirely too much. Exactly the point.",
    "Disco reboot meets early-aughts mall — maximalism, glittered.",
  ],
  "Vacation Luxe": [
    "Linen, salt air, and the soft authority of money on holiday.",
    "Dressed like the rosé is cold and the schedule is short.",
    "Riviera-light — gold trim, white cotton, and sun on bare skin.",
    "Yacht-to-villa wardrobe — effortless, untucked, entirely considered.",
    "Bougainvillea hours — Mediterranean ease cut in silk and crisp linen.",
  ],
  Evening: [
    "Candlelit confidence — velvet, silk, and the perfect amount of drama.",
    "Black tie reborn — opulent, restrained, impossible to look away from.",
    "Dressed for an evening that should never end.",
    "Noir glamour — the room dims so the look can speak.",
    "Champagne hour distilled into a silhouette.",
  ],
  Business: [
    "Authority cut and pressed — the suit speaks before you do.",
    "Boardroom power, dressed in impeccable restraint.",
    "Executive tailoring with nothing left to negotiate.",
    "Sharp shoulders, precise lapels, the quiet language of command.",
    "Corner-office uniform — proven, polished, entirely unbothered.",
  ],
  Formal: [
    "Black tie is a promise. This look keeps it.",
    "Floor-length, precision-cut, and impossible to ignore.",
    "White-tie grandeur for the ceremonies that demand everything.",
    "Heritage tailoring meets modern gala — every seam decided.",
    "Old-world formality, modern presence. Dressed for the photographs.",
  ],
};

function generateDescription(occasion: string, style?: string): string {
  const styleDescs = style ? STYLE_LOOK_DESCRIPTIONS[style] : undefined;
  const descs = styleDescs ?? LOOK_DESCRIPTIONS[occasion] ?? LOOK_DESCRIPTIONS["Casual"];
  return pick(descs);
}

// Signature fashion houses per style — surfaced on the look-detail page as
// editorial context so the card reads as authored, not generated. Each list
// is curated to be the most recognizable houses that DEFINE the style, not
// merely brands that happen to make one product in that aesthetic.
const STYLE_SIGNATURE_BRANDS: Record<string, readonly string[]> = {
  "Old Money":         ["Loro Piana", "Brunello Cucinelli", "The Row", "Hermès", "Ralph Lauren Purple Label"],
  "Luxury Streetwear": ["Fear of God", "Rhude", "Amiri", "Off-White", "Palm Angels"],
  "Vacation Luxe":     ["Loro Piana", "Zimmermann", "Jacquemus", "Etro", "Missoni"],
  Techwear:            ["Acronym", "Stone Island Shadow", "Veilance", "Y-3", "Nike ACG"],
  "Clean Minimal":     ["The Row", "Jil Sander", "Toteme", "Lemaire", "Khaite"],
  "Y2K Revival":       ["Blumarine", "Diesel", "Miu Miu", "Mugler", "Versace"],
  Business:            ["Tom Ford", "Brioni", "Ermenegildo Zegna", "Brunello Cucinelli", "Ralph Lauren Purple Label"],
  Evening:             ["Tom Ford", "Saint Laurent", "Dolce & Gabbana", "Versace", "Roberto Cavalli"],
  Formal:              ["Brioni", "Tom Ford", "Dior", "Giorgio Armani", "Ralph Lauren Purple Label"],
  "Avant-garde":       ["Rick Owens", "Yohji Yamamoto", "Comme des Garçons", "Maison Margiela", "Junya Watanabe"],
};

// Returns up to `limit` signature houses for the given style, or an empty
// array if no curated list exists. Callers should hide the section when empty
// rather than render a generic fallback (would dilute the editorial voice).
export function getSignatureBrands(style: string, limit = 4): readonly string[] {
  const brands = STYLE_SIGNATURE_BRANDS[style];
  if (!brands) return [];
  return brands.slice(0, limit);
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
  { id: "t027", name: "Tweed Boucle Top", brand: "Chanel", price: 2800, category: "top", styles: ["Old Money", "Business", "Evening"], occasions: ["Work", "Event", "Date Night"], genders: ["women"], colors: ["Ivory/Black", "Pink/Gold", "Navy/Gold"], imageUrl: uns("1503342217505-b0a15ec3261c"), purchaseUrl: "https://www.chanel.com", productImageUrl: "https://a.1stdibscdn.com/chanel-pink-tweed-jacket-with-gold-tone-interlocking-cc-buttons-circa-1980s-for-sale/v_1672/v_271316321755557338505/v_27131632_1755557339361_bg_processed.jpg?width=480" },
  { id: "t028", name: "GORE-TEX Active Top", brand: "Acronym", price: 680, category: "top", styles: ["Techwear"], occasions: ["Casual", "Streetwear"], genders: ["men", "women"], colors: ["Black", "Graphite"], imageUrl: uns("1539008835657-9e8e9680c956"), purchaseUrl: "https://www.acrnm.com" },
  { id: "t029", name: "Cropped Utility Jacket Top", brand: "Stone Island", price: 540, category: "top", styles: ["Techwear", "Luxury Streetwear"], occasions: ["Casual", "Streetwear"], genders: ["men"], colors: ["Black", "Sage", "Navy"], imageUrl: uns("1539008835657-9e8e9680c956"), purchaseUrl: "https://www.stoneisland.com" },
  { id: "t030", name: "Silk Evening Blouse", brand: "Valentino", price: 1480, category: "top", styles: ["Evening", "Old Money"], occasions: ["Event", "Date Night", "Work"], genders: ["women"], colors: ["Blush", "Red", "Black"], imageUrl: uns("1503342217505-b0a15ec3261c"), purchaseUrl: "https://www.valentino.com" },

  // ── FIGS Scrubs — Women ───────────────────────────────────────────────────
  { id: "figs_t01", name: "Catarina One-Pocket Scrub Top", brand: "FIGS", price: 38, category: "top", styles: ["Business", "Clean Minimal"], occasions: ["Work"], genders: ["women"], colors: ["Ceil Blue", "Navy", "Slate", "Hunter Green", "Black", "Burgundy"], imageUrl: uns("1584820688313-b22ef25a6b29"), purchaseUrl: "https://www.wearfigs.com/collections/womens-scrub-tops" },
  { id: "figs_t02", name: "Rafaela Raglan Scrub Top", brand: "FIGS", price: 42, category: "top", styles: ["Business", "Clean Minimal"], occasions: ["Work"], genders: ["women"], colors: ["Navy", "Black", "Heather Grey", "Royal Blue", "Mulberry"], imageUrl: uns("1584820688313-b22ef25a6b29"), purchaseUrl: "https://www.wearfigs.com/collections/womens-scrub-tops" },
  { id: "figs_t03", name: "Bria Reversible Scrub Top", brand: "FIGS", price: 52, category: "top", styles: ["Business"], occasions: ["Work"], genders: ["women"], colors: ["Ceil Blue", "Black", "Olive", "Slate"], imageUrl: uns("1584820688313-b22ef25a6b29"), purchaseUrl: "https://www.wearfigs.com/collections/womens-scrub-tops" },
  { id: "figs_t04", name: "Yola Cross-Back Scrub Top", brand: "FIGS", price: 38, category: "top", styles: ["Business", "Clean Minimal"], occasions: ["Work"], genders: ["women"], colors: ["Navy", "Royal Blue", "Sage", "Mulberry", "Burgundy"], imageUrl: uns("1584820688313-b22ef25a6b29"), purchaseUrl: "https://www.wearfigs.com/collections/womens-scrub-tops" },
  { id: "figs_t05", name: "Casma Three-Pocket Scrub Top", brand: "FIGS", price: 38, category: "top", styles: ["Business"], occasions: ["Work"], genders: ["women"], colors: ["Hunter Green", "Navy", "Dusty Blue", "Ceil Blue"], imageUrl: uns("1584820688313-b22ef25a6b29"), purchaseUrl: "https://www.wearfigs.com/collections/womens-scrub-tops" },

  // ── FIGS Scrubs — Men ─────────────────────────────────────────────────────
  { id: "figs_t06", name: "Pisco One-Pocket Scrub Top", brand: "FIGS", price: 42, category: "top", styles: ["Business", "Clean Minimal"], occasions: ["Work"], genders: ["men"], colors: ["Navy", "Black", "Heather Grey", "Ceil Blue", "Slate"], imageUrl: uns("1584820688313-b22ef25a6b29"), purchaseUrl: "https://www.wearfigs.com/collections/mens-scrub-tops" },
  { id: "figs_t07", name: "Leon Two-Pocket Scrub Top", brand: "FIGS", price: 38, category: "top", styles: ["Business"], occasions: ["Work"], genders: ["men"], colors: ["Navy", "Black", "Hunter Green", "Slate", "Royal Blue"], imageUrl: uns("1584820688313-b22ef25a6b29"), purchaseUrl: "https://www.wearfigs.com/collections/mens-scrub-tops" },
  { id: "figs_t08", name: "Axim Utility Scrub Top", brand: "FIGS", price: 48, category: "top", styles: ["Business", "Techwear"], occasions: ["Work"], genders: ["men"], colors: ["Black", "Graphite", "Navy", "Charcoal"], imageUrl: uns("1584820688313-b22ef25a6b29"), purchaseUrl: "https://www.wearfigs.com/collections/mens-scrub-tops" },

  // ── BOTTOMS — Women ───────────────────────────────────────────────────────
  // Batch 76: real Jil Sander "Jack" wide-leg wool trouser photo (eBay
  // listing). Brand + silhouette + fabric match; black covers the entry's
  // "Charcoal" color slot. Same productImageUrl override pattern as b014.
  { id: "b001", name: "Wide-Leg Wool Trouser", brand: "Jil Sander", price: 890, category: "bottom", styles: ["Clean Minimal", "Business", "Old Money"], occasions: ["Work", "Event", "Date Night"], genders: ["women"], colors: ["Ivory", "Camel", "Charcoal"], imageUrl: uns("1552902865-b72c031ac5ea"), productImageUrl: "https://i.ebayimg.com/images/g/C-8AAOSwm~1cQaKG/s-l960.jpg", purchaseUrl: "https://www.jilsander.com" },
  { id: "b002", name: "Crystal Mini Skirt", brand: "Versace", price: 1350, category: "bottom", styles: ["Evening", "Y2K Revival"], occasions: ["Party", "Event", "Date Night"], genders: ["women"], colors: ["Gold", "Silver", "Black"], imageUrl: uns("1515886657613-9f3515b0c78f"), purchaseUrl: "https://www.versace.com" },
  // Batch 76: real Totême linen-blend wide-leg suit trouser in cream
  // (ModeSens CDN). Perfect match on brand, silhouette, fabric, and color.
  { id: "b003", name: "Tailored Wide-Leg Trousers", brand: "Toteme", price: 520, category: "bottom", styles: ["Clean Minimal", "Old Money", "Business"], occasions: ["Work", "Casual", "Date Night"], genders: ["women"], colors: ["Black", "Cream", "Chocolate"], imageUrl: uns("1552902865-b72c031ac5ea"), productImageUrl: "https://cdn.modesens.com/product/48375271_13?w=600", purchaseUrl: "https://www.toteme-studio.com" },
  { id: "b004", name: "Straight-Leg Denim", brand: "Agolde", price: 248, category: "bottom", styles: ["Y2K Revival", "Casual"], occasions: ["Casual", "Streetwear", "Date Night"], genders: ["women"], colors: ["Indigo", "Light Wash", "Black"], imageUrl: uns("1542272054537-4845f1353d17"), purchaseUrl: "https://www.agolde.com" },
  { id: "b005", name: "Plissé Midi Skirt", brand: "Jacquemus", price: 480, category: "bottom", styles: ["Clean Minimal", "Vacation Luxe"], occasions: ["Casual", "Vacation", "Date Night", "Event"], genders: ["women"], colors: ["Pink", "White", "Terracotta"], imageUrl: uns("1515886657613-9f3515b0c78f"), purchaseUrl: "https://www.jacquemus.com" },
  { id: "b006", name: "Low-Rise Barrel Jeans", brand: "Agolde", price: 238, category: "bottom", styles: ["Y2K Revival", "Luxury Streetwear"], occasions: ["Casual", "Streetwear", "Party"], genders: ["women"], colors: ["Medium Wash", "Black", "Light Wash"], imageUrl: uns("1542272054537-4845f1353d17"), purchaseUrl: "https://www.agolde.com" },
  { id: "b007", name: "Tweed Mini Skirt", brand: "Chanel", price: 2600, category: "bottom", styles: ["Old Money", "Business"], occasions: ["Work", "Event", "Date Night"], genders: ["women"], colors: ["Ivory/Black", "Pink/Gold", "Navy"], imageUrl: uns("1515886657613-9f3515b0c78f"), purchaseUrl: "https://www.chanel.com", productImageUrl: "https://i.ebayimg.com/images/g/uz8AAOSwPshnJ7UA/s-l400.webp" },
  { id: "b008", name: "Asymmetric Satin Skirt", brand: "Ganni", price: 280, category: "bottom", styles: ["Y2K Revival", "Evening"], occasions: ["Party", "Date Night", "Event"], genders: ["women"], colors: ["Champagne", "Emerald", "Cobalt"], imageUrl: uns("1515886657613-9f3515b0c78f"), purchaseUrl: "https://www.ganni.com" },
  // Batch 76: real COS wide-leg linen-blend cargo trouser in stone
  // (eBay listing). Brand + wide-leg + linen + stone colorway all align.
  { id: "b009", name: "Linen Wide Trousers", brand: "COS", price: 115, category: "bottom", styles: ["Clean Minimal", "Vacation Luxe"], occasions: ["Casual", "Work", "Vacation"], genders: ["women", "men"], colors: ["White", "Stone", "Terracotta"], imageUrl: uns("1552902865-b72c031ac5ea"), productImageUrl: "https://i.ebayimg.com/images/g/sRYAAeSwBOJoPffu/s-l960.jpg", purchaseUrl: "https://www.cosstores.com" },
  { id: "b010", name: "Baggy Cargo Trousers", brand: "Carhartt WIP", price: 145, category: "bottom", styles: ["Techwear", "Luxury Streetwear"], occasions: ["Casual", "Streetwear"], genders: ["women", "men"], colors: ["Black", "Olive", "Stone"], imageUrl: uns("1552902865-b72c031ac5ea"), productImageUrl: "https://u-mercari-images.mercdn.net/photos/m78624335286_1.jpg?width=1280&quality=75&_=1745487539", purchaseUrl: "https://www.carhartt-wip.com" },
  { id: "b011", name: "Sequin Party Skirt", brand: "ASOS", price: 65, category: "bottom", styles: ["Y2K Revival", "Evening"], occasions: ["Party", "Date Night"], genders: ["women"], colors: ["Silver", "Gold", "Black"], imageUrl: uns("1515886657613-9f3515b0c78f"), purchaseUrl: "https://www.asos.com" },
  { id: "b012", name: "Crochet Mini Skirt", brand: "Cider", price: 32, category: "bottom", styles: ["Vacation Luxe", "Y2K Revival"], occasions: ["Vacation", "Casual", "Party"], genders: ["women"], colors: ["White", "Beige", "Coral"], imageUrl: uns("1515886657613-9f3515b0c78f"), purchaseUrl: "https://www.shopcider.com" },
  { id: "b013", name: "Vinyl Mini Skirt", brand: "Fashion Nova", price: 35, category: "bottom", styles: ["Y2K Revival"], occasions: ["Party", "Date Night"], genders: ["women"], colors: ["Black", "Red"], imageUrl: uns("1515886657613-9f3515b0c78f"), purchaseUrl: "https://www.fashionnova.com" },

  // ── BOTTOMS — Men ─────────────────────────────────────────────────────────
  // Real Ralph Lauren Purple Label slim flannel pants product photo via
  // Amazon's CDN. Verified to depict an actual slim-fit grey/stone flannel
  // trouser — replaces the denylisted Unsplash ID 1552902865-b72c031ac5ea
  // which decayed to a woman in teal. productImageUrl is checked first
  // (line 1602/1754) before falling back to the uns() ID, same pattern as
  // catalogExtras.ts uses for shoes.
  { id: "b014", name: "Slim Flannel Trouser", brand: "Ralph Lauren Purple Label", price: 695, category: "bottom", styles: ["Old Money", "Business"], occasions: ["Work", "Date Night", "Event"], genders: ["men"], colors: ["Charcoal", "Navy", "Stone"], imageUrl: uns("1552902865-b72c031ac5ea"), productImageUrl: "https://m.media-amazon.com/images/I/7107KzirejL.jpg", purchaseUrl: "https://www.ralphlauren.com" },
  // Batch 76: real Incotex slim-fit tropical wool trouser in light grey
  // (Care of Carl product page). Brand + slim + wool + grey all match.
  { id: "b015", name: "Slim Wool Trouser", brand: "Incotex", price: 480, category: "bottom", styles: ["Old Money", "Business"], occasions: ["Work", "Date Night", "Casual"], genders: ["men"], colors: ["Dark Brown", "Grey", "Navy"], imageUrl: uns("1552902865-b72c031ac5ea"), productImageUrl: "https://www.careofcarl.com/bilder/artiklar/zoom/26656611r_1.jpg?m=1708607308", purchaseUrl: "https://www.incotex.com" },
  { id: "b016", name: "Relaxed Chino", brand: "Polo Ralph Lauren", price: 165, category: "bottom", styles: ["Old Money", "Casual"], occasions: ["Casual", "Work", "Date Night"], genders: ["men"], colors: ["Stone", "Khaki", "Navy"], imageUrl: uns("1552902865-b72c031ac5ea"), productImageUrl: "https://cdn.modesens.com/availability/54444031?w=400", purchaseUrl: "https://www.ralphlauren.com" },
  { id: "b017", name: "Slim Raw-Edge Denim", brand: "Acne Studios", price: 320, category: "bottom", styles: ["Luxury Streetwear", "Casual"], occasions: ["Casual", "Date Night", "Streetwear"], genders: ["men"], colors: ["Indigo", "Black", "Grey"], imageUrl: uns("1542272054537-4845f1353d17"), purchaseUrl: "https://www.acnestudios.com" },
  { id: "b018", name: "Cargo Jogger", brand: "Stone Island Shadow", price: 680, category: "bottom", styles: ["Techwear", "Luxury Streetwear"], occasions: ["Casual", "Streetwear"], genders: ["men"], colors: ["Black", "Slate"], imageUrl: uns("1624378441164-f3b5a4ec2a53"), purchaseUrl: "https://www.stoneisland.com" },
  { id: "b019", name: "Baggy Carpenter Denim", brand: "Amiri", price: 680, category: "bottom", styles: ["Luxury Streetwear"], occasions: ["Casual", "Streetwear", "Date Night"], genders: ["men"], colors: ["Indigo", "Black"], imageUrl: uns("1542272054537-4845f1353d17"), purchaseUrl: "https://www.amiri.com" },
  { id: "b020", name: "Technical Track Pant", brand: "Acronym", price: 890, category: "bottom", styles: ["Techwear"], occasions: ["Casual", "Streetwear"], genders: ["men"], colors: ["Black", "Graphite"], imageUrl: uns("1624378441164-f3b5a4ec2a53"), purchaseUrl: "https://www.acrnm.com" },
  { id: "b021", name: "Linen Drawstring Trouser", brand: "Massimo Dutti", price: 79, category: "bottom", styles: ["Clean Minimal", "Vacation Luxe"], occasions: ["Casual", "Vacation"], genders: ["men"], colors: ["Ecru", "Navy", "Beige"], imageUrl: uns("1552902865-b72c031ac5ea"), productImageUrl: "https://cdn-img.poizonapp.com/pro-img/cut-img/20250120/4860f2c432024a12a284a7d39e8b1982.jpg?x-oss-process=image/format,webp/resize,w_500", purchaseUrl: "https://www.massimodutti.com" },
  { id: "b022", name: "Slim Tailored Trouser", brand: "Acne Studios", price: 480, category: "bottom", styles: ["Clean Minimal", "Business"], occasions: ["Work", "Date Night", "Event"], genders: ["men"], colors: ["Black", "Charcoal", "Navy"], imageUrl: uns("1552902865-b72c031ac5ea"), productImageUrl: "https://www.svrn.com/cdn/shop/files/piana-light-dry-suiting-trouser-in-black-men-s-pants-acne-studios-svrn-chicago-32265006055497_800x.jpg?v=1726249964", purchaseUrl: "https://www.acnestudios.com" },

  // ── FIGS Scrub Bottoms — Women ────────────────────────────────────────────
  { id: "figs_b01", name: "Zamora Jogger Scrub Pants", brand: "FIGS", price: 42, category: "bottom", styles: ["Business", "Clean Minimal"], occasions: ["Work"], genders: ["women"], colors: ["Ceil Blue", "Navy", "Slate", "Hunter Green", "Black", "Burgundy"], imageUrl: uns("1584820688313-b22ef25a6b29"), purchaseUrl: "https://www.wearfigs.com/collections/womens-scrub-pants" },
  { id: "figs_b02", name: "Ames Cargo Scrub Pants", brand: "FIGS", price: 52, category: "bottom", styles: ["Business", "Techwear"], occasions: ["Work"], genders: ["women"], colors: ["Navy", "Black", "Hunter Green", "Olive", "Slate"], imageUrl: uns("1584820688313-b22ef25a6b29"), purchaseUrl: "https://www.wearfigs.com/collections/womens-scrub-pants" },
  { id: "figs_b03", name: "Kade Scrub Shorts", brand: "FIGS", price: 38, category: "bottom", styles: ["Business", "Clean Minimal"], occasions: ["Work", "Casual"], genders: ["women"], colors: ["Navy", "Black", "Heather Grey", "Ceil Blue"], imageUrl: uns("1584820688313-b22ef25a6b29"), purchaseUrl: "https://www.wearfigs.com/collections/womens-scrub-shorts" },
  { id: "figs_b04", name: "Rafaela Drawstring Scrub Pants", brand: "FIGS", price: 46, category: "bottom", styles: ["Business", "Clean Minimal"], occasions: ["Work"], genders: ["women"], colors: ["Burgundy", "Royal Blue", "Mulberry", "Slate", "Dusty Blue"], imageUrl: uns("1584820688313-b22ef25a6b29"), purchaseUrl: "https://www.wearfigs.com/collections/womens-scrub-pants" },

  // ── FIGS Scrub Bottoms — Men ──────────────────────────────────────────────
  { id: "figs_b05", name: "Yola Jogger Scrub Pant", brand: "FIGS", price: 42, category: "bottom", styles: ["Business", "Clean Minimal"], occasions: ["Work"], genders: ["men"], colors: ["Navy", "Black", "Heather Grey", "Slate", "Ceil Blue"], imageUrl: uns("1584820688313-b22ef25a6b29"), purchaseUrl: "https://www.wearfigs.com/collections/mens-scrub-pants" },
  { id: "figs_b06", name: "Axim Cargo Scrub Pant", brand: "FIGS", price: 52, category: "bottom", styles: ["Business", "Techwear"], occasions: ["Work"], genders: ["men"], colors: ["Black", "Navy", "Hunter Green", "Graphite", "Slate"], imageUrl: uns("1584820688313-b22ef25a6b29"), purchaseUrl: "https://www.wearfigs.com/collections/mens-scrub-pants" },
  { id: "figs_b07", name: "Cairo Relaxed Scrub Pant", brand: "FIGS", price: 38, category: "bottom", styles: ["Business", "Clean Minimal"], occasions: ["Work"], genders: ["men"], colors: ["Navy", "Black", "Slate", "Royal Blue", "Charcoal"], imageUrl: uns("1584820688313-b22ef25a6b29"), purchaseUrl: "https://www.wearfigs.com/collections/mens-scrub-pants" },

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
  // ── Executive Suit Jackets — Men (Old Money · Business) ─────────────────────
  { id: "exm01", name: "Dark Navy Two-Button Suit Jacket", brand: "Giorgio Armani", price: 3400, category: "outerwear", styles: ["Old Money", "Business"], occasions: ["Work", "Event", "Date Night"], genders: ["men"], colors: ["Dark Navy", "Midnight Blue"], imageUrl: uns("1507003211169-0a1dd7228f2d"), purchaseUrl: "https://www.armani.com" },
  { id: "exm02", name: "Charcoal Flannel Single-Breasted Jacket", brand: "Brioni", price: 5800, category: "outerwear", styles: ["Old Money", "Business"], occasions: ["Work", "Event"], genders: ["men"], colors: ["Charcoal", "Deep Charcoal"], imageUrl: uns("1552902865-b72c031ac5ea"), purchaseUrl: "https://www.brioni.com" },
  { id: "exm03", name: "Midnight Blue Peak-Lapel Suit Jacket", brand: "Corneliani", price: 1890, category: "outerwear", styles: ["Old Money", "Business"], occasions: ["Work", "Event", "Date Night"], genders: ["men"], colors: ["Midnight Blue", "Dark Navy"], imageUrl: uns("1521572163474-6864f9cf17ab"), purchaseUrl: "https://www.corneliani.com" },
  { id: "exm04", name: "Tailored Dark Navy Suit Jacket", brand: "Ermenegildo Zegna", price: 2800, category: "outerwear", styles: ["Old Money", "Business"], occasions: ["Work", "Event", "Date Night"], genders: ["men"], colors: ["Dark Navy", "Black"], imageUrl: uns("1517841905240-472988babdf9"), purchaseUrl: "https://www.zegna.com" },
  { id: "exm05", name: "Black Slim-Fit Executive Blazer", brand: "Tom Ford", price: 3200, category: "outerwear", styles: ["Old Money", "Business"], occasions: ["Work", "Event", "Date Night"], genders: ["men"], colors: ["Black", "Charcoal"], imageUrl: uns("1519085360753-af0119f7cbe7"), purchaseUrl: "https://www.tomford.com" },
  { id: "exm06", name: "Power Navy Double-Breasted Blazer", brand: "Kilgour", price: 2400, category: "outerwear", styles: ["Old Money", "Business"], occasions: ["Work", "Event"], genders: ["men"], colors: ["Dark Navy", "Midnight Blue", "Dark Blue"], imageUrl: uns("1591047139829-d91aecb6caea"), purchaseUrl: "https://www.kilgour.com" },

  // ── Executive Suit Jackets — Women (Old Money · Business) ────────────────────
  { id: "exw01", name: "Dark Navy Power Suit Jacket", brand: "Giorgio Armani", price: 2900, category: "outerwear", styles: ["Old Money", "Business"], occasions: ["Work", "Event", "Date Night"], genders: ["women"], colors: ["Dark Navy", "Midnight Blue"], imageUrl: uns("1503342217505-b0a15ec3261c"), purchaseUrl: "https://www.armani.com" },
  { id: "exw02", name: "Black Executive Power Blazer", brand: "Roland Mouret", price: 1890, category: "outerwear", styles: ["Old Money", "Business"], occasions: ["Work", "Event", "Date Night"], genders: ["women"], colors: ["Black", "Charcoal"], imageUrl: uns("1441986300917-64674bd600d8"), purchaseUrl: "https://www.rolandmouret.com" },
  { id: "exw03", name: "Charcoal Power Suit Jacket", brand: "Max Mara", price: 2100, category: "outerwear", styles: ["Old Money", "Business"], occasions: ["Work", "Event"], genders: ["women"], colors: ["Charcoal", "Deep Charcoal", "Dark Slate"], imageUrl: uns("1469334031218-e382a71b716b"), purchaseUrl: "https://www.maxmara.com" },
  { id: "exw04", name: "Dark Navy Executive Jacket", brand: "St. John Knits", price: 2400, category: "outerwear", styles: ["Old Money", "Business"], occasions: ["Work", "Event", "Date Night"], genders: ["women"], colors: ["Dark Navy", "Black", "Midnight Blue"], imageUrl: uns("1529139574466-a303027bc851"), purchaseUrl: "https://www.stjohnknits.com" },
  { id: "exw05", name: "Midnight Blue Power Blazer", brand: "Victoria Beckham", price: 1680, category: "outerwear", styles: ["Old Money", "Business"], occasions: ["Work", "Event", "Date Night"], genders: ["women"], colors: ["Midnight Blue", "Dark Navy", "Dark Blue"], imageUrl: uns("1516762121899-c04ad64fc6e0"), purchaseUrl: "https://www.victoriabeckham.com" },
  { id: "exw06", name: "Black Structured Executive Jacket", brand: "Theory", price: 890, category: "outerwear", styles: ["Old Money", "Business"], occasions: ["Work", "Date Night", "Event"], genders: ["women"], colors: ["Black", "Charcoal", "Dark Navy"], imageUrl: uns("1509631179647-0177331693ae"), purchaseUrl: "https://www.theory.com" },

  // ── Formal Tuxedos ───────────────────────────────────────────────────────────
  { id: "fs01", name: "Classic Black Tuxedo Jacket", brand: "Tom Ford", price: 4800, category: "outerwear", styles: ["Evening", "Old Money"], occasions: ["Formal", "Event"], genders: ["men"], colors: ["Black"], imageUrl: uns("1507003211169-0a1dd7228f2d"), purchaseUrl: "https://www.tomford.com" },
  { id: "fs02", name: "Peak-Lapel Tuxedo Jacket", brand: "Brioni", price: 6200, category: "outerwear", styles: ["Evening", "Old Money"], occasions: ["Formal", "Event"], genders: ["men"], colors: ["Black", "Midnight Blue"], imageUrl: uns("1507003211169-0a1dd7228f2d"), purchaseUrl: "https://www.brioni.com" },
  { id: "fs03", name: "Shawl-Lapel Dinner Jacket", brand: "Ralph Lauren Purple Label", price: 3900, category: "outerwear", styles: ["Evening", "Old Money"], occasions: ["Formal", "Event"], genders: ["men"], colors: ["Black", "White", "Ivory"], imageUrl: uns("1552902865-b72c031ac5ea"), purchaseUrl: "https://www.ralphlauren.com" },
  { id: "fs04", name: "Single-Breasted Suit Jacket", brand: "Canali", price: 2800, category: "outerwear", styles: ["Business", "Old Money"], occasions: ["Formal", "Work", "Event"], genders: ["men"], colors: ["Charcoal", "Navy", "Black", "Mid Grey"], imageUrl: uns("1591047139829-d91aecb6caea"), purchaseUrl: "https://www.canali.com" },
  { id: "fs05", name: "Double-Breasted Suit Jacket", brand: "Ermenegildo Zegna", price: 3400, category: "outerwear", styles: ["Business", "Old Money"], occasions: ["Formal", "Work", "Event"], genders: ["men"], colors: ["Charcoal", "Navy", "Dark Brown", "Slate"], imageUrl: uns("1591047139829-d91aecb6caea"), purchaseUrl: "https://www.zegna.com" },
  { id: "fs06", name: "Velvet Smoking Jacket", brand: "Gucci", price: 3600, category: "outerwear", styles: ["Evening", "Old Money"], occasions: ["Formal", "Event", "Party"], genders: ["men"], colors: ["Black", "Burgundy", "Forest Green", "Navy"], imageUrl: uns("1507003211169-0a1dd7228f2d"), purchaseUrl: "https://www.gucci.com" },
  { id: "fs07", name: "Three-Piece Suit Jacket", brand: "Huntsman Savile Row", price: 5500, category: "outerwear", styles: ["Business", "Old Money"], occasions: ["Formal", "Work", "Event"], genders: ["men"], colors: ["Charcoal", "Navy Pin Stripe", "Black", "Mid Grey"], imageUrl: uns("1552902865-b72c031ac5ea"), purchaseUrl: "https://www.huntsmansavilerow.com" },
  { id: "fs08", name: "Midnight Blue Tuxedo", brand: "Dolce & Gabbana", price: 4200, category: "outerwear", styles: ["Evening", "Old Money"], occasions: ["Formal", "Event"], genders: ["men"], colors: ["Midnight Blue", "Black"], imageUrl: uns("1507003211169-0a1dd7228f2d"), purchaseUrl: "https://www.dolcegabbana.com" },

  // ── FORMAL SHIRTS — Men ───────────────────────────────────────────────────
  { id: "fsh01", name: "Wing-Collar Tuxedo Shirt", brand: "Turnbull & Asser", price: 480, category: "top", styles: ["Evening", "Old Money"], occasions: ["Formal", "Event"], genders: ["men"], colors: ["White", "Ivory"], imageUrl: uns("1521572163474-6864f9cf17ab"), productImageUrl: "https://i.ebayimg.com/images/g/sQUAAeSwE2Fp6uWT/s-l400.webp", purchaseUrl: "https://www.turnbullandasser.com" },
  { id: "fsh02", name: "Pleated-Front Dress Shirt", brand: "Charvet", price: 620, category: "top", styles: ["Evening", "Old Money"], occasions: ["Formal", "Event"], genders: ["men"], colors: ["White", "Ivory", "Pale Blue"], imageUrl: uns("1521572163474-6864f9cf17ab"), productImageUrl: "https://i.ebayimg.com/images/g/n20AAeSwkaZpph9M/s-l400.webp", purchaseUrl: "https://www.charvet.com" },
  { id: "fsh03", name: "French Cuff Formal Shirt", brand: "Brioni", price: 540, category: "top", styles: ["Business", "Old Money"], occasions: ["Formal", "Work", "Event"], genders: ["men"], colors: ["White", "Pale Blue", "Ivory", "Light Pink"], imageUrl: uns("1521572163474-6864f9cf17ab"), productImageUrl: "https://i.ebayimg.com/images/g/ILYAAeSwM~Rp7qjt/s-l400.webp", purchaseUrl: "https://www.brioni.com" },
  { id: "fsh04", name: "Marcella Bib Dress Shirt", brand: "Turnbull & Asser", price: 510, category: "top", styles: ["Evening", "Old Money"], occasions: ["Formal"], genders: ["men"], colors: ["White", "Ivory"], imageUrl: uns("1521572163474-6864f9cf17ab"), productImageUrl: "https://turnbullandasser.co.uk/cdn/shop/files/ZZSR0005_200001_2001_D3.jpg?v=1701467736", purchaseUrl: "https://www.turnbullandasser.com" },

  // ── FORMAL TROUSERS — Men ─────────────────────────────────────────────────
  { id: "ftr01", name: "Satin-Stripe Tuxedo Trousers", brand: "Tom Ford", price: 1200, category: "bottom", styles: ["Evening", "Old Money"], occasions: ["Formal", "Event"], genders: ["men"], colors: ["Black", "Midnight Blue"], imageUrl: uns("1552902865-b72c031ac5ea"), productImageUrl: "https://www.mercyvintage.com/cdn/shop/files/8bddc1470534855f5db19de1b72c37b6.jpg?v=1771876825&width=1536", purchaseUrl: "https://www.tomford.com" },
  { id: "ftr02", name: "Flat-Front Dress Trousers", brand: "Canali", price: 680, category: "bottom", styles: ["Business", "Old Money"], occasions: ["Formal", "Work", "Event"], genders: ["men"], colors: ["Charcoal", "Navy", "Black", "Mid Grey"], imageUrl: uns("1552902865-b72c031ac5ea"), productImageUrl: "https://i.ebayimg.com/images/g/aNAAAeSw7Axp0u3t/s-l400.webp", purchaseUrl: "https://www.canali.com" },
  { id: "ftr03", name: "Pleated Formal Trousers", brand: "Brioni", price: 980, category: "bottom", styles: ["Evening", "Old Money"], occasions: ["Formal", "Event"], genders: ["men"], colors: ["Black", "Charcoal", "Midnight Blue"], imageUrl: uns("1552902865-b72c031ac5ea"), productImageUrl: "https://i.ebayimg.com/images/g/w7AAAOSwGcVnBb3t/s-l400.webp", purchaseUrl: "https://www.brioni.com" },
  { id: "ftr04", name: "Wide-Leg Formal Trouser", brand: "Ermenegildo Zegna", price: 790, category: "bottom", styles: ["Business", "Old Money"], occasions: ["Formal", "Work", "Event"], genders: ["men"], colors: ["Charcoal", "Navy", "Slate", "Black"], imageUrl: uns("1552902865-b72c031ac5ea"), productImageUrl: "https://cdn.modesens.com/product/63441035_22?w=400", purchaseUrl: "https://www.zegna.com" },

  // ── Executive Trousers — Men (Old Money · Business) ───────────────────────────
  { id: "exmt01", name: "Dark Navy Flat-Front Dress Trousers", brand: "Giorgio Armani", price: 980, category: "bottom", styles: ["Old Money", "Business"], occasions: ["Work", "Event", "Date Night"], genders: ["men"], colors: ["Dark Navy", "Midnight Blue"], imageUrl: uns("1552902865-b72c031ac5ea"), productImageUrl: "https://i.ebayimg.com/images/g/k5UAAeSwoPdpfSKk/s-l400.webp", purchaseUrl: "https://www.armani.com" },
  { id: "exmt02", name: "Charcoal Flannel Suit Trousers", brand: "Brioni", price: 1400, category: "bottom", styles: ["Old Money", "Business"], occasions: ["Work", "Event"], genders: ["men"], colors: ["Charcoal", "Deep Charcoal"], imageUrl: uns("1542272054537-4845f1353d17"), purchaseUrl: "https://www.brioni.com" },
  { id: "exmt03", name: "Midnight Blue Slim Dress Trousers", brand: "Ermenegildo Zegna", price: 890, category: "bottom", styles: ["Old Money", "Business"], occasions: ["Work", "Event", "Date Night"], genders: ["men"], colors: ["Midnight Blue", "Dark Navy"], imageUrl: uns("1552902865-b72c031ac5ea"), productImageUrl: "https://i.ebayimg.com/thumbs/images/g/PAAAAeSwzv1pHHjN/s-l400.webp", purchaseUrl: "https://www.zegna.com" },
  { id: "exmt04", name: "Black Wool Executive Trousers", brand: "Tom Ford", price: 1100, category: "bottom", styles: ["Old Money", "Business"], occasions: ["Work", "Event"], genders: ["men"], colors: ["Black", "Charcoal", "Dark Slate"], imageUrl: uns("1542272054537-4845f1353d17"), purchaseUrl: "https://www.tomford.com" },

  // ── Executive Trousers — Women (Old Money · Business) ────────────────────────
  { id: "exwt01", name: "Dark Navy Tailored Suit Trousers", brand: "Giorgio Armani", price: 840, category: "bottom", styles: ["Old Money", "Business"], occasions: ["Work", "Event", "Date Night"], genders: ["women"], colors: ["Dark Navy", "Midnight Blue"], imageUrl: uns("1552902865-b72c031ac5ea"), productImageUrl: "https://assets-cf.armani.com/image/upload/f_auto,q_auto:good,w_1125,h_1428,c_fill/v1769714537/GW002793_TE10101_UB110_F_SS2026.jpg", purchaseUrl: "https://www.armani.com" },
  { id: "exwt02", name: "Black Wide-Leg Executive Trousers", brand: "Roland Mouret", price: 690, category: "bottom", styles: ["Old Money", "Business"], occasions: ["Work", "Event", "Date Night"], genders: ["women"], colors: ["Black", "Charcoal"], imageUrl: uns("1542272054537-4845f1353d17"), purchaseUrl: "https://www.rolandmouret.com" },
  { id: "exwt03", name: "Charcoal Straight-Leg Power Trousers", brand: "Max Mara", price: 780, category: "bottom", styles: ["Old Money", "Business"], occasions: ["Work", "Event"], genders: ["women"], colors: ["Charcoal", "Deep Charcoal", "Dark Slate"], imageUrl: uns("1552902865-b72c031ac5ea"), productImageUrl: "https://i.ebayimg.com/images/g/VTUAAeSwPKJopidP/s-l400.webp", purchaseUrl: "https://www.maxmara.com" },
  { id: "exwt04", name: "Midnight Blue Slim Suit Trousers", brand: "Theory", price: 395, category: "bottom", styles: ["Old Money", "Business"], occasions: ["Work", "Event", "Date Night"], genders: ["women"], colors: ["Midnight Blue", "Dark Navy", "Dark Blue"], imageUrl: uns("1542272054537-4845f1353d17"), purchaseUrl: "https://www.theory.com" },

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
  // ── Verified extras with real PDP images + direct purchase URLs ─────────────
  ...CATALOG_EXTRAS,
  // ── Shopify-sourced real product feed (2,940 items across 21 brand stores) ─
  // Every item has a real CDN image, real $/products/<handle>$ PDP, real price.
  // Source pipeline + brand list documented in catalogFeed.ts header.
  ...SHOPIFY_FEED,
];

// ─── Local product asset autopatch ──────────────────────────────────────────
//
// Walks the merged CATALOG once at module load and stamps `localProductImage`
// onto every item that has a bundled AI-generated photo registered in
// `LOCAL_PRODUCT_ASSETS`. This avoids 170+ inline `require()` calls in the
// catalog literal and keeps the asset registry in a single file. Items with
// no local asset are left untouched — they fall back to `productImageUrl` or
// the placeholder pool as before.
for (const item of CATALOG) {
  const localAsset = LOCAL_PRODUCT_ASSETS[item.id];
  if (localAsset && !item.localProductImage) {
    item.localProductImage = localAsset;
  }
}

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
  // Formal Remix = formalwear (tux/suit/gown) styled with statement sneakers.
  // Surfaces tuxedos, suits, gowns, and black-tie pieces from the catalog —
  // shoe slot is force-overridden to sneakers downstream (preferredShoeTypes
  // + coherentShoeTypes bypass), so the look reads "tailored top half,
  // streetwear footwear" without needing a separate "Formal Remix" tag on
  // every existing catalog item.
  "Formal Remix": ["Formal", "Event", "Evening", "Party"],
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
  // Formal Remix blends evening tailoring with streetwear DNA — pulls from
  // Evening (gowns/tuxedos), Business (suits), and Luxury Streetwear (the
  // sneaker culture that defines the remix).
  "Formal Remix": ["Evening", "Business", "Luxury Streetwear", "Old Money"],
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

// Brand-lock alias map (batch 83). The shop's BRANDS list and the outfit
// CATALOG use slightly different display strings for a few houses, so an
// exact `item.brand === brandLock` filter would yield an empty pool for
// these even though catalog items DO exist. Normalize the shop name to
// the catalog name before filtering. Only houses where the catalog has
// genuine items under the canonical name are mapped — for shop brands
// with zero catalog inventory we deliberately let the lock yield empty
// looks (better an honest empty state than wrong-brand pollution).
const BRAND_LOCK_ALIASES: Record<string, string> = {
  "Christian Dior": "Dior",
  "Versace Jeans Couture": "Versace",
  "Zegna": "Ermenegildo Zegna",
};

/**
 * Brand availability probe used by the Style screen empty-state to explain
 * WHY a brand-locked generation returned zero looks. Per product rule the
 * only acceptable empty reasons are:
 *   1. Gender-specific brand — the locked brand has no items for this gender
 *      (e.g. Bottega Veneta has no women's items in catalog, etc.)
 *   2. Over budget — items exist but the cheapest assemblable outfit's price
 *      exceeds the user's selected budget cap.
 * Returns the cheapest 2-piece outfit price (dress+shoe OR top+bottom) so
 * the UI can suggest a concrete budget bump.
 */
export function getBrandAvailability(
  brand: string,
  gender: string,
  budget: string,
  occasion?: string,
): {
  hasGenderItems: boolean;
  /** True only when the brand has enough categories in this gender to
   *  assemble a 2-piece outfit (dress+shoe / top+bottom / etc). False
   *  means the catalog has SOME items for this gender but they don't
   *  cover enough categories to compose a look — UI surfaces a distinct
   *  "limited catalog coverage" message instead of a misleading $0
   *  "over budget" line. */
  hasAssemblableOutfit: boolean;
  /** Cheapest 2-piece combo price, or 0 when hasAssemblableOutfit=false. */
  cheapestOutfitPrice: number;
  budgetMax: number;
} {
  const actualBrand = BRAND_LOCK_ALIASES[brand] ?? brand;
  const genderKey = gender.toLowerCase() as "women" | "men" | "unisex";
  const { max: budgetMax } = parseBudget(budget);
  const pool = CATALOG.filter(
    (i) =>
      i.brand === actualBrand &&
      (i.genders.includes(genderKey) || i.genders.includes("unisex")),
  );
  if (pool.length === 0) {
    return { hasGenderItems: false, hasAssemblableOutfit: false, cheapestOutfitPrice: 0, budgetMax };
  }
  const cheapest = (cat: string): number => {
    const items = pool.filter((i) => i.category === cat);
    if (!items.length) return Infinity;
    return Math.min(...items.map((i) => i.price));
  };
  const cTop = cheapest("top");
  const cBottom = cheapest("bottom");
  // Formal Remix forces sneaker-only shoes — availability check must
  // therefore consider ONLY sneakers in this brand's pool. Otherwise a
  // brand with no sneakers (e.g. Brioni) would falsely report
  // hasAssemblableOutfit=true under Formal Remix and we'd skip the
  // "limited coverage" empty-state in favor of generating a look that
  // pickShoe will then refuse to place — leaving the screen blank with
  // no explanation.
  const sneakerOnly = occasion === "Formal Remix";
  const shoePool = sneakerOnly
    ? pool.filter((i) => i.category === "shoes" && inferShoeType(i) === "sneakers")
    : pool.filter((i) => i.category === "shoes");
  const cShoe = shoePool.length === 0 ? Infinity : Math.min(...shoePool.map((i) => i.price));
  const cDress = cheapest("dress");
  const cOuter = cheapest("outerwear");
  const combos = [
    cDress + cShoe,
    cTop + cBottom + cShoe,
    cTop + cBottom,
    cTop + cShoe,
    cBottom + cShoe,
    cOuter + cBottom,
    cDress + cOuter,
  ];
  const min = Math.min(...combos);
  const assemblable = isFinite(min);
  return {
    hasGenderItems: true,
    hasAssemblableOutfit: assemblable,
    cheapestOutfitPrice: assemblable ? min : 0,
    budgetMax,
  };
}

// ─── Season inference ────────────────────────────────────────────────────────
// Derive the seasons a catalog item naturally suits from its name. We don't
// store an explicit seasons field on each item (1700+ items × hand-tagging
// is brittle), so we infer from fabric / silhouette keywords. An item with
// no signal defaults to "all seasons" — only items with STRONG seasonal
// vocabulary are constrained. Pure accessory / bag / jewelry items are not
// season-filtered at all (handled at the pool callsite).
const SUMMER_HINTS = /(linen|seersucker|cotton voile|tank|sleeveless|short[s]?(?!\s*sleeve)|sundress|swim|sandal|slide|espadrille|raffia|eyelet|terry|camisole|bandeau|crochet|mini|halter|mesh|jersey tee)/i;
const WINTER_HINTS = /(wool|cashmere|merino|knit|sweater|turtleneck|parka|puffer|down|fur|shearling|sherpa|fleece|thermal|scarf|glove|beanie|tweed|corduroy|flannel|cable knit|chunky|teddy|quilted)/i;
// Light layers + transitional fabrics read primarily Spring + Fall.
const TRANSITIONAL_HINTS = /(trench|cardigan|denim jacket|light blazer|button-down|oxford shirt|raincoat|windbreaker|chambray|ankle boot|loafer)/i;
type SeasonTag = "Spring" | "Summer" | "Autumn" | "Winter";
const EVERY_SEASON: SeasonTag[] = ["Spring", "Summer", "Autumn", "Winter"];
function inferItemSeasons(item: CatalogItem): SeasonTag[] {
  // Accessories / bags / jewelry are season-neutral by design.
  if (item.category === "accessories" || item.category === "bag" || item.category === "jewelry") {
    return EVERY_SEASON;
  }
  const n = item.name;
  const isSummer = SUMMER_HINTS.test(n);
  const isWinter = WINTER_HINTS.test(n);
  const isTransitional = TRANSITIONAL_HINTS.test(n);
  // Mixed signal (e.g. "wool tank") → trust both signals and allow all
  // four seasons so the engine can use the item flexibly.
  if (isSummer && isWinter) return EVERY_SEASON;
  if (isSummer) return ["Spring", "Summer"];
  if (isWinter) return ["Autumn", "Winter"];
  if (isTransitional) return ["Spring", "Autumn"];
  return EVERY_SEASON;
}
function matchesSeason(item: CatalogItem, season: string): boolean {
  if (!season || season === "All Season") return true;
  return inferItemSeasons(item).includes(season as SeasonTag);
}

// ─── Outfit completeness contract ────────────────────────────────────────────
// Single source of truth for "is this a complete, wearable outfit?" — enforced
// identically by generateLooks (rule-based) and generateLookFromAIPlan (AI).
// Rules (per the product spec):
//   • Men / unisex: 1 top + 1 bottom + 1 shoes  (outerwear optional, bag recommended)
//   • Women:        (1 dress  OR  1 top + 1 bottom) + 1 shoes + 1 bag
//     — the handbag is REQUIRED for women; a women's look without a coordinating
//       bag is treated as a partial outfit and dropped.
// No partial outfits ever reach the grid: every look-builder runs this gate as
// its final check, and an unsatisfiable catalog (e.g. a thinly-stocked brand-
// lock that has no bag) legitimately yields fewer/zero looks — the honest
// empty-state, not a half-assembled card.
function isCompleteOutfit(
  pieces: ReadonlyArray<{ category: string }>,
  genderKey: string,
  opts?: { requireBag?: boolean },
): boolean {
  const requireBag = opts?.requireBag ?? true;
  const has = (c: string) => pieces.some((p) => p.category === c);
  if (!has("shoes")) return false;
  const hasCoreClothes = has("dress") || (has("top") && has("bottom"));
  if (!hasCoreClothes) return false;
  // Women normally need a coordinating handbag to count as complete. The TV
  // Inspiration flow relaxes this (requireBag=false): a TV look is complete at
  // top+bottom+shoes (or dress+shoes), no bag needed.
  if (genderKey === "women" && requireBag) return has("bag");
  return true;
}

// ─── Men's bag styling rule ──────────────────────────────────────────────────
// A tote reads as a women's / utility carry, so it must never complete a men's
// look. Per the styling spec, a men's outfit may only carry a structured
// masculine bag: a backpack, a crossbody (incl. sling / messenger), a briefcase,
// or a duffel (incl. holdall / weekender). Any "bag"-category item that doesn't
// match one of those silhouettes (totes, pouches, market bags, mis-tagged feed
// rows, etc.) is excluded from men's looks. Women's and unisex looks are
// unaffected. Bags are RECOMMENDED (optional) for men, so over-filtering simply
// yields a bag-less — but still complete — men's outfit, never a partial one.
const MENS_BAG_DENY = /\btote\b|market\s*bag|shopper/i;
const MENS_BAG_ALLOW =
  /backpack|rucksack|cross[\s-]?body|sling|messenger|brief\s*case|briefcase|attach[eé]|portfolio|duffel|duffle|holdall|weekender/i;

function isBagAppropriateForGender(
  item: { name?: string; category?: string },
  genderKey: string,
): boolean {
  if (item.category !== "bag") return true; // rule only applies to bags
  if (genderKey !== "men") return true; // only constrains men's looks
  const name = (item.name ?? "").toLowerCase();
  if (MENS_BAG_DENY.test(name)) return false; // explicit: no totes for men
  return MENS_BAG_ALLOW.test(name); // whitelist masculine silhouettes only
}

export function generateLooks(params: GenerateParams): Look[] {
  const { gender, occasion, budget, prompt = "", favoriteStyles = [], count = 6, celebSignatureBrands = [], celebName, season, tvInspiration = false } = params;
  const brandLock = params.brandLock ? (BRAND_LOCK_ALIASES[params.brandLock] ?? params.brandLock) : undefined;
  const { max: budgetMax } = parseBudget(budget);
  const genderKey = gender.toLowerCase() as "women" | "men" | "unisex";

  // Allowed occasions for filtering
  const allowedOccasions = OCCASION_MAP[occasion] ?? [occasion, "Casual"];

  // Style priorities: user's favorites first, then occasion defaults
  const occasionStyles = OCCASION_STYLES[occasion] ?? OCCASION_STYLES["Casual"];
  // Prompt-derived trend bias. The TRENDS catalog names (e.g. "Old Money",
  // "Y2K Revival") line up 1:1 with style keys used throughout the engine,
  // so when the user's prompt mentions a trend by name — either typed
  // manually OR auto-pre-filled by the explore-TRENDS → /style hand-off
  // (batch 51) — we surface that style as a HIGH-priority bias.
  //
  // Bias mechanism: prepend the matched trend styles to stylePool ×4 so
  // the uniform `pick(stylePool)` call below resolves to them ~4x more
  // often than baseline. We intentionally do NOT filter by occasion here
  // (unlike favoriteStyles) — the user expressing a trend is a stronger
  // signal than the occasion default; if they tapped "Old Money" they
  // want Old Money pieces even at a Casual occasion.
  const promptLower = prompt.toLowerCase();
  const promptTrendStyles = prompt.trim().length
    ? TRENDS.map((t) => t.name).filter((n) => promptLower.includes(n.toLowerCase()))
    : [];
  const stylePool = [
    ...promptTrendStyles, ...promptTrendStyles, ...promptTrendStyles, ...promptTrendStyles,
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

  const looks: Look[] = [];

  // ── Tiered generation ──────────────────────────────────────────────────────
  // To guarantee a non-empty result regardless of how restrictive the user's
  // budget / occasion / gender filters are, we run the same generator with
  // progressively relaxed constraints until we collect `count` looks. Pass 1
  // honors all filters (ideal). Each subsequent pass loosens one more filter
  // so we ALWAYS return at least one look.
  type PassOpts = {
    useBudget: boolean;
    useOccasion: boolean;
    useGender: boolean;
  };

  // Per-batch dedup tracker — Formal Remix only. The user's hard rule
  // is that every curated look surface a different sneaker, different
  // designer, and different clothing piece (men, women, unisex alike).
  // The global fingerprint dedup only blocks identical full outfits, so
  // two looks could legitimately share a shoe or brand and still pass —
  // that's what produced the "same sneakers / same designer in every
  // card" complaint. Sets live at generateLooks scope (NOT inside
  // runPass) so they persist across tiered passes: when pass 1 yields
  // 2 looks under tight filters and pass 2 fills in the remaining 4,
  // pass 2 still sees what pass 1 already used and avoids repeats.
  // Relaxation policy in `filterByUnique` keeps the batch from starving
  // when supply is genuinely exhausted.
  const enforceUniquePerLook = occasion === "Formal Remix" || tvInspiration;
  const usedShoeIds = new Set<string>();
  const usedShoeBrands = new Set<string>();
  const usedPrimaryIds = new Set<string>();    // top OR dress
  const usedPrimaryBrands = new Set<string>(); // top OR dress brand
  const usedBottomIds = new Set<string>();
  const filterByUnique = <T extends CatalogItem>(
    pool_: T[],
    ids: Set<string>,
    brands?: Set<string>,
  ): T[] => {
    if (!enforceUniquePerLook) return pool_;
    const strict = pool_.filter(
      (i) => !ids.has(i.id) && (!brands || !brands.has(i.brand)),
    );
    if (strict.length > 0) return strict;
    // Brand pool exhausted (≥N looks committed where N = unique brands
    // available). Relax brand uniqueness but keep id uniqueness so the
    // exact same item never repeats.
    const idOnly = pool_.filter((i) => !ids.has(i.id));
    if (idOnly.length > 0) return idOnly;
    // TV Inspiration: never reuse an item id — return empty so the attempt
    // fails honestly (fewer looks) rather than surfacing a duplicate. Formal
    // Remix keeps the relaxed fallback (it only needs whole-outfit uniqueness).
    return tvInspiration ? idOnly : pool_;
  };
  // TV Inspiration full-batch dedup for AUXILIARY categories (outerwear / bag /
  // accessories / jewelry). Core clothing + shoes are already reserved via
  // filterByUnique when enforceUniquePerLook is on; this extends "no duplicates
  // in any gender" to the optional pieces so no catalog item repeats anywhere
  // across the TV grid. No-op outside the TV flow; strict inside it (a starved
  // slot is skipped, never filled with a duplicate).
  const usedAuxIds = new Set<string>();
  const filterAux = <T extends CatalogItem>(pool_: T[]): T[] => {
    if (!tvInspiration) return pool_;
    // Strict: never reuse an item already placed in a sibling look. Every aux
    // category is optional, so an emptied pool simply skips that slot — it can
    // never block a complete core look.
    return pool_.filter((i) => !usedAuxIds.has(i.id));
  };

  function runPass(opts: PassOpts): void {
    const { useBudget, useOccasion, useGender } = opts;
    // Effective budget cap — Infinity disables every per-piece price gate.
    const cap = useBudget ? budgetMax : Infinity;

    function matchesBudget(item: CatalogItem): boolean {
      if (!useBudget) return true;
      return item.price <= budgetMax * 0.8;
    }
    function matchesGenderLocal(item: CatalogItem): boolean {
      // HARD RULE: never wrong-gender model. Even when this pass relaxes
      // gender (the deepest tier 4 fallback), brand-locked sessions MUST
      // keep gender enforced — otherwise "ONLY {BRAND}" + Men can leak a
      // women's-only piece from that brand into the look, which violates
      // the no-wrong-gender promise the chip makes and bypasses the new
      // "{brand} is gender-specific" empty-state explanation.
      if (!useGender && !brandLock) return true;
      return matchesGender(item);
    }
    function matchesOccasionLocal(item: CatalogItem): boolean {
      if (!useOccasion) return true;
      // Formal Remix bypass for sneakers: the entire identity of this
      // occasion is "dressy clothes + statement sneakers", but almost
      // no sneakers in catalog carry Formal/Event/Evening/Party tags —
      // they're tagged Casual/Streetwear. Without this bypass the
      // sneaker pool collapses to 1-2 items and every generated look
      // shows the same shoe. Open the gate to the entire sneaker
      // catalog for this occasion only; clothing items still respect
      // the Formal/Event/Evening/Party filter so the formality of the
      // outfit base is preserved.
      if (
        occasion === "Formal Remix" &&
        item.category === "shoes" &&
        inferShoeType(item) === "sneakers"
      ) {
        return true;
      }
      return matchesOccasion(item);
    }

    function pool(cat: CatalogItem["category"]): CatalogItem[] {
      const base = CATALOG.filter(
        (item) =>
          item.category === cat &&
          matchesGenderLocal(item) &&
          matchesOccasionLocal(item) &&
          matchesBudget(item) &&
          // Brand lock (batch 83): when set, ONLY items from this exact
          // brand survive into the pool. Applied at every relaxed tier so
          // no cross-brand pollution can leak through even if budget,
          // occasion, or gender are loosened.
          (!brandLock || item.brand === brandLock)
      );
      // Season filter (HARDENED): when the user picks a specific season,
      // every clothing/outerwear/shoe item MUST be season-appropriate. No
      // <3-item bypass — wool cashmere never lands in a Summer look, linen
      // sundresses never land in a Winter look. Accessories/bag/jewelry
      // already return EVERY_SEASON from inferItemSeasons so they pass
      // through year-round. If the seasonal pool genuinely starves, the
      // look slot is dropped rather than ship an off-season piece — the
      // tiered passes and empty-state UI surface the gap honestly.
      // "All Season" / undefined skip the filter (user opted out).
      if (season && season !== "All Season") {
        return base.filter((item) => matchesSeason(item, season));
      }
      return base;
    }

    const tops = pool("top");
    const bottoms = pool("bottom");
    const dresses = pool("dress");
    const outerwear = pool("outerwear");
    const shoes = pool("shoes");
    const bags = pool("bag");
    const accessories = pool("accessories");
    const jewelry = pool("jewelry");

    let attempts = 0;
    const maxAttempts = 200;

    while (looks.length < count && attempts < maxAttempts) {
    attempts++;

    // Pick a dominant style and color palette for this look
    const dominantStyle = pick(stylePool.length > 0 ? stylePool : occasionStyles);
    const selectedPalette = pickPaletteForStyle(dominantStyle);

    // Anchor THIS look's formality so the clothing pieces coordinate.
    // Without this, a Date Night look can pick "Vintage Gel Logo T-Shirt"
    // (casual) + "Satin-Stripe Tuxedo Trousers" (dress) + Oxford (dress)
    // because each pool is filtered independently and nothing checks
    // whether the pieces visually agree. Formal Remix returns null and
    // therefore skips this filter — it is intentionally mixed.
    const lookFormality = targetLookFormality(occasion, dominantStyle);
    const okFormalities: Formality[] | null = lookFormality
      ? compatibleFormalities(lookFormality)
      : null;
    const filterByFormality = <T extends CatalogItem>(pool_: T[]): T[] => {
      if (!okFormalities) return pool_;
      const matched = pool_.filter((i) =>
        okFormalities.includes(
          inferPieceFormality({ name: i.name, category: i.category, shoeType: i.shoeType }),
        ),
      );
      // Graceful fallback: if the formality filter would empty the pool
      // (e.g. tiny brand-locked catalog with only off-formality pieces),
      // return the original pool so we still produce a look. The shoe
      // coherence layer downstream will at least keep the shoes sane.
      return matched.length > 0 ? matched : pool_;
    };
    // Editorial brand bias — when the dominant style has curated signature
    // houses (see STYLE_SIGNATURE_BRANDS), prefer pieces from those houses so
    // the shop panel actually reflects the "SIGNATURE HOUSES" label shown on
    // the look detail. Empty for styles without a curated list (e.g. celeb-
    // unique styles), which makes the bias a no-op for those.
    // Celebrity bias takes precedence: when the user tapped "GENERATE MY <CELEB>
    // LOOK", the celeb's own signatureBrands lead the union so the picker
    // prefers those over the generic style houses. Both layers fall through
    // to the legacy ranker if no catalog item matches.
    const sigBrandList = getSignatureBrands(dominantStyle, 8);
    const sigBrands = new Set<string>([...celebSignatureBrands, ...sigBrandList]);

    // Decide outfit structure
    const useDress =
      genderKey === "women" &&
      dresses.length > 0 &&
      Math.random() > 0.5;

    const pieces: OutfitPiece[] = [];
    let total = 0;

    // Helper: pick style + palette-preferring item from a pool
    // Shoe-aware picker: first try to narrow the pool to shoes whose (explicit
     // or inferred) shoeType matches the occasion's preferred sub-types, then
     // run the normal style/palette ranker on that narrowed pool. If nothing
     // matches, fall back to the full pool so we never fail to place a shoe.
    const shoeTypePrefs = preferredShoeTypes(occasion);
    const pickShoe = (pool_: CatalogItem[]): CatalogItem | null => {
      if (pool_.length === 0) return null;
      // Outfit-coherent prefs: re-derive shoe types from the pieces ALREADY
      // added (top+bottom or dress) so the shoe matches the outfit's
      // formality, not just the occasion's nominal preference. This is what
      // prevents jeans+tee → dress oxford, or tuxedo → graphic sneaker.
      const coherentPrefs = coherentShoeTypes(pieces, shoeTypePrefs, occasion);
      const preferred = pool_.filter((s) => {
        const t = inferShoeType(s);
        return t ? coherentPrefs.includes(t) : false;
      });
      // HARD LOCK for Formal Remix: the entire identity of this occasion is
      // tux/gown + sneakers. If no sneaker survives the filter (catalog gap
      // or brand-lock restriction), return null instead of falling back to
      // the full shoe pool — that fallback was producing oxfords under a
      // tuxedo, defeating the whole point. The outer generator drops the
      // look and the tiered passes / brand-lock empty-state surface the
      // gap honestly.
      if (occasion === "Formal Remix") {
        return preferred.length > 0 ? stylePick(preferred) : null;
      }
      return stylePick(preferred.length > 0 ? preferred : pool_);
    };

    const stylePick = (pool_: CatalogItem[]): CatalogItem | null => {
      if (pool_.length === 0) return null;

      // ─── Editorial bypass ─────────────────────────────────────────────────
      // Avant-garde + Formal Remix are intentionally cross-vibe. The 5 styling
      // rules below would flatten exactly what makes those looks editorial,
      // so we let those bypass color/texture/silhouette caps. Luxury and
      // streetwear category rules still apply (they're about coherence within
      // a slot, not editorial freedom).
      const editorial = occasion === "Formal Remix" || dominantStyle === "Avant-garde";
      const category = pool_[0].category;

      // Soft-narrow helper: apply a filter and accept it only when it leaves
      // something behind. This is what prevents the rules from ever starving
      // a slot — if no item in the pool can satisfy a rule, we keep the
      // wider pool and let later tiers handle it.
      const narrow = (f: (arr: CatalogItem[]) => CatalogItem[]) => {
        const next = f(pool_);
        if (next.length > 0) pool_ = next;
      };

      // ─── Rule 1: Color — ≤3 dominant colors unless editorial ──────────────
      // Once 3 distinct color buckets are placed, restrict new picks to
      // items that share one of those buckets. Otherwise an outfit can drift
      // into 5+ colors which always reads chaotic, never editorial.
      if (!editorial && pieces.length > 0) {
        const used = new Set(pieces.map((p) => p.color.toLowerCase()));
        if (used.size >= 3) {
          narrow((arr) =>
            arr.filter((i) =>
              i.colors.some((c) => {
                const lc = c.toLowerCase();
                for (const u of used) {
                  if (lc.includes(u) || u.includes(lc)) return true;
                }
                return false;
              }),
            ),
          );
        }
      }

      // ─── Rule 2: Texture — complement, not compete ────────────────────────
      // "Loud" surface treatments (sequin, velvet, lace, etc.) read as the
      // hero of any look. Cap at 1 per outfit so we don't pile sequin top +
      // velvet jacket + lace skirt on the same body.
      if (!editorial) {
        const LOUD_TEX = /(sequin|velvet|lace|fur|croc|snake|metallic|brocade|jacquard|feather|sherpa|shearling)/i;
        const loudCount = pieces.filter((p) => LOUD_TEX.test(p.name)).length;
        if (loudCount >= 1) {
          narrow((arr) => arr.filter((i) => !LOUD_TEX.test(i.name)));
        }
      }

      // ─── Rule 3: Silhouette — balance oversized with fitted ───────────────
      // Outfits with everything oversized look sloppy; everything fitted
      // looks costumey. Once 2 pieces lean one direction with nothing
      // counter-balancing, push the next pick toward the opposite.
      if (!editorial && pieces.length >= 2) {
        const OVERSIZED = /(oversized|baggy|loose|wide|relaxed|drop[- ]shoulder|boxy|slouchy|chunky)/i;
        const FITTED = /(fitted|slim|skinny|tailored|cropped|bodysuit|bandeau|corset|bias[- ]cut|ribbed)/i;
        const ov = pieces.filter((p) => OVERSIZED.test(p.name)).length;
        const ft = pieces.filter((p) => FITTED.test(p.name)).length;
        if (ov >= 2 && ft === 0) {
          narrow((arr) => arr.filter((i) => !OVERSIZED.test(i.name)));
        } else if (ft >= 2 && ov === 0) {
          narrow((arr) => arr.filter((i) => !FITTED.test(i.name)));
        }
      }

      // ─── Rule 4: Luxury — accessories elevate, never overpower ────────────
      // Cap accessory-class spend (bag + jewelry + accessories) at 50% of
      // already-placed clothing total. Prevents a $4k handbag dominating a
      // $1k outfit. Applies only when the clothing has already been placed
      // (i.e. category being picked is in the accessory family).
      if (
        (category === "accessories" || category === "jewelry" || category === "bag") &&
        pieces.length > 0
      ) {
        // Cap is 50% of CLOTHING-only total, not all-pieces total — otherwise
        // each accessory we add raises its own cap and the rule never bites.
        const isAccCat = (c: string) =>
          c === "accessories" || c === "jewelry" || c === "bag";
        const clothingTotal = pieces
          .filter((p) => !isAccCat(p.category))
          .reduce((s, p) => s + p.price, 0);
        const accAlready = pieces
          .filter((p) => isAccCat(p.category))
          .reduce((s, p) => s + p.price, 0);
        const remaining = clothingTotal * 0.5 - accAlready;
        if (clothingTotal > 0 && remaining > 0) {
          narrow((arr) => arr.filter((i) => i.price <= remaining));
        } else if (clothingTotal > 0) {
          // Already at/over the cap — restrict to the cheapest quartile so
          // any additional accessory is a whisper, not a shout.
          const sorted = [...pool_].sort((a, b) => a.price - b.price);
          const keep = sorted.slice(0, Math.max(1, Math.ceil(sorted.length * 0.25)));
          if (keep.length > 0) pool_ = keep;
        }
      }

      // ─── Rule 5: Streetwear — shoes/jewelry/outerwear reinforce vibe ──────
      // When the look's dominant style is in the street family (Luxury
      // Streetwear / Streetwear / Y2K Revival / Techwear), the signal
      // categories MUST stay in the street family. An Old Money loafer
      // under a Balenciaga hoodie kills the vibe instantly.
      if (
        familyOf(dominantStyle) === "street" &&
        (category === "shoes" || category === "jewelry" || category === "outerwear")
      ) {
        narrow((arr) => arr.filter((i) => i.styles.some((s) => familyOf(s) === "street")));
      }

      // Continuity bias — once we've placed the first piece, prefer items
      // that share a style tag AND a palette color with what's already in
      // the look. This is what stops the engine from following a Loro Piana
      // cashmere top with a Versace neon belt: both might score "ok" on
      // the dominant style, but they don't speak the same visual language.
      // Skipped for Formal Remix because cross-vibe is its identity.
      if (pieces.length > 0 && occasion !== "Formal Remix") {
        const placedStyles = new Set(pieces.flatMap((p) => {
          const src = CATALOG.find((c) => c.id === p.id);
          return src ? src.styles : [];
        }));
        const placedColors = pieces.map((p) => p.color.toLowerCase());
        const continuity = pool_.filter((i) => {
          const styleShared = i.styles.some((s) => placedStyles.has(s));
          const colorShared = i.colors.some((c) =>
            placedColors.some((pc) => c.toLowerCase().includes(pc) || pc.includes(c.toLowerCase())),
          );
          return styleShared && colorShared;
        });
        // Preserve signature-brand bias INSIDE continuity: when curated
        // houses exist for this style, prefer the continuity ∩ sig subset
        // first so we don't trade signature attribution for color/style
        // continuity. Only fall to generic continuity if no sig piece fits.
        if (continuity.length > 0) {
          if (sigBrands.size > 0) {
            const sigContinuity = continuity.filter((i) => sigBrands.has(i.brand));
            if (sigContinuity.length > 0) return pick(sigContinuity);
          }
          return pick(continuity);
        }
      }

      // Signature-brand-biased tiers run FIRST when the style has curated
      // houses. Falls through to the legacy tiers if no signature item exists
      // in the pool — guarantees we never fail to place a piece just because
      // (e.g.) the catalog has no shoes from any of the 5 signature houses.
      if (sigBrands.size > 0) {
        const sigPool = pool_.filter((i) => sigBrands.has(i.brand));
        if (sigPool.length > 0) {
          // Best of best: signature house + dominant style + palette
          const sigPerfect = sigPool.filter(
            (i) => i.styles.includes(dominantStyle) && paletteMatch(i.colors, selectedPalette.colors)
          );
          if (sigPerfect.length > 0) return pick(sigPerfect);
          // Signature house + dominant style
          const sigStyle = sigPool.filter((i) => i.styles.includes(dominantStyle));
          if (sigStyle.length > 0) return pick(sigStyle);
        }
      }
      // Best: matches dominant style AND color palette
      const perfect = pool_.filter(
        (i) => i.styles.includes(dominantStyle) && paletteMatch(i.colors, selectedPalette.colors)
      );
      if (perfect.length > 0) return pick(perfect);
      // Good: matches dominant style
      const styleMatch = pool_.filter((i) => i.styles.includes(dominantStyle));
      if (styleMatch.length > 0) return pick(styleMatch);
      // Family match + palette — pieces from the same aesthetic family as
      // the dominant style that also harmonize on color. This is the new
      // safety net that replaces the old "anything in pool" final tier
      // for the common case where the exact style isn't available.
      const familyAndPalette = pool_.filter(
        (i) => itemSharesFamily(i, dominantStyle) && paletteMatch(i.colors, selectedPalette.colors)
      );
      if (familyAndPalette.length > 0) return pick(familyAndPalette);
      // Family match alone (still better than cross-family)
      const familyOnly = pool_.filter((i) => itemSharesFamily(i, dominantStyle));
      if (familyOnly.length > 0) return pick(familyOnly);
      // OK: matches palette only — at least the colors won't fight
      const paletteOnly = pool_.filter((i) => paletteMatch(i.colors, selectedPalette.colors));
      if (paletteOnly.length > 0) return pick(paletteOnly);
      // ─── Style-DNA floor ──────────────────────────────────────────────────
      // Everything above tries hard to honor the dominant style + family +
      // palette. If we got here, the pool has nothing matching even the
      // family or palette — only true cross-vibe items remain. To keep the
      // generated look faithful to the selected style DNA, we split here:
      //  • Essential categories (top/bottom/dress/shoes) STILL fall through
      //    so we don't end up with a broken card missing a core piece.
      //  • Editorial occasions (Avant-garde / Formal Remix) also fall
      //    through — cross-vibe IS their DNA.
      //  • Everything else (bag, jewelry, outerwear, accessories) returns
      //    null — better to drop a slot than land an off-DNA piece. The
      //    outer loop already handles missing optional slots gracefully.
      const isEssential =
        category === "top" || category === "bottom" || category === "dress" || category === "shoes";
      if (editorial) return pick(pool_);
      if (isEssential) {
        // Essential fallback — we can't return null here (would produce a
        // broken card). But "anything in pool" is exactly what produces
        // unrelated items in a look. So instead of random-picking, rank
        // every remaining candidate by how MUCH it relates to what's
        // already on the body, and pick from the top-scored bucket.
        // This is the rule's enforcement at the floor: even when forced
        // to compromise, we pick the LEAST-unrelated item available.
        const placedStyles = new Set(pieces.flatMap((p) => {
          const src = CATALOG.find((c) => c.id === p.id);
          return src ? src.styles : [];
        }));
        const placedColors = pieces.map((p) => p.color.toLowerCase());
        const scoreRelatedness = (i: CatalogItem): number => {
          let s = 0;
          // Family alignment with the dominant style — biggest signal that
          // the piece belongs to the same visual conversation.
          if (itemSharesFamily(i, dominantStyle)) s += 4;
          // Shared style tag with already-placed pieces — direct continuity.
          s += i.styles.filter((st) => placedStyles.has(st)).length * 3;
          // Palette overlap with the look's selected palette.
          if (paletteMatch(i.colors, selectedPalette.colors)) s += 2;
          // Color continuity with what's literally on the body already.
          if (
            i.colors.some((c) =>
              placedColors.some((pc) => c.toLowerCase().includes(pc) || pc.includes(c.toLowerCase())),
            )
          ) s += 2;
          // Signature brand bonus when curated houses exist for this style.
          if (sigBrands.has(i.brand)) s += 1;
          return s;
        };
        const scored = pool_.map((i) => ({ i, s: scoreRelatedness(i) }));
        const max = Math.max(...scored.map((x) => x.s));
        const top = scored.filter((x) => x.s === max).map((x) => x.i);
        return pick(top);
      }
      return null;
    };

    const addPiece = (item: CatalogItem) => {
      pieces.push({
        id: item.id,
        name: item.name,
        brand: item.brand,
        price: item.price,
        category: item.category,
        color: pickPaletteColor(item.colors, selectedPalette.colors),
        // Prefer real product photo / PDP link when the catalog item has been
        // enriched with verified retailer data; otherwise fall back to the
        // category-matched placeholder pool and a brand-site search URL.
        imageUrl: item.productImageUrl ?? getPieceImage(item.category, item.id),
        localImage: item.localProductImage,
        purchaseUrl: item.directProductUrl ?? buildPurchaseUrl(item),
        // Mark when this piece's brand is part of the active signature set
        // (style sig houses ∪ celeb sig brands). The shop panel renders a
        // small "★ SIGNATURE" chip on these so users see WHY the engine
        // pulled this specific house. Source-of-truth attribution — no
        // brittle display-time string matching.
        signature: sigBrands.has(item.brand),
      });
      total += item.price;
    };

    if (useDress) {
      // Structure: dress + shoes + (optional bag) + (optional jewelry)
      const dressPool = filterByUnique(
        filterByFormality(dresses.filter((d) => d.price <= cap * 0.7)),
        usedPrimaryIds,
        usedPrimaryBrands,
      );
      const dress = stylePick(dressPool);
      if (!dress) continue;
      addPiece(dress);

      const affordableShoes = shoes.filter((s) => s.price + total <= cap * 0.9);
      const shoePool = filterByUnique(affordableShoes, usedShoeIds, usedShoeBrands);
      const shoe = pickShoe(shoePool);
      if (!shoe) continue;
      addPiece(shoe);

      // Handbag — REQUIRED for women (dress branch only runs for women), EXCEPT
      // in the TV Inspiration flow where a dress + shoes is already a complete
      // look and a bag is optional. Outside TV, drop the look when no in-budget
      // bag fits (a dress + shoes with no coordinating bag is a partial outfit).
      const affordableBags = filterAux(bags.filter((b) => b.price + total <= cap));
      const bag = stylePick(affordableBags);
      if (bag) addPiece(bag);
      else if (!tvInspiration) continue;

      // Optional jewelry
      if (total < cap * 0.9 && jewelry.length > 0) {
        const affordableJewels = filterAux(jewelry.filter((j) => j.price + total <= cap));
        const jewel = stylePick(affordableJewels);
        if (jewel) addPiece(jewel);
      }
    } else {
      // Structure: top + bottom + shoes + (optional outerwear) + (optional bag/accessory)
      const topPool = filterByUnique(
        filterByFormality(tops.filter((t) => t.price <= cap * 0.5)),
        usedPrimaryIds,
        usedPrimaryBrands,
      );
      const top = stylePick(topPool);
      if (!top) continue;
      addPiece(top);

      // Bottom: in addition to the look-level formality anchor, also
      // narrow to bottoms whose formality matches the TOP we just
      // picked. Top is the visual anchor of the upper half, so once
      // we commit to (e.g.) a graphic tee, a tuxedo trouser is off the
      // table even if both are "smart-compatible" in the global anchor.
      const topFormality = inferPieceFormality({
        name: top.name, category: top.category, shoeType: top.shoeType,
      });
      const bottomAllowedFromTop: Formality[] =
        topFormality === "casual" ? ["casual", "smart"]
        : topFormality === "dress" ? ["dress", "smart"]
        : ["smart", "dress"];
      // Intersect with the look anchor so a casual-anchored look with a
      // smart top can't still pick a dress bottom. Top-compat AND
      // anchor-compat must both hold for the strictest pool.
      const bottomAllowed: Formality[] = okFormalities
        ? bottomAllowedFromTop.filter((f) => okFormalities.includes(f))
        : bottomAllowedFromTop;
      const affordableBottoms = bottoms.filter((b) => b.price + total <= cap * 0.7);
      const bottomFormalityFiltered = okFormalities
        ? affordableBottoms.filter((b) =>
            bottomAllowed.includes(
              inferPieceFormality({ name: b.name, category: b.category, shoeType: b.shoeType }),
            ),
          )
        : affordableBottoms;
      // Two-stage fallback: if strict (top+anchor) intersection empties
      // the pool, relax to anchor-only (filterByFormality), then to the
      // raw affordable pool — never starve generation entirely.
      const bottomBase = bottomFormalityFiltered.length > 0
        ? bottomFormalityFiltered
        : (okFormalities ? filterByFormality(affordableBottoms) : affordableBottoms);
      const bottomPool = filterByUnique(bottomBase, usedBottomIds);
      const bottom = stylePick(bottomPool);
      if (!bottom) continue;
      addPiece(bottom);

      const affordableShoes = shoes.filter((s) => s.price + total <= cap * 0.85);
      const shoePool = filterByUnique(affordableShoes, usedShoeIds, usedShoeBrands);
      const shoe = pickShoe(shoePool);
      if (!shoe) continue;
      addPiece(shoe);

      // Optional outerwear (50% chance, or if budget has room)
      if (outerwear.length > 0 && total < cap * 0.6 && Math.random() > 0.5) {
        const affordableOuter = filterAux(filterByFormality(
          outerwear.filter((o) => o.price + total <= cap * 0.95),
        ));
        const outer = stylePick(affordableOuter);
        if (outer) addPiece(outer);
      }

      if (genderKey === "women") {
        // Handbag — REQUIRED for women per the completeness contract, EXCEPT in
        // the TV Inspiration flow where top+bottom+shoes is already a complete
        // look and a bag is optional. Outside TV, drop the look when no in-budget
        // bag can complete it rather than show a bagless women's outfit.
        const affordableBags = filterAux(bags.filter((b) => b.price + total <= cap));
        const bag = stylePick(affordableBags);
        if (bag) addPiece(bag);
        else if (!tvInspiration) continue;
      } else {
        // Men / unisex: a bag is RECOMMENDED, not required. Prefer a real bag
        // (backpack, crossbody, briefcase, duffel — NEVER a tote for men) when
        // the budget has room, falling back to a smaller accessory. Never blocks
        // the look from completing.
        if (total < cap * 0.85) {
          const eligibleBags = bags.filter((b) => isBagAppropriateForGender(b, genderKey));
          const extrasPool = eligibleBags.length > 0 ? eligibleBags : accessories;
          const affordableExtras = filterAux(extrasPool.filter((e) => e.price + total <= cap));
          const extra = stylePick(affordableExtras);
          if (extra) addPiece(extra);
        }
      }
    }

    // Completeness gate — no partial outfits ever reach the grid. Men/unisex
    // need top+bottom+shoes; women need (dress | top+bottom)+shoes+bag — except
    // in the TV Inspiration flow, where the bag requirement is relaxed.
    if (!isCompleteOutfit(pieces, genderKey, { requireBag: !tvInspiration })) continue;

    // Dedup check — fingerprint by sorted item ids
    const fp = fingerprint(pieces.map((p) => p.id));
    if (_shownFingerprints.has(fp)) continue;
    _shownFingerprints.add(fp);

    // Record per-batch unique-piece reservations so the NEXT look in this
    // batch picks a different sneaker, designer, and primary clothing
    // piece. See `filterByUnique` above for the relaxation policy when
    // a pool would otherwise be exhausted.
    if (enforceUniquePerLook) {
      for (const p of pieces) {
        if (p.category === "shoes") {
          usedShoeIds.add(p.id);
          usedShoeBrands.add(p.brand);
        } else if (p.category === "top" || p.category === "dress") {
          usedPrimaryIds.add(p.id);
          usedPrimaryBrands.add(p.brand);
        } else if (p.category === "bottom") {
          usedBottomIds.add(p.id);
        }
      }
    }
    // TV Inspiration: extend dedup to the auxiliary categories so NO catalog
    // item repeats anywhere across the grid, for any gender. Core clothing +
    // shoes are already reserved above; usedAuxIds catches outerwear / bag /
    // accessories / jewelry via filterAux on the next look.
    if (tvInspiration) {
      for (const p of pieces) usedAuxIds.add(p.id);
    }

    // Build the Look — use fp as image seed so each unique outfit gets a unique, consistent photo
    const lookName = generateLookName(occasion, dominantStyle);
    const lookDesc = generateDescription(occasion, dominantStyle);
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
      season: (season && season !== "All Season") ? season : pickSeasonForStyle(dominantStyle),
      estimatedPrice: total,
      image: getLookImage(dominantStyle, fp, genderKey, lookName),
      gender: genderKey,
      pieces,
      style: dominantStyle,
      tags,
      // Expose the palette we composed pieces around so the look-detail page
      // can render it alongside style/season — completing the visible trifecta.
      colorPalette: selectedPalette.name,
      // Celebrity attribution — undefined for regular generations.
      inspiredBy: celebName,
    });
    }
  }

  // Pass 1: honor every filter the user set (ideal match).
  runPass({ useBudget: true,  useOccasion: true,  useGender: true  });
  // Pass 2: short on looks? Relax occasion/style to fill the grid, but KEEP
  // the budget cap + gender. Budget is a HARD product rule — the TOTAL of
  // every displayed look must stay within the user's selected budget, so we
  // would rather show fewer looks than ever surface an over-budget outfit.
  // (Previously Pass 2/3 dropped the price cap to always fill `count`, which
  // is exactly what produced over-budget looks on the budget page.)
  if (looks.length < count) runPass({ useBudget: true, useOccasion: false, useGender: true });
  // NOTE (batch 97): gender is a HARD product rule — "never wrong-gender
  // model, never a women's-only piece in a men's look". Previous tiers 4 + 5
  // disabled the gender filter as a last-ditch "always return something"
  // safety net, which produced the bug where a Men's request surfaced a
  // Valentino Haute Couture Column Gown + Bulgari Diamond Drop Earrings.
  // Gender is now enforced at EVERY tier. If gender + everything else
  // relaxed still yields nothing (only possible for impossibly tiny pools),
  // we'd rather return zero looks and let the empty-state UI explain than
  // ship a wrong-gender card.

  // Dedup-recovery: clear the fingerprint memory and re-run pass 3 (occasion +
  // budget relaxed, gender still ON) in case the only thing blocking us was
  // global dedup memory. Better to show a repeat look than wrong-gender one.
  if (looks.length === 0) {
    _shownFingerprints.clear();
    runPass({ useBudget: true, useOccasion: false, useGender: true });
  }

  // HARD GUARANTEE: if even pass 5 produces nothing (tiny catalog, etc.),
  // hand-assemble a deterministic minimal outfit from whatever the catalog has.
  // Brand-lock (batch 83) is enforced here too — if brandLock is set we MUST
  // NOT pull from full CATALOG, since that would silently introduce cross-
  // brand pieces and violate the "only this designer" promise the chip makes.
  // When brandLock is set and the brand has no items in the required
  // categories, we skip the fallback entirely and return whatever looks
  // were generated (possibly empty) — an honest sparse result beats lying.
  // Brand-lock safety net (batch 90). Guarantee ≥1 look whenever the locked
  // brand has ANY catalog items for the user's gender. Relaxes occasion +
  // price + style constraints, but KEEPS brand and gender locks intact —
  // never wrong-brand, never wrong-gender. This makes the "ONLY {BRAND}"
  // chip a true promise rather than producing an empty Curated Looks page
  // for thinly-stocked houses.
  if (looks.length === 0 && brandLock) {
    // Honor budget here too — per product rule, the ONLY acceptable empty
    // states are (a) brand is gender-specific for the chosen gender, or
    // (b) the cheapest possible outfit exceeds the budget. Both surface
    // their own UI message via getBrandAvailability(); silently pushing
    // an over-budget look would defeat the budget filter the user picked.
    const brandPoolBase = CATALOG.filter(
      (i) =>
        i.brand === brandLock &&
        (i.genders.includes(genderKey) || i.genders.includes("unisex")) &&
        (budgetMax === 0 || i.price <= budgetMax),
    );
    // Season-respect (HARDENED): the brand-lock fallback also obeys the
    // hard season rule. If the user picked a specific season, we ONLY
    // consider seasonal items — even at the deepest brand-lock fallback.
    // If that subset can't assemble an outfit, we ship no fallback rather
    // than violate the no-mixed-season promise. Empty-state UI explains.
    const brandPool = (season && season !== "All Season")
      ? brandPoolBase.filter((i) => matchesSeason(i, season))
      : brandPoolBase;
    const bTop = brandPool.find((i) => i.category === "top");
    const bBottom = brandPool.find((i) => i.category === "bottom");
    // Formal Remix safety-net: brand-lock fallback must respect the sneaker
    // lock too. Without this, a Brioni-only "Formal Remix" look would surface
    // an oxford because Brioni has more dress shoes than sneakers in catalog.
    const bShoe = occasion === "Formal Remix"
      ? brandPool.find((i) => i.category === "shoes" && inferShoeType(i) === "sneakers")
      : brandPool.find((i) => i.category === "shoes");
    const bDress = brandPool.find((i) => i.category === "dress");
    const bBag = brandPool.find((i) => i.category === "bag");
    const bFb: CatalogItem[] = [];
    // Even this last-resort brand-lock safety net must ship a COMPLETE outfit
    // — no partial cards. Assemble a complete core (dress | top+bottom) + shoes,
    // and for women add the coordinating bag (REQUIRED outside the TV flow;
    // optional in TV mode). If the locked brand can't supply a complete outfit
    // for this gender, push nothing and let the honest empty-state explain
    // rather than surface a half-look.
    if (genderKey === "women") {
      if (bDress && bShoe) bFb.push(bDress, bShoe);
      else if (bTop && bBottom && bShoe) bFb.push(bTop, bBottom, bShoe);
      if (bFb.length > 0 && bBag) bFb.push(bBag);
      // Outside the TV flow a women's look needs the coordinating bag, so clear
      // an incomplete core. In TV mode the core alone (dress+shoes or
      // top+bottom+shoes) is already complete — keep it bagless.
      else if (!tvInspiration) bFb.length = 0;
    } else if (bTop && bBottom && bShoe) {
      bFb.push(bTop, bBottom, bShoe);
    }
    if (isCompleteOutfit(bFb, genderKey, { requireBag: !tvInspiration })) {
      const bStyle = pick(occasionStyles);
      const bPalette = pickPaletteForStyle(bStyle);
      const sigSet = new Set(celebSignatureBrands ?? []);
      const bPieces: OutfitPiece[] = bFb.map((item) => ({
        id: item.id,
        name: item.name,
        brand: item.brand,
        price: item.price,
        category: item.category,
        color: pickPaletteColor(item.colors, bPalette.colors),
        imageUrl: item.productImageUrl ?? getPieceImage(item.category, item.id),
        localImage: item.localProductImage,
        purchaseUrl: item.directProductUrl ?? buildPurchaseUrl(item),
        signature: sigSet.has(item.brand),
      }));
      const bTotal = bFb.reduce((s, i) => s + i.price, 0);
      const bFp = fingerprint(bPieces.map((p) => p.id));
      const bName = generateLookName(occasion, bStyle);
      looks.push({
        id: `gen_brandlock_fb_${Date.now()}`,
        name: bName,
        description: generateDescription(occasion, bStyle),
        occasion,
        inspiredBy: celebName,
        season: (season && season !== "All Season") ? season : pickSeasonForStyle(bStyle),
        estimatedPrice: bTotal,
        image: getLookImage(bStyle, bFp, genderKey, bName),
        gender: genderKey,
        pieces: bPieces,
        style: bStyle,
        tags: [occasion.toLowerCase(), bPalette.name.toLowerCase(), bPieces[0].brand.toLowerCase()],
        colorPalette: bPalette.name,
      });
    }
  }

  if (looks.length === 0 && !brandLock) {
    // Ultra-fallback: hand-assemble a deterministic minimal outfit.
    // HARD RULE (batch 97): even this last-resort path must filter by gender.
    // Previously used unfiltered CATALOG.find() which is the second source
    // of the wrong-gender leak — a Men's request with an exotic style could
    // land here and pull the first dress in the catalog (always women's).
    const gPoolBase = CATALOG.filter(
      (i) => i.genders.includes(genderKey) || i.genders.includes("unisex"),
    );
    // Season-respect in ultra-fallback (HARDENED): same rule as brand-lock
    // — strict seasonal subset only. If even the entire-catalog seasonal
    // pool can't assemble a 2-piece, we return the (possibly empty) looks
    // array rather than ship a cross-season fallback.
    const gPool = (season && season !== "All Season")
      ? gPoolBase.filter((i) => matchesSeason(i, season))
      : gPoolBase;
    const anyTop = gPool.find((i) => i.category === "top");
    const anyBottom = gPool.find((i) => i.category === "bottom");
    const anyShoe = gPool.find((i) => i.category === "shoes");
    const anyDress = gPool.find((i) => i.category === "dress");
    const anyBag = gPool.find((i) => i.category === "bag");
    const fallbackItems: CatalogItem[] = [];
    // Ultra-fallback must still be a COMPLETE outfit — never a 2-piece partial.
    // Women need (dress | top+bottom) + shoes + a bag (REQUIRED outside the TV
    // flow; optional in TV mode); men/unisex need top+bottom+shoes. Drawn from
    // the full catalog, so women's bags are available here even though brand-lock
    // above may not have one.
    if (genderKey === "women") {
      if (anyDress && anyShoe) fallbackItems.push(anyDress, anyShoe);
      else if (anyTop && anyBottom && anyShoe) fallbackItems.push(anyTop, anyBottom, anyShoe);
      if (fallbackItems.length > 0 && anyBag) fallbackItems.push(anyBag);
      // TV flow: a women's core (dress+shoes or top+bottom+shoes) is complete
      // without a bag. Outside TV, clear an incomplete/bagless core.
      else if (!tvInspiration) fallbackItems.length = 0;
    } else if (anyTop && anyBottom && anyShoe) {
      fallbackItems.push(anyTop, anyBottom, anyShoe);
    }
    if (isCompleteOutfit(fallbackItems, genderKey, { requireBag: !tvInspiration })) {
      const fallbackStyle = pick(occasionStyles);
      const fallbackPalette = pickPaletteForStyle(fallbackStyle);
      // Ultra-fallback ignores every brand filter, so by construction no
      // piece can be a signature-house item. Stamp signature:false explicitly
      // (rather than leaving it undefined) so downstream consumers — most
      // notably the look detail "★ N OF M PIECES FROM SIGNATURE HOUSES" line
      // — see a deterministic 0/N count instead of undefined-counts-as-zero
      // legacy-fallback behavior. Matches the main path stamp at line 1591.
      const sigBrandsForFallback = new Set(celebSignatureBrands ?? []);
      const pieces: OutfitPiece[] = fallbackItems.map((item) => ({
        id: item.id,
        name: item.name,
        brand: item.brand,
        price: item.price,
        category: item.category,
        color: pickPaletteColor(item.colors, fallbackPalette.colors),
        imageUrl: item.productImageUrl ?? getPieceImage(item.category, item.id),
        localImage: item.localProductImage,
        purchaseUrl: item.directProductUrl ?? buildPurchaseUrl(item),
        // In ultra-fallback we have NO style/brand filtering, but if the
        // catalog happens to surface a signature-house piece we still want
        // it stamped truthfully — keeps the trifecta promise honest even
        // here. When no celeb context, sigBrandsForFallback is empty → false.
        signature: sigBrandsForFallback.has(item.brand),
      }));
      const total = fallbackItems.reduce((s, i) => s + i.price, 0);
      const fp = fingerprint(pieces.map((p) => p.id));
      // Generate the look name ONCE — passing it through to both the visible
      // name and the image seed. Previously this called generateLookName twice,
      // which (a) burned a second name from _shownNames per fallback look and
      // (b) seeded the image with a name unrelated to the one shown on the card.
      const fallbackName = generateLookName(occasion, fallbackStyle);
      looks.push({
        id: `gen_fallback_${Date.now()}`,
        name: fallbackName,
        description: generateDescription(occasion, fallbackStyle),
        occasion,
        // Attribution parity with the main path (line 1684) — if the user
        // arrived from a celeb CTA, even an ultra-fallback look stamps the
        // celeb so it shows up in Saved Looks filters, /celebrity badges,
        // home Continue Exploring, and Look detail INSPIRED BY pill.
        inspiredBy: celebName,
        // Honor the style's season bias instead of hardcoding "All Season" —
        // keeps the season tag aligned with the locked style identity (e.g.
        // Vacation Luxe → Spring/Summer, Evening → Autumn/Winter).
        season: (season && season !== "All Season") ? season : pickSeasonForStyle(fallbackStyle),
        estimatedPrice: total,
        image: getLookImage(fallbackStyle, fp, genderKey, fallbackName),
        gender: genderKey,
        pieces,
        style: fallbackStyle,
        tags: [occasion.toLowerCase(), fallbackPalette.name.toLowerCase(), pieces[0].brand.toLowerCase()],
        colorPalette: fallbackPalette.name,
      });
    }
  }

  // HARD budget cap (single source of truth): the TOTAL of every displayed
  // look must not exceed the user's selected budget. The passes above keep the
  // running total within budgetMax, but the deterministic fallbacks assemble
  // straight from the catalog without summing, so a 2-piece fallback where each
  // piece is individually in-budget can still total over. Filter here as the
  // final guarantee. budgetMax === 0 means "no budget selected" → no cap.
  const withinBudget = budgetMax > 0
    ? looks.filter((l) => l.estimatedPrice <= budgetMax)
    : looks;
  return shuffle(withinBudget);
}

// ─── AI Stylist plan resolver ────────────────────────────────────────────────
// Takes a structured outfit plan from the OpenAI stylist (style, palette,
// slot specs with brand preferences) and resolves each slot to a real
// catalog item — enforcing the same HARD gender + season rules as
// generateLooks(). Brand preferences are SOFT (preferred first, then any
// matching item). Categories from the plan map 1:1 to CatalogItem.category.

export interface AIStylistSlot {
  category: CatalogItem["category"];
  descriptor: string;
  brandPreferences: string[];
  colorPreferences: string[];
  formality: "casual" | "smart" | "dress";
}

export interface AIStylistPlan {
  style: string;
  palette: string;
  paletteColors: string[];
  season?: string;
  name: string;
  description: string;
  slots: AIStylistSlot[];
}

export interface ResolveAIPlanParams {
  gender: string;       // "Women" | "Men" | "Unisex"
  budget: string;
  season?: string;      // user's onboarding season — overrides plan.season
  // When true, only catalog items with a reliable, brand-direct product image
  // (a live photo that actually loads — see hasReliableProductImage) are eligible.
  // Used by the Runway engine so every resolved piece shows a real website photo,
  // never a hotlink-blocked resale CDN image that degrades to a monogram tile.
  requireBrandDirectImage?: boolean;
  // TV Show Inspirations flow. When true, the women's-bag completeness rule is
  // relaxed (a TV look is complete at top+bottom+shoes or dress+shoes) and the
  // AI batch dedups items across every look in the grid (see generateAILooks).
  tvInspiration?: boolean;
}

// Hosts that serve brand-direct product photography and permit hotlinking, so
// the image reliably renders in <Image>. The Shopify storefront CDN backs all
// auto-generated feed items (real PDPs from the brand's own store). Resale CDNs
// (jolicloset, 1stdibs, ebayimg, etc.) are NOT brand-direct and several
// hotlink-block (HTTP 403) → the piece falls back to a brand-monogram tile.
const BRAND_DIRECT_IMAGE_HOSTS = ["cdn.shopify.com"];

/** True when the item's product image is a reliable, brand-direct, hotlink-safe
 *  URL that will actually render — used to guarantee runway looks never surface a
 *  broken/placeholder image. */
export function hasReliableProductImage(item: CatalogItem): boolean {
  const url = item.productImageUrl ?? item.imageUrl;
  if (!url) return false;
  // Match on the URL hostname (exact or sub-domain) rather than a loose substring
  // so a whitelisted host can't be spoofed via a path/query segment.
  const host = /^https?:\/\/([^/?#]+)/i.exec(url)?.[1]?.toLowerCase();
  if (!host) return false;
  return BRAND_DIRECT_IMAGE_HOSTS.some(
    (h) => host === h || host.endsWith(`.${h}`),
  );
}

export function generateLookFromAIPlan(
  plan: AIStylistPlan,
  params: ResolveAIPlanParams,
  usedAcross?: Set<string>,
): Look | null {
  const genderKey = params.gender.toLowerCase() as "women" | "men" | "unisex";
  const effectiveSeason = params.season ?? plan.season;
  const { max: budgetMax } = parseBudget(params.budget);
  // TV Inspiration relaxes the women's-bag requirement for this flow only.
  const requireBag = !params.tvInspiration;

  const matchesGender = (item: CatalogItem): boolean => {
    if (genderKey === "unisex") return true;
    return item.genders.includes(genderKey) || item.genders.includes("unisex");
  };

  const seasonOk = (item: CatalogItem): boolean => {
    if (!effectiveSeason || effectiveSeason === "All Season") return true;
    return matchesSeason(item, effectiveSeason);
  };

  // HARD when requested by the caller (Runway): the item must carry a reliable,
  // brand-direct product image. Kept HARD through every fallback so a starved
  // slot never reintroduces a hotlink-blocked/placeholder image.
  const imageOk = (item: CatalogItem): boolean =>
    !params.requireBrandDirectImage || hasReliableProductImage(item);

  const slotPool = (slot: AIStylistSlot): CatalogItem[] => {
    // HARD: category + gender + season + image. Brand preference is a soft sort.
    const base = CATALOG.filter(
      (item) =>
        item.category === slot.category &&
        matchesGender(item) &&
        seasonOk(item) &&
        isBagAppropriateForGender(item, genderKey) &&
        imageOk(item) &&
        item.price <= budgetMax,
    );
    if (base.length === 0) {
      // Drop the budget ceiling rather than gender/season/image — those are HARD.
      return CATALOG.filter(
        (item) =>
          item.category === slot.category &&
          matchesGender(item) &&
          seasonOk(item) &&
          isBagAppropriateForGender(item, genderKey) &&
          imageOk(item),
      );
    }
    return base;
  };

  const rankBySlot = (pool: CatalogItem[], slot: AIStylistSlot): CatalogItem | null => {
    if (pool.length === 0) return null;
    const brandSet = new Set(slot.brandPreferences.map((b) => b.toLowerCase()));
    const colorSet = new Set(slot.colorPreferences.map((c) => c.toLowerCase()));
    const styleKey = plan.style.toLowerCase();
    const ranked = [...pool].sort((a, b) => scoreFor(b) - scoreFor(a));
    // Top-3 random pick so back-to-back AI generations don't always return
    // the literal same item for the same plan.
    const top = ranked.slice(0, Math.min(3, ranked.length));
    return top[Math.floor(Math.random() * top.length)];

    function scoreFor(item: CatalogItem): number {
      let s = 0;
      if (brandSet.has(item.brand.toLowerCase())) s += 10;
      if (item.styles.some((st) => st.toLowerCase() === styleKey)) s += 4;
      if (item.colors.some((c) => colorSet.has(c.toLowerCase()))) s += 3;
      // Tiny jitter so equal-score items don't always sort the same way.
      s += Math.random() * 0.5;
      return s;
    }
  };

  const pieces: OutfitPiece[] = [];
  // Seed from the cross-look set (TV batch) so no item already placed in a
  // sibling look in this grid can be reused here — "no duplicates in any gender".
  const usedIds = new Set<string>(usedAcross ?? []);
  let total = 0;

  const addResolved = (item: CatalogItem): void => {
    usedIds.add(item.id);
    total += item.price;
    pieces.push({
      id: item.id,
      name: item.name,
      brand: item.brand,
      price: item.price,
      category: item.category,
      color: item.colors[0] ?? plan.paletteColors[0] ?? "",
      imageUrl: item.productImageUrl ?? item.imageUrl,
      localImage: item.localProductImage,
      purchaseUrl: item.directProductUrl ?? buildPurchaseUrl(item),
      signature: true,
    });
  };

  for (const slot of plan.slots) {
    const pool = slotPool(slot).filter((i) => !usedIds.has(i.id));
    const item = rankBySlot(pool, slot);
    if (!item) continue; // catalog gap for this slot — drop honestly
    addResolved(item);
  }

  // Completeness backfill — the AI plan can under-specify (omit shoes, a bottom,
  // or — for women — the required bag). Rather than ship a partial outfit, pull
  // the missing REQUIRED categories straight from the catalog, honoring the same
  // HARD gender + season rules and preferring in-budget, on-style pieces. If a
  // required category can't be filled, the look fails the completeness gate
  // below and is dropped honestly.
  const styleKey = plan.style.toLowerCase();
  const ensureCategory = (category: CatalogItem["category"]): void => {
    if (pieces.some((p) => p.category === category)) return;
    const inBudget = CATALOG.filter(
      (item) =>
        item.category === category &&
        matchesGender(item) &&
        seasonOk(item) &&
        isBagAppropriateForGender(item, genderKey) &&
        imageOk(item) &&
        !usedIds.has(item.id) &&
        (budgetMax === 0 || item.price + total <= budgetMax),
    );
    // Keep gender + season + image HARD; only relax the budget headroom if needed
    // (the final total-budget gate still drops the look if this blows the cap).
    const pool =
      inBudget.length > 0
        ? inBudget
        : CATALOG.filter(
            (item) =>
              item.category === category &&
              matchesGender(item) &&
              seasonOk(item) &&
              isBagAppropriateForGender(item, genderKey) &&
              imageOk(item) &&
              !usedIds.has(item.id),
          );
    if (pool.length === 0) return;
    const ranked = [...pool].sort(
      (a, b) =>
        (b.styles.some((s) => s.toLowerCase() === styleKey) ? 1 : 0) -
        (a.styles.some((s) => s.toLowerCase() === styleKey) ? 1 : 0),
    );
    addResolved(ranked[0]);
  };

  const hasCat = (c: CatalogItem["category"]) => pieces.some((p) => p.category === c);
  if (genderKey === "women") {
    // Women: complete core (dress OR top+bottom) + shoes + bag.
    if (!hasCat("dress") && !(hasCat("top") && hasCat("bottom"))) {
      if (hasCat("top")) ensureCategory("bottom");
      else if (hasCat("bottom")) ensureCategory("top");
      else {
        ensureCategory("top");
        ensureCategory("bottom");
      }
    }
    ensureCategory("shoes");
    // Bag backfill is skipped in the TV Inspiration flow (bag optional there).
    if (requireBag) ensureCategory("bag");
  } else {
    // Men / unisex: top + bottom + shoes.
    ensureCategory("top");
    ensureCategory("bottom");
    ensureCategory("shoes");
  }

  // No partial outfits — gate on the same completeness contract as generateLooks
  // (the women's-bag requirement is relaxed in the TV Inspiration flow).
  if (!isCompleteOutfit(pieces, genderKey, { requireBag })) return null;

  // HARD budget cap (parity with generateLooks): the TOTAL of every displayed
  // look must stay within the user's selected budget. Per-slot filtering keeps
  // individual pieces in budget, but a starved slot drops the price ceiling and
  // the sum can still exceed it — drop the look honestly rather than surface an
  // over-budget outfit. budgetMax === 0 means "no budget selected" → no cap.
  if (budgetMax > 0 && total > budgetMax) return null;

  // Commit this look's pieces to the cross-look set ONLY now that it passed
  // every gate, so a dropped (null) look never poisons the dedup pool.
  if (usedAcross) for (const p of pieces) usedAcross.add(p.id);

  const fp = fingerprint(pieces.map((p) => p.id));
  return {
    id: `ai_${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
    name: plan.name,
    description: plan.description,
    occasion: "AI Stylist",
    season: effectiveSeason && effectiveSeason !== "All Season"
      ? effectiveSeason
      : (plan.season ?? "All Season"),
    estimatedPrice: total,
    image: getLookImage(plan.style, fp, genderKey, plan.name),
    gender: genderKey,
    pieces,
    style: plan.style,
    tags: ["ai stylist", plan.palette.toLowerCase(), pieces[0].brand.toLowerCase()],
    colorPalette: plan.palette,
    paletteColors: plan.paletteColors,
  };
}
