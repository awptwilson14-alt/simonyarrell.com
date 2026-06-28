import type { ImageSourcePropType } from "react-native";

type GenderedHero = { men: ImageSourcePropType; women: ImageSourcePropType };

const UNS = (id: string, w = 480, h = 600): { uri: string } => ({
  uri: `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&auto=format&q=80`,
});

// ─── Per-LOOK heroes (used by Home › Trending Looks & For You) ──────────────
// Every look gets its own unique, on-description, gender-matched editorial.
export const LOOK_HERO_IMAGES: Record<string, GenderedHero> = {
  "Côte d'Azur Evening": {
    men: require("../assets/images/looks/cote_dazur_evening_men.png"),
    women: require("../assets/images/looks/cote_dazur_evening_women.png"),
  },
  "Old Money Weekend": {
    men: require("../assets/images/looks/old_money_weekend_men.png"),
    women: require("../assets/images/looks/old_money_weekend_women.png"),
  },
  "Urban Architect": {
    men: require("../assets/images/looks/urban_architect_men.png"),
    women: require("../assets/images/looks/urban_architect_women.png"),
  },
  "Galerie Opening": {
    men: require("../assets/images/looks/galerie_opening_men.png"),
    women: require("../assets/images/looks/galerie_opening_women.png"),
  },
  "Luxury Streetwear Icon": {
    men: require("../assets/images/looks/luxury_streetwear_icon_men.png"),
    women: require("../assets/images/looks/luxury_streetwear_icon_women.png"),
  },
  "Y2K Soirée": {
    men: require("../assets/images/looks/y2k_soiree_men.png"),
    women: require("../assets/images/looks/y2k_soiree_women.png"),
  },
  "Parisian Chic": {
    men: require("../assets/images/looks/parisian_chic_men.png"),
    women: require("../assets/images/looks/parisian_chic_women.png"),
  },
  "Power Dressing": {
    men: require("../assets/images/looks/power_dressing_men.png"),
    women: require("../assets/images/looks/power_dressing_women.png"),
  },
  "Resort Billionaire": {
    men: require("../assets/images/looks/resort_billionaire_men.png"),
    women: require("../assets/images/looks/resort_billionaire_women.png"),
  },
  "Dark Academia": {
    men: require("../assets/images/looks/dark_academia_men.png"),
    women: require("../assets/images/looks/dark_academia_women.png"),
  },
  "Gala Glamour": {
    men: require("../assets/images/looks/gala_glamour_men.png"),
    women: require("../assets/images/looks/gala_glamour_women.png"),
  },
  "Urban Minimalist": {
    men: require("../assets/images/looks/urban_minimalist_men.png"),
    women: require("../assets/images/looks/urban_minimalist_women.png"),
  },
};

// ─── Per-STYLE heroes (used by Explore › Trends and as fallback) ────────────
// Distinct photos so trend cards don't collide with look cards of the same style.
export const STYLE_HERO_IMAGES: Record<string, GenderedHero> = {
  "Old Money": {
    men: require("../assets/images/trends/old_money_men.png"),
    women: require("../assets/images/trends/old_money_women.png"),
  },
  "Luxury Streetwear": {
    men: require("../assets/images/trends/luxury_streetwear_men.png"),
    women: require("../assets/images/trends/luxury_streetwear_women.png"),
  },
  "Vacation Luxe": {
    men: require("../assets/images/trends/vacation_luxe_men.png"),
    women: require("../assets/images/trends/vacation_luxe_women.png"),
  },
  Techwear: {
    men: require("../assets/images/trends/techwear_men.png"),
    women: require("../assets/images/trends/techwear_women.png"),
  },
  "Clean Minimal": {
    men: require("../assets/images/trends/clean_minimal_men.png"),
    women: require("../assets/images/trends/clean_minimal_women.png"),
  },
  "Y2K Revival": {
    men: require("../assets/images/trends/y2k_revival_men.png"),
    women: require("../assets/images/trends/y2k_revival_women.png"),
  },
  Business: {
    men: require("../assets/images/looks/power_dressing_men.png"),
    women: require("../assets/images/looks/power_dressing_women.png"),
  },
  "Avant-garde": {
    men: require("../assets/images/looks/gala_glamour_men.png"),
    women: require("../assets/images/looks/gala_glamour_women.png"),
  },
  Evening: {
    men: require("../assets/images/looks/cote_dazur_evening_men.png"),
    women: require("../assets/images/looks/cote_dazur_evening_women.png"),
  },
  Formal: {
    men: require("../assets/images/occasions/formal_men.png"),
    women: require("../assets/images/occasions/formal_women.png"),
  },
  // Formal Remix — only one unisex editorial hero exists for this occasion
  // (see OCCASION_HEROES below). Map both gender slots to it so the
  // pickStyleHero gender lookup never returns a missing asset, and the home
  // "Trending Now" rail / explore TRENDS subtab show the editorial image
  // instead of falling back to the small TRENDS local image.
  "Formal Remix": {
    men: require("../assets/images/occasions/formal_remix_unisex.png"),
    women: require("../assets/images/occasions/formal_remix_unisex.png"),
  },
};

