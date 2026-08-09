/**
 * Whole-outfit STYLE COHERENCE gate — Simon Yarrell styling rules.
 *
 * Enforced as a drop-and-retry gate on EVERY generation path (rule-based main
 * loop, both deterministic fallbacks, and the AI resolver), exactly like the
 * completeness and season gates. A look must read as ONE intentional styling
 * decision:
 *
 *   1. FORMALITY — no extreme jumps. Items are classified on a 6-level scale
 *      (athletic → streetwear → casual → smart-casual → business → formal)
 *      from strongly-marked name signals. Only STRONGLY marked garments pin a
 *      level (a plain tee or loafer is versatile and pins nothing); marked
 *      garments in one look must sit within 2 adjacent levels. This is what
 *      kills "BODE double-breasted suit jacket + NOAH rugby shirt" without
 *      hard-coding any brand: `suit` marks business(4), `rugby` marks
 *      streetwear(1), span 3 → rejected, the retry loop assembles another top.
 *
 *   2. PATTERN — at most ONE loudly-patterned garment per look (stripes,
 *      plaid, floral, leopard, camo, …). Bags/jewelry/accessories are exempt
 *      (a monogram bag is a staple, not a competing pattern).
 *
 *   3. COLOR — the look must resolve to an intentional palette: unlimited
 *      neutrals plus AT MOST TWO accent color families (complementary or
 *      analogous pairs read fine; three+ unrelated accents read random).
 *
 * The gate is name/category/color driven so it covers the entire catalog and
 * every future feed refresh — no per-brand or per-item hard-coding.
 *
 * User override (rule 11): when the user explicitly asks for a mixed or
 * unconventional combination, callers pass `allowMixed: true` and the gate
 * approves everything.
 */

export interface CoherencePiece {
  name: string;
  category: string;
  color?: string;
}

export interface CoherenceOptions {
  /** User explicitly requested experimental / mixed styling — skip all checks. */
  allowMixed?: boolean;
  /**
   * Fashion Remix has its own HARD single-accent color invariant
   * (isFormalRemixColorCohesive) — skip the (looser) palette check so the two
   * rules can't disagree; formality + pattern still apply.
   */
  skipColor?: boolean;
}

// ── 1. Formality ─────────────────────────────────────────────────────────────
// Scale: 0 athletic · 1 streetwear · 2 casual · 3 smart-casual · 4 business ·
// 5 formal. Only STRONG signals pin a level — unmarked items are versatile.

const FORMALITY_MARKS: ReadonlyArray<[RegExp, number]> = [
  // formal (5)
  [/\b(tuxedo|tux|gown|black.?tie|evening (dress|jacket|suit)|opera|sequin|cummerbund|tailcoat)\b/i, 5],
  // business (4) — tailoring
  [/\b(suit|double.?breasted|pinstripe|dress (shirt|trouser|pant)|oxford shirt|french cuff)\b/i, 4],
  // streetwear (1)
  [/\b(rugby|hoodie|sweatshirt|varsity|graphic tee|graphic t.?shirt|skate|distressed|baggy|tie.?dye)\b/i, 1],
  // athletic (0)
  [/\b(jogger|sweatpant|track (pant|jacket|suit)|tracksuit|legging|running|training|gym|performance|bike short)\b/i, 0],
];

/** Level for one item, or null when the item is versatile (unmarked). */
export function inferFormalityLevel(name: string): number | null {
  for (const [re, level] of FORMALITY_MARKS) {
    if (re.test(name)) return level;
  }
  return null;
}

// Bags / jewelry / accessories never define an outfit's formality.
const FORMALITY_EXEMPT = new Set(["bag", "jewelry", "accessories"]);

function formalityViolation(pieces: ReadonlyArray<CoherencePiece>): string | null {
  const marked: { name: string; level: number }[] = [];
  for (const p of pieces) {
    if (FORMALITY_EXEMPT.has(p.category)) continue;
    const level = inferFormalityLevel(p.name);
    if (level !== null) marked.push({ name: p.name, level });
  }
  if (marked.length < 2) return null;
  const levels = marked.map((m) => m.level);
  const span = Math.max(...levels) - Math.min(...levels);
  if (span > 2) {
    const hi = marked.find((m) => m.level === Math.max(...levels))!;
    const lo = marked.find((m) => m.level === Math.min(...levels))!;
    return `formality clash: "${hi.name}" vs "${lo.name}"`;
  }
  return null;
}

