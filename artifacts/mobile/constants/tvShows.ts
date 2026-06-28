import type { CelebFull, CelebLook } from "@/constants/celebrities";

// ── TV Show Inspirations ──────────────────────────────────────────────────
// A weekly top-10 of style-defining TV shows. Users pick a show, then one of
// its 5 main characters (or one of that character's signature looks) to
// generate REAL catalog outfits through the existing AI/stylist pipeline.
//
// Design notes (see replit.md "no fake images" principle):
//   - Shows/characters render as EDITORIAL cards (accent-gradient + typography),
//     NOT promotional stills. TV promo photography is copyright-encumbered and
//     not on Wikimedia, so we don't fabricate or scrape faces. The generated
//     LOOKS still use real product imagery from the catalog.
//   - A character resolves into a synthetic `CelebFull` muse via
//     `buildMuseFromCharId`, so the style screen's existing `activeCeleb`
//     brand-bias + INSPIRED-BY plumbing works with no engine changes.
//   - The visible top-10 ROTATES weekly (deterministic ISO-week offset over a
//     14-show pool), keeping a fixed 3 urban / 1 western / 3 contemporary /
//     3 formal quota. No backend — fully offline.

export type ShowCategory = "urban" | "western" | "contemporary" | "formal";

export const CATEGORY_LABELS: Record<ShowCategory, string> = {
  urban: "Urban",
  western: "Western",
  contemporary: "Contemporary",
  formal: "Formal",
};

export interface ShowCharacter {
  id: string;
  name: string;
  actor: string;
  gender: "men" | "women";
  role: string;
  style: string;
  description: string;
  accentColor: string;
  signatureBrands: string[];
  keyPieces: string[];
  vibes: string[];
  looks: CelebLook[];
}

export interface TVShow {
  id: string;
  name: string;
  network: string;
  category: ShowCategory;
  era: string;
  tagline: string;
  description: string;
  accentColor: string;
  vibes: string[];
  characters: ShowCharacter[];
}