// ─── Splash / Welcome hero ──────────────────────────────────────────────────
export const SPLASH_HEROES = {
  men: require("../assets/images/splash/splash_hero_men.png"),
  women: require("../assets/images/splash/splash_hero_women.png"),
  unisex: require("../assets/images/splash_hero.png"),
};

export function pickSplashHero(gender: string): ImageSourcePropType {
  const g = (gender || "").toLowerCase();
  if (g === "men") return SPLASH_HEROES.men;
  if (g === "women") return SPLASH_HEROES.women;
  return SPLASH_HEROES.unisex;
}

// ─── Occasion tiles (Style › What's the occasion?) ──────────────────────────
type OccasionEntry = { men: ImageSourcePropType; women: ImageSourcePropType; unisex: ImageSourcePropType };
export const OCCASION_HEROES: Record<string, OccasionEntry> = {
  Casual:       { men: require("../assets/images/occasions/casual_men.png"),   women: require("../assets/images/occasions/casual_women.png"),   unisex: require("../assets/images/occasion_casual.png") },
  "Date Night": { men: require("../assets/images/occasions/date_men.png"),     women: require("../assets/images/occasions/date_women.png"),     unisex: require("../assets/images/occasion_date.png") },
  Work:         { men: require("../assets/images/occasions/work_men.png"),     women: require("../assets/images/occasions/work_women.png"),     unisex: require("../assets/images/occasion_work.png") },
  Vacation:     { men: require("../assets/images/occasions/vacation_men.png"), women: require("../assets/images/occasions/vacation_women.png"), unisex: require("../assets/images/occasion_vacation.png") },
  Event:        { men: require("../assets/images/occasions/event_men.png"),    women: require("../assets/images/occasions/event_women.png"),    unisex: require("../assets/images/occasion_event.png") },
  Streetwear:   { men: require("../assets/images/occasions/street_men.png"),   women: require("../assets/images/occasions/street_women.png"),   unisex: require("../assets/images/occasion_street.png") },
  Formal:       { men: require("../assets/images/occasions/formal_men.png"),   women: require("../assets/images/occasions/formal_women.png"),   unisex: require("../assets/images/occasion_event.png") },
  "Formal Remix": { men: require("../assets/images/occasions/formal_remix_unisex.png"), women: require("../assets/images/occasions/formal_remix_unisex.png"), unisex: require("../assets/images/occasions/formal_remix_unisex.png") },
};

export function pickOccasionHero(label: string, gender: string): ImageSourcePropType | null {
  const entry = OCCASION_HEROES[label];
  if (!entry) return null;
  const g = (gender || "").toLowerCase();
  if (g === "men") return entry.men;
  if (g === "women") return entry.women;
  return entry.unisex;
}

// ─── Celebrity gender map (filter feed by profile) ─────────────────────────
export const CELEB_GENDERS: Record<string, "men" | "women"> = {
  drake: "men", kanye: "men", travis: "men", fabolous: "men", denzel: "men",
  snoop: "men", jeezy: "men", harry: "men", pharrell: "men", asap: "men",
  lewis: "men", sga: "men", nas: "men",
  rihanna: "women", zendaya: "women", audrey: "women", marilyn: "women",
  ladygaga: "women", chloe: "women", kim: "women", maryjblige: "women",
};

export function filterCelebsByGender<T extends { id: string }>(celebs: T[], gender: string): T[] {
  const g = (gender || "").toLowerCase();
  if (g !== "men" && g !== "women") return celebs;
  return celebs.filter((c) => CELEB_GENDERS[c.id] === g);
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function resolve(entry: GenderedHero, gender: string, seed?: string): ImageSourcePropType {
  const g = gender.toLowerCase();
  if (g === "men") return entry.men;
  if (g === "women") return entry.women;
  // Unisex / anything else → alternate per seed so the grid shows both genders
  const pick = hashString(seed ?? "") % 2 === 0 ? "men" : "women";
  return entry[pick];
}

/** Look name → gender-matched editorial (preferred for per-look cards). */
export function pickLookHero(
  lookName: string,
  gender: string,
  seed?: string
): ImageSourcePropType | null {
  const entry = LOOK_HERO_IMAGES[lookName];
  if (!entry) return null;
  return resolve(entry, gender, seed ?? lookName);
}

/** Style/Trend name → gender-matched editorial. */
export function pickStyleHero(
  styleOrName: string,
  gender: string,
  seed?: string
): ImageSourcePropType | null {
  const entry = STYLE_HERO_IMAGES[styleOrName];
  if (!entry) return null;
  return resolve(entry, gender, seed ?? styleOrName);
}
