import type { ImageSourcePropType } from "react-native";

const UNS = (id: string, w = 480, h = 600): { uri: string } => ({
  uri: `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&auto=format&q=80`,
});

type GenderedHero = { men: ImageSourcePropType; women: ImageSourcePropType };

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
    men: UNS("1517841905240-472988babdf9"),
    women: UNS("1566174053879-31528523f8ae"),
  },
};

export function pickStyleHero(
  styleOrName: string,
  gender: string
): ImageSourcePropType | null {
  const entry = STYLE_HERO_IMAGES[styleOrName];
  if (!entry) return null;
  const g = gender.toLowerCase() === "men" ? "men" : "women";
  return entry[g];
}
