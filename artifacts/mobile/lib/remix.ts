// ─── Remix This Look ─────────────────────────────────────────────────────────
// Styling-agent spec: every generated look supports one-tap remixes. Each
// action derives new GenerateParams from the BASE look's real attributes,
// then runs the normal engine — so every remix passes the exact same hard
// gates (budget cap, gender, season, completeness, style coherence, global
// duplicate protection) as a first-generation look.

import { BUDGETS, Look, OutfitPiece } from "@/constants/data";
import { generateLooks } from "@/lib/outfitEngine";

export type RemixAction =
  | "More Affordable"
  | "Make It Luxury"
  | "More Casual"
  | "Dress It Up"
  | "Sneaker Version"
  | "New Color Story"
  | "New Designer Mix"
  | "Streetwear Remix"
  | "Date Night Remix"
  | "Work Remix"
  | "Concert Remix"
  | "Seasonal Remix"
  | "Surprise Me";

export const REMIX_ACTIONS: RemixAction[] = [
  "More Affordable",
  "Make It Luxury",
  "More Casual",
  "Dress It Up",
  "Sneaker Version",
  "New Color Story",
  "New Designer Mix",
  "Streetwear Remix",
  "Date Night Remix",
  "Work Remix",
  "Concert Remix",
  "Seasonal Remix",
  "Surprise Me",
];

// Map an estimated look total to the budget bucket it fits inside.
function bucketForPrice(price: number): number {
  if (price < 500) return 0;
  if (price < 1500) return 1;
  if (price < 3000) return 2;
  if (price < 6000) return 3;
  return 4;
}

const OCCASION_CYCLE = ["Casual", "Date Night", "Work", "Event", "Streetwear", "Night Out", "Brunch"];
const SEASON_CYCLE = ["Spring", "Summer", "Autumn", "Winter"];

function genderLabel(g: Look["gender"]): string {
  return g === "men" ? "Men" : g === "women" ? "Women" : "Unisex";
}

// Occasion the remix should generate for. Remix occasions swap it outright;
// everything else inherits the base look's occasion (AI Stylist looks fall
// back to Casual — "AI Stylist" is an attribution, not an engine occasion).
function baseOccasion(look: Look): string {
  return look.occasion === "AI Stylist" ? "Casual" : look.occasion;
}

export function remixLook(
  base: Look,
  action: RemixAction,
  opts?: { favoriteStyles?: string[]; season?: string; lockedItems?: OutfitPiece[] },
): Look | undefined {
  const brands = Array.from(new Set(base.pieces.map((p) => p.brand)));
  const bucket = bucketForPrice(base.estimatedPrice);
  const common = {
    gender: genderLabel(base.gender),
    budget: BUDGETS[bucket],
    occasion: baseOccasion(base),
    favoriteStyles: opts?.favoriteStyles ?? [],
    season: opts?.season,
    count: 1,
    // "Keep This Item" locks survive every remix direction — a locked piece
    // is never replaced until the user unlocks it.
    lockedItems: opts?.lockedItems?.length ? opts.lockedItems : undefined,
  };

  let params: Parameters<typeof generateLooks>[0];
  switch (action) {
    case "More Affordable":
      params = { ...common, budget: BUDGETS[Math.max(0, bucket - 1)] };
      break;
    case "Make It Luxury":
      params = { ...common, budget: BUDGETS[4] };
      break;
    case "More Casual":
      params = { ...common, occasion: "Casual" };
      break;
    case "Dress It Up":
      params = { ...common, occasion: "Formal" };
      break;
    case "Sneaker Version":
      params = { ...common, forceShoeTypes: ["sneakers"] };
      break;
    case "New Color Story":
      params = { ...common, avoidPalette: base.colorPalette };
      break;
    case "New Designer Mix":
      params = { ...common, avoidBrands: brands };
      break;
    case "Streetwear Remix":
      params = { ...common, occasion: "Streetwear" };
      break;
    case "Date Night Remix":
      params = { ...common, occasion: "Date Night" };
      break;
    case "Work Remix":
      params = { ...common, occasion: "Work" };
      break;
    case "Concert Remix":
      params = { ...common, occasion: "Concert" };
      break;
    case "Seasonal Remix": {
      // Rotate to the NEXT season relative to the base look so the remix is
      // a genuine seasonal translation, not a re-roll.
      const idx = SEASON_CYCLE.indexOf(base.season);
      const next = SEASON_CYCLE[(idx >= 0 ? idx + 1 : 0) % SEASON_CYCLE.length];
      params = { ...common, season: next };
      break;
    }
    case "Surprise Me": {
      const occ = OCCASION_CYCLE[Math.floor(Math.random() * OCCASION_CYCLE.length)];
      params = { ...common, occasion: occ, avoidBrands: brands, avoidPalette: base.colorPalette };
      break;
    }
  }

  // The engine's global fingerprint dedup already guarantees the remix is a
  // fresh combination (never the base look or any previously shown outfit).
  const [look] = generateLooks(params);
  if (!look) return undefined;
  return { ...look, name: `${look.name} (Remix)`, tags: [...look.tags, "remix"] };
}

