export interface OutfitPiece {
  id: string;
  name: string;
  brand: string;
  price: number;
  category: string;
  color: string;
  imageUrl?: string;
  /** Bundled local asset (output of `require("...png")`). Preferred over
   *  imageUrl by ResilientImage. Threaded from CatalogItem.localProductImage
   *  for items with AI-generated product photos shipped in the bundle. */
  localImage?: number;
  purchaseUrl?: string;
  // True when the engine picked this piece from the signature-house pool
  // for the current style/celeb (see outfitEngine.ts addPiece). Drives the
  // "★ SIGNATURE" chip in the look-detail shop panel. Undefined for the
  // hand-curated static LOOKS array.
  signature?: boolean;
}

export interface Look {
  id: string;
  name: string;
  description: string;
  occasion: string;
  season: string;
  // Who the look is styled for. HARD constraint at render time — a profile
  // set to "Men" must never see a look tagged "women", and vice versa.
  // "unisex" matches every profile. Required on the static LOOKS array and
  // every AI-generated look (the AI stylist resolver stamps this from the
  // requesting profile's gender so dynamic looks honour the same rule).
  gender: "men" | "women" | "unisex";
  estimatedPrice: number;
  image: any;
  pieces: OutfitPiece[];
  style: string;
  tags: string[];
  // When the user saved this look (ISO 8601). Saved looks expire 7 days after
  // this timestamp unless the user saves/updates them again (which refreshes
  // it). Only set once a look is saved; absent on generated / static looks.
  savedAt?: string;
  // Named color palette this look was composed around (e.g. "Bougainvillea",
  // "Executive Suite"). Surfaced to users on the look-detail page to make the
  // trifecta — style × palette × season — visible. Optional because the
  // hand-curated static LOOKS array doesn't pre-compute palette names.
  colorPalette?: string;
  // Celebrity attribution — set on every look produced by a "GENERATE MY <CELEB>
  // LOOK" session so the celebrity context survives navigation into the look
  // detail page (and anywhere the look is later saved/displayed). Undefined
  // for regular generations and for the static LOOKS array.
  inspiredBy?: string;
  // Hex color swatches the AI stylist composed this look around — rendered
  // as a small swatch row on the look-detail page so users see the editorial
  // palette, not just its name. Only set for AI Stylist looks; values are
  // validated as #RRGGBB at render time so a malformed entry can't crash RN.
  paletteColors?: string[];
  // Fashion Remix only: a colour + budget-matched sneaker the user could swap
  // in for the look's existing shoe. Priced within the same budget headroom and
  // biased toward pricier, high-end / limited-edition pairs as the budget
  // climbs. Additive suggestion — never part of `pieces` or `estimatedPrice`.
  sneakerAlt?: OutfitPiece;
}

export interface Celebrity {
  id: string;
  name: string;
  style: string;
  description: string;
  looks: string[];
}

export interface Trend {
  id: string;
  name: string;
  description: string;
  image: any;
  tags: string[];
  vibe: string;
}

// Canonical trend-membership predicate. Single source of truth for every
// surface that counts/filters saved items by trend. An item is "in" a trend
// when its style equals the trend name OR (if it has tags) its tags include
// it. Centralized in batch 59 after architect flagged drift risk across
// duplicated call sites (batches 50/54/56/58). Accepts the minimal shape so
// it composes with Look, Product, and ad-hoc objects without type juggling
// — Product has no `tags` field, so the optional chain returns undefined and
// the nullish coalesce makes it fall through to the style equality check.
//   Surfaces: /explore TrendCard SAVED badge (50), home Trends-You-Love rail
//   (54), profile savedTrends + trendFilter (56), home Trending Now badge
//   (58), profile saved-products trend filter (60). All call this helper;
//   counts and filter semantics cannot drift. Name kept as isLookInTrend
//   even though products use it too — products entering trends via `style`
//   is a natural Look-like read, and renaming would churn 6+ call sites.
export const isLookInTrend = (
  item: { style: string; tags?: string[] },
  trendName: string,
): boolean => item.style === trendName || (item.tags?.includes(trendName) ?? false);

export interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  category: string;
  style: string;
  description: string;
  imageUrl?: string;
  /** Bundled local asset (output of `require("...png")`). Preferred over
   *  imageUrl by ResilientImage. Threaded from OutfitPiece.localImage when
   *  the user saves a piece backed by an AI-generated catalog photo. */
  localImage?: number;
  purchaseUrl: string;
  // Celeb attribution carried over from the parent Look when the user saved
  // this piece from a celeb-inspired generation. Optional — catalog PRODUCTS
  // and generic shop saves leave it undefined. Matches Look.inspiredBy shape.
  inspiredBy?: string;
  // Back-reference to the source Look so the user can tap a saved piece and
  // jump back to the full outfit it came from. Optional for the same reason.
  lookId?: string;
}

// ─── Unsplash helpers ───────────────────────────────────────────────────────
// `isBadUnsId` centralizes the visual-audit denylist; see `badImageIds.ts`.
// UNS returns undefined for blocked IDs so the look detail's ResilientImage
// renders the editorial brand-monogram fallback instead.
import { isBadUnsId } from "./badImageIds";
import { LOCAL_PRODUCT_ASSETS } from "../assets/images/catalog/_index";

