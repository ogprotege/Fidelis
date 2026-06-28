#!/bin/sh

# Xcode Cloud post-clone hook (Apple runs ci_scripts/ci_post_clone.sh right after
# cloning, before resolving Swift packages).
#
# The iOS project links the Capacitor plugins as *local* Swift packages under
# node_modules/@capacitor/* (see ios/App/CapApp-SPM/Package.swift), and the web
# bundle (Capacitor webDir "dist" → ios/App/App/public) is generated, not committed.
# Xcode Cloud clones the repo but never runs npm, so without this hook SPM cannot
# resolve the packages — the exact failure:
#   "the package at '.../node_modules/@capacitor/app' doesn't exist in file system"
# — and even if it could, the app would ship with no web content.
#
# This recreates both, the same sequence the GitHub macOS workflow
# (.github/workflows/ios.yml) and a local build use: npm ci → npm run build →
# npx cap sync ios.

set -e

# Node/npm are not on the Xcode Cloud image by default; Homebrew is.
if ! command -v npm >/dev/null 2>&1; then
  echo "ci_post_clone: installing Node via Homebrew…"
  brew install node
fi

cd "$CI_PRIMARY_REPOSITORY_PATH"

echo "ci_post_clone: node $(node -v), npm $(npm -v)"

npm ci            # → node_modules (the SPM local packages Package.swift references)
npm run build     # → dist/ (the web bundle: tsc --noEmit + vite build)
npx cap sync ios  # → copies dist into ios/App/App/public + wires the plugins

echo "ci_post_clone: node_modules, dist, and iOS web assets are ready."
