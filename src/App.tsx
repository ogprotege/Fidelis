import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore
} from "react";
import { Link, Route, Routes, useLocation, useNavigate } from "react-router";
import Header from "./components/Header";
import ScrollManager from "./components/ScrollManager";
import Home from "./pages/Home";
import BookList from "./pages/BookList";
import Reader from "./pages/Reader";
import Readings from "./pages/Readings";
import Search from "./pages/Search";
import WidgetVotd from "./pages/WidgetVotd";

/* v1.18.1 (audit FID-PERF-002): the worship-critical path — Today, the Reader,
   Search, Mass, the book list (and the widget embed) — stays eager; the
   secondary surfaces load as route-level chunks the first time they are
   visited. Plain React.lazy, no chunking framework. The v1.18.0 Saint /
   Church History detail pages join the split — they are secondary surfaces
   reached from the Today card, and their routes already sit under <Suspense>. */
const Plans = lazy(() => import("./pages/Plans"));
const PlanCreator = lazy(() => import("./pages/PlanCreator"));
const Library = lazy(() => import("./pages/Library"));
const Translations = lazy(() => import("./pages/Translations"));
const Settings = lazy(() => import("./pages/Settings"));
const About = lazy(() => import("./pages/About"));
const Saint = lazy(() => import("./pages/Saint"));
const History = lazy(() => import("./pages/History"));
const Widgets = lazy(() => import("./pages/Widgets"));
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { App as CapApp } from "@capacitor/app";
import { closeTopOverlay, dismissAllOverlays } from "./lib/overlays";
import { healStrandedScrollLock } from "./lib/scrollLock";
import { useSettings, useUpdateSettings } from "./SettingsContext";
import { useToday } from "./useToday";
import { accentFor, liturgicalDay } from "./lib/liturgical";
import { resolveTheme } from "./lib/theme";
import { installDynamicTypeBridge } from "./lib/dynamicType";
import {
  dismissStorageWarning,
  isStorageWarned,
  subscribeStorageWarning
} from "./lib/storage";
import {
  type WidgetLinkDelivery,
  type WidgetLinkTarget,
  type WidgetReturnContract,
  acceptWidgetLinkDelivery,
  appHistoryIndex,
  canDiscardDuplicateWidgetEntry,
  claimStartupLaunchUrl,
  createWidgetStartupGate,
  canConsumeAppHistory,
  isSameWidgetTarget,
  widgetLinkDestination,
  widgetLinkHistoryMode,
  widgetLinkStartupActivations,
  widgetLinkTarget,
  widgetReturnContractFromHistoryState,
  widgetReturnNavigationState
} from "./lib/widgetLinks";
import { syncAndroidWidgetSettings } from "./lib/widgetPin";
import { syncIOSWidgetSettings } from "./lib/widgetStatus";
import {
  individualChurchCalendarLayer,
  individualChurchProperFingerprint
} from "./lib/calendarProfile";
import { buildLocalWidgetCalendarOverlay } from "./lib/widgetCalendarOverlay";

const NATIVE_EDGE_BACK_EVENT = "fidelis-native-edge-back";

function locationDestination(location: { pathname: string; search: string; hash: string }): string {
  return `${location.pathname}${location.search}${location.hash}`;
}

/** Scroll and focus a widget destination after its page exists. Focus is part
 * of the contract: a screen-reader user should land on the requested card,
 * not merely hear that the page changed somewhere beneath the cursor. */
function focusWidgetDestination(target: WidgetLinkTarget, delay = 0): void {
  window.setTimeout(() => {
    requestAnimationFrame(() => {
      const el = document.getElementById(target.focusId);
      if (!el) return;
      if (target.hash) el.scrollIntoView({ block: "start", behavior: "auto" });
      else window.scrollTo(0, 0);
      el.focus({ preventScroll: true });
    });
  }, delay);
}

/** The ONE quiet storage warning (v1.18.0, audit FID-STOR-001): the first
 *  localStorage write the browser refuses raises it — deduplicated for the
 *  session, never shown for successful writes — and Export is the recovery.
 *  Since v1.21.0 (FID-STOR-002) refused values are kept in the session shadow,
 *  so the copy promises exactly that: kept for this session, lost when the app
 *  closes, and Export captures them. role="status": spoken politely. */
