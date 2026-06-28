import * as Haptics from "expo-haptics";
import { safeBack } from "../../lib/nav";
import { LinearGradient } from "@/lib/safeWebShims";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
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

import {
  CATEGORY_LABELS,
  type ShowCategory,
  type TVShow,
  currentWeekLabel,
  weeklyTopShows,
} from "@/constants/tvShows";
import { TitleRule } from "@/components/TitleRule";
import { useColors } from "@/hooks/useColors";
import { BrandWordmark } from "@/components/BrandWordmark";

const { width } = Dimensions.get("window");
const CARD_W = width - 40;

type FilterKey = "all" | ShowCategory;
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "urban", label: CATEGORY_LABELS.urban },
  { key: "western", label: CATEGORY_LABELS.western },
  { key: "contemporary", label: CATEGORY_LABELS.contemporary },
  { key: "formal", label: CATEGORY_LABELS.formal },
];

export default function TVShowsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

  // Snapshot the week's top-10 once per mount — deterministic by ISO week.
  const shows = useMemo(() => weeklyTopShows(), []);
  const weekLabel = useMemo(() => currentWeekLabel(), []);

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = {
      all: shows.length,
      urban: 0,
      western: 0,
      contemporary: 0,
      formal: 0,
    };
    for (const s of shows) c[s.category] += 1;
    return c;
  }, [shows]);

  const filtered = activeFilter === "all" ? shows : shows.filter((s) => s.category === activeFilter);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: topPad }]}>
        <BrandWordmark style={{ marginBottom: 10 }} />
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => safeBack()}
            style={[styles.backBtn, { borderColor: colors.border }]}
            hitSlop={12}
          >
            <Feather name="arrow-left" size={16} color={colors.foreground} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={[styles.screenTitle, { color: colors.foreground }]}>
              TV Show Inspirations
            </Text>
            <TitleRule width={28} style={{ marginTop: 6, marginBottom: 2 }} />
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Channel the screen's most-styled characters
            </Text>
          </View>
        </View>

        {/* Updated-weekly badge */}
        <View style={[styles.weekBadge, { borderColor: colors.gold }]}>
          <Feather name="refresh-cw" size={10} color={colors.gold} />
          <Text style={[styles.weekBadgeText, { color: colors.gold }]}>
            UPDATED WEEKLY · {weekLabel}
          </Text>
        </View>

        {/* Category filter pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
        >
          {FILTERS.map(({ key, label }) => {
            const active = activeFilter === key;
            return (
              <Pressable
                key={key}
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveFilter(key);
                }}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: active ? colors.gold : "transparent",
                    borderColor: active ? colors.gold : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: active ? "#0B0B0C" : colors.mutedForeground },
                  ]}
                >
                  {label.toUpperCase()}
                  <Text
                    style={[
                      styles.filterCount,
                      {
                        color: active ? "#0B0B0C" : colors.mutedForeground,
                        opacity: active ? 0.7 : 0.55,
                      },
                    ]}
                  >
                    {"  "}{counts[key] ?? 0}
                  </Text>
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── List ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: 120 + (Platform.OS === "web" ? 34 : insets.bottom) },
        ]}
      >
        <Text style={[styles.listCount, { color: colors.mutedForeground }]}>
          {filtered.length} {filtered.length === 1 ? "SHOW" : "SHOWS"} THIS WEEK
        </Text>

        {filtered.map((show, idx) => {
          // The absolute rank within the full weekly top-10 (1-based), so the
          // numbering reflects the chart position, not the filtered subset.
          const rank = shows.indexOf(show) + 1;
          return <ShowCard key={show.id} show={show} rank={rank} idx={idx} />;
        })}
      </ScrollView>
    </View>
  );
}

function ShowCard({ show, rank, idx }: { show: TVShow; rank: number; idx: number }) {
  const colors = useColors();
  const router = useRouter();
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push(`/tv-shows/${show.id}`);
      }}
      style={({ pressed }) => [
        styles.card,
        {
          width: CARD_W,
          backgroundColor: colors.card,
          borderColor: idx === 0 ? show.accentColor : colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      {/* Accent gradient band — editorial, no photo */}
      <View style={styles.cardBand}>
        <LinearGradient
          colors={[show.accentColor + "55", show.accentColor + "12", "transparent"]}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.cardBandTop}>
          <Text style={[styles.rankNum, { color: show.accentColor }]}>
            {String(rank).padStart(2, "0")}
          </Text>
          <View style={[styles.categoryTag, { backgroundColor: show.accentColor + "CC" }]}>
            <Text style={styles.categoryTagText}>
              {CATEGORY_LABELS[show.category].toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={styles.cardBandBottom}>
          <Text style={[styles.showName, { color: colors.foreground }]} numberOfLines={2}>
            {show.name}
          </Text>
          <Text style={[styles.showMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
            {show.network} · {show.era}
          </Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.cardInfo}>
        <Text style={[styles.showTagline, { color: show.accentColor }]} numberOfLines={1}>
          {show.tagline}
        </Text>
        <View style={styles.cardFooter}>
          <View style={styles.cardFooterLeft}>
            <Feather name="users" size={12} color={colors.mutedForeground} />
            <Text style={[styles.charCount, { color: colors.mutedForeground }]}>
              {show.characters.length} CHARACTER STYLES
            </Text>
          </View>
          <View style={styles.cardCta}>
            <Text style={[styles.cardCtaText, { color: show.accentColor }]}>EXPLORE</Text>
            <Feather name="arrow-right" size={12} color={show.accentColor} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingTop: 16,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 0.5,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerText: { flex: 1 },
  screenTitle: {
    fontSize: 24,
    fontFamily: "PlayfairDisplay_700Bold",
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.5,
    marginTop: 1,
  },
  weekBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 0.5,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  weekBadgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  filterList: {
    paddingBottom: 4,
    gap: 8,
  },
  filterPill: {
    borderWidth: 0.5,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  filterText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  filterCount: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 16,
  },
  listCount: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    letterSpacing: 2,
    marginBottom: 2,
  },
  card: {
    borderRadius: 6,
    borderWidth: 0.5,
    overflow: "hidden",
  },
  cardBand: {
    height: 132,
    position: "relative",
    justifyContent: "space-between",
    padding: 14,
  },
  cardBandTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  rankNum: {
    fontSize: 30,
    fontFamily: "PlayfairDisplay_700Bold",
    letterSpacing: -1,
    lineHeight: 32,
  },
  categoryTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 2,
  },
  categoryTagText: {
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
    color: "#0B0B0C",
  },
  cardBandBottom: { gap: 2 },
  showName: {
    fontSize: 22,
    fontFamily: "PlayfairDisplay_700Bold",
    letterSpacing: -0.3,
  },
  showMeta: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    letterSpacing: 1,
  },
  cardInfo: {
    padding: 14,
    gap: 12,
  },
  showTagline: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.3,
    fontStyle: "italic",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardFooterLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  charCount: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  cardCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  cardCtaText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
});