export const TV_SHOWS: TVShow[] = [
  // ════════════════════════════ URBAN (pool of 4) ════════════════════════════
  {
    id: "power",
    name: "Power",
    network: "Starz",
    category: "urban",
    era: "2010s",
    tagline: "Empire built in the shadows",
    description:
      "A New York nightclub owner leads a double life as a drug kingpin. The wardrobe is a masterclass in power dressing — razor-sharp tailoring by day, predatory glamour by night.",
    accentColor: "#C6A75E",
    vibes: ["Boss Tailoring", "Power Glam", "Luxury Streetwear"],
    characters: [
      {
        id: "ghost",
        name: "James 'Ghost' St. Patrick",
        actor: "Omari Hardwick",
        gender: "men",
        role: "Kingpin turned legit mogul",
        style: "Boss Tailoring",
        description:
          "The blueprint for modern power dressing — fitted turtlenecks under tailored coats, monochrome suiting, and a watch that says more than he does.",
        accentColor: "#C6A75E",
        signatureBrands: ["Tom Ford", "Brioni", "Ermenegildo Zegna", "Berluti", "Saint Laurent"],
        keyPieces: ["Black fitted turtleneck", "Charcoal two-piece suit", "Wool topcoat", "Leather Oxfords"],
        vibes: ["Boss Tailoring", "Monochrome", "Quiet Luxury"],
        looks: [
          { name: "Club Owner Monochrome", pieces: [
            { item: "Fitted turtleneck", brand: "Tom Ford" },
            { item: "Tailored wool trousers", brand: "Brioni" },
            { item: "Leather Oxfords", brand: "Berluti" },
          ]},
          { name: "Boardroom Power Suit", pieces: [
            { item: "Charcoal two-piece suit", brand: "Ermenegildo Zegna" },
            { item: "Crisp white dress shirt", brand: "Brioni" },
            { item: "Silk tie", brand: "Tom Ford" },
          ]},
          { name: "Night Operator", pieces: [
            { item: "Black wool topcoat", brand: "Saint Laurent" },
            { item: "Slim black trousers", brand: "Tom Ford" },
            { item: "Leather Chelsea boots", brand: "Berluti" },
          ]},
        ],
      },
      {
        id: "tommy",
        name: "Tommy Egan",
        actor: "Joseph Sikora",
        gender: "men",
        role: "Loyal enforcer",
        style: "Street Edge",
        description:
          "Downtown grit dressed up — leather jackets, raw denim, and box-fresh sneakers. The counterweight to Ghost's polish.",
        accentColor: "#9A9A9A",
        signatureBrands: ["Saint Laurent", "AllSaints", "Amiri", "Rick Owens", "Nike"],
        keyPieces: ["Black leather biker jacket", "Distressed denim", "Graphic tee", "High-top sneakers"],
        vibes: ["Street Edge", "Luxury Streetwear", "Rock"],
        looks: [
          { name: "Leather & Denim", pieces: [
            { item: "Black leather biker jacket", brand: "Saint Laurent" },
            { item: "Slim distressed jeans", brand: "Amiri" },
            { item: "Leather boots", brand: "Rick Owens" },
          ]},
          { name: "Off-Duty Enforcer", pieces: [
            { item: "Washed graphic tee", brand: "Amiri" },
            { item: "Raw denim", brand: "Saint Laurent" },
            { item: "High-top sneakers", brand: "Nike" },
          ]},
          { name: "Night Run", pieces: [
            { item: "Hooded leather jacket", brand: "AllSaints" },
            { item: "Black cargo trousers", brand: "Rick Owens" },
            { item: "Combat sneakers", brand: "Amiri" },
          ]},
        ],
      },
      {
        id: "tasha",
        name: "Tasha St. Patrick",
        actor: "Naturi Naughton",
        gender: "women",
        role: "The matriarch",
        style: "Power Glam",
        description:
          "Bodycon silhouettes, fur accents, and gold everywhere. Tasha dresses like the queen of an empire she helped build.",
        accentColor: "#D4AF37",
        signatureBrands: ["Balmain", "Versace", "Roberto Cavalli", "Gucci", "Christian Louboutin"],
        keyPieces: ["Bodycon dress", "Fur-trim coat", "Gold hoops", "Stiletto pumps"],
        vibes: ["Power Glam", "Maximalist", "Bombshell"],
        looks: [
          { name: "Empire Bombshell", pieces: [
            { item: "Bodycon midi dress", brand: "Balmain" },
            { item: "Fur-trim coat", brand: "Roberto Cavalli" },
            { item: "Stiletto pumps", brand: "Christian Louboutin" },
          ]},
          { name: "Gold Standard", pieces: [
            { item: "Plunge gold gown", brand: "Versace" },
            { item: "Structured clutch", brand: "Gucci" },
            { item: "Strappy heels", brand: "Christian Louboutin" },
          ]},
          { name: "Boss Wife", pieces: [
            { item: "Tailored blazer dress", brand: "Balmain" },
            { item: "Leather tote", brand: "Gucci" },
            { item: "Pointed pumps", brand: "Christian Louboutin" },
          ]},
        ],
      },
      {
        id: "angela",
        name: "Angela Valdes",
        actor: "Lela Loren",
        gender: "women",
        role: "Federal prosecutor",
        style: "Federal Chic",
        description:
          "Sheath dresses, tailored blazers, and pumps that mean business. Power dressing with prosecutorial edge.",
        accentColor: "#8B5E83",
        signatureBrands: ["Theory", "Max Mara", "The Row", "Stuart Weitzman", "Saint Laurent"],
        keyPieces: ["Sheath dress", "Tailored blazer", "Leather pumps", "Structured tote"],
        vibes: ["Federal Chic", "Workwear", "Minimal"],
        looks: [
          { name: "Courtroom Sharp", pieces: [
            { item: "Sheath dress", brand: "Theory" },
            { item: "Tailored blazer", brand: "Max Mara" },
            { item: "Leather pumps", brand: "Stuart Weitzman" },
          ]},
          { name: "After Hours", pieces: [
            { item: "Wrap dress", brand: "Saint Laurent" },
            { item: "Leather clutch", brand: "The Row" },
            { item: "Strappy heels", brand: "Stuart Weitzman" },
          ]},
          { name: "Office Power", pieces: [
            { item: "Pencil skirt", brand: "Max Mara" },
            { item: "Silk blouse", brand: "Theory" },
            { item: "Structured tote", brand: "The Row" },
          ]},
        ],
      },
      {
        id: "kanan",
        name: "Kanan Stark",
        actor: "50 Cent / Mekai Curtis",
        gender: "men",
        role: "Streetwise survivor",
        style: "Street Utility",
        description:
          "Function-first street style — utility hoodies, bombers, and worn-in denim built for the corner, not the boardroom.",
        accentColor: "#7C6F5A",
        signatureBrands: ["Stone Island", "Carhartt WIP", "Nike", "The North Face", "Dickies"],
        keyPieces: ["Utility hoodie", "Bomber jacket", "Cargo pants", "Chunky sneakers"],
        vibes: ["Street Utility", "Streetwear", "Workwear"],
        looks: [
          { name: "Corner Uniform", pieces: [
            { item: "Heavyweight hoodie", brand: "Carhartt WIP" },
            { item: "Cargo pants", brand: "Dickies" },
            { item: "Chunky sneakers", brand: "Nike" },
          ]},
          { name: "Cold Block", pieces: [
            { item: "Down bomber jacket", brand: "Stone Island" },
            { item: "Slim joggers", brand: "Nike" },
            { item: "High-top sneakers", brand: "Nike" },
          ]},
          { name: "Layered Up", pieces: [
            { item: "Fleece overshirt", brand: "The North Face" },
            { item: "Workwear denim", brand: "Carhartt WIP" },
            { item: "Trail sneakers", brand: "Nike" },
          ]},
        ],
      },
    ],
  },
  {
    id: "empire",
    name: "Empire",
    network: "FOX",
    category: "urban",
    era: "2010s",
    tagline: "Music dynasty, maximal wardrobe",
    description:
      "A hip-hop mogul's family fights for control of his record label. The styling is unapologetically loud — fur, animal print, leather, and statement coats in every frame.",
    accentColor: "#C0392B",
    vibes: ["Maximalist Glam", "Mogul Tailoring", "Hip-Hop Luxe"],
    characters: [
      {
        id: "cookie",
        name: "Cookie Lyon",
        actor: "Taraji P. Henson",
        gender: "women",
        role: "The fearless matriarch",
        style: "Maximalist Glam",
        description:
          "The most iconic TV wardrobe of the decade — leopard print, floor-length fur, bold color, and zero restraint. Cookie dresses like she owns every room.",
        accentColor: "#C0392B",
        signatureBrands: ["Roberto Cavalli", "Versace", "Dolce & Gabbana", "Gucci", "Balmain"],
        keyPieces: ["Floor-length fur coat", "Leopard-print dress", "Statement gown", "Gladiator heels"],
        vibes: ["Maximalist Glam", "Animal Print", "Bombshell"],
        looks: [
          { name: "Fur & Fearless", pieces: [
            { item: "Floor-length fur coat", brand: "Roberto Cavalli" },
            { item: "Bodycon dress", brand: "Versace" },
            { item: "Gladiator heels", brand: "Gucci" },
          ]},
          { name: "Leopard Boss", pieces: [
            { item: "Leopard-print dress", brand: "Dolce & Gabbana" },
            { item: "Leather jacket", brand: "Balmain" },
            { item: "Stiletto boots", brand: "Gucci" },
          ]},
          { name: "Red Carpet Lyon", pieces: [
            { item: "Plunge statement gown", brand: "Versace" },
            { item: "Embellished clutch", brand: "Roberto Cavalli" },
            { item: "Strappy heels", brand: "Gucci" },
          ]},
        ],
      },
      {
        id: "lucious",
        name: "Lucious Lyon",
        actor: "Terrence Howard",
        gender: "men",
        role: "Label-founding mogul",
        style: "Mogul Tailoring",
        description:
          "Three-piece suits, statement overcoats, and leather. Lucious wears wealth like armor — every outfit is a power move.",
        accentColor: "#8E2C24",
        signatureBrands: ["Tom Ford", "Gucci", "Versace", "Brioni", "Saint Laurent"],
        keyPieces: ["Three-piece suit", "Statement overcoat", "Leather jacket", "Velvet blazer"],
        vibes: ["Mogul Tailoring", "Hip-Hop Luxe", "Bold"],
        looks: [
          { name: "Label Boss", pieces: [
            { item: "Three-piece suit", brand: "Tom Ford" },
            { item: "Patterned dress shirt", brand: "Versace" },
            { item: "Leather loafers", brand: "Gucci" },
          ]},
          { name: "Velvet Hour", pieces: [
            { item: "Velvet dinner blazer", brand: "Tom Ford" },
            { item: "Black dress trousers", brand: "Brioni" },
            { item: "Leather loafers", brand: "Gucci" },
          ]},
          { name: "Street Mogul", pieces: [
            { item: "Statement leather jacket", brand: "Saint Laurent" },
            { item: "Slim trousers", brand: "Tom Ford" },
            { item: "Chelsea boots", brand: "Saint Laurent" },
          ]},
        ],
      },
      {
        id: "jamal",
        name: "Jamal Lyon",
        actor: "Jussie Smollett",
        gender: "men",
        role: "Soulful middle son",
        style: "Sleek Modern Menswear",
        description:
          "Refined and minimal — clean knitwear, fitted bombers, and monochrome layering. The artist's eye applied to a wardrobe.",
        accentColor: "#5B7C99",
        signatureBrands: ["Saint Laurent", "Prada", "John Elliott", "Theory", "Common Projects"],
        keyPieces: ["Fine-gauge knit", "Bomber jacket", "Slim trousers", "Minimal sneakers"],
        vibes: ["Sleek Modern Menswear", "Minimal", "Monochrome"],
        looks: [
          { name: "Studio Minimal", pieces: [
            { item: "Fine-gauge knit", brand: "John Elliott" },
            { item: "Slim trousers", brand: "Theory" },
            { item: "Minimal sneakers", brand: "Common Projects" },
          ]},
          { name: "Stage Ready", pieces: [
            { item: "Fitted bomber", brand: "Saint Laurent" },
            { item: "Black tee", brand: "John Elliott" },
            { item: "Slim jeans", brand: "Saint Laurent" },
          ]},
          { name: "Clean Layers", pieces: [
            { item: "Wool overshirt", brand: "Prada" },
            { item: "Tapered trousers", brand: "Theory" },
            { item: "Leather sneakers", brand: "Common Projects" },
          ]},
        ],
      },
      {
        id: "hakeem",
        name: "Hakeem Lyon",
        actor: "Bryshere Y. Gray",
        gender: "men",
        role: "Youngest rap-star son",
        style: "Hip-Hop Streetwear",
        description:
          "Loud, young, and brand-forward — graphic hoodies, designer joggers, gold chains, and the freshest sneakers.",
        accentColor: "#D98E5A",
        signatureBrands: ["Off-White", "Amiri", "Givenchy", "Balenciaga", "Nike"],
        keyPieces: ["Graphic hoodie", "Designer joggers", "Bomber jacket", "Statement sneakers"],
        vibes: ["Hip-Hop Streetwear", "Luxury Streetwear", "Bold"],
        looks: [
          { name: "Young Money", pieces: [
            { item: "Graphic hoodie", brand: "Off-White" },
            { item: "Designer joggers", brand: "Amiri" },
            { item: "Statement sneakers", brand: "Balenciaga" },
          ]},
          { name: "Festival Fresh", pieces: [
            { item: "Logo bomber", brand: "Givenchy" },
            { item: "Distressed jeans", brand: "Amiri" },
            { item: "Chunky sneakers", brand: "Balenciaga" },
          ]},
          { name: "Studio Flex", pieces: [
            { item: "Printed tee", brand: "Off-White" },
            { item: "Cargo joggers", brand: "Givenchy" },
            { item: "High-top sneakers", brand: "Nike" },
          ]},
        ],
      },
      {
        id: "anika",
        name: "Anika Calhoun",
        actor: "Grace Gealey",
        gender: "women",
        role: "Polished A&R executive",
        style: "Old-Money Elegance",
        description:
          "The refined foil to Cookie — tailored sheaths, pastel suiting, and pearls. Boardroom polish with Southern poise.",
        accentColor: "#C9A66B",
        signatureBrands: ["Carolina Herrera", "Max Mara", "Chanel", "Oscar de la Renta", "Manolo Blahnik"],
        keyPieces: ["Sheath dress", "Pastel skirt suit", "Pearl jewelry", "Pointed pumps"],
        vibes: ["Old-Money Elegance", "Classic", "Polished"],
        looks: [
          { name: "Boardroom Poise", pieces: [
            { item: "Pastel skirt suit", brand: "Carolina Herrera" },
            { item: "Silk blouse", brand: "Max Mara" },
            { item: "Pointed pumps", brand: "Manolo Blahnik" },
          ]},
          { name: "Quiet Power", pieces: [
            { item: "Sheath dress", brand: "Oscar de la Renta" },
            { item: "Structured handbag", brand: "Chanel" },
            { item: "Leather pumps", brand: "Manolo Blahnik" },
          ]},
          { name: "Gala Refined", pieces: [
            { item: "Column gown", brand: "Carolina Herrera" },
            { item: "Embellished clutch", brand: "Oscar de la Renta" },
            { item: "Strappy heels", brand: "Manolo Blahnik" },
          ]},
        ],
      },
    ],
  },
  {
    id: "bmf",
    name: "BMF",
    network: "Starz",
    category: "urban",
    era: "1980s–90s",
    tagline: "Detroit hustle, golden-era flash",
    description:
      "The rise of two brothers who built a drug-and-money empire out of 1980s Detroit. The wardrobe is golden-era flash — leather, gold rope chains, tracksuits, and bold color.",
    accentColor: "#B8860B",
    vibes: ["80s Flash", "Golden-Era Hustle", "Street Luxe"],
    characters: [
      {
        id: "meech",
        name: "Demetrius 'Big Meech' Flenory",
        actor: "Demetrius Flenory Jr.",
        gender: "men",
        role: "Ambitious elder brother",
        style: "80s Flash",
        description:
          "Bold leather, gold rope chains, and statement outerwear. Meech dresses like the future kingpin he believes he'll become.",
        accentColor: "#B8860B",
        signatureBrands: ["Versace", "Gucci", "Saint Laurent", "AMIRI", "adidas"],
        keyPieces: ["Leather trench", "Gold rope chain", "Silk shirt", "Tracksuit"],
        vibes: ["80s Flash", "Street Luxe", "Bold"],
        looks: [
          { name: "Kingpin Rising", pieces: [
            { item: "Leather trench coat", brand: "Saint Laurent" },
            { item: "Silk patterned shirt", brand: "Versace" },
            { item: "Leather loafers", brand: "Gucci" },
          ]},
          { name: "Block Party Flash", pieces: [
            { item: "Velour tracksuit", brand: "adidas" },
            { item: "Gold rope chain", brand: "Versace" },
            { item: "Retro sneakers", brand: "adidas" },
          ]},
          { name: "Night Boss", pieces: [
            { item: "Two-tone leather jacket", brand: "AMIRI" },
            { item: "Slim trousers", brand: "Gucci" },
            { item: "Leather boots", brand: "Saint Laurent" },
          ]},
        ],
      },
      {
        id: "terry",
        name: "Terry 'Southwest T' Flenory",
        actor: "Da'Vinchi",
        gender: "men",
        role: "Pragmatic younger brother",
        style: "Understated Heritage",
        description:
          "The grounded counterpoint — knit polos, clean denim, and tailored separates. Quiet confidence over flash.",
        accentColor: "#6B7F5B",
        signatureBrands: ["Ralph Lauren", "Polo Ralph Lauren", "Levi's", "Clarks", "Lacoste"],
        keyPieces: ["Knit polo", "Pressed denim", "Bomber jacket", "Suede loafers"],
        vibes: ["Understated Heritage", "Classic", "Clean"],
        looks: [
          { name: "Grounded Cool", pieces: [
            { item: "Knit polo", brand: "Polo Ralph Lauren" },
            { item: "Pressed denim", brand: "Levi's" },
            { item: "Suede loafers", brand: "Clarks" },
          ]},
          { name: "Weekend Heritage", pieces: [
            { item: "Harrington jacket", brand: "Lacoste" },
            { item: "Chino trousers", brand: "Ralph Lauren" },
            { item: "Leather sneakers", brand: "Clarks" },
          ]},
          { name: "Quiet Confidence", pieces: [
            { item: "Cable knit sweater", brand: "Ralph Lauren" },
            { item: "Straight-leg jeans", brand: "Levi's" },
            { item: "Desert boots", brand: "Clarks" },
          ]},
        ],
      },
      {
        id: "markisha",
        name: "Markisha Taylor",
        actor: "La La Anthony",
        gender: "women",
        role: "Glamorous force",
        style: "80s Bombshell",
        description:
          "Big-shoulder dresses, bold jewelry, and saturated color. Markisha brings full 80s glamour to every entrance.",
        accentColor: "#C0392B",
        signatureBrands: ["Versace", "Mugler", "Balmain", "Roberto Cavalli", "Christian Louboutin"],
        keyPieces: ["Power-shoulder dress", "Bold gold jewelry", "Fur stole", "Stiletto pumps"],
        vibes: ["80s Bombshell", "Maximalist", "Glam"],
        looks: [
          { name: "Entrance Maker", pieces: [
            { item: "Power-shoulder dress", brand: "Mugler" },
            { item: "Fur stole", brand: "Roberto Cavalli" },
            { item: "Stiletto pumps", brand: "Christian Louboutin" },
          ]},
          { name: "Saturated Glam", pieces: [
            { item: "Bodycon gown", brand: "Versace" },
            { item: "Embellished clutch", brand: "Balmain" },
            { item: "Strappy heels", brand: "Christian Louboutin" },
          ]},
          { name: "Bold Nights", pieces: [
            { item: "Sequin mini dress", brand: "Balmain" },
            { item: "Statement earrings", brand: "Versace" },
            { item: "Platform heels", brand: "Christian Louboutin" },
          ]},
        ],
      },
      {
        id: "lucille",
        name: "Lucille Flenory",
        actor: "Michole Briana White",
        gender: "women",
        role: "Devoted mother",
        style: "Church Elegant",
        description:
          "Sunday-best refinement — tailored coats, modest dresses, and a felt hat. Dignity dressed in 80s warmth.",
        accentColor: "#8A6D3B",
        signatureBrands: ["Max Mara", "St. John", "Carolina Herrera", "Ferragamo", "Talbots"],
        keyPieces: ["Tailored wool coat", "Modest midi dress", "Felt hat", "Leather pumps"],
        vibes: ["Church Elegant", "Classic", "Refined"],
        looks: [
          { name: "Sunday Best", pieces: [
            { item: "Tailored wool coat", brand: "Max Mara" },
            { item: "Modest midi dress", brand: "St. John" },
            { item: "Leather pumps", brand: "Ferragamo" },
          ]},
          { name: "Warm Refinement", pieces: [
            { item: "Knit twinset", brand: "St. John" },
            { item: "A-line skirt", brand: "Carolina Herrera" },
            { item: "Block-heel pumps", brand: "Ferragamo" },
          ]},
          { name: "Quiet Dignity", pieces: [
            { item: "Belted shirt dress", brand: "Max Mara" },
            { item: "Structured handbag", brand: "Ferragamo" },
            { item: "Low pumps", brand: "Ferragamo" },
          ]},
        ],
      },
      {
        id: "lamar",
        name: "Lamar Silas",
        actor: "Eric Kofi-Abrefa",
        gender: "men",
        role: "Volatile rival",
        style: "Street Renegade",
        description:
          "Edgy and unpredictable — layered leathers, distressed denim, and rebellious accessories. The wild card's wardrobe.",
        accentColor: "#6E5773",
        signatureBrands: ["Saint Laurent", "AMIRI", "Rick Owens", "Guess", "Converse"],
        keyPieces: ["Layered leather jacket", "Distressed denim", "Bandana", "Worn boots"],
        vibes: ["Street Renegade", "Rock", "Edgy"],
        looks: [
          { name: "Wild Card", pieces: [
            { item: "Layered leather jacket", brand: "Saint Laurent" },
            { item: "Distressed denim", brand: "AMIRI" },
            { item: "Worn leather boots", brand: "Rick Owens" },
          ]},
          { name: "Renegade Layers", pieces: [
            { item: "Denim trucker jacket", brand: "Guess" },
            { item: "Black skinny jeans", brand: "AMIRI" },
            { item: "High-top sneakers", brand: "Converse" },
          ]},
          { name: "Edge Walker", pieces: [
            { item: "Studded leather jacket", brand: "Saint Laurent" },
            { item: "Ripped jeans", brand: "AMIRI" },
            { item: "Combat boots", brand: "Rick Owens" },
          ]},
        ],
      },
    ],
  },
  {
    id: "ghostbook2",
    name: "Power Book II: Ghost",
    network: "Starz",
    category: "urban",
    era: "2020s",
    tagline: "Ivy League meets the streets",
    description:
      "Tariq St. Patrick juggles an elite university and his late father's criminal world. The styling collides collegiate prep with luxury streetwear and opulent matriarch glamour.",
    accentColor: "#7E5A9B",
    vibes: ["Collegiate Luxe", "Matriarch Glam", "Luxury Streetwear"],
    characters: [
      {
        id: "tariq",
        name: "Tariq St. Patrick",
        actor: "Michael Rainey Jr.",
        gender: "men",
        role: "Student leading a double life",
        style: "Collegiate Luxe",
        description:
          "Ivy-League prep crossed with designer streetwear — varsity layers, premium hoodies, and clean denim with a luxury edge.",
        accentColor: "#7E5A9B",
        signatureBrands: ["Polo Ralph Lauren", "Amiri", "Off-White", "Moncler", "Nike"],
        keyPieces: ["Varsity jacket", "Premium hoodie", "Slim chinos", "Statement sneakers"],
        vibes: ["Collegiate Luxe", "Luxury Streetwear", "Prep"],
        looks: [
          { name: "Campus Operator", pieces: [
            { item: "Varsity jacket", brand: "Polo Ralph Lauren" },
            { item: "Premium hoodie", brand: "Amiri" },
            { item: "Statement sneakers", brand: "Nike" },
          ]},
          { name: "Lecture to Late Night", pieces: [
            { item: "Quilted overshirt", brand: "Moncler" },
            { item: "Slim chinos", brand: "Polo Ralph Lauren" },
            { item: "Leather sneakers", brand: "Off-White" },
          ]},
          { name: "Designer Casual", pieces: [
            { item: "Logo sweatshirt", brand: "Off-White" },
            { item: "Tapered denim", brand: "Amiri" },
            { item: "High-top sneakers", brand: "Nike" },
          ]},
        ],
      },
      {
        id: "monet",
        name: "Monet Tejada",
        actor: "Mary J. Blige",
        gender: "women",
        role: "Ruthless family matriarch",
        style: "Matriarch Glam",
        description:
          "Opulent and commanding — floor-length furs, leather, gold hardware, and bold tailoring. Monet wears dominance.",
        accentColor: "#9B59B6",
        signatureBrands: ["Balmain", "Gucci", "Saint Laurent", "Roberto Cavalli", "Christian Louboutin"],
        keyPieces: ["Fur coat", "Leather trousers", "Gold-hardware bag", "Stiletto boots"],
        vibes: ["Matriarch Glam", "Maximalist", "Power"],
        looks: [
          { name: "Family Boss", pieces: [
            { item: "Floor-length fur coat", brand: "Roberto Cavalli" },
            { item: "Leather trousers", brand: "Saint Laurent" },
            { item: "Stiletto boots", brand: "Christian Louboutin" },
          ]},
          { name: "Gold Command", pieces: [
            { item: "Tailored leather blazer", brand: "Balmain" },
            { item: "Gold-hardware handbag", brand: "Gucci" },
            { item: "Pointed pumps", brand: "Christian Louboutin" },
          ]},
          { name: "Night Reign", pieces: [
            { item: "Plunge jumpsuit", brand: "Balmain" },
            { item: "Embellished clutch", brand: "Gucci" },
            { item: "Strappy heels", brand: "Christian Louboutin" },
          ]},
        ],
      },
      {
        id: "cane",
        name: "Cane Tejada",
        actor: "Woody McClain",
        gender: "men",
        role: "Loyal, volatile heir",
        style: "Luxury Street",
        description:
          "Designer tracksuits, leather, and box-fresh sneakers. Cane's wardrobe is street-luxury with a sharp edge.",
        accentColor: "#5D6D7E",
        signatureBrands: ["Givenchy", "Amiri", "Balenciaga", "Moncler", "Nike"],
        keyPieces: ["Designer tracksuit", "Leather jacket", "Logo hoodie", "Statement sneakers"],
        vibes: ["Luxury Street", "Luxury Streetwear", "Edgy"],
        looks: [
          { name: "Block Luxe", pieces: [
            { item: "Designer tracksuit", brand: "Givenchy" },
            { item: "Logo hoodie", brand: "Amiri" },
            { item: "Statement sneakers", brand: "Balenciaga" },
          ]},
          { name: "Leather Night", pieces: [
            { item: "Leather jacket", brand: "Givenchy" },
            { item: "Black denim", brand: "Amiri" },
            { item: "High-top sneakers", brand: "Balenciaga" },
          ]},
          { name: "Cold Front", pieces: [
            { item: "Quilted jacket", brand: "Moncler" },
            { item: "Tech joggers", brand: "Givenchy" },
            { item: "Runner sneakers", brand: "Nike" },
          ]},
        ],
      },
      {
        id: "brayden",
        name: "Brayden Weston",
        actor: "Gianni Paolo",
        gender: "men",
        role: "Old-money best friend",
        style: "Prep Gone Rogue",
        description:
          "Trust-fund prep loosened up — rumpled oxford shirts, blazers over tees, and loafers with a downtown slouch.",
        accentColor: "#4A8C8C",
        signatureBrands: ["Polo Ralph Lauren", "Vineyard Vines", "Brooks Brothers", "Gucci", "Sperry"],
        keyPieces: ["Oxford shirt", "Navy blazer", "Chino trousers", "Loafers"],
        vibes: ["Prep Gone Rogue", "Prep", "Old Money"],
        looks: [
          { name: "Trust-Fund Casual", pieces: [
            { item: "Rumpled oxford shirt", brand: "Polo Ralph Lauren" },
            { item: "Chino trousers", brand: "Brooks Brothers" },
            { item: "Leather loafers", brand: "Gucci" },
          ]},
          { name: "Blazer & Tee", pieces: [
            { item: "Navy blazer", brand: "Brooks Brothers" },
            { item: "White tee", brand: "Polo Ralph Lauren" },
            { item: "Boat shoes", brand: "Sperry" },
          ]},
          { name: "Weekend Prep", pieces: [
            { item: "Quarter-zip knit", brand: "Vineyard Vines" },
            { item: "Slim chinos", brand: "Polo Ralph Lauren" },
            { item: "Suede loafers", brand: "Gucci" },
          ]},
        ],
      },
      {
        id: "lauren",
        name: "Lauren Baldwin",
        actor: "Paige Hurd",
        gender: "women",
        role: "Principled student",
        style: "Collegiate Soft",
        description:
          "Smart-casual campus style — knit sets, midi skirts, and clean sneakers. Polished without trying too hard.",
        accentColor: "#D14E8C",
        signatureBrands: ["Sandro", "Maje", "Reformation", "Aritzia", "Veja"],
        keyPieces: ["Knit set", "Midi skirt", "Cropped cardigan", "Clean sneakers"],
        vibes: ["Collegiate Soft", "Minimal", "Feminine"],
        looks: [
          { name: "Campus Polished", pieces: [
            { item: "Knit set", brand: "Aritzia" },
            { item: "Midi skirt", brand: "Reformation" },
            { item: "Clean sneakers", brand: "Veja" },
          ]},
          { name: "Soft Study", pieces: [
            { item: "Cropped cardigan", brand: "Sandro" },
            { item: "Slip skirt", brand: "Reformation" },
            { item: "Ballet flats", brand: "Maje" },
          ]},
          { name: "Easy Day", pieces: [
            { item: "Ribbed knit top", brand: "Aritzia" },
            { item: "Tailored trousers", brand: "Maje" },
            { item: "Leather sneakers", brand: "Veja" },
          ]},
        ],
      },
    ],
  },

  // ════════════════════════════ WESTERN (pool of 2) ════════════════════════════
  {
    id: "yellowstone",
    name: "Yellowstone",
    network: "Paramount",
    category: "western",
    era: "2020s",
    tagline: "Modern ranch, heritage grit",
    description:
      "A Montana ranching dynasty fights to hold its land. The wardrobe defined 'modern western' — heritage denim, weathered leather, statement coats, and a whole lot of boots.",
    accentColor: "#6B7F5B",
    vibes: ["Modern Western", "Ranch Heritage", "Power Western"],
    characters: [
      {
        id: "beth",
        name: "Beth Dutton",
        actor: "Kelly Reilly",
        gender: "women",
        role: "Fierce family fixer",
        style: "Power Western",
        description:
          "The breakout style icon — sharp blazers, statement coats, premium denim, and boots that mean war. Western edge with city polish.",
        accentColor: "#8B5E3C",
        signatureBrands: ["Saint Laurent", "Ralph Lauren", "Anine Bing", "FRAME", "Lucchese"],
        keyPieces: ["Statement wool coat", "Tailored blazer", "Premium denim", "Western boots"],
        vibes: ["Power Western", "Tailored", "Edgy"],
        looks: [
          { name: "Boardroom Rancher", pieces: [
            { item: "Tailored blazer", brand: "Saint Laurent" },
            { item: "High-rise denim", brand: "FRAME" },
            { item: "Western boots", brand: "Lucchese" },
          ]},
          { name: "Statement Coat", pieces: [
            { item: "Camel wool coat", brand: "Ralph Lauren" },
            { item: "Silk blouse", brand: "Anine Bing" },
            { item: "Ankle boots", brand: "Saint Laurent" },
          ]},
          { name: "Ranch Power", pieces: [
            { item: "Suede jacket", brand: "Anine Bing" },
            { item: "Slim denim", brand: "FRAME" },
            { item: "Leather boots", brand: "Lucchese" },
          ]},
        ],
      },
      {
        id: "john",
        name: "John Dutton",
        actor: "Kevin Costner",
        gender: "men",
        role: "Ranch patriarch",
        style: "Ranch Heritage",
        description:
          "Heritage workwear elevated — waxed jackets, denim, flannel, and a felt cowboy hat. The dignified American west.",
        accentColor: "#6B7F5B",
        signatureBrands: ["Filson", "Ralph Lauren", "Wrangler", "Stetson", "Lucchese"],
        keyPieces: ["Waxed canvas jacket", "Flannel shirt", "Heritage denim", "Felt cowboy hat"],
        vibes: ["Ranch Heritage", "Workwear", "Classic"],
        looks: [
          { name: "Patriarch's Uniform", pieces: [
            { item: "Waxed canvas jacket", brand: "Filson" },
            { item: "Flannel shirt", brand: "Ralph Lauren" },
            { item: "Western boots", brand: "Lucchese" },
          ]},
          { name: "Range Heritage", pieces: [
            { item: "Shearling-lined coat", brand: "Filson" },
            { item: "Heritage denim", brand: "Wrangler" },
            { item: "Leather boots", brand: "Lucchese" },
          ]},
          { name: "Sunday Ranch", pieces: [
            { item: "Wool overshirt", brand: "Ralph Lauren" },
            { item: "Straight denim", brand: "Wrangler" },
            { item: "Roper boots", brand: "Lucchese" },
          ]},
        ],
      },
      {
        id: "rip",
        name: "Rip Wheeler",
        actor: "Cole Hauser",
        gender: "men",
        role: "Loyal ranch foreman",
        style: "Rugged Workwear",
        description:
          "Pure working cowboy — dark denim, snap shirts, worn leather, and a black hat. Function-built and unfussy.",
        accentColor: "#4A4039",
        signatureBrands: ["Wrangler", "Carhartt", "Filson", "Resistol", "Ariat"],
        keyPieces: ["Snap-button shirt", "Dark denim", "Leather work jacket", "Black cowboy hat"],
        vibes: ["Rugged Workwear", "Western", "Utility"],
        looks: [
          { name: "Foreman's Day", pieces: [
            { item: "Snap-button work shirt", brand: "Wrangler" },
            { item: "Dark denim", brand: "Wrangler" },
            { item: "Western work boots", brand: "Ariat" },
          ]},
          { name: "Cold Range", pieces: [
            { item: "Canvas work jacket", brand: "Carhartt" },
            { item: "Rigid denim", brand: "Wrangler" },
            { item: "Leather boots", brand: "Ariat" },
          ]},
          { name: "Worn Leather", pieces: [
            { item: "Leather ranch jacket", brand: "Filson" },
            { item: "Straight denim", brand: "Wrangler" },
            { item: "Roper boots", brand: "Ariat" },
          ]},
        ],
      },
      {
        id: "monica",
        name: "Monica Dutton",
        actor: "Kelsey Asbille",
        gender: "women",
        role: "Grounded teacher",
        style: "Southwestern Soft",
        description:
          "Earthy and effortless — soft knits, suede, turquoise jewelry, and flowing silhouettes rooted in the land.",
        accentColor: "#B07D56",
        signatureBrands: ["Free People", "Madewell", "Isabel Marant", "Levi's", "Frye"],
        keyPieces: ["Suede jacket", "Soft knit", "Flowy midi", "Turquoise jewelry"],
        vibes: ["Southwestern Soft", "Bohemian", "Earthy"],
        looks: [
          { name: "Earthy Ease", pieces: [
            { item: "Suede jacket", brand: "Isabel Marant" },
            { item: "Soft knit top", brand: "Madewell" },
            { item: "Leather boots", brand: "Frye" },
          ]},
          { name: "Prairie Soft", pieces: [
            { item: "Flowy midi dress", brand: "Free People" },
            { item: "Denim jacket", brand: "Levi's" },
            { item: "Ankle boots", brand: "Frye" },
          ]},
          { name: "Grounded Day", pieces: [
            { item: "Chunky cardigan", brand: "Madewell" },
            { item: "Straight denim", brand: "Levi's" },
            { item: "Suede boots", brand: "Frye" },
          ]},
        ],
      },
      {
        id: "kayce",
        name: "Kayce Dutton",
        actor: "Luke Grimes",
        gender: "men",
        role: "Conflicted youngest son",
        style: "Modern Cowboy",
        description:
          "Pared-back western — henleys, denim, suede trucker jackets, and roper boots. Quiet, rugged, and clean.",
        accentColor: "#7C6F5A",
        signatureBrands: ["Wrangler", "Madewell", "RRL", "Ariat", "Levi's"],
        keyPieces: ["Henley shirt", "Suede trucker jacket", "Straight denim", "Roper boots"],
        vibes: ["Modern Cowboy", "Western", "Clean"],
        looks: [
          { name: "Easy Cowboy", pieces: [
            { item: "Waffle henley", brand: "Madewell" },
            { item: "Straight denim", brand: "Wrangler" },
            { item: "Roper boots", brand: "Ariat" },
          ]},
          { name: "Suede & Denim", pieces: [
            { item: "Suede trucker jacket", brand: "RRL" },
            { item: "Rigid denim", brand: "Levi's" },
            { item: "Leather boots", brand: "Ariat" },
          ]},
          { name: "Range Clean", pieces: [
            { item: "Western snap shirt", brand: "RRL" },
            { item: "Dark denim", brand: "Wrangler" },
            { item: "Western boots", brand: "Ariat" },
          ]},
        ],
      },
    ],
  },
  {
    id: "1923",
    name: "1923",
    network: "Paramount",
    category: "western",
    era: "1920s",
    tagline: "Prohibition-era frontier elegance",
    description:
      "A Dutton prequel set against drought, Prohibition, and the frontier. The styling is period western elegance — waistcoats, dusters, prairie silk, and 1920s tailoring.",
    accentColor: "#8A6D3B",
    vibes: ["Period Western", "1920s Heritage", "Frontier Elegance"],
    characters: [
      {
        id: "cara",
        name: "Cara Dutton",
        actor: "Helen Mirren",
        gender: "women",
        role: "Iron-willed matriarch",
        style: "Frontier Elegance",
        description:
          "1920s prairie refinement — high-neck blouses, long skirts, tailored coats, and heirloom brooches. Grace under hardship.",
        accentColor: "#9A7B4F",
        signatureBrands: ["Ralph Lauren", "Brunello Cucinelli", "Max Mara", "Doen", "Church's"],
        keyPieces: ["High-neck blouse", "Long wool skirt", "Tailored riding coat", "Leather boots"],
        vibes: ["Frontier Elegance", "Period", "Refined"],
        looks: [
          { name: "Homestead Grace", pieces: [
            { item: "High-neck blouse", brand: "Doen" },
            { item: "Long wool skirt", brand: "Ralph Lauren" },
            { item: "Leather boots", brand: "Church's" },
          ]},
          { name: "Riding Refined", pieces: [
            { item: "Tailored riding coat", brand: "Ralph Lauren" },
            { item: "Wool trousers", brand: "Max Mara" },
            { item: "Leather boots", brand: "Church's" },
          ]},
          { name: "Frontier Knit", pieces: [
            { item: "Heritage cardigan", brand: "Brunello Cucinelli" },
            { item: "Prairie skirt", brand: "Doen" },
            { item: "Lace-up boots", brand: "Church's" },
          ]},
        ],
      },
      {
        id: "jacob",
        name: "Jacob Dutton",
        actor: "Harrison Ford",
        gender: "men",
        role: "Ranch-running patriarch",
        style: "1920s Heritage",
        description:
          "Period western tailoring — waistcoats, wool trousers, long dusters, and a worn felt hat. Old-world rugged dignity.",
        accentColor: "#8A6D3B",
        signatureBrands: ["RRL", "Ralph Lauren", "Filson", "Stetson", "Red Wing"],
        keyPieces: ["Waistcoat", "Wool trousers", "Long duster coat", "Felt hat"],
        vibes: ["1920s Heritage", "Period", "Rugged"],
        looks: [
          { name: "Rancher's Waistcoat", pieces: [
            { item: "Wool waistcoat", brand: "RRL" },
            { item: "Heritage trousers", brand: "Ralph Lauren" },
            { item: "Leather boots", brand: "Red Wing" },
          ]},
          { name: "Long Duster", pieces: [
            { item: "Canvas duster coat", brand: "Filson" },
            { item: "Wool trousers", brand: "RRL" },
            { item: "Work boots", brand: "Red Wing" },
          ]},
          { name: "Homestead Layers", pieces: [
            { item: "Chambray work shirt", brand: "RRL" },
            { item: "Suspendered trousers", brand: "Ralph Lauren" },
            { item: "Leather boots", brand: "Red Wing" },
          ]},
        ],
      },
      {
        id: "spencer",
        name: "Spencer Dutton",
        actor: "Brandon Sklenar",
        gender: "men",
        role: "Adventurer nephew",
        style: "Safari Western",
        description:
          "Big-game adventurer style — field jackets, linen shirts, khaki trousers, and lace-up boots. 1920s expedition cool.",
        accentColor: "#7C6F4A",
        signatureBrands: ["Ralph Lauren", "Filson", "Belstaff", "RRL", "Red Wing"],
        keyPieces: ["Field jacket", "Linen shirt", "Khaki trousers", "Lace-up boots"],
        vibes: ["Safari Western", "Adventure", "Heritage"],
        looks: [
          { name: "Expedition Cool", pieces: [
            { item: "Waxed field jacket", brand: "Belstaff" },
            { item: "Linen shirt", brand: "Ralph Lauren" },
            { item: "Lace-up boots", brand: "Red Wing" },
          ]},
          { name: "Safari Layers", pieces: [
            { item: "Khaki field shirt", brand: "Filson" },
            { item: "Utility trousers", brand: "RRL" },
            { item: "Leather boots", brand: "Red Wing" },
          ]},
          { name: "Frontier Adventurer", pieces: [
            { item: "Leather jacket", brand: "Belstaff" },
            { item: "Chino trousers", brand: "Ralph Lauren" },
            { item: "Work boots", brand: "Red Wing" },
          ]},
        ],
      },
      {
        id: "alexandra",
        name: "Alexandra",
        actor: "Julia Schlaepfer",
        gender: "women",
        role: "Spirited British traveler",
        style: "1920s Glamour",
        description:
          "Roaring-twenties British glamour — drop-waist dresses, fur stoles, cloche hats, and silk gloves. Elegance on an adventure.",
        accentColor: "#B98EA7",
        signatureBrands: ["Ralph Lauren", "Erdem", "The Vampire's Wife", "Gucci", "Manolo Blahnik"],
        keyPieces: ["Drop-waist dress", "Fur stole", "Cloche hat", "T-strap heels"],
        vibes: ["1920s Glamour", "Period", "Elegant"],
        looks: [
          { name: "Roaring Twenties", pieces: [
            { item: "Drop-waist silk dress", brand: "The Vampire's Wife" },
            { item: "Fur stole", brand: "Gucci" },
            { item: "T-strap heels", brand: "Manolo Blahnik" },
          ]},
          { name: "Traveling Elegance", pieces: [
            { item: "Tailored travel coat", brand: "Ralph Lauren" },
            { item: "Pleated midi skirt", brand: "Erdem" },
            { item: "Leather heels", brand: "Manolo Blahnik" },
          ]},
          { name: "Evening Adventure", pieces: [
            { item: "Beaded flapper dress", brand: "Erdem" },
            { item: "Embellished clutch", brand: "Gucci" },
            { item: "Satin heels", brand: "Manolo Blahnik" },
          ]},
        ],
      },
      {
        id: "teonna",
        name: "Teonna Rainwater",
        actor: "Aminah Nieves",
        gender: "women",
        role: "Resilient young woman",
        style: "Period Resilience",
        description:
          "Hardy 1920s frontier dress — sturdy work dresses, layered shawls, and lace-up boots. Strength in simplicity.",
        accentColor: "#8C6F5E",
        signatureBrands: ["Doen", "Madewell", "Free People", "RRL", "Frye"],
        keyPieces: ["Work dress", "Wool shawl", "Pinafore", "Lace-up boots"],
        vibes: ["Period Resilience", "Earthy", "Heritage"],
        looks: [
          { name: "Frontier Day", pieces: [
            { item: "Sturdy work dress", brand: "Doen" },
            { item: "Wool shawl", brand: "Free People" },
            { item: "Lace-up boots", brand: "Frye" },
          ]},
          { name: "Layered Resilience", pieces: [
            { item: "Pinafore dress", brand: "Doen" },
            { item: "Cotton blouse", brand: "Madewell" },
            { item: "Leather boots", brand: "Frye" },
          ]},
          { name: "Homespun Strength", pieces: [
            { item: "Prairie dress", brand: "Doen" },
            { item: "Cropped knit", brand: "Madewell" },
            { item: "Work boots", brand: "Frye" },
          ]},
        ],
      },
    ],
  },

  // ════════════════════════ CONTEMPORARY (pool of 4) ════════════════════════
  {
    id: "euphoria",
    name: "Euphoria",
    network: "HBO",
    category: "contemporary",
    era: "2020s",
    tagline: "Gen-Z glitter and grit",
    description:
      "A raw look at teenage life, told through one of the most influential wardrobes on television. Y2K revival, cutouts, glitter, and expressive layering defined a generation's style.",
    accentColor: "#9B4D9E",
    vibes: ["Y2K Glam", "Expressive", "Soft Feminine"],
    characters: [
      {
        id: "maddy",
        name: "Maddy Perez",
        actor: "Alexa Demie",
        gender: "women",
        role: "Confident trendsetter",
        style: "Y2K Glam",
        description:
          "The show's biggest style influence — cutout dresses, bold prints, heels, and statement jewelry. Maximal, sexy, fearless.",
        accentColor: "#B5179E",
        signatureBrands: ["Mugler", "I.AM.GIA", "House of CB", "Miaou", "Jimmy Choo"],
        keyPieces: ["Cutout dress", "Bold mini skirt", "Going-out top", "Strappy heels"],
        vibes: ["Y2K Glam", "Bombshell", "Bold"],
        looks: [
          { name: "Cutout Queen", pieces: [
            { item: "Cutout mini dress", brand: "Mugler" },
            { item: "Statement earrings", brand: "House of CB" },
            { item: "Strappy heels", brand: "Jimmy Choo" },
          ]},
          { name: "Going-Out Glam", pieces: [
            { item: "Corset going-out top", brand: "House of CB" },
            { item: "Leather mini skirt", brand: "Miaou" },
            { item: "Heeled sandals", brand: "Jimmy Choo" },
          ]},
          { name: "Y2K Bombshell", pieces: [
            { item: "Halter mini dress", brand: "I.AM.GIA" },
            { item: "Mini shoulder bag", brand: "Mugler" },
            { item: "Pointed heels", brand: "Jimmy Choo" },
          ]},
        ],
      },
      {
        id: "cassie",
        name: "Cassie Howard",
        actor: "Sydney Sweeney",
        gender: "women",
        role: "Romantic dreamer",
        style: "Soft Feminine",
        description:
          "Pastels, ruffles, cardigans, and delicate slip dresses. Cassie's wardrobe is all soft-girl romance and pretty layering.",
        accentColor: "#E6A4B4",
        signatureBrands: ["Reformation", "For Love & Lemons", "Sandy Liang", "Aritzia", "Mansur Gavriel"],
        keyPieces: ["Slip dress", "Pastel cardigan", "Ruffled blouse", "Mary-Jane heels"],
        vibes: ["Soft Feminine", "Romantic", "Pastel"],
        looks: [
          { name: "Soft Girl", pieces: [
            { item: "Pastel slip dress", brand: "Reformation" },
            { item: "Cropped cardigan", brand: "Sandy Liang" },
            { item: "Mary-Jane heels", brand: "Reformation" },
          ]},
          { name: "Romantic Ruffles", pieces: [
            { item: "Ruffled blouse", brand: "For Love & Lemons" },
            { item: "A-line skirt", brand: "Aritzia" },
            { item: "Ballet flats", brand: "Reformation" },
          ]},
          { name: "Pretty Pastel", pieces: [
            { item: "Floral midi dress", brand: "Reformation" },
            { item: "Top-handle bag", brand: "Mansur Gavriel" },
            { item: "Kitten heels", brand: "Aritzia" },
          ]},
        ],
      },
      {
        id: "jules",
        name: "Jules Vaughn",
        actor: "Hunter Schafer",
        gender: "women",
        role: "Free-spirited artist",
        style: "Expressive Eclectic",
        description:
          "Playful and experimental — layered prints, color clashing, graphic tees, and DIY-spirited styling. Pure creative expression.",
        accentColor: "#48C9B0",
        signatureBrands: ["Marni", "Collina Strada", "Miu Miu", "Sandy Liang", "Dr. Martens"],
        keyPieces: ["Layered print top", "Pleated skirt", "Graphic tee", "Chunky boots"],
        vibes: ["Expressive Eclectic", "Playful", "Artsy"],
        looks: [
          { name: "Color Clash", pieces: [
            { item: "Layered print top", brand: "Collina Strada" },
            { item: "Pleated mini skirt", brand: "Miu Miu" },
            { item: "Chunky boots", brand: "Dr. Martens" },
          ]},
          { name: "Artsy Layers", pieces: [
            { item: "Graphic knit", brand: "Marni" },
            { item: "Printed midi skirt", brand: "Collina Strada" },
            { item: "Platform boots", brand: "Dr. Martens" },
          ]},
          { name: "DIY Spirit", pieces: [
            { item: "Cropped cardigan", brand: "Sandy Liang" },
            { item: "Mesh layered tee", brand: "Miu Miu" },
            { item: "Combat boots", brand: "Dr. Martens" },
          ]},
        ],
      },
      {
        id: "rue",
        name: "Rue Bennett",
        actor: "Zendaya",
        gender: "women",
        role: "The narrator",
        style: "Oversized Casual",
        description:
          "Comfort-core — oversized hoodies, graphic tees, baggy jeans, and worn sneakers. Effortless, lived-in, and androgynous.",
        accentColor: "#7D8CA3",
        signatureBrands: ["Stüssy", "Champion", "Levi's", "Carhartt WIP", "Converse"],
        keyPieces: ["Oversized hoodie", "Graphic tee", "Baggy jeans", "Worn sneakers"],
        vibes: ["Oversized Casual", "Comfort-core", "Androgynous"],
        looks: [
          { name: "Comfort Core", pieces: [
            { item: "Oversized hoodie", brand: "Champion" },
            { item: "Baggy jeans", brand: "Levi's" },
            { item: "Worn sneakers", brand: "Converse" },
          ]},
          { name: "Lived-In Layers", pieces: [
            { item: "Vintage graphic tee", brand: "Stüssy" },
            { item: "Workwear overshirt", brand: "Carhartt WIP" },
            { item: "High-top sneakers", brand: "Converse" },
          ]},
          { name: "Easy Day", pieces: [
            { item: "Zip-up hoodie", brand: "Stüssy" },
            { item: "Loose denim", brand: "Levi's" },
            { item: "Canvas sneakers", brand: "Converse" },
          ]},
        ],
      },
      {
        id: "nate",
        name: "Nate Jacobs",
        actor: "Jacob Elordi",
        gender: "men",
        role: "All-American antagonist",
        style: "Clean American Prep",
        description:
          "Crisp polos, athletic-fit tees, clean denim, and white sneakers. The deliberately all-American, controlled wardrobe.",
        accentColor: "#5B7C99",
        signatureBrands: ["Polo Ralph Lauren", "Lacoste", "Levi's", "Nike", "Calvin Klein"],
        keyPieces: ["Fitted polo", "Athletic tee", "Clean denim", "White sneakers"],
        vibes: ["Clean American Prep", "Prep", "Minimal"],
        looks: [
          { name: "All-American", pieces: [
            { item: "Fitted polo", brand: "Polo Ralph Lauren" },
            { item: "Clean denim", brand: "Levi's" },
            { item: "White sneakers", brand: "Nike" },
          ]},
          { name: "Athletic Clean", pieces: [
            { item: "Athletic-fit tee", brand: "Lacoste" },
            { item: "Slim chinos", brand: "Polo Ralph Lauren" },
            { item: "Leather sneakers", brand: "Nike" },
          ]},
          { name: "Controlled Casual", pieces: [
            { item: "Quarter-zip pullover", brand: "Polo Ralph Lauren" },
            { item: "Straight denim", brand: "Levi's" },
            { item: "Court sneakers", brand: "Nike" },
          ]},
        ],
      },
    ],
  },
  {
    id: "emily",
    name: "Emily in Paris",
    network: "Netflix",
    category: "contemporary",
    era: "2020s",
    tagline: "Parisian maximalism, American optimism",
    description:
      "An American marketer takes on Paris, dressed in head-turning color, berets, bucket hats, and designer everything. The wardrobe is joyful, bold, and unapologetically extra.",
    accentColor: "#D14E8C",
    vibes: ["Parisian Maximalism", "Chic Minimalism", "Bold Color"],
    characters: [
      {
        id: "emilyc",
        name: "Emily Cooper",
        actor: "Lily Collins",
        gender: "women",
        role: "Ambitious marketer",
        style: "Parisian Maximalism",
        description:
          "Bold color, clashing prints, statement accessories, and designer logos. Emily dresses like every street is a runway.",
        accentColor: "#D14E8C",
        signatureBrands: ["Christian Dior", "Kenzo", "Alice + Olivia", "Staud", "Chanel"],
        keyPieces: ["Statement coat", "Printed dress", "Beret", "Designer mini bag"],
        vibes: ["Parisian Maximalism", "Bold Color", "Eclectic"],
        looks: [
          { name: "Runway Streets", pieces: [
            { item: "Bold statement coat", brand: "Kenzo" },
            { item: "Printed midi dress", brand: "Alice + Olivia" },
            { item: "Designer mini bag", brand: "Chanel" },
          ]},
          { name: "Maximal Color", pieces: [
            { item: "Color-clash blazer", brand: "Christian Dior" },
            { item: "Pleated skirt", brand: "Staud" },
            { item: "Heeled boots", brand: "Christian Dior" },
          ]},
          { name: "Parisian Play", pieces: [
            { item: "Tweed jacket", brand: "Chanel" },
            { item: "Bold mini dress", brand: "Alice + Olivia" },
            { item: "Top-handle bag", brand: "Staud" },
          ]},
        ],
      },
      {
        id: "sylvie",
        name: "Sylvie Grateau",
        actor: "Philippine Leroy-Beaulieu",
        gender: "women",
        role: "Chic agency boss",
        style: "French Minimalism",
        description:
          "The epitome of effortless French chic — sharp tailoring, neutral palettes, plunging blouses, and impeccable restraint.",
        accentColor: "#8B7355",
        signatureBrands: ["Saint Laurent", "The Row", "Khaite", "Toteme", "Hermès"],
        keyPieces: ["Tailored blazer", "Silk blouse", "Slim trousers", "Leather pumps"],
        vibes: ["French Minimalism", "Chic", "Tailored"],
        looks: [
          { name: "Effortless Chic", pieces: [
            { item: "Tailored blazer", brand: "Saint Laurent" },
            { item: "Silk blouse", brand: "Khaite" },
            { item: "Leather pumps", brand: "Saint Laurent" },
          ]},
          { name: "Neutral Power", pieces: [
            { item: "Camel coat", brand: "The Row" },
            { item: "Slim trousers", brand: "Toteme" },
            { item: "Leather mules", brand: "The Row" },
          ]},
          { name: "Parisian Restraint", pieces: [
            { item: "Knit turtleneck", brand: "Khaite" },
            { item: "Tailored skirt", brand: "Saint Laurent" },
            { item: "Top-handle bag", brand: "Hermès" },
          ]},
        ],
      },
      {
        id: "camille",
        name: "Camille",
        actor: "Camille Razat",
        gender: "women",
        role: "Effortless gallerist",
        style: "Effortless Parisian",
        description:
          "The 'undone' French-girl ideal — silk slip dresses, blazers, soft knits, and minimal accessories worn just so.",
        accentColor: "#C9A66B",
        signatureBrands: ["Sézane", "Rouje", "Isabel Marant", "Sandro", "Chloé"],
        keyPieces: ["Silk slip dress", "Relaxed blazer", "Soft knit", "Leather flats"],
        vibes: ["Effortless Parisian", "Romantic", "Minimal"],
        looks: [
          { name: "Undone Chic", pieces: [
            { item: "Silk slip dress", brand: "Rouje" },
            { item: "Relaxed blazer", brand: "Sézane" },
            { item: "Leather flats", brand: "Chloé" },
          ]},
          { name: "Soft Parisian", pieces: [
            { item: "Fine-knit sweater", brand: "Sézane" },
            { item: "Pleated midi skirt", brand: "Sandro" },
            { item: "Ankle boots", brand: "Isabel Marant" },
          ]},
          { name: "Gallery Day", pieces: [
            { item: "Floral wrap dress", brand: "Rouje" },
            { item: "Cropped jacket", brand: "Isabel Marant" },
            { item: "Leather loafers", brand: "Chloé" },
          ]},
        ],
      },
      {
        id: "mindy",
        name: "Mindy Chen",
        actor: "Ashley Park",
        gender: "women",
        role: "Glamorous best friend",
        style: "Eclectic Glam",
        description:
          "Bold, theatrical, and fun — sequins, faux fur, statement prints, and head-to-toe color. The maximalist showstopper.",
        accentColor: "#E67E22",
        signatureBrands: ["Balmain", "Marni", "Staud", "Alice + Olivia", "Gucci"],
        keyPieces: ["Sequin jacket", "Faux-fur coat", "Statement print dress", "Platform heels"],
        vibes: ["Eclectic Glam", "Maximalist", "Theatrical"],
        looks: [
          { name: "Showstopper", pieces: [
            { item: "Sequin jacket", brand: "Balmain" },
            { item: "Bold print dress", brand: "Alice + Olivia" },
            { item: "Platform heels", brand: "Gucci" },
          ]},
          { name: "Faux-Fur Fun", pieces: [
            { item: "Faux-fur coat", brand: "Marni" },
            { item: "Satin slip dress", brand: "Staud" },
            { item: "Statement heels", brand: "Gucci" },
          ]},
          { name: "Color Theatre", pieces: [
            { item: "Color-block blazer", brand: "Marni" },
            { item: "Sequin skirt", brand: "Staud" },
            { item: "Heeled sandals", brand: "Gucci" },
          ]},
        ],
      },
      {
        id: "gabriel",
        name: "Gabriel",
        actor: "Lucas Bravo",
        gender: "men",
        role: "Charming chef",
        style: "French Casual",
        description:
          "Relaxed French menswear — fine knits, henleys, slim trousers, and suede boots. Understated, warm, and effortless.",
        accentColor: "#6B7F5B",
        signatureBrands: ["Sandro", "A.P.C.", "Officine Générale", "Sézane", "Common Projects"],
        keyPieces: ["Fine-knit sweater", "Henley shirt", "Slim trousers", "Suede boots"],
        vibes: ["French Casual", "Minimal", "Warm"],
        looks: [
          { name: "Kitchen to Café", pieces: [
            { item: "Fine-knit sweater", brand: "A.P.C." },
            { item: "Slim trousers", brand: "Officine Générale" },
            { item: "Suede boots", brand: "Common Projects" },
          ]},
          { name: "French Easy", pieces: [
            { item: "Waffle henley", brand: "Sandro" },
            { item: "Tapered chinos", brand: "A.P.C." },
            { item: "Leather sneakers", brand: "Common Projects" },
          ]},
          { name: "Warm Layers", pieces: [
            { item: "Suede overshirt", brand: "Officine Générale" },
            { item: "Slim denim", brand: "A.P.C." },
            { item: "Chelsea boots", brand: "Sandro" },
          ]},
        ],
      },
    ],
  },
  {
    id: "insecure",
    name: "Insecure",
    network: "HBO",
    category: "contemporary",
    era: "2010s–20s",
    tagline: "LA cool, natural-girl chic",
    description:
      "Two friends navigate work and love in Los Angeles, dressed in some of TV's most celebrated contemporary Black style — color, prints, natural hair, and elevated everyday fashion.",
    accentColor: "#D98E5A",
    vibes: ["Contemporary Color", "Polished Workwear", "Bold Print"],
    characters: [
      {
        id: "issa",
        name: "Issa Dee",
        actor: "Issa Rae",
        gender: "women",
        role: "Searching dreamer",
        style: "Contemporary Color",
        description:
          "Vibrant prints, bold color, denim, and elevated everyday pieces. Issa's wardrobe celebrates joyful, accessible LA style.",
        accentColor: "#D98E5A",
        signatureBrands: ["Sandro", "Maje", "Ganni", "Levi's", "Veja"],
        keyPieces: ["Print midi dress", "Denim jacket", "Bold blazer", "Clean sneakers"],
        vibes: ["Contemporary Color", "Bold Print", "Everyday Chic"],
        looks: [
          { name: "LA Color", pieces: [
            { item: "Print midi dress", brand: "Ganni" },
            { item: "Denim jacket", brand: "Levi's" },
            { item: "Clean sneakers", brand: "Veja" },
          ]},
          { name: "Everyday Elevated", pieces: [
            { item: "Bold blazer", brand: "Sandro" },
            { item: "Straight denim", brand: "Levi's" },
            { item: "Leather mules", brand: "Maje" },
          ]},
          { name: "Print Play", pieces: [
            { item: "Wrap top", brand: "Ganni" },
            { item: "Printed midi skirt", brand: "Maje" },
            { item: "Ankle boots", brand: "Sandro" },
          ]},
        ],
      },
      {
        id: "molly",
        name: "Molly Carter",
        actor: "Yvonne Orji",
        gender: "women",
        role: "Driven attorney",
        style: "Polished Workwear",
        description:
          "Sleek, tailored, and ambitious — sheath dresses, structured blazers, and refined separates for the corporate climb.",
        accentColor: "#8E5572",
        signatureBrands: ["Theory", "Max Mara", "Reiss", "Aritzia", "Stuart Weitzman"],
        keyPieces: ["Sheath dress", "Structured blazer", "Tailored trousers", "Leather pumps"],
        vibes: ["Polished Workwear", "Sleek", "Refined"],
        looks: [
          { name: "Corporate Sleek", pieces: [
            { item: "Sheath dress", brand: "Theory" },
            { item: "Structured blazer", brand: "Reiss" },
            { item: "Leather pumps", brand: "Stuart Weitzman" },
          ]},
          { name: "Boardroom Polish", pieces: [
            { item: "Tailored trousers", brand: "Max Mara" },
            { item: "Silk blouse", brand: "Theory" },
            { item: "Pointed pumps", brand: "Stuart Weitzman" },
          ]},
          { name: "Power Refined", pieces: [
            { item: "Wrap dress", brand: "Reiss" },
            { item: "Tailored coat", brand: "Max Mara" },
            { item: "Slingback heels", brand: "Stuart Weitzman" },
          ]},
        ],
      },
      {
        id: "lawrence",
        name: "Lawrence Walker",
        actor: "Jay Ellis",
        gender: "men",
        role: "Ambitious tech guy",
        style: "Casual Contemporary",
        description:
          "Approachable modern menswear — henleys, bombers, clean denim, and minimal sneakers. Easy, refined, and current.",
        accentColor: "#5B7C99",
        signatureBrands: ["Theory", "Club Monaco", "John Elliott", "Levi's", "Common Projects"],
        keyPieces: ["Henley shirt", "Bomber jacket", "Clean denim", "Minimal sneakers"],
        vibes: ["Casual Contemporary", "Minimal", "Modern"],
        looks: [
          { name: "Easy Modern", pieces: [
            { item: "Waffle henley", brand: "John Elliott" },
            { item: "Clean denim", brand: "Levi's" },
            { item: "Minimal sneakers", brand: "Common Projects" },
          ]},
          { name: "Refined Casual", pieces: [
            { item: "Bomber jacket", brand: "Theory" },
            { item: "Tapered chinos", brand: "Club Monaco" },
            { item: "Leather sneakers", brand: "Common Projects" },
          ]},
          { name: "Clean Layers", pieces: [
            { item: "Knit polo", brand: "Club Monaco" },
            { item: "Slim trousers", brand: "Theory" },
            { item: "Suede sneakers", brand: "Common Projects" },
          ]},
        ],
      },
      {
        id: "tiffany",
        name: "Tiffany DuBois",
        actor: "Amanda Seales",
        gender: "women",
        role: "Polished friend",
        style: "Preppy Bougie",
        description:
          "Bright, preppy, and pulled-together — structured dresses, pastels, statement jewelry, and ladylike accessories.",
        accentColor: "#E6A4B4",
        signatureBrands: ["Kate Spade", "Tory Burch", "Reiss", "J.Crew", "Ferragamo"],
        keyPieces: ["Structured dress", "Pastel blazer", "Statement necklace", "Block heels"],
        vibes: ["Preppy Bougie", "Polished", "Feminine"],
        looks: [
          { name: "Pulled Together", pieces: [
            { item: "Structured A-line dress", brand: "Kate Spade" },
            { item: "Pastel blazer", brand: "J.Crew" },
            { item: "Block heels", brand: "Ferragamo" },
          ]},
          { name: "Preppy Pastel", pieces: [
            { item: "Tweed jacket", brand: "Tory Burch" },
            { item: "Pleated skirt", brand: "Reiss" },
            { item: "Leather pumps", brand: "Ferragamo" },
          ]},
          { name: "Ladylike Day", pieces: [
            { item: "Belted shirt dress", brand: "Reiss" },
            { item: "Top-handle bag", brand: "Tory Burch" },
            { item: "Kitten heels", brand: "Ferragamo" },
          ]},
        ],
      },
      {
        id: "kelli",
        name: "Kelli Prenny",
        actor: "Natasha Rothwell",
        gender: "women",
        role: "Bold comic force",
        style: "Playful Bold",
        description:
          "Fun, confident, and color-forward — bold prints, statement pieces, and unapologetic personality dressing.",
        accentColor: "#E67E22",
        signatureBrands: ["Ganni", "Farm Rio", "Stine Goya", "Levi's", "Steve Madden"],
        keyPieces: ["Bold print dress", "Statement jacket", "Wide-leg pants", "Chunky sandals"],
        vibes: ["Playful Bold", "Bold Print", "Confident"],
        looks: [
          { name: "Bold & Fun", pieces: [
            { item: "Bold print maxi dress", brand: "Farm Rio" },
            { item: "Denim jacket", brand: "Levi's" },
            { item: "Chunky sandals", brand: "Steve Madden" },
          ]},
          { name: "Statement Color", pieces: [
            { item: "Printed blazer", brand: "Stine Goya" },
            { item: "Wide-leg pants", brand: "Ganni" },
            { item: "Platform sandals", brand: "Steve Madden" },
          ]},
          { name: "Print Confidence", pieces: [
            { item: "Wrap dress", brand: "Farm Rio" },
            { item: "Cropped jacket", brand: "Ganni" },
            { item: "Heeled mules", brand: "Steve Madden" },
          ]},
        ],
      },
    ],
  },
  {
    id: "satc",
    name: "Sex and the City",
    network: "HBO",
    category: "contemporary",
    era: "Timeless",
    tagline: "The original fashion-first series",
    description:
      "Four friends, one city, and the wardrobe that made fashion a main character. From tutus to couture, the styling remains the gold standard for expressive personal style.",
    accentColor: "#C9A66B",
    vibes: ["High-Fashion Eclectic", "Power Glam", "Preppy Classic"],
    characters: [
      {
        id: "carrie",
        name: "Carrie Bradshaw",
        actor: "Sarah Jessica Parker",
        gender: "women",
        role: "Fashion-obsessed writer",
        style: "High-Fashion Eclectic",
        description:
          "The most influential TV wardrobe ever — tutus, vintage finds, couture, and sky-high heels mixed with fearless abandon.",
        accentColor: "#C9A66B",
        signatureBrands: ["Christian Dior", "Manolo Blahnik", "Vivienne Westwood", "Chanel", "Fendi"],
        keyPieces: ["Statement skirt", "Vintage couture top", "Designer heels", "Mini bag"],
        vibes: ["High-Fashion Eclectic", "Romantic", "Bold"],
        looks: [
          { name: "Fashion Fearless", pieces: [
            { item: "Tulle statement skirt", brand: "Vivienne Westwood" },
            { item: "Fitted blouse", brand: "Christian Dior" },
            { item: "Designer heels", brand: "Manolo Blahnik" },
          ]},
          { name: "Vintage Couture", pieces: [
            { item: "Vintage slip dress", brand: "Chanel" },
            { item: "Statement coat", brand: "Vivienne Westwood" },
            { item: "Strappy heels", brand: "Manolo Blahnik" },
          ]},
          { name: "City Eclectic", pieces: [
            { item: "Printed wrap dress", brand: "Christian Dior" },
            { item: "Mini baguette bag", brand: "Fendi" },
            { item: "Pointed heels", brand: "Manolo Blahnik" },
          ]},
        ],
      },
      {
        id: "samantha",
        name: "Samantha Jones",
        actor: "Kim Cattrall",
        gender: "women",
        role: "Fearless PR powerhouse",
        style: "Power Glam",
        description:
          "Bold, sexy, and confident — power suits, plunging dresses, and saturated color. Samantha dresses to command.",
        accentColor: "#C0392B",
        signatureBrands: ["Versace", "Roberto Cavalli", "Mugler", "Gucci", "Jimmy Choo"],
        keyPieces: ["Power suit", "Plunge dress", "Statement coat", "Stiletto heels"],
        vibes: ["Power Glam", "Bombshell", "Bold"],
        looks: [
          { name: "PR Power", pieces: [
            { item: "Bold power suit", brand: "Mugler" },
            { item: "Silk camisole", brand: "Versace" },
            { item: "Stiletto heels", brand: "Jimmy Choo" },
          ]},
          { name: "Confident Glam", pieces: [
            { item: "Plunge cocktail dress", brand: "Versace" },
            { item: "Statement coat", brand: "Roberto Cavalli" },
            { item: "Strappy heels", brand: "Jimmy Choo" },
          ]},
          { name: "Saturated Power", pieces: [
            { item: "Color-block dress", brand: "Gucci" },
            { item: "Structured clutch", brand: "Versace" },
            { item: "Pointed pumps", brand: "Jimmy Choo" },
          ]},
        ],
      },
      {
        id: "charlotte",
        name: "Charlotte York",
        actor: "Kristin Davis",
        gender: "women",
        role: "Hopeless romantic",
        style: "Preppy Classic",
        description:
          "Ladylike and timeless — twinsets, A-line dresses, pearls, and Mary-Janes. Park Avenue polish through and through.",
        accentColor: "#E6A4B4",
        signatureBrands: ["Carolina Herrera", "Oscar de la Renta", "Kate Spade", "Chanel", "Ferragamo"],
        keyPieces: ["A-line dress", "Twinset", "Pearl jewelry", "Mary-Jane heels"],
        vibes: ["Preppy Classic", "Ladylike", "Refined"],
        looks: [
          { name: "Park Avenue", pieces: [
            { item: "A-line dress", brand: "Carolina Herrera" },
            { item: "Cropped cardigan", brand: "Kate Spade" },
            { item: "Mary-Jane heels", brand: "Ferragamo" },
          ]},
          { name: "Ladylike Classic", pieces: [
            { item: "Tweed skirt suit", brand: "Chanel" },
            { item: "Silk blouse", brand: "Carolina Herrera" },
            { item: "Block heels", brand: "Ferragamo" },
          ]},
          { name: "Timeless Polish", pieces: [
            { item: "Floral midi dress", brand: "Oscar de la Renta" },
            { item: "Top-handle bag", brand: "Kate Spade" },
            { item: "Kitten heels", brand: "Ferragamo" },
          ]},
        ],
      },
      {
        id: "miranda",
        name: "Miranda Hobbes",
        actor: "Cynthia Nixon",
        gender: "women",
        role: "Sharp-witted lawyer",
        style: "Tailored Modern",
        description:
          "Smart, structured, and practical — power suits, tailored coats, and clean separates with a no-nonsense edge.",
        accentColor: "#5B7C99",
        signatureBrands: ["Theory", "Max Mara", "Reiss", "The Row", "Stuart Weitzman"],
        keyPieces: ["Power suit", "Tailored coat", "Crisp shirt", "Leather loafers"],
        vibes: ["Tailored Modern", "Sharp", "Practical"],
        looks: [
          { name: "Courtroom Smart", pieces: [
            { item: "Tailored power suit", brand: "Theory" },
            { item: "Crisp shirt", brand: "Reiss" },
            { item: "Leather loafers", brand: "Stuart Weitzman" },
          ]},
          { name: "Structured Day", pieces: [
            { item: "Tailored coat", brand: "Max Mara" },
            { item: "Slim trousers", brand: "Theory" },
            { item: "Leather pumps", brand: "Stuart Weitzman" },
          ]},
          { name: "No-Nonsense Chic", pieces: [
            { item: "Shirt dress", brand: "The Row" },
            { item: "Structured tote", brand: "The Row" },
            { item: "Block heels", brand: "Stuart Weitzman" },
          ]},
        ],
      },
      {
        id: "big",
        name: "Mr. Big",
        actor: "Chris Noth",
        gender: "men",
        role: "Elusive financier",
        style: "Classic Suiting",
        description:
          "Old-school Manhattan elegance — impeccable suits, silk ties, overcoats, and polished leather. Timeless and assured.",
        accentColor: "#5D6D7E",
        signatureBrands: ["Brioni", "Tom Ford", "Ralph Lauren Purple Label", "Charvet", "Ferragamo"],
        keyPieces: ["Two-piece suit", "Silk tie", "Wool overcoat", "Leather Oxfords"],
        vibes: ["Classic Suiting", "Old Money", "Refined"],
        looks: [
          { name: "Manhattan Classic", pieces: [
            { item: "Two-piece suit", brand: "Brioni" },
            { item: "Silk tie", brand: "Charvet" },
            { item: "Leather Oxfords", brand: "Ferragamo" },
          ]},
          { name: "Overcoat Polish", pieces: [
            { item: "Wool overcoat", brand: "Ralph Lauren Purple Label" },
            { item: "Tailored trousers", brand: "Brioni" },
            { item: "Leather Derbys", brand: "Ferragamo" },
          ]},
          { name: "Evening Assured", pieces: [
            { item: "Dinner jacket", brand: "Tom Ford" },
            { item: "Dress shirt", brand: "Charvet" },
            { item: "Patent loafers", brand: "Ferragamo" },
          ]},
        ],
      },
    ],
  },

  // ════════════════════════════ FORMAL (pool of 4) ════════════════════════════
  {
    id: "suits",
    name: "Suits",
    network: "USA Network",
    category: "formal",
    era: "2010s",
    tagline: "The art of the power suit",
    description:
      "High-stakes corporate law dressed to perfection. The series turned tailoring into a character — three-piece suits, power dresses, and impeccable office polish.",
    accentColor: "#5B7C99",
    vibes: ["Power Suiting", "Corporate Polish", "Executive Glam"],
    characters: [
      {
        id: "harvey",
        name: "Harvey Specter",
        actor: "Gabriel Macht",
        gender: "men",
        role: "Star closer",
        style: "Power Suiting",
        description:
          "The definitive TV power dresser — three-piece suits, silk ties, pocket squares, and mirror-polished shoes. Tailoring as armor.",
        accentColor: "#5B7C99",
        signatureBrands: ["Tom Ford", "Brioni", "Ralph Lauren Purple Label", "Charvet", "Berluti"],
        keyPieces: ["Three-piece suit", "Silk tie", "Pocket square", "Leather Oxfords"],
        vibes: ["Power Suiting", "Executive", "Refined"],
        looks: [
          { name: "The Closer", pieces: [
            { item: "Three-piece suit", brand: "Tom Ford" },
            { item: "Silk tie", brand: "Charvet" },
            { item: "Leather Oxfords", brand: "Berluti" },
          ]},
          { name: "Boardroom Armor", pieces: [
            { item: "Pinstripe suit", brand: "Brioni" },
            { item: "Crisp dress shirt", brand: "Charvet" },
            { item: "Leather Derbys", brand: "Berluti" },
          ]},
          { name: "Power Overcoat", pieces: [
            { item: "Wool overcoat", brand: "Ralph Lauren Purple Label" },
            { item: "Tailored suit", brand: "Tom Ford" },
            { item: "Leather loafers", brand: "Berluti" },
          ]},
        ],
      },
      {
        id: "jessica",
        name: "Jessica Pearson",
        actor: "Gina Torres",
        gender: "women",
        role: "Commanding managing partner",
        style: "Executive Glam",
        description:
          "Power dressing at its most regal — statement coats, structured dresses, bold prints, and jewelry that commands a room.",
        accentColor: "#9B59B6",
        signatureBrands: ["Alexander McQueen", "Roberto Cavalli", "Max Mara", "Tom Ford", "Christian Louboutin"],
        keyPieces: ["Statement coat", "Structured dress", "Bold print suit", "Stiletto pumps"],
        vibes: ["Executive Glam", "Power", "Bold"],
        looks: [
          { name: "Managing Partner", pieces: [
            { item: "Statement coat", brand: "Alexander McQueen" },
            { item: "Structured sheath dress", brand: "Max Mara" },
            { item: "Stiletto pumps", brand: "Christian Louboutin" },
          ]},
          { name: "Regal Power", pieces: [
            { item: "Bold print suit", brand: "Roberto Cavalli" },
            { item: "Silk blouse", brand: "Tom Ford" },
            { item: "Pointed pumps", brand: "Christian Louboutin" },
          ]},
          { name: "Commanding Presence", pieces: [
            { item: "Tailored cape coat", brand: "Alexander McQueen" },
            { item: "Column dress", brand: "Max Mara" },
            { item: "Leather pumps", brand: "Christian Louboutin" },
          ]},
        ],
      },
      {
        id: "mike",
        name: "Mike Ross",
        actor: "Patrick J. Adams",
        gender: "men",
        role: "Brilliant associate",
        style: "Modern Slim Suiting",
        description:
          "Sharp, slim, and accessible — fitted two-piece suits, skinny ties, and clean leather shoes. Tailoring for the new generation.",
        accentColor: "#4A8C8C",
        signatureBrands: ["Theory", "Hugo Boss", "Suitsupply", "Reiss", "Allen Edmonds"],
        keyPieces: ["Slim two-piece suit", "Skinny tie", "Dress shirt", "Leather Oxfords"],
        vibes: ["Modern Slim Suiting", "Sharp", "Accessible"],
        looks: [
          { name: "Associate Sharp", pieces: [
            { item: "Slim two-piece suit", brand: "Suitsupply" },
            { item: "Skinny tie", brand: "Reiss" },
            { item: "Leather Oxfords", brand: "Allen Edmonds" },
          ]},
          { name: "Modern Office", pieces: [
            { item: "Navy suit", brand: "Hugo Boss" },
            { item: "Crisp dress shirt", brand: "Theory" },
            { item: "Leather Derbys", brand: "Allen Edmonds" },
          ]},
          { name: "Clean Tailoring", pieces: [
            { item: "Charcoal suit", brand: "Suitsupply" },
            { item: "Knit tie", brand: "Reiss" },
            { item: "Leather loafers", brand: "Allen Edmonds" },
          ]},
        ],
      },
      {
        id: "rachel",
        name: "Rachel Zane",
        actor: "Meghan Markle",
        gender: "women",
        role: "Ambitious paralegal",
        style: "Polished Workwear",
        description:
          "Refined and modern — sheath dresses, tailored blazers, silk blouses, and elegant pumps. Effortless office elegance.",
        accentColor: "#C9A66B",
        signatureBrands: ["Theory", "Reiss", "Max Mara", "Aritzia", "Stuart Weitzman"],
        keyPieces: ["Sheath dress", "Tailored blazer", "Silk blouse", "Leather pumps"],
        vibes: ["Polished Workwear", "Refined", "Elegant"],
        looks: [
          { name: "Office Elegant", pieces: [
            { item: "Sheath dress", brand: "Reiss" },
            { item: "Tailored blazer", brand: "Theory" },
            { item: "Leather pumps", brand: "Stuart Weitzman" },
          ]},
          { name: "Refined Day", pieces: [
            { item: "Silk blouse", brand: "Theory" },
            { item: "Pencil skirt", brand: "Max Mara" },
            { item: "Pointed pumps", brand: "Stuart Weitzman" },
          ]},
          { name: "Modern Polish", pieces: [
            { item: "Wrap dress", brand: "Reiss" },
            { item: "Structured coat", brand: "Max Mara" },
            { item: "Slingback heels", brand: "Stuart Weitzman" },
          ]},
        ],
      },
      {
        id: "louis",
        name: "Louis Litt",
        actor: "Rick Hoffman",
        gender: "men",
        role: "Eccentric senior partner",
        style: "Flamboyant Classic",
        description:
          "Bold, expressive tailoring — patterned suits, statement ties, pocket squares, and a flair for the dramatic. Classic with personality.",
        accentColor: "#8E44AD",
        signatureBrands: ["Etro", "Brioni", "Paul Smith", "Charvet", "Ferragamo"],
        keyPieces: ["Patterned suit", "Statement tie", "Bold pocket square", "Leather loafers"],
        vibes: ["Flamboyant Classic", "Expressive", "Bold"],
        looks: [
          { name: "Statement Partner", pieces: [
            { item: "Patterned suit", brand: "Etro" },
            { item: "Bold statement tie", brand: "Charvet" },
            { item: "Leather loafers", brand: "Ferragamo" },
          ]},
          { name: "Expressive Tailoring", pieces: [
            { item: "Check three-piece suit", brand: "Paul Smith" },
            { item: "Patterned dress shirt", brand: "Etro" },
            { item: "Leather Oxfords", brand: "Ferragamo" },
          ]},
          { name: "Dramatic Flair", pieces: [
            { item: "Velvet blazer", brand: "Etro" },
            { item: "Dress trousers", brand: "Brioni" },
            { item: "Patent loafers", brand: "Ferragamo" },
          ]},
        ],
      },
    ],
  },
  {
    id: "crown",
    name: "The Crown",
    network: "Netflix",
    category: "formal",
    era: "Mid-Century–80s",
    tagline: "Royal formal, regal restraint",
    description:
      "The reign of the British monarchy rendered in exquisite period costume. The styling is masterclass formal dressing — tailored coats, gowns, hats, and timeless royal elegance.",
    accentColor: "#7C6CA8",
    vibes: ["Royal Formal", "Regal Elegance", "Savile Row"],
    characters: [
      {
        id: "diana",
        name: "Princess Diana",
        actor: "Elizabeth Debicki",
        gender: "women",
        role: "The People's Princess",
        style: "Regal Glamour",
        description:
          "From shy-princess florals to revenge-dress glamour — tailored suits, statement gowns, and the most-watched wardrobe in royal history.",
        accentColor: "#9B7FB8",
        signatureBrands: ["Catherine Walker", "Versace", "Christian Dior", "Chanel", "Manolo Blahnik"],
        keyPieces: ["Tailored skirt suit", "Statement gown", "Structured coat", "Court heels"],
        vibes: ["Regal Glamour", "Elegant", "Iconic"],
        looks: [
          { name: "Revenge Glamour", pieces: [
            { item: "Off-shoulder cocktail dress", brand: "Christian Dior" },
            { item: "Structured clutch", brand: "Chanel" },
            { item: "Court heels", brand: "Manolo Blahnik" },
          ]},
          { name: "Princess Polish", pieces: [
            { item: "Tailored skirt suit", brand: "Catherine Walker" },
            { item: "Silk blouse", brand: "Chanel" },
            { item: "Leather pumps", brand: "Manolo Blahnik" },
          ]},
          { name: "Evening Royal", pieces: [
            { item: "Statement gown", brand: "Versace" },
            { item: "Embellished clutch", brand: "Christian Dior" },
            { item: "Satin heels", brand: "Manolo Blahnik" },
          ]},
        ],
      },
      {
        id: "elizabeth",
        name: "Queen Elizabeth II",
        actor: "Olivia Colman",
        gender: "women",
        role: "The reigning monarch",
        style: "Royal Formal",
        description:
          "Monochromatic dressing perfected — matching coats and hats in bold solid color, pearls, and structured handbags. Visibility as duty.",
        accentColor: "#7C6CA8",
        signatureBrands: ["Stewart Parvin", "Angela Kelly", "Launer", "Max Mara", "Ferragamo"],
        keyPieces: ["Monochrome coat-dress", "Matching hat", "Pearl jewelry", "Structured handbag"],
        vibes: ["Royal Formal", "Monochrome", "Regal"],
        looks: [
          { name: "Monochrome Monarch", pieces: [
            { item: "Bold coat-dress", brand: "Stewart Parvin" },
            { item: "Structured handbag", brand: "Launer" },
            { item: "Leather pumps", brand: "Ferragamo" },
          ]},
          { name: "Duty Dressing", pieces: [
            { item: "Tailored skirt suit", brand: "Angela Kelly" },
            { item: "Silk blouse", brand: "Max Mara" },
            { item: "Block heels", brand: "Ferragamo" },
          ]},
          { name: "Regal Solid", pieces: [
            { item: "Wool coat", brand: "Max Mara" },
            { item: "Matching dress", brand: "Stewart Parvin" },
            { item: "Leather pumps", brand: "Ferragamo" },
          ]},
        ],
      },
      {
        id: "margaret",
        name: "Princess Margaret",
        actor: "Helena Bonham Carter",
        gender: "women",
        role: "The glamorous sister",
        style: "Glamorous Formal",
        description:
          "The royal rebel's wardrobe — dramatic gowns, fur stoles, opera gloves, and bold jewels. Old Hollywood meets the palace.",
        accentColor: "#B5179E",
        signatureBrands: ["Christian Dior", "Chanel", "Roberto Cavalli", "Erdem", "Roger Vivier"],
        keyPieces: ["Dramatic gown", "Fur stole", "Opera gloves", "Embellished heels"],
        vibes: ["Glamorous Formal", "Old Hollywood", "Bold"],
        looks: [
          { name: "Royal Rebel", pieces: [
            { item: "Dramatic ballgown", brand: "Christian Dior" },
            { item: "Fur stole", brand: "Roberto Cavalli" },
            { item: "Embellished heels", brand: "Roger Vivier" },
          ]},
          { name: "Palace Glamour", pieces: [
            { item: "Beaded cocktail dress", brand: "Erdem" },
            { item: "Statement clutch", brand: "Chanel" },
            { item: "Satin heels", brand: "Roger Vivier" },
          ]},
          { name: "Old Hollywood", pieces: [
            { item: "Column gown", brand: "Christian Dior" },
            { item: "Opera coat", brand: "Chanel" },
            { item: "Jeweled heels", brand: "Roger Vivier" },
          ]},
        ],
      },
      {
        id: "philip",
        name: "Prince Philip",
        actor: "Tobias Menzies",
        gender: "men",
        role: "The Duke of Edinburgh",
        style: "British Formal",
        description:
          "Sharp British tailoring — double-breasted suits, regimental ties, tweed, and impeccable country-to-court versatility.",
        accentColor: "#5B7C99",
        signatureBrands: ["Gieves & Hawkes", "Anderson & Sheppard", "Turnbull & Asser", "Barbour", "Church's"],
        keyPieces: ["Double-breasted suit", "Regimental tie", "Tweed jacket", "Leather Oxfords"],
        vibes: ["British Formal", "Savile Row", "Refined"],
        looks: [
          { name: "Court Sharp", pieces: [
            { item: "Double-breasted suit", brand: "Gieves & Hawkes" },
            { item: "Regimental tie", brand: "Turnbull & Asser" },
            { item: "Leather Oxfords", brand: "Church's" },
          ]},
          { name: "Country Tailoring", pieces: [
            { item: "Tweed jacket", brand: "Anderson & Sheppard" },
            { item: "Wool trousers", brand: "Gieves & Hawkes" },
            { item: "Leather brogues", brand: "Church's" },
          ]},
          { name: "Estate Layers", pieces: [
            { item: "Waxed field jacket", brand: "Barbour" },
            { item: "Tailored trousers", brand: "Anderson & Sheppard" },
            { item: "Leather boots", brand: "Church's" },
          ]},
        ],
      },
      {
        id: "charles",
        name: "Prince Charles",
        actor: "Josh O'Connor",
        gender: "men",
        role: "The Prince of Wales",
        style: "Savile Row Classic",
        description:
          "The standard-bearer of traditional British tailoring — double-breasted suits, pocket squares, tweed, and old-world refinement.",
        accentColor: "#6B7F5B",
        signatureBrands: ["Anderson & Sheppard", "Gieves & Hawkes", "Turnbull & Asser", "Drake's", "Church's"],
        keyPieces: ["Double-breasted suit", "Pocket square", "Tweed jacket", "Leather Oxfords"],
        vibes: ["Savile Row Classic", "Old World", "Refined"],
        looks: [
          { name: "Heir Apparent", pieces: [
            { item: "Double-breasted suit", brand: "Anderson & Sheppard" },
            { item: "Silk pocket square", brand: "Drake's" },
            { item: "Leather Oxfords", brand: "Church's" },
          ]},
          { name: "Traditional Tweed", pieces: [
            { item: "Tweed three-piece suit", brand: "Gieves & Hawkes" },
            { item: "Regimental tie", brand: "Turnbull & Asser" },
            { item: "Leather brogues", brand: "Church's" },
          ]},
          { name: "Old-World Refined", pieces: [
            { item: "Chalk-stripe suit", brand: "Anderson & Sheppard" },
            { item: "Silk tie", brand: "Drake's" },
            { item: "Leather Derbys", brand: "Church's" },
          ]},
        ],
      },
    ],
  },
  {
    id: "billions",
    name: "Billions",
    network: "Showtime",
    category: "formal",
    era: "2010s–2020s",
    tagline: "Power dressing on Wall Street",
    description:
      "Hedge-fund titans and federal prosecutors trading blows in tailored armor. The wardrobe weaponizes quiet wealth — performance knits, bespoke suits, and stealth luxury that signals without shouting.",
    accentColor: "#3D5A6C",
    vibes: ["Stealth Wealth", "Power Suiting", "Performance Luxe"],
    characters: [
      {
        id: "axe",
        name: "Bobby Axelrod",
        actor: "Damian Lewis",
        gender: "men",
        role: "Hedge-fund billionaire",
        style: "Performance Luxe",
        description:
          "Billionaire-casual as a flex — premium hoodies, technical outerwear, raw denim, and box-fresh sneakers. Wealth that refuses the suit.",
        accentColor: "#3D5A6C",
        signatureBrands: ["Brunello Cucinelli", "Loro Piana", "Tom Ford", "Common Projects", "Saint Laurent"],
        keyPieces: ["Premium hoodie", "Technical jacket", "Raw denim", "Minimal sneakers"],
        vibes: ["Performance Luxe", "Billionaire Casual", "Stealth Wealth"],
        looks: [
          { name: "Trading Floor", pieces: [
            { item: "Premium zip hoodie", brand: "Brunello Cucinelli" },
            { item: "Raw denim jeans", brand: "Saint Laurent" },
            { item: "Minimal leather sneakers", brand: "Common Projects" },
          ]},
          { name: "Stealth Wealth", pieces: [
            { item: "Cashmere crewneck", brand: "Loro Piana" },
            { item: "Wool trousers", brand: "Brunello Cucinelli" },
            { item: "Suede sneakers", brand: "Common Projects" },
          ]},
          { name: "Power Off-Duty", pieces: [
            { item: "Technical bomber jacket", brand: "Tom Ford" },
            { item: "Slim chinos", brand: "Brunello Cucinelli" },
            { item: "Leather sneakers", brand: "Saint Laurent" },
          ]},
        ],
      },
      {
        id: "wendy",
        name: "Wendy Rhoades",
        actor: "Maggie Siff",
        gender: "women",
        role: "Performance coach",
        style: "Executive Minimal",
        description:
          "Sharp, controlled power dressing — tailored blazers, silk blouses, slim trousers, and clean leather boots. Authority through restraint.",
        accentColor: "#8E6C88",
        signatureBrands: ["The Row", "Max Mara", "Saint Laurent", "Bottega Veneta", "Manolo Blahnik"],
        keyPieces: ["Tailored blazer", "Silk blouse", "Slim trousers", "Leather boots"],
        vibes: ["Executive Minimal", "Controlled", "Refined"],
        looks: [
          { name: "Coaching Suite", pieces: [
            { item: "Tailored blazer", brand: "The Row" },
            { item: "Silk blouse", brand: "Saint Laurent" },
            { item: "Slim trousers", brand: "Max Mara" },
          ]},
          { name: "Power Restraint", pieces: [
            { item: "Wool coat", brand: "Max Mara" },
            { item: "Fine-knit top", brand: "The Row" },
            { item: "Leather ankle boots", brand: "Bottega Veneta" },
          ]},
          { name: "Boardroom Calm", pieces: [
            { item: "Sharp pantsuit", brand: "Saint Laurent" },
            { item: "Silk camisole", brand: "The Row" },
            { item: "Pointed pumps", brand: "Manolo Blahnik" },
          ]},
        ],
      },
      {
        id: "chuck",
        name: "Chuck Rhoades",
        actor: "Paul Giamatti",
        gender: "men",
        role: "U.S. Attorney",
        style: "Establishment Tailoring",
        description:
          "Old-money prosecutor polish — navy suits, repp ties, button-downs, and traditional leather shoes. Ivy-league institutional power.",
        accentColor: "#4A5D7E",
        signatureBrands: ["Brooks Brothers", "Paul Stuart", "Ralph Lauren", "Drake's", "Alden"],
        keyPieces: ["Navy suit", "Repp tie", "Oxford button-down", "Leather wingtips"],
        vibes: ["Establishment Tailoring", "Ivy", "Institutional"],
        looks: [
          { name: "The Prosecutor", pieces: [
            { item: "Navy two-piece suit", brand: "Paul Stuart" },
            { item: "Repp stripe tie", brand: "Drake's" },
            { item: "Leather wingtips", brand: "Alden" },
          ]},
          { name: "Ivy Authority", pieces: [
            { item: "Grey flannel suit", brand: "Brooks Brothers" },
            { item: "Oxford button-down", brand: "Ralph Lauren" },
            { item: "Leather longwings", brand: "Alden" },
          ]},
          { name: "Institutional Polish", pieces: [
            { item: "Charcoal suit", brand: "Paul Stuart" },
            { item: "Silk tie", brand: "Drake's" },
            { item: "Cap-toe Oxfords", brand: "Alden" },
          ]},
        ],
      },
      {
        id: "taylor",
        name: "Taylor Mason",
        actor: "Asia Kate Dillon",
        gender: "women",
        role: "Quant prodigy",
        style: "Minimalist Androgynous",
        description:
          "Precise, monochrome, gender-neutral tailoring — structured shirts, slim trousers, clean knits, and minimal leather shoes. Quiet intellectual armor.",
        accentColor: "#5C6B73",
        signatureBrands: ["The Row", "Jil Sander", "Lemaire", "Acne Studios", "Common Projects"],
        keyPieces: ["Structured shirt", "Slim trousers", "Fine knit", "Minimal sneakers"],
        vibes: ["Minimalist Androgynous", "Monochrome", "Precise"],
        looks: [
          { name: "Quant Precision", pieces: [
            { item: "Structured cotton shirt", brand: "Jil Sander" },
            { item: "Slim tailored trousers", brand: "The Row" },
            { item: "Minimal leather sneakers", brand: "Common Projects" },
          ]},
          { name: "Monochrome Calm", pieces: [
            { item: "Fine merino knit", brand: "Lemaire" },
            { item: "Straight-leg trousers", brand: "Jil Sander" },
            { item: "Leather derbies", brand: "Acne Studios" },
          ]},
          { name: "Intellectual Armor", pieces: [
            { item: "Minimal blazer", brand: "The Row" },
            { item: "Crewneck top", brand: "Lemaire" },
            { item: "Clean sneakers", brand: "Common Projects" },
          ]},
        ],
      },
      {
        id: "prince",
        name: "Mike Prince",
        actor: "Corey Stoll",
        gender: "men",
        role: "Philanthropist mogul",
        style: "Soft Power Tailoring",
        description:
          "Approachable billionaire polish — soft-shouldered suits, knit polos, quarter-zips, and refined loafers. Wealth dressed as warmth.",
        accentColor: "#6B7A52",
        signatureBrands: ["Brunello Cucinelli", "Loro Piana", "Zegna", "Canali", "Tod's"],
        keyPieces: ["Soft-shouldered suit", "Knit polo", "Quarter-zip", "Leather loafers"],
        vibes: ["Soft Power Tailoring", "Approachable", "Refined"],
        looks: [
          { name: "Soft Power", pieces: [
            { item: "Soft-shouldered suit", brand: "Zegna" },
            { item: "Knit polo", brand: "Brunello Cucinelli" },
            { item: "Leather loafers", brand: "Tod's" },
          ]},
          { name: "Philanthropy Polish", pieces: [
            { item: "Cashmere quarter-zip", brand: "Loro Piana" },
            { item: "Wool trousers", brand: "Canali" },
            { item: "Suede loafers", brand: "Tod's" },
          ]},
          { name: "Warm Authority", pieces: [
            { item: "Unstructured blazer", brand: "Brunello Cucinelli" },
            { item: "Fine-gauge knit", brand: "Loro Piana" },
            { item: "Leather drivers", brand: "Tod's" },
          ]},
        ],
      },
    ],
  },
  {
    id: "succession",
    name: "Succession",
    network: "HBO",
    category: "formal",
    era: "2020s",
    tagline: "The uniform of quiet money",
    description:
      "A media dynasty at war, dressed in the most studied stealth wealth on television. No logos, no flash — just impeccable cashmere, ball caps worth more than cars, and the confidence of generational money.",
    accentColor: "#2F3E46",
    vibes: ["Stealth Wealth", "Quiet Luxury", "Old Money"],
    characters: [
      {
        id: "kendall",
        name: "Kendall Roy",
        actor: "Jeremy Strong",
        gender: "men",
        role: "Heir apparent",
        style: "Stealth Wealth",
        description:
          "The most photographed quiet-luxury wardrobe on TV — Lanvin sneakers, Tom Ford bombers, plain cashmere tees, and the infamous $600 ball cap. Logo-free by design.",
        accentColor: "#2F3E46",
        signatureBrands: ["Loro Piana", "Tom Ford", "Lanvin", "Brunello Cucinelli", "Zegna"],
        keyPieces: ["Cashmere t-shirt", "Bomber jacket", "Tailored trousers", "Minimal sneakers"],
        vibes: ["Stealth Wealth", "Quiet Luxury", "Logo-Free"],
        looks: [
          { name: "Quiet Heir", pieces: [
            { item: "Plain cashmere t-shirt", brand: "Loro Piana" },
            { item: "Tailored trousers", brand: "Zegna" },
            { item: "Leather low-top sneakers", brand: "Lanvin" },
          ]},
          { name: "Stealth Bomber", pieces: [
            { item: "Suede bomber jacket", brand: "Tom Ford" },
            { item: "Fine cotton tee", brand: "Brunello Cucinelli" },
            { item: "Minimal sneakers", brand: "Lanvin" },
          ]},
          { name: "Logo-Free Luxe", pieces: [
            { item: "Cashmere overshirt", brand: "Loro Piana" },
            { item: "Slim trousers", brand: "Zegna" },
            { item: "Leather sneakers", brand: "Lanvin" },
          ]},
        ],
      },
      {
        id: "shiv",
        name: "Shiv Roy",
        actor: "Sarah Snook",
        gender: "women",
        role: "Political strategist",
        style: "Power Minimalism",
        description:
          "Cool-toned, impeccably tailored quiet luxury — neutral coats, fine knits, slim trousers, and understated leather. Control expressed through restraint.",
        accentColor: "#7C8B9A",
        signatureBrands: ["The Row", "Max Mara", "Armani", "Bottega Veneta", "Loro Piana"],
        keyPieces: ["Neutral overcoat", "Fine knit", "Slim trousers", "Leather boots"],
        vibes: ["Power Minimalism", "Quiet Luxury", "Controlled"],
        looks: [
          { name: "Strategist Neutral", pieces: [
            { item: "Camel overcoat", brand: "Max Mara" },
            { item: "Fine merino knit", brand: "The Row" },
            { item: "Slim trousers", brand: "Armani" },
          ]},
          { name: "Cool Control", pieces: [
            { item: "Tailored blazer", brand: "The Row" },
            { item: "Silk shell top", brand: "Loro Piana" },
            { item: "Leather ankle boots", brand: "Bottega Veneta" },
          ]},
          { name: "Quiet Authority", pieces: [
            { item: "Wrap coat", brand: "Max Mara" },
            { item: "Cashmere turtleneck", brand: "Loro Piana" },
            { item: "Pointed leather flats", brand: "Bottega Veneta" },
          ]},
        ],
      },
      {
        id: "logan",
        name: "Logan Roy",
        actor: "Brian Cox",
        gender: "men",
        role: "Media patriarch",
        style: "Patrician Casual",
        description:
          "Old-money off-duty — heavy cashmere cardigans, quarter-zips, soft jackets, and quiet wool. The patriarch who never needs to try.",
        accentColor: "#4F5D5A",
        signatureBrands: ["Loro Piana", "Brunello Cucinelli", "Zegna", "Cifonelli", "Edward Green"],
        keyPieces: ["Cashmere cardigan", "Quarter-zip", "Soft sport coat", "Leather shoes"],
        vibes: ["Patrician Casual", "Old Money", "Understated"],
        looks: [
          { name: "Patriarch Off-Duty", pieces: [
            { item: "Cashmere cardigan", brand: "Loro Piana" },
            { item: "Wool trousers", brand: "Zegna" },
            { item: "Leather loafers", brand: "Edward Green" },
          ]},
          { name: "Quiet Patriarch", pieces: [
            { item: "Cashmere quarter-zip", brand: "Brunello Cucinelli" },
            { item: "Flannel trousers", brand: "Cifonelli" },
            { item: "Suede shoes", brand: "Edward Green" },
          ]},
          { name: "Old-Money Soft", pieces: [
            { item: "Unstructured sport coat", brand: "Cifonelli" },
            { item: "Fine-gauge knit", brand: "Loro Piana" },
            { item: "Leather Derbys", brand: "Edward Green" },
          ]},
        ],
      },
      {
        id: "roman",
        name: "Roman Roy",
        actor: "Kieran Culkin",
        gender: "men",
        role: "Provocateur scion",
        style: "Relaxed Stealth Wealth",
        description:
          "Looser quiet luxury — open-collar shirts, soft knits, unstructured blazers, and clean sneakers. Money dressed down with a smirk.",
        accentColor: "#5A6E5C",
        signatureBrands: ["Loro Piana", "Brunello Cucinelli", "Zegna", "Common Projects", "Tod's"],
        keyPieces: ["Open-collar shirt", "Soft knit", "Unstructured blazer", "Leather sneakers"],
        vibes: ["Relaxed Stealth Wealth", "Quiet Luxury", "Effortless"],
        looks: [
          { name: "Smirking Scion", pieces: [
            { item: "Open-collar linen shirt", brand: "Loro Piana" },
            { item: "Slim trousers", brand: "Zegna" },
            { item: "Leather sneakers", brand: "Common Projects" },
          ]},
          { name: "Loose Luxe", pieces: [
            { item: "Soft cotton knit", brand: "Brunello Cucinelli" },
            { item: "Pleated trousers", brand: "Zegna" },
            { item: "Suede loafers", brand: "Tod's" },
          ]},
          { name: "Effortless Money", pieces: [
            { item: "Unstructured blazer", brand: "Brunello Cucinelli" },
            { item: "Fine cotton tee", brand: "Loro Piana" },
            { item: "Minimal sneakers", brand: "Common Projects" },
          ]},
        ],
      },
      {
        id: "gerri",
        name: "Gerri Kellman",
        actor: "J. Smith-Cameron",
        gender: "women",
        role: "General counsel",
        style: "Corporate Refinement",
        description:
          "Polished executive tailoring — sharp blazers, silk blouses, tailored dresses, and refined heels. Decades of boardroom authority distilled.",
        accentColor: "#9A7B6B",
        signatureBrands: ["Armani", "Max Mara", "Akris", "St. John", "Ferragamo"],
        keyPieces: ["Sharp blazer", "Silk blouse", "Tailored dress", "Leather pumps"],
        vibes: ["Corporate Refinement", "Executive", "Polished"],
        looks: [
          { name: "General Counsel", pieces: [
            { item: "Sharp tailored blazer", brand: "Armani" },
            { item: "Silk blouse", brand: "Akris" },
            { item: "Tailored trousers", brand: "Max Mara" },
          ]},
          { name: "Boardroom Polish", pieces: [
            { item: "Knit jacket", brand: "St. John" },
            { item: "Sheath dress", brand: "Akris" },
            { item: "Leather pumps", brand: "Ferragamo" },
          ]},
          { name: "Executive Refinement", pieces: [
            { item: "Wool coat", brand: "Max Mara" },
            { item: "Silk shell top", brand: "Armani" },
            { item: "Pointed pumps", brand: "Ferragamo" },
          ]},
        ],
      },
    ],
  },
];

