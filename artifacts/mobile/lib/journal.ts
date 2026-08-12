// ─── Style Journal — editorial content ───────────────────────────────────────
// Original fashion editorial written for Simon Yarrell. Five finished,
// substantive articles (each ~1,000–1,800 words) rather than many thin pages.
// Rules honored here:
//  • All copy is original — nothing lifted from retailers or publications.
//  • Articles answer real styling questions; they are not affiliate wrappers.
//  • Byline is always "Simon Yarrell Editorial".
//  • Articles carry no shopping links; product discovery lives in the app's
//    styling flows, so no inline affiliate disclosure is needed per article.

export type JournalCategory =
  | "Men's Style"
  | "Women's Style"
  | "Luxury"
  | "Streetwear"
  | "Sneakers"
  | "Runway"
  | "Trends"
  | "Style Education"
  | "AI & Fashion";

export type JournalBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "list"; items: string[] }
  | {
      type: "formula";
      name: string;
      pieces: string[];
      sneakerAlt?: string;
      note?: string;
    };

export interface JournalArticle {
  slug: string;
  title: string;
  category: JournalCategory;
  description: string; // card + meta description
  seoTitle: string;
  heroImage: string; // remote editorial image
  publishedAt: string; // ISO date
  updatedAt: string; // ISO date
  author: "Simon Yarrell Editorial";
  hasAffiliateLinks: boolean;
  blocks: JournalBlock[];
}

const AUTHOR = "Simon Yarrell Editorial" as const;

// Reading time from actual content — never a fabricated number.
export function readingTimeMinutes(article: JournalArticle): number {
  const words = article.blocks
    .map((b) => {
      if (b.type === "list") return b.items.join(" ");
      if (b.type === "formula")
        return [b.name, ...b.pieces, b.sneakerAlt ?? "", b.note ?? ""].join(" ");
      return b.text;
    })
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(3, Math.round(words / 220));
}

