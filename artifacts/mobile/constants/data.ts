export interface OutfitPiece {
  id: string;
  name: string;
  brand: string;
  price: number;
  category: string;
  color: string;
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
}

export const CELEBRITIES: Celebrity[] = [
  {
    id: "c1",
    name: "Zendaya",
    style: "Avant-garde Luxury",
    description: "Bold, theatrical fashion that pushes boundaries",
    looks: ["Old Money", "Gala Glam", "Street Luxe"],
  },
  {
    id: "c2",
    name: "Bella Hadid",
    style: "Y2K Streetwear",
    description: "Low-rise denim, vintage pieces, and bold accessories",
    looks: ["Y2K Revival", "Street Style", "Club Luxe"],
  },
  {
    id: "c3",
    name: "Hailey Bieber",
    style: "Clean Minimal",
    description: "Effortless, understated luxury with clean lines",
    looks: ["Clean Girl", "Business Casual", "Weekend Luxe"],
  },
  {
    id: "c4",
    name: "ASAP Rocky",
    style: "Luxury Streetwear",
    description: "Designer streetwear with an art-world edge",
    looks: ["Street Art", "Festival Luxe", "Urban Formal"],
  },
  {
    id: "c5",
    name: "Timothée Chalamet",
    style: "Old Money Indie",
    description: "Vintage-inspired luxury with a poetic sensibility",
    looks: ["Indie Formal", "Old Money", "Red Carpet"],
  },
  {
    id: "c6",
    name: "Rihanna",
    style: "Bold Avant-garde",
    description: "Fearless, maximum-impact fashion statements",
    looks: ["Maternity Glam", "Street Couture", "Power Dressing"],
  },
  {
    id: "c7",
    name: "Kendall Jenner",
    style: "Model Off-Duty",
    description: "Relaxed luxury with supermodel proportions in mind",
    looks: ["Model Off-Duty", "Vacation Luxe", "Gala Formal"],
  },
  {
    id: "c8",
    name: "Harry Styles",
    style: "Gender-Fluid Glam",
    description: "Flamboyant, playful, rule-breaking luxury",
    looks: ["Gucci Glam", "Vintage Eclectic", "Stage Luxe"],
  },
];

export const TRENDS: Trend[] = [
  {
    id: "t1",
    name: "Old Money",
    description: "Understated wealth — heritage brands, neutral palette, impeccable tailoring",
    image: require("../assets/images/look_old_money.png"),
    tags: ["Ralph Lauren", "Loro Piana", "Brooks Brothers", "cashmere", "tweed"],
    vibe: "Inherited wealth, quiet confidence",
  },
  {
    id: "t2",
    name: "Luxury Streetwear",
    description: "High-end street aesthetics — designer logos, premium sneakers, oversized silhouettes",
    image: require("../assets/images/look_streetwear.png"),
    tags: ["Off-White", "Balenciaga", "Fear of God", "hoodies", "sneakers"],
    vibe: "Street meets couture",
  },
  {
    id: "t3",
    name: "Vacation Luxe",
    description: "Resort wear redefined — flowing silks, premium linens, sun-kissed sophistication",
    image: require("../assets/images/look_vacation.png"),
    tags: ["Zimmermann", "Vilebrequin", "Loro Piana", "silk", "linen"],
    vibe: "Mediterranean billionaire summer",
  },
  {
    id: "t4",
    name: "Techwear",
    description: "Functional futurism — technical fabrics, utility pockets, dark palette precision",
    image: require("../assets/images/look_techwear.png"),
    tags: ["Acronym", "Stone Island", "Arc'teryx", "cargo", "technical"],
    vibe: "Cyberpunk meets luxury utility",
  },
  {
    id: "t5",
    name: "Clean Minimal",
    description: "Negative space as luxury — monochromatic palettes, perfect proportions, no excess",
    image: require("../assets/images/hero_banner.png"),
    tags: ["The Row", "Jil Sander", "COS", "minimal", "monochrome"],
    vibe: "Silence is the loudest statement",
  },
  {
    id: "t6",
    name: "Y2K Revival",
    description: "2000s nostalgia elevated — low-rise silhouettes, metallics, butterfly details",
    image: require("../assets/images/look_streetwear.png"),
    tags: ["Versace", "D&G", "Von Dutch", "denim", "metallic"],
    vibe: "Paris Hilton meets Dua Lipa",
  },
];

