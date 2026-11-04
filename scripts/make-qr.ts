/*
 * Generates the printed QR codes into docs/qr/.
 *
 *   node scripts/make-qr.ts [https://host]      (default: https://nrssurvey.dako.studio)
 *
 * Each QR encodes only <host>/t or <host>/s (see src/lib/short-link.ts), so the real form
 * address can change later without reprinting. Re-run only if the HOST changes.
 * The labelled card deliberately shows no web address (the QR still encodes it).
 * Writes, per code: <name>.svg (labelled, vector), <name>-qr-only.svg and <name>-qr-only.png.
 * Error correction is level H (30%), with the standard 4-module quiet zone.
 */
import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import QRCode from "qrcode"

const host = (process.argv[2] ?? "https://nrssurvey.dako.studio").replace(/\/$/, "")
if (!host.startsWith("https://")) throw new Error(`Host must start with https:// (got "${host}")`)

const QUIET = 4 // modules of white border, per the QR spec
const NAVY = "#0D1A3A"
const RED = "#b91c1c"

const CODES = [
  {
    name: "taxpayer-survey",
    path: "/t",
    heading: "Taxpayer Satisfaction Survey",
    caption: "Scan to share your feedback",
    note: "Takes about 5 minutes",
    internal: false,
  },
  {
    name: "staff-checklist",
    path: "/s",
    heading: "Service Optimization Checklist",
    caption: "INTERNAL USE ONLY",
    note: "For Customer Service Quality Assurance visits",
    internal: true,
  },
]

function qrRects(text: string) {
  const qr = QRCode.create(text, { errorCorrectionLevel: "H" })
  const n = qr.modules.size
  let d = ""
  for (let r = 0; r < n; r++) {
    let c = 0
    while (c < n) {
      if (!qr.modules.get(r, c)) { c++; continue }
      const start = c
      while (c < n && qr.modules.get(r, c)) c++
      d += `M${start + QUIET} ${r + QUIET}h${c - start}v1h-${c - start}z`
    }
  }
  return { d, size: n + QUIET * 2 }
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;")

mkdirSync("docs/qr", { recursive: true })

for (const code of CODES) {
  const url = `${host}${code.path}`
  const { d, size } = qrRects(url)

  const qrOnly = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#fff"/><path d="${d}" fill="#000"/></svg>\n`

  // Labelled card: 100 x 130 mm at 1 unit = 1 mm.
  const qrMm = 80
  const scale = qrMm / size
  const labelled = `<svg xmlns="http://www.w3.org/2000/svg" width="100mm" height="130mm" viewBox="0 0 100 130" font-family="Helvetica, Arial, sans-serif">
  <rect width="100" height="130" fill="#fff"/>
  <rect x="0" y="0" width="100" height="3" fill="${code.internal ? NAVY : RED}"/>
  <text x="50" y="14" text-anchor="middle" font-size="5.2" font-weight="700" fill="${NAVY}">${esc(code.heading)}</text>
  <text x="50" y="21" text-anchor="middle" font-size="3.6" fill="${code.internal ? RED : "#374151"}" font-weight="${code.internal ? 700 : 400}">${esc(code.caption)}</text>
  <g transform="translate(10 26) scale(${scale})" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#fff"/><path d="${d}" fill="#000"/></g>
  <text x="50" y="116" text-anchor="middle" font-size="3.6" fill="#374151">${esc(code.note)}</text>
  <text x="50" y="124" text-anchor="middle" font-size="2.8" fill="#9CA3AF">Nigeria Revenue Service · Customer Service Group</text>
</svg>
`

  writeFileSync(path.join("docs/qr", `${code.name}.svg`), labelled)
  writeFileSync(path.join("docs/qr", `${code.name}-qr-only.svg`), qrOnly)
  await QRCode.toFile(path.join("docs/qr", `${code.name}-qr-only.png`), url, {
    errorCorrectionLevel: "H",
    margin: QUIET,
    width: 1200,
  })
  console.log(`${code.name}: ${url}`)
}
