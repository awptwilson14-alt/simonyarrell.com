export interface OutfitPiece {
  id: string;
  name: string;
  brand: string;
  price: number;
  category: string;
  color: string;
  imageUrl?: string;
  purchaseUrl?: string;
}

export interface Look {
  id: string;
  name: string;
  description: string;
  occasion: string;
  season: string;
  estimatedPrice: number;
  image: any;
  pieces: OutfitPiece[];
  style: string;
  tags: string[];
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

export interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  category: string;
  style: string;
  description: string;
  imageUrl: string;
  purchaseUrl: string;
}

// ─── Unsplash helpers ───────────────────────────────────────────────────────
const UNS = (id: string, w = 480, h = 600) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&auto=format&q=80`;

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
];

// ─── Trends ─────────────────────────────────────────────────────────────────
export const TRENDS: Trend[] = [
  { id: "t1", name: "Old Money", description: "Understated wealth — heritage brands, neutral palette, impeccable tailoring", image: require("../assets/images/look_old_money.png"), tags: ["Ralph Lauren", "Loro Piana", "cashmere", "tweed"], vibe: "Inherited wealth, quiet confidence" },
  { id: "t2", name: "Luxury Streetwear", description: "High-end street aesthetics — designer logos, premium sneakers, oversized silhouettes", image: require("../assets/images/look_streetwear.png"), tags: ["Off-White", "Balenciaga", "Fear of God", "hoodies"], vibe: "Street meets couture" },
  { id: "t3", name: "Vacation Luxe", description: "Resort wear redefined — flowing silks, premium linens, sun-kissed sophistication", image: require("../assets/images/look_vacation.png"), tags: ["Zimmermann", "Loro Piana", "silk", "linen"], vibe: "Mediterranean billionaire summer" },
  { id: "t4", name: "Techwear", description: "Functional futurism — technical fabrics, utility pockets, dark palette precision", image: require("../assets/images/look_techwear.png"), tags: ["Acronym", "Stone Island", "Arc'teryx", "cargo"], vibe: "Cyberpunk meets luxury utility" },
  { id: "t5", name: "Clean Minimal", description: "Negative space as luxury — monochromatic palettes, perfect proportions, no excess", image: require("../assets/images/hero_banner.png"), tags: ["The Row", "Jil Sander", "COS", "minimal"], vibe: "Silence is the loudest statement" },
  { id: "t6", name: "Y2K Revival", description: "2000s nostalgia elevated — low-rise silhouettes, metallics, butterfly details", image: require("../assets/images/look_streetwear.png"), tags: ["Versace", "D&G", "Von Dutch", "metallic"], vibe: "Paris Hilton meets Dua Lipa" },
];

// ─── Looks ──────────────────────────────────────────────────────────────────
export const LOOKS: Look[] = [
  {
    id: "l1",
    name: "Côte d'Azur Evening",
    description: "A masterclass in resort elegance — fluid silk jersey meets sculptural jewelry for a dinner that demands attention without trying.",
    occasion: "Evening", season: "Summer", estimatedPrice: 3200,
    image: require("../assets/images/look_vacation.png"),
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
    occasion: "Casual", season: "Autumn", estimatedPrice: 2800,
    image: require("../assets/images/look_old_money.png"),
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
    occasion: "Street", season: "Winter", estimatedPrice: 4100,
    image: require("../assets/images/look_techwear.png"),
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
    occasion: "Cultural", season: "All Season", estimatedPrice: 5600,
    image: require("../assets/images/hero_banner.png"),
    style: "Clean Minimal", tags: ["art", "gallery", "minimal"],
    pieces: [
      { id: "p13", name: "Wide-Leg Wool Trouser", brand: "Jil Sander", price: 890, category: "Bottom", color: "Ivory", imageUrl: UNS("1552902865-b72c031ac5ea"), purchaseUrl: "https://www.jilsander.com" },
      { id: "p14", name: "Oversized Blazer", brand: "The Row", price: 2100, category: "Outerwear", color: "Cream", imageUrl: UNS("1507003211169-0a1dd7228f2d"), purchaseUrl: "https://www.therow.com" },
      { id: "p15", name: "Knit Tank", brand: "Toteme", price: 380, category: "Top", color: "White", imageUrl: UNS("1503342217505-b0a15ec3261c"), purchaseUrl: "https://www.toteme-studio.com" },
      { id: "p16", name: "Square Toe Boot", brand: "Bottega Veneta", price: 1200, category: "Shoes", color: "Black", imageUrl: UNS("1608256246005-4e6b4e65f82c"), purchaseUrl: "https://www.bottegaveneta.com" },
    ],
  },
  {
    id: "l5",
    name: "Luxury Streetwear Icon",
    description: "Where the block meets the runway. Maximum drip, minimum effort, all designer.",
    occasion: "Street", season: "Spring", estimatedPrice: 3800,
    image: require("../assets/images/look_streetwear.png"),
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
    occasion: "Party", season: "Summer", estimatedPrice: 2400,
    image: require("../assets/images/look_streetwear.png"),
    style: "Y2K Revival", tags: ["party", "y2k", "metallic"],
    pieces: [
      { id: "p23", name: "Crystal Mini Skirt", brand: "Versace", price: 1200, category: "Bottom", color: "Gold", imageUrl: UNS("1515886657613-9f3515b0c78f"), purchaseUrl: "https://www.versace.com" },
      { id: "p24", name: "Corset Top", brand: "Dolce & Gabbana", price: 680, category: "Top", color: "Silver", imageUrl: UNS("1503342217505-b0a15ec3261c"), purchaseUrl: "https://www.dolcegabbana.com" },
      { id: "p25", name: "Platform Mule", brand: "Versace", price: 520, category: "Shoes", color: "Gold", imageUrl: UNS("1515347619252-60a4bf4fff4f"), purchaseUrl: "https://www.versace.com" },
    ],
  },
];

// ─── Products ────────────────────────────────────────────────────────────────
export const PRODUCTS: Product[] = [
  // Ultra Luxury
  { id: "pr1", name: "Cassette Mini Bag", brand: "Bottega Veneta", price: 2890, category: "Bag", style: "Clean Minimal", description: "Iconic intrecciato weave in obsidian nappa leather", imageUrl: UNS("1548036328-c9fa89d128fa"), purchaseUrl: "https://www.bottegaveneta.com" },
  { id: "pr2", name: "Classic Flap Bag", brand: "Chanel", price: 8800, category: "Bag", style: "Old Money", description: "The most iconic shoulder bag in fashion history", imageUrl: UNS("1584917865442-de89df76afd3"), purchaseUrl: "https://www.chanel.com" },
  { id: "pr3", name: "Saddle Bag", brand: "Christian Dior", price: 3900, category: "Bag", style: "Luxury", description: "The house's most recognisable saddle silhouette", imageUrl: UNS("1590874175748-39b18e7ab1e9"), purchaseUrl: "https://www.dior.com" },
  { id: "pr4", name: "Neverfull MM", brand: "Louis Vuitton", price: 2070, category: "Bag", style: "Luxury Streetwear", description: "The world's most-wanted tote in Monogram canvas", imageUrl: UNS("1571513800374-841571dbf2e2"), purchaseUrl: "https://us.louisvuitton.com" },
  { id: "pr5", name: "Puzzle Bag Small", brand: "Loewe", price: 2950, category: "Bag", style: "Clean Minimal", description: "Jonathan Anderson's geometric masterpiece", imageUrl: UNS("1548036328-c9fa89d128fa"), purchaseUrl: "https://www.loewe.com" },

  // Shoes
  { id: "pr6", name: "Triple S Sneaker", brand: "Balenciaga", price: 1095, category: "Shoes", style: "Luxury Streetwear", description: "The original oversized sneaker that started a movement", imageUrl: UNS("1542291026-7eec264c27ff"), purchaseUrl: "https://www.balenciaga.com" },
  { id: "pr7", name: "Tabi Boot", brand: "Maison Margiela", price: 1340, category: "Shoes", style: "Avant-garde", description: "The split-toe boot that became a cultural icon", imageUrl: UNS("1608256246005-4e6b4e65f82c"), purchaseUrl: "https://www.maisonmargiela.com" },
  { id: "pr8", name: "Horsebit Loafer", brand: "Gucci", price: 890, category: "Shoes", style: "Old Money", description: "The 1953 classic — every wardrobe's anchor", imageUrl: UNS("1614252235316-8c857d38b5f4"), purchaseUrl: "https://www.gucci.com" },
  { id: "pr9", name: "Crystal Embellished Pump", brand: "Manolo Blahnik", price: 1150, category: "Shoes", style: "Evening", description: "Swarovski crystals on a 90mm stiletto", imageUrl: UNS("1543163521-1bf539c55dd2"), purchaseUrl: "https://www.manoloblahnik.com" },
  { id: "pr10", name: "GORE-TEX Sneaker", brand: "Rick Owens", price: 1050, category: "Shoes", style: "Techwear", description: "Sculpted rubber sole, brutal silhouette", imageUrl: UNS("1491553895911-0055eca6402d"), purchaseUrl: "https://www.rickowens.eu" },

  // Outerwear
  { id: "pr11", name: "Cashmere Robe Coat", brand: "Max Mara", price: 3200, category: "Outerwear", style: "Old Money", description: "The definitive coat, in pure camel cashmere", imageUrl: UNS("1539008835657-9e8e9680c956"), purchaseUrl: "https://www.maxmara.com" },
  { id: "pr12", name: "Technical Shell Jacket", brand: "Arc'teryx", price: 895, category: "Outerwear", style: "Techwear", description: "GORE-TEX Pro, waterproof, volcanic black", imageUrl: UNS("1591047139829-d91aecb6caea"), purchaseUrl: "https://www.arcteryx.com" },
  { id: "pr13", name: "Down Puffer Coat", brand: "Moncler", price: 1450, category: "Outerwear", style: "Luxury Streetwear", description: "The Alpine luxury puffer that defines après-ski", imageUrl: UNS("1608234807905-4466023792f5"), purchaseUrl: "https://www.moncler.com" },
  { id: "pr14", name: "Structured Blazer", brand: "Balmain", price: 2400, category: "Outerwear", style: "Power Dressing", description: "Gold-button Parisian power dressing", imageUrl: UNS("1507003211169-0a1dd7228f2d"), purchaseUrl: "https://www.balmain.com" },
  { id: "pr15", name: "Heritage Trench", brand: "Burberry", price: 2290, category: "Outerwear", style: "Old Money", description: "The original gabardine trench, still perfect", imageUrl: UNS("1591047139829-d91aecb6caea"), purchaseUrl: "https://www.burberry.com" },

  // RTW / Tops / Bottoms
  { id: "pr16", name: "Oversized Blazer", brand: "The Row", price: 2100, category: "Outerwear", style: "Clean Minimal", description: "Fluid construction in cream wool-silk", imageUrl: UNS("1507003211169-0a1dd7228f2d"), purchaseUrl: "https://www.therow.com" },
  { id: "pr17", name: "Silk Bias Slip Dress", brand: "Reformation", price: 248, category: "Dress", style: "Vacation Luxe", description: "Sustainable silk in champagne — effortless resort", imageUrl: UNS("1515886657613-9f3515b0c78f"), purchaseUrl: "https://www.thereformation.com" },
  { id: "pr18", name: "Low-Rise Barrel Denim", brand: "Agolde", price: 238, category: "Bottom", style: "Y2K Revival", description: "90s-inspired low rise in authentic indigo wash", imageUrl: UNS("1542272054537-4845f1353d17"), purchaseUrl: "https://www.agolde.com" },
  { id: "pr19", name: "Logo Hoodie", brand: "Balenciaga", price: 890, category: "Top", style: "Luxury Streetwear", description: "Oversized French terry with rubber logo", imageUrl: UNS("1556821840-3a63f15732ce"), purchaseUrl: "https://www.balenciaga.com" },
  { id: "pr20", name: "Baby Cashmere Turtleneck", brand: "Brunello Cucinelli", price: 1650, category: "Top", style: "Old Money", description: "The rarest cashmere, the most perfect knit", imageUrl: UNS("1521572163474-6864f9cf17ab"), purchaseUrl: "https://www.brunellocucinelli.com" },
  { id: "pr21", name: "Oasi Cashmere Polo", brand: "Loro Piana", price: 1200, category: "Top", style: "Old Money", description: "Ultra-fine Oasi cashmere in natural camel", imageUrl: UNS("1521572163474-6864f9cf17ab"), purchaseUrl: "https://www.loropiana.com" },

  // Accessories
  { id: "pr22", name: "Silk GG Scarf", brand: "Gucci", price: 490, category: "Accessories", style: "Luxury Streetwear", description: "GG print in satin silk, a perennial icon", imageUrl: UNS("1611558709798-e009c8fd7706"), purchaseUrl: "https://www.gucci.com" },
  { id: "pr23", name: "Oversized Sun Hat", brand: "Jacquemus", price: 380, category: "Accessories", style: "Vacation Luxe", description: "The wicker hat that launched a thousand posts", imageUrl: UNS("1473496169904-658ba7574b0d"), purchaseUrl: "https://www.jacquemus.com" },
  { id: "pr24", name: "Gold Bamboo Hoops", brand: "Tory Burch", price: 148, category: "Jewelry", style: "Old Money", description: "18k gold-dipped bamboo hoop earrings", imageUrl: UNS("1599643477877-530eb83abc8e"), purchaseUrl: "https://www.toryburch.com" },
  { id: "pr25", name: "Tonneau Watch", brand: "Tom Ford", price: 3200, category: "Accessories", style: "Luxury", description: "Brushed steel case, deep brown dial, eternal", imageUrl: UNS("1523275335684-37898b6baf30"), purchaseUrl: "https://www.tomford.com" },

  // Contemporary
  { id: "pr26", name: "The Perfect Blazer", brand: "Zara", price: 149, category: "Outerwear", style: "Contemporary", description: "Runway-inspired tailoring at high street prices", imageUrl: UNS("1507003211169-0a1dd7228f2d"), purchaseUrl: "https://www.zara.com" },
  { id: "pr27", name: "Linen Wide Trousers", brand: "COS", price: 110, category: "Bottom", style: "Clean Minimal", description: "Architectural linen, relaxed drape, enduring", imageUrl: UNS("1552902865-b72c031ac5ea"), purchaseUrl: "https://www.cosstores.com" },
  { id: "pr28", name: "Smocked Mini Dress", brand: "Ganni", price: 295, category: "Dress", style: "Contemporary", description: "The Copenhagen brand's most-loved silhouette", imageUrl: UNS("1566174053879-31528523f8ae"), purchaseUrl: "https://www.ganni.com" },
  { id: "pr29", name: "Moto Leather Jacket", brand: "AllSaints", price: 499, category: "Outerwear", style: "Luxury Streetwear", description: "British rock-inspired leather biker", imageUrl: UNS("1539008835657-9e8e9680c956"), purchaseUrl: "https://www.allsaints.com" },
  { id: "pr30", name: "Silk Cami Top", brand: "Equipment", price: 195, category: "Top", style: "Vacation Luxe", description: "The definitive French-wash silk camisole", imageUrl: UNS("1503342217505-b0a15ec3261c"), purchaseUrl: "https://www.equipmentfr.com" },

  // Fast Fashion
  { id: "pr31", name: "Cut-Out Mini Dress", brand: "Fashion Nova", price: 39, category: "Dress", style: "Y2K Revival", description: "Body-con cutout style for the night out", imageUrl: UNS("1595777457583-95e059d581b8"), purchaseUrl: "https://www.fashionnova.com" },
  { id: "pr32", name: "Corset Two-Piece Set", brand: "PrettyLittleThing", price: 52, category: "Top", style: "Y2K Revival", description: "Satin corset and wide-leg trouser set", imageUrl: UNS("1503342217505-b0a15ec3261c"), purchaseUrl: "https://www.prettylittlething.com" },
  { id: "pr33", name: "Sequin Blazer Dress", brand: "SHEIN", price: 28, category: "Dress", style: "Y2K Revival", description: "All-over sequin party statement piece", imageUrl: UNS("1566174053879-31528523f8ae"), purchaseUrl: "https://www.shein.com" },
  { id: "pr34", name: "Faux Leather Trench", brand: "Nasty Gal", price: 85, category: "Outerwear", style: "Luxury Streetwear", description: "Edgy vegan leather trench for less", imageUrl: UNS("1591047139829-d91aecb6caea"), purchaseUrl: "https://www.nastygal.com" },
  { id: "pr35", name: "Cobain Pant", brand: "I.AM.GIA", price: 110, category: "Bottom", style: "Luxury Streetwear", description: "The cult wide-leg velvet pant from Sydney", imageUrl: UNS("1552902865-b72c031ac5ea"), purchaseUrl: "https://www.iamgia.com" },
  { id: "pr36", name: "Crochet Mini Skirt", brand: "Cider", price: 25, category: "Bottom", style: "Vacation Luxe", description: "TikTok-trending crochet for the beach", imageUrl: UNS("1515886657613-9f3515b0c78f"), purchaseUrl: "https://www.shopcider.com" },

  // Premium Mid-tier
  { id: "pr37", name: "Tabby Shoulder Bag", brand: "Coach", price: 450, category: "Bag", style: "Contemporary", description: "American leather craft at its most accessible", imageUrl: UNS("1548036328-c9fa89d128fa"), purchaseUrl: "https://www.coach.com" },
  { id: "pr38", name: "Miller Platform Sandal", brand: "Tory Burch", price: 228, category: "Shoes", style: "Old Money", description: "The logo sandal that defines the resort season", imageUrl: UNS("1515347619252-60a4bf4fff4f"), purchaseUrl: "https://www.toryburch.com" },
  { id: "pr39", name: "Falabella Chain Bag", brand: "Stella McCartney", price: 1150, category: "Bag", style: "Luxury", description: "Iconic chain-trim bag, fully vegan", imageUrl: UNS("1584917865442-de89df76afd3"), purchaseUrl: "https://www.stellamccartney.com" },
  { id: "pr40", name: "Face Logo Hoodie", brand: "Acne Studios", price: 380, category: "Top", style: "Luxury Streetwear", description: "The face-patch graphic that made Acne iconic", imageUrl: UNS("1556821840-3a63f15732ce"), purchaseUrl: "https://www.acnestudios.com" },
];

export const OCCASIONS = ["Casual", "Work", "Evening", "Street", "Resort", "Party", "Wedding", "Cultural"];
export const SEASONS = ["Spring", "Summer", "Autumn", "Winter", "All Season"];
export const BUDGETS = ["Under $500", "$500–$1500", "$1500–$3000", "$3000–$6000", "$6000+"];
export const GENDERS = ["Women", "Men", "Unisex"];
export const STYLE_CATEGORIES = ["Old Money", "Luxury Streetwear", "Clean Minimal", "Techwear", "Y2K Revival", "Vacation Luxe", "Avant-garde", "Business"];
