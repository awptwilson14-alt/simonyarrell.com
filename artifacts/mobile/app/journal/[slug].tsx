import { LinearGradient } from "@/lib/safeWebShims";
import { safeBack } from "../../lib/nav";
import { useLocalSearchParams, useRouter } from "expo-router";
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
  JournalArticle,
  JournalBlock,
  formatJournalDate,
  getArticle,
  readingTimeMinutes,
  relatedArticles,
} from "@/lib/journal";

// Style Journal — article page. Displays the full editorial contract:
// title, category, hero image, publication + updated dates, author byline,
// reading time, article content, related articles. Affiliate disclosure is
// shown near the top ONLY when an article actually contains affiliate links.

function Block({ block }: { block: JournalBlock }) {
  const colors = useColors();
  switch (block.type) {
    case "h2":
      return <Text style={[b.h2, { color: colors.foreground }]}>{block.text}</Text>;
    case "h3":
      return <Text style={[b.h3, { color: colors.gold }]}>{block.text}</Text>;
    case "p":
      return <Text style={[b.p, { color: colors.mutedForeground }]}>{block.text}</Text>;
    case "list":
      return (
        <View style={b.list}>
          {block.items.map((item, i) => (
            <View key={i} style={b.listRow}>
              <Text style={[b.bullet, { color: colors.gold }]}>—</Text>
              <Text style={[b.p, { color: colors.mutedForeground, flex: 1 }]}>{item}</Text>
            </View>
          ))}
        </View>
      );
    case "formula":
      return (
        <View style={[b.formula, { borderColor: `${colors.gold}55`, backgroundColor: colors.card }]}>
          <Text style={[b.formulaLabel, { color: colors.gold }]}>OUTFIT FORMULA</Text>
          <Text style={[b.formulaName, { color: colors.foreground }]}>{block.name}</Text>
          {block.pieces.map((p, i) => (
            <Text key={i} style={[b.formulaPiece, { color: colors.mutedForeground }]}>
              {p}
            </Text>
          ))}
          {block.sneakerAlt ? (
            <Text style={[b.formulaAlt, { color: colors.foreground }]}>
              Sneaker alternative: <Text style={{ color: colors.gold }}>{block.sneakerAlt}</Text>
            </Text>
          ) : null}
          {block.note ? (
            <Text style={[b.formulaNote, { color: colors.mutedForeground }]}>{block.note}</Text>
          ) : null}
        </View>
      );
    default:
      return null;
  }
}

