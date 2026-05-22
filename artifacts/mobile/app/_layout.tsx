import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts as useInterFonts,
} from "@expo-google-fonts/inter";
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_400Regular_Italic,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
} from "@expo-google-fonts/playfair-display";
import { Feather } from "@expo/vector-icons";
import { setAudioModeAsync } from "expo-audio";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Alert, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProvider } from "@/context/AppContext";
import { initPWA } from "@/lib/pwa";
import { initializeRevenueCat, SubscriptionProvider } from "@/lib/revenuecat";

// Inject the Web App Manifest, theme-color, apple PWA meta tags, and
// register the service worker. Web-only no-op on native; idempotent across
// hot reloads. See lib/pwa.ts for the full rationale.
initPWA();

SplashScreen.preventAutoHideAsync();

// Web-only: expo-font loads Google Fonts via `fontfaceobserver`, which
// rejects after 6s if the CDN is slow / behind a proxy / blocked by CORS.
// `useFonts` already returns the [loaded, error] tuple so we render the
// app with system-font fallbacks on timeout — but fontfaceobserver leaks
// the rejection out of its promise chain, and React Native Web's LogBox
// surfaces it as a red "Uncaught Error" overlay that blocks the UI.
// Swallow ONLY that specific rejection so genuine errors still surface.
if (Platform.OS === "web" && typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    const msg =
      (event.reason && (event.reason.message || String(event.reason))) || "";
    if (typeof msg === "string" && msg.includes("timeout exceeded")) {
      event.preventDefault();
    }
  });
}

const queryClient = new QueryClient();

try {
  initializeRevenueCat();
} catch (err: any) {
  Alert.alert("RevenueCat Unavailable", err?.message ?? "Unknown error");
}

// Configure the iOS audio session so the hero ambient track and the
// onboarding welcome cue both play with the device on silent (ringer
// switch off). Without this, expo-audio defaults to the "ambient"
// AVAudioSession category, which is silenced by the hardware mute switch
// — so a user with their phone on silent (the default for most iPhones)
// would mount the home screen, see <HeroAudio defaultMuted={false}/>
// fire player.play(), and hear nothing. Fire-and-forget; if the native
// module is unavailable in dev (Expo Go quirk) we don't want to crash
// the app — the speaker toggle still works as a manual fallback.
setAudioModeAsync({ playsInSilentMode: true }).catch(() => {
  // Non-fatal — audio simply remains in the default category.
});

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen name="look/[id]" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="tryon" options={{ headerShown: false, presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="membership" options={{ headerShown: false, presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="about" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="privacy" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="partners" options={{ headerShown: false, presentation: "card" }} />
    </Stack>
  );
}

export default function RootLayout() {
  // Preload Feather's font at the root so it registers exactly once.
  // Without this, the icon font auto-loads lazily the first time each
  // screen mounts a <Feather /> — if two screens mount in the same tick
  // (e.g. tab swap during route transition) iOS CoreText returns
  // CTFontManagerError 104 ("font already registered") and the
  // expo-font loadAsync promise rejects with an uncaught error overlay.
  const [interLoaded, interError] = useInterFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    PlayfairDisplay_400Regular,
    PlayfairDisplay_400Regular_Italic,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
    ...Feather.font,
  });

  const fontsLoaded = interLoaded;
  const fontError = interError;

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AppProvider>
          <QueryClientProvider client={queryClient}>
            <SubscriptionProvider>
              <GestureHandlerRootView>
                <KeyboardProvider>
                  <RootLayoutNav />
                </KeyboardProvider>
              </GestureHandlerRootView>
            </SubscriptionProvider>
          </QueryClientProvider>
        </AppProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
