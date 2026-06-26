#!/usr/bin/env node
// Report the processing state of recently uploaded iOS builds, straight from the
// App Store Connect API --- so you don't have to refresh the browser waiting for
// a build to leave PROCESSING and become VALID (ready for TestFlight).
//
// Reads credentials from scripts/ios-release.local.env (gitignored) or the
// environment: ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_PATH, and optional BUNDLE_ID
// (defaults to app.fidelis.bible). No external dependencies.
//
// Usage:  node scripts/asc-build-status.mjs
import fs from "node:fs";
import crypto from "node:crypto";
import https from "node:https";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const cfg = { BUNDLE_ID: "app.fidelis.bible", ...process.env };
const envFile = path.join(root, "scripts", "ios-release.local.env");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split("\n")) {
    const m = /^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m) cfg[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const { ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_PATH, BUNDLE_ID } = cfg;
if (!ASC_KEY_ID || !ASC_ISSUER_ID || !ASC_KEY_PATH) {
  console.error("Missing ASC_KEY_ID / ASC_ISSUER_ID / ASC_KEY_PATH.");
  console.error("Set them in scripts/ios-release.local.env (see the .example).");
  process.exit(1);
}

const b64url = (b) =>
  Buffer.from(b).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

const now = Math.floor(Date.now() / 1000);
const header = { alg: "ES256", kid: ASC_KEY_ID, typ: "JWT" };
const payload = { iss: ASC_ISSUER_ID, iat: now, exp: now + 300, aud: "appstoreconnect-v1" };
const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
const sig = crypto.sign("SHA256", Buffer.from(signingInput), {
  key: fs.readFileSync(ASC_KEY_PATH, "utf8"),
  dsaEncoding: "ieee-p1363"
});
const jwt = `${signingInput}.${b64url(sig)}`;

const get = (p) =>
  new Promise((resolve, reject) => {
    https
      .request(
        { hostname: "api.appstoreconnect.apple.com", path: p, method: "GET", headers: { Authorization: `Bearer ${jwt}` } },
        (res) => {
          let d = "";
          res.on("data", (c) => (d += c));
          res.on("end", () => resolve({ status: res.statusCode, body: d }));
        }
      )
      .on("error", reject)
      .end();
  });

const apps = JSON.parse((await get(`/v1/apps?filter[bundleId]=${encodeURIComponent(BUNDLE_ID)}`)).body);
if (!apps.data?.length) {
  console.log(`No app with bundle id ${BUNDLE_ID} is visible to this key yet.`);
  process.exit(0);
}
const app = apps.data[0];
console.log(`App: ${app.attributes.name}  (App Store Connect id ${app.id})`);
const builds = JSON.parse((await get(`/v1/builds?filter[app]=${app.id}&limit=5&sort=-uploadedDate`)).body);
if (!builds.data?.length) {
  console.log("No builds ingested yet --- Apple is still receiving the upload (normal for the first 5-10 min).");
  process.exit(0);
}
for (const b of builds.data) {
  console.log(`  build ${b.attributes.version}  state: ${b.attributes.processingState}  uploaded: ${b.attributes.uploadedDate}`);
}
