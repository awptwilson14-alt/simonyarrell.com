/**
 * Runway styling vocabulary used by the Real Luxury Runway Styling Engine
 * (see `app/runway.tsx`). These constants drive the chip pickers and the
 * prompt-composition logic that feeds the existing AI stylist endpoint
 * (`/api/stylist/plan`) — no new endpoints, no changes to the look
 * generation pipeline.
 *
 * The AI stylist already returns a structured plan resolved against the
 * real-product CATALOG (no fake clothing renders, no invented products).
 * These modes simply colour the brief sent to the model.
 */

export type RunwayMode =
  | "Quiet Luxury"
  | "Old Money"
  | "Editorial"
  | "Streetwear Elite"
  | "Avant-Garde"
  | "Monochrome"
  | "Red Carpet"
  | "Soft Luxury"
  | "Techwear"
  | "Runway Rebel";

export const RUNWAY_MODES: ReadonlyArray<RunwayMode> = [
  "Quiet Luxury",
  "Old Money",
  "Editorial",
  "Streetwear Elite",
  "Avant-Garde",
  "Monochrome",
  "Red Carpet",
  "Soft Luxury",
  "Techwear",
  "Runway Rebel",
];

export type FashionWeekMode =
  | "Paris Fashion Week"
  | "Milan Fashion Week"
  | "New York Fashion Week"
  | "Tokyo Avant-Garde"
  | "London Experimental";

export const FASHION_WEEK_MODES: ReadonlyArray<FashionWeekMode> = [
  "Paris Fashion Week",
  "Milan Fashion Week",
  "New York Fashion Week",
  "Tokyo Avant-Garde",
  "London Experimental",
];

/** One-line stylist note shown under each chip; also fed to the AI prompt. */
const RUNWAY_BLURBS: Record<RunwayMode, string> = {
  "Quiet Luxury": "Loro Piana / The Row restraint — luxe fabrics, zero logos, perfect proportions.",
  "Old Money": "Heritage tailoring, Hermès silks, polished leather, generational wardrobe codes.",
  "Editorial": "High-concept Vogue cover energy — sculptural silhouettes, dramatic palette.",
  "Streetwear Elite": "Fear of God / Off-White / Balenciaga — elevated street with couture finishing.",
  "Avant-Garde": "Margiela / Rick Owens — deconstruction, unexpected proportions, art-object pieces.",
  "Monochrome": "One tonal palette executed across every layer — discipline over decoration.",
  "Red Carpet": "Atelier-level evening — Valentino, Saint Laurent, Dior — built for cameras.",
  "Soft Luxury": "Cashmere, silk-charmeuse, knit ease — Toteme / Brunello Cucinelli textures.",
  "Techwear": "Acronym / Stone Island Shadow — technical fabrics, urban utility, dark functionality.",
  "Runway Rebel": "Anti-rules styling — Vetements / Y/Project — provocation as silhouette.",
};

const FASHION_WEEK_BLURBS: Record<FashionWeekMode, string> = {
  "Paris Fashion Week": "Couture restraint, monochromatic precision, intellectual luxury.",
  "Milan Fashion Week": "Italian sensuality, luxurious leather, confident tailoring.",
  "New York Fashion Week": "American sportswear elevated — clean lines, considered minimalism.",
  "Tokyo Avant-Garde": "Conceptual layering, unexpected proportions, monochrome with texture.",
  "London Experimental": "Punk-inflected, art-school energy, colour-blocking, sculpted volume.",
};

export function runwayBlurb(m: RunwayMode): string {
  return RUNWAY_BLURBS[m];
}

export function fashionWeekBlurb(m: FashionWeekMode): string {
  return FASHION_WEEK_BLURBS[m];
}

/**
 * Compose a brief that augments the user's free-text prompt with the
 * selected runway + fashion-week styling vocabulary. The returned string is
 * passed to the existing AI stylist as the `prompt` field — it never
 * bypasses the gender / season / budget HARD constraints already enforced
 * server-side. Trims and de-duplicates so empty selections produce a clean
 * brief.
 */
export function composeRunwayBrief(opts: {
  freeText?: string;
  runwayMode?: RunwayMode;
  fashionWeek?: FashionWeekMode;
}): string | undefined {
  const parts: string[] = [];
  const freeText = opts.freeText?.trim();
  if (freeText) parts.push(freeText);
  if (opts.runwayMode) {
    parts.push(`Runway mode: ${opts.runwayMode}. ${RUNWAY_BLURBS[opts.runwayMode]}`);
  }
  if (opts.fashionWeek) {
    parts.push(
      `Fashion Week inspiration: ${opts.fashionWeek}. ${FASHION_WEEK_BLURBS[opts.fashionWeek]}`,
    );
  }
  if (parts.length === 0) return undefined;
  parts.push(
    "Compose ONE cohesive editorial outfit using ONLY real luxury houses. Coordinate colour, texture, silhouette, and formality. Include a short stylist commentary in the `description` field explaining WHY the pieces work together.",
  );
  return parts.join(" ");
}
