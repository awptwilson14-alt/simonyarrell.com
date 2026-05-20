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
    men: UNS("1507003211169-0a1dd7228f2d"),
    women: UNS("1469334031218-e382a71b716b"),
  },
  "Luxury Streetwear": {
    men: require("../assets/images/streetwear_hero_men.png"),
    women: UNS("1556821840-3a63f15732ce"),
  },
  "Vacation Luxe": {
    men: UNS("1517841905240-472988babdf9"),
    women: UNS("1483985988355-763728e1cfc4"),
  },
  Techwear: {
    men: UNS("1539008835657-9e8e9680c956"),
    women: UNS("1573496359808-0ed5975d9a2a"),
  },
  "Clean Minimal": {
    men: UNS("1490481911-ae6d03e0c7a7"),
    women: UNS("1503342217505-b0a15ec3261c"),
  },
  "Y2K Revival": {
    men: UNS("1542272054537-4845f1353d17"),
    women: UNS("1522337360492-f0b819058e50"),
  },
  Business: {
    men: UNS("1519085360753-af0119f7cbe7"),
    women: UNS("1509631179647-0177331693ae"),
  },
  "Avant-garde": {
    men: UNS("1566174053879-31528523f8ae"),
    women: UNS("1599643477877-530eb83abc8e"),
  },
};

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
