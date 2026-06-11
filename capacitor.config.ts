import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.fidelis.bible",
  appName: "Fidelis",
  webDir: "dist",
  ios: {
    contentInset: "automatic",
    backgroundColor: "#f6efe1"
  }
};

export default config;
