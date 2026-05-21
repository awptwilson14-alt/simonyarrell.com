import * as Haptics from "expo-haptics";
import { useAudioPlayer } from "expo-audio";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";

const DEFAULT_MUTE_PREF_KEY = "maisonSimon:heroAudioMuted";

/**
 * Ambient audio with a floating speaker toggle. Loops a bed track behind a
 * given screen. ALWAYS starts muted on the very first frame — browser/native
 * autoplay policies reject auto-playing sound without a user gesture, and
 * unsolicited audio is intrusive on a luxury surface. After mount the
 * component consults AsyncStorage for the user's prior preference; on first
 * launch (no saved pref) the `defaultMuted` prop decides the resting state.
 *
 * Used on two screens with different defaults:
 *   - Home hero (`(tabs)/index.tsx`): subtle ambient bed, defaultMuted=true
 *     so cold-start is quiet for new users; returning users who unmuted keep
 *     ambient sound on.
 *   - Onboarding splash (`onboarding.tsx`): a featured music cue (Kenny G,
 *     "My Favorite Things") that the user explicitly asked to play on the
 *     welcome screen, defaultMuted=false so first-time users hear it. The
 *     splash unmounts when the user taps GET STARTED, which destroys the
 *     player and stops playback — so music never bleeds into onboarding
 *     form steps or the main app.
 *
 * Position is absolute (top-right by default). Parent supplies the `top`
 * offset so it can clear the safe-area / floating header.
 */
interface HeroAudioProps {
  top: number;
  /** Audio asset (require()-style module ref). Defaults to hero.mp4. */
  source?: number;
  /**
   * AsyncStorage key for persisted mute pref. Each mount site uses its own
   * key so the home ambient bed and the welcome cue track preferences
   * independently.
   */
  mutePrefKey?: string;
  /**
   * Resting mute state on first launch (no saved pref). True = quiet by
   * default (home hero). False = audible by default (welcome screen).
   * Subject to autoplay-policy rejection on web — the speaker icon still
   * reflects intent so users see the right affordance.
   */
  defaultMuted?: boolean;
}

const HERO_AUDIO_SRC = require("../assets/audio/hero.mp4");

/**
 * Crash-safe wrapper. `useAudioPlayer` calls into a native module whose JS
 * binding has, in practice, gotten out of sync with the installed iOS native
 * binary at least once ("Received 4 arguments, but 3 was expected"), which
 * surfaces as a full-screen Render Error and blocks the user from the app.
 * The audio feature is ambient and non-essential; if it ever fails to
 * construct, we'd rather render nothing than take down the parent screen.
 */
class HeroAudioBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    // Surface in dev console but never escalate to the UI tree.
    if (__DEV__) console.warn("[HeroAudio] suppressed render error:", error);
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

export function HeroAudio(props: HeroAudioProps) {
  return (
    <HeroAudioBoundary>
      <HeroAudioInner {...props} />
    </HeroAudioBoundary>
  );
}

function HeroAudioInner({
  top,
  source = HERO_AUDIO_SRC,
  mutePrefKey = DEFAULT_MUTE_PREF_KEY,
  defaultMuted = true,
}: HeroAudioProps) {
  const player = useAudioPlayer(source);
  // Initial UI state reflects the desired resting state (so the speaker
  // icon shows the right glyph during the brief AsyncStorage read), but
  // the underlying player is still hard-muted at frame 1 below to keep
  // autoplay policies happy.
  const [muted, setMuted] = useState(defaultMuted);

  // Configure loop + warm playback on mount, then restore the user's last
  // mute preference from AsyncStorage. We always START muted to satisfy web
  // autoplay policy (which rejects unsolicited sound), then — if the user
  // previously chose to unmute — flip muted=false. On native, this results
  // in seamless ambient sound on cold-start for returning users. On web, the
  // browser will keep playback paused until the next user gesture even if
  // muted=false; the speaker icon still reflects the saved preference so
  // returning users see the correct state.
  useEffect(() => {
    let cancelled = false;
    // Web browsers reject audible autoplay without a user gesture, so we
    // must start muted on web regardless of intent. On native (iOS/Android)
    // the app context allows immediate audible playback, so we honor
    // `defaultMuted` at frame 1 — that's what eliminates the perceived
    // "delay" returning users used to hear (audio used to start muted,
    // then unmute only after the async AsyncStorage read resolved).
    const startMuted = Platform.OS === "web" ? true : defaultMuted;
    try {
      player.loop = true;
      player.volume = 0.6;
      player.muted = startMuted;
      player.play();
    } catch {
      // Defensive — autoplay rejection or platform quirk shouldn't crash
      // the home screen. The toggle still works on subsequent user taps.
    }
    AsyncStorage.getItem(mutePrefKey)
      .then((raw) => {
        if (cancelled) return;
        // raw === null  → first launch, fall back to defaultMuted prop
        // raw === "true"  → user previously muted
        // raw === "false" → user previously unmuted
        const shouldBeMuted = raw === null ? defaultMuted : raw === "true";
        // Always sync BOTH UI and player to the resolved preference —
        // covers every case (first-launch agreeing with frame-1 intent,
        // returning user who changed their mind, web overriding native
        // intent back to muted-by-policy, etc).
        setMuted(shouldBeMuted);
        try {
          player.muted = shouldBeMuted;
          if (!shouldBeMuted) player.play();
        } catch {
          /* swallow — see above */
        }
      })
      .catch(() => {
        // Storage read failure is non-fatal; the initial muted state stands.
      });
    return () => {
      cancelled = true;
    };
  }, [player, mutePrefKey, defaultMuted]);

  const toggle = () => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    const next = !muted;
    setMuted(next);
    try {
      player.muted = next;
      // Re-issue play() on every unmute — a user gesture is what web
      // autoplay policies require, and replay is idempotent if already
      // playing on native.
      if (!next) player.play();
    } catch {
      // Same defensive swallow — UI state still flips so the user sees feedback.
    }
    // Persist preference (fire-and-forget). String form so a future v2 of
    // the key can encode richer state (volume, last track) without breaking.
    AsyncStorage.setItem(mutePrefKey, next ? "true" : "false").catch(() => {
      // Storage write failure is non-fatal — UI/audio already updated.
    });
  };

  return (
    <View style={[styles.wrap, { top }]} pointerEvents="box-none">
      <Pressable
        onPress={toggle}
        hitSlop={10}
        style={({ pressed }) => [
          styles.btn,
          { opacity: pressed ? 0.7 : 0.9 },
        ]}
        accessibilityLabel={muted ? "Unmute hero audio" : "Mute hero audio"}
        accessibilityRole="button"
      >
        <Feather
          name={muted ? "volume-x" : "volume-2"}
          size={14}
          color="#F5F5F0"
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    right: 20,
    zIndex: 10,
  },
  btn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(11,11,12,0.55)",
    borderWidth: 0.5,
    borderColor: "rgba(198,167,94,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
});
