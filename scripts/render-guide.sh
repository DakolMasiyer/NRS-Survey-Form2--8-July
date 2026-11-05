#!/usr/bin/env bash
# Prints docs/guide/guide.html to docs/guide/NRS-Service-Surveys-Guide.pdf with headless Chrome,
# then checks that no secret-looking text slipped in. Run `node scripts/make-guide.ts` first.
#
# Print the HTML file directly: the fonts are embedded in it. The check needs `uv` (for pypdf).
set -euo pipefail

CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
DIR="$(cd "$(dirname "$0")/.." && pwd)/docs/guide"
HTML="$DIR/guide.html"
PDF="$DIR/NRS-Service-Surveys-Guide.pdf"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

[ -f "$HTML" ] || { echo "Missing $HTML - run: node scripts/make-guide.ts" >&2; exit 1; }

"$CHROME" --headless=new --disable-gpu --user-data-dir="$TMP/profile" --no-pdf-header-footer \
  --print-to-pdf="$PDF" "file://$HTML" >/dev/null 2>&1
[ -s "$PDF" ] || { echo "Chrome did not write $PDF" >&2; exit 1; }

cat > "$TMP/check.py" <<'PY'
import sys
from pypdf import PdfReader
r = PdfReader(sys.argv[1])
text = "\n".join(p.extract_text() or "" for p in r.pages)
print("pages:", len(r.pages), "size (pt):", [float(x) for x in r.pages[0].mediabox[2:]])
import re
# Patterns, not values: a passcode-shaped word, API-token prefix, database/webhook/host fragments, personal email.
bad = [r"NRS\d{4}", r"cfat_", r"postgres", r"AKfycb", r"neon\.tech", r"@gmail", r"https://script\.google\.com"]
hits = [b for b in bad if re.search(b, text, re.IGNORECASE)]
if hits:
    print("FORBIDDEN TEXT FOUND:", hits)
    sys.exit(1)
print("forbidden patterns absent:", ", ".join(bad))
PY
uv run --quiet --with pypdf python -I "$TMP/check.py" "$PDF"
echo "wrote $PDF"