const UNS = (id: string, w = 480, h = 600): string | undefined => {
  if (isBadUnsId(id)) return undefined;
  return `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&auto=format&q=80`;
};

// ─── Celebrities ────────────────────────────────────────────────────────────
export const CELEBRITIES: Celebrity[] = [
  { id: "c1", name: "Zendaya", style: "Avant-garde Luxury", description: "Bold, theatrical fashion that pushes boundaries", looks: ["Old Money", "Gala Glam", "Street Luxe"] },
  { id: "c2", name: "Bella Hadid", style: "Y2K Streetwear", description: "Low-rise denim, vintage pieces, and bold accessories", looks: ["Y2K Revival", "Street Style", "Club Luxe"] },
  { id: "c3", name: "Hailey Bieber", style: "Clean Minimal", description: "Effortless, understated luxury with clean lines", looks: ["Clean Girl", "Business Casual", "Weekend Luxe"] },
  { id: "c4", name: "ASAP Rocky", style: "Luxury Streetwear", description: "Designer streetwear with an art-world edge", looks: ["Street Art", "Festival Luxe", "Urban Formal"] },
  { id: "c5", name: "Timothée Chalamet", style: "Old Money Indie", description: "Vintage-inspired luxury with a poetic sensibility", looks: ["Indie Formal", "Old Money", "Red Carpet"] },
  { id: "c6", name: "Rihanna", style: "Bold Avant-garde", description: "Fearless, maximum-impact fashion statements", looks: ["Maternity Glam", "Street Couture", "Power Dressing"] },
  { id: "c7", name: "Kendall Jenner", style: "Model Off-Duty", description: "Relaxed luxury with supermodel proportions in mind", looks: ["Model Off-Duty", "Vacation Luxe", "Gala Formal"] },
  { id: "c8", name: "Harry Styles", style: "Gender-Fluid Glam", description: "Flamboyant, playful, rule-breaking luxury", looks: ["Gucci Glam", "Vintage Eclectic", "Stage Luxe"] },
  { id: "c9", name: "Shai Gilgeous-Alexander", style: "Unique NBA Editorial", description: "Quiet luxury and editorial styling from the NBA's most original dresser", looks: ["Tunnel Walk", "OKC Quiet", "Japanese Edit"] },
];

// ─── Trends ─────────────────────────────────────────────────────────────────
export const TRENDS: Trend[] = [
  // Fashion Remix — new category from batch 96. Inserted first so it leads the
  // home "Trending Now" rail (which only shows the first N entries) and
  // signals the freshness of this offering. Image is the same editorial hero
  // used on the /style occasion chip so the surface reads consistently.
  { id: "t7", name: "Fashion Remix", description: "Complete formal looks — tailoring, formal shoes, the works — each with a clean luxury sneaker ready to swap in for an instantly relaxed remix.", image: require("../assets/images/occasions/formal_remix_unisex.png"), tags: ["Tuxedo", "Gown", "Sneakers", "Valentino", "Brioni"], vibe: "Couture meets the street" },
  { id: "t1", name: "Old Money", description: "Understated wealth — heritage brands, neutral palette, impeccable tailoring", image: require("../assets/images/look_old_money.png"), tags: ["Ralph Lauren", "Loro Piana", "cashmere", "tweed"], vibe: "Inherited wealth, quiet confidence" },
  { id: "t2", name: "Luxury Streetwear", description: "High-end street aesthetics — designer logos, premium sneakers, oversized silhouettes", image: require("../assets/images/look_streetwear.png"), tags: ["Off-White", "Balenciaga", "Fear of God", "hoodies"], vibe: "Street meets couture" },
  { id: "t3", name: "Vacation Luxe", description: "Resort wear redefined — flowing silks, premium linens, sun-kissed sophistication", image: require("../assets/images/look_vacation.png"), tags: ["Zimmermann", "Loro Piana", "silk", "linen"], vibe: "Mediterranean billionaire summer" },
  { id: "t4", name: "Techwear", description: "Functional futurism — technical fabrics, utility pockets, dark palette precision", image: require("../assets/images/look_techwear.png"), tags: ["Acronym", "Stone Island", "Arc'teryx", "cargo"], vibe: "Cyberpunk meets luxury utility" },
  { id: "t5", name: "Clean Minimal", description: "Negative space as luxury — monochromatic palettes, perfect proportions, no excess", image: require("../assets/images/hero_banner.png"), tags: ["The Row", "Jil Sander", "COS", "minimal"], vibe: "Silence is the loudest statement" },
  { id: "t6", name: "Y2K Revival", description: "2000s nostalgia elevated — low-rise silhouettes, metallics, butterfly details", image: require("../assets/images/looks/y2k_soiree_women.png"), tags: ["Versace", "D&G", "Von Dutch", "metallic"], vibe: "Paris Hilton meets Dua Lipa" },
];

