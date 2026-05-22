import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { TrendCard } from "@/components/TrendCard";
import { TRENDS, isLookInTrend } from "@/constants/data";
import { CELEBS } from "@/constants/celebrities";
import { useColors } from "@/hooks/useColors";
import { BrandWordmark } from "@/components/BrandWordmark";
import { TitleRule } from "@/components/TitleRule";
import { pickStyleHero, filterCelebsByGender } from "@/constants/heroImages";
import { useApp } from "@/context/AppContext";

const { width } = Dimensions.get("window");
const CELEB_CARD_W = 130;

type Tab = "trends" | "celebrities";

export default function ExploreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userProfile, savedLooks } = useApp();
  const visibleCelebs = filterCelebsByGender(CELEBS, userProfile.gender);
  const [activeTab, setActiveTab] = useState<Tab>("trends");

  // Saved-look counts per celeb NAME — same source-of-truth used on
  // /celebrity directory (batch 24) and home "Continue Exploring" (batch 25).
  // Drives the engagement badge on both featured strip and list cards so
  // every surface that lists celebs agrees on what the user has saved.
  const savedCountByCeleb = (() => {
    const counts = new Map<string, number>();
    for (const l of savedLooks) {
      if (!l.inspiredBy) continue;
      counts.set(l.inspiredBy, (counts.get(l.inspiredBy) ?? 0) + 1);
    }
    return counts;
  })();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const heroFor = (name: string, seed?: string) => pickStyleHero(name, userProfile.gender, seed);

  // "Your Icons" — celebs the user has actually channeled, ranked by saved
  // count desc. Stable secondary sort by celeb.id keeps ordering deterministic
  // when two celebs have equal counts (avoids the avatar row reshuffling on
  // every re-render). Capped at 6 — beyond that we want the user pulled into
  // the full directory rather than scrolling a personalized rail.
  // Saved-look counts per TREND NAME — matches by Look.style OR
  // Look.tags.includes(trend.name). The static LOOKS array authors style as
  // "Old Money" / "Y2K Revival" which lines up 1:1 with trend names; user-
  // generated saves can also surface a trend via their tag array. Powers the
  // "★ N SAVED" badge on TrendCard (same language as the celeb card badge
  // shipped in batch 18) — first personalization signal on the TRENDS subtab,
  // which previously had none. Cheap: O(saves × 6) per render.
  const savedCountByTrend = (() => {
    const counts = new Map<string, number>();
    for (const l of savedLooks) {
      for (const t of TRENDS) {
        if (isLookInTrend(l, t.name)) {
          counts.set(t.name, (counts.get(t.name) ?? 0) + 1);
        }
      }
    }
    return counts;
  })();

  const yourIcons = visibleCelebs
    .filter((c) => (savedCountByCeleb.get(c.name) ?? 0) > 0)
    .sort((a, b) => {
      const diff = (savedCountByCeleb.get(b.name) ?? 0) - (savedCountByCeleb.get(a.name) ?? 0);
      return diff !== 0 ? diff : a.id.localeCompare(b.id);
    })
    .slice(0, 6);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: topPad }]}>
        <View style={styles.headerContent}>
          <BrandWordmark style={{ marginBottom: 6 }} />
          <Text style={[styles.screenTitle, { color: colors.foreground }]}>Explore</Text>
          {/* Shared TitleRule atom (batch 119). marginTop:-8 absorbs the
              title's paddingTop so the rule hugs the title baseline. */}
          <TitleRule style={{ marginTop: -8 }} />
          <View style={[styles.tabBar, { borderColor: colors.border }]}>
            {(["trends", "celebrities"] as Tab[]).map((tab) => {
              const active = activeTab === tab;
              return (
                <Pressable
                  key={tab}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setActiveTab(tab);
                  }}
                  style={({ pressed }) => [
                    styles.tabItem,
                    {
                      backgroundColor: active ? colors.gold : "transparent",
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      {
                        color: active ? "#080808" : colors.mutedForeground,
                        fontFamily: active ? "Inter_700Bold" : "Inter_600SemiBold",
                      },
                    ]}
                  >
                    {tab === "trends" ? "TRENDS" : "CELEBRITIES"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 100 + (Platform.OS === "web" ? 34 : insets.bottom) },
        ]}
      >
        {/* ══════════════════ TRENDS TAB ══════════════════ */}
        {activeTab === "trends" && (
          <View style={styles.trendsGrid}>
            {TRENDS.map((trend, i) => (
              <View key={trend.id} style={i % 2 === 0 ? styles.trendLeft : styles.trendRight}>
                <TrendCard
                  trend={{ ...trend, image: heroFor(trend.name, trend.id) ?? trend.image }}
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/style",
                      params: { trendHint: trend.name },
                    })
                  }
                  size={i < 2 ? "large" : "small"}
                  savedCount={savedCountByTrend.get(trend.name) ?? 0}
                />
              </View>
            ))}
          </View>
        )}

        {/* ══════════════════ CELEBRITIES TAB ══════════════════ */}
        {activeTab === "celebrities" && (
          <View style={styles.celebSection}>
            {/* YOUR ICONS — personalized rail of celebs the user has channeled.
                Pinned above the generic "Style Icons" intro so returning users
                see their own history first. Hidden silently for new users so
                the original celeb-discovery flow is preserved. Tap routes to
                /celebrity/[id] — same destination as the directory cards. */}
            {yourIcons.length > 0 && (
              <View style={styles.yourIconsBlock}>
                <View style={styles.yourIconsHead}>
                  <Text style={[styles.yourIconsLabel, { color: colors.gold }]}>
                    YOUR ICONS
                  </Text>
                  <Text style={[styles.yourIconsMeta, { color: colors.mutedForeground }]}>
                    {yourIcons.length} CHANNELED
                  </Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.yourIconsScroll}
                >
                  {yourIcons.map((celeb) => {
                    const count = savedCountByCeleb.get(celeb.name) ?? 0;
                    return (
                      <Pressable
                        key={celeb.id}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          router.push(`/celebrity/${celeb.id}`);
                        }}
                        style={({ pressed }) => [
                          styles.yourIconAvatar,
                          { opacity: pressed ? 0.82 : 1 },
                        ]}
                      >
                        <View style={[styles.yourIconRing, { borderColor: celeb.accentColor }]}>
                          <Image
                            source={celeb.image}
                            style={styles.yourIconImg}
                            contentFit="cover"
                            transition={250}
                          />
                        </View>
                        <Text style={[styles.yourIconName, { color: colors.foreground }]} numberOfLines={1}>
                          {celeb.name.split(" ")[0]}
                        </Text>
                        <Text style={[styles.yourIconCount, { color: celeb.accentColor }]}>
                          {count} {count === 1 ? "look" : "looks"}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Section header */}
            <View style={styles.celebHeader}>
              <Text style={[styles.celebHeaderTitle, { color: colors.foreground }]}>
                Style Icons
              </Text>
              <Text style={[styles.celebHeaderSub, { color: colors.mutedForeground }]}>
                Tap a celebrity to explore their signature style and generate looks inspired by them
              </Text>
            </View>

            {/* "View All" CTA */}
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push("/celebrity");
              }}
              style={[styles.viewAllBtn, { borderColor: colors.gold }]}
            >
              <Feather name="users" size={13} color={colors.gold} />
              <Text style={[styles.viewAllText, { color: colors.gold }]}>
                BROWSE ALL {visibleCelebs.length} ICONS
              </Text>
              <Feather name="arrow-right" size={13} color={colors.gold} />
            </Pressable>

            {/* Horizontal scroll preview */}
            <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>
              FEATURED ICONS
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.celebRow}
            >
              {visibleCelebs.map((celeb) => {
                const savedCount = savedCountByCeleb.get(celeb.name) ?? 0;
                return (
                <Pressable
                  key={celeb.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push(`/celebrity/${celeb.id}`);
                  }}
                  style={({ pressed }) => [
                    styles.celebThumb,
                    { opacity: pressed ? 0.82 : 1 },
                  ]}
                >
                  {/* Photo */}
                  <View style={[styles.celebPhotoWrapper, { backgroundColor: colors.secondary }]}>
                    <Image
                      source={celeb.image}
                      style={styles.celebPhoto}
                      contentFit="cover"
                      transition={300}
                    />
                    <LinearGradient
                      colors={["transparent", "rgba(11,11,12,0.82)"]}
                      style={StyleSheet.absoluteFill}
                    />
                    {savedCount > 0 && (
                      <View style={[styles.savedBadge, { backgroundColor: celeb.accentColor }]}>
                        <Feather name="star" size={8} color="#0B0B0C" />
                        <Text style={styles.savedBadgeText}>{savedCount}</Text>
                      </View>
                    )}
                    {/* Name overlay */}
                    <View style={styles.celebNameOverlay}>
                      <Text style={styles.celebNameText} numberOfLines={1}>
                        {celeb.name.split(" ")[0]}
                      </Text>
                      <Text style={[styles.celebStyleText, { color: celeb.accentColor }]} numberOfLines={1}>
                        {celeb.vibes[0]}
                      </Text>
                    </View>
                  </View>
                </Pressable>
                );
              })}
            </ScrollView>

            {/* All celebs list */}
            <Text style={[styles.rowLabel, { color: colors.mutedForeground, marginTop: 4 }]}>
              ALL STYLE ICONS
            </Text>
            {visibleCelebs.map((celeb) => {
              const savedCount = savedCountByCeleb.get(celeb.name) ?? 0;
              return (
              <Pressable
                key={celeb.id}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push(`/celebrity/${celeb.id}`);
                }}
                style={({ pressed }) => [
                  styles.listCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: savedCount > 0 ? celeb.accentColor : colors.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                {/* Thumbnail */}
                <View style={[styles.listThumb, { backgroundColor: colors.secondary }]}>
                  <Image
                    source={celeb.image}
                    style={styles.listThumbImg}
                    contentFit="cover"
                    transition={250}
                  />
                </View>

                {/* Info */}
                <View style={styles.listInfo}>
                  <Text style={[styles.listName, { color: colors.foreground }]}>
                    {celeb.name}
                  </Text>
                  <Text style={[styles.listStyle, { color: celeb.accentColor }]}>
                    {celeb.style}
                  </Text>
                  <View style={styles.listVibes}>
                    {celeb.vibes.slice(0, 2).map((v) => (
                      <View
                        key={v}
                        style={[styles.listVibePill, { borderColor: colors.border }]}
                      >
                        <Text style={[styles.listVibeText, { color: colors.mutedForeground }]}>
                          {v}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Saved count + arrow */}
                {savedCount > 0 && (
                  <View style={[styles.listSavedChip, { backgroundColor: celeb.accentColor + "22", borderColor: celeb.accentColor }]}>
                    <Feather name="star" size={9} color={celeb.accentColor} />
                    <Text style={[styles.listSavedText, { color: celeb.accentColor }]}>{savedCount}</Text>
                  </View>
                )}
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: 0 },
  headerContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 16,
  },
  screenTitle: {
    fontSize: 28,
    fontFamily: "PlayfairDisplay_700Bold",
    letterSpacing: -0.3,
    paddingTop: 16,
  },
  tabBar: {
    flexDirection: "row",
    borderWidth: 0.5,
    borderRadius: 2,
    overflow: "hidden",
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  tabText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
  },
  content: {
    padding: 20,
    gap: 12,
  },
  trendsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  trendLeft: { width: "48%" },
  trendRight: { width: "48%" },

  /* ── Celebrities ── */
  celebSection: { gap: 16 },
  yourIconsBlock: { gap: 10 },
  yourIconsHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  yourIconsLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  yourIconsMeta: {
    fontSize: 9,
    fontFamily: "Inter_500Medium",
    letterSpacing: 1.5,
  },
  yourIconsScroll: {
    paddingHorizontal: 20,
    gap: 14,
    paddingRight: 30,
  },
  yourIconAvatar: {
    width: 72,
    alignItems: "center",
    gap: 6,
  },
  yourIconRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    padding: 2,
    overflow: "hidden",
  },
  yourIconImg: {
    width: "100%",
    height: "100%",
    borderRadius: 28,
  },
  yourIconName: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
  yourIconCount: {
    fontSize: 9,
    fontFamily: "Inter_500Medium",
    letterSpacing: 1,
  },
  celebHeader: { gap: 6 },
  celebHeaderTitle: {
    fontSize: 24,
    fontFamily: "PlayfairDisplay_700Bold",
  },
  celebHeaderSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  viewAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 0.5,
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 13,
    justifyContent: "center",
  },
  viewAllText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
    flex: 1,
    textAlign: "center",
  },
  rowLabel: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 2,
    marginBottom: -4,
  },
  celebRow: {
    gap: 10,
    paddingBottom: 4,
  },
  celebThumb: {
    width: CELEB_CARD_W,
  },
  celebPhotoWrapper: {
    width: CELEB_CARD_W,
    height: 170,
    borderRadius: 4,
    overflow: "hidden",
    position: "relative",
  },
  celebPhoto: {
    width: "100%",
    height: "100%",
  },
  celebNameOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    gap: 2,
  },
  celebNameText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#F5F5F0",
    letterSpacing: 0.2,
  },
  celebStyleText: {
    fontSize: 9,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.8,
  },
  listCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 4,
    borderWidth: 0.5,
    gap: 14,
  },
  listThumb: {
    width: 58,
    height: 58,
    borderRadius: 4,
    overflow: "hidden",
    flexShrink: 0,
  },
  listThumbImg: {
    width: "100%",
    height: "100%",
  },
  listInfo: {
    flex: 1,
    gap: 3,
  },
  listName: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.2,
  },
  listStyle: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    letterSpacing: 1,
  },
  listVibes: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 3,
  },
  listVibePill: {
    borderWidth: 0.5,
    borderRadius: 2,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  listVibeText: {
    fontSize: 8,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.8,
  },
  savedBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 2,
  },
  savedBadgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: "#0B0B0C",
  },
  listSavedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 0.5,
    borderRadius: 2,
  },
  listSavedText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
  },
});