export const LOOKS: Look[] = [
  {
    id: "l1",
    name: "Côte d'Azur Evening",
    description: "A masterclass in resort elegance — fluid silk jersey meets sculptural jewelry for a dinner that demands attention without trying.",
    occasion: "Evening",
    season: "Summer",
    estimatedPrice: 3200,
    image: require("../assets/images/look_vacation.png"),
    style: "Vacation Luxe",
    tags: ["evening", "resort", "summer", "luxury"],
    pieces: [
      { id: "p1", name: "Silk Jersey Column Dress", brand: "The Row", price: 1890, category: "Dress", color: "Ivory" },
      { id: "p2", name: "Gold Sculptural Cuff", brand: "Bottega Veneta", price: 680, category: "Jewelry", color: "Gold" },
      { id: "p3", name: "Leather Mule Heel", brand: "Manolo Blahnik", price: 620, category: "Shoes", color: "Nude" },
    ],
  },
  {
    id: "l2",
    name: "Old Money Weekend",
    description: "The art of looking effortless when everything is intentional. Heritage fabrics, quiet logos, and the confidence of old wealth.",
    occasion: "Casual",
    season: "Autumn",
    estimatedPrice: 2800,
    image: require("../assets/images/look_old_money.png"),
    style: "Old Money",
    tags: ["weekend", "casual", "autumn", "heritage"],
    pieces: [
      { id: "p4", name: "Cashmere Polo Sweater", brand: "Loro Piana", price: 1200, category: "Top", color: "Camel" },
      { id: "p5", name: "Tailored Chino", brand: "Ralph Lauren Purple Label", price: 480, category: "Bottom", color: "Stone" },
      { id: "p6", name: "Suede Penny Loafer", brand: "Gucci", price: 790, category: "Shoes", color: "Tan" },
      { id: "p7", name: "Canvas Tote", brand: "Goyard", price: 330, category: "Bag", color: "Natural" },
    ],
  },
  {
    id: "l3",
    name: "Urban Architect",
    description: "For the city that never sleeps and the man who never blends in. Technical precision meets downtown edge.",
    occasion: "Street",
    season: "Winter",
    estimatedPrice: 4100,
    image: require("../assets/images/look_techwear.png"),
    style: "Techwear",
    tags: ["urban", "street", "winter", "technical"],
    pieces: [
      { id: "p8", name: "GORE-TEX Shell Jacket", brand: "Acronym", price: 1890, category: "Outerwear", color: "Black" },
      { id: "p9", name: "Cargo Jogger", brand: "Stone Island Shadow", price: 680, category: "Bottom", color: "Black" },
      { id: "p10", name: "Air Max Drone", brand: "Nike x Off-White", price: 420, category: "Shoes", color: "Black" },
      { id: "p11", name: "Utility Crossbody", brand: "Cote&Ciel", price: 380, category: "Bag", color: "Black" },
      { id: "p12", name: "Titanium Watch", brand: "G-Shock x Casio", price: 730, category: "Accessories", color: "Silver" },
    ],
  },
  {
    id: "l4",
    name: "Galerie Opening",
    description: "Art world royalty. Where minimalist fashion becomes the canvas and the collector's eye speaks through restraint.",
    occasion: "Cultural",
    season: "All Season",
    estimatedPrice: 5600,
    image: require("../assets/images/hero_banner.png"),
    style: "Clean Minimal",
    tags: ["art", "gallery", "minimal", "evening"],
    pieces: [
      { id: "p13", name: "Wide-Leg Wool Trouser", brand: "Jil Sander", price: 890, category: "Bottom", color: "Ivory" },
      { id: "p14", name: "Oversized Blazer", brand: "The Row", price: 2100, category: "Outerwear", color: "Cream" },
      { id: "p15", name: "Knit Tank", brand: "Toteme", price: 380, category: "Top", color: "White" },
      { id: "p16", name: "Square Toe Boot", brand: "Bottega Veneta", price: 1200, category: "Shoes", color: "Black" },
      { id: "p17", name: "Cassette Bag", brand: "Bottega Veneta", price: 3400, category: "Bag", color: "Intrecciato Black" },
    ],
  },
  {
    id: "l5",
    name: "Luxury Streetwear Icon",
    description: "Where the block meets the runway. Maximum drip, minimum effort, all designer.",
    occasion: "Street",
    season: "Spring",
    estimatedPrice: 3800,
    image: require("../assets/images/look_streetwear.png"),
    style: "Luxury Streetwear",
    tags: ["street", "spring", "logo", "designer"],
    pieces: [
      { id: "p18", name: "Logo Hoodie", brand: "Balenciaga", price: 890, category: "Top", color: "Black" },
      { id: "p19", name: "Baggy Denim", brand: "Amiri", price: 680, category: "Bottom", color: "Indigo" },
      { id: "p20", name: "Triple S Sneaker", brand: "Balenciaga", price: 1095, category: "Shoes", color: "White" },
      { id: "p21", name: "Logo Cap", brand: "Gucci", price: 340, category: "Accessories", color: "Black" },
      { id: "p22", name: "Chain Necklace", brand: "Off-White", price: 290, category: "Jewelry", color: "Silver" },
    ],
  },
  {
    id: "l6",
    name: "Y2K Soirée",
    description: "The early 2000s never looked this good. Low-rise sophistication with maximalist confidence.",
    occasion: "Party",
    season: "Summer",
    estimatedPrice: 2400,
    image: require("../assets/images/look_streetwear.png"),
    style: "Y2K Revival",
    tags: ["party", "y2k", "metallic", "summer"],
    pieces: [
      { id: "p23", name: "Crystal Mini Skirt", brand: "Versace", price: 1200, category: "Bottom", color: "Gold" },
      { id: "p24", name: "Corset Top", brand: "Dolce & Gabbana", price: 680, category: "Top", color: "Silver" },
      { id: "p25", name: "Platform Mule", brand: "Versace", price: 520, category: "Shoes", color: "Gold" },
    ],
  },
];

