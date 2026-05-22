import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { findCelebById } from "@/lib/celebLookup";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { useShopBrandHandoff } from "@/hooks/useShopBrandHandoff";
import { BrandWordmark } from "@/components/BrandWordmark";
import { LookCard } from "@/components/LookCard";
import { TitleRule } from "@/components/TitleRule";
import { TRENDS } from "@/constants/data";

const { width, height } = Dimensions.get("window");

export default function CelebrityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isCelebritySaved, toggleCelebrity, savedLooks } = useApp();
  const [activeTab, setActiveTab] = useState<"story" | "looks" | "brands">("story");
  // Brands They Wear chips → shop brand drawer (batch 64 — third surface
  // in the closet→shop signals track after closet signature [62] and
  // look-detail pieces [63]). Gated by brandCatalog: collabs and personal
  // labels ("OVO", "Yeezy", "Nike / Nocta", "Cactus Jack") intentionally
  // won't match BRANDS canonical names — those render as plain chips
  // (existing behavior), canonical brands ("Louis Vuitton", "Hermès",
  // "Balenciaga", "Bottega Veneta") become tappable with a chevron cue.
  const { brandCatalog, goShopBrand } = useShopBrandHandoff();

  const celeb = findCelebById(id);
  if (!celeb) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>
          Icon not found
        </Text>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: colors.gold, fontFamily: "Inter_500Medium" }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const saved = isCelebritySaved(celeb.id);

  // User's own savedLooks attributed to this celeb via inspiredBy === celeb.name
  // (the source-of-truth key used across batches 22, 24, 25, 28, 32). saveLook
  // prepends (`[look, ...prev]` in AppContext), so savedLooks is already
  // newest-first — no reverse needed; filter preserves order. When empty, the
  // YOUR LOOKS block doesn't render — keeps the LOOKS tab visually consistent
  // for users who haven't generated yet.
  const myLooksForCeleb = savedLooks.filter((l) => l.inspiredBy === celeb.name);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>

        {/* ── Hero ── */}
        <View style={styles.hero}>
          <Image
            source={celeb.image}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={400}
          />
          <LinearGradient
            colors={["rgba(11,11,12,0.55)", "transparent", "transparent", "#0B0B0C"]}
            locations={[0, 0.3, 0.6, 1]}
            style={StyleSheet.absoluteFill}
          />

          {/* Top bar */}
          <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
            <Pressable
              onPress={() => router.back()}
              style={[styles.circleBtn, { backgroundColor: "rgba(11,11,12,0.6)" }]}
              hitSlop={12}
            >
              <Feather name="arrow-left" size={18} color="#F5F5F0" />
            </Pressable>
            <BrandWordmark style={{ opacity: 0.9 }} />
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                toggleCelebrity(celeb.id);
              }}
              style={[
                styles.circleBtn,
                { backgroundColor: saved ? celeb.accentColor : "rgba(11,11,12,0.6)" },
              ]}
              hitSlop={12}
            >
              <Feather name="heart" size={16} color={saved ? "#0B0B0C" : "#F5F5F0"} />
            </Pressable>
          </View>

          {/* Hero info */}
          <View style={styles.heroInfo}>
            <View style={[styles.eraBadge, { borderColor: celeb.accentColor }]}>
              <Text style={[styles.eraText, { color: celeb.accentColor }]}>
                {celeb.era}
              </Text>
            </View>
            <Text style={styles.heroName}>{celeb.name}</Text>
            {/* Gold rule (batch 127) — extends the editorial motif onto the
                celebrity-detail hero overlay, the sibling deep route to
                look/[id] (batch 126). heroInfo has gap:8 between children
                (badge → name → italic title); marginTop:-3 tightens the rule
                to a ~5px pairing under the 34px Playfair heroName, leaving
                the natural 8px to the italic role line. width:34 matches the
                heroName font-size (1:1, same proportion as look batch 126).
                Note: rule stays gold (not celeb.accentColor) so it reads as
                the consistent MAISON SIMON brand mark rather than a
                per-celeb accent — same intent as the gold BrandWordmark in
                the top bar above. */}
            <TitleRule width={34} style={{ marginTop: -3 }} />
            <Text style={[styles.heroTitle, { color: celeb.accentColor }]}>
              {celeb.title}
            </Text>
          </View>
        </View>

        {/* ── Style pill ── */}
        {/* When celeb.style exactly matches a TREND name (e.g. Hailey
            Bieber → "Clean Minimal", ASAP Rocky → "Luxury Streetwear"), the
            style chip upgrades to a one-tap jump to /style with trendHint
            pre-loaded — same handoff as LookCard styleTag (batch 68) and
            look-detail style pill (batch 52). Fail-closed gate: 7/9 celebs
            today have close-but-not-equal styles ("Y2K Streetwear" vs
            "Y2K Revival", "Old Money Indie" vs "Old Money") and stay as
            plain chips rather than promising a destination we can't honor.
            No fuzzy matching — silent mismatches would be worse than no
            affordance. Distinct from accentColor (used throughout this page
            for celeb identity) — the trend handoff stays in the celeb's
            accent palette so it reads as part of the hero, not as a foreign
            element. Chevron-right + selection haptic = same vocab as the
            other trend handoffs across the app. */}
        <View style={[styles.stylePillRow, { borderBottomColor: colors.border }]}>
          {TRENDS.some((t) => t.name === celeb.style) ? (
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                router.push({
                  pathname: "/(tabs)/style",
                  params: { trendHint: celeb.style },
                });
              }}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={`Explore ${celeb.style} trend`}
              style={({ pressed }) => [
                styles.styleTag,
                {
                  backgroundColor: celeb.accentColor + "22",
                  borderColor: celeb.accentColor,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Feather name="star" size={10} color={celeb.accentColor} />
              <Text style={[styles.styleTagText, { color: celeb.accentColor }]}>
                {celeb.style.toUpperCase()}
              </Text>
              <Feather name="chevron-right" size={11} color={celeb.accentColor} />
            </Pressable>
          ) : (
            <View style={[styles.styleTag, { backgroundColor: celeb.accentColor + "22", borderColor: celeb.accentColor }]}>
              <Feather name="star" size={10} color={celeb.accentColor} />
              <Text style={[styles.styleTagText, { color: celeb.accentColor }]}>
                {celeb.style.toUpperCase()}
              </Text>
            </View>
          )}
          {celeb.vibes.slice(0, 2).map((v) => (
            <View key={v} style={[styles.vibeTag, { borderColor: colors.border }]}>
              <Text style={[styles.vibeTagText, { color: colors.mutedForeground }]}>
                {v.toUpperCase()}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Tabs ── */}
        <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
          {(["story", "looks", "brands"] as const).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.tab,
                activeTab === tab && { borderBottomColor: celeb.accentColor, borderBottomWidth: 2 },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === tab ? celeb.accentColor : colors.mutedForeground },
                ]}
              >
                {tab === "story" ? "STORY" : tab === "looks" ? "LOOKS" : "BRANDS"}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ── Story tab ── */}
        {activeTab === "story" && (
          <View style={styles.section}>
            <Text style={[styles.description, { color: colors.mutedForeground }]}>
              {celeb.description}
            </Text>

            <Text style={[styles.sectionLabel, { color: celeb.accentColor }]}>
              KNOWN FOR
            </Text>
            <View style={[styles.knownBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.knownText, { color: colors.foreground }]}>
                {celeb.knownFor}
              </Text>
            </View>

            <Text style={[styles.sectionLabel, { color: celeb.accentColor }]}>
              SIGNATURE PIECES
            </Text>
            {celeb.keyPieces.map((piece, idx) => (
              <View
                key={idx}
                style={[styles.pieceRow, { borderBottomColor: colors.border }]}
              >
                <View style={[styles.pieceDot, { backgroundColor: celeb.accentColor }]} />
                <Text style={[styles.pieceText, { color: colors.foreground }]}>{piece}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Looks tab ── */}
        {activeTab === "looks" && (
          <View style={styles.looksSection}>
            {/* User's own saved looks attributed to this celeb. Personal
                grounding rendered ABOVE the editorial iconic grid so the
                user sees their own creations first. Tap → /look/[id]
                (LookCard handles routing). Section hidden entirely when
                no attributed saves exist. */}
            {myLooksForCeleb.length > 0 && (
              <View style={styles.mySavedBlock}>
                <View style={styles.mySavedHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                      Your {celeb.name.split(" ")[0]} Looks
                    </Text>
                    <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>
                      {myLooksForCeleb.length} saved · channeling this icon
                    </Text>
                  </View>
                  <View style={[styles.mySavedCountBadge, { backgroundColor: celeb.accentColor }]}>
                    <Feather name="star" size={10} color="#0B0B0C" />
                    <Text style={styles.mySavedCountText}>{myLooksForCeleb.length}</Text>
                  </View>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.mySavedScroll}
                >
                  {myLooksForCeleb.map((look) => (
                    <LookCard key={look.id} look={look} width={170} />
                  ))}
                </ScrollView>
              </View>
            )}
            <View style={styles.looksSectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Signature Looks
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>
                Recreate these iconic outfits
              </Text>
            </View>
            <View style={styles.looksGrid}>
              {celeb.looks.map((look, i) => (
                <Pressable
                  key={i}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push({
                      pathname: "/(tabs)/style",
                      params: {
                        celebrity: celeb.id,
                        celebName: celeb.name,
                        lookHint: look.name,
                      },
                    });
                  }}
                  style={({ pressed }) => [
                    styles.lookGridCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: i === 0 ? celeb.accentColor : colors.border,
                      opacity: pressed ? 0.82 : 1,
                    },
                  ]}
                >
                  <View style={styles.lookGridHeader}>
                    <Text style={[styles.lookGridName, { color: colors.foreground }]} numberOfLines={2}>
                      {look.name}
                    </Text>
                    {i === 0 && (
                      <View style={[styles.iconicBadge, { backgroundColor: celeb.accentColor }]}>
                        <Text style={styles.iconicText}>ICONIC</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.lookGridPieces}>
                    {look.pieces.slice(0, 2).map((piece, j) => (
                      <Text key={j} style={[styles.lookGridPiece, { color: colors.mutedForeground }]} numberOfLines={1}>
                        <Text style={{ color: celeb.accentColor, fontFamily: "Inter_700Bold" }}>
                          {piece.brand}
                        </Text>
                        {" · "}{piece.item}
                      </Text>
                    ))}
                  </View>
                  {/* Recreate affordance — small gold cue at footer so the
                      tap-to-generate intent is unmistakable. */}
                  <View style={styles.lookGridCta}>
                    <Feather name="zap" size={10} color={celeb.accentColor} />
                    <Text style={[styles.lookGridCtaText, { color: celeb.accentColor }]}>
                      RECREATE THIS LOOK
                    </Text>
                    <Feather name="arrow-right" size={10} color={celeb.accentColor} />
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* ── Brands tab ── */}
        {activeTab === "brands" && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Brands They Wear
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>
              Shop directly from their wardrobe
            </Text>
            <View style={styles.brandsGrid}>
              {celeb.signatureBrands.map((brand, idx) => {
                const linkable = brandCatalog.has(brand.toLowerCase());
                const accent = idx === 0;
                // Chip foreground contract (text + chevron read as one):
                //   - accent chip (idx 0): celeb.accentColor — special-cased
                //     even when not linkable so the brand-of-record still pops.
                //   - linkable non-accent chip: gold — the established
                //     "navigable" color across the app's affordance vocab.
                //   - non-linkable non-accent chip: foreground — plain,
                //     no false affordance.
                // Architect-flagged in batch 64 review (criterion f): text
                // and chevron must use the same color so they read as one
                // chip foreground, not text+separate accent icon.
                const fg = accent ? celeb.accentColor : linkable ? colors.gold : colors.foreground;
                const chipBase = [
                  styles.brandChip,
                  {
                    backgroundColor: accent ? celeb.accentColor + "22" : colors.card,
                    borderColor: accent ? celeb.accentColor : colors.border,
                  },
                ];
                const inner = (
                  <>
                    <Text style={[styles.brandChipText, { color: fg }]}>
                      {brand}
                    </Text>
                    {linkable && (
                      <Feather name="chevron-right" size={11} color={fg} />
                    )}
                  </>
                );
                return linkable ? (
                  <Pressable
                    key={brand}
                    onPress={() => goShopBrand(brand)}
                    style={({ pressed }) => [...chipBase, { opacity: pressed ? 0.6 : 1 }]}
                  >
                    {inner}
                  </Pressable>
                ) : (
                  <View key={brand} style={chipBase}>
                    {inner}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ── CTA ── */}
        <View style={[styles.ctaSection, { borderTopColor: colors.border }]}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              router.push({
                pathname: "/(tabs)/style",
                params: { celebrity: celeb.id, celebName: celeb.name },
              });
            }}
            style={[styles.ctaBtn, { backgroundColor: celeb.accentColor }]}
          >
            <Feather name="zap" size={15} color="#0B0B0C" />
            <Text style={styles.ctaBtnText}>
              GENERATE MY {celeb.name.split(" ")[0].toUpperCase()} LOOK
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/celebrity")}
            style={[styles.ctaSecondary, { borderColor: colors.border }]}
          >
            <Feather name="users" size={13} color={colors.mutedForeground} />
            <Text style={[styles.ctaSecondaryText, { color: colors.mutedForeground }]}>
              CHOOSE ANOTHER ICON
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  hero: {
    height: height * 0.54,
    position: "relative",
    justifyContent: "flex-end",
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  heroInfo: {
    padding: 24,
    gap: 8,
  },
  eraBadge: {
    alignSelf: "flex-start",
    borderWidth: 0.5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 2,
  },
  eraText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  heroName: {
    fontSize: 34,
    fontFamily: "PlayfairDisplay_700Bold",
    color: "#F5F5F0",
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  heroTitle: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.5,
    fontStyle: "italic",
  },
  stylePillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
  },
  styleTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 0.5,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  styleTagText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  vibeTag: {
    borderWidth: 0.5,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  vibeTagText: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
  },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  section: {
    padding: 24,
    gap: 16,
  },
  description: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 23,
    letterSpacing: 0.2,
  },
  sectionLabel: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    marginBottom: -8,
  },
  knownBox: {
    borderWidth: 0.5,
    borderRadius: 4,
    padding: 14,
  },
  knownText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    lineHeight: 20,
    fontStyle: "italic",
  },
  pieceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: 0.5,
  },
  pieceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
  },
  pieceText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: "PlayfairDisplay_700Bold",
    marginBottom: -4,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginBottom: 4,
  },
  looksSection: { paddingBottom: 24 },
  looksSectionHeader: { padding: 24, paddingBottom: 16, gap: 4 },
  looksGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 24,
  },
  lookGridCard: {
    width: (width - 48 - 10) / 2,
    borderWidth: 0.5,
    borderRadius: 4,
    padding: 12,
    gap: 8,
  },
  lookGridHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 4,
  },
  lookGridName: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.2,
    flex: 1,
    lineHeight: 15,
  },
  lookGridPieces: { gap: 3 },
  lookGridPiece: {
    fontSize: 9,
    fontFamily: "Inter_400Regular",
    lineHeight: 13,
  },
  iconicBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 2,
  },
  mySavedBlock: {
    gap: 12,
    marginBottom: 24,
  },
  mySavedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  mySavedCountBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 2,
  },
  mySavedCountText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#0B0B0C",
  },
  mySavedScroll: {
    gap: 10,
    paddingRight: 20,
  },
  lookGridCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  lookGridCtaText: {
    flex: 1,
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.4,
  },
  iconicText: {
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
    color: "#0B0B0C",
  },
  lookPieceRow: {
    borderTopWidth: 0.5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 2,
  },
  lookPieceBrand: {
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  lookPieceName: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  brandsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  brandChip: {
    borderWidth: 0.5,
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    // Row layout so the optional chevron sits inline with the brand text.
    // Non-linkable chips have a single Text child so flexDirection is a
    // no-op for them — keeps one style block for both cases.
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  brandChipText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
  },
  ctaSection: {
    padding: 24,
    gap: 12,
    borderTopWidth: 0.5,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 4,
  },
  ctaBtnText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
    color: "#0B0B0C",
  },
  ctaSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 4,
    borderWidth: 0.5,
  },
  ctaSecondaryText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
  },
});