export default function JournalArticleScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const topPad = Platform.OS === "web" ? 56 : insets.top;

  const article = typeof slug === "string" ? getArticle(slug) : undefined;

  if (!article) {
    return (
      <View style={[s.screen, s.missing, { backgroundColor: colors.background }]}>
        <Text style={[s.missingTitle, { color: colors.foreground }]}>Story not found</Text>
        <Pressable onPress={() => router.push("/journal" as never)} hitSlop={8}>
          <Text style={{ color: colors.gold, fontFamily: "Inter_600SemiBold", fontSize: 13, letterSpacing: 1 }}>
            BACK TO THE STYLE JOURNAL
          </Text>
        </Pressable>
      </View>
    );
  }

  const related = relatedArticles(article.slug);
  const minutes = readingTimeMinutes(article);

  return (
    <View style={[s.screen, { backgroundColor: colors.background }]}>
      <ArticleHead article={article} minutes={minutes} />

      <LinearGradient
        colors={["rgba(198,167,94,0.06)", "transparent", "rgba(198,167,94,0.03)"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Header */}
      <View style={[s.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => safeBack()} hitSlop={12} style={[s.backBtn, { borderColor: colors.border }]}>
          <Feather name="arrow-left" size={16} color={colors.foreground} />
        </Pressable>
        <BrandWordmark />
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          s.content,
          { paddingBottom: insets.bottom + 48 },
          isDesktop && s.contentDesktop,
        ]}
      >
        {/* Article header */}
        <View style={s.hero}>
          <Pressable onPress={() => router.push("/journal" as never)} hitSlop={8}>
            <Text style={[s.eyebrow, { color: colors.gold }]}>
              STYLE JOURNAL · {article.category.toUpperCase()}
            </Text>
          </Pressable>
          <Text style={[s.title, { color: colors.foreground }]}>{article.title}</Text>
          <TitleRule width={40} style={{ marginTop: 2 }} />
          <Text style={[s.byline, { color: colors.mutedForeground }]}>
            By {article.author} · {minutes} min read
          </Text>
          <Text style={[s.dates, { color: colors.mutedForeground }]}>
            Published {formatJournalDate(article.publishedAt)} · Updated{" "}
            {formatJournalDate(article.updatedAt)}
          </Text>
        </View>

        <Image source={{ uri: article.heroImage }} style={s.heroImage} resizeMode="cover" />

        {article.hasAffiliateLinks ? (
          <View style={[s.disclosure, { borderColor: colors.border }]}>
            <Text style={[s.disclosureText, { color: colors.mutedForeground }]}>
              This article contains affiliate links. Simon Yarrell may earn a
              commission when you purchase through certain links — this never
              affects the price you pay or our editorial opinions.{" "}
              <Text style={{ color: colors.gold }} onPress={() => router.push("/partners" as never)}>
                Full disclosure
              </Text>
              .
            </Text>
          </View>
        ) : null}

        {/* Body */}
        <View style={s.body}>
          {article.blocks.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </View>

        {/* Related */}
        <View style={s.sectionHead}>
          <Text style={[s.sectionLabel, { color: colors.gold }]}>RELATED STORIES</Text>
          <View style={[s.sectionRule, { backgroundColor: colors.border }]} />
        </View>
        <View style={[s.relatedRow, isDesktop && s.relatedRowDesktop]}>
          {related.map((r) => (
            <Pressable
              key={r.slug}
              onPress={() => router.push(`/journal/${r.slug}` as never)}
              style={[
                s.relatedCard,
                { borderColor: colors.border, backgroundColor: colors.card },
                isDesktop && s.relatedCardDesktop,
              ]}
            >
              <Image source={{ uri: r.heroImage }} style={s.relatedImage} resizeMode="cover" />
              <View style={s.relatedBody}>
                <Text style={[s.relatedCategory, { color: colors.gold }]}>
                  {r.category.toUpperCase()}
                </Text>
                <Text style={[s.relatedTitle, { color: colors.foreground }]} numberOfLines={3}>
                  {r.title}
                </Text>
                <Text style={[s.relatedMeta, { color: colors.mutedForeground }]}>
                  {readingTimeMinutes(r)} min read
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// Per-article SEO head: unique title, meta description, OG/social tags and
// Article structured data. Rendered on web; a no-op on native.
function ArticleHead({ article, minutes }: { article: JournalArticle; minutes: number }) {
  const structuredData =
    Platform.OS === "web"
      ? JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: article.title,
          description: article.description,
          image: article.heroImage,
          datePublished: article.publishedAt,
          dateModified: article.updatedAt,
          author: { "@type": "Organization", name: "Simon Yarrell Editorial" },
          publisher: { "@type": "Organization", name: "Simon Yarrell" },
          timeRequired: `PT${minutes}M`,
          articleSection: article.category,
        })
      : null;

  return (
    <Head>
      <title>{article.seoTitle}</title>
      <meta name="description" content={article.description} />
      <meta property="og:title" content={article.seoTitle} />
      <meta property="og:description" content={article.description} />
      <meta property="og:type" content="article" />
      <meta property="og:image" content={article.heroImage} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={article.seoTitle} />
      <meta name="twitter:description" content={article.description} />
      <meta name="twitter:image" content={article.heroImage} />
      <meta property="article:published_time" content={article.publishedAt} />
      <meta property="article:modified_time" content={article.updatedAt} />
      <meta property="article:section" content={article.category} />
      {structuredData ? (
        <script type="application/ld+json">{structuredData}</script>
      ) : null}
    </Head>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  missing: { alignItems: "center", justifyContent: "center", gap: 16 },
  missingTitle: { fontSize: 24, fontFamily: "PlayfairDisplay_700Bold" },

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

  content: { paddingHorizontal: 24, gap: 22, paddingTop: 32 },
  contentDesktop: { maxWidth: 760, width: "100%", alignSelf: "center" },

  hero: { gap: 10 },
  eyebrow: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 3 },
  title: {
    fontSize: 34,
    fontFamily: "PlayfairDisplay_700Bold",
    letterSpacing: -0.5,
    lineHeight: 41,
  },
  byline: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.4 },
  dates: { fontSize: 11, fontFamily: "Inter_400Regular", letterSpacing: 0.3 },

  heroImage: { width: "100%", height: 260, borderRadius: 2 },

  disclosure: { borderWidth: 0.5, borderRadius: 2, padding: 14 },
  disclosureText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
    lineHeight: 17,
    letterSpacing: 0.2,
  },

  body: { gap: 16 },

  sectionHead: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 8 },
  sectionLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 3 },
  sectionRule: { flex: 1, height: 0.5 },

  relatedRow: { gap: 16 },
  relatedRowDesktop: { flexDirection: "row" },
  relatedCard: { borderWidth: 0.5, borderRadius: 2, overflow: "hidden" },
  relatedCardDesktop: { flex: 1 },
  relatedImage: { width: "100%", height: 120 },
  relatedBody: { padding: 14, gap: 6 },
  relatedCategory: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  relatedTitle: {
    fontSize: 14,
    fontFamily: "PlayfairDisplay_700Bold",
    lineHeight: 19,
  },
  relatedMeta: { fontSize: 10, fontFamily: "Inter_400Regular", letterSpacing: 0.3 },
});

const b = StyleSheet.create({
  h2: {
    fontSize: 24,
    fontFamily: "PlayfairDisplay_700Bold",
    lineHeight: 31,
    letterSpacing: -0.3,
    marginTop: 10,
  },
  h3: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginTop: 4,
  },
  p: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 25,
    letterSpacing: 0.15,
  },
  list: { gap: 10 },
  listRow: { flexDirection: "row", gap: 10 },
  bullet: { fontSize: 15, lineHeight: 25 },

  formula: {
    borderWidth: 0.5,
    borderRadius: 2,
    padding: 18,
    gap: 6,
    marginVertical: 6,
  },
  formulaLabel: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 2.5 },
  formulaName: {
    fontSize: 18,
    fontFamily: "PlayfairDisplay_700Bold",
    marginBottom: 4,
  },
  formulaPiece: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 23 },
  formulaAlt: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginTop: 6,
    lineHeight: 20,
  },
  formulaNote: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
    lineHeight: 18,
    marginTop: 4,
  },
});
