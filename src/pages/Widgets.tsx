import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icon";
import {
  WidgetKind,
  WidgetPinConfirmation,
  WidgetPinStatus,
  addWidgetPinConfirmationListener,
  consumeWidgetPinConfirmation,
  getWidgetPinStatus,
  requestWidgetPin,
  widgetPinConfirmationMessage,
  widgetPinRequestMessage
} from "../lib/widgetPin";
import { IOSWidgetStatus, getIOSWidgetStatus } from "../lib/widgetStatus";

const WIDGETS: ReadonlyArray<{
  kind: WidgetKind;
  title: string;
  description: string;
  iosKind: string;
}> = [
  {
    kind: "verse",
    title: "Verse of the Day",
    description: "A daily passage from the bundled sacred text.",
    iosKind: "FidelisVotdWidget"
  },
  {
    kind: "mass",
    title: "Daily Mass",
    description: "The day's celebration and Mass-reading citations.",
    iosKind: "FidelisMassWidget"
  },
  {
    kind: "quote",
    title: "Quote of the Day",
    description: "A sourced passage from a Father, Doctor, or saint.",
    iosKind: "FidelisQuoteWidget"
  }
];

function androidReason(reason: WidgetPinStatus["reason"]): string {
  return reason === "android_version"
    ? "Your Android version does not support the in-app widget prompt."
    : "This launcher or device profile does not offer the in-app widget prompt.";
}