// ── Weekly rotation ─────────────────────────────────────────────────────────
// The visible top-10 rotates each ISO week over the 14-show pool, holding a
// fixed 3 urban / 1 western / 3 contemporary / 3 formal quota. Deterministic
// (same week → same list everywhere) and fully offline.

const WEEKLY_QUOTA: Record<ShowCategory, number> = {
  urban: 3,
  western: 1,
  contemporary: 3,
  formal: 3,
};

const CATEGORY_ORDER: ShowCategory[] = ["urban", "western", "contemporary", "formal"];

/** ISO-8601 week number (1–53). Mon-based, week 1 contains the first Thursday. */
export function isoWeekNumber(d: Date = new Date()): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  date.setUTCDate(date.getUTCDate() - dayNum + 3); // nearest Thursday
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const ftDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - ftDayNum + 3);
  return 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
}

/** Pick `take` items starting at `offset`, wrapping around the array. */
function rotatePick<T>(arr: T[], offset: number, take: number): T[] {
  if (arr.length === 0 || take <= 0) return [];
  if (arr.length <= take) return arr.slice();
  const out: T[] = [];
  const start = ((offset % arr.length) + arr.length) % arr.length;
  for (let i = 0; i < take; i++) out.push(arr[(start + i) % arr.length]);
  return out;
}

