import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.fidelis.bible",
  appName: "Fidelis",
  webDir: "dist",
  ios: {
    // "never": let the WebView paint edge-to-edge so the CSS env(safe-area-inset-*)
    // insets (header, tab bar, sheets, page gutters) are the SINGLE source of truth.
    // With viewport-fit=cover (index.html), "automatic" would inset the scroll view
    // natively AND the CSS would inset again — a doubled gap under the notch.
    contentInset: "never",
    backgroundColor: "#f4f2ee" // matches the day --bg-0 token (src/styles.css)
  },
  android: {
    backgroundColor: "#f4f2ee" // matches the day --bg-0 token (src/styles.css)
  }
};

export default config;