// ─── Looks ──────────────────────────────────────────────────────────────────
export const LOOKS: Look[] = [
  {
    id: "l1",
    name: "Côte d'Azur Evening",
    description: "A masterclass in resort elegance — fluid silk jersey meets sculptural jewelry for a dinner that demands attention without trying.",
    occasion: "Evening", season: "Summer", gender: "women", estimatedPrice: 3200,
    image: require("../assets/images/looks/cote_dazur_evening_women.png"),
    style: "Vacation Luxe", tags: ["evening", "resort", "summer"],
    pieces: [
      { id: "p1", name: "Silk Jersey Column Dress", brand: "The Row", price: 1890, category: "Dress", color: "Ivory", imageUrl: UNS("1515886657613-9f3515b0c78f"), purchaseUrl: "https://www.therow.com" },
      { id: "p2", name: "Gold Sculptural Cuff", brand: "Bottega Veneta", price: 680, category: "Jewelry", color: "Gold", imageUrl: UNS("1599643477877-530eb83abc8e"), purchaseUrl: "https://www.bottegaveneta.com" },
      { id: "p3", name: "Leather Mule Heel", brand: "Manolo Blahnik", price: 620, category: "Shoes", color: "Nude", imageUrl: UNS("1543163521-1bf539c55dd2"), purchaseUrl: "https://www.manoloblahnik.com" },
    ],
  },
  {
    id: "l2",
    name: "Old Money Weekend",
    description: "The art of looking effortless when everything is intentional. Heritage fabrics, quiet logos, and the confidence of old wealth.",
    occasion: "Casual", season: "Autumn", gender: "men", estimatedPrice: 2800,
    image: require("../assets/images/looks/old_money_weekend_men.png"),
    style: "Old Money", tags: ["weekend", "casual", "autumn"],
    pieces: [
      { id: "p4", name: "Cashmere Polo Sweater", brand: "Loro Piana", price: 1200, category: "Top", color: "Camel", imageUrl: UNS("1521572163474-6864f9cf17ab"), purchaseUrl: "https://www.loropiana.com" },
      { id: "p5", name: "Tailored Chino", brand: "Ralph Lauren Purple Label", price: 480, category: "Bottom", color: "Stone", imageUrl: UNS("1552902865-b72c031ac5ea"), purchaseUrl: "https://www.ralphlauren.com" },
      { id: "p6", name: "Suede Penny Loafer", brand: "Gucci", price: 790, category: "Shoes", color: "Tan", imageUrl: UNS("1614252235316-8c857d38b5f4"), purchaseUrl: "https://www.gucci.com" },
      { id: "p7", name: "Canvas Tote", brand: "Goyard", price: 330, category: "Bag", color: "Natural", imageUrl: UNS("1571513800374-841571dbf2e2"), purchaseUrl: "https://www.goyard.com" },
    ],
  },
  {
    id: "l3",
    name: "Urban Architect",
    description: "For the city that never sleeps and the man who never blends in. Technical precision meets downtown edge.",
    occasion: "Street", season: "Winter", gender: "men", estimatedPrice: 4100,
    image: require("../assets/images/looks/urban_architect_men.png"),
    style: "Techwear", tags: ["urban", "street", "winter"],
    pieces: [
      { id: "p8", name: "GORE-TEX Shell Jacket", brand: "Acronym", price: 1890, category: "Outerwear", color: "Black", imageUrl: UNS("1539008835657-9e8e9680c956"), purchaseUrl: "https://www.acrnm.com" },
      { id: "p9", name: "Cargo Jogger", brand: "Stone Island Shadow", price: 680, category: "Bottom", color: "Black", imageUrl: UNS("1624378441164-f3b5a4ec2a53"), purchaseUrl: "https://www.stoneisland.com" },
      { id: "p10", name: "Air Drone Sneaker", brand: "Nike x Off-White", price: 420, category: "Shoes", color: "Black", imageUrl: UNS("1542291026-7eec264c27ff"), purchaseUrl: "https://www.off---white.com" },
      { id: "p11", name: "Utility Crossbody", brand: "Cote&Ciel", price: 380, category: "Bag", color: "Black", imageUrl: UNS("1584917865442-de89df76afd3"), purchaseUrl: "https://www.coteetciel.com" },
    ],
  },
  {
    id: "l4",
    name: "Galerie Opening",
    description: "Art world royalty. Where minimalist fashion becomes the canvas and the collector's eye speaks through restraint.",
    occasion: "Cultural", season: "All Season", gender: "women", estimatedPrice: 5600,
    image: require("../assets/images/looks/galerie_opening_women.png"),
    style: "Clean Minimal", tags: ["art", "gallery", "minimal"],
    pieces: [
      { id: "p13", name: "Wide-Leg Wool Trouser", brand: "Jil Sander", price: 890, category: "Bottom", color: "Ivory", imageUrl: UNS("1583744946564-b52ac1c389c8"), purchaseUrl: "https://www.jilsander.com" },
      { id: "p14", name: "Oversized Blazer", brand: "The Row", price: 2100, category: "Outerwear", color: "Cream", imageUrl: UNS("1507003211169-0a1dd7228f2d"), purchaseUrl: "https://www.therow.com" },
      { id: "p15", name: "Knit Tank", brand: "Toteme", price: 380, category: "Top", color: "White", imageUrl: UNS("1503342217505-b0a15ec3261c"), purchaseUrl: "https://www.toteme-studio.com" },
      { id: "p16", name: "Square Toe Boot", brand: "Bottega Veneta", price: 1200, category: "Shoes", color: "Black", imageUrl: UNS("1608256246005-4e6b4e65f82c"), purchaseUrl: "https://www.bottegaveneta.com" },
    ],
  },
  {
    id: "l5",
    name: "Luxury Streetwear Icon",
    description: "Where the block meets the runway. Maximum drip, minimum effort, all designer.",
    occasion: "Street", season: "Spring", gender: "men", estimatedPrice: 3800,
    image: require("../assets/images/looks/luxury_streetwear_icon_men.png"),
    style: "Luxury Streetwear", tags: ["street", "spring", "logo"],
    pieces: [
      { id: "p18", name: "Logo Hoodie", brand: "Balenciaga", price: 890, category: "Top", color: "Black", imageUrl: UNS("1556821840-3a63f15732ce"), purchaseUrl: "https://www.balenciaga.com" },
      { id: "p19", name: "Baggy Denim", brand: "Amiri", price: 680, category: "Bottom", color: "Indigo", imageUrl: UNS("1542272054537-4845f1353d17"), purchaseUrl: "https://www.amiri.com" },
      { id: "p20", name: "Triple S Sneaker", brand: "Balenciaga", price: 1095, category: "Shoes", color: "White", imageUrl: UNS("1491553895911-0055eca6402d"), purchaseUrl: "https://www.balenciaga.com" },
      { id: "p21", name: "Logo Cap", brand: "Gucci", price: 340, category: "Accessories", color: "Black", imageUrl: UNS("1473496169904-658ba7574b0d"), purchaseUrl: "https://www.gucci.com" },
    ],
  },
  {
    id: "l6",
    name: "Y2K Soirée",
    description: "The early 2000s never looked this good. Low-rise sophistication with maximalist confidence.",
    occasion: "Party", season: "Summer", gender: "women", estimatedPrice: 2400,
    image: require("../assets/images/looks/y2k_soiree_women.png"),
    style: "Y2K Revival", tags: ["party", "y2k", "metallic"],
    pieces: [
      { id: "p23", name: "Crystal Mini Skirt", brand: "Versace", price: 1200, category: "Bottom", color: "Gold", imageUrl: UNS("1483985988355-763728e1935b"), purchaseUrl: "https://www.versace.com" },
      { id: "p24", name: "Corset Top", brand: "Dolce & Gabbana", price: 680, category: "Top", color: "Silver", imageUrl: UNS("1525507119028-ed4c629a60a3"), purchaseUrl: "https://www.dolcegabbana.com" },
      { id: "p25", name: "Platform Mule", brand: "Versace", price: 520, category: "Shoes", color: "Gold", imageUrl: UNS("1515347619252-60a4bf4fff4f"), purchaseUrl: "https://www.versace.com" },
    ],
  },
  {
    id: "l7",
    name: "Parisian Chic",
    description: "Effortless French sophistication — tailored silhouettes, neutral tones, luxurious fabrics with zero excess.",
    occasion: "Casual", season: "Spring", gender: "women", estimatedPrice: 3200,
    image: require("../assets/images/looks/parisian_chic_women.png"),
    style: "Old Money", tags: ["french", "minimal", "chic"],
    pieces: [
      { id: "p26", name: "Silk Slip Dress", brand: "Sandro", price: 380, category: "Dress", color: "Champagne", imageUrl: UNS("1490481651871-ab68de25d43d"), purchaseUrl: "https://www.sandro-paris.com" },
      { id: "p27", name: "Tailored Blazer", brand: "A.P.C.", price: 490, category: "Outerwear", color: "Beige", imageUrl: UNS("1593030761757-71fae45fa0e7"), purchaseUrl: "https://www.apc.fr" },
      { id: "p28", name: "Slingback Kitten Heel", brand: "Miu Miu", price: 720, category: "Shoes", color: "Nude", imageUrl: UNS("1573100925118-870b8efc799d"), purchaseUrl: "https://www.miumiu.com" },
    ],
  },
  {
    id: "l8",
    name: "Power Dressing",
    description: "Command any room. Structured shoulders, bold tailoring, Italian leather — authority made wearable.",
    occasion: "Work", season: "All Season", gender: "women", estimatedPrice: 4800,
    image: require("../assets/images/looks/power_dressing_women.png"),
    style: "Business", tags: ["work", "power", "tailored"],
    pieces: [
      { id: "p29", name: "Double-Breasted Suit", brand: "Balmain", price: 2800, category: "Outerwear", color: "Black", imageUrl: UNS("1605812860427-4024433a70fd"), purchaseUrl: "https://www.balmain.com" },
      { id: "p30", name: "Silk Blouse", brand: "Theory", price: 295, category: "Top", color: "White", imageUrl: UNS("1551803091-e20673f15770"), purchaseUrl: "https://www.theory.com" },
      { id: "p31", name: "Patent Leather Pump", brand: "Jimmy Choo", price: 595, category: "Shoes", color: "Black", imageUrl: UNS("1551489186-cf8726f514f8"), purchaseUrl: "https://www.jimmychoo.com" },
      { id: "p32", name: "Structured Tote", brand: "Celine", price: 1950, category: "Bag", color: "Black", imageUrl: UNS("1606122017369-d782bbb78f32"), purchaseUrl: "https://www.celine.com" },
    ],
  },
  {
    id: "l9",
    name: "Resort Billionaire",
    description: "Mediterranean money — silk kaftans, handwoven hats, zero logos, maximum presence.",
    occasion: "Resort", season: "Summer", gender: "women", estimatedPrice: 5600,
    image: require("../assets/images/looks/resort_billionaire_women.png"),
    style: "Vacation Luxe", tags: ["resort", "summer", "luxury"],
    pieces: [
      { id: "p33", name: "Cashmere Kaftan", brand: "Loro Piana", price: 3200, category: "Dress", color: "Sand", imageUrl: UNS("1556905055-8f358a7a47b2"), purchaseUrl: "https://www.loropiana.com" },
      { id: "p34", name: "Handwoven Straw Hat", brand: "Jacquemus", price: 380, category: "Accessories", color: "Natural", imageUrl: UNS("1632149877166-f75d49000351"), purchaseUrl: "https://www.jacquemus.com" },
      { id: "p35", name: "Woven Flat Sandal", brand: "Bottega Veneta", price: 680, category: "Shoes", color: "Tan", imageUrl: UNS("1546182990-dffeafbe841d"), purchaseUrl: "https://www.bottegaveneta.com" },
    ],
  },
  {
    id: "l10",
    name: "Dark Academia",
    description: "Books, tweed, and old libraries. Rich cognac leathers, plaid layers, and intellectual luxury.",
    occasion: "Casual", season: "Autumn", gender: "men", estimatedPrice: 2900,
    image: require("../assets/images/looks/dark_academia_men.png"),
    style: "Old Money", tags: ["academic", "autumn", "tweed"],
    pieces: [
      { id: "p36", name: "Harris Tweed Blazer", brand: "Ralph Lauren", price: 1200, category: "Outerwear", color: "Brown Plaid", imageUrl: UNS("1594633312681-425c7b97ccd1"), purchaseUrl: "https://www.ralphlauren.com" },
      { id: "p37", name: "Merino Roll-Neck", brand: "John Smedley", price: 225, category: "Top", color: "Camel", imageUrl: UNS("1620799140408-edc6dcb6d633"), purchaseUrl: "https://www.johnsmedley.com" },
      { id: "p38", name: "Slim Wool Trouser", brand: "Incotex", price: 480, category: "Bottom", color: "Dark Brown", imageUrl: UNS("1594938298603-c8148c4dae35"), purchaseUrl: "https://www.incotex.com" },
      { id: "p39", name: "Oxford Brogue", brand: "Church's", price: 620, category: "Shoes", color: "Cognac", imageUrl: UNS("1531310197839-ccf54634509e"), purchaseUrl: "https://www.church-footwear.com" },
    ],
  },
  {
    id: "l11",
    name: "Gala Glamour",
    description: "Black-tie redefined — sculptural silhouettes, jewel-toned satins, statement jewellery, all eyes on you.",
    occasion: "Evening", season: "All Season", gender: "women", estimatedPrice: 7400,
    image: require("../assets/images/looks/gala_glamour_women.png"),
    style: "Avant-garde", tags: ["gala", "evening", "glamour"],
    pieces: [
      { id: "p40", name: "Column Gown", brand: "Valentino Haute Couture", price: 4800, category: "Dress", color: "Crimson", imageUrl: UNS("1566174053879-31528523f8ae"), purchaseUrl: "https://www.valentino.com" },
      { id: "p41", name: "Diamond Drop Earrings", brand: "Bulgari", price: 1800, category: "Jewelry", color: "Gold", imageUrl: UNS("1626497764746-6dc36546b388"), purchaseUrl: "https://www.bulgari.com" },
      { id: "p42", name: "Satin Stiletto", brand: "Amina Muaddi", price: 680, category: "Shoes", color: "Crimson", imageUrl: UNS("1535043934128-cf0b28d52f95"), purchaseUrl: "https://www.aminamuaddi.com" },
    ],
  },
  {
    id: "l12",
    name: "Urban Minimalist",
    description: "City uniform perfected — monochrome stacks, architectural cuts, premium basics that signal taste.",
    occasion: "Street", season: "All Season", gender: "men", estimatedPrice: 2100,
    image: require("../assets/images/looks/urban_minimalist_men.png"),
    style: "Clean Minimal", tags: ["urban", "minimal", "monochrome"],
    pieces: [
      { id: "p43", name: "Oversized Wool Coat", brand: "COS", price: 380, category: "Outerwear", color: "Charcoal", imageUrl: UNS("1544022613-e87ca75a784a"), purchaseUrl: "https://www.cosstores.com" },
      { id: "p44", name: "Relaxed Crewneck", brand: "Sunspel", price: 195, category: "Top", color: "Black", imageUrl: UNS("1620012253295-c15cc3e65df4"), purchaseUrl: "https://www.sunspel.com" },
      { id: "p45", name: "Slim Tailored Trouser", brand: "Acne Studios", price: 480, category: "Bottom", color: "Black", imageUrl: UNS("1597633425046-08f5110420b5"), purchaseUrl: "https://www.acnestudios.com" },
      { id: "p46", name: "Court Sneaker", brand: "Common Projects", price: 450, category: "Shoes", color: "White", imageUrl: UNS("1600185365483-26d7a4cc7519"), purchaseUrl: "https://www.commonprojects.com" },
    ],
  },
];