/**
 * The week's top-10 shows: 3 urban, 1 western, 3 contemporary, 3 formal,
 * rotated by ISO week so the visible list changes weekly while keeping the
 * category mix constant.
 */
export function weeklyTopShows(date: Date = new Date()): TVShow[] {
  const week = isoWeekNumber(date);
  const out: TVShow[] = [];
  for (const cat of CATEGORY_ORDER) {
    const pool = TV_SHOWS.filter((s) => s.category === cat);
    out.push(...rotatePick(pool, week, WEEKLY_QUOTA[cat]));
  }
  return out;
}

/** Human label for the current rotation, e.g. "WEEK 26 · 2026". */
export function currentWeekLabel(date: Date = new Date()): string {
  return `WEEK ${isoWeekNumber(date)} · ${date.getFullYear()}`;
}

export function findShowById(id: string | null | undefined): TVShow | undefined {
  if (!id) return undefined;
  return TV_SHOWS.find((s) => s.id === id);
}

/** Composite muse id encodes the show so the style screen can route back. */
export function makeCharMuseId(showId: string, charId: string): string {
  return `tv:${showId}:${charId}`;
}

export function isTvMuseId(id: string | null | undefined): id is string {
  return !!id && id.startsWith("tv:");
}

/** Extract the show id from a `tv:<showId>:<charId>` muse id. */
export function showIdFromMuseId(id: string | null | undefined): string | undefined {
  if (!isTvMuseId(id)) return undefined;
  return id.split(":")[1] || undefined;
}

/**
 * Resolve a `tv:<showId>:<charId>` muse id into a synthetic `CelebFull`, so the
 * style screen's existing `activeCeleb` brand-bias + INSPIRED-BY plumbing works
 * with no engine changes. `image` is null on purpose — the style screen never
 * renders the muse photo (it reads name/accentColor/signatureBrands only), and
 * we don't fabricate character faces (see header note).
 */
export function buildMuseFromCharId(composite: string | null | undefined): CelebFull | undefined {
  if (!isTvMuseId(composite)) return undefined;
  const [, showId, charId] = composite.split(":");
  const show = findShowById(showId);
  const char = show?.characters.find((c) => c.id === charId);
  if (!show || !char) return undefined;
  return {
    id: composite,
    name: char.name,
    title: `${char.role} · ${show.name}`,
    style: char.style,
    description: char.description,
    image: null,
    accentColor: char.accentColor,
    era: show.era,
    knownFor: `${char.style} — ${show.name}`,
    signatureBrands: char.signatureBrands,
    keyPieces: char.keyPieces,
    vibes: char.vibes,
    looks: char.looks,
  };
}
