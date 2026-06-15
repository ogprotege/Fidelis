import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.fidelis.bible",
  appName: "Fidelis",
  webDir: "dist",
  ios: {
    contentInset: "automatic",
    backgroundColor: "#f4f2ee" // matches the day --bg-0 token (src/styles.css)
  }
};

export default config;