// ── 2. Pattern ───────────────────────────────────────────────────────────────

const LOUD_PATTERN_RE =
  /\b(stripe|striped|plaid|tartan|check|checked|gingham|madras|floral|paisley|leopard|zebra|cheetah|animal print|camo|camouflage|tie.?dye|argyle|houndstooth|polka|jacquard|patchwork)\b/i;

function patternViolation(pieces: ReadonlyArray<CoherencePiece>): string | null {
  const loud = pieces.filter(
    (p) => !FORMALITY_EXEMPT.has(p.category) && LOUD_PATTERN_RE.test(p.name),
  );
  if (loud.length > 1) {
    return `competing patterns: "${loud[0].name}" + "${loud[1].name}"`;
  }
  return null;
}

// ── 3. Color palette ─────────────────────────────────────────────────────────
// Neutrals always harmonize; every non-neutral accent is bucketed into a color
// family and a look may carry at most TWO accent families.

// Menswear/luxury neutrals — broader than the sneaker-matching regex on
// purpose: navy/olive/brown/khaki function as neutrals in a palette.
const PALETTE_NEUTRAL_RE =
  /(black|white|grey|gray|charcoal|cream|ivory|bone|beige|tan|camel|taupe|sand|stone|khaki|nude|silver|off.?white|navy|brown|chocolate|espresso|denim|natural|ecru|oatmeal|heather)/i;

const COLOR_FAMILIES: ReadonlyArray<[string, RegExp]> = [
  ["red", /(red|burgundy|maroon|wine|crimson|scarlet|cherry|oxblood|brick)/i],
  ["pink", /(pink|rose|blush|fuchsia|magenta|salmon)/i],
  ["orange", /(orange|rust|coral|peach|apricot|terracotta|copper)/i],
  ["yellow", /(yellow|gold|mustard|lemon|butter)/i],
  ["green", /(green|olive|sage|emerald|forest|mint|lime|moss|pistachio|army)/i],
  ["blue", /(blue|cobalt|royal|sky|teal|turquoise|aqua|indigo|periwinkle)/i],
  ["purple", /(purple|lavender|lilac|violet|plum|mauve|orchid)/i],
];

function colorFamily(color: string): string | null {
  if (PALETTE_NEUTRAL_RE.test(color)) return null;
  for (const [family, re] of COLOR_FAMILIES) {
    if (re.test(color)) return family;
  }
  return null; // unknown color strings never fail the gate
}

function colorViolation(pieces: ReadonlyArray<CoherencePiece>): string | null {
  const families = new Set<string>();
  for (const p of pieces) {
    const fam = p.color ? colorFamily(p.color.toLowerCase()) : null;
    if (fam) families.add(fam);
  }
  if (families.size > 2) {
    return `no cohesive palette: ${[...families].join(" + ")} accents in one look`;
  }
  return null;
}

// ── Master gate ──────────────────────────────────────────────────────────────

/**
 * Returns the first human-readable violation, or null when the look is
 * coherent. Split out from the boolean gate so failures can be surfaced in
 * diagnostics/tests.
 */
export function styleCoherenceViolation(
  pieces: ReadonlyArray<CoherencePiece>,
  opts: CoherenceOptions = {},
): string | null {
  if (opts.allowMixed) return null;
  return (
    formalityViolation(pieces) ??
    patternViolation(pieces) ??
    (opts.skipColor ? null : colorViolation(pieces))
  );
}

/** Drop-and-retry gate: true when the whole look reads as one styling decision. */
export function isStyleCoherent(
  pieces: ReadonlyArray<CoherencePiece>,
  opts: CoherenceOptions = {},
): boolean {
  return styleCoherenceViolation(pieces, opts) === null;
}
