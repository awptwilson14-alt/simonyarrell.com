import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import {
  Dimensions,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { LookCard } from "@/components/LookCard";
import { TrendCard } from "@/components/TrendCard";
import { SectionHeader } from "@/components/SectionHeader";
import { GoldButton } from "@/components/GoldButton";
import { HeroAudio } from "@/components/HeroAudio";
import { LOOKS, TRENDS, type Trend } from "@/constants/data";
import { type CelebFull } from "@/constants/celebrities";
import { findCelebByName } from "@/lib/celebLookup";
import { pickStyleHero, pickLookHero, pickSplashHero } from "@/constants/heroImages";
import { assignUniqueLookImages } from "@/lib/outfitEngine";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import * as Haptics from "expo-haptics";

const { width } = Dimensions.get("window");
const HEADER_HEIGHT = 64;

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userProfile, savedLooks } = useApp();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const heroFor = (key: string, seed?: string) => pickStyleHero(key, userProfile.gender, seed);
  const lookHero = (name: string, seed?: string) => pickLookHero(name, userProfile.gender, seed);

  // For You personalization: score every catalog look by how strongly it matches
  // the user's taste signals.
  //   +3 per match with a saved-look style (strongest — actual behavior)
  //   +2 per match with userProfile.favoriteStyles (explicit preference)
  // Sort by score desc, tie-broken by original index (stable). When no signal
  // exists, fall back to plain reversed LOOKS so the strip never goes empty.
  // Subtitle reflects the active signal source so the line isn't a lie.
  const forYou = (() => {
    const savedStyleCounts = new Map<string, number>();
    for (const l of savedLooks) {
      savedStyleCounts.set(l.style, (savedStyleCounts.get(l.style) ?? 0) + 1);
    }
    const favSet = new Set(userProfile.favoriteStyles);
    const hasSignal = savedStyleCounts.size > 0 || favSet.size > 0;
    if (!hasSignal) return [...LOOKS].reverse();
    const scored = LOOKS.map((look, idx) => {
      const savedHits = savedStyleCounts.get(look.style) ?? 0;
      const score = savedHits * 3 + (favSet.has(look.style) ? 2 : 0);
      return { look, score, idx };
    });
    scored.sort((a, b) => (b.score - a.score) || (a.idx - b.idx));
    return scored.map((s) => s.look);
  })();
  const forYouSubtitle = (() => {
    const savedStylesUsed = new Set(savedLooks.map((l) => l.style));
    if (savedStylesUsed.size > 0) return "Based on your saved looks";
    if (userProfile.favoriteStyles.length > 0) return userProfile.favoriteStyles.join(", ");
    return "Based on your taste";
  })();

  // Top celebs the user has saved looks from, joined back to the CELEBS record
  // so we can render with photo + accentColor. Only icons present in CELEBS
  // survive — drops any orphan names from legacy data. Sorted by save count
  // desc; capped at 6 to keep the strip readable.
  const continueExploring = (() => {
    const counts = new Map<string, number>();
    for (const l of savedLooks) {
      if (!l.inspiredBy) continue;
      counts.set(l.inspiredBy, (counts.get(l.inspiredBy) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, count]) => {
        const celeb = findCelebByName(name);
        return celeb ? { celeb, count } : null;
      })
      .filter((x): x is { celeb: CelebFull; count: number } => x !== null)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  })();

  // Trends-You-Love rail — parallel to continueExploring but indexed on
  // TRENDS instead of celebs. Uses the same matching predicate batch 50
  // applied to the TrendCard SAVED badge (style===t.name OR
  // tags.includes(t.name)) so counts can never disagree with the badges
  // on /explore TRENDS. Iterate TRENDS in declared order, count once
  // per trend, drop zero, sort desc, cap 6. Sixth surface in the
  // trend-hint loop (batches 50-53).
  const trendsYouLove = (() => {
    const matches = (look: { style: string; tags?: string[] }, t: Trend) =>
      look.style === t.name || (look.tags?.includes(t.name) ?? false);
    return TRENDS
      .map((trend) => ({
        trend,
        count: savedLooks.reduce((n, l) => (matches(l, trend) ? n + 1 : n), 0),
      }))
      .filter(({ count }) => count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  })();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: 100 + (Platform.OS === "web" ? 34 : insets.bottom) }]}
      >
        {/* ── Hero ── */}
        <View style={[styles.hero, { paddingTop: topPad + HEADER_HEIGHT }]}>
          <Image
            source={pickSplashHero(userProfile.gender)}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={["rgba(11,11,12,0.3)", "transparent", "rgba(11,11,12,0.75)", "#0B0B0C"]}
            locations={[0, 0.3, 0.7, 1]}
            style={StyleSheet.absoluteFill}
          />
          {/* Floating speaker toggle for the hero ambient track. Positioned
              below the floating header (topPad + HEADER_HEIGHT + 8) so it
              never overlaps the bell/profile icons in the top-right. */}
          <HeroAudio top={topPad + HEADER_HEIGHT + 8} />
          <View style={styles.heroContent}>
            <Text style={styles.heroEyebrow}>AI CURATED LOOKS · INSPIRED BY ICONS</Text>
            <Text style={styles.heroHeadline}>Discover{"\n"}Your Signature{"\n"}Style</Text>
            <Text style={[styles.heroSub, { color: "rgba(245,245,240,0.65)" }]}>
              Made for you.
            </Text>
            <View style={styles.heroActions}>
              <GoldButton
                label="GET STYLED"
                onPress={() => router.push("/(tabs)/style")}
                style={{ alignSelf: "flex-start" }}
              />
              <Pressable
                onPress={() => { router.push("/tryon"); }}
                style={styles.tryOnHeroBtn}
              >
                <Feather name="camera" size={13} color="#C6A75E" />
                <Text style={styles.tryOnHeroBtnText}>TRY ON</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* ── Trending Looks ── */}
        <View style={styles.section}>
          <SectionHeader
            title="Trending Looks"
            onSeeAll={() => router.push("/(tabs)/explore")}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hList}
          >
            {assignUniqueLookImages(
              LOOKS.map((look) => ({ ...look, image: lookHero(look.name, look.id) ?? heroFor(look.style, look.id) ?? look.image })),
              userProfile.gender,
            ).map((look) => (
              <LookCard key={look.id} look={look} />
            ))}
          </ScrollView>
        </View>

        {/* ── Continue Exploring (personalized celeb strip) ── */}
        {continueExploring.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="Continue Exploring"
              subtitle="Icons you keep coming back to"
              onSeeAll={() => router.push("/celebrity")}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hList}
            >
              {continueExploring.map(({ celeb, count }) => (
                <Pressable
                  key={celeb.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push(`/celebrity/${celeb.id}`);
                  }}
                  style={({ pressed }) => [
                    styles.continueCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: celeb.accentColor,
                      opacity: pressed ? 0.82 : 1,
                    },
                  ]}
                >
                  <Image source={celeb.image} style={styles.continueImg} />
                  <LinearGradient
                    colors={["transparent", "rgba(11,11,12,0.92)"]}
                    locations={[0.4, 1]}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={styles.continueOverlay}>
                    <Text style={styles.continueName} numberOfLines={1}>
                      {celeb.name}
                    </Text>
                    <View style={styles.continueCountRow}>
                      <Feather name="star" size={9} color={celeb.accentColor} />
                      <Text style={[styles.continueCount, { color: celeb.accentColor }]}>
                        {count} SAVED
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Trends You Love (personalized trend strip) ──
            Mirrors Continue Exploring's grammar (horiz strip of
            image cards with bottom-overlay count + icon) so the two
            personalized rails read as a pair. trending-up icon +
            gold accent matches the trend-hint visual vocab
            established in batches 51/52/53. Tap pushes /style with
            trendHint pre-loaded — same contract as the explore tap,
            look-detail pill tap, and profile chip tap. */}
        {trendsYouLove.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="Trends You Love"
              subtitle="Vibes that keep showing up in your saves"
              onSeeAll={() => router.push("/(tabs)/explore")}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hList}
            >
              {trendsYouLove.map(({ trend, count }) => (
                <Pressable
                  key={trend.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push({
                      pathname: "/(tabs)/style",
                      params: { trendHint: trend.name },
                    });
                  }}
                  style={({ pressed }) => [
                    styles.continueCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.gold,
                      opacity: pressed ? 0.82 : 1,
                    },
                  ]}
                >
                  <Image source={trend.image} style={styles.continueImg} />
                  <LinearGradient
                    colors={["transparent", "rgba(11,11,12,0.92)"]}
                    locations={[0.4, 1]}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={styles.continueOverlay}>
                    <Text style={styles.continueName} numberOfLines={1}>
                      {trend.name}
                    </Text>
                    <View style={styles.continueCountRow}>
                      <Feather name="trending-up" size={9} color={colors.gold} />
                      <Text style={[styles.continueCount, { color: colors.gold }]}>
                        {count} SAVED
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Feature Pills ── */}
        <View style={styles.featurePills}>
          {[
            { icon: "zap" as const, label: "AI Style\nCurator", route: "/(tabs)/style" as const },
            { icon: "star" as const, label: "Celebrity\nInspired", route: "/(tabs)/explore" as const },
            { icon: "layers" as const, label: "Closet\nIntelligence", route: "/(tabs)/closet" as const },
            { icon: "shopping-bag" as const, label: "Shop\nLuxury", route: "/(tabs)/shop" as const },
          ].map((item) => (
            <Pressable
              key={item.label}
              onPress={() => router.push(item.route)}
              style={({ pressed }) => [
                styles.featurePill,
                { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Feather name={item.icon} size={22} color={colors.gold} />
              <Text style={[styles.featurePillLabel, { color: colors.foreground }]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ── Trending Styles ── */}
        <View style={styles.section}>
          <SectionHeader
            title="Trending Now"
            subtitle="What the world is wearing"
            onSeeAll={() => router.push("/(tabs)/explore")}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hList}
          >
            {TRENDS.slice(0, 4).map((trend) => (
              <TrendCard
                key={trend.id}
                trend={{ ...trend, image: heroFor(trend.name, trend.id) ?? trend.image }}
                onPress={() => router.push("/(tabs)/explore")}
              />
            ))}
          </ScrollView>
        </View>

        {/* ── For You ── */}
        <View style={styles.section}>
          <SectionHeader
            title="For You"
            subtitle={forYouSubtitle}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hList}
          >
            {assignUniqueLookImages(
              forYou.map((look) => ({ ...look, image: lookHero(look.name, `fy-${look.id}`) ?? heroFor(look.style, `fy-${look.id}`) ?? look.image })),
              userProfile.gender,
            ).map((look) => (
              <LookCard key={look.id} look={look} />
            ))}
          </ScrollView>
        </View>

        {/* ── Brand Strip ── */}
        <View style={[styles.brandStrip, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
          {["GUCCI", "PRADA", "AMIRI", "BALENCIAGA", "SAINT LAURENT", "OFF-WHITE"].map((brand) => (
            <Text key={brand} style={[styles.brandName, { color: colors.mutedForeground }]}>
              {brand}
            </Text>
          ))}
        </View>
      </ScrollView>

      {/* ── Floating Header ── */}
      <View style={[styles.header, { paddingTop: topPad }]} pointerEvents="box-none">
        <View style={styles.headerInner} pointerEvents="box-none">
          <View style={styles.logoRow}>
            <Image
              source={require("../../assets/images/logo_ms.png")}
              style={styles.logoImg}
              resizeMode="contain"
            />
          </View>
          <View style={styles.headerRight}>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                router.push("/activity");
              }}
              style={styles.headerIcon}
            >
              <Feather name="bell" size={18} color={colors.foreground} />
              {/* Subtle accent dot when there's anything in the inbox — same
                  saved-looks signal that powers the /activity feed. Avoids
                  promising notifications we can't actually deliver. */}
              {savedLooks.length > 0 && (
                <View style={[styles.bellDot, { backgroundColor: colors.gold }]} />
              )}
            </Pressable>
            <Pressable onPress={() => router.push("/(tabs)/profile")} style={styles.headerIcon}>
              <Feather name="user" size={18} color={colors.foreground} />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {},
  hero: {
    height: 580,
    position: "relative",
    marginBottom: 32,
    justifyContent: "flex-end",
  },
  heroImage: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  heroContent: {
    paddingHorizontal: 24,
    paddingBottom: 36,
    gap: 10,
  },
  heroEyebrow: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(198,167,94,0.85)",
    letterSpacing: 2.5,
  },
  heroHeadline: {
    fontSize: 42,
    fontFamily: "PlayfairDisplay_700Bold",
    color: "#F5F5F0",
    lineHeight: 50,
    letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: 14,
    fontFamily: "PlayfairDisplay_400Regular",
    letterSpacing: 0.3,
  },
  heroActions: { marginTop: 8, flexDirection: "row", alignItems: "center", gap: 12 },
  tryOnHeroBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 2, borderWidth: 0.5, borderColor: "rgba(198,167,94,0.5)", backgroundColor: "rgba(198,167,94,0.08)" },
  tryOnHeroBtnText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 2, color: "#C6A75E" },
  section: { marginBottom: 36 },
  continueCard: { width: 130, height: 170, marginRight: 10, borderRadius: 4, borderWidth: 0.5, overflow: "hidden", position: "relative" },
  continueImg: { width: "100%", height: "100%" },
  continueOverlay: { position: "absolute", left: 10, right: 10, bottom: 10, gap: 4 },
  continueName: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#F5F5F0", letterSpacing: 0.2 },
  continueCountRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  continueCount: { fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 1.4 },
  hList: { paddingHorizontal: 20, paddingRight: 8 },
  featurePills: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 36,
  },
  featurePill: {
    flex: 1,
    alignItems: "center",
    gap: 8,
    paddingVertical: 18,
    borderRadius: 4,
    borderWidth: 0.5,
  },
  featurePillLabel: {
    fontSize: 9,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.3,
    textAlign: "center",
    lineHeight: 14,
  },
  brandStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 20,
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    marginBottom: 8,
  },
  brandName: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerInner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    height: HEADER_HEIGHT,
  },
  logoRow: { flexDirection: "row", alignItems: "center" },
  logoImg: { height: 32, width: 59 },
  headerRight: { flexDirection: "row", gap: 16, alignItems: "center" },
  headerIcon: { padding: 4 },
  bellDot: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
