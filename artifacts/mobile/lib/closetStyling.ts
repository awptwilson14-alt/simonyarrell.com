// ─── Closet Intelligence ─────────────────────────────────────────────────────
// "Style With My Closet" / "Complete This Look": owned pieces are converted to
// locked OutfitPiece slots and seeded into generation VERBATIM, so the engine
// composes compatible purchasable products AROUND what the user already owns.
// Owned pieces carry price 0 — the budget cap applies to what the user would
// actually BUY, and closet items still pass all outfit validation gates.

import type { ClosetItem } from "@/context/AppContext";
import type { OutfitPiece } from "@/constants/data";

// Closet UI categories (plural, Title Case) → engine slot categories.
const CATEGORY_MAP: Record<string, string> = {
  Tops: "top",
  Bottoms: "bottom",
  Dresses: "dress",
  Outerwear: "outerwear",
  Shoes: "shoes",
  Bags: "bag",
  Accessories: "accessories",
  Jewelry: "jewelry",
};

export function closetItemToPiece(item: ClosetItem): OutfitPiece {
  return {
    id: `closet_${item.id}`,
    name: item.name,
    brand: item.brand || "From Your Closet",
    price: 0, // owned — costs nothing toward the look's budget
    category: CATEGORY_MAP[item.category] ?? item.category.toLowerCase(),
    color: item.color,
  };
}

// Pick up to `max` closet items with DISTINCT engine categories (most recent
// first) — the engine locks at most one piece per category slot.
export function pickClosetSeeds(items: ClosetItem[], max = 2): OutfitPiece[] {
  const seen = new Set<string>();
  const out: OutfitPiece[] = [];
  const sorted = [...items].sort(
    (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime(),
  );
  for (const it of sorted) {
    const piece = closetItemToPiece(it);
    // A locked dress + locked top/bottom would contradict the outfit
    // structure — once a dress is seeded, skip tops/bottoms and vice versa.
    if (piece.category === "dress" && (seen.has("top") || seen.has("bottom"))) continue;
    if ((piece.category === "top" || piece.category === "bottom") && seen.has("dress")) continue;
    if (seen.has(piece.category)) continue;
    seen.add(piece.category);
    out.push(piece);
    if (out.length >= max) break;
  }
  return out;
}
