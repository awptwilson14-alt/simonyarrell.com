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
import { LOOKS } from "@/constants/data";
import { useColors } from "@/hooks/useColors";
import { BrandWordmark } from "@/components/BrandWordmark";

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

const BUDGETS = ["Under $500", "$500–$1500", "$1500–$3000", "$3000–$6000", "$6000+"];

type Step = "occasion" | "prompt" | "results";

export default function StyleScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [step, setStep] = useState<Step>("occasion");
  const [selectedOccasion, setSelectedOccasion] = useState("");
  const [prompt, setPrompt] = useState("");
  const [selectedBudget, setSelectedBudget] = useState("$500–$1500");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<typeof LOOKS>([]);

  const selectOccasion = (label: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedOccasion(label);
  };

  const goToPrompt = () => {
    if (!selectedOccasion) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep("prompt");
  };

  const generate = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setLoading(true);
    setStep("results");
    setResults([]);
    await new Promise((r) => setTimeout(r, 2000));
    setResults(LOOKS);
    setLoading(false);
  };

  const reset = () => {
    setStep("occasion");
    setSelectedOccasion("");
    setPrompt("");
    setResults([]);
  };

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
        {/* ── Header ── */}
        <BrandWordmark style={{ marginBottom: 2 }} />
        <View style={styles.header}>
          <View style={styles.headerTop}>
            {step !== "occasion" && (
              <Pressable onPress={() => setStep(step === "results" ? "prompt" : "occasion")} hitSlop={12}>
                <Feather name="arrow-left" size={20} color={colors.foreground} />
              </Pressable>
            )}
            <View style={styles.headerBadge}>
              <Feather name="zap" size={11} color={colors.gold} />
              <Text style={[styles.headerBadgeText, { color: colors.gold }]}>AI STYLE CURATOR</Text>
            </View>
            {step !== "occasion" && (
              <Pressable onPress={reset} hitSlop={12}>
                <Feather name="refresh-cw" size={16} color={colors.mutedForeground} />
              </Pressable>
            )}
            {step === "occasion" && <View style={{ width: 20 }} />}
          </View>

          {step === "occasion" && (
            <>
              <Text style={[styles.title, { color: colors.foreground }]}>
                What's the{"\n"}occasion?
              </Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                Let's find the perfect look for you.
              </Text>
            </>
          )}
          {step === "prompt" && (
            <>
              <Text style={[styles.title, { color: colors.foreground }]}>
                Describe your{"\n"}style moment.
              </Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                {selectedOccasion} · Tell us more (optional)
              </Text>
            </>
          )}
          {step === "results" && (
            <>
              <Text style={[styles.title, { color: colors.foreground }]}>
                Your Curated{"\n"}Looks
              </Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                {selectedOccasion} · {selectedBudget}
              </Text>
            </>
          )}
        </View>

        {/* ── Occasion Grid ── */}
        {step === "occasion" && (
          <View style={styles.occasionSection}>
            <View style={styles.occasionGrid}>
              {OCCASIONS.map((occ) => {
                const active = selectedOccasion === occ.label;
                return (
                  <Pressable
                    key={occ.label}
                    onPress={() => selectOccasion(occ.label)}
                    style={({ pressed }) => [
                      styles.occasionCard,
                      { width: CARD_W, opacity: pressed ? 0.88 : 1 },
                    ]}
                  >
                    <Image
                      source={occ.image}
                      style={styles.occasionImage}
                      resizeMode="cover"
                    />
                    {/* Overlay */}
                    <View
                      style={[
                        styles.occasionOverlay,
                        active && { backgroundColor: "rgba(198,167,94,0.25)" },
                      ]}
                    />
                    {active && (
                      <View style={[styles.occasionCheckmark, { backgroundColor: colors.gold }]}>
                        <Feather name="check" size={12} color="#0B0B0C" />
                      </View>
                    )}
                    {/* Label */}
                    <View style={styles.occasionLabel}>
                      <Text style={[styles.occasionLabelText, active && { color: colors.gold }]}>
                        {occ.label}
                      </Text>
                    </View>
                    {/* Gold border when selected */}
                    {active && (
                      <View style={[styles.occasionBorder, { borderColor: colors.gold }]} />
                    )}
                  </Pressable>
                );
              })}
            </View>

            <GoldButton
              label="NEXT"
              onPress={goToPrompt}
              disabled={!selectedOccasion}
            />
          </View>
        )}

        {/* ── Prompt Step ── */}
        {step === "prompt" && (
          <View style={styles.promptSection}>
            {/* Optional prompt */}
            <View style={[styles.promptInput, { borderColor: colors.border, backgroundColor: colors.input }]}>
              <Feather name="edit-2" size={15} color={colors.mutedForeground} />
              <TextInput
                value={prompt}
                onChangeText={setPrompt}
                placeholder="e.g. Dinner at a rooftop restaurant in Paris..."
                placeholderTextColor={colors.mutedForeground}
                style={[styles.textInput, { color: colors.foreground }]}
                multiline
              />
            </View>

            {/* Budget selection */}
            <Text style={[styles.filterLabel, { color: colors.mutedForeground }]}>BUDGET</Text>
            <View style={styles.budgetGrid}>
              {BUDGETS.map((b) => (
                <Pressable
                  key={b}
                  onPress={() => { Haptics.selectionAsync(); setSelectedBudget(b); }}
                  style={[
                    styles.budgetChip,
                    {
                      borderColor: selectedBudget === b ? colors.gold : colors.border,
                      backgroundColor: selectedBudget === b ? "rgba(198,167,94,0.1)" : "transparent",
                    },
                  ]}
                >
                  <Text style={[styles.budgetChipText, { color: selectedBudget === b ? colors.gold : colors.mutedForeground }]}>
                    {b}
                  </Text>
                </Pressable>
              ))}
            </View>

            <GoldButton label="GENERATE LOOK" onPress={generate} />
          </View>
        )}

        {/* ── Results ── */}
        {step === "results" && (
          <View style={styles.resultsSection}>
            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={colors.gold} size="large" />
                <Text style={[styles.loadingTitle, { color: colors.foreground }]}>
                  Curating your look...
                </Text>
                <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
                  Consulting 1,000+ premium brands
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.resultsGrid}>
                  {results.map((look) => (
                    <LookCard key={look.id} look={look} width={CARD_W} />
                  ))}
                </View>
                <View style={styles.resultActions}>
                  <GoldButton label="GENERATE MORE" onPress={generate} variant="outline" />
                  <GoldButton label="START OVER" onPress={reset} variant="ghost" />
                </View>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 24, gap: 28 },
  header: { gap: 10 },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  title: {
    fontSize: 36,
    fontFamily: "PlayfairDisplay_700Bold",
    lineHeight: 44,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  occasionSection: { gap: 28 },
  occasionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  occasionCard: {
    height: CARD_W * 1.22,
    borderRadius: 4,
    overflow: "hidden",
    position: "relative",
  },
  occasionImage: { width: "100%", height: "100%" },
  occasionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  occasionCheckmark: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  occasionBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderRadius: 4,
  },
  occasionLabel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  occasionLabelText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#F5F5F0",
    letterSpacing: 0.3,
  },
  promptSection: { gap: 20 },
  promptInput: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderWidth: 0.5,
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    minHeight: 80,
  },
  filterLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 2,
  },
  budgetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  budgetChip: {
    borderWidth: 0.5,
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  budgetChipText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.3,
  },
  resultsSection: { gap: 24 },
  loadingBox: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 16,
  },
  loadingTitle: {
    fontSize: 18,
    fontFamily: "PlayfairDisplay_700Bold",
    letterSpacing: 0.2,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.3,
  },
  resultsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  resultActions: { gap: 12 },
});