// ─── Static LOOKS piece-image autopatch ─────────────────────────────────────
//
// Walks every piece in every static LOOK at module load and stamps
// `localImage` from `LOCAL_PRODUCT_ASSETS`. Mirrors the autopatch in
// outfitEngine.ts for catalog items: keeps the asset registry in one file
// instead of 43 inline `require()` calls scattered through LOOKS. Pieces
// not present in the registry are left untouched and fall back to their
// existing `imageUrl` (Unsplash placeholder) → ResilientImage editorial
// monogram chain.
for (const look of LOOKS) {
  for (const piece of look.pieces) {
    const localAsset = LOCAL_PRODUCT_ASSETS[piece.id];
    if (localAsset && !piece.localImage) {
      piece.localImage = localAsset;
    }
  }
}

// ─── PRODUCTS shop array piece-image autopatch ─────────────────────────────
// Same pattern as LOOKS above and the CATALOG autopatch in outfitEngine.ts:
// every product whose id is present in LOCAL_PRODUCT_ASSETS gets `localImage`
// stamped at module load so ProductCard / ResilientImage prefer the
// editorial PNG over the Unsplash placeholder. Applied AFTER the PRODUCTS
// declaration below — see further down.


// ─── Products ────────────────────────────────────────────────────────────────
export const PRODUCTS: Product[] = [
  // Ultra Luxury
  { id: "pr1", name: "Cassette Mini Bag", brand: "Bottega Veneta", price: 2890, category: "Bag", style: "Clean Minimal", description: "Iconic intrecciato weave in obsidian nappa leather", imageUrl: UNS("1548036328-c9fa89d128fa"), purchaseUrl: "https://www.bottegaveneta.com" },
  { id: "pr2", name: "Classic Flap Bag", brand: "Chanel", price: 8800, category: "Bag", style: "Old Money", description: "The most iconic shoulder bag in fashion history", imageUrl: UNS("1604176354204-9268737828e4"), purchaseUrl: "https://www.chanel.com" },
  { id: "pr3", name: "Saddle Bag", brand: "Christian Dior", price: 3900, category: "Bag", style: "Luxury", description: "The house's most recognisable saddle silhouette", imageUrl: UNS("1590874175748-39b18e7ab1e9"), purchaseUrl: "https://www.dior.com" },
  { id: "pr4", name: "Neverfull MM", brand: "Louis Vuitton", price: 2070, category: "Bag", style: "Luxury Streetwear", description: "The world's most-wanted tote in Monogram canvas", imageUrl: UNS("1539109136881-3be0616acf4b"), purchaseUrl: "https://us.louisvuitton.com" },
  { id: "pr5", name: "Puzzle Bag Small", brand: "Loewe", price: 2950, category: "Bag", style: "Clean Minimal", description: "Jonathan Anderson's geometric masterpiece", imageUrl: UNS("1571945153237-4929e783af4a"), purchaseUrl: "https://www.loewe.com" },

  // Shoes
  { id: "pr6", name: "Triple S Sneaker", brand: "Balenciaga", price: 1095, category: "Shoes", style: "Luxury Streetwear", description: "The original oversized sneaker that started a movement", imageUrl: UNS("1564594985645-4427056e22e2"), purchaseUrl: "https://www.balenciaga.com" },
  { id: "pr7", name: "Tabi Boot", brand: "Maison Margiela", price: 1340, category: "Shoes", style: "Avant-garde", description: "The split-toe boot that became a cultural icon", imageUrl: UNS("1612722432474-b971cdcea546"), purchaseUrl: "https://www.maisonmargiela.com" },
  { id: "pr8", name: "Horsebit Loafer", brand: "Gucci", price: 890, category: "Shoes", style: "Old Money", description: "The 1953 classic — every wardrobe's anchor", imageUrl: UNS("1542838686-37da4a9fd1b3"), purchaseUrl: "https://www.gucci.com" },
  { id: "pr9", name: "Crystal Embellished Pump", brand: "Manolo Blahnik", price: 1150, category: "Shoes", style: "Evening", description: "Swarovski crystals on a 90mm stiletto", imageUrl: UNS("1595950653106-6c9ebd614d3a"), purchaseUrl: "https://www.manoloblahnik.com" },
  { id: "pr10", name: "GORE-TEX Sneaker", brand: "Rick Owens", price: 1050, category: "Shoes", style: "Techwear", description: "Sculpted rubber sole, brutal silhouette", imageUrl: UNS("1551232864-3f0890e580d9"), purchaseUrl: "https://www.rickowens.eu" },

  // Outerwear
  { id: "pr11", name: "Cashmere Robe Coat", brand: "Max Mara", price: 3200, category: "Outerwear", style: "Old Money", description: "The definitive coat, in pure camel cashmere", imageUrl: UNS("1517248135467-4c7edcad34c4"), purchaseUrl: "https://www.maxmara.com" },
  { id: "pr12", name: "Technical Shell Jacket", brand: "Arc'teryx", price: 895, category: "Outerwear", style: "Techwear", description: "GORE-TEX Pro, waterproof, volcanic black", imageUrl: UNS("1591047139829-d91aecb6caea"), purchaseUrl: "https://www.arcteryx.com" },
  { id: "pr13", name: "Down Puffer Coat", brand: "Moncler", price: 1450, category: "Outerwear", style: "Luxury Streetwear", description: "The Alpine luxury puffer that defines après-ski", imageUrl: UNS("1608234807905-4466023792f5"), purchaseUrl: "https://www.moncler.com" },
  { id: "pr14", name: "Structured Blazer", brand: "Balmain", price: 2400, category: "Outerwear", style: "Power Dressing", description: "Gold-button Parisian power dressing", imageUrl: UNS("1564859228273-274232fdb516"), purchaseUrl: "https://www.balmain.com" },
  { id: "pr15", name: "Heritage Trench", brand: "Burberry", price: 2290, category: "Outerwear", style: "Old Money", description: "The original gabardine trench, still perfect", imageUrl: UNS("1572804013427-4d7ca7268217"), purchaseUrl: "https://www.burberry.com" },

  // RTW / Tops / Bottoms
  { id: "pr16", name: "Oversized Blazer", brand: "The Row", price: 2100, category: "Outerwear", style: "Clean Minimal", description: "Fluid construction in cream wool-silk", imageUrl: UNS("1542838132-92c53300491e"), purchaseUrl: "https://www.therow.com" },
  { id: "pr17", name: "Silk Bias Slip Dress", brand: "Reformation", price: 248, category: "Dress", style: "Vacation Luxe", description: "Sustainable silk in champagne — effortless resort", imageUrl: UNS("1611652022419-a9419f74343d"), purchaseUrl: "https://www.thereformation.com" },
  { id: "pr18", name: "Low-Rise Barrel Denim", brand: "Agolde", price: 238, category: "Bottom", style: "Y2K Revival", description: "90s-inspired low rise in authentic indigo wash", imageUrl: UNS("1490578474895-699cd4e2cf59"), purchaseUrl: "https://www.agolde.com" },
  { id: "pr19", name: "Logo Hoodie", brand: "Balenciaga", price: 890, category: "Top", style: "Luxury Streetwear", description: "Oversized French terry with rubber logo", imageUrl: UNS("1617137984095-74e4e5e3613f"), purchaseUrl: "https://www.balenciaga.com" },
  { id: "pr20", name: "Baby Cashmere Turtleneck", brand: "Brunello Cucinelli", price: 1650, category: "Top", style: "Old Money", description: "The rarest cashmere, the most perfect knit", imageUrl: UNS("1614608682850-e0d6ed316d47"), purchaseUrl: "https://www.brunellocucinelli.com" },
  { id: "pr21", name: "Oasi Cashmere Polo", brand: "Loro Piana", price: 1200, category: "Top", style: "Old Money", description: "Ultra-fine Oasi cashmere in natural camel", imageUrl: UNS("1551488831-00ddcb6c6bd3"), purchaseUrl: "https://www.loropiana.com" },

  // Accessories
  { id: "pr22", name: "Silk GG Scarf", brand: "Gucci", price: 490, category: "Accessories", style: "Luxury Streetwear", description: "GG print in satin silk, a perennial icon", imageUrl: UNS("1611558709798-e009c8fd7706"), purchaseUrl: "https://www.gucci.com" },
  { id: "pr23", name: "Oversized Sun Hat", brand: "Jacquemus", price: 380, category: "Accessories", style: "Vacation Luxe", description: "The wicker hat that launched a thousand posts", imageUrl: UNS("1620916566398-39f1143ab7be"), purchaseUrl: "https://www.jacquemus.com" },
  { id: "pr24", name: "Gold Bamboo Hoops", brand: "Tory Burch", price: 148, category: "Jewelry", style: "Old Money", description: "18k gold-dipped bamboo hoop earrings", imageUrl: UNS("1582738411706-bfc8e691d1c2"), purchaseUrl: "https://www.toryburch.com" },
  { id: "pr25", name: "Tonneau Watch", brand: "Tom Ford", price: 3200, category: "Accessories", style: "Luxury", description: "Brushed steel case, deep brown dial, eternal", imageUrl: UNS("1523275335684-37898b6baf30"), purchaseUrl: "https://www.tomford.com" },

  // Contemporary
  { id: "pr26", name: "The Perfect Blazer", brand: "Zara", price: 149, category: "Outerwear", style: "Contemporary", description: "Runway-inspired tailoring at high street prices", imageUrl: UNS("1505022610485-0249ba5b3675"), purchaseUrl: "https://www.zara.com" },
  { id: "pr27", name: "Linen Wide Trousers", brand: "COS", price: 110, category: "Bottom", style: "Clean Minimal", description: "Architectural linen, relaxed drape, enduring", imageUrl: UNS("1552346154-21d32810aba3"), purchaseUrl: "https://www.cosstores.com" },
  { id: "pr28", name: "Smocked Mini Dress", brand: "Ganni", price: 295, category: "Dress", style: "Contemporary", description: "The Copenhagen brand's most-loved silhouette", imageUrl: UNS("1601762603339-fd61e28b698a"), purchaseUrl: "https://www.ganni.com" },
  { id: "pr29", name: "Moto Leather Jacket", brand: "AllSaints", price: 499, category: "Outerwear", style: "Luxury Streetwear", description: "British rock-inspired leather biker", imageUrl: UNS("1517466787929-bc90951d0974"), purchaseUrl: "https://www.allsaints.com" },
  { id: "pr30", name: "Silk Cami Top", brand: "Equipment", price: 195, category: "Top", style: "Vacation Luxe", description: "The definitive French-wash silk camisole", imageUrl: UNS("1581338834647-b0fb40704e21"), purchaseUrl: "https://www.equipmentfr.com" },

  // Fast Fashion
  { id: "pr31", name: "Cut-Out Mini Dress", brand: "Fashion Nova", price: 39, category: "Dress", style: "Y2K Revival", description: "Body-con cutout style for the night out", imageUrl: UNS("1595777457583-95e059d581b8"), purchaseUrl: "https://www.fashionnova.com" },
  { id: "pr32", name: "Corset Two-Piece Set", brand: "PrettyLittleThing", price: 52, category: "Top", style: "Y2K Revival", description: "Satin corset and wide-leg trouser set", imageUrl: UNS("1599050751795-6cdaafbc2319"), purchaseUrl: "https://www.prettylittlething.com" },
  { id: "pr33", name: "Sequin Blazer Dress", brand: "SHEIN", price: 28, category: "Dress", style: "Y2K Revival", description: "All-over sequin party statement piece", imageUrl: UNS("1583292650898-7d22cd27ca6f"), purchaseUrl: "https://www.shein.com" },
  { id: "pr34", name: "Faux Leather Trench", brand: "Nasty Gal", price: 85, category: "Outerwear", style: "Luxury Streetwear", description: "Edgy vegan leather trench for less", imageUrl: UNS("1614632537190-23e4146777db"), purchaseUrl: "https://www.nastygal.com" },
  { id: "pr35", name: "Cobain Pant", brand: "I.AM.GIA", price: 110, category: "Bottom", style: "Luxury Streetwear", description: "The cult wide-leg velvet pant from Sydney", imageUrl: UNS("1559563458-527698bf5295"), purchaseUrl: "https://www.iamgia.com" },
  { id: "pr36", name: "Crochet Mini Skirt", brand: "Cider", price: 25, category: "Bottom", style: "Vacation Luxe", description: "TikTok-trending crochet for the beach", imageUrl: UNS("1612528443702-f6741f70a049"), purchaseUrl: "https://www.shopcider.com" },

  // Premium Mid-tier
  { id: "pr37", name: "Tabby Shoulder Bag", brand: "Coach", price: 450, category: "Bag", style: "Contemporary", description: "American leather craft at its most accessible", imageUrl: UNS("1604644401890-0bd678c83788"), purchaseUrl: "https://www.coach.com" },
  { id: "pr38", name: "Miller Platform Sandal", brand: "Tory Burch", price: 228, category: "Shoes", style: "Old Money", description: "The logo sandal that defines the resort season", imageUrl: UNS("1521223890158-f9f7c3d5d504"), purchaseUrl: "https://www.toryburch.com" },
  { id: "pr39", name: "Falabella Chain Bag", brand: "Stella McCartney", price: 1150, category: "Bag", style: "Luxury", description: "Iconic chain-trim bag, fully vegan", imageUrl: UNS("1485518882345-15568b007407"), purchaseUrl: "https://www.stellamccartney.com" },
  { id: "pr40", name: "Face Logo Hoodie", brand: "Acne Studios", price: 380, category: "Top", style: "Luxury Streetwear", description: "The face-patch graphic that made Acne iconic", imageUrl: UNS("1601924994987-69e26d50dc26"), purchaseUrl: "https://www.acnestudios.com" },
];

