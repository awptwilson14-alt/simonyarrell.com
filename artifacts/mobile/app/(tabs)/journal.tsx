import { LinearGradient } from "@/lib/safeWebShims";
import { useRouter } from "expo-router";
import Head from "expo-router/head";
import React from "react";
import {
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

import { BrandWordmark } from "@/components/BrandWordmark";
import { TitleRule } from "@/components/TitleRule";
import { useColors } from "@/hooks/useColors";
import { useResponsive } from "@/hooks/useResponsive";
import {
  JOURNAL_ARTICLES,
  JournalArticle,
  formatJournalDate,
  readingTimeMinutes,
} from "@/lib/journal";

// Style Journal — editorial index. Premium magazine layout: one featured
// story, then the remaining stories as cards. Deliberately NOT a storefront:
// no prices, no shop CTAs, no product rails.

const SORTED = [...JOURNAL_ARTICLES].sort((a, b) =>
  b.publishedAt.localeCompare(a.publishedAt),
);
const FEATURED = SORTED[0];
const REST = SORTED.slice(1);

export default function JournalIndexScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const topPad = Platform.OS === "web" ? 56 : insets.top;

  const openArticle = (a: JournalArticle) =>
    router.push(`/journal/${a.slug}` as never);

  return (
    <View style={[s.screen, { backgroundColor: colors.background }]}>
      <Head>
        <title>Style Journal — Fashion Editorial & Style Guides | Simon Yarrell</title>
        <meta
          name="description"
          content="Original fashion editorial from Simon Yarrell: style guides, wardrobe education, luxury and streetwear insight, and how AI is changing personal styling."
        />
        <meta property="og:title" content="Style Journal | Simon Yarrell" />
        <meta
          property="og:description"
          content="Original fashion editorial and style guides from Simon Yarrell."
        />
        <meta property="og:type" content="website" />
      </Head>

      <LinearGradient
        colors={["rgba(198,167,94,0.06)", "transparent", "rgba(198,167,94,0.03)"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Header — Journal is a top-level tab, so no back button */}
      <View style={[s.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <View style={{ width: 36 }} />
        <BrandWordmark />
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          s.content,
          // Extra bottom padding clears the absolute-positioned tab bar.
          { paddingBottom: insets.bottom + 110 },
          isDesktop && s.contentDesktop,
        ]}
      >
        {/* Hero */}
        <View style={s.hero}>
          <Text style={[s.eyebrow, { color: colors.gold }]}>EDITORIAL</Text>
          <Text style={[s.title, { color: colors.foreground }]}>Style{"\n"}Journal</Text>
          <TitleRule width={40} style={{ marginTop: 2 }} />
          <Text style={[s.subtitle, { color: colors.mutedForeground }]}>
            Original style guides, wardrobe education and fashion insight from
            Simon Yarrell Editorial. Useful whether or not you ever buy a thing.
          </Text>
        </View>

        {/* Featured story */}
        <Pressable
          onPress={() => openArticle(FEATURED)}
          style={[s.featured, { borderColor: colors.border, backgroundColor: colors.card }]}
        >
          <Image source={{ uri: FEATURED.heroImage }} style={s.featuredImage} resizeMode="cover" />
          <View style={s.featuredBody}>
            <View style={s.metaRow}>
              <Text style={[s.category, { color: colors.gold }]}>
                {FEATURED.category.toUpperCase()}
              </Text>
              <Text style={[s.metaDot, { color: colors.mutedForeground }]}>·</Text>
              <Text style={[s.metaText, { color: colors.mutedForeground }]}>FEATURED STORY</Text>
            </View>
            <Text style={[s.featuredTitle, { color: colors.foreground }]}>{FEATURED.title}</Text>
            <Text style={[s.cardDesc, { color: colors.mutedForeground }]}>
              {FEATURED.description}
            </Text>
            <Text style={[s.metaText, { color: colors.mutedForeground }]}>
              {formatJournalDate(FEATURED.publishedAt)} · {readingTimeMinutes(FEATURED)} min read
            </Text>
          </View>
        </Pressable>

        {/* Latest stories */}
        <View style={s.sectionHead}>
          <Text style={[s.sectionLabel, { color: colors.gold }]}>LATEST STORIES</Text>
          <View style={[s.sectionRule, { backgroundColor: colors.border }]} />
        </View>

        <View style={[s.grid, isDesktop && s.gridDesktop]}>
          {REST.map((a) => (
            <Pressable
              key={a.slug}
              onPress={() => openArticle(a)}
              style={[
                s.card,
                { borderColor: colors.border, backgroundColor: colors.card },
                isDesktop && s.cardDesktop,
              ]}
            >
              <Image source={{ uri: a.heroImage }} style={s.cardImage} resizeMode="cover" />
              <View style={s.cardBody}>
                <Text style={[s.category, { color: colors.gold }]}>
                  {a.category.toUpperCase()}
                </Text>
                <Text style={[s.cardTitle, { color: colors.foreground }]}>{a.title}</Text>
                <Text style={[s.cardDesc, { color: colors.mutedForeground }]} numberOfLines={3}>
                  {a.description}
                </Text>
                <Text style={[s.metaText, { color: colors.mutedForeground }]}>
                  {formatJournalDate(a.publishedAt)} · {readingTimeMinutes(a)} min read
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Editorial standards note — trust signal, not a sales pitch */}
        <View style={[s.standards, { borderColor: colors.border }]}>
          <Feather name="feather" size={16} color={colors.gold} />
          <Text style={[s.standardsText, { color: colors.mutedForeground }]}>
            Every Style Journal article is original writing by Simon Yarrell
            Editorial. Editorial opinions are independent of any retail
            partnership — see our{" "}
            <Text
              style={{ color: colors.gold }}
              onPress={() => router.push("/partners" as never)}
            >
              Affiliate Disclosure
            </Text>
            .
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 0.5,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 0.5,
    alignItems: "center",
    justifyContent: "center",
  },

  content: { paddingHorizontal: 24, gap: 24, paddingTop: 32 },
  contentDesktop: { maxWidth: 1080, width: "100%", alignSelf: "center" },

  hero: { gap: 10, marginBottom: 4 },
  eyebrow: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 3 },
  title: {
    fontSize: 44,
    fontFamily: "PlayfairDisplay_700Bold",
    letterSpacing: -0.5,
    lineHeight: 50,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    letterSpacing: 0.15,
    maxWidth: 560,
  },

  featured: { borderWidth: 0.5, borderRadius: 2, overflow: "hidden" },
  featuredImage: { width: "100%", height: 280 },
  featuredBody: { padding: 20, gap: 10 },
  featuredTitle: {
    fontSize: 26,
    fontFamily: "PlayfairDisplay_700Bold",
    lineHeight: 33,
    letterSpacing: -0.3,
  },

  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  metaDot: { fontSize: 12 },
  category: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 2.5 },
  metaText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.4,
  },

  sectionHead: { flexDirection: "row", alignItems: "center", gap: 14 },
  sectionLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 3 },
  sectionRule: { flex: 1, height: 0.5 },

  grid: { gap: 20 },
  gridDesktop: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  card: { borderWidth: 0.5, borderRadius: 2, overflow: "hidden" },
  cardDesktop: { flexBasis: "31%", flexGrow: 1, minWidth: 280 },
  cardImage: { width: "100%", height: 170 },
  cardBody: { padding: 16, gap: 8 },
  cardTitle: {
    fontSize: 17,
    fontFamily: "PlayfairDisplay_700Bold",
    lineHeight: 23,
    letterSpacing: -0.2,
  },
  cardDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    letterSpacing: 0.15,
  },

  standards: {
    borderWidth: 0.5,
    borderRadius: 2,
    padding: 18,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  standardsText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
    letterSpacing: 0.2,
  },
});
