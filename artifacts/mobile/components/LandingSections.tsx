/**
 * LandingSections — the full editorial landing page rendered BELOW the
 * splash hero on web (desktop + mobile web). Native iOS/Android keep the
 * original single-screen splash; this module is only mounted when
 * Platform.OS === "web" (guarded by the caller in app/onboarding.tsx).
 *
 * Sections (per user spec):
 *   1. Trusted Luxury Brands (typographic wordmarks, grayscale → gold hover)
 *   2. How Simon Yarrell Works (4 luxury step cards)
 *   3. Signature Looks carousel (real editorial imagery, Shop This Look)
 *   4. Powered by Simon AI
 *   5. Luxury Categories
 *   6. Price Comparison (Never Overpay)
 *   7. Why Simon Yarrell
 *   8. Testimonials (clearly labeled samples)
 *   9. About
 *  10. Newsletter
 *  11. Footer + trust signals
 *
 * Hard rules respected throughout:
 *  - NO legacy shadow* props (boxShadow strings only)
 *  - NO <Link asChild> — imperative router.push only
 *  - LinearGradient imported from safeWebShims
 */
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ImageSourcePropType,
} from "react-native";

import { LinearGradient } from "@/lib/safeWebShims";
import { OrnamentRule } from "@/components/OrnamentRule";
import { subscribeToNewsletter } from "@/lib/newsletter";
import { GoldButton } from "@/components/GoldButton";
import { useResponsive } from "@/hooks/useResponsive";

const GOLD = "#C6A75E";
const INK = "#0B0B0C";
const PANEL = "#131315";
const CREAM = "#F5F0E1";
const CREAM_60 = "rgba(245,240,225,0.62)";
const CREAM_40 = "rgba(245,240,225,0.4)";
const HAIRLINE = "rgba(198,167,94,0.28)";

// ─── Content data ───────────────────────────────────────────────────────────

const BRANDS = [
  "GUCCI",
  "PRADA",
  "DIOR",
  "TOM FORD",
  "SAINT LAURENT",
  "BALENCIAGA",
  "RALPH LAUREN",
  "BURBERRY",
  "VERSACE",
  "NIKE",
  "ADIDAS",
  "NEW BALANCE",
];

const STEPS: { icon: keyof typeof Feather.glyphMap; title: string; body: string }[] = [
  { icon: "user", title: "Tell us your style", body: "Share your taste, size, season, and budget — it takes under a minute." },
  { icon: "cpu", title: "AI creates personalized luxury outfits", body: "Simon AI builds complete, personalized luxury outfits — piece by piece." },
  { icon: "layers", title: "Compare products from trusted retailers", body: "Every piece is a real product with real pricing from respected retailers." },
  { icon: "shopping-bag", title: "Shop your look", body: "Tap through to buy each piece directly from the brand or retailer." },
];

type LookCard = {
  name: string;
  price: string;
  brands: string;
  image: ImageSourcePropType;
};

const LOOK_CARDS: LookCard[] = [
  { name: "Business Elite", price: "≈ $3,400", brands: "Tom Ford · Santoni · Montblanc", image: require("../assets/images/looks/power_dressing_men.png") },
  { name: "Modern Gentleman", price: "≈ $2,150", brands: "Zegna · Common Projects · Gucci", image: require("../assets/images/looks/urban_architect_men.png") },
  { name: "Old Money", price: "≈ $1,800", brands: "Ralph Lauren · Loro Piana · Cartier", image: require("../assets/images/looks/old_money_weekend_women.png") },
  { name: "Luxury Streetwear", price: "≈ $1,450", brands: "Balenciaga · Nike · Off-White", image: require("../assets/images/looks/luxury_streetwear_icon_men.png") },
  { name: "Weekend Escape", price: "≈ $980", brands: "Burberry · New Balance · Prada", image: require("../assets/images/looks/parisian_chic_women.png") },
  { name: "Black Tie", price: "≈ $4,900", brands: "Saint Laurent · Christian Louboutin", image: require("../assets/images/looks/gala_glamour_women.png") },
  { name: "Vacation Resort", price: "≈ $1,600", brands: "Loro Piana · Orlebar Brown · Dior", image: require("../assets/images/looks/resort_billionaire_men.png") },
];