// PRODUCTS autopatch — stamps localImage on every shop product whose id has
// a registered editorial PNG. See the explanatory comment block above the
// PRODUCTS declaration. Runs once at module load; the guard prevents reload
// clobbering of any explicit override.
for (const product of PRODUCTS) {
  const localAsset = LOCAL_PRODUCT_ASSETS[product.id];
  if (localAsset && !product.localImage) {
    product.localImage = localAsset;
  }
}

// ─── Profile-aware look filter ──────────────────────────────────────────────
// HARD rule — every consumer of LOOKS that surfaces them to the user must
// route through this helper. A "Men" profile must never see a women's look
// (and vice versa). Season is a SOFT preference — looks tagged with the
// user's selected season (or "All Season") are preferred, but if every
// look in the matching-gender pool would be filtered out by season we
// keep the gender-only pool rather than ship an empty rail. "Unisex"
// profiles see everything.
//
// Size intentionally does NOT participate: the static LOOKS array carries
// no per-piece size and the catalog stores no SKU-level size grid, so any
// "size filter" here would be theatre, not enforcement. If/when size data
// is added per piece, plug it in alongside gender.
export function filterLooksForProfile<L extends Look>(
  looks: L[],
  profile: { gender?: string; season?: string },
): L[] {
  const g = (profile.gender ?? "").toLowerCase();
  const wantsAny = g === "" || g === "unisex";
  const byGender = wantsAny
    ? looks
    : looks.filter((l) => l.gender === g || l.gender === "unisex");

  const season = profile.season;
  if (!season || season === "All Season") return byGender;
  const bySeason = byGender.filter(
    (l) => l.season === season || l.season === "All Season",
  );
  return bySeason.length > 0 ? bySeason : byGender;
}

export const OCCASIONS = ["Casual", "Work", "Evening", "Street", "Resort", "Party", "Wedding", "Cultural"];
export const SEASONS = ["Spring", "Summer", "Autumn", "Winter", "All Season"];
export const BUDGETS = ["Under $500", "$500–$1500", "$1500–$3000", "$3000–$6000", "$6000+"];
export const GENDERS = ["Women", "Men", "Unisex"];
export const STYLE_CATEGORIES = ["Old Money", "Luxury Streetwear", "Clean Minimal", "Techwear", "Y2K Revival", "Vacation Luxe", "Avant-garde", "Business", "Fashion Remix"];
