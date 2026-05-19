import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
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
import { generateLooks, resetShownLooks } from "@/lib/outfitEngine";

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
];

type Step = "occasion" | "refine" | "results";

const SOURCE_COUNT = "1,000+";

export default function StyleScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userProfile } = useApp();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [step, setStep] = useState<Step>("occasion");
  const [selectedOccasion, setSelectedOccasion] = useState("");
  const [prompt, setPrompt] = useState("");
  const [selectedBudget, setSelectedBudget] = useState(userProfile.budget || "$500–$1500");
  const [selectedGender, setSelectedGender] = useState(userProfile.gender || "Women");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Look[]>([]);
  const [generateCount, setGenerateCount] = useState(0);

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
        })
      ),
      new Promise((r) => setTimeout(r, 1800)),
    ]);

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
            <View style={s.headerBadge}>
              <Feather name="zap" size={11} color={colors.gold} />
              <Text style={[s.headerBadgeText, { color: colors.gold }]}>AI STYLE CURATOR</Text>
            </View>
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
                    <Image source={occ.image} style={s.occasionImage} resizeMode="cover" />
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
                <ActivityIndicator color={colors.gold} size="large" />
                <Text style={[s.loadingTitle, { color: colors.foreground }]}>Curating your looks...</Text>
                <Text style={[s.loadingText, { color: colors.mutedForeground }]}>
                  Consulting {SOURCE_COUNT} premium brands
                </Text>
                <View style={s.loadingMeta}>
                  <Text style={[s.loadingMetaText, { color: "rgba(198,167,94,0.6)" }]}>
                    {selectedOccasion} · {selectedGender} · {selectedBudget}
                  </Text>
                </View>
              </View>
            ) : (
              <>
                {/* Results grid */}
                <View style={s.resultsGrid}>
                  {results.map((look) => (
                    <LookCard key={look.id} look={look} width={CARD_W} />
                  ))}
                </View>

                {/* Loading more spinner */}
                {loading && (
                  <View style={s.loadMoreSpinner}>
                    <ActivityIndicator color={colors.gold} size="small" />
                    <Text style={[s.loadingText, { color: colors.mutedForeground }]}>
                      Finding more looks...
                    </Text>
                  </View>
                )}

                {/* Actions */}
                {!loading && (
                  <View style={s.resultActions}>
                    <GoldButton label="LOAD MORE LOOKS" onPress={() => generate(true)} variant="outline" />
                    <GoldButton label="START OVER" onPress={reset} variant="ghost" />
                  </View>
                )}

                {/* Session count */}
                <View style={s.sessionNote}>
                  <Feather name="layers" size={11} color={colors.mutedForeground} />
                  <Text style={[s.sessionNoteText, { color: colors.mutedForeground }]}>
                    {results.length} unique looks generated · no repeats
                  </Text>
                </View>
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
  title: { fontSize: 36, fontFamily: "PlayfairDisplay_700Bold", lineHeight: 44, letterSpacing: -0.3 },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },

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
  loadMoreSpinner: { alignItems: "center", paddingVertical: 24, gap: 10 },
  sessionNote: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingTop: 4 },
  sessionNoteText: { fontSize: 11, fontFamily: "Inter_400Regular", letterSpacing: 0.3 },
});