const AI_POINTS = [
  "Real products",
  "Real prices",
  "Real luxury retailers",
  "Budget awareness",
  "Season awareness",
  "Color matching",
  "Dress code intelligence",
  "Occasion intelligence",
];

const CATEGORIES: { label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { label: "Men", icon: "user" },
  { label: "Women", icon: "user" },
  { label: "Shoes", icon: "chevrons-down" },
  { label: "Bags", icon: "shopping-bag" },
  { label: "Jewelry", icon: "star" },
  { label: "Accessories", icon: "watch" },
  { label: "Watches", icon: "clock" },
  { label: "Travel", icon: "map-pin" },
  { label: "Beauty", icon: "droplet" },
];

const PRICE_ROWS = [
  { retailer: "Nordstrom", price: "$495", best: false },
  { retailer: "Saks Fifth Avenue", price: "$495", best: false },
  { retailer: "SSENSE", price: "$449", best: true },
];

const WHY: { icon: keyof typeof Feather.glyphMap; label: string }[] = [
  { icon: "shield", label: "Authentic products" },
  { icon: "cpu", label: "AI styling" },
  { icon: "award", label: "Luxury expertise" },
  { icon: "bar-chart-2", label: "Price comparison" },
  { icon: "archive", label: "Personal closet" },
  { icon: "star", label: "Luxury recommendations" },
  { icon: "check-circle", label: "Trusted retailers" },
  { icon: "gift", label: "Premium shopping" },
];

// What the house stands for — shown in About. Written for affiliate-network
// reviewers as much as customers: original content, honest discovery, real
// retailers, zero counterfeits.
const COMMITMENTS: { icon: keyof typeof Feather.glyphMap; label: string }[] = [
  { icon: "edit-3", label: "Publishes original fashion & style content" },
  { icon: "cpu", label: "Uses AI to curate complete outfits" },
  { icon: "search", label: "Helps users discover real products" },
  { icon: "link", label: "Connects shoppers with legitimate retailers" },
  { icon: "shield", label: "Never sells counterfeit products" },
  { icon: "book-open", label: "Provides educational style guidance & shopping recommendations" },
];

const TESTIMONIALS = [
  { quote: "The outfits feel like they came from a personal stylist who has known me for years — except they arrive in seconds.", name: "A. Laurent", role: "Fashion professional" },
  { quote: "I stopped second-guessing full-price purchases. Seeing the same piece across retailers changed how I shop luxury.", name: "M. Okafor", role: "Luxury shopper" },
  { quote: "Every look links to real products I can actually buy. That honesty is rare — and exactly why I keep coming back.", name: "J. Reyes", role: "Creator" },
  { quote: "Board meeting Monday, gala Friday — Simon dresses me for both without me thinking twice.", name: "S. Whitmore", role: "Business executive" },
];

const FOOTER_LINKS: { label: string; route?: string }[] = [
  { label: "About", route: "/about" },
  { label: "Style Journal", route: "/journal" },
  { label: "Contact", route: "/contact" },
  { label: "Careers", route: "/careers" },
  { label: "Privacy Policy", route: "/privacy" },
  { label: "Terms of Service", route: "/terms" },
  { label: "Cookie Policy", route: "/cookies" },
  { label: "Affiliate Disclosure", route: "/partners" },
  { label: "Accessibility", route: "/accessibility" },
  { label: "Press", route: "/partners" },
  { label: "Support", route: "/support" },
  { label: "FAQ", route: "/faq" },
];

const TRUST_SIGNALS: { icon: keyof typeof Feather.glyphMap; label: string }[] = [
  { icon: "lock", label: "SSL Secure" },
  { icon: "shield", label: "Privacy Protected" },
  { icon: "credit-card", label: "Secure Checkout Partners" },
  { icon: "cpu", label: "AI Powered" },
  { icon: "award", label: "Luxury Retail Partners" },
];

// ─── Shared building blocks ─────────────────────────────────────────────────

