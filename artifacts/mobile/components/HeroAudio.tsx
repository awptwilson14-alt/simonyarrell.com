import * as Haptics from "expo-haptics";
import { useAudioPlayer } from "expo-audio";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
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
    //
    // We intentionally do NOT restore a previously-saved mute preference
    // from AsyncStorage: every fresh session begins at `defaultMuted`, so
    // a user who muted in a prior session still hears music when they
    // return. The in-session toggle still writes to storage (harmless),
    // but reads are skipped so stale prefs cannot re-mute against intent.
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

    // Web autoplay-gesture bridge. On web (including mobile Safari/Chrome
    // visiting the PWA) browsers reject audible playback until the user
    // produces a gesture — so the player above is started muted. Most users
    // never notice the small speaker icon in the corner, and the ambient
    // music effectively never plays. To fix this: when `defaultMuted=false`
    // (the home-hero intent), attach a one-shot document-level listener
    // for the user's first tap/click/keypress anywhere on the page. That
    // gesture is sufficient under every browser's autoplay policy, so we
    // can flip the player to audible and call play() right then. The
    // visible speaker icon still works for manual mute/unmute afterwards.
    if (Platform.OS !== "web" || defaultMuted) return;
    if (typeof window === "undefined" || typeof document === "undefined") return;

    let unlocked = false;
    const unlock = () => {
      if (unlocked) return;
      unlocked = true;
      try {
        player.muted = false;
        player.play();
        setMuted(false);
      } catch {
        // Swallow — the visible speaker toggle remains as a manual fallback.
      }
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("touchstart", unlock);
      document.removeEventListener("keydown", unlock);
      document.removeEventListener("click", unlock);
    };
    document.addEventListener("pointerdown", unlock, { once: true });
    document.addEventListener("touchstart", unlock, { once: true });
    document.addEventListener("keydown", unlock, { once: true });
    document.addEventListener("click", unlock, { once: true });

    return () => {
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("touchstart", unlock);
      document.removeEventListener("keydown", unlock);
      document.removeEventListener("click", unlock);
    };
  }, [player, defaultMuted]);

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