function StorageWarning() {
  const warned = useSyncExternalStore(subscribeStorageWarning, isStorageWarned);
  if (!warned) return null;
  return (
    <div className="notice storage-banner" role="status">
      This device is not saving changes — its browser storage is full or restricted. New notes,
      highlights, and settings are kept for this session only and will be lost when the app
      closes. <Link to="/settings#data">Export your library</Link> to keep them safe.{" "}
      <button type="button" className="link-btn" onClick={dismissStorageWarning}>
        Dismiss
      </button>
    </div>
  );
}

/** A robust read of the OS dark-mode preference; false where matchMedia is
 *  unavailable so the default palette is always defined. */
function prefersDark(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
    : false;
}

export default function App() {
  const settings = useSettings();
  const update = useUpdateSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const locationRef = useRef(location);
  locationRef.current = location;
  const pendingWidgetFocus = useRef<WidgetLinkTarget | null>(null);
  const lastWidgetDeliveries = useRef(new Map<string, WidgetLinkDelivery>());
  const widgetNavigationQueue = useRef<Promise<void>>(Promise.resolve());
  const widgetNavigationTimers = useRef(new Set<ReturnType<typeof window.setTimeout>>());
  const widgetCoordinatorActive = useRef(true);
  const nativeWidgetReturn = useRef<WidgetReturnContract | null>(null);
  const widgetMode = location.pathname.startsWith("/widget/");
  // Live "today" (midnight + foreground-resume aware) so the liturgical accent
  // below never wears yesterday's color in the resident native shell.
  const today = useToday();

  useEffect(() => {
    const timers = widgetNavigationTimers.current;
    widgetCoordinatorActive.current = true;
    return () => {
      widgetCoordinatorActive.current = false;
      for (const timer of timers) window.clearTimeout(timer);
      timers.clear();
    };
  }, []);

  // Track the OS color scheme so theme "System" (spec §2.2) stays live: a user
  // who flips their device to dark while Fidelis is open sees it follow.
  const [systemDark, setSystemDark] = useState(prefersDark);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemDark(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const resolvedTheme = resolveTheme(settings.theme, systemDark);
  // The embeddable widget is self-contained: its palette comes from its own
  // ?theme param (default day), never the visitor's saved theme or OS. App is
  // the single writer of <html data-theme>, so nothing can clobber it.
  const effectiveTheme = widgetMode
    ? new URLSearchParams(location.search).get("theme") === "night"
      ? "night"
      : "day"
    : resolvedTheme;

  // The resolved palette lands in <html data-theme>; styles.css maps it. Also
  // keep the browser-chrome color in step, reading the token so the hex lives
  // only in styles.css.
  useEffect(() => {
    const root = document.documentElement;
    let firstFrame = 0;
    let secondFrame = 0;
    // Theme tokens feed many otherwise-useful component transitions. Suppress
    // those transitions only for the root palette swap so changing Day/Night
    // does not animate dozens of unrelated borders and backgrounds.
    if (root.dataset.theme !== effectiveTheme) {
      root.dataset.themeSwitching = "";
      root.dataset.theme = effectiveTheme;
      firstFrame = requestAnimationFrame(() => {
        secondFrame = requestAnimationFrame(() => {
          delete root.dataset.themeSwitching;
        });
      });
    }
    root.toggleAttribute("data-widget", widgetMode);
    document.body.classList.toggle("widget-mode", widgetMode);
    const bg = getComputedStyle(root).getPropertyValue("--bg-0").trim();
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta && bg) meta.setAttribute("content", bg);
    return () => {
      if (firstFrame) cancelAnimationFrame(firstFrame);
      if (secondFrame) cancelAnimationFrame(secondFrame);
      delete root.dataset.themeSwitching;
    };
  }, [effectiveTheme, widgetMode]);

  // Native status bar (iOS especially): iOS ignores the theme-color meta, so the
  // clock/battery would stay dark on the near-black Night field. Flip the glyphs
  // to match the resolved theme — Style.Dark = light glyphs for a dark bg,
  // Style.Light = dark glyphs for the Day field. No-op (skipped) on the web.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    StatusBar.setStyle({ style: effectiveTheme === "night" ? Style.Dark : Style.Light }).catch(() => {
      // best-effort: older OS, or the plugin not present in this shell
    });
  }, [effectiveTheme]);

  // Keep native widget processes aligned with the app's canonical settings.
  // Both bridges fail quietly when an optional platform capability is absent;
  // the Widgets page reports what each OS can actually confirm.
  // `getSettings()` re-parses localStorage and rebuilds `individualChurchProper`
  // on every read, and `saveSettings()` spreads that fresh read — so ANY settings
  // write (theme, font, translation…) hands back a new object with identical
  // content. Depending on that identity re-ran the widget sync below for changes
  // that could not affect it: dropping and re-adding its native appStateChange
  // listener, restarting the debounce, and rebuilding the whole multi-year local
  // calendar overlay. Key on the content fingerprint — the same canonical hash
  // the layer already publishes — so the effect re-runs only when the proper
  // itself actually changes.
  const individualChurchProperKey = individualChurchProperFingerprint(
    settings.individualChurchProper
  );
  const individualChurchProper = useMemo(
    () => settings.individualChurchProper,
    // Content-keyed by the canonical fingerprint: an unchanged key proves the
    // proper is deeply equal, so the identity churn is the thing to ignore.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [individualChurchProperKey]
  );

  useEffect(() => {
    const platform = Capacitor.getPlatform();
    if (platform !== "android" && platform !== "ios") return;
    let cancelled = false;
    let timer = 0;
    let syncGeneration = 0;
    const layer = individualChurchCalendarLayer(individualChurchProper);
    const hasIndividualChurchProper = layer.celebrations.length > 0;
    const sync = async () => {
      const generation = ++syncGeneration;
      let localCalendarOverlay: Awaited<ReturnType<typeof buildLocalWidgetCalendarOverlay>> | null = null;
      if (hasIndividualChurchProper) {
        try {
          localCalendarOverlay = await buildLocalWidgetCalendarOverlay({
            profileId: settings.calendarProfile,
            lectionaryPackId: settings.lectionaryPackId,
            individualChurchProper
          });
        } catch {
          // Native receives the current fingerprint without an overlay and fails
          // closed instead of continuing to show a plausible base-calendar day.
          // A corrected manual clock is retried by the activation listeners below.
        }
      }
      if (cancelled || generation !== syncGeneration) return;
      if (platform === "android") {
        await syncAndroidWidgetSettings({
          calendarProfile: settings.calendarProfile,
          appearance: settings.theme,
          lectionaryPackId: settings.lectionaryPackId,
          hasIndividualChurchProper,
          localProperFingerprint: layer.fingerprint,
          localCalendarOverlay
        });
      } else {
        await syncIOSWidgetSettings({
          calendarProfile: settings.calendarProfile,
          theme: settings.theme,
          translation: settings.translation,
          lectionaryPackId: settings.lectionaryPackId,
          hasIndividualChurchProper,
          localProperFingerprint: layer.fingerprint,
          localCalendarOverlay
        });
      }
    };
    const scheduleSync = (delay = 0) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void sync().catch(() => {}), delay);
    };
    // Settings fields update on each keystroke. Generate one atomic overlay
    // after the edit settles instead of exposing intermediate local calendars.
    scheduleSync(300);
    // A user can correct a manual clock without changing any Fidelis setting.
    // Retry when the shell becomes active so an invalid future-clock attempt is
    // replaced immediately instead of remaining failed closed until restart.
    const onVisible = () => {
      if (document.visibilityState === "visible") scheduleSync();
    };
    document.addEventListener("visibilitychange", onVisible);
    const activeHandle = CapApp.addListener("appStateChange", ({ isActive }) => {
      if (isActive) scheduleSync();
    });
    return () => {
      cancelled = true;
      syncGeneration += 1;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      void activeHandle.then((handle) => handle.remove());
    };
  }, [
    settings.calendarProfile,
    individualChurchProper,
    settings.lectionaryPackId,
    settings.theme,
    settings.translation
  ]);

  const consumeNativeWidgetReturn = useCallback((): boolean => {
    const expected =
      widgetReturnContractFromHistoryState(window.history.state) ?? nativeWidgetReturn.current;
    if (
      !expected ||
      locationDestination(locationRef.current) !== expected.widgetDestination
    ) {
      return false;
    }
    nativeWidgetReturn.current = null;

    // Prefer the real History API entry. WKWebView can retain a same-hash
    // duplicate around a native activation, so verify the route after each pop.
    // The return contract's router cursor proves whether another traversal is
    // safe. This collapses the duplicate instead of replacing it with a second,
    // visually identical caller entry that would consume a dead Back gesture.
    if (canConsumeAppHistory(window.history.state)) {
      window.history.back();
      const verifyReturn = (discardAttempts: number) => {
        const timer = window.setTimeout(() => {
          widgetNavigationTimers.current.delete(timer);
          const currentDestination = locationDestination(locationRef.current);
          if (currentDestination !== expected.widgetDestination) return;
          if (
            discardAttempts < 2 &&
            canDiscardDuplicateWidgetEntry(window.history.state, expected, currentDestination)
          ) {
            window.history.back();
            verifyReturn(discardAttempts + 1);
            return;
          }
          void navigate(expected.callerDestination, { replace: true, state: null });
        }, 180);
        widgetNavigationTimers.current.add(timer);
      };
      verifyReturn(0);
    } else {
      void navigate(expected.callerDestination, { replace: true, state: null });
    }
    return true;
  }, [navigate]);

  // Native hardware Back (Android): close the topmost open overlay first, else go
  // back in history, else (at the app root) exit — never strand or surprise the user.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const handle = CapApp.addListener("backButton", ({ canGoBack }) => {
      if (closeTopOverlay()) return;
      if (consumeNativeWidgetReturn()) return;
      if (canGoBack) window.history.back();
      else void CapApp.exitApp();
    });
    return () => {
      void handle.then((h) => h.remove());
    };
  }, [consumeNativeWidgetReturn]);

  // iOS has no hardware Back button. MainViewController translates a committed
  // left-edge pan into this event because WKWebView's built-in gesture does not
  // consume HashRouter's same-document entries. Sheets still close first, and
  // an idx of zero is a hard stop so the gesture can never leave Fidelis.
  useEffect(() => {
    if (Capacitor.getPlatform() !== "ios") return;
    const handleEdgeBack = () => {
      if (closeTopOverlay()) return;
      if (consumeNativeWidgetReturn()) return;
      if (canConsumeAppHistory(window.history.state)) window.history.back();
    };
    window.addEventListener(NATIVE_EDGE_BACK_EVENT, handleEdgeBack);
    return () => window.removeEventListener(NATIVE_EDGE_BACK_EVENT, handleEdgeBack);
  }, [consumeNativeWidgetReturn]);

  const openWidgetLink = useCallback(
    (url: string | null | undefined, source: "cold" | "warm") => {
      const target = url ? widgetLinkTarget(url) : null;
      if (!target) return;
      const destination = widgetLinkDestination(target);
      const receivedAt = performance.now();
      if (!acceptWidgetLinkDelivery(lastWidgetDeliveries.current, target, receivedAt)) return;

      // Serialize accepted activations. Capacitor can synchronously deliver a
      // cold launch and a distinct buffered warm tap; cancelling a shared timer
      // would lose the first destination, while running both in the same task
      // can compute the second history action against stale React location.
      widgetNavigationQueue.current = widgetNavigationQueue.current
        .then(async () => {
          if (!widgetCoordinatorActive.current) return;

          // A widget tap is a new top-level intent. Dismiss every sheet/popover,
          // then yield through React cleanup before healing the scroll lock and
          // routing. An animated sheet gets its short paired exit interval.
          const dismissed = dismissAllOverlays();
          await new Promise<void>((resolve) => {
            const timer = window.setTimeout(() => {
              widgetNavigationTimers.current.delete(timer);
              resolve();
            }, dismissed ? 160 : 0);
            widgetNavigationTimers.current.add(timer);
          });
          if (!widgetCoordinatorActive.current) return;

          healStrandedScrollLock({ restoreScroll: false });
          const sameTarget = isSameWidgetTarget(locationRef.current, target);
          const mode = widgetLinkHistoryMode(source, sameTarget);
          if (mode === "focus") {
            focusWidgetDestination(target);
            return;
          }
          if (mode === "push") {
            const returnContract: WidgetReturnContract = {
              version: 1,
              widgetDestination: destination,
              callerDestination: locationDestination(locationRef.current),
              callerHistoryIndex: appHistoryIndex(window.history.state)
            };
            nativeWidgetReturn.current = returnContract;
            pendingWidgetFocus.current = target;
            void navigate(destination, {
              state: widgetReturnNavigationState(returnContract)
            });
          } else {
            nativeWidgetReturn.current = null;
            pendingWidgetFocus.current = target;
            void navigate(destination, { replace: true, state: null });
          }

          // Do not evaluate a following activation until the routed location
          // has committed. Two frames also give the destination focus effect a
          // chance to run before another accepted intent replaces its target.
          await new Promise<void>((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
          });
        })
        .catch(() => {
          // Keep the coordinator usable if a platform/router callback throws.
          // The native shell can deliver another activation without a restart.
        });
    },
    [navigate]
  );

  // The native listeners below must mount ONCE, so they read the current
  // handler through a ref instead of depending on it. `openWidgetLink` depends
  // on react-router's `navigate`, whose identity is a pure function of
  // `location.pathname` (useNavigateUnstable) — so an effect that depended on
  // it would tear down and re-run on EVERY route change. That is not merely
  // wasteful: the effect body reads the OS launch URL, which is a latch neither
  // platform ever clears, so each re-run re-consumed the widget URL as a fresh
  // COLD activation and `replace`-navigated the person straight back to the
  // widget's destination. Every tab tap flashed the requested page and snapped
  // back, with `replace` erasing it from history so Back could not escape
  // either — the reported "the app opens from the widget but then nothing
  // works". Launching from the app icon left the latch empty, which is why only
  // widget entry froze. Regression-guarded in scripts/test-data.ts §36.
  const openWidgetLinkRef = useRef(openWidgetLink);
  openWidgetLinkRef.current = openWidgetLink;
  const widgetStartupGate = useRef(createWidgetStartupGate());

  // Widget deep links (FID-NATIVE-002): cold launch replaces the incidental
  // shell entry; a warm tap pushes one destination so Back returns to the page
  // in use; a repeat tap on that destination only scrolls/focuses it.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const gate = widgetStartupGate.current;
    let cancelled = false;
    let launchLookupSettled = false;
    const bufferedWarmUrls: string[] = [];
    const handle = CapApp.addListener("appUrlOpen", (event) => {
      if (cancelled) return;
      if (!launchLookupSettled) {
        bufferedWarmUrls.push(event.url);
        return;
      }
      openWidgetLinkRef.current(event.url, "warm");
    });
    const flushStartup = (launchUrl: string | null | undefined) => {
      if (cancelled) return;
      launchLookupSettled = true;
      // One-shot: a re-read of the never-cleared launch latch yields null, so a
      // stale widget URL can never be replayed as a second cold activation.
      const startupUrl = claimStartupLaunchUrl(gate, launchUrl);
      for (const activation of widgetLinkStartupActivations(startupUrl, bufferedWarmUrls.splice(0))) {
        openWidgetLinkRef.current(activation.url, activation.source);
      }
    };
    void CapApp.getLaunchUrl()
      .then((result) => flushStartup(result?.url))
      .catch(() => flushStartup(null));
    return () => {
      cancelled = true;
      void handle.then((h) => h.remove());
    };
  }, []);

  // The destination DOM lands in the same commit as the new location. Focus it
  // after that commit; ScrollManager remains the sole owner of route scrolling.
  useEffect(() => {
    const target = pendingWidgetFocus.current;
    if (!target || !isSameWidgetTarget(location, target)) return;
    pendingWidgetFocus.current = null;
    focusWidgetDestination(target);
  }, [location]);

  // Self-heal a stranded body scroll-lock (lib/scrollLock healStrandedScrollLock):
  // if the body is still pinned (position: fixed) but NO sheet is actually
  // mounted, an interrupted teardown left the lock behind — the classic "the
  // whole app won't navigate until I restart it" symptom, since the pinned body
  // clips every new page out of view. The heal is layered so no strand can
  // persist: it fires on route change, on the next touch anywhere (even a
  // same-tab tap that changes no route), and on foreground resume; and it
  // predicates on the body's actual state, so a pin the counter lost track of
  // heals too. The .sheet-backdrop guard means a legitimately-open sheet is
  // never unlocked.
  useEffect(() => {
    // On a route change, ScrollManager has already positioned the new page —
    // unpin WITHOUT restoring the departed page's stale scroll offset.
    healStrandedScrollLock({ restoreScroll: false });
  }, [location.key]);

  useEffect(() => {
    const heal = () => {
      healStrandedScrollLock();
    };
    document.addEventListener("visibilitychange", heal);
    // The very next touch unpins, even when no route change is coming.
    window.addEventListener("pointerdown", heal, true);
    if (!Capacitor.isNativePlatform()) {
      return () => {
        document.removeEventListener("visibilitychange", heal);
        window.removeEventListener("pointerdown", heal, true);
      };
    }
    // Native resume: visibilitychange is not guaranteed on every WKWebView
    // resume path, so the plugin's appStateChange is the reliable signal.
    const handle = CapApp.addListener("appStateChange", ({ isActive }) => {
      if (isActive) heal();
    });
    return () => {
      document.removeEventListener("visibilitychange", heal);
      window.removeEventListener("pointerdown", heal, true);
      void handle.then((h) => h.remove());
    };
  }, []);

  // Move focus to the main content region on every route change (WCAG 2.4.3), so
  // keyboard and screen-reader users land in the new page — except on a ?v= deep
  // link, where the Reader owns focus (the targeted verse).
  useEffect(() => {
    if (widgetMode) return;
    if (new URLSearchParams(location.search).has("v")) return; // the Reader owns ?v=
    // Preserve focus that the new page already placed (for example Search's
    // autofocused box). Controls in the persistent masthead/tab bar belong to
    // the departed page context, so a direct tab activation moves to main.
    const main = document.getElementById("main");
    if (!main) return;
    const active = document.activeElement;
    if (active instanceof HTMLElement && main.contains(active)) return;
    main.focus({ preventScroll: true });
    // Fire on a genuine route change (location.key); search/widgetMode are read
    // from the current render's closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  // Scripture face (spec §1.4): drive the global --scripture token from the
  // saved choice by naming it in <html data-font>. Reactive now, so a change on
  // the Settings screen reskins the preview and the Reader instantly.
  useEffect(() => {
    document.documentElement.dataset.font = widgetMode ? "garamond" : settings.scriptureFont;
  }, [settings.scriptureFont, widgetMode]);

  // Dynamic Type (spec §9): let the native iOS shell drive the reading size from
  // the device text-size setting while "follow system size" is on. The bridge is
  // a no-op in the embeddable widget and anywhere nothing calls the hook (web).
  useEffect(() => {
    if (widgetMode) return;
    return installDynamicTypeBridge(settings.followSystemTextSize, (px) => update({ fontSize: px }));
  }, [settings.followSystemTextSize, update, widgetMode]);

  // Follow the liturgical year (spec §1.3): name the day's color in
  // <html data-accent>, which CSS uses to remap --purple. Off (or in the
  // embeddable widget) clears it, so the brand purple shows.
  useEffect(() => {
    const root = document.documentElement;
    const accent = widgetMode
      ? null
      : accentFor(settings.followLiturgicalYear, liturgicalDay(today).color);
    if (accent) root.dataset.accent = accent;
    else delete root.dataset.accent;
    // calendarProfile is a dep because today's governing color can differ by
    // a verified particular calendar, so the tint must re-derive live.
    // `today` is a dep so the color rolls at midnight / foreground resume.
  }, [settings.followLiturgicalYear, settings.calendarProfile, widgetMode, today]);

  if (widgetMode) {
    return (
      <>
        <ScrollManager />
        <Routes>
          <Route path="/widget/votd" element={<WidgetVotd />} />
        </Routes>
      </>
    );
  }

  return (
    <>
      <ScrollManager />
      <div className="app">
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main")?.focus();
        }}
      >
        Skip to content
      </a>
      {/* v1.16.0: fixed status-bar backdrop (spec §3) — keeps the notch area
          painted after the brand row scrolls away and during rubber-band
          overscroll. Zero-height off-notch and on desktop. Decorative. */}
      <div className="status-strip" aria-hidden="true" />
      <Header />
      <main className="page" id="main" tabIndex={-1}>
        <StorageWarning />
        {/* The fallback is the app's quiet loading line — chunk loads are
            LAN-fast (same origin, tiny files) and never flash a spinner. The
            route-fallback class reserves a screenful of geometry so the footer
            doesn't leap up and back on a cold visit (FID-PERF-001). */}
        <Suspense fallback={<p className="loading route-fallback" role="status">Loading…</p>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/read" element={<BookList />} />
          <Route path="/read/:translation/:book/:chapter" element={<Reader />} />
          <Route path="/plans" element={<Plans />} />
          <Route path="/plans/new" element={<PlanCreator />} />
          <Route path="/readings" element={<Readings />} />
          <Route path="/search" element={<Search />} />
          <Route path="/library" element={<Library />} />
          <Route path="/widgets" element={<Widgets />} />
          <Route path="/translations" element={<Translations />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/about" element={<About />} />
          <Route path="/saint/:day" element={<Saint />} />
          <Route path="/saint/:day/:id" element={<Saint />} />
          <Route path="/history/:day" element={<History />} />
          <Route path="*" element={<Home />} />
        </Routes>
        </Suspense>
      </main>
      <footer className="footer">
        <div className="motto" lang="la">Verbum Domini manet in æternum.</div>
        <div>The Word of the Lord endures for ever. — 1 Peter 1:25</div>
      </footer>
      </div>
    </>
  );
}