export const PRODUCTS: Product[] = [
  { id: "pr1", name: "Cassette Mini Bag", brand: "Bottega Veneta", price: 2890, category: "Bag", style: "Clean Minimal", description: "Iconic intrecciato weave in obsidian nappa leather" },
  { id: "pr2", name: "Triple S Sneaker", brand: "Balenciaga", price: 1095, category: "Shoes", style: "Luxury Streetwear", description: "The original oversized sneaker that started a movement" },
  { id: "pr3", name: "Cashmere Robe Coat", brand: "Max Mara", price: 3200, category: "Outerwear", style: "Old Money", description: "The definitive coat, in pure cashmere" },
  { id: "pr4", name: "Crystal Embellished Heel", brand: "Manolo Blahnik", price: 1150, category: "Shoes", style: "Evening", description: "Swarovski crystals on a 90mm stiletto" },
  { id: "pr5", name: "Logomania Silk Scarf", brand: "Gucci", price: 490, category: "Accessories", style: "Luxury Streetwear", description: "GG print in satin silk, a perennial icon" },
  { id: "pr6", name: "Wide Brim Hat", brand: "Jacquemus", price: 380, category: "Accessories", style: "Vacation Luxe", description: "Oversized straw hat for the discerning sunbather" },
  { id: "pr7", name: "Technical Shell Jacket", brand: "Arc'teryx", price: 895, category: "Outerwear", style: "Techwear", description: "GORE-TEX Pro in volcanic black" },
  { id: "pr8", name: "Silk Bias Slip Dress", brand: "Reformation", price: 248, category: "Dress", style: "Vacation Luxe", description: "Sustainable silk in champagne" },
  { id: "pr9", name: "Low-Rise Denim", brand: "Agolde", price: 238, category: "Bottom", style: "Y2K Revival", description: "90s-inspired low rise in authentic indigo wash" },
  { id: "pr10", name: "Oversized Blazer", brand: "The Row", price: 2100, category: "Outerwear", style: "Clean Minimal", description: "Fluid construction in cream wool-silk" },
  { id: "pr11", name: "Gold Bamboo Earrings", brand: "Tory Burch", price: 148, category: "Jewelry", style: "Old Money", description: "Polished 18k gold-dipped bamboo hoops" },
  { id: "pr12", name: "Combat Boot", brand: "Rick Owens", price: 1485, category: "Shoes", style: "Techwear", description: "Leather sole, heel zip, brutal elegance" },
];

export const OCCASIONS = ["Casual", "Work", "Evening", "Street", "Resort", "Party", "Wedding", "Cultural"];
export const SEASONS = ["Spring", "Summer", "Autumn", "Winter", "All Season"];
export const BUDGETS = ["Under $500", "$500–$1500", "$1500–$3000", "$3000–$6000", "$6000+"];
export const GENDERS = ["Women", "Men", "Unisex"];
export const STYLE_CATEGORIES = ["Old Money", "Luxury Streetwear", "Clean Minimal", "Techwear", "Y2K Revival", "Vacation Luxe", "Avant-garde", "Business"];