export default function Widgets() {
  const platform = Capacitor.getPlatform();
  const [androidStatus, setAndroidStatus] = useState<WidgetPinStatus | null>(null);
  const [iosStatus, setIOSStatus] = useState<IOSWidgetStatus | null>(null);
  const [checkingError, setCheckingError] = useState<string | null>(null);
  const [busy, setBusy] = useState<WidgetKind | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const seenConfirmationTokens = useRef(new Set<string>());

  const refreshAndroid = useCallback(async () => {
    const status = await getWidgetPinStatus();
    setAndroidStatus(status);
    setCheckingError(null);
    return status;
  }, []);

  const acceptConfirmation = useCallback(
    (confirmation: WidgetPinConfirmation) => {
      if (seenConfirmationTokens.current.has(confirmation.token)) return;
      seenConfirmationTokens.current.add(confirmation.token);
      // The receiver persists the positive callback so a killed web process
      // cannot lose it. Once a live page has accepted that one-shot token,
      // consume the persisted copy too; reopening this page must not announce
      // yesterday's successful installation as a new one.
      void consumeWidgetPinConfirmation().catch(() => {});
      setMessage(widgetPinConfirmationMessage(confirmation.kind));
      void refreshAndroid().catch(() => {});
    },
    [refreshAndroid]
  );

  useEffect(() => {
    let cancelled = false;
    if (platform === "android") {
      void refreshAndroid().catch(() => {
        if (!cancelled) setCheckingError("Fidelis could not check this launcher's widget support.");
      });
      let removeListener: (() => Promise<void>) | undefined;
      void addWidgetPinConfirmationListener(acceptConfirmation)
        .then((handle) => {
          if (cancelled) void handle.remove();
          else removeListener = () => handle.remove();
        })
        .catch(() => {});
      void consumeWidgetPinConfirmation().then((confirmation) => {
        if (!cancelled && confirmation) acceptConfirmation(confirmation);
      }).catch(() => {});
      return () => {
        cancelled = true;
        if (removeListener) void removeListener();
      };
    }
    if (platform === "ios") {
      void getIOSWidgetStatus()
        .then((status) => {
          if (!cancelled) {
            setIOSStatus(status);
            setCheckingError(null);
          }
        })
        .catch(() => {
          if (!cancelled) setCheckingError("Fidelis could not read WidgetKit's current configurations.");
        });
    }
    return () => {
      cancelled = true;
    };
  }, [acceptConfirmation, platform, refreshAndroid]);

  // Adding or removing a widget happens on the Home Screen. The web view can
  // stay mounted throughout that trip, so a mount-only status read would show
  // stale counts when the person returns. Refresh on the native foreground
  // signal and keep visibilitychange as a defensive WebView fallback.
  useEffect(() => {
    if (platform !== "android" && platform !== "ios") return;
    let cancelled = false;
    const refresh = () => {
      if (cancelled) return;
      if (platform === "android") {
        void refreshAndroid().catch(() => {
          if (!cancelled) setCheckingError("Fidelis could not refresh this launcher's widget status.");
        });
      } else {
        void getIOSWidgetStatus()
          .then((status) => {
            if (!cancelled) {
              setIOSStatus(status);
              setCheckingError(null);
            }
          })
          .catch(() => {
            if (!cancelled) setCheckingError("Fidelis could not refresh WidgetKit's configurations.");
          });
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);
    const handle = CapApp.addListener("appStateChange", ({ isActive }) => {
      if (isActive) refresh();
    });
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void handle.then((listener) => listener.remove());
    };
  }, [platform, refreshAndroid]);

  const requestAndroidWidget = async (kind: WidgetKind) => {
    setBusy(kind);
    setMessage(null);
    try {
      const result = await requestWidgetPin(kind);
      setMessage(widgetPinRequestMessage(result));
    } catch {
      setMessage("Android could not open the widget prompt. You can still add it from the Home Screen widget picker.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="page-narrow widgets-page" style={{ margin: "0 auto" }}>
      <h1 className="page-title">Home Screen Widgets</h1>
      <p>
        Keep the day&rsquo;s Scripture, Mass, or saintly wisdom close at hand. A widget
        opens the matching place in Fidelis when you tap it.
      </p>

      {checkingError && <p className="notice" role="status">{checkingError}</p>}
      {message && <p className="notice" role="status">{message}</p>}

      {platform === "ios" && (
        <>
          <p className="muted small sans">
            Apple does not permit apps to open the widget gallery or install a widget for you.
          </p>
          <ol className="widget-instructions muted small sans">
            <li>Touch and hold an empty area of the Home Screen until the apps jiggle.</li>
            <li>Tap <strong>Edit</strong>, then <strong>Add Widget</strong>.</li>
            <li>Search for Fidelis, choose a widget and size, then tap <strong>Add Widget</strong>.</li>
            <li>Place the widget where you want it, then tap <strong>Done</strong>.</li>
          </ol>
          {!iosStatus && !checkingError && <p className="loading" role="status">Checking WidgetKit…</p>}
          {iosStatus && !iosStatus.supported && (
            <p className="notice" role="status">
              Fidelis widgets require iOS 17 or later on this device.
            </p>
          )}
        </>
      )}

      {platform === "android" && androidStatus && !androidStatus.supported && (
        <p className="muted small sans">
          {androidReason(androidStatus.reason)} Touch and hold the Home Screen, choose
          Widgets, then find Fidelis.
        </p>
      )}

      {platform !== "android" && platform !== "ios" && (
        <p className="muted small sans">
          Native Home Screen widgets are available in the iOS and Android apps. On the
          web, you can use the <Link to="/about#embed">embeddable Verse of the Day</Link>.
        </p>
      )}

      <div className="widget-gallery">
        {WIDGETS.map((widget) => {
          const androidCount = androidStatus?.counts[widget.kind] ?? 0;
          const iosConfigurations =
            iosStatus?.configurations.filter((configuration) => configuration.kind === widget.iosKind) ?? [];
          const iosFamilies = [...new Set(iosConfigurations.map((configuration) => configuration.family))];
          const count = platform === "android" ? androidCount : iosConfigurations.length;
          return (
            <section className="widget-choice" key={widget.kind}>
              <div className="widget-choice-mark" aria-hidden="true">
                <Icon name={widget.kind === "verse" ? "cross" : widget.kind === "mass" ? "book" : "commentary"} />
              </div>
              <div className="widget-choice-copy">
                <h2>{widget.title}</h2>
                <p>{widget.description}</p>
                {(platform === "android" || platform === "ios") && (
                  <p className="muted small sans">
                    {count > 0
                      ? `${count} configured${platform === "ios" && iosFamilies.length > 0
                          ? ` · ${iosFamilies.join(", ")}`
                          : ""}`
                      : "Not currently reported as configured"}
                  </p>
                )}
              </div>
              {platform === "android" && androidStatus?.supported && (
                <button
                  type="button"
                  className="continue-cta widget-add"
                  disabled={busy !== null}
                  onClick={() => void requestAndroidWidget(widget.kind)}
                >
                  {busy === widget.kind ? "Opening…" : androidCount > 0 ? "Add another" : "Add"}
                </button>
              )}
            </section>
          );
        })}
      </div>

      {platform === "ios" && iosStatus && !iosStatus.sharedSettingsAvailable && (
        <p className="muted small sans">
          Calendar widgets cannot read Fidelis&rsquo;s selected jurisdiction. They show
          &ldquo;Open Fidelis to update&rdquo; instead of substituting a plausible default
          until the signed App Group is available.
        </p>
      )}
    </div>
  );
}