export function formatJournalDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export const JOURNAL_ARTICLES: JournalArticle[] = [
  // ── 1. Luxury streetwear ──────────────────────────────────────────────────
  {
    slug: "how-to-build-luxury-streetwear-look",
    title: "How to Build a Luxury Streetwear Look Without Overdoing It",
    category: "Streetwear",
    description:
      "Learn how to combine luxury fashion and streetwear into polished outfits without making your look feel excessive.",
    seoTitle: "How to Build a Luxury Streetwear Look | Simon Yarrell",
    heroImage:
      "https://images.unsplash.com/photo-1523398002811-999ca8dec234?w=1600&q=80",
    publishedAt: "2026-08-03",
    updatedAt: "2026-08-12",
    author: AUTHOR,
    hasAffiliateLinks: false,
    blocks: [
      {
        type: "p",
        text: "Luxury streetwear fails most often not because the pieces are wrong, but because everything is shouting at once. A logo hoodie, a graphic sneaker, a monogram bag and a statement jacket can each be excellent on their own — worn together, they cancel each other out. The looks that actually read as expensive are almost always quiet in every place except one.",
      },
      {
        type: "p",
        text: "This guide walks through the discipline behind that restraint: how to choose a single statement, how to build the supporting cast around it, and where the most common styling mistakes creep in.",
      },
      { type: "h2", text: "The one-statement rule" },
      {
        type: "p",
        text: "Pick one piece to carry the look. It might be a boxy leather jacket, a pair of sculptural sneakers, or a printed overshirt. Everything else in the outfit exists to frame it. The test is simple: if a stranger could describe your outfit in one phrase — \"the guy in the green bomber\" — you got it right. If they would need a paragraph, you over-styled it.",
      },
      {
        type: "p",
        text: "The statement does not need to be the most expensive item you own. A vivid knit worn with dark, plain trousers reads more considered than three designer logos competing for attention. Luxury streetwear is about proportion and confidence, not about total spend.",
      },
      { type: "h2", text: "Building the supporting cast" },
      { type: "h3", text: "Sneakers" },
      {
        type: "p",
        text: "When the statement is up top, keep footwear clean: minimal leather sneakers in white, bone or black, with tonal laces and no oversized branding. When the sneaker is the statement — a chunky silhouette, a strong colorway — flip the rule: plain trousers, plain top, and let the shoe close the sentence.",
      },
      { type: "h3", text: "Jackets and outerwear" },
      {
        type: "p",
        text: "Outerwear carries more visual weight than any other slot, so it decides whether an outfit reads polished or chaotic. A cropped bomber sharpens wide trousers; a longline coat calms a busy sneaker. If your jacket has a loud lining, print or hardware, treat the jacket as your one statement and mute everything underneath it.",
      },
      { type: "h3", text: "Trousers" },
      {
        type: "p",
        text: "Streetwear proportions live in the trousers. Wide-leg and relaxed cuts feel current, but they need a defined top block — a fitted tee, a tucked knit, a cropped jacket — or the silhouette collapses into shapelessness. Cargo and nylon track styles work when their color stays inside your palette; the mistake is treating utility trousers as a neutral when their pockets and seams already add visual noise.",
      },
      { type: "h3", text: "Accessories" },
      {
        type: "p",
        text: "One accessory with intent beats four worn out of habit. A beanie, a silver chain, or a structured crossbody each add texture; together they add clutter. Match hardware tones — if your bag has silver zips, skip the gold bracelet — and stop before you feel finished. The last accessory you are unsure about is the one to remove.",
      },
      { type: "h2", text: "Color coordination without a stylist" },
      {
        type: "p",
        text: "Work from a base of two neutrals — black, white, cream, grey, navy or olive — and allow one accent family. A green jacket over cream and black works because the green has no competition. Two accents can coexist only if one of them appears in a small dose, like a sock stripe or a bag strap. Three accents is a costume.",
      },
      {
        type: "p",
        text: "Tonal dressing is the shortcut that always works: shades of one color from top to shoe, with texture doing the work color usually does — a knit against nylon against suede. It reads deliberate even when the individual pieces are simple.",
      },
      { type: "h2", text: "Outfit formulas that hold up" },
      {
        type: "formula",
        name: "The quiet flex",
        pieces: [
          "Heavyweight white tee",
          "Relaxed black wide-leg trousers",
          "Statement leather bomber",
          "Minimal white leather sneakers",
        ],
        note: "The bomber is the only loud element; everything else frames it.",
      },
      {
        type: "formula",
        name: "Sneaker-first",
        pieces: [
          "Washed grey hoodie, no graphics",
          "Straight dark denim",
          "Chunky statement sneaker in a strong colorway",
        ],
        note: "The shoe carries the look — nothing above the ankle competes.",
      },
      {
        type: "formula",
        name: "Tonal layering",
        pieces: [
          "Cream knit polo",
          "Off-white pleated trousers",
          "Ecru overshirt",
          "Bone-colored suede sneakers",
        ],
        note: "One color family, four textures. Reads expensive at any budget.",
      },
      { type: "h2", text: "The mistakes that give it away" },
      {
        type: "list",
        items: [
          "Logo stacking — more than one visible logo splits attention and cheapens both.",
          "All-statement outfits — a loud jacket, loud sneaker and loud bag together read as effort, not taste.",
          "Ignoring fit for hype — an oversized silhouette is a choice; a wrong size is just a wrong size.",
          "Season confusion — a heavy puffer over shorts photographs well once and looks lost everywhere else.",
          "Buying the accent before the base — accents only work when the neutral foundation already exists in your closet.",
        ],
      },
      {
        type: "p",
        text: "Luxury streetwear rewards subtraction. Choose the statement, mute the rest, keep the palette tight, and let one idea per outfit speak clearly. That restraint — not any single purchase — is what makes the look read as considered.",
      },
    ],
  },

  // ── 2. Sneakers vs dress shoes ────────────────────────────────────────────
  {
    slug: "designer-sneakers-vs-dress-shoes",
    title: "Designer Sneakers vs. Dress Shoes: When to Wear Each",
    category: "Men's Style",
    description:
      "A practical guide to choosing between luxury sneakers, loafers and Oxfords — by occasion, outfit formality and the message you want your shoes to send.",
    seoTitle: "Designer Sneakers vs. Dress Shoes: When to Wear Each | Simon Yarrell",
    heroImage:
      "https://images.unsplash.com/photo-1449505278894-297fdb3edbc1?w=1600&q=80",
    publishedAt: "2026-08-05",
    updatedAt: "2026-08-12",
    author: AUTHOR,
    hasAffiliateLinks: false,
    blocks: [
      {
        type: "p",
        text: "Shoes decide the formality of an outfit more than any other piece. The same navy suit reads boardroom with black Oxfords, gallery-opening with loafers, and off-duty creative with minimal white sneakers. Knowing which shoe to reach for is less about rules and more about reading the room — but there are patterns that make the decision nearly automatic.",
      },
      { type: "h2", text: "The formality ladder" },
      {
        type: "p",
        text: "Think of men's footwear as a ladder from most to least formal: black Oxfords, brown Oxfords and derbies, loafers, minimalist leather sneakers, and finally statement or athletic sneakers. Every outfit has a rung it naturally sits on; the shoe can pull it one rung up or down, but rarely two. A tuxedo cannot be rescued from a running shoe, and heavy brogues will always fight a pair of nylon track pants.",
      },
      { type: "h2", text: "With a suit" },
      {
        type: "p",
        text: "For interviews, formal business settings and evening events, Oxfords remain the correct answer — black for the most formal occasions, dark brown when the room allows warmth. Loafers work with suits in warmer months and creative industries, especially with lighter fabrics like fresco or linen blends.",
      },
      {
        type: "p",
        text: "Sneakers with a suit is a real option, not a compromise — but only under strict conditions: the sneaker must be leather, minimal, and immaculate; the suit should be soft-shouldered and modern in cut; and the setting should be one where you are choosing informality, not failing at formality. A wedding guest can wear white leather sneakers with a sage summer suit. A best man should not.",
      },
      { type: "h2", text: "Smart casual and business casual" },
      {
        type: "p",
        text: "This is the zone where the choice genuinely matters, because both options are legitimate. Trousers and a knit polo accept either loafers or clean sneakers — the loafer says client-facing, the sneaker says internal day. Dark denim with a blazer takes loafers when the evening is dressy and minimal sneakers when it is not. If you are unsure which way an event leans, the loafer is the safer miss: slightly overdressed recovers faster than slightly underdressed.",
      },
      { type: "h2", text: "Evening looks" },
      {
        type: "p",
        text: "After dark, texture and darkness matter more than category. Black or deep-brown suede loafers, polished black leather sneakers with no visible branding, or Oxfords all work; anything pale, chunky or athletic starts to fight the setting. The single most useful evening rule: the darker and sleeker the shoe, the more the rest of the outfit can relax.",
      },
      { type: "h2", text: "One outfit, two endings" },
      {
        type: "p",
        text: "The most useful skill in modern menswear is building outfits that work with either shoe — a formal anchor with a sneaker escape hatch. This is exactly the idea behind Simon Yarrell's Fashion Remix feature: each Remix look is composed around a formal shoe, then validated with a coherent sneaker alternative, so one set of clothes covers two registers of the same day. Dinner at eight, flight at eleven — same trousers, different shoes, both correct.",
      },
      {
        type: "formula",
        name: "The two-register classic",
        pieces: [
          "Navy blazer",
          "White Oxford shirt",
          "Grey trousers",
          "Brown loafers",
        ],
        sneakerAlt: "Minimal white leather sneakers",
        note: "Loafers for the meeting; the sneaker swap makes the same outfit weekend-ready.",
      },
      {
        type: "formula",
        name: "Evening, relaxed",
        pieces: [
          "Black merino crewneck",
          "Charcoal pleated trousers",
          "Black suede loafers",
        ],
        sneakerAlt: "All-black leather low-top, no branding",
        note: "Both endings stay dark and sleek, so the evening rule holds either way.",
      },
      { type: "h2", text: "Choosing what to own first" },
      {
        type: "list",
        items: [
          "One pair of black Oxfords — worn rarely, but irreplaceable when required.",
          "One loafer in dark brown suede or leather — the hardest-working smart-casual shoe.",
          "One minimalist leather sneaker in white or bone — bridges denim to soft tailoring.",
          "Then, and only then, a statement sneaker — a want, not a foundation.",
        ],
      },
      {
        type: "p",
        text: "The sneaker-versus-dress-shoe question was never really a battle. They are different tools, and the well-dressed answer is owning a small set of excellent versions of each — and knowing, before you leave the house, which register the day calls for.",
      },
    ],
  },

  // ── 3. Designer + affordable ──────────────────────────────────────────────
  {
    slug: "how-to-mix-designer-and-affordable-fashion",
    title: "How to Mix Designer and Affordable Fashion",
    category: "Style Education",
    description:
      "Where to spend, where to save, and how to combine investment pieces with accessible fashion so the whole outfit reads intentional.",
    seoTitle: "How to Mix Designer and Affordable Fashion | Simon Yarrell",
    heroImage:
      "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1600&q=80",
    publishedAt: "2026-08-07",
    updatedAt: "2026-08-12",
    author: AUTHOR,
    hasAffiliateLinks: false,
    blocks: [
      {
        type: "p",
        text: "The best-dressed people you know are almost certainly mixing price points. A wardrobe built entirely at one tier — all designer or all fast fashion — tends to look either try-hard or disposable. The skill worth learning is not shopping at a certain level; it is knowing which pieces earn a real investment and which categories forgive a smaller budget completely.",
      },
      { type: "h2", text: "Where spending actually shows" },
      { type: "h3", text: "Shoes" },
      {
        type: "p",
        text: "Footwear is the most honest item in any outfit. Cheap shoes reveal themselves in the leather's creasing, the sole's edge finishing, and how they age after twenty wears. Because shoes also take the most physical abuse, quality here is not vanity — a well-made pair resoled once outlasts three inexpensive pairs. If you invest in exactly one category, make it this one.",
      },
      { type: "h3", text: "Outerwear" },
      {
        type: "p",
        text: "A coat or jacket is the largest visual surface you wear and often the only layer people see. Structure, cloth weight and how the collar sits are hard to fake at low prices. A single excellent coat upgrades every outfit underneath it for years, which makes its cost-per-wear among the lowest in your closet.",
      },
      { type: "h3", text: "Bags and leather goods" },
      {
        type: "p",
        text: "Hardware, stitching and edge paint are where inexpensive bags give themselves away, and a bag appears in every outfit you carry it with. This is also the category where restraint pays: one understated, well-made bag in a neutral tone works harder than three trend-led ones.",
      },
      { type: "h2", text: "Where saving is invisible" },
      { type: "h3", text: "Basics" },
      {
        type: "p",
        text: "Plain tees, simple tanks, and layering pieces are consumables. They yellow, stretch and bobble regardless of the label, so buy them well-fitting and inexpensive, and replace them without guilt. A crisp new affordable tee looks better than a tired luxury one every single time.",
      },
      { type: "h3", text: "Trend pieces" },
      {
        type: "p",
        text: "Anything you expect to wear for one season — a of-the-moment color, an extreme silhouette — should come from the accessible end of the market. Trends are rented, not owned; pay rental prices.",
      },
      { type: "h3", text: "Knitwear and denim — the middle ground" },
      {
        type: "p",
        text: "Both categories reward the mid-tier: past a certain price you pay for the name, below a certain price the fabric pills or bags out fast. Judge knitwear by fiber content and density, denim by weight and how it recovers after a day of wear — not by the label sewn inside.",
      },
      { type: "h2", text: "Making mixed price points look deliberate" },
      { type: "h3", text: "Fit is the equalizer" },
      {
        type: "p",
        text: "Fit is the single strongest signal of intention, and it is price-independent. An inexpensive shirt that fits through the shoulders and body beats an ill-fitting designer one. Budget for small alterations — hemming trousers, shortening sleeves — because a $15 tailoring visit does more for a look than an extra $150 spent on the garment.",
      },
      { type: "h3", text: "Fabric quality reads before logos" },
      {
        type: "p",
        text: "People perceive fabric before they identify brands: matte, dense, heavy cloth reads expensive; shiny, thin, staticky cloth reads cheap. When shopping accessible brands, filter by material first — cotton, wool, lyocell blends — and you will surface the pieces that mix seamlessly with investment items.",
      },
      { type: "h3", text: "Keep one palette across tiers" },
      {
        type: "p",
        text: "Mixed price points look mismatched when colors clash, not when labels differ. Hold every purchase, at any price, to one personal palette of neutrals plus one or two accent families, and everything you own will combine without effort.",
      },
      { type: "h2", text: "Two mixed-tier formulas" },
      {
        type: "formula",
        name: "Investment frame, accessible fill",
        pieces: [
          "Well-made wool overcoat (invest)",
          "Plain white heavyweight tee (save)",
          "Mid-tier straight-leg denim",
          "Quality leather sneakers (invest)",
        ],
        note: "The coat and shoes bookend the look; nobody inspects the tee.",
      },
      {
        type: "formula",
        name: "One hero bag",
        pieces: [
          "Accessible knit dress in a dense fabric (save)",
          "Simple gold-tone jewelry (save)",
          "Structured leather bag in a neutral (invest)",
          "Suede ballet flats or clean sneakers (mid)",
        ],
        note: "One excellent leather piece raises the perceived level of everything around it.",
      },
      {
        type: "p",
        text: "Expensive does not automatically mean better, and affordable does not mean settling. Spend where construction and aging show — shoes, outerwear, leather — save where they do not, and let fit, fabric and a consistent palette do the quiet work of making it all read as one wardrobe.",
      },
    ],
  },

  // ── 4. AI & personal styling ──────────────────────────────────────────────
  {
    slug: "how-ai-is-changing-personal-styling",
    title: "How AI Is Changing Personal Styling",
    category: "AI & Fashion",
    description:
      "What AI styling tools genuinely do well — personalized recommendations, occasion dressing, fashion discovery — and where their limits still are.",
    seoTitle: "How AI Is Changing Personal Styling | Simon Yarrell",
    heroImage:
      "https://images.unsplash.com/photo-1445205170230-053b83016050?w=1600&q=80",
    publishedAt: "2026-08-09",
    updatedAt: "2026-08-12",
    author: AUTHOR,
    hasAffiliateLinks: false,
    blocks: [
      {
        type: "p",
        text: "Personal styling used to be a luxury service: a professional who learned your taste, edited options down from an overwhelming market, and told you honestly what worked. AI has not replaced that judgment, but it has made a meaningful part of it — the filtering, the matching, the remembering — available to anyone with a phone. It is worth being precise about what these tools actually do, because the honest version is impressive enough without exaggeration.",
      },
      { type: "h2", text: "From search to recommendation" },
      {
        type: "p",
        text: "The old model of online fashion was search: you had to already know what you wanted. Recommendation flips this — the system learns from the styles you gravitate toward, the budgets you set, and the occasions you dress for, then proposes combinations you would not have searched for. The practical benefit is discovery: surfacing a brand or silhouette adjacent to your taste that you had simply never encountered.",
      },
      { type: "h2", text: "Occasion-based dressing" },
      {
        type: "p",
        text: "\"What do I wear to a summer wedding\" is a different problem from \"show me dresses.\" Occasion-aware styling encodes the unwritten rules — formality levels, seasonal fabrics, which shoes belong with which register of outfit — and applies them automatically. This is where software has a real edge over browsing: it can enforce coherence rules across an entire outfit at once, checking that the shoes match the formality of the tailoring and that nothing in the look fights the season.",
      },
      { type: "h2", text: "Closet intelligence" },
      {
        type: "p",
        text: "The next step beyond recommending new items is reasoning about what you already own: which pieces combine well, which gaps actually matter, and which purchase would unlock the most new outfits. Done well, closet intelligence makes you buy less, not more — the system's job is maximizing outfits per garment, not garments per month.",
      },
      { type: "h2", text: "How Simon Yarrell uses AI" },
      {
        type: "p",
        text: "Simon Yarrell applies these ideas in a specific, bounded way. When you set a style direction, budget and occasion, the styling engine assembles complete looks — never partial ones — from a large multi-store catalog, while hard rules run on every candidate outfit: totals must stay inside your budget, pieces must be seasonally consistent, formality must be coherent from shoe to jacket, and no look you have seen is ever repeated. An AI planning layer proposes the creative direction — palette, mood, silhouette — and the rule layer verifies every concrete garment choice against it.",
      },
      {
        type: "p",
        text: "That division of labor matters: the model contributes taste and variety; deterministic rules contribute reliability. Neither alone produces looks worth trusting.",
      },
      { type: "h2", text: "What AI styling still cannot do" },
      {
        type: "list",
        items: [
          "Fit on your body — no system knows how a shoulder seam sits on you until you try the garment.",
          "Context you have not shared — the dress code of your specific office, the formality of a particular friend's wedding.",
          "Taste formation — AI can extend your taste, but developing a point of view is still a human project.",
          "Fabric in hand — weight, drape and texture remain physical experiences that photographs flatten.",
        ],
      },
      {
        type: "p",
        text: "It is also worth saying plainly: recommendation systems can inherit biases from their catalogs, and any styling tool that monetizes through shopping links has an incentive worth being transparent about. The correct response is disclosure and rules that put outfit quality first — not a pretense of neutrality.",
      },
      { type: "h2", text: "The realistic future" },
      {
        type: "p",
        text: "The near future of AI styling is not a robot stylist with opinions about your life. It is quieter: better filtering, fewer bad options shown, outfits that respect your constraints on the first try, and a closet that gets more combinable over time. The technology is at its best when you stop noticing it — when getting dressed simply becomes easier, and the taste on display remains recognizably yours.",
      },
    ],
  },

  // ── 5. Seasonal dressing ──────────────────────────────────────────────────
  {
    slug: "complete-guide-to-dressing-for-the-season",
    title: "The Complete Guide to Dressing for the Season",
    category: "Style Education",
    description:
      "Fabrics, layers, footwear, outerwear, colors and accessories for spring, summer, fall and winter — and why season-coherent outfits always look right.",
    seoTitle: "The Complete Guide to Dressing for the Season | Simon Yarrell",
    heroImage:
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1600&q=80",
    publishedAt: "2026-08-11",
    updatedAt: "2026-08-12",
    author: AUTHOR,
    hasAffiliateLinks: false,
    blocks: [
      {
        type: "p",
        text: "Season is the invisible grammar of getting dressed. An outfit can have a perfect palette and perfect fit and still look wrong because one piece belongs to a different temperature — a tank top under a wool scarf, suede boots with linen shorts. Dressing for the season is mostly about fabric and layering logic, and once you internalize the pattern for each quarter of the year, seasonal coherence becomes automatic.",
      },
      { type: "h2", text: "Spring" },
      {
        type: "p",
        text: "Spring is transition weather: cool mornings, mild afternoons, sudden rain. The season rewards light layers you can add and remove — an unlined cotton chore jacket, a fine merino knit over a shirt, a water-resistant shell that packs away.",
      },
      {
        type: "list",
        items: [
          "Fabrics: mid-weight cotton, fine merino, cotton-linen blends, light twill.",
          "Layers: shirt + light knit + unlined jacket; each layer removable on its own.",
          "Footwear: leather sneakers, suede loafers, light chukkas — nothing fur-lined, nothing airy enough for August.",
          "Outerwear: trench coats, chore jackets, light bombers, packable shells.",
          "Colors: soften the winter base — ecru, sage, sky, camel over black.",
          "Accessories: a light scarf earns its place in March and looks lost by May; retire it early.",
        ],
      },
      { type: "h2", text: "Summer" },
      {
        type: "p",
        text: "Summer style is subtraction under constraint: fewer pieces, so each one carries more weight. Breathability decides comfort, and drape replaces layering as the main source of visual interest.",
      },
      {
        type: "list",
        items: [
          "Fabrics: linen, open-weave cotton, seersucker, lyocell — anything that moves air.",
          "Layers: one, occasionally two — a camp shirt open over a tank, nothing more.",
          "Footwear: canvas or leather sneakers with low-profile soles, leather sandals, espadrilles; save closed heavy boots for other months.",
          "Outerwear: essentially none — an overshirt for air-conditioned interiors is the summer 'coat'.",
          "Colors: this is the accent season — white and cream bases make one saturated color look effortless.",
          "Accessories: sunglasses and a woven or canvas bag do the work; heavy metals and wool anything are off-season.",
        ],
      },
      { type: "h2", text: "Fall" },
      {
        type: "p",
        text: "Fall is the layering season proper — the widest styling range of the year. Texture becomes the star: corduroy against knit, suede against denim, flannel against leather.",
      },
      {
        type: "list",
        items: [
          "Fabrics: flannel, corduroy, lambswool, mid-weight denim, suede.",
          "Layers: three works — tee or shirt, knit or overshirt, then coat; vary the weights so silhouettes stay clean.",
          "Footwear: leather boots return — chelsea, chukka, derby-soled — alongside heavier leather sneakers.",
          "Outerwear: field jackets, wool overshirts, unstructured blazers, the first real coats.",
          "Colors: earth tones lead — rust, olive, tobacco, deep burgundy over charcoal and cream.",
          "Accessories: scarves and knit hats come back mid-season; leather bags replace summer canvas.",
        ],
      },
      { type: "h2", text: "Winter" },
      {
        type: "p",
        text: "Winter dressing is engineering first, aesthetics second — but the two align more than people think, because proper winter fabrics are also the most luxurious ones: heavy wool, cashmere, shearling.",
      },
      {
        type: "list",
        items: [
          "Fabrics: heavyweight wool, cashmere, shearling, down, brushed cotton.",
          "Layers: base layer + heavy knit + serious coat; warmth should come from the knit and coat, not from stacking five thin layers.",
          "Footwear: lined leather or lug-sole boots; leather sneakers only on dry days, and never with the heaviest coat — keep formality weights matched.",
          "Outerwear: wool topcoats, down parkas, shearling — this is the investment slot of the whole year.",
          "Colors: rich darks — charcoal, chocolate, forest, navy — lifted by cream and camel so all-black doesn't flatten.",
          "Accessories: this is the only season where scarf, gloves and hat all belong at once; make them one coherent palette, not three.",
        ],
      },
      { type: "h2", text: "The season-coherence rule" },
      {
        type: "p",
        text: "The fastest way an outfit falls apart is mixing seasons within a single look — a summer top under winter accessories, sandals below a wool coat. Every piece signals a temperature, and when the signals disagree the outfit looks accidental even if each item is beautiful. This rule is built directly into Simon Yarrell's styling engine: every generated look is checked for seasonal consistency, so a recommendation never pairs a linen tank with a scarf, unless you deliberately ask for cross-season styling yourself.",
      },
      {
        type: "formula",
        name: "Fall benchmark",
        pieces: [
          "Cream lambswool crewneck",
          "Mid-weight straight denim",
          "Olive field jacket",
          "Brown suede chukka boots",
        ],
        sneakerAlt: "Tan suede low-top sneakers",
        note: "Every piece says the same temperature — that agreement is the whole trick.",
      },
      {
        type: "p",
        text: "Dress for the season you are actually in, keep every piece of one outfit speaking the same temperature, and reserve deliberate season-mixing for the rare looks where the contrast is the point. Coherence, as ever, is what reads as style.",
      },
    ],
  },
];

export function getArticle(slug: string): JournalArticle | undefined {
  return JOURNAL_ARTICLES.find((a) => a.slug === slug);
}

export function relatedArticles(slug: string, count = 3): JournalArticle[] {
  const current = getArticle(slug);
  if (!current) return JOURNAL_ARTICLES.slice(0, count);
  const same = JOURNAL_ARTICLES.filter(
    (a) => a.slug !== slug && a.category === current.category,
  );
  const others = JOURNAL_ARTICLES.filter(
    (a) => a.slug !== slug && a.category !== current.category,
  );
  return [...same, ...others].slice(0, count);
}