// ─── Change This Item ────────────────────────────────────────────────────────
// Replace exactly ONE piece under a user-chosen constraint. Every OTHER piece
// is passed to the engine as a locked item, so the rest of the outfit is
// preserved verbatim while the whole look is re-validated end to end
// (budget cap, coherence, season, completeness, duplicate protection).

export type ChangeItemMode =
  | "Different Designer"
  | "Different Color"
  | "More Affordable"
  | "More Luxury"
  | "More Casual"
  | "Dressier"
  | "Surprise Me";

export const CHANGE_ITEM_MODES: ChangeItemMode[] = [
  "Different Designer",
  "Different Color",
  "More Affordable",
  "More Luxury",
  "More Casual",
  "Dressier",
  "Surprise Me",
];

function normColor(c: string): string {
  return c.trim().toLowerCase();
}

export function changeItem(
  base: Look,
  pieceId: string,
  mode: ChangeItemMode,
  opts?: { favoriteStyles?: string[] },
): Look | undefined {
  const target = base.pieces.find((p) => p.id === pieceId);
  if (!target) return undefined;
  const locked: OutfitPiece[] = base.pieces.filter((p) => p.id !== pieceId);

  const bucket = bucketForPrice(base.estimatedPrice);
  let budget = BUDGETS[bucket];
  if (mode === "More Luxury") budget = BUDGETS[Math.min(4, bucket + 1)];

  const params: Parameters<typeof generateLooks>[0] = {
    gender: genderLabel(base.gender),
    occasion:
      mode === "More Casual" ? "Casual"
      : mode === "Dressier" ? "Formal"
      : baseOccasion(base),
    budget,
    favoriteStyles: opts?.favoriteStyles ?? [],
    count: 1,
    lockedItems: locked,
    avoidBrands: mode === "Different Designer" ? [target.brand] : undefined,
    forceShoeTypes:
      target.category === "shoes"
        ? (mode === "More Casual" ? ["sneakers", "casual"] : mode === "Dressier" ? ["dress"] : undefined)
        : undefined,
  };

  // Mode-specific acceptance test on the replacement piece. The engine
  // composes freely for the open slot; we retry a few times until the swap
  // actually satisfies the user's instruction.
  const accepts = (repl: OutfitPiece): boolean => {
    const sameArticle = repl.brand === target.brand && repl.name === target.name;
    if (sameArticle) return false;
    switch (mode) {
      case "Different Designer": return repl.brand !== target.brand;
      case "Different Color":    return normColor(repl.color) !== normColor(target.color);
      case "More Affordable":    return repl.price < target.price;
      case "More Luxury":        return repl.price > target.price;
      default:                   return true;
    }
  };

  for (let attempt = 0; attempt < 6; attempt++) {
    const [look] = generateLooks(params);
    if (!look) continue;
    const repl = look.pieces.find(
      (p) => p.category === target.category && !locked.some((l) => l.id === p.id),
    );
    if (!repl || !accepts(repl)) continue;
    return { ...look, name: base.name, inspiredBy: base.inspiredBy };
  }
  return undefined;
}
