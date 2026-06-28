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

set -e

# Node/npm are not on the Xcode Cloud image by default; Homebrew is.
if ! command -v npm >/dev/null 2>&1; then
  echo "ci_post_clone: installing Node via Homebrew…"
  brew install node
fi
# Ensure the Homebrew-installed node/npm are on PATH for the rest of this shell.
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

cd "$CI_PRIMARY_REPOSITORY_PATH"

echo "ci_post_clone: using node $(node -v), npm $(npm -v)"

npm ci          # → node_modules (the SPM local packages Package.swift references)
npm run build   # → dist/ (the web bundle: tsc --noEmit + vite build)

# `cap copy` (NOT `cap sync`): copy the web bundle into ios/App/App/public and write
# capacitor.config.json — WITHOUT running `cap update`, which rewrites the committed
# Package.swift platform (the .v15 → .v17 "cap sync version trap"). The committed
# Package.swift already lists the plugins; npm ci provided them under node_modules.
npx cap copy ios

echo "ci_post_clone: node_modules, dist, and iOS web assets are ready."
