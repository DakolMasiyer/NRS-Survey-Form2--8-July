#!/usr/bin/env bash
# Prints a guide HTML to PDF with headless Chrome, then checks the PDF text.
#
#   bash scripts/render-guide.sh general   docs/guide/guide.html -> docs/guide/NRS-Service-Surveys-Guide.pdf
#   bash scripts/render-guide.sh admin     docs/guide/admin-build/guide-admin.html
#                                          -> docs/guide/admin-build/NRS-Service-Surveys-Admin-Guide.pdf
#
# Run `node scripts/make-guide.ts general|admin` first (the admin build needs GUIDE_PASSCODE).
# The admin check also needs GUIDE_PASSCODE, to confirm it is in the PDF; the value is never printed.
# The check needs `uv` (for pypdf). Fonts are embedded in the HTML, so the PDF keeps them.
set -euo pipefail

VARIANT="${1:-}"
case "$VARIANT" in
  general | admin) ;;
  *) echo "Usage: bash scripts/render-guide.sh general|admin" >&2; exit 1 ;;
esac

CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
GUIDE_DIR="$(cd "$(dirname "$0")/.." && pwd)/docs/guide"
if [ "$VARIANT" = admin ]; then
  [ -n "${GUIDE_PASSCODE:-}" ] || { echo "GUIDE_PASSCODE must be set to check the admin PDF." >&2; exit 1; }
  HTML="$GUIDE_DIR/admin-build/guide-admin.html"
  PDF="$GUIDE_DIR/admin-build/NRS-Service-Surveys-Admin-Guide.pdf"
else
  HTML="$GUIDE_DIR/guide.html"
  PDF="$GUIDE_DIR/NRS-Service-Surveys-Guide.pdf"
fi
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

[ -f "$HTML" ] || { echo "Missing $HTML - run: node scripts/make-guide.ts $VARIANT" >&2; exit 1; }

"$CHROME" --headless=new --disable-gpu --user-data-dir="$TMP/profile" --no-pdf-header-footer \
  --print-to-pdf="$PDF" "file://$HTML" >/dev/null 2>&1
[ -s "$PDF" ] || { echo "Chrome did not write $PDF" >&2; exit 1; }

cat > "$TMP/check.py" <<'PY'
import os, re, sys
from pypdf import PdfReader

variant, path = sys.argv[1], sys.argv[2]
r = PdfReader(path)
text = re.sub(r"\s+", " ", "\n".join(p.extract_text() or "" for p in r.pages))
print("pages:", len(r.pages), "| size (pt):", [round(float(x), 1) for x in r.pages[0].mediabox[2:]])

fonts, embedded = set(), set()
for page in r.pages:
    res = page.get("/Resources")
    f = res.get_object().get("/Font") if res else None
    if not f:
        continue
    for ref in f.get_object().values():
        fo = ref.get_object()
        name = str(fo.get("/BaseFont"))
        fonts.add(name)
        if fo.get("/Subtype") == "/Type3":  # glyphs drawn inline (the padlock emoji): self-contained
            embedded.add(name)
            continue
        desc = fo.get("/FontDescriptor")
        if desc is None and "/DescendantFonts" in fo:
            desc = fo["/DescendantFonts"][0].get_object().get("/FontDescriptor")
        if desc is not None and any(k in desc.get_object() for k in ("/FontFile", "/FontFile2", "/FontFile3")):
            embedded.add(name)
print("fonts:", len(fonts), "| embedded:", len(embedded))
if fonts != embedded:
    print("FONTS NOT EMBEDDED:", sorted(fonts - embedded))
    sys.exit(1)

low = text.lower()
failed = []
# Both variants: secrets and addresses that must never appear.
for pat in ["AKfycb", "cfat_", "postgres://", "neon.tech", "script.google.com", "@"]:
    if pat.lower() in low:
        failed.append("present: " + pat)

if variant == "general":
    stripped = low.replace("resend to sheet", "")
    if re.search(r"nrs\d{4}", low):
        failed.append("present: a passcode-like string")
    for pat in ["docs.google", "google", "sheet", "vercel", "neon", "cloudflare", "github", "postgres", "database", "webhook"]:
        if pat in stripped:
            failed.append("present: " + pat)
    if re.search(r"(?<![a-z])survey\.dako\.studio", stripped):
        failed.append("present: old address survey.dako.studio")
    code = os.environ.get("GUIDE_PASSCODE", "")
    if code and code.lower() in low:
        failed.append("present: the GUIDE_PASSCODE value")
else:
    code = os.environ["GUIDE_PASSCODE"]
    if code not in text:
        failed.append("the passcode is missing from the PDF")
    squeezed = text.replace(" ", "")  # long links wrap across lines
    for must in ["docs.google.com/spreadsheets/d/15SjHpib3MCcGQX6ZsyiIhz0GnkMvKgEGw23LolKwuoA/edit",
                 "docs.google.com/spreadsheets/d/16Lk2g1M6ntN2sAurQLVbBP55lzugCb6lENhHVJwY3Ak/edit",
                 "survey.dako.studio", "ADMINISTRATOR COPY. CONFIDENTIAL."]:
        if must.replace(" ", "") not in squeezed:
            failed.append("missing: " + must)
    n_conf = text.count("ADMINISTRATOR COPY. CONFIDENTIAL.")
    if n_conf < len(r.pages) + 1:  # banner on cover + footer on every page
        failed.append(f"confidential marking found {n_conf} times, expected {len(r.pages) + 1}")

if failed:
    print("CHECK FAILED:", failed)
    sys.exit(1)
print("checks passed (" + variant + ")")
PY
uv run --quiet --with pypdf python -I "$TMP/check.py" "$VARIANT" "$PDF"
echo "wrote $PDF"
