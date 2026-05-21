import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
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

import { GoldButton } from "@/components/GoldButton";
import { LookCard } from "@/components/LookCard";
import { BUDGETS, GENDERS, Look } from "@/constants/data";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { BrandWordmark } from "@/components/BrandWordmark";
import { pickOccasionHero } from "@/constants/heroImages";
import { generateLooks, resetShownLooks, assignUniqueLookImages, getBrandAvailability } from "@/lib/outfitEngine";
import { type CelebFull } from "@/constants/celebrities";
import { findCelebById } from "@/lib/celebLookup";

const { width } = Dimensions.get("window");
const CARD_W = (width - 48 - 12) / 2;

interface Occasion {
  label: string;
  image: any;
}

const OCCASIONS: Occasion[] = [
  { label: "Casual", image: require("../../assets/images/occasion_casual.png") },
  { label: "Date Night", image: require("../../assets/images/occasion_date.png") },
  { label: "Work", image: require("../../assets/images/occasion_work.png") },
  { label: "Vacation", image: require("../../assets/images/occasion_vacation.png") },
  { label: "Event", image: require("../../assets/images/occasion_event.png") },
  { label: "Streetwear", image: require("../../assets/images/occasion_street.png") },
  { label: "Formal", image: require("../../assets/images/occasion_event.png") },
];

type Step = "occasion" | "refine" | "results";

const SOURCE_COUNT = "1,000+";

