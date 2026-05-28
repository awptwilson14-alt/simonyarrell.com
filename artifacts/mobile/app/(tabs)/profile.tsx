import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { useSubscription } from "@/lib/revenuecat";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "@/lib/safeWebShims";

import { LookCard } from "@/components/LookCard";
import { ProductCard } from "@/components/ProductCard";
import { GoldButton } from "@/components/GoldButton";
import { MultiFilterChips } from "@/components/FilterChips";
import { STYLE_CATEGORIES, BUDGETS, GENDERS, TRENDS, isLookInTrend } from "@/constants/data";
import { SPLASH_HEROES } from "@/constants/heroImages";
import { findCelebByName } from "@/lib/celebLookup";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { BrandWordmark } from "@/components/BrandWordmark";
import { TitleRule } from "@/components/TitleRule";
import { GoldDot } from "@/components/GoldDot";

type Section = "looks" | "products";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { savedLooks, savedProducts, closetItems, userProfile, updateProfile } = useApp();
  const { isSubscribed } = useSubscription();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [activeSection, setActiveSection] = useState<Section>("looks");
  // null = "All" — show every saved look. Otherwise filter by exact inspiredBy
  // name match. Auto-clears below when the active celeb is no longer present
  // in the saved list (e.g. user unsaved their last Drake-coded look).
  const [celebFilter, setCelebFilter] = useState<string | null>(null);
  // Independent of celebFilter — they compose with AND. Lets the user
  // narrow saved looks by celeb AND trend simultaneously (e.g. "Drake
  // looks that are Old Money"). Mutual exclusion would have been simpler
  // but would force the user to give up one signal to express the other,
  // and these are orthogonal taste dimensions.
  const [trendFilter, setTrendFilter] = useState<string | null>(null);
  // Independent product-side celeb filter. Looks and products are filtered
  // separately because a user channeling Audrey may have saved many looks
  // but few inspiredBy products (or vice versa) — sharing one filter would
  // silently empty the inactive section when switching tabs.
  const [productCelebFilter, setProductCelebFilter] = useState<string | null>(null);
  // Product trend filter — symmetry with looks side (trendFilter, batch 56).
  // Same orthogonality argument: a user might shop heavily Old Money but save
  // looks across many trends. Independent state keeps each section's filter
  // surface honest.
  const [productTrendFilter, setProductTrendFilter] = useState<string | null>(null);

  // Derived list of distinct celebs that appear in saved looks, sorted by
  // descending count so the most-saved celeb leads. Drives the filter pills.
  const savedCelebs = (() => {
    const counts = new Map<string, number>();
    for (const l of savedLooks) {
      if (!l.inspiredBy) continue;
      counts.set(l.inspiredBy, (counts.get(l.inspiredBy) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  })();

  // Same derivation as savedCelebs but over savedProducts — products carry
  // inspiredBy when they came from a celeb-biased generation (batch 42
  // FROM YOUR ICONS rail) or via the per-look shop drawer (line 360 in
  // look/[id].tsx stamps look.inspiredBy onto each saved piece).
  const savedProductCelebs = (() => {
    const counts = new Map<string, number>();
    for (const p of savedProducts) {
      if (!p.inspiredBy) continue;
      counts.set(p.inspiredBy, (counts.get(p.inspiredBy) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  })();

  // Trends present in savedLooks, counted via canonical isLookInTrend helper
  // (constants/data.ts) — single source of truth shared with /explore SAVED
  // badge (50), home Trends-You-Love rail (54), home Trending Now badge (58).
  // Drop zero, sort desc, surface as filter chips.
  const savedTrends = (() => {
    return TRENDS
      .map((t) => ({
        name: t.name,
        count: savedLooks.reduce((n, l) => (isLookInTrend(l, t.name) ? n + 1 : n), 0),
      }))
      .filter(({ count }) => count > 0)
      .sort((a, b) => b.count - a.count);
  })();
  // Same shape for the products side. Products have no `tags`, so the helper
  // falls through to the `style === t.name` check — semantics consistent
  // with looks side and intentional per the helper's docstring.
  const savedProductTrends = (() => {
    return TRENDS
      .map((t) => ({
        name: t.name,
        count: savedProducts.reduce((n, p) => (isLookInTrend(p, t.name) ? n + 1 : n), 0),
      }))
      .filter(({ count }) => count > 0)
      .sort((a, b) => b.count - a.count);
  })();

  // Auto-clear stale filter — two recovery paths, both required to
  // prevent silent stranded-filter state. Effect, not render-time setState,
  // to avoid React's "Cannot update during render" anti-pattern.
  //   1. Selected celeb disappears (last Drake-coded look unsaved).
  //   2. savedCelebs collapses to <2, which hides the row (threshold
  //      `length >= 2` below). A stranded celebFilter would keep filtering
  //      silently with no UI affordance to clear it. Same row-visibility/
  //      auto-clear coupling pattern batch 56 introduced for trendFilter.
  useEffect(() => {
    if (
      celebFilter &&
      (savedCelebs.length < 2 || !savedCelebs.some((c) => c.name === celebFilter))
    ) {
      setCelebFilter(null);
    }
  }, [celebFilter, savedCelebs]);
  useEffect(() => {
    if (
      productCelebFilter &&
      (savedProductCelebs.length < 2 ||
        !savedProductCelebs.some((c) => c.name === productCelebFilter))
    ) {
      setProductCelebFilter(null);
    }
  }, [productCelebFilter, savedProductCelebs]);
  // Self-healing guard for the trend filter. Two recovery paths:
  //   1. Selected trend disappears entirely (last Old Money save removed).
  //   2. savedTrends collapses to <2, which hides the trend row entirely —
  //      a stranded trendFilter would silently keep filtering with no UI
  //      affordance to clear it. So we also clear when the row hides, even
  //      if the selected trend technically still has saves. The trend row
  //      visibility threshold and the auto-clear threshold are now the
  //      same single source of truth.
  useEffect(() => {
    if (
      trendFilter &&
      (savedTrends.length < 2 || !savedTrends.some((t) => t.name === trendFilter))
    ) {
      setTrendFilter(null);
    }
  }, [trendFilter, savedTrends]);
  // Same coupling pattern for productTrendFilter — row hides at <2, filter
  // auto-clears at <2, single source of truth (batches 56/57).
  useEffect(() => {
    if (
      productTrendFilter &&
      (savedProductTrends.length < 2 ||
        !savedProductTrends.some((t) => t.name === productTrendFilter))
    ) {
      setProductTrendFilter(null);
    }
  }, [productTrendFilter, savedProductTrends]);

  const visibleSavedLooks = savedLooks.filter((l) => {
    if (celebFilter && l.inspiredBy !== celebFilter) return false;
    if (trendFilter && !isLookInTrend(l, trendFilter)) return false;
    return true;
  });
  // AND-compose celeb + trend filters, mirroring looks side. Single .filter
  // with early returns per axis — cleaner than nested ternaries and matches
  // the visibleSavedLooks shape above.
  const visibleSavedProducts = savedProducts.filter((p) => {
    if (productCelebFilter && p.inspiredBy !== productCelebFilter) return false;
    if (productTrendFilter && !isLookInTrend(p, productTrendFilter)) return false;
    return true;
  });
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(userProfile.name);
  const [editGender, setEditGender] = useState(userProfile.gender);
  const [editSize, setEditSize] = useState(userProfile.size ?? "M");
  const [editBudget, setEditBudget] = useState(userProfile.budget);
  const [editStyles, setEditStyles] = useState<string[]>(userProfile.favoriteStyles);
  const SIZES = ["S", "M", "L", "XL", "XXX", "XXXX"];

  const toggleStyle = (s: string) => {
    setEditStyles((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const saveEdits = () => {
    updateProfile({ name: editName, gender: editGender, size: editSize, budget: editBudget, favoriteStyles: editStyles });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setEditing(false);
  };

  const initials = userProfile.name
    ? userProfile.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "MS";

  const stats = [
    { label: "LOOKS SAVED", value: savedLooks.length },
    { label: "ITEMS SAVED", value: savedProducts.length },
    { label: "IN CLOSET", value: closetItems.length },
  ];

  // Top channeled celeb across the user's saved looks. Reuses the same
  // inspiredBy === celeb.name attribution contract documented across batches
  // 22, 24, 25, 28, 32, 33. savedCelebs is already sorted desc by count
  // (see the existing memo). Resolve the top entry to a CELEBS record so we
  // can tint the chip in the celeb's accentColor and route to /celebrity/[id].
  // Skips silently when no attributed saves exist OR when the top name no
  // longer matches a CELEBS entry (renamed/removed icon — defensive).
  const topCeleb = savedCelebs[0];
  const topCelebRecord = findCelebByName(topCeleb?.name);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad + 16, paddingBottom: 100 + (Platform.OS === "web" ? 34 : insets.bottom) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Screen title + gold rule (batch 122) — Profile was the only tab
            without a gold-ruled title above its content, breaking the
            convention established for Home/Explore/Closet/Shop in batches
            116-117. Matches closet's Inter_700Bold 28px (both tabs are
            personal "your stuff" surfaces) rather than the Playfair used by
            Explore/Shop's editorial framing.

            Wrapped together so the parent ScrollView's gap:24 doesn't
            compound between BrandWordmark and the title — closet escapes
            this by living outside the content View entirely, but profile's
            BrandWordmark sits inside ScrollView for layout reasons (the
            magazine-cover header needs to scroll with content). The wrapper
            acts as one logical "masthead" sibling in the gap:24 sequence,
            with tight 6px between wordmark and title inside it. */}
        <View style={styles.headerMasthead}>
          <BrandWordmark style={{ marginBottom: 6 }} />
          <View style={styles.titleBlock}>
            <Text style={[styles.screenTitle, { color: colors.foreground }]}>Profile</Text>
            <TitleRule />
          </View>
        </View>
        {/* Profile Header — wrapped in an editorial gendered banner. Same
            SPLASH_HEROES pattern used by onboarding (batch 104) and the empty
            states (batches 106/107), but tuned much subtler (0.30 opacity +
            gentler gradient) since this panel is always-on screen content,
            not a one-off empty/welcome moment. Gives the header a magazine-
            cover feel instead of stark text on a dark void. */}
        <View style={[styles.profileHeaderWrap, { borderColor: colors.border }]}>
          <Image
            source={SPLASH_HEROES[userProfile.gender === "Men" ? "men" : "women"]}
            style={styles.profileHeaderBackdrop}
            resizeMode="cover"
          />
          <LinearGradient
            colors={["rgba(11,11,12,0.65)", "rgba(11,11,12,0.85)", "rgba(11,11,12,0.95)"]}
            locations={[0, 0.6, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.profileHeader}>
          <View style={[styles.avatar, { backgroundColor: colors.card, borderColor: colors.gold }]}>
            <Text style={[styles.avatarText, { color: colors.gold }]}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.name, { color: colors.foreground }]}>
              {userProfile.name || "Your Profile"}
            </Text>
            {/* Gold middle-dot separators (batch 130) — second usage of the
                inline gold-dot pattern from batch 129 (look heroCrumb).
                The styleTag is ALREADY entirely gold (color: colors.gold),
                so the · already inherits gold. Here we instead invert: the
                surrounding tokens (gender / Size N / budget) get tinted
                down so the dots stand out as the editorial accent, giving
                this triplet the same "off-white text + gold dot accent"
                rhythm as the heroCrumb. Implementation: nested Text spans
                with a slightly muted gold-tinted off-white (rgba derived
                from colors.foreground at 0.85) so the row still reads as
                identity-meta, not body copy. Two dots in one phrase
                amplifies the accent vs the single-dot heroCrumb. */}
            <Text style={[styles.styleTag, { color: colors.gold }]}>
              <Text style={{ color: "rgba(245,245,240,0.85)" }}>{userProfile.gender}</Text>
              {" · "}
              <Text style={{ color: "rgba(245,245,240,0.85)" }}>Size {userProfile.size ?? "M"}</Text>
              {" · "}
              <Text style={{ color: "rgba(245,245,240,0.85)" }}>{userProfile.budget}</Text>
            </Text>
            {userProfile.favoriteStyles.length > 0 && (
              // Favorite styles as chips. When a favorite is a known TREND
              // name (Old Money, Y2K Revival, etc.) the chip upgrades to a
              // one-tap jump to /style with trendHint pre-loaded — same
              // mechanism as batch 51, same visual vocab (trending-up +
              // chevron) as the look-detail style pill (batch 52). Non-trend
              // favorites stay as plain chips — no false navigational
              // affordance. Flat-comma string was unreadable on long lists
              // and threw away the natural call-to-action surface.
              <View style={styles.favStyleRow}>
                {userProfile.favoriteStyles.map((s) => {
                  const isTrend = TRENDS.some((t) => t.name === s);
                  if (!isTrend) {
                    return (
                      <View
                        key={s}
                        style={[styles.favStyleChip, { borderColor: colors.border }]}
                      >
                        <Text
                          style={[styles.favStyleChipText, { color: colors.mutedForeground }]}
                        >
                          {s}
                        </Text>
                      </View>
                    );
                  }
                  return (
                    <Pressable
                      key={s}
                      onPress={() => {
                        Haptics.selectionAsync();
                        router.push({
                          pathname: "/(tabs)/style",
                          params: { trendHint: s },
                        });
                      }}
                      style={({ pressed }) => [
                        styles.favStyleChip,
                        styles.favStyleChipTappable,
                        {
                          borderColor: colors.gold,
                          backgroundColor: `${colors.gold}10`,
                          opacity: pressed ? 0.85 : 1,
                        },
                      ]}
                      hitSlop={6}
                    >
                      <Feather name="trending-up" size={9} color={colors.gold} />
                      <Text style={[styles.favStyleChipText, { color: colors.gold }]}>
                        {s}
                      </Text>
                      <Feather name="chevron-right" size={10} color={colors.gold} />
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
          <Pressable
            onPress={() => setEditing(!editing)}
            style={[styles.editBtn, { borderColor: colors.border }]}
            hitSlop={8}
          >
            <Feather name={editing ? "x" : "edit-2"} size={14} color={colors.mutedForeground} />
          </Pressable>
        </View>
        </View>

        {/* Most-channeled celeb — editorial signature for the user's taste.
            Tappable → /celebrity/[id], chevron + accentColor tint match the
            celeb-link language established in batches 26 + 32 (look detail
            INSPIRED BY pill, product card chip). Hidden when no attributed
            saves OR the icon record is missing. */}
        {topCelebRecord && topCeleb && (
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              router.push(`/celebrity/${topCelebRecord.id}`);
            }}
            style={({ pressed }) => [
              styles.topCelebChip,
              {
                backgroundColor: `${topCelebRecord.accentColor}12`,
                borderColor: `${topCelebRecord.accentColor}55`,
                opacity: pressed ? 0.88 : 1,
              },
            ]}
          >
            <Feather name="star" size={12} color={topCelebRecord.accentColor} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.topCelebLabel, { color: topCelebRecord.accentColor }]}>
                MOST CHANNELED
              </Text>
              <Text style={[styles.topCelebName, { color: colors.foreground }]} numberOfLines={1}>
                {topCelebRecord.name}{" "}
                <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
                  · {topCeleb.count} {topCeleb.count === 1 ? "look" : "looks"}
                </Text>
              </Text>
            </View>
            <Feather name="chevron-right" size={14} color={topCelebRecord.accentColor} />
          </Pressable>
        )}

        {/* Stats Row */}
        <View style={[styles.statsRow, { borderColor: colors.border }]}>
          {stats.map((stat, i) => (
            <View key={stat.label} style={[styles.statItem, i < stats.length - 1 && { borderRightWidth: 0.5, borderColor: colors.border }]}>
              <Text style={[styles.statValue, { color: colors.gold }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Membership Banner */}
        {isSubscribed ? (
          <Pressable
            onPress={() => router.push("/membership")}
            style={[styles.memberBanner, { backgroundColor: `${colors.gold}12`, borderColor: `${colors.gold}40` }]}
          >
            <Feather name="check-circle" size={16} color={colors.gold} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.memberBannerTitle, { color: colors.gold }]}>Member Active</Text>
              <Text style={[styles.memberBannerSub, { color: colors.mutedForeground }]}>Full access unlocked</Text>
            </View>
            <Feather name="chevron-right" size={14} color={colors.gold} />
          </Pressable>
        ) : (
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/membership"); }}
            style={[styles.memberBanner, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={[styles.memberIconBox, { backgroundColor: `${colors.gold}15` }]}>
              <Feather name="star" size={15} color={colors.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.memberBannerTitle, { color: colors.foreground }]}>Simon Yarrell Membership</Text>
              <Text style={[styles.memberBannerSub, { color: colors.mutedForeground }]}>
                From $2.99/mo<GoldDot />Unlock everything
              </Text>
            </View>
            <View style={[styles.memberCta, { backgroundColor: colors.gold }]}>
              <Text style={styles.memberCtaText}>JOIN</Text>
            </View>
          </Pressable>
        )}

        {/* Edit Form */}
        {editing && (
          <View style={[styles.editForm, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.editTitle, { color: colors.gold }]}>EDIT PROFILE</Text>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>NAME</Text>
            <TextInput
              value={editName}
              onChangeText={setEditName}
              placeholder="Your name"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.textInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>STYLE PROFILE</Text>
            <View style={styles.genderRow}>
              {GENDERS.map((g) => (
                <Pressable
                  key={g}
                  onPress={() => { Haptics.selectionAsync(); setEditGender(g); }}
                  style={[styles.genderBtn, { borderColor: editGender === g ? colors.gold : colors.border, backgroundColor: editGender === g ? "rgba(201,168,76,0.1)" : "transparent" }]}
                >
                  <Text style={[styles.genderText, { color: editGender === g ? colors.gold : colors.mutedForeground }]}>{g}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>SIZE</Text>
            <View style={styles.sizeGrid}>
              {SIZES.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => { Haptics.selectionAsync(); setEditSize(s); }}
                  style={[styles.sizeBtn, { borderColor: editSize === s ? colors.gold : colors.border, backgroundColor: editSize === s ? "rgba(201,168,76,0.1)" : "transparent" }]}
                >
                  <Text style={[styles.sizeBtnText, { color: editSize === s ? colors.gold : colors.mutedForeground }]}>{s}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>FAVOURITE STYLES</Text>
            <MultiFilterChips options={STYLE_CATEGORIES} selected={editStyles} onToggle={toggleStyle} />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>BUDGET</Text>
            {BUDGETS.map((b) => (
              <Pressable
                key={b}
                onPress={() => { Haptics.selectionAsync(); setEditBudget(b); }}
                style={[styles.budgetRow, { borderColor: editBudget === b ? colors.gold : colors.border, backgroundColor: editBudget === b ? "rgba(201,168,76,0.06)" : "transparent" }]}
              >
                <View style={[styles.radio, { borderColor: editBudget === b ? colors.gold : colors.border }]}>
                  {editBudget === b && <View style={[styles.radioFill, { backgroundColor: colors.gold }]} />}
                </View>
                <Text style={[styles.budgetText, { color: colors.foreground }]}>{b}</Text>
              </Pressable>
            ))}

            <GoldButton label="Save Changes" onPress={saveEdits} />
          </View>
        )}

        {/* Saved Content Tabs */}
        <View style={[styles.sectionTabs, { borderColor: colors.border }]}>
          {(["looks", "products"] as Section[]).map((s) => (
            <Pressable
              key={s}
              onPress={() => setActiveSection(s)}
              style={[styles.sectionTab, { backgroundColor: activeSection === s ? colors.gold : "transparent" }]}
            >
              <Text style={[styles.sectionTabText, { color: activeSection === s ? "#080808" : colors.mutedForeground }]}>
                {s === "looks" ? "SAVED LOOKS" : "SAVED ITEMS"}
              </Text>
            </Pressable>
          ))}
        </View>

        {activeSection === "looks" && (
          savedLooks.length > 0 ? (
            <>
              {savedCelebs.length >= 2 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.celebFilterRow}
                >
                  {[{ name: null as string | null, count: savedLooks.length, label: "ALL" }, ...savedCelebs.map((c) => ({ name: c.name as string | null, count: c.count, label: c.name.toUpperCase() }))].map((c) => {
                    const active = celebFilter === c.name;
                    return (
                      <Pressable
                        key={c.name ?? "__all"}
                        onPress={() => { Haptics.selectionAsync(); setCelebFilter(c.name); }}
                        style={[
                          styles.celebFilterChip,
                          {
                            borderColor: active ? colors.gold : colors.border,
                            backgroundColor: active ? "rgba(198,167,94,0.12)" : "transparent",
                          },
                        ]}
                      >
                        {c.name && <Feather name="star" size={9} color={active ? colors.gold : colors.mutedForeground} />}
                        <Text style={[styles.celebFilterText, { color: active ? colors.gold : colors.mutedForeground }]}>
                          {c.label} · {c.count}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
              {/* Trend filter row — parallel to celeb filter row above.
                  Composes with celebFilter via AND so users can narrow on
                  both axes simultaneously. Same chip grammar (border, bg,
                  count grammar "LABEL · N"), only the leading icon swaps
                  to trending-up to match the trend-bias visual vocab from
                  batches 51-55. Hidden when fewer than 2 trends present
                  (single trend = no useful filter, same threshold logic
                  as celeb row). The trend label uses the trend NAME, not
                  uppercased, since trend names are already title-case
                  brand-style strings ("Old Money", "Y2K Revival") that
                  would look shouty in ALL CAPS — slight grammar diff from
                  celebs is intentional. */}
              {savedTrends.length >= 2 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.celebFilterRow}
                >
                  {[{ name: null as string | null, count: savedLooks.length, label: "ALL TRENDS" }, ...savedTrends.map((t) => ({ name: t.name as string | null, count: t.count, label: t.name }))].map((t) => {
                    const active = trendFilter === t.name;
                    return (
                      <Pressable
                        key={t.name ?? "__alltrends"}
                        onPress={() => { Haptics.selectionAsync(); setTrendFilter(t.name); }}
                        style={[
                          styles.celebFilterChip,
                          {
                            borderColor: active ? colors.gold : colors.border,
                            backgroundColor: active ? "rgba(198,167,94,0.12)" : "transparent",
                          },
                        ]}
                      >
                        {t.name && <Feather name="trending-up" size={9} color={active ? colors.gold : colors.mutedForeground} />}
                        <Text style={[styles.celebFilterText, { color: active ? colors.gold : colors.mutedForeground }]}>
                          {t.label} · {t.count}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.savedList}>
                {visibleSavedLooks.map((look) => (
                  <LookCard key={look.id} look={look} />
                ))}
              </ScrollView>
            </>
          ) : (
            <View style={styles.emptySection}>
              <Feather name="heart" size={32} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No saved looks yet
              </Text>
              <GoldButton label="Discover Looks" onPress={() => router.push("/(tabs)")} variant="outline" small />
            </View>
          )
        )}

        {activeSection === "products" && (
          savedProducts.length > 0 ? (
            <>
              {savedProductCelebs.length >= 2 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.celebFilterRow}
                >
                  {[{ name: null as string | null, count: savedProducts.length, label: "ALL" }, ...savedProductCelebs.map((c) => ({ name: c.name as string | null, count: c.count, label: c.name.toUpperCase() }))].map((c) => {
                    const active = productCelebFilter === c.name;
                    return (
                      <Pressable
                        key={c.name ?? "__all"}
                        onPress={() => { Haptics.selectionAsync(); setProductCelebFilter(c.name); }}
                        style={[
                          styles.celebFilterChip,
                          {
                            borderColor: active ? colors.gold : colors.border,
                            backgroundColor: active ? "rgba(198,167,94,0.12)" : "transparent",
                          },
                        ]}
                      >
                        {c.name && <Feather name="star" size={9} color={active ? colors.gold : colors.mutedForeground} />}
                        <Text style={[styles.celebFilterText, { color: active ? colors.gold : colors.mutedForeground }]}>
                          {c.label} · {c.count}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
              {/* Trend filter row — symmetry with the looks side. trending-up
                  icon (vs star) and non-uppercased trend names (Old Money
                  reads correctly, ALL CAPS would read shouty) — same grammar
                  as the looks trend row. Reuses celebFilter* styles since
                  the chip shape is identical, only icon + label case differ.
                  AND-composes with productCelebFilter so users can express
                  "Drake-coded pieces that are Old Money" via two taps. */}
              {savedProductTrends.length >= 2 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.celebFilterRow}
                >
                  {[{ name: null as string | null, count: savedProducts.length, label: "ALL TRENDS" }, ...savedProductTrends.map((t) => ({ name: t.name as string | null, count: t.count, label: t.name }))].map((t) => {
                    const active = productTrendFilter === t.name;
                    return (
                      <Pressable
                        key={t.name ?? "__all"}
                        onPress={() => { Haptics.selectionAsync(); setProductTrendFilter(t.name); }}
                        style={[
                          styles.celebFilterChip,
                          {
                            borderColor: active ? colors.gold : colors.border,
                            backgroundColor: active ? "rgba(198,167,94,0.12)" : "transparent",
                          },
                        ]}
                      >
                        {t.name && <Feather name="trending-up" size={9} color={active ? colors.gold : colors.mutedForeground} />}
                        <Text style={[styles.celebFilterText, { color: active ? colors.gold : colors.mutedForeground }]}>
                          {t.label} · {t.count}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
              <View style={styles.productsGrid}>
                {visibleSavedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </View>
            </>
          ) : (
            <View style={styles.emptySection}>
              <Feather name="shopping-bag" size={32} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No saved items yet
              </Text>
              <GoldButton label="Browse Shop" onPress={() => router.push("/(tabs)/shop")} variant="outline" small />
            </View>
          )
        )}
        {/* Affiliate Partners Banner */}
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/partners"); }}
          style={[styles.affiliateBanner, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={[styles.affiliateIconBox, { backgroundColor: "rgba(198,167,94,0.12)" }]}>
            <Feather name="link" size={15} color={colors.gold} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.affiliateTitle, { color: colors.foreground }]}>Affiliate Partners</Text>
            <Text style={[styles.affiliateSub, { color: colors.mutedForeground }]}>
              List your brand<GoldDot />fashion@simonyarrell.com
            </Text>
          </View>
          <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
        </Pressable>

        {/* Footer links */}
        <View style={styles.footerLinks}>
          <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/about"); }} style={styles.footerLink}>
            <Feather name="info" size={11} color={colors.mutedForeground} />
            <Text style={[styles.footerLinkText, { color: colors.mutedForeground }]}>About</Text>
          </Pressable>
          <View style={[styles.footerDot, { backgroundColor: colors.border }]} />
          <Pressable onPress={() => router.push("/privacy")} style={styles.footerLink}>
            <Feather name="lock" size={11} color={colors.mutedForeground} />
            <Text style={[styles.footerLinkText, { color: colors.mutedForeground }]}>Privacy Policy</Text>
          </Pressable>
          <View style={[styles.footerDot, { backgroundColor: colors.border }]} />
          <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/partners"); }} style={styles.footerLink}>
            <Feather name="briefcase" size={11} color={colors.mutedForeground} />
            <Text style={[styles.footerLinkText, { color: colors.mutedForeground }]}>Partner with Us</Text>
          </Pressable>
          <View style={[styles.footerDot, { backgroundColor: colors.border }]} />
          <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/affiliate-settings"); }} style={styles.footerLink}>
            <Feather name="link-2" size={11} color={colors.mutedForeground} />
            <Text style={[styles.footerLinkText, { color: colors.mutedForeground }]}>Affiliate Settings</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 24 },
  profileHeaderWrap: {
    borderWidth: 0.5,
    borderRadius: 2,
    overflow: "hidden",
    padding: 16,
  },
  profileHeaderBackdrop: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    opacity: 0.3,
  },
  headerMasthead: {},
  titleBlock: { gap: 6 },
  screenTitle: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  profileHeader: { flexDirection: "row", alignItems: "flex-start", gap: 16 },
  avatar: { width: 68, height: 68, borderRadius: 34, borderWidth: 1.5, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarText: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  profileInfo: { flex: 1, gap: 4, paddingTop: 4 },
  name: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  styleTag: { fontSize: 12, fontFamily: "Inter_500Medium", letterSpacing: 1 },
  styleList: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  favStyleRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  favStyleChip: {
    borderWidth: 0.5,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  favStyleChipTappable: { flexDirection: "row", alignItems: "center", gap: 5 },
  favStyleChipText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
  },
  editBtn: { borderWidth: 0.5, borderRadius: 20, padding: 8 },
  statsRow: { flexDirection: "row", borderWidth: 0.5, borderRadius: 2 },
  topCelebChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 2,
    borderWidth: 0.5,
    marginBottom: 12,
  },
  topCelebLabel: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  topCelebName: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  statItem: { flex: 1, alignItems: "center", paddingVertical: 18, gap: 4 },
  statValue: { fontSize: 24, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 1.5 },
  editForm: { borderWidth: 0.5, borderRadius: 2, padding: 18, gap: 14 },
  editTitle: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  fieldLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 2 },
  textInput: { borderWidth: 0.5, borderRadius: 2, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: "Inter_400Regular" },
  genderRow: { flexDirection: "row", gap: 10 },
  genderBtn: { flex: 1, borderWidth: 0.5, borderRadius: 2, paddingVertical: 12, alignItems: "center" },
  genderText: { fontSize: 12, fontFamily: "Inter_500Medium", letterSpacing: 0.5 },
  sizeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  sizeBtn: { width: "30%", borderWidth: 0.5, borderRadius: 2, paddingVertical: 14, alignItems: "center" },
  sizeBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  budgetRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderWidth: 0.5, borderRadius: 2 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  radioFill: { width: 9, height: 9, borderRadius: 4.5 },
  budgetText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  sectionTabs: { flexDirection: "row", borderWidth: 0.5, borderRadius: 2, overflow: "hidden" },
  sectionTab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  sectionTabText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.5 },
  savedList: { paddingRight: 8 },
  celebFilterRow: { gap: 8, paddingRight: 24, marginBottom: 14 },
  celebFilterChip: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 0.5, paddingHorizontal: 11, paddingVertical: 6 },
  celebFilterText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.2 },
  productsGrid: { gap: 12 },
  emptySection: { alignItems: "center", paddingVertical: 40, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  affiliateBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 0.5,
    borderRadius: 2,
    padding: 14,
  },
  affiliateIconBox: {
    width: 34,
    height: 34,
    borderRadius: 2,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  affiliateTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
  affiliateSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  footerLinks: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 8,
  },
  footerLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 8,
  },
  footerLinkText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.3,
  },
  footerDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  memberBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 0.5,
    borderRadius: 2,
    padding: 14,
  },
  memberIconBox: {
    width: 34,
    height: 34,
    borderRadius: 2,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  memberBannerTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
  memberBannerSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  memberCta: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 2,
  },
  memberCtaText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
    color: "#0B0B0C",
  },
});
