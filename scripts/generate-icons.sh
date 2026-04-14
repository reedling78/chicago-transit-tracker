#!/usr/bin/env bash
#
# Generate app icons for web, iOS, and Android from the single source
# apps/web/public/logo.svg.
#
# Usage: bash scripts/generate-icons.sh
#
# Requires ImageMagick 7 (the `magick` command).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

SRC="apps/web/public/logo.svg"
BG="#111827"

if ! command -v magick >/dev/null 2>&1; then
  echo "error: ImageMagick 7 (magick) is required but not found in PATH" >&2
  exit 1
fi

if [ ! -f "$SRC" ]; then
  echo "error: source logo not found at $SRC" >&2
  exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

MASTER="$TMP/master-1024.png"
MASTER_LOGO_80="$TMP/logo-80-1024.png"
MASTER_LOGO_66="$TMP/logo-66-1024.png"

echo "→ rendering full-bleed 1024 master on $BG"
magick -background "$BG" -density 1200 "$SRC" \
  -resize 1024x1024 \
  -gravity center -extent 1024x1024 \
  "$MASTER"

echo "→ rendering 80% logo (iOS-safe padding) on $BG"
magick -background "$BG" -density 1200 "$SRC" \
  -resize 820x820 \
  -gravity center -background "$BG" -extent 1024x1024 \
  "$MASTER_LOGO_80"

echo "→ rendering 66% logo (Android adaptive-safe) on $BG"
magick -background "$BG" -density 1200 "$SRC" \
  -resize 676x676 \
  -gravity center -background "$BG" -extent 1024x1024 \
  "$MASTER_LOGO_66"

########################################
# Mobile (Expo)
########################################
echo "→ writing mobile assets"
mkdir -p apps/mobile/assets
cp "$MASTER_LOGO_80" apps/mobile/assets/icon.png
cp "$MASTER_LOGO_66" apps/mobile/assets/adaptive-icon.png
cp "$MASTER_LOGO_66" apps/mobile/assets/splash-icon.png
magick "$MASTER_LOGO_80" -resize 48x48 apps/mobile/assets/favicon.png

########################################
# Web (Next.js App Router file conventions)
########################################
echo "→ writing web icons"
# Next.js app-router file conventions
magick "$MASTER_LOGO_80" -resize 512x512 apps/web/app/icon.png
magick "$MASTER_LOGO_80" -resize 180x180 apps/web/app/apple-icon.png

# Multi-size favicon.ico for browser tabs
magick "$MASTER_LOGO_80" \
  \( -clone 0 -resize 16x16 \) \
  \( -clone 0 -resize 32x32 \) \
  \( -clone 0 -resize 48x48 \) \
  -delete 0 apps/web/app/favicon.ico

# PWA / manifest icons in /public
magick "$MASTER_LOGO_80" -resize 192x192 apps/web/public/icon-192.png
magick "$MASTER_LOGO_80" -resize 512x512 apps/web/public/icon-512.png

# Redundant apple-touch-icon in /public for older iOS Safari
magick "$MASTER_LOGO_80" -resize 180x180 apps/web/public/apple-touch-icon.png

echo "✓ done"