function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={s.sectionHeader}>
      {eyebrow ? <Text style={s.eyebrow}>{eyebrow}</Text> : null}
      <Text style={s.sectionTitle}>{title}</Text>
      <OrnamentRule width={120} diamondSize={5} style={{ alignSelf: "center", marginTop: 4 }} />
      {subtitle ? <Text style={s.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

function BrandWordmarkItem({ label }: { label: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={s.brandItem}
    >
      <Text
        style={[
          s.brandText,
          { color: hovered ? GOLD : "rgba(245,240,225,0.45)" },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function HoverCard({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: object;
  onPress?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={[
        s.card,
        hovered && {
          borderColor: GOLD,
          boxShadow: "0px 12px 40px rgba(198,167,94,0.12)",
        },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export function LandingSections({ onGetStarted }: { onGetStarted: () => void }) {
  const router = useRouter();
  const { isDesktop, isTablet, width } = useResponsive();
  const pad = isDesktop ? 64 : isTablet ? 40 : 24;
  const carouselRef = useRef<ScrollView>(null);
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [subscribeError, setSubscribeError] = useState<string | null>(null);

  const handleSubscribe = async () => {
    if (subscribing) return;
    setSubscribeError(null);
    setSubscribing(true);
    const result = await subscribeToNewsletter(email);
    setSubscribing(false);
    if (result.ok) {
      setSubscribed(true);
    } else {
      setSubscribeError(result.error);
    }
  };

  const cardW = isDesktop ? 300 : 240;

  return (
    <View style={s.root}>
      {/* 1 ── Trusted Luxury Brands */}
      <View style={[s.section, { paddingHorizontal: pad }]}>
        <SectionHeader
          eyebrow="TRUSTED LUXURY BRANDS"
          title="Shop Authentic Luxury Brands"
          subtitle="Discover curated fashion from the world's most respected designers and retailers."
        />
        <View style={s.brandGrid}>
          {BRANDS.map((b) => (
            <BrandWordmarkItem key={b} label={b} />
          ))}
        </View>
      </View>

      {/* 2 ── How it works */}
      <View style={[s.section, s.sectionAlt, { paddingHorizontal: pad }]}>
        <SectionHeader eyebrow="THE PROCESS" title="How Simon Yarrell Works" />
        <View style={s.grid}>
          {STEPS.map((step, i) => (
            <HoverCard key={step.title} style={{ width: isDesktop ? "23%" : isTablet ? "47%" : "100%" }}>
              <Text style={s.stepNumber}>{String(i + 1).padStart(2, "0")}</Text>
              <View style={s.iconRing}>
                <Feather name={step.icon} size={18} color={GOLD} />
              </View>
              <Text style={s.cardTitle}>{step.title}</Text>
              <Text style={s.cardBody}>{step.body}</Text>
            </HoverCard>
          ))}
        </View>
      </View>

      {/* 3 ── Signature looks carousel */}
      <View style={[s.section, { paddingHorizontal: 0 }]}>
        <View style={{ paddingHorizontal: pad }}>
          <SectionHeader
            eyebrow="THE COLLECTION"
            title="Signature Looks"
            subtitle="Complete outfits composed by Simon AI from real designer pieces."
          />
        </View>
        <ScrollView
          ref={carouselRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: pad, gap: 20 }}
        >
          {LOOK_CARDS.map((look) => (
            <View key={look.name} style={[s.lookCard, { width: cardW }]}>
              <View style={s.lookImageWrap}>
                <Image source={look.image} style={s.lookImage} resizeMode="cover" />
                <LinearGradient
                  colors={["rgba(11,11,12,0)", "rgba(11,11,12,0.72)"]}
                  locations={[0.5, 1]}
                  style={StyleSheet.absoluteFill}
                />
                <View style={s.lookPricePill}>
                  <Text style={s.lookPriceText}>{look.price}</Text>
                </View>
              </View>
              <View style={s.lookMeta}>
                <Text style={s.lookName}>{look.name}</Text>
                <Text style={s.lookBrands}>{look.brands}</Text>
                <GoldButton small label="SHOP THIS LOOK" onPress={onGetStarted} />
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* 4 ── Powered by Simon AI */}
      <View style={[s.section, s.sectionAlt, { paddingHorizontal: pad }]}>
        <SectionHeader
          eyebrow="INTELLIGENCE"
          title="Powered by Simon AI"
          subtitle="The AI builds complete outfits using:"
        />
        <View style={s.aiGrid}>
          {AI_POINTS.map((p) => (
            <View key={p} style={s.aiPill}>
              <Feather name="check" size={13} color={GOLD} />
              <Text style={s.aiPillText}>{p}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 5 ── Luxury Categories */}
      <View style={[s.section, { paddingHorizontal: pad }]}>
        <SectionHeader eyebrow="EXPLORE" title="Luxury Categories" />
        <View style={s.grid}>
          {CATEGORIES.map((c) => (
            <HoverCard
              key={c.label}
              onPress={onGetStarted}
              style={{
                width: isDesktop ? "31%" : isTablet ? "47%" : "100%",
                alignItems: "center",
                paddingVertical: 34,
              }}
            >
              <View style={s.iconRing}>
                <Feather name={c.icon} size={18} color={GOLD} />
              </View>
              <Text style={s.cardTitle}>{c.label}</Text>
              <Text style={s.categoryShop}>SHOP →</Text>
            </HoverCard>
          ))}
        </View>
      </View>

      {/* 6 ── Price comparison */}
      <View style={[s.section, s.sectionAlt, { paddingHorizontal: pad }]}>
        <SectionHeader
          eyebrow="SMART LUXURY"
          title="Never Overpay"
          subtitle="Simon compares the same piece across trusted retailers — example:"
        />
        <View style={s.priceCard}>
          <Text style={s.priceProduct}>Tom Ford Sunglasses</Text>
          <View style={s.priceDivider} />
          {PRICE_ROWS.map((r) => (
            <View key={r.retailer} style={s.priceRow}>
              <Text style={[s.priceRetailer, r.best && { color: CREAM }]}>{r.retailer}</Text>
              <View style={s.priceRight}>
                <Text style={[s.priceValue, r.best && { color: GOLD }]}>{r.price}</Text>
                {r.best ? (
                  <View style={s.bestPill}>
                    <Feather name="check" size={11} color={INK} />
                    <Text style={s.bestPillText}>BEST PRICE</Text>
                  </View>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* 7 ── Why Simon Yarrell */}
      <View style={[s.section, { paddingHorizontal: pad }]}>
        <SectionHeader eyebrow="THE HOUSE" title="Why Simon Yarrell" />
        <View style={s.grid}>
          {WHY.map((w) => (
            <View
              key={w.label}
              style={[
                s.whyCard,
                { width: isDesktop ? "23%" : isTablet ? "47%" : "47%" },
              ]}
            >
              <Feather name={w.icon} size={17} color={GOLD} />
              <Text style={s.whyLabel}>{w.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 8 ── Testimonials */}
      <View style={[s.section, s.sectionAlt, { paddingHorizontal: pad }]}>
        <SectionHeader
          eyebrow="VOICES"
          title="What Members Say"
          subtitle="Sample testimonials — shown for illustration until real customer feedback replaces them."
        />
        <View style={s.grid}>
          {TESTIMONIALS.map((t) => (
            <View
              key={t.name}
              style={[s.card, { width: isDesktop ? "47%" : "100%" }]}
            >
              <Text style={s.quoteMark}>"</Text>
              <Text style={s.quote}>{t.quote}</Text>
              <View style={s.quoteFooter}>
                <Text style={s.quoteName}>{t.name}</Text>
                <Text style={s.quoteRole}>{t.role} · Sample</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* 9 ── About */}
      <View style={[s.section, { paddingHorizontal: pad }]}>
        <SectionHeader eyebrow="ABOUT SIMON YARRELL" title="Luxury Styling. Powered by Intelligence." />
        <Text style={s.aboutBody}>
          Simon Yarrell combines artificial intelligence with luxury fashion
          expertise to help people discover timeless style using authentic
          products from trusted retailers.
        </Text>
        {/* Affiliate-legitimacy commitments — plainly states what the platform
            does (and doesn't do) for affiliate networks, partners & customers. */}
        <View style={s.commitments}>
          {COMMITMENTS.map((c) => (
            <View key={c.label} style={s.commitmentRow}>
              <Feather name={c.icon} size={14} color={GOLD} />
              <Text style={s.commitmentText}>{c.label}</Text>
            </View>
          ))}
        </View>
        <View style={{ alignItems: "center", marginTop: 28 }}>
          <View style={{ width: 260 }}>
            <GoldButton label="GET STARTED" onPress={onGetStarted} />
          </View>
        </View>
      </View>

      {/* 10 ── Newsletter */}
      <View style={[s.section, s.sectionAlt, { paddingHorizontal: pad }]}>
        <SectionHeader
          eyebrow="THE LIST"
          title="Stay Ahead of Luxury Fashion"
          subtitle="Seasonal edits, new drops, and styling intelligence — straight to your inbox."
        />
        {subscribed ? (
          <View style={s.newsletterDone}>
            <Feather name="check-circle" size={18} color={GOLD} />
            <Text style={s.newsletterDoneText}>You're on the list.</Text>
          </View>
        ) : (
          <>
            <View style={[s.newsletterRow, !isDesktop && { flexDirection: "column" }]}>
              <TextInput
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (subscribeError) setSubscribeError(null);
                }}
                placeholder="Your email address"
                placeholderTextColor={CREAM_40}
                keyboardType="email-address"
                autoCapitalize="none"
                style={[s.newsletterInput, !isDesktop && { width: "100%" }]}
              />
              <GoldButton
                small
                label={subscribing ? "SUBSCRIBING…" : "SUBSCRIBE"}
                onPress={handleSubscribe}
              />
            </View>
            {subscribeError ? (
              <Text style={s.newsletterError}>{subscribeError}</Text>
            ) : null}
          </>
        )}
      </View>

      {/* 11 ── Footer */}
      <View style={[s.footer, { paddingHorizontal: pad }]}>
        <Text style={s.footerBrand}>SIMON YARRELL</Text>
        <Text style={s.footerTagline}>Luxury Styling. Powered by Intelligence.</Text>
        <View style={s.footerLinks}>
          {FOOTER_LINKS.map((l) =>
            l.route ? (
              <Pressable key={l.label} onPress={() => router.push(l.route as never)} hitSlop={6}>
                <Text style={[s.footerLink, { color: CREAM_60 }]}>{l.label}</Text>
              </Pressable>
            ) : (
              <Text key={l.label} style={[s.footerLink, { color: CREAM_40 }]}>
                {l.label}
              </Text>
            )
          )}
        </View>
        <View style={s.trustRow}>
          {TRUST_SIGNALS.map((t) => (
            <View key={t.label} style={s.trustItem}>
              <Feather name={t.icon} size={13} color={GOLD} />
              <Text style={s.trustText}>{t.label}</Text>
            </View>
          ))}
        </View>
        <Text style={s.copyright}>
          © {new Date().getFullYear()} Maison Simon · Simon Yarrell. All rights reserved.
        </Text>
      </View>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { backgroundColor: INK, width: "100%" },
  section: {
    paddingVertical: 72,
    width: "100%",
    maxWidth: 1180,
    alignSelf: "center",
  },
  sectionAlt: {
    maxWidth: undefined,
    backgroundColor: "#0E0E10",
  },
  sectionHeader: { alignItems: "center", gap: 12, marginBottom: 40, maxWidth: 720, alignSelf: "center" },
  eyebrow: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 4, color: GOLD },
  sectionTitle: {
    fontSize: 32,
    lineHeight: 40,
    fontFamily: "PlayfairDisplay_700Bold",
    color: CREAM,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
    color: CREAM_60,
    textAlign: "center",
  },

  // Brands
  brandGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    columnGap: 36,
    rowGap: 22,
    maxWidth: 980,
    alignSelf: "center",
  },
  brandItem: { paddingVertical: 6, paddingHorizontal: 4 },
  brandText: {
    fontSize: 15,
    fontFamily: "PlayfairDisplay_700Bold",
    letterSpacing: 3,
  },

  // Generic cards
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 18,
    width: "100%",
    maxWidth: 1180,
    alignSelf: "center",
  },
  card: {
    backgroundColor: PANEL,
    borderWidth: 1,
    borderColor: HAIRLINE,
    borderRadius: 4,
    padding: 26,
    gap: 12,
  },
  stepNumber: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 3, color: GOLD },
  iconRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: HAIRLINE,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 17, fontFamily: "PlayfairDisplay_700Bold", color: CREAM },
  cardBody: { fontSize: 13, lineHeight: 20, fontFamily: "Inter_400Regular", color: CREAM_60 },
  categoryShop: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 3, color: GOLD },

  // Looks carousel
  lookCard: {
    backgroundColor: PANEL,
    borderWidth: 1,
    borderColor: HAIRLINE,
    borderRadius: 4,
    overflow: "hidden",
  },
  lookImageWrap: { height: 300, width: "100%", backgroundColor: "#111113" },
  lookImage: { ...StyleSheet.absoluteFillObject },
  lookPricePill: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(11,11,12,0.82)",
    borderWidth: 1,
    borderColor: HAIRLINE,
    borderRadius: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  lookPriceText: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, color: GOLD },
  lookMeta: { padding: 18, gap: 8 },
  lookName: { fontSize: 18, fontFamily: "PlayfairDisplay_700Bold", color: CREAM },
  lookBrands: { fontSize: 11, fontFamily: "Inter_400Regular", letterSpacing: 0.5, color: CREAM_60, marginBottom: 6 },

  // AI section
  aiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    maxWidth: 860,
    alignSelf: "center",
  },
  aiPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: HAIRLINE,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: PANEL,
  },
  aiPillText: { fontSize: 12, fontFamily: "Inter_500Medium", letterSpacing: 0.5, color: CREAM },

  // Price comparison
  priceCard: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    backgroundColor: PANEL,
    borderWidth: 1,
    borderColor: HAIRLINE,
    borderRadius: 4,
    padding: 28,
    gap: 16,
  },
  priceProduct: { fontSize: 20, fontFamily: "PlayfairDisplay_700Bold", color: CREAM, textAlign: "center" },
  priceDivider: { height: 1, backgroundColor: HAIRLINE },
  priceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  priceRetailer: { fontSize: 13, fontFamily: "Inter_400Regular", color: CREAM_60 },
  priceRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  priceValue: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: CREAM_60 },
  bestPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: GOLD,
    borderRadius: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  bestPillText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1, color: INK },

  // Why cards
  whyCard: {
    backgroundColor: PANEL,
    borderWidth: 1,
    borderColor: HAIRLINE,
    borderRadius: 4,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 10,
  },
  whyLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.4,
    color: CREAM,
    textAlign: "center",
  },

  // Testimonials
  quoteMark: { fontSize: 40, lineHeight: 40, fontFamily: "PlayfairDisplay_700Bold", color: GOLD },
  quote: { fontSize: 14, lineHeight: 23, fontFamily: "PlayfairDisplay_400Regular_Italic", color: CREAM },
  quoteFooter: { marginTop: 6, gap: 2 },
  quoteName: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 1, color: GOLD },
  quoteRole: { fontSize: 11, fontFamily: "Inter_400Regular", color: CREAM_40 },

  // About
  aboutBody: {
    fontSize: 15,
    lineHeight: 26,
    fontFamily: "Inter_400Regular",
    color: CREAM_60,
    textAlign: "center",
    maxWidth: 620,
    alignSelf: "center",
  },

  commitments: {
    marginTop: 26,
    alignSelf: "center",
    gap: 12,
    maxWidth: 560,
    width: "100%",
  },
  commitmentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(198,167,94,0.18)",
    backgroundColor: PANEL,
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  commitmentText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Inter_400Regular",
    color: CREAM_60,
    letterSpacing: 0.2,
  },

  // Newsletter
  newsletterRow: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
  },
  newsletterInput: {
    flexGrow: 1,
    minWidth: 220,
    borderWidth: 1,
    borderColor: HAIRLINE,
    borderRadius: 4,
    backgroundColor: PANEL,
    color: CREAM,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  newsletterDone: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 8,
  },
  newsletterDoneText: { fontSize: 15, fontFamily: "PlayfairDisplay_400Regular_Italic", color: CREAM },
  newsletterError: { fontSize: 13, color: "#E07A5F", textAlign: "center", marginTop: 10 },

  // Footer
  footer: {
    borderTopWidth: 1,
    borderTopColor: HAIRLINE,
    paddingVertical: 56,
    alignItems: "center",
    gap: 20,
    width: "100%",
  },
  footerBrand: { fontSize: 14, fontFamily: "Inter_700Bold", letterSpacing: 6, color: GOLD },
  footerTagline: { fontSize: 12, fontFamily: "PlayfairDisplay_400Regular_Italic", color: CREAM_60 },
  footerLinks: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    columnGap: 22,
    rowGap: 10,
    maxWidth: 760,
  },
  footerLink: { fontSize: 12, fontFamily: "Inter_400Regular", letterSpacing: 0.3 },
  trustRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    columnGap: 24,
    rowGap: 12,
    marginTop: 8,
  },
  trustItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  trustText: { fontSize: 11, fontFamily: "Inter_500Medium", letterSpacing: 0.5, color: CREAM_60 },
  copyright: { fontSize: 11, fontFamily: "Inter_400Regular", color: CREAM_40, marginTop: 10 },
});