export default function StyleScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userProfile, registerGeneratedLooks } = useApp();
  // Optional celeb context — set when the user came from
  // "GENERATE MY <CELEB> LOOK" on /celebrity/[id]. Drives the editorial
  // brand bias inside generateLooks via celebSignatureBrands.
  // Snapshotted to local state on mount so it survives within this Style
  // session, then the route params are immediately cleared so the bias
  // does NOT leak the next time the user opens the Style tab.
  const { celebrity: celebrityId, lookHint: lookHintParam, trendHint: trendHintParam, brand: brandParam } = useLocalSearchParams<{
    celebrity?: string;
    celebName?: string;
    lookHint?: string;
    trendHint?: string;
    brand?: string;
  }>();
  const [activeCeleb, setActiveCeleb] = useState<CelebFull | undefined>(undefined);
  // Optional iconic-look hint when the user tapped a specific Signature Look
  // card on /celebrity/[id] (e.g. "Met Gala Yellow"). Cosmetic only — the
  // engine still generates from celeb.signatureBrands; this drives the
  // loading copy so the per-card tap has visible meaning. Cleared with the
  // celeb params so it can't leak into a later session.
  const [activeLookHint, setActiveLookHint] = useState<string | undefined>(undefined);
  // Optional trend context — set when the user tapped a card on the explore
  // TRENDS subtab (batch 50/51). Parallel to activeCeleb but with different
  // intent vocabulary: a trend is a TASTE bias, a celeb is a BRAND bias. We
  // keep them mutually exclusive in the header chip slot so the user always
  // sees ONE source-of-bias label, never a confusing stack. The trend name
  // is also pre-filled into the prompt so generateLooks's prompt-bias picks
  // it up downstream — closes the loop end-to-end.
  const [activeTrendHint, setActiveTrendHint] = useState<string | undefined>(undefined);
  // Optional brand-lock context (batch 83) — set when the user tapped
  // "STYLE WITH <BRAND>" on a designer card in /shop. When set, the
  // generator filters the CATALOG to ONLY this brand for every piece slot,
  // so the look reflects exactly the designer the user selected — no
  // cross-brand pollution. Snapshotted on mount and the route param is
  // cleared so cold-opening the Style tab later does NOT silently re-apply
  // the lock. Brand-lock is mutually exclusive with celeb/trend bias —
  // when brand arrives, those are cleared to keep the header chip slot
  // unambiguous.
  const [activeBrand, setActiveBrand] = useState<string | undefined>(undefined);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [step, setStep] = useState<Step>("occasion");
  const [selectedOccasion, setSelectedOccasion] = useState("");
  const [prompt, setPrompt] = useState("");
  const [selectedBudget, setSelectedBudget] = useState(userProfile.budget || "$500–$1500");
  const [selectedGender, setSelectedGender] = useState(userProfile.gender || "Women");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Look[]>([]);
  const [generateCount, setGenerateCount] = useState(0);

  // Fresh dedup state every time the Style flow mounts — no duplicate names
  // or images carrying over from a previous Style session.
  useEffect(() => {
    resetShownLooks();
  }, []);

  // One-shot capture of the celeb route param. Snapshot into local state
  // for this Style session, then clear the URL so navigating away and
  // back doesn't silently re-apply the celeb brand bias.
  useEffect(() => {
    if (!celebrityId) return;
    const celeb = findCelebById(celebrityId);
    if (celeb) setActiveCeleb(celeb);
    // Deterministic set — when a celeb param arrives WITHOUT a look hint
    // (generic "GENERATE MY <CELEB> LOOK" CTA), explicitly clear any stale
    // hint from a prior look-card entry in the same mounted Style session.
    setActiveLookHint(lookHintParam || undefined);
    router.setParams({ celebrity: undefined, celebName: undefined, lookHint: undefined });
  }, [celebrityId, lookHintParam, router]);

  // One-shot capture of the trend route param. Same snapshot-then-clear
  // pattern as the celeb effect above — keeps trend context inside this
  // Style session and prevents stale bias when the user later opens the
  // Style tab cold. Pre-fills the prompt with the trend name so the
  // generation flow downstream picks it up via the existing `prompt` arg.
  useEffect(() => {
    if (!trendHintParam) return;
    setActiveTrendHint(trendHintParam);
    setPrompt((p) => (p.trim().length === 0 ? trendHintParam : p));
    router.setParams({ trendHint: undefined });
  }, [trendHintParam, router]);

  // One-shot capture of the brand-lock route param. Same snapshot-then-clear
  // pattern as celeb/trend above. Clears celeb + trend so the header chip
  // slot has ONE source-of-bias label at a time (brand wins, since the
  // user's intent was explicit "only this designer").
  useEffect(() => {
    if (!brandParam) return;
    setActiveBrand(brandParam);
    setActiveCeleb(undefined);
    setActiveLookHint(undefined);
    setActiveTrendHint(undefined);
    router.setParams({ brand: undefined });
  }, [brandParam, router]);

  const selectOccasion = (label: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedOccasion(label);
  };

  const goToRefine = () => {
    if (!selectedOccasion) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep("refine");
  };

  const generate = async (isMore = false) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setLoading(true);
    if (!isMore) setStep("results");

    // Minimum 1.8s loading for UX — the actual generation is synchronous but
    // we want the "consulting brands" moment to feel intentional
    const [generatedLooks] = await Promise.all([
      Promise.resolve(
        generateLooks({
          gender: selectedGender,
          occasion: selectedOccasion,
          budget: selectedBudget,
          prompt,
          favoriteStyles: userProfile.favoriteStyles,
          count: 6,
          celebSignatureBrands: activeCeleb?.signatureBrands,
          celebName: activeCeleb?.name,
          brandLock: activeBrand,
        })
      ),
      new Promise((r) => setTimeout(r, 1800)),
    ]);

    registerGeneratedLooks(generatedLooks);
    setResults((prev) => (isMore ? [...prev, ...generatedLooks] : generatedLooks));
    setGenerateCount((c) => c + 1);
    setLoading(false);
  };

  const reset = () => {
    resetShownLooks();
    setStep("occasion");
    setSelectedOccasion("");
    setPrompt("");
    setResults([]);
    setGenerateCount(0);
    setActiveCeleb(undefined);
    setActiveLookHint(undefined);
    setActiveTrendHint(undefined);
    setActiveBrand(undefined);
  };

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          s.content,
          { paddingTop: topPad + 16, paddingBottom: 100 + (Platform.OS === "web" ? 34 : insets.bottom) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ── */}
        <BrandWordmark style={{ marginBottom: 2 }} />
        <View style={s.header}>
          <View style={s.headerTop}>
            {step !== "occasion" && (
              <Pressable onPress={() => setStep(step === "results" ? "refine" : "occasion")} hitSlop={12}>
                <Feather name="arrow-left" size={20} color={colors.foreground} />
              </Pressable>
            )}
            {activeBrand ? (
              // BRAND LOCK chip (batch 83) — visible confirmation that the
              // generator is filtering to ONLY this designer for every piece
              // slot. Tap × to release the lock and return to the normal
              // mixed-brand generator. Gold-accented since brand-lock isn't
              // tied to a celeb accent color or a trend.
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveBrand(undefined);
                }}
                style={[s.channelChip, { borderColor: colors.gold }]}
                hitSlop={6}
              >
                <Feather name="tag" size={10} color={colors.gold} />
                <Text style={[s.channelChipText, { color: colors.gold }]} numberOfLines={1}>
                  ONLY {activeBrand.toUpperCase()}
                </Text>
                <Feather name="x" size={11} color={colors.gold} />
              </Pressable>
            ) : activeCeleb ? (
              // CHANNELING chip — visible confirmation that celeb brand bias
              // is active for this Style session. Tinted with the celeb's
              // accentColor so it reads as "this is a {Celeb} look" rather
              // than the neutral curator badge. The × clears activeCeleb so
              // the user can opt out of the bias mid-flow without restarting
              // (e.g. came in from /celebrity but decided to generate a
              // generic look instead). The existing reset button still clears
              // everything including this; this just gives a softer escape.
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveCeleb(undefined);
                  setActiveLookHint(undefined);
                }}
                style={[s.channelChip, { borderColor: activeCeleb.accentColor }]}
                hitSlop={6}
              >
                <Feather name="star" size={10} color={activeCeleb.accentColor} />
                <Text style={[s.channelChipText, { color: activeCeleb.accentColor }]} numberOfLines={1}>
                  CHANNELING {activeCeleb.name.split(" ")[0].toUpperCase()}
                </Text>
                <Feather name="x" size={11} color={activeCeleb.accentColor} />
              </Pressable>
            ) : activeTrendHint ? (
              // INSPIRED BY {TREND} chip — mirrors the celeb channeling chip's
              // shape so the header always has the same affordance. Gold
              // (vs per-celeb accent) because trends don't carry an accent
              // color; gold is the brand's neutral-positive emphasis. × clears
              // activeTrendHint AND the pre-filled prompt (only if prompt
              // still equals the trend name — never clobber user-typed text).
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveTrendHint(undefined);
                  setPrompt((p) => (p === activeTrendHint ? "" : p));
                }}
                style={[s.channelChip, { borderColor: colors.gold }]}
                hitSlop={6}
              >
                <Feather name="trending-up" size={10} color={colors.gold} />
                <Text style={[s.channelChipText, { color: colors.gold }]} numberOfLines={1}>
                  INSPIRED BY {activeTrendHint.toUpperCase()}
                </Text>
                <Feather name="x" size={11} color={colors.gold} />
              </Pressable>
            ) : (
              <View style={s.headerBadge}>
                <Feather name="zap" size={11} color={colors.gold} />
                <Text style={[s.headerBadgeText, { color: colors.gold }]}>AI STYLE CURATOR</Text>
              </View>
            )}
            {step !== "occasion" ? (
              <Pressable onPress={reset} hitSlop={12}>
                <Feather name="refresh-cw" size={16} color={colors.mutedForeground} />
              </Pressable>
            ) : (
              <View style={{ width: 20 }} />
            )}
          </View>

          {step === "occasion" && (
            <>
              <Text style={[s.title, { color: colors.foreground }]}>What's the{"\n"}occasion?</Text>
              <Text style={[s.subtitle, { color: colors.mutedForeground }]}>
                Let's find the perfect look for you.
              </Text>
            </>
          )}
          {step === "refine" && (
            <>
              <Text style={[s.title, { color: colors.foreground }]}>Refine your{"\n"}look.</Text>
              <Text style={[s.subtitle, { color: colors.mutedForeground }]}>
                {selectedOccasion} · Tell us more
              </Text>
            </>
          )}
          {step === "results" && (
            <>
              <Text style={[s.title, { color: colors.foreground }]}>Your Curated{"\n"}Looks</Text>
              <Text style={[s.subtitle, { color: colors.mutedForeground }]}>
                {selectedOccasion} · {selectedGender} · {selectedBudget}
              </Text>
              {activeCeleb && (
                // INSPIRED BY pill on the results step — tap to jump to the
                // celeb's profile (batch 71). Same handoff vocab as the
                // LookCard inspiredTag (batch 68), ProductCard inspiredChip
                // (batch 31 chain), and look-detail inspiredBy chip (batch
                // 26): celeb-tinted, star + chevron-right, selection haptic.
                // activeCeleb is CelebFull (guaranteed by useState type) so
                // .id is safe — and the pill only renders inside this
                // `activeCeleb &&` gate, so no null branch needed. Distinct
                // from the persistent header CHANNELING chip (line ~213)
                // which CLEARS the channel — this pill INSPECTS the icon.
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    router.push(`/celebrity/${activeCeleb.id}`);
                  }}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={`View ${activeCeleb.name} profile`}
                  style={({ pressed }) => [
                    s.inspiredPill,
                    {
                      borderColor: activeCeleb.accentColor,
                      backgroundColor: activeCeleb.accentColor + "1A",
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Feather name="star" size={10} color={activeCeleb.accentColor} />
                  <Text style={[s.inspiredPillText, { color: activeCeleb.accentColor }]}>
                    INSPIRED BY {activeCeleb.name.toUpperCase()}
                  </Text>
                  <Feather name="chevron-right" size={11} color={activeCeleb.accentColor} />
                </Pressable>
              )}
            </>
          )}
        </View>

        {/* ── Step 1: Occasion Grid ── */}
        {step === "occasion" && (
          <View style={s.section}>
            <View style={s.occasionGrid}>
              {OCCASIONS.map((occ) => {
                const active = selectedOccasion === occ.label;
                return (
                  <Pressable
                    key={occ.label}
                    onPress={() => selectOccasion(occ.label)}
                    style={({ pressed }) => [s.occasionCard, { width: CARD_W, opacity: pressed ? 0.88 : 1 }]}
                  >
                    <Image source={pickOccasionHero(occ.label, userProfile.gender) ?? occ.image} style={s.occasionImage} resizeMode="cover" />
                    <View style={[s.occasionOverlay, active && { backgroundColor: "rgba(198,167,94,0.25)" }]} />
                    {active && (
                      <View style={[s.occasionCheck, { backgroundColor: colors.gold }]}>
                        <Feather name="check" size={12} color="#0B0B0C" />
                      </View>
                    )}
                    <View style={s.occasionLabel}>
                      <Text style={[s.occasionLabelText, active && { color: colors.gold }]}>
                        {occ.label}
                      </Text>
                    </View>
                    {active && <View style={[s.occasionBorder, { borderColor: colors.gold }]} />}
                  </Pressable>
                );
              })}
            </View>
            <GoldButton label="NEXT" onPress={goToRefine} disabled={!selectedOccasion} />
          </View>
        )}

        {/* ── Step 2: Refine ── */}
        {step === "refine" && (
          <View style={s.section}>

            {/* Gender */}
            <View style={s.fieldBlock}>
              <Text style={[s.fieldLabel, { color: colors.mutedForeground }]}>STYLE PROFILE</Text>
              <View style={s.chipRow}>
                {GENDERS.map((g) => (
                  <Pressable
                    key={g}
                    onPress={() => { Haptics.selectionAsync(); setSelectedGender(g); }}
                    style={[
                      s.chip,
                      {
                        borderColor: selectedGender === g ? colors.gold : colors.border,
                        backgroundColor: selectedGender === g ? "rgba(198,167,94,0.1)" : "transparent",
                      },
                    ]}
                  >
                    <Text style={[s.chipText, { color: selectedGender === g ? colors.gold : colors.mutedForeground }]}>
                      {g}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Budget */}
            <View style={s.fieldBlock}>
              <Text style={[s.fieldLabel, { color: colors.mutedForeground }]}>BUDGET</Text>
              <View style={s.budgetGrid}>
                {BUDGETS.map((b) => (
                  <Pressable
                    key={b}
                    onPress={() => { Haptics.selectionAsync(); setSelectedBudget(b); }}
                    style={[
                      s.budgetChip,
                      {
                        borderColor: selectedBudget === b ? colors.gold : colors.border,
                        backgroundColor: selectedBudget === b ? "rgba(198,167,94,0.1)" : "transparent",
                      },
                    ]}
                  >
                    <Text style={[s.budgetChipText, { color: selectedBudget === b ? colors.gold : colors.mutedForeground }]}>
                      {b}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Optional prompt */}
            <View style={s.fieldBlock}>
              <Text style={[s.fieldLabel, { color: colors.mutedForeground }]}>DESCRIBE (OPTIONAL)</Text>
              <View style={[s.promptBox, { borderColor: colors.border, backgroundColor: colors.input }]}>
                <Feather name="edit-2" size={15} color={colors.mutedForeground} />
                <TextInput
                  value={prompt}
                  onChangeText={setPrompt}
                  placeholder="e.g. Dinner at a rooftop restaurant in Paris..."
                  placeholderTextColor={colors.mutedForeground}
                  style={[s.promptInput, { color: colors.foreground }]}
                  multiline
                />
              </View>
            </View>

            <GoldButton label="GENERATE MY LOOKS" onPress={() => generate(false)} />

            {/* Source note */}
            <View style={s.sourceNote}>
              <Feather name="globe" size={11} color={colors.mutedForeground} />
              <Text style={[s.sourceNoteText, { color: colors.mutedForeground }]}>
                Sourcing from {SOURCE_COUNT} brands worldwide
              </Text>
            </View>
          </View>
        )}

        {/* ── Step 3: Results ── */}
        {step === "results" && (
          <View style={s.section}>
            {loading && results.length === 0 ? (
              <View style={s.loadingBox}>
                <ActivityIndicator color={activeCeleb?.accentColor ?? colors.gold} size="large" />
                <Text style={[s.loadingTitle, { color: colors.foreground }]}>
                  {activeCeleb
                    ? activeLookHint
                      ? `Channeling ${activeCeleb.name.split(" ")[0]}'s ${activeLookHint}...`
                      : `Channeling ${activeCeleb.name.split(" ")[0]}...`
                    : "Curating your looks..."}
                </Text>
                <Text style={[s.loadingText, { color: colors.mutedForeground }]}>
                  {activeCeleb
                    ? `Pulling from ${activeCeleb.signatureBrands.slice(0, 3).join(", ")} & more`
                    : `Consulting ${SOURCE_COUNT} premium brands`}
                </Text>
                <View style={s.loadingMeta}>
                  <Text style={[s.loadingMetaText, { color: "rgba(198,167,94,0.6)" }]}>
                    {selectedOccasion} · {selectedGender} · {selectedBudget}
                  </Text>
                </View>
              </View>
            ) : (
              <>
                {/* Brand-lock empty-state — explains WHY this brand has 0 looks.
                    Per product rule, only two acceptable empty reasons exist:
                    gender-specific brand, or cheapest outfit over budget. */}
                {results.length === 0 && activeBrand && (() => {
                  const avail = getBrandAvailability(activeBrand, selectedGender || userProfile.gender, selectedBudget);
                  return (
                    <View style={s.brandEmptyBox}>
                      <Feather
                        name={!avail.hasGenderItems ? "user-x" : "dollar-sign"}
                        size={28}
                        color={colors.gold}
                      />
                      <Text style={[s.brandEmptyTitle, { color: colors.foreground }]}>
                        {!avail.hasGenderItems
                          ? `${activeBrand} is gender-specific`
                          : "Look is over your budget"}
                      </Text>
                      <Text style={[s.brandEmptyText, { color: colors.mutedForeground }]}>
                        {!avail.hasGenderItems
                          ? `${activeBrand} doesn't carry ${(selectedGender || userProfile.gender).toLowerCase()}'s pieces in our catalog. Try a different gender or remove the brand lock.`
                          : `Looks from ${activeBrand} start around $${avail.cheapestOutfitPrice.toLocaleString()}. Try raising your budget or removing the brand lock.`}
                      </Text>
                      <View style={s.brandEmptyActions}>
                        <GoldButton label="REMOVE BRAND LOCK" onPress={() => { setActiveBrand(undefined); setTimeout(() => generate(false), 50); }} variant="outline" />
                        <GoldButton label="START OVER" onPress={reset} variant="ghost" />
                      </View>
                    </View>
                  );
                })()}

                {/* Results grid */}
                {results.length > 0 && (
                  <View style={s.resultsGrid}>
                    {assignUniqueLookImages(results, selectedGender || userProfile.gender).map((look) => (
                      <LookCard key={look.id} look={look} width={CARD_W} />
                    ))}
                  </View>
                )}

                {/* Loading more spinner */}
                {loading && (
                  <View style={s.loadMoreSpinner}>
                    <ActivityIndicator color={colors.gold} size="small" />
                    <Text style={[s.loadingText, { color: colors.mutedForeground }]}>
                      Finding more looks...
                    </Text>
                  </View>
                )}

                {/* Actions — only when there's something to load-more from */}
                {!loading && results.length > 0 && (
                  <View style={s.resultActions}>
                    <GoldButton label="LOAD MORE LOOKS" onPress={() => generate(true)} variant="outline" />
                    <GoldButton label="START OVER" onPress={reset} variant="ghost" />
                  </View>
                )}

                {/* Session count — hide when we're showing the brand-lock empty state */}
                {results.length > 0 && (
                  <View style={s.sessionNote}>
                    <Feather name="layers" size={11} color={colors.mutedForeground} />
                    <Text style={[s.sessionNoteText, { color: colors.mutedForeground }]}>
                      {results.length} unique looks generated · no repeats
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 24, gap: 28 },
  header: { gap: 10 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  headerBadge: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  channelChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: 240,
  },
  channelChipText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
    flexShrink: 1,
  },
  title: { fontSize: 36, fontFamily: "PlayfairDisplay_700Bold", lineHeight: 44, letterSpacing: -0.3 },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  inspiredPill: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 0.5, paddingHorizontal: 10, paddingVertical: 5, marginTop: 6 },
  inspiredPillText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.5 },

  section: { gap: 24 },

  // Occasion grid
  occasionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  occasionCard: { height: CARD_W * 1.22, borderRadius: 4, overflow: "hidden", position: "relative" },
  occasionImage: { width: "100%", height: "100%" },
  occasionOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.28)" },
  occasionCheck: { position: "absolute", top: 10, right: 10, width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  occasionBorder: { ...StyleSheet.absoluteFillObject, borderWidth: 2, borderRadius: 4 },
  occasionLabel: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 12, backgroundColor: "rgba(0,0,0,0.5)" },
  occasionLabelText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#F5F5F0", letterSpacing: 0.3 },

  // Refine step
  fieldBlock: { gap: 12 },
  fieldLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 2 },
  chipRow: { flexDirection: "row", gap: 10 },
  chip: { flex: 1, borderWidth: 0.5, borderRadius: 4, paddingVertical: 13, alignItems: "center" },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium", letterSpacing: 0.5 },
  budgetGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  budgetChip: { borderWidth: 0.5, borderRadius: 4, paddingHorizontal: 14, paddingVertical: 10 },
  budgetChipText: { fontSize: 12, fontFamily: "Inter_500Medium", letterSpacing: 0.3 },
  promptBox: { flexDirection: "row", alignItems: "flex-start", gap: 12, borderWidth: 0.5, borderRadius: 4, paddingHorizontal: 14, paddingVertical: 14 },
  promptInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22, minHeight: 72 },

  sourceNote: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingTop: 4 },
  sourceNoteText: { fontSize: 11, fontFamily: "Inter_400Regular", letterSpacing: 0.3 },

  // Loading
  loadingBox: { alignItems: "center", paddingVertical: 60, gap: 16 },
  loadingTitle: { fontSize: 20, fontFamily: "PlayfairDisplay_700Bold", letterSpacing: 0.2 },
  loadingText: { fontSize: 13, fontFamily: "Inter_400Regular", letterSpacing: 0.3 },
  loadingMeta: { marginTop: 4 },
  loadingMetaText: { fontSize: 11, fontFamily: "Inter_500Medium", letterSpacing: 1 },

  // Results
  resultsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  resultActions: { gap: 12 },
  brandEmptyBox: {
    alignItems: "center",
    gap: 14,
    paddingVertical: 40,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: "rgba(198,167,94,0.25)",
    borderRadius: 16,
    backgroundColor: "rgba(198,167,94,0.04)",
  },
  brandEmptyTitle: {
    fontSize: 16,
    fontFamily: "PlayfairDisplay_700Bold",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  brandEmptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 19,
    maxWidth: 280,
  },
  brandEmptyActions: { gap: 10, width: "100%", marginTop: 8 },
  loadMoreSpinner: { alignItems: "center", paddingVertical: 24, gap: 10 },
  sessionNote: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingTop: 4 },
  sessionNoteText: { fontSize: 11, fontFamily: "Inter_400Regular", letterSpacing: 0.3 },
});
