/*
 * Builds the printed 2:3 QR posters (taxpayer + staff) as SVG into docs/qr/poster/.
 *
 *   node scripts/make-poster.ts [https://host] [outDir]
 *
 * Layout is matched to the approved reference poster (1066 x 1600 px, see docs/qr/README.md).
 * Every number in LAYOUT was measured from that reference. The body and footer type is Tahoma
 * (a system font, matched to within 0.2% of the reference); the headline is the closest free
 * font (Saira Extra Condensed Black), squeezed to the reference width, because the original
 * headline face is not installed. Render to PNG/PDF with headless Chrome (see docs/qr/README.md).
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import QRCode from "qrcode"

const host = (process.argv[2] ?? "https://nrssurvey.dako.studio").replace(/\/$/, "")
const outDir = process.argv[3] ?? "docs/qr/poster"
if (!host.startsWith("https://")) throw new Error(`Host must start with https:// (got "${host}")`)

const W = 1066
const H = 1600
const RED = "#D12A13"
const GREY = "#7D848A"
const FRAME = "#211D1E"
const BLACK = "#000000"

const LAYOUT = {
  // Logo: ink box in the reference is x355-710, y106-199. The app logo (500x152) has ink at 18,19-484,139.
  logo: { inkX: 355, inkW: 356, inkCenterY: 152.5, srcW: 500, srcH: 152, srcInk: { x0: 18, y0: 19, x1: 484, y1: 139 } },
  headline: { size: 126.42, baseline: 374, textLength: 894.2, x: 86, centerX: 533 },
  // Staff headline keeps the same size and horizontal squeeze as the taxpayer one.
  staffHeadline: { textLength: 676.2 },
  line1: { size: 60.12, baseline: 487, cx: 533 },
  line2: { size: 41.53, baseline: 570, cx: 533 },
  line3: { size: 41.49, baseline: 627, cx: 532.5 },
  footer1: { size: 33.65, baseline: 1499, cx: 532.5 },
  footer2: { size: 33.85, baseline: 1539, cx: 533.5 },
  qr: { x: 216, y: 737, size: 637 },
  // Corner brackets: outer box x174-890, y697-1414; arms measured in the reference.
  frame: { t: 14, left: 174, right: 890, top: 697, bottom: 1414, armTopL: 290, armTopR: 289, armLeftTop: 291, armLeftBottom: 290, gapEndL: 463 },
}

const COPY = {
  taxpayer: {
    path: "/t",
    headline: "HOW WAS YOUR VISIT TODAY?",
    line1: "Scan the code below to tell us!",
    line2: "It’s confidential - no name or Tax ID required.",
    line3: "Your feedback helps us improve our service to you.",
    textLength: LAYOUT.headline.textLength,
  },
  staff: {
    path: "/s",
    headline: "OFFICE VISIT CHECKLIST",
    line1: "Scan the code below to begin.",
    line2: "For Customer Service Quality Assurance visits.",
    line3: "Internal use only - scoring needs an access code.",
    textLength: LAYOUT.staffHeadline.textLength,
  },
}
const FOOTER = ["Customer Service Group", "Nigeria Revenue Service"]

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;")

function logoDataUrl() {
  const src = readFileSync("src/app/nrs-logo.ts", "utf8")
  const m = src.match(/data:image\/\w+;base64,[A-Za-z0-9+/=]+/)
  if (!m) throw new Error("Could not find the logo data URL in src/app/nrs-logo.ts")
  return m[0]
}

function fontFace() {
  const file = "node_modules/@fontsource/saira-extra-condensed/files/saira-extra-condensed-latin-900-normal.woff2"
  const b64 = readFileSync(file).toString("base64")
  return `@font-face{font-family:"Saira Extra Condensed";font-weight:900;src:url(data:font/woff2;base64,${b64}) format("woff2")}`
}

function qrPath(text: string) {
  const qr = QRCode.create(text, { errorCorrectionLevel: "Q" })
  const n = qr.modules.size
  const m = LAYOUT.qr.size / n
  let d = ""
  for (let r = 0; r < n; r++) {
    let c = 0
    while (c < n) {
      if (!qr.modules.get(r, c)) { c++; continue }
      const start = c
      while (c < n && qr.modules.get(r, c)) c++
      const x = LAYOUT.qr.x + start * m
      const y = LAYOUT.qr.y + r * m
      d += `M${x.toFixed(3)} ${y.toFixed(3)}h${((c - start) * m).toFixed(3)}v${m.toFixed(3)}h-${((c - start) * m).toFixed(3)}z`
    }
  }
  return { d, modules: n }
}

function frameRects() {
  const f = LAYOUT.frame
  const r = (x: number, y: number, w: number, h: number) => `<rect x="${x}" y="${y}" width="${w}" height="${h}"/>`
  const rightX = f.right - f.t + 1
  const botY = f.bottom - f.t + 1
  return [
    r(f.left, f.top, f.armTopL, f.t), r(f.left, f.top, f.t, f.armLeftTop), // top-left
    r(f.right - f.armTopR + 1, f.top, f.armTopR, f.t), r(rightX, f.top, f.t, f.armLeftTop), // top-right
    r(f.left, botY, f.armTopL, f.t), r(f.left, f.bottom - f.armLeftBottom + 1, f.t, f.armLeftBottom), // bottom-left
    r(f.right - f.armTopR + 1, botY, f.armTopR, f.t), r(rightX, f.bottom - f.armLeftBottom + 1, f.t, f.armLeftBottom), // bottom-right
  ].join("")
}

function poster(kind: keyof typeof COPY) {
  const c = COPY[kind]
  const url = `${host}${c.path}`
  const { d, modules } = qrPath(url)
  const lg = LAYOUT.logo
  const scale = lg.inkW / (lg.srcInk.x1 - lg.srcInk.x0 + 1)
  const logoX = lg.inkX - lg.srcInk.x0 * scale
  const inkCy = (lg.srcInk.y0 + lg.srcInk.y1) / 2
  const logoY = lg.inkCenterY - inkCy * scale
  const hl = LAYOUT.headline
  const hx = kind === "taxpayer" ? hl.x : hl.centerX - c.textLength / 2
  const txt = (s: string, o: { size: number; baseline: number; cx: number }, fill: string) =>
    `<text x="${o.cx}" y="${o.baseline}" font-size="${o.size}" text-anchor="middle" fill="${fill}">${esc(s)}</text>`

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<style>${fontFace()} text{font-family:Tahoma,Verdana,sans-serif}</style>
<rect width="${W}" height="${H}" fill="#fff"/>
<image href="${logoDataUrl()}" x="${logoX.toFixed(2)}" y="${logoY.toFixed(2)}" width="${(lg.srcW * scale).toFixed(2)}" height="${(lg.srcH * scale).toFixed(2)}"/>
<text x="${hx.toFixed(1)}" y="${hl.baseline}" style="font-family:'Saira Extra Condensed';font-weight:900" font-size="${hl.size}" textLength="${c.textLength}" lengthAdjust="spacingAndGlyphs" fill="${RED}">${esc(c.headline)}</text>
${txt(c.line1, LAYOUT.line1, BLACK)}
${txt(c.line2, LAYOUT.line2, BLACK)}
${txt(c.line3, LAYOUT.line3, BLACK)}
<g fill="${FRAME}">${frameRects()}</g>
<path d="${d}" fill="${BLACK}" shape-rendering="crispEdges"/>
${txt(FOOTER[0], LAYOUT.footer1, GREY)}
${txt(FOOTER[1], LAYOUT.footer2, GREY)}
</svg>
`
  return { svg, url, modules }
}

mkdirSync(outDir, { recursive: true })
for (const kind of ["taxpayer", "staff"] as const) {
  const { svg, url, modules } = poster(kind)
  writeFileSync(path.join(outDir, `poster-${kind}.svg`), svg)
  console.log(`${kind}: ${url} (${modules}x${modules} modules)`)
}
