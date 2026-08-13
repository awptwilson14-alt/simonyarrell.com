// ─── Love This / Not For Me — preference learning ────────────────────────────
// Styling-agent spec: "Love This" is a strong positive signal (learn designer,
// color, silhouette/style, category aesthetic); "Not For Me" teaches what to
// show less of. Signals accumulate as counters and are DERIVED into soft
// generation biases — never hard filters, so learning can never starve the
// engine or override a hard gate (budget, gender, season, completeness).

import { Look } from "@/constants/data";

export type NotForMeReason =
  | "Don't like color"
  | "Don't like designer"
  | "Don't like fit"
  | "Don't like pattern"
  | "Too expensive"
  | "Too casual"
  | "Too formal"
  | "Already own similar";

export const NOT_FOR_ME_REASONS: NotForMeReason[] = [
  "Don't like color",
  "Don't like designer",
  "Don't like fit",
  "Don't like pattern",
  "Too expensive",
  "Too casual",
  "Too formal",
  "Already own similar",
];

export interface StyleFeedback {
  lovedBrands: Record<string, number>;
  dislikedBrands: Record<string, number>;
  lovedStyles: Record<string, number>;
  dislikedStyles: Record<string, number>;
  lovedColors: Record<string, number>;
  dislikedColors: Record<string, number>;
  // Occasion-register nudges from "Too casual" / "Too formal".
  tooCasualCount: number;
  tooFormalCount: number;
}

export const EMPTY_FEEDBACK: StyleFeedback = {
  lovedBrands: {},
  dislikedBrands: {},
  lovedStyles: {},
  dislikedStyles: {},
  lovedColors: {},
  dislikedColors: {},
  tooCasualCount: 0,
  tooFormalCount: 0,
};

function bump(rec: Record<string, number>, key: string): Record<string, number> {
  const k = key.trim();
  if (!k) return rec;
  return { ...rec, [k]: (rec[k] ?? 0) + 1 };
}

export function applyLove(fb: StyleFeedback, look: Look): StyleFeedback {
  let next = { ...fb };
  for (const p of look.pieces) {
    next.lovedBrands = bump(next.lovedBrands, p.brand);
    next.lovedColors = bump(next.lovedColors, p.color.toLowerCase());
  }
  next.lovedStyles = bump(next.lovedStyles, look.style);
  return next;
}

export function applyNotForMe(fb: StyleFeedback, look: Look, reason: NotForMeReason): StyleFeedback {
  let next = { ...fb };
  switch (reason) {
    case "Don't like designer":
      for (const p of look.pieces) next.dislikedBrands = bump(next.dislikedBrands, p.brand);
      break;
    case "Don't like color":
      for (const p of look.pieces) next.dislikedColors = bump(next.dislikedColors, p.color.toLowerCase());
      break;
    case "Don't like fit":
    case "Don't like pattern":
      next.dislikedStyles = bump(next.dislikedStyles, look.style);
      break;
    case "Too casual":
      next.tooCasualCount += 1;
      break;
    case "Too formal":
      next.tooFormalCount += 1;
      break;
    case "Too expensive":
    case "Already own similar":
      // Price signal is already user-controlled via the budget picker, and
      // "own similar" feeds novelty pressure the dedup engine already applies.
      // Still record a mild style-fatigue signal.
      next.dislikedStyles = bump(next.dislikedStyles, look.style);
      break;
  }
  return next;
}

// ── Derived generation biases (all SOFT) ────────────────────────────────────

// Brands the user has voted against more than for — softly avoided in pools.
export function derivedAvoidBrands(fb: StyleFeedback): string[] {
  return Object.keys(fb.dislikedBrands).filter(
    (b) => fb.dislikedBrands[b] >= 2 && fb.dislikedBrands[b] > (fb.lovedBrands[b] ?? 0),
  );
}

// Styles the user consistently loves — appended to favoriteStyles so the
// engine's existing style-bias machinery weights them up.
export function derivedBoostStyles(fb: StyleFeedback): string[] {
  return Object.entries(fb.lovedStyles)
    .filter(([s, n]) => n >= 2 && n > (fb.dislikedStyles[s] ?? 0))
    .sort((a, b) => b[1] - a[1])
    .map(([s]) => s)
    .slice(0, 3);
}
