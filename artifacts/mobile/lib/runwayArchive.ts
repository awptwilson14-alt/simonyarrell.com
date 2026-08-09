/**
 * Verified Runway Archive — the ONLY source of "Original Runway Look" content.
 *
 * ACCURACY RULE (hard, product-level): the app must NEVER invent runway look
 * numbers, collection names, seasons/years, garments, images, or designer
 * attribution. A runway look may only appear here after its source data has
 * been verified against a documented runway source (e.g. the house's own
 * published collection or an archival runway publication), and the `source`
 * field must say what that source is.
 *
 * The archive ships EMPTY until verified, licensable runway data is supplied.
 * There is no public API for documented runway looks (Vogue Runway etc. are
 * not licensable feeds), so entries must be added deliberately — never
 * generated, scraped, or inferred. While a house/collection has no verified
 * entries, the UI shows RUNWAY_UNAVAILABLE_MESSAGE instead of a fake look.
 *
 * Anything produced by the outfit engine or AI stylist is a RECREATION and
 * must be labeled as such — it can never be presented as an original runway
 * look, regardless of how it is prompted.
 */

export interface RunwayGarment {
  /** As documented for the runway look, e.g. "Wool gabardine coat". */
  name: string;
  /** Optional catalog product id when the ACTUAL runway product is shoppable. */
  productId?: string;
}

export interface RunwayLook {
  fashionHouse: RunwayHouse;
  collectionName: string; // e.g. "Fall/Winter 2026 Menswear"
  season: RunwaySeasonCategory;
  year: number;
  gender: "Men" | "Women" | "Unisex";
  runwayLookNumber: number;
  /** Real runway photograph (licensed/permitted). Never a product image. */
  runwayImage: string;
  /** Verified documentation source for this exact look. Required. */
  source: string;
  garments: RunwayGarment[];
  accessories: RunwayGarment[];
  footwear: RunwayGarment[];
}

export const RUNWAY_HOUSES = [
  "Prada",
  "Gucci",
  "Saint Laurent",
  "Dior",
  "Bottega Veneta",
  "Balenciaga",
  "Louis Vuitton",
  "Burberry",
  "Versace",
  "Valentino",
] as const;
export type RunwayHouse = (typeof RUNWAY_HOUSES)[number];

export const RUNWAY_SEASON_CATEGORIES = [
  "Spring/Summer",
  "Fall/Winter",
  "Resort",
  "Pre-Fall",
  "Couture",
] as const;
export type RunwaySeasonCategory = (typeof RUNWAY_SEASON_CATEGORIES)[number];

/**
 * The verified archive. EMPTY by design — see the accuracy rule above. Add
 * entries ONLY with a real runwayImage the app may display and a `source`
 * naming the verified documentation. Do not populate programmatically.
 */
export const VERIFIED_RUNWAY_LOOKS: RunwayLook[] = [];

export const RUNWAY_UNAVAILABLE_MESSAGE =
  "Verified runway looks are not currently available for this collection.";

export interface RunwayArchiveFilters {
  fashionHouse?: RunwayHouse;
  gender?: "Men" | "Women";
  season?: RunwaySeasonCategory;
  year?: number;
  collectionName?: string;
}

/** Unique identifier for feed-level rotation (NOT permanent hiding — an
 *  authentic runway look must stay searchable/revisitable forever). */
export function runwayLookId(l: RunwayLook): string {
  return `${l.fashionHouse}|${l.collectionName}|${l.runwayLookNumber}`;
}

/**
 * STRICT filtering: selecting a house returns ONLY that house's verified
 * looks. Cross-brand results labeled as a house's runway look are impossible
 * by construction — there is no fallback, no fuzzy match, no generation.
 */
export function findRunwayLooks(filters: RunwayArchiveFilters): RunwayLook[] {
  return VERIFIED_RUNWAY_LOOKS.filter((l) => {
    if (filters.fashionHouse && l.fashionHouse !== filters.fashionHouse) return false;
    if (filters.gender && l.gender !== "Unisex" && l.gender !== filters.gender) return false;
    if (filters.season && l.season !== filters.season) return false;
    if (filters.year && l.year !== filters.year) return false;
    if (
      filters.collectionName &&
      !l.collectionName.toLowerCase().includes(filters.collectionName.toLowerCase())
    )
      return false;
    return true;
  });
}

/** Years present in the archive (for the year filter UI). */
export function archiveYears(): number[] {
  return [...new Set(VERIFIED_RUNWAY_LOOKS.map((l) => l.year))].sort((a, b) => b - a);
}

/**
 * Compose the "Recreate This Look" stylist brief from a VERIFIED look's
 * documented garments — the recreation is clearly derivative and is labeled
 * "Recreate This Look", never presented as the original.
 */
export function composeRecreateBrief(l: RunwayLook): string {
  const items = [...l.garments, ...l.footwear, ...l.accessories].map((g) => g.name);
  return (
    `Recreate the aesthetic of ${l.fashionHouse} ${l.collectionName} runway look ` +
    `${l.runwayLookNumber} using available pieces: ${items.join(", ")}. ` +
    `Match the silhouette, palette and formality — these are alternatives, not the original garments.`
  );
}
