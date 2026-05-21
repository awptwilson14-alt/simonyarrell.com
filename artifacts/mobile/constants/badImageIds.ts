// Visual audit: these Unsplash photo IDs have been visually confirmed to NOT
// depict what their assigned item claims (wrong garment, wrong color, wrong
// gender, or 404). They are used as a denylist by both the static `LOOKS`
// (constants/data.ts) and the runtime outfit generator (lib/outfitEngine.ts).
//
// Effect: when an item resolves to one of these IDs, its `imageUrl` becomes
// undefined, which makes the look-detail `ResilientImage` render the editorial
// brand-monogram fallback tile instead — preserving the project rule that no
// thumbnail may visibly contradict the item it labels.
//
// To extend: append a new entry with an inline comment naming what the photo
// actually shows vs. what it was being used for.

export const KNOWN_BAD_UNS_IDS = new Set<string>([
  "1515886657613-9f3515b0c78f", // generic white/dress — wrong for l1 dress, l6 skirt, l7 slip
  "1599643477877-530eb83abc8e", // teal jewelry — wrong for "Gold Sculptural Cuff"
  "1543163521-1bf539c55dd2",    // blue heel — wrong for "Nude" mules / slingbacks
  "1521572163474-6864f9cf17ab", // white tee — wrong for "Camel Cashmere Polo"
  "1552902865-b72c031ac5ea",    // person in black — wrong for ivory/stone trousers
  "1571513800374-841571dbf2e2", // yellow square — not a recognizable Goyard tote
  "1539008835657-9e8e9680c956", // white flowy dress — wrong for "Black GORE-TEX Shell"
  "1542291026-7eec264c27ff",    // red sneaker — wrong for "Black Nike Air Drone"
  "1584917865442-de89df76afd3", // red bag — wrong for "Black Cote&Ciel Crossbody"
  "1507003211169-0a1dd7228f2d", // man's portrait — wrong for "Cream Oversized Blazer"
  "1503342217505-b0a15ec3261c", // person in dark shirt — wrong for "White Knit Tank"
  "1515347619252-60a4bf4fff4f", // chunky sneaker — wrong for Chanel "Two-Tone Slingback" + other lx_* heels
]);

export function isBadUnsId(id: string): boolean {
  return KNOWN_BAD_UNS_IDS.has(id);
}
