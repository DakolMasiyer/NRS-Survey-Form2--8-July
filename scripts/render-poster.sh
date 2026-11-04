#!/usr/bin/env bash
# Renders docs/qr/poster/poster-{taxpayer,staff}.svg to a 200 x 300 mm PDF and a 2132 x 3200 PNG
# with headless Chrome. Run `node scripts/make-poster.ts` first.
#
# The PDF must be printed from the SVG *inlined in HTML*. Loading it through <img> blocks the
# embedded headline font and Chrome silently falls back to Tahoma Bold.
set -euo pipefail

CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
DIR="$(cd "$(dirname "$0")/.." && pwd)/docs/qr/poster"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

for kind in taxpayer staff; do
  svg="$DIR/poster-$kind.svg"
  [ -f "$svg" ] || { echo "Missing $svg - run: node scripts/make-poster.ts" >&2; exit 1; }

  python3 -I - "$svg" "$TMP/$kind.html" <<'PY'
import sys, pathlib
svg = pathlib.Path(sys.argv[1]).read_text().replace('width="1066" height="1600" viewBox', 'viewBox', 1)
pathlib.Path(sys.argv[2]).write_text(
    '<!doctype html><meta charset="utf-8"><style>@page{size:200mm 300mm;margin:0}'
    'html,body{margin:0;padding:0}svg{display:block;width:200mm;height:300mm}</style>' + svg)
PY

  "$CHROME" --headless=new --disable-gpu --user-data-dir="$TMP/profile" --no-pdf-header-footer \
    --print-to-pdf="$DIR/poster-$kind.pdf" "file://$TMP/$kind.html" >/dev/null 2>&1
  "$CHROME" --headless=new --disable-gpu --user-data-dir="$TMP/profile" --hide-scrollbars \
    --force-device-scale-factor=2 --window-size=1066,1600 \
    --screenshot="$DIR/poster-$kind.png" "file://$svg" >/dev/null 2>&1
  echo "rendered poster-$kind.pdf and poster-$kind.png"
done
