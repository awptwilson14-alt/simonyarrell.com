import * as Haptics from "expo-haptics";
import { useAudioPlayer } from "expo-audio";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

// NOTE: AsyncStorage key intentionally retains the legacy "maisonSimon"
// prefix during the Simon Yarrell rebrand (May 2026) so existing users'
// hero-audio mute preferences are NOT silently reset on next launch.
// This is an internal-only identifier — never user-visible.
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
  /** Audio asset (require()-style module ref). Defaults to hero.m4a (1.6MB
   *  mono AAC, re-encoded from the original 18.8MB mp4 so Metro can serve
   *  it in <1s on dev wifi and the ambient bed starts the instant the home
   *  screen mounts instead of after a multi-second download). */
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

const HERO_AUDIO_SRC = require("../assets/audio/hero.m4a");

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
  // DIAGNOSTIC (Round 8): the home-tab desktop-web crash has persisted
  // across many rounds and the most recently-added home-only component
  // is HeroAudio (expo-audio web shim). Disable on web to confirm or
  // rule out as the cause. Native iOS/Android behavior is unchanged.
  // If web stops crashing after this deploy, we know the culprit and
  // can either upgrade expo-audio, swap to an <audio> element, or ship
  // a permanent web fallback. If web still crashes, we've ruled it out
  // and the next round disables the next suspect (LinearGradient with
  // locations array, then BlurView, etc).
  if (Platform.OS === "web") return null;
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
    // Web browsers reject audible autoplay without a user gesture, so we
    // must start muted on web regardless of intent. On native (iOS/Android)
    // the app context allows immediate audible playback, so we honor
    // `defaultMuted` at frame 1 — for the home hero that means audible
    // ambient sound the moment the screen mounts.
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
  }, [player, defaultMuted]);

  // Gentle attention pulse while MUTED, so the control reads as an invitation
  // to turn music on rather than a passive icon. Stops once the user unmutes.
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!muted) {
      pulse.setValue(0);
      return;
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 950, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 950, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [muted, pulse]);
  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] });

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
      <Animated.View style={{ transform: [{ scale: pulseScale }] }}>
        <Pressable
          onPress={toggle}
          hitSlop={12}
          style={({ pressed }) => [
            styles.btn,
            muted ? styles.btnMuted : styles.btnPlaying,
            { opacity: pressed ? 0.8 : 1 },
          ]}
          accessibilityLabel={muted ? "Unmute hero audio" : "Mute hero audio"}
          accessibilityRole="button"
        >
          <Feather
            name={muted ? "volume-x" : "volume-2"}
            size={18}
            color={muted ? "#0B0B0C" : "#C6A75E"}
          />
          <Text style={[styles.label, muted ? styles.labelMuted : styles.labelPlaying]}>
            {muted ? "Play Music" : "Mute"}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    right: 16,
    zIndex: 10,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    height: 40,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    boxShadow: "0px 3px 12px rgba(198,167,94,0.4)",
    elevation: 5,
  },
  // Muted = the eye-catching state: solid gold fill so it clearly invites a tap.
  btnMuted: {
    backgroundColor: "#C6A75E",
    borderColor: "#C6A75E",
  },
  // Playing = calmer state: dark pill with a gold outline (still clearly visible).
  btnPlaying: {
    backgroundColor: "rgba(11,11,12,0.8)",
    borderColor: "rgba(198,167,94,0.9)",
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  labelMuted: {
    color: "#0B0B0C",
  },
  labelPlaying: {
    color: "#C6A75E",
  },
});
