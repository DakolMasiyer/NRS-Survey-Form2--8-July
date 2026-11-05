/*
 * Builds the NRS Service Surveys guide as one self-contained HTML file, in one of two variants:
 *
 *   node scripts/make-guide.ts general   -> docs/guide/guide.html                    (committed; share widely)
 *   node scripts/make-guide.ts admin     -> docs/guide/admin-build/guide-admin.html  (git-ignored; CONFIDENTIAL)
 *
 * Then print it with `bash scripts/render-guide.sh general|admin`. Everything (logo, headline font,
 * QR codes, screenshots) is embedded in the HTML, so the PDF keeps its fonts.
 *
 * The admin variant shows the scoring passcode, read from the environment variable GUIDE_PASSCODE at
 * build time (the build fails if it is missing or empty). This file must never contain a passcode,
 * token, webhook address or connection string. Environment variables are mentioned by NAME only.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"

const variant = process.argv[2]
if (variant !== "general" && variant !== "admin") {
  console.error(`Usage: node scripts/make-guide.ts general|admin (got ${variant === undefined ? "no argument" : JSON.stringify(variant)})`)
  process.exit(1)
}
const ADMIN = variant === "admin"
const outFile = ADMIN ? "docs/guide/admin-build/guide-admin.html" : "docs/guide/guide.html"

// Admin only. Never echoed, logged or written anywhere except the git-ignored admin HTML.
const PASSCODE = process.env.GUIDE_PASSCODE?.trim() ?? ""
if (ADMIN && PASSCODE === "") {
  console.error("The admin guide needs the scoring passcode: set the environment variable GUIDE_PASSCODE (non-empty) and run again.")
  process.exit(1)
}
const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

const BASE = "https://nrssurvey.dako.studio"
const TAXPAYER_SHEET = "https://docs.google.com/spreadsheets/d/15SjHpib3MCcGQX6ZsyiIhz0GnkMvKgEGw23LolKwuoA/edit"
const STAFF_SHEET = "https://docs.google.com/spreadsheets/d/16Lk2g1M6ntN2sAurQLVbBP55lzugCb6lENhHVJwY3Ak/edit"
const REPO = "https://github.com/DakolMasiyer/NRS-Survey-Form2--8-July"

const OLD_ADDRESS = "https://survey.dako.studio"

const PASSCODE_BOX =
  "Passcode: scorers receive it separately from the CSQAU lead. Never share it or write it in messages or emails. " +
  "If you think someone else knows it, tell the CSQAU lead so it can be changed."

function logoDataUrl(): string {
  const src = readFileSync("src/app/nrs-logo.ts", "utf8")
  const m = src.match(/data:image\/\w+;base64,[A-Za-z0-9+/=]+/)
  if (!m) throw new Error("Could not find the logo data URL in src/app/nrs-logo.ts")
  return m[0]
}

function fontFace(): string {
  const file = "node_modules/@fontsource/saira-extra-condensed/files/saira-extra-condensed-latin-900-normal.woff2"
  const b64 = readFileSync(file).toString("base64")
  return `@font-face{font-family:"Saira Extra Condensed";font-weight:900;src:url(data:font/woff2;base64,${b64}) format("woff2")}`
}

function inlineSvg(file: string, cls: string): string {
  const svg = readFileSync(file, "utf8").trim()
  if (!svg.startsWith("<svg")) throw new Error(`${file} is not an SVG`)
  return svg.replace("<svg ", `<svg class="${cls}" `)
}

function imgDataUrl(file: string): string {
  return `data:image/${file.endsWith(".png") ? "png" : "jpeg"};base64,${readFileSync(file).toString("base64")}`
}

// Section numbering follows page order (pages are defined in order below).
let sectionNo = 0
const section = (title: string) => `<div class="bar">Section ${++sectionNo} &mdash; ${title}</div>`
const link = (url: string, label = url) => `<a href="${url}">${label}</a>`
const bar = (text: string) => `<div class="bar">${text}</div>`
const callout = (html: string, cls = "") => `<div class="callout ${cls}">${html}</div>`
const passcodeBox = () =>
  ADMIN
    ? `<div class="safe safe--admin"><div class="safe__icon">&#128274;</div><div><b>Scoring passcode</b><br><span class="code">${esc(PASSCODE)}</span><br>` +
      `<span class="small">Share only with CSQAU scorers and the NRS team. If it leaks, ask IT to change it. After 5 wrong tries a connection is locked out for 15 minutes.</span></div></div>`
    : `<div class="safe"><div class="safe__icon">&#128274;</div><div><b>Passcode:</b> ${PASSCODE_BOX.replace("Passcode: ", "")}</div></div>`

const css = `
${fontFace()}
:root{--red:#D12A13;--bar:#b91c1c;--navy:#0D1A3A;--grey:#7D848A;--soft:#F3F4F6;--line:#D1D5DB}
@page{size:A4;margin:0}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{font-family:Tahoma,Verdana,sans-serif;font-size:10.2pt;line-height:1.42;color:#111827;-webkit-print-color-adjust:exact;print-color-adjust:exact}
a{color:var(--navy);text-decoration:underline;text-decoration-color:var(--red);text-underline-offset:2px;overflow-wrap:anywhere}
.page{position:relative;width:210mm;height:297mm;padding:15mm 16mm 20mm;overflow:hidden;page-break-after:always;break-after:page}
.page:last-child{page-break-after:auto;break-after:auto}
.foot{position:absolute;left:16mm;right:16mm;bottom:8mm;border-top:.3mm solid var(--line);padding-top:2.2mm;display:flex;justify-content:space-between;font-size:8pt;color:var(--grey)}
h1,h2,h3{font-family:"Saira Extra Condensed",Tahoma,sans-serif;font-weight:900;color:var(--red);margin:0;line-height:1.02;text-transform:uppercase}
h2{font-size:30pt;margin-bottom:2mm}
h3{font-size:15pt;margin:3.5mm 0 1.2mm}
p{margin:0 0 2.2mm}
.lead{font-size:11.2pt;color:var(--navy);margin-bottom:3mm}
b,strong{color:var(--navy)}
.bar{background:var(--bar);color:#fff;font-weight:bold;text-transform:uppercase;letter-spacing:.06em;font-size:9.6pt;padding:2.4mm 4mm;margin:4mm 0 3mm}
.callout{border-left:1.6mm solid var(--red);background:var(--soft);padding:2.6mm 4mm;margin:3mm 0;font-size:9.8pt}
.callout b{color:var(--navy)}
.safe{display:flex;gap:3.5mm;align-items:flex-start;border:.5mm solid var(--navy);border-left:2mm solid var(--red);background:#FFF7F5;padding:3mm 4mm;margin:3mm 0;font-size:9.8pt}
.safe__icon{font-size:17pt;line-height:1}
ul,ol{margin:0 0 2.5mm;padding-left:5.5mm}
li{margin-bottom:1mm}
table{width:100%;border-collapse:collapse;margin:2.5mm 0 3mm;font-size:9.3pt}
th{background:var(--bar);color:#fff;text-align:left;padding:1.8mm 2.4mm;font-size:8.6pt;text-transform:uppercase;letter-spacing:.04em}
td{padding:1.8mm 2.4mm;border-bottom:.3mm solid var(--line);vertical-align:top}
tr:nth-child(even) td{background:#FAFAFB}
.cols{display:flex;gap:6mm}
.col{flex:1;min-width:0}
.card{border:.4mm solid var(--line);border-top:1.4mm solid var(--red);padding:3.2mm 4mm;border-radius:1mm}
.card h3{margin-top:0;font-size:17pt}
.small{font-size:8.6pt;color:var(--grey)}
.sample{position:relative;border:.4mm dashed var(--grey);padding:3mm;margin:3mm 0;background:#fff}
.sample__tag{position:absolute;top:-2.6mm;right:3mm;background:var(--navy);color:#fff;font-size:7.5pt;font-weight:bold;letter-spacing:.14em;padding:.6mm 2.2mm}
.shot{display:block;width:100%;border:.4mm solid var(--line);border-radius:1.4mm}
.qrbox{text-align:center}
.qr{width:38mm;height:38mm;border:.4mm solid var(--line)}
.qrcap{font-size:8.8pt;margin-top:1.4mm}
.steps{counter-reset:s;list-style:none;padding:0}
.steps li{counter-increment:s;position:relative;padding-left:9mm;margin-bottom:1.8mm}
.steps li::before{content:counter(s);position:absolute;left:0;top:-.4mm;width:6mm;height:6mm;border-radius:50%;background:var(--red);color:#fff;font-weight:bold;font-size:8.6pt;text-align:center;line-height:6mm}
.tiles{display:flex;gap:2mm;margin-bottom:2.4mm}
.tile{flex:1;border:.3mm solid var(--line);padding:1.8mm 2mm;text-align:center}
.tile b{display:block;font-size:15pt;font-family:"Saira Extra Condensed",Tahoma;font-weight:900;color:var(--navy)}
.tile span{font-size:7.6pt;color:var(--grey);text-transform:uppercase;letter-spacing:.04em}
.safe--admin{background:#FEF2F2}
.code{font-family:Menlo,Consolas,monospace;font-size:15pt;font-weight:bold;color:var(--navy);border:.5mm solid var(--navy);background:#fff;padding:1.2mm 4mm;margin:1.6mm 0 1.8mm;display:inline-block;letter-spacing:.06em}
.warn{background:var(--bar);color:#fff;font-weight:bold;text-align:center;text-transform:uppercase;letter-spacing:.02em;font-size:8.6pt;padding:3mm 2mm;margin:0 0 7mm;white-space:nowrap}
.conf{position:absolute;left:16mm;right:16mm;bottom:4.5mm;text-align:center;font-size:7.6pt;font-weight:bold;color:var(--bar);letter-spacing:.03em}
.foot--admin{bottom:10.5mm}
.pill{display:inline-block;padding:.2mm 2mm;border-radius:5mm;font-size:7.8pt;font-weight:bold;color:#fff}
.pill.g{background:#15803d}.pill.a{background:#b45309}.pill.r{background:#6b7280}
td{overflow-wrap:break-word}
.sample td:last-child{white-space:nowrap}
.mono{font-family:Menlo,Consolas,monospace;font-size:8.6pt;color:var(--navy)}
/* cover */
.cover{text-align:center;padding-top:15mm}
.cover img{width:74mm;display:block;margin:0 auto 3mm}
.cover .tag{font-style:italic;color:#374151;font-size:11pt;margin-bottom:9mm}
.cover .office{font-size:9.4pt;font-weight:bold;letter-spacing:.28em;text-transform:uppercase;color:#374151;margin:0 0 2.4mm}
.cover hr{border:0;border-top:.35mm solid var(--red);margin:9mm 0 20mm}
.cover h1{font-size:68pt;line-height:.96;margin-bottom:8mm}
.cover .sub{font-style:italic;color:var(--red);font-size:16pt;margin-bottom:30mm}
.cover .meta{color:var(--grey);font-size:10.5pt;letter-spacing:.08em}
.cover .meta b{color:var(--navy)}
`

const CONF = "ADMINISTRATOR COPY. CONFIDENTIAL. Contains the access passcode. Do not circulate."

function foot(n: number, total: number): string {
  const conf = ADMIN ? `<div class="conf">${CONF}</div>` : ""
  return `<div class="foot${ADMIN ? " foot--admin" : ""}"><span>Customer Service Group, Nigeria Revenue Service</span><span>Page ${n} of ${total}</span></div>${conf}`
}

// ---------------------------------------------------------------- pages
const logo = logoDataUrl()
const qrTaxpayer = inlineSvg("docs/qr/taxpayer-survey-qr-only.svg", "qr")
const qrStaff = inlineSvg("docs/qr/staff-checklist-qr-only.svg", "qr")
const shotStaff = imgDataUrl("docs/guide/img/staff-form.png")
const shotGate = imgDataUrl("docs/guide/img/score-gate.png")
const shotTaxpayer = imgDataUrl("docs/guide/img/taxpayer-form.png")
const shotOverview = imgDataUrl("docs/guide/img/overview-sample.png")

const cover = `
<div class="page cover"${ADMIN ? "" : " data-nofoot"}>
  ${ADMIN ? `<div class="warn">${CONF}</div>` : ""}
  <img src="${logo}" alt="Nigeria Revenue Service">
  <p class="tag">Inspiring Trust, Sustaining Growth</p>
  <p class="office">Strategic Management Office</p>
  <p class="office">Customer Service Group</p>
  <hr>
  <h1>How the NRS Service Surveys work</h1>
  <p class="sub">${ADMIN ? "Administrator guide" : "A plain-language guide for NRS staff"}</p>
  <p class="meta"><b>November 2026</b> &nbsp;&middot;&nbsp; Version 1</p>
</div>`

const glance = `
<div class="page">
  <h2>At a glance</h2>
  <p class="lead">There are two online forms. Each one has its own web address and its own QR code. Both save their answers securely and automatically, so nobody has to type results in by hand.</p>
  ${section("At a glance")}
  <div class="cols">
    <div class="col card">
      <h3>Taxpayer Satisfaction Survey</h3>
      <p><b>For taxpayers.</b> Scan the QR code at the tax office, or open the link.</p>
      <ul>
        <li>Takes about 5 minutes.</li>
        <li>Confidential.</li>
        <li>No name needed. Tax ID and contact details are optional.</li>
      </ul>
    </div>
    <div class="col card">
      <h3>Service Optimization Checklist</h3>
      <p><b>For NRS staff</b>, in three roles:</p>
      <ul>
        <li><b>Officers</b> at the unit fill it in.</li>
        <li><b>CSQAU scorers</b> review it and give scores.</li>
        <li><b>The NRS team</b> follows progress.</li>
      </ul>
    </div>
  </div>
  <h3>Who uses what</h3>
  <table>
    <tr><th>Who</th><th>What they do</th><th>Where</th><th>Passcode?</th></tr>
    <tr><td>Taxpayers</td><td>Answer the satisfaction survey</td><td>/taxpayer</td><td>No</td></tr>
    <tr><td>Officers at the unit</td><td>Fill in the checklist (Step 1)</td><td>/staff</td><td>No</td></tr>
    <tr><td>CSQAU scorers</td><td>Review and score the checklist (Step 2)</td><td>/staff/score</td><td>Yes</td></tr>
    <tr><td>The NRS team</td><td>See which offices have submitted (Step 3)</td><td>/staff/overview</td><td>Yes</td></tr>
  </table>
  <h3>Scan to open</h3>
  <div class="cols" style="justify-content:center">
    <div class="col qrbox">${qrTaxpayer}<p class="qrcap"><b>Taxpayer survey</b><br>Public. Scan with a phone camera.</p></div>
    <div class="col qrbox">${qrStaff}<p class="qrcap"><b>Service Optimization Checklist</b><br>For NRS staff only.</p></div>
  </div>
  ${callout("<b>Good to know:</b> a QR code is just a quick way to open a link. If a code does not scan, type the link instead. All the links are on the last page.")}
</div>`

const taxpayer = `
<div class="page">
  <h2>The Taxpayer Survey</h2>
  <p class="lead">This is what a taxpayer sees and answers. It is short, friendly and works on any phone.</p>
  ${section("The Taxpayer Satisfaction Survey")}
  <div class="cols">
    <div class="col" style="flex:1">
      <ol class="steps">
        <li><b>Tax office.</b> Pick the State, then the Office where you were served.</li>
        <li><b>Section A: Taxpayer / business information.</b> Optional.</li>
        <li><b>Section B: Tax compliance.</b></li>
        <li><b>Section C: Service experience.</b> How was your visit?</li>
        <li><b>Section D: Digital channels and awareness.</b> Which NRS channels do you know and use?</li>
        <li><b>Section E: Your feedback.</b> Anything else you would like to tell us.</li>
      </ol>
      <p><b>Optional parts.</b> Section A (including the Tax ID) and contact details can be left blank. Nobody has to give a name.</p>
    </div>
    <div class="col"><img class="shot" src="${shotTaxpayer}" alt="Screenshot of the taxpayer survey"><p class="small">The top of the live survey.</p></div>
  </div>
  ${callout("<b>Our promise to taxpayers:</b> answers are confidential. They are used only to improve service and are handled in line with the Nigeria Data Protection Act (NDPA) 2023.", "")}
  ${bar("Where the answers go")}
  ${
    ADMIN
      ? `<p>When the taxpayer presses <b>Submit</b>, the answers go straight into a Google Sheet called <b>&ldquo;NRS Taxpayer Satisfaction Survey - Responses&rdquo;</b>. Each response is <b>one row</b>. The sheet is the report: it updates by itself.</p>
  <p>Access to the sheet is <b>by invitation</b>. Taxpayers cannot see it, and the survey page never shows anyone else's answers.</p>`
      : `<p>When the taxpayer presses <b>Submit</b>, the answers are <b>saved securely</b>. Each response is kept as <b>one record</b>, and the results are reviewed by the Customer Service Group (CSQAU).</p>
  <p>Taxpayers cannot see the results, and the survey page never shows anyone else's answers.</p>`
  }
  ${callout("<b>Tip for field teams:</b> if a taxpayer prefers, hand over your phone or point to the poster. The same link works for everyone. Please do not fill it in on their behalf.")}
</div>`

const step1 = `
<div class="page">
  <h2>Step 1: officers</h2>
  <p class="lead">The Service Optimization Checklist is filled in at the unit by the officer on duty. It takes a few minutes.</p>
  ${section("Checklist, Step 1 (officers)")}
  <ol class="steps">
    <li><b>Scan the QR code</b> or open ${link(BASE + "/staff", "nrssurvey.dako.studio/staff")}.</li>
    <li><b>Choose the State, then the Office.</b> Check that it is your own office.</li>
    <li><b>Answer Yes or No</b> for each section except section 2, and <b>add remarks</b> where they help.</li>
    <li><b>Add the staff list</b> under section 2, Number of staff. Section 2 is a heading: it has no Yes or No, just the list of staff (name, IR, rank, phone and email).</li>
    <li><b>Press Submit.</b> You will see a reference such as <span class="mono">NRS-1A2B3C4D</span>. Write it down or take a screenshot.</li>
    <li>Your answers now <b>wait for scoring</b>. Officers do not see any scores.</li>
  </ol>
  <img class="shot" src="${shotStaff}" alt="Screenshot of the checklist form">
  <p class="small">The top of the live checklist. The dark button, &ldquo;CSQAU scorer? Open the scoring page&rdquo;, is only for scorers.</p>
  ${bar("The 10 sections you will answer")}
  <table>
    <tr><td>1. Ambience</td><td>2. Number of staff</td><td>3. Availability of working tools</td></tr>
    <tr><td>4. Educational and information materials</td><td>5. Registers maintained in the unit</td><td>6. Progress report on REV 360</td></tr>
    <tr><td>7. Relationship management programmes</td><td>8. Newly registered taxpayers</td><td>9. Taxpayer complaints handling</td></tr>
    <tr><td colspan="3">10. Any other issues for Management information</td></tr>
  </table>
  ${callout("<b>Keep your reference.</b> It identifies your submission later, on the scoring page and in the saved results.")}
</div>`

const step2 = `
<div class="page">
  <h2>Step 2: CSQAU scorers</h2>
  <p class="lead">Scoring is done by the visiting Customer Service Quality Assurance Unit (CSQAU) checker, never by the officer.</p>
  ${section("Checklist, Step 2 (scoring)")}
  <div class="cols">
    <div class="col" style="flex:1.3">
      <ol class="steps">
        <li>On the checklist page, press <b>&ldquo;CSQAU scorer? Open the scoring page&rdquo;</b>. (Or open ${link(BASE + "/staff/score", "nrssurvey.dako.studio/staff/score")}.)</li>
        <li>Type the <b>passcode</b> and press <b>Unlock</b>.</li>
        <li>Pick the <b>State</b>, the <b>Office</b>, then a <b>waiting submission</b>.</li>
        <li>The officer's answers show on screen. You can <b>read them but not change them</b>.</li>
        <li>Enter a <b>score from 0 to 100</b> for each section.</li>
        <li>Fill in <b>Checked by</b>, <b>Head</b> and <b>Tax Controller</b> details.</li>
        <li>Press <b>Save</b>. The system <b>works out the total itself</b>.</li>
      </ol>
    </div>
    <div class="col"><img class="shot" src="${shotGate}" alt="Screenshot of the scoring page passcode gate"><p class="small">The live scoring page asks for the passcode first.</p></div>
  </div>
  ${passcodeBox()}
  <div class="sample"><span class="sample__tag">SAMPLE</span>
    <table style="margin:0 0 1mm;font-size:8.4pt">
      <tr><th style="width:5%">S/N</th><th>Issue</th><th style="width:15%">Officer said</th><th style="width:27%">Officer's remarks</th><th style="width:17%">Your score</th></tr>
      <tr><td>1</td><td>Ambience</td><td>YES</td><td>Clean and well lit</td><td><span style="border:.3mm solid var(--navy);padding:.4mm 5mm">85</span> / 100</td></tr>
      <tr><td>2</td><td>Number of staff</td><td colspan="2"><i>Heading: staff list shown below, no Yes or No</i></td><td><span style="border:.3mm solid var(--navy);padding:.4mm 5mm">60</span> / 100</td></tr>
      <tr><td>3</td><td>Availability of working tools</td><td>YES</td><td>&mdash;</td><td><span style="border:.3mm solid var(--navy);padding:.4mm 5mm">&nbsp;&nbsp;&nbsp;</span> / 100</td></tr>
    </table>
    <p class="small" style="margin:0">Illustration of the review screen. Answers are read-only; only the score boxes can be typed in.</p>
  </div>
  <h3>When something goes wrong</h3>
  <ul>
    ${
      ADMIN
        ? `<li><b>Sheet update failed?</b> The finished record goes to the staff Google Sheet. If that step fails you will see the message &ldquo;Saved, but the sheet update failed&rdquo; and a <b>Resend to sheet</b> button. <b>Your scores are safe</b>: press it to try again.</li>`
        : `<li><b>Update failed?</b> The finished record is also sent to the results file. If that step fails you will see a message saying so, and a <b>Resend to sheet</b> button. <b>Your scores are safe</b>: press it to try again.</li>`
    }
    <li><b>Wrong passcode?</b> After <b>5 wrong passcodes</b>, that connection is <b>locked out for 15 minutes</b>.</li>
  </ul>
</div>`

const step3 = `
<div class="page">
  <h2>Step 3: the NRS team</h2>
  <p class="lead">One page shows, month by month, which offices have submitted and which are still waiting.</p>
  ${section("Checklist, Step 3 (Submissions overview)")}
  <p>The Submissions overview page is at ${link(BASE + "/staff/overview", "nrssurvey.dako.studio/staff/overview")}. It uses <b>the same passcode as the scorers</b>.</p>
  ${callout("<b>Sample data.</b> The picture below is the real page, filled with made-up demonstration numbers so that no real office results are shown.")}
  <ol class="steps">
    <li><b>Pick a month.</b></li>
    <li>See how many of the <b>199 offices</b> have submitted.</li>
    <li>See which are <b>waiting to be scored</b>, which are <b>scored</b>, and which have <b>not submitted</b>.</li>
    <li><b>Filter</b> by state or by status.</li>
  </ol>
  <img class="shot"${ADMIN ? ' style="width:76%;margin:0 auto"' : ""} src="${shotOverview}" alt="The Submissions overview page, filtered to offices waiting to be scored (sample data)">
  <p class="small">The Submissions overview page with sample data, filtered to offices that are waiting to be scored.</p>
  ${bar("What this page shows, and does not show")}
  <ul>
    <li>It shows <b>counts and dates only</b>.</li>
    <li>It <b>never shows names</b> of officers or scorers, and it does not show the scores or remarks.</li>
    <li>It is a progress tracker. ${ADMIN ? "The detailed results are in the staff Google Sheet." : "The detailed results are reviewed by the CSQAU."}</li>
  </ul>
  ${passcodeBox()}
</div>`

// Admin only: where answers are stored (ported from the earlier guide, wording updated).
const flowSvg = `
<svg viewBox="0 0 700 372" width="100%" role="img" aria-label="Where answers are saved" font-family="Tahoma, Verdana, sans-serif">
  <defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#0D1A3A"/></marker></defs>
  <style>.bx{fill:#fff;stroke:#0D1A3A;stroke-width:1.6}.rd{fill:#b91c1c;stroke:none}.t{font-size:12.5px;fill:#0D1A3A;text-anchor:middle}.tb{font-size:13px;font-weight:bold;fill:#0D1A3A;text-anchor:middle}.tw{font-size:13px;font-weight:bold;fill:#fff;text-anchor:middle}.sm{font-size:10.5px;fill:#7D848A;text-anchor:middle}.ln{stroke:#0D1A3A;stroke-width:1.8;fill:none;marker-end:url(#ar)}</style>
  <text x="10" y="18" font-size="12" font-weight="bold" fill="#b91c1c" letter-spacing="1.2">TAXPAYER SURVEY</text>
  <rect class="bx" x="10" y="28" width="190" height="52" rx="4"/><text class="tb" x="105" y="50">Taxpayer answers</text><text class="sm" x="105" y="67">Submit on phone</text>
  <path class="ln" d="M200 54H260"/>
  <rect class="rd" x="262" y="28" width="428" height="52" rx="4"/><text class="tw" x="476" y="50">Taxpayer Google Sheet</text><text x="476" y="67" font-size="10.5" fill="#fff" text-anchor="middle">one row per response</text>
  <line x1="10" y1="108" x2="690" y2="108" stroke="#D1D5DB" stroke-dasharray="4 4"/>
  <text x="10" y="132" font-size="12" font-weight="bold" fill="#b91c1c" letter-spacing="1.2">SERVICE OPTIMIZATION CHECKLIST</text>
  <rect class="bx" x="10" y="146" width="150" height="62" rx="4"/><text class="tb" x="85" y="170">Step 1</text><text class="t" x="85" y="188">Officer submits</text>
  <path class="ln" d="M160 177H218"/>
  <rect class="bx" x="220" y="146" width="190" height="62" rx="4"/><text class="tb" x="315" y="170">Secure database</text><text class="sm" x="315" y="189">status: WAITING</text>
  <path class="ln" d="M410 177H468"/>
  <rect class="bx" x="470" y="146" width="150" height="62" rx="4"/><text class="tb" x="545" y="170">Step 2</text><text class="t" x="545" y="188">CSQAU scores</text>
  <path class="ln" d="M545 208V250"/>
  <path class="ln" d="M545 229H335V250"/>
  <text class="sm" x="564" y="240" text-anchor="start">after scoring</text>
  <rect class="bx" x="220" y="252" width="230" height="62" rx="4"/><text class="tb" x="335" y="276">Secure database</text><text class="sm" x="335" y="295">status: SCORED (kept as a backup)</text>
  <rect class="rd" x="470" y="252" width="220" height="62" rx="4"/><text class="tw" x="580" y="276">Staff Google Sheet</text><text x="580" y="295" font-size="10.5" fill="#fff" text-anchor="middle">finished row + reference</text>
  <text class="sm" x="350" y="346">The scoring step writes to both places at once.</text>
</svg>`

const saved = ADMIN
  ? `
<div class="page">
  <h2>Where things are saved</h2>
  <p class="lead">Nothing is stored on a phone or computer. Everything is saved online, as soon as someone presses Submit or Save.</p>
  ${section("Where things are saved")}
  ${flowSvg}
  <h3>Waiting and scored</h3>
  <ul>
    <li><b>Waiting.</b> The officer has submitted. Nobody has scored it yet. It is kept in the secure database (Neon Postgres, added through the Vercel Marketplace).</li>
    <li><b>Scored.</b> A CSQAU scorer has saved the scores. The finished record is kept in the secure database as a backup <b>and</b> added as a finished row in the staff Google Sheet.</li>
  </ul>
  <h3>The reference code</h3>
  <p>Each submission gets a reference such as <span class="mono">NRS-1A2B3C4D</span>. It follows the submission everywhere: on the scoring page, in the secure database and as a column in the staff Google Sheet. Quote it if you need help.</p>
  <h3>The Google Sheets are the reports</h3>
  <p>NRS uses the two Google Sheets as its reports. They are opened by invitation only. The taxpayer survey writes straight to its sheet. The secure database is the safety copy behind the scenes for the staff checklist: you never need to open it.</p>
  ${callout("<b>Why two copies?</b> If the staff sheet is briefly unavailable, nothing is lost. The scores are in the secure database, and the scorer can press <b>Resend to sheet</b> later.")}
</div>`
  : ""

const faqRows: Array<[string, string[]]> = [
  ["The public", ["Fill in", "&mdash;", "&mdash;", "&mdash;", "&mdash;"]],
  ["Officers", ["Fill in", "Fill in (no scores shown)", "&mdash;", "&mdash;", "&mdash;"]],
  ["CSQAU scorers", ["Fill in", "Open", "Review and score (passcode)", "View (passcode)", "By invitation"]],
  ["The NRS team", ["Fill in", "Open", "&mdash;", "View (passcode)", "By invitation"]],
]
const faqHead = ["Who", "Taxpayer survey", "Checklist form", "Scoring page", "Overview page", ...(ADMIN ? ["Google Sheets"] : [])]
const faqTable = `<table>
    <tr>${faqHead.map((h) => `<th>${h}</th>`).join("")}</tr>
    ${faqRows
      .map(([who, cells]) => `<tr><td><b>${who}</b></td>${(ADMIN ? cells : cells.slice(0, 4)).map((c) => `<td>${c}</td>`).join("")}</tr>`)
      .join("\n    ")}
  </table>`

const faq = `
<div class="page">
  <h2>Who sees what, and fixes</h2>
  ${section("Who can see what")}
  ${faqTable}
  ${bar("Questions and fixes")}
  <h3>I am locked out for 15 minutes</h3>
  <p>That happens after 5 wrong passcodes. Wait 15 minutes, then type the passcode carefully. Do not ask others for the passcode; ask the CSQAU lead.</p>
  <h3>I picked the wrong office</h3>
  <p>Tell the CSQAU lead the reference code. Do not submit a second form. The scorer can check which submission is the right one.</p>
  <h3>I scored the wrong submission</h3>
  <p>Stop and tell the CSQAU lead straight away, with the reference code. Scores cannot be changed on the page once saved, so the team needs to correct it.</p>
  <h3>It says someone else already scored this submission</h3>
  <p>This &ldquo;scored twice&rdquo; message means scores were already saved for this reference. Nothing is overwritten. Choose another waiting submission, or check with your colleague.</p>
  <h3>The Resend to sheet button</h3>
  <p>${
    ADMIN
      ? "If the staff Google Sheet could not be updated, your scores are still safe. Press <b>Resend to sheet</b>."
      : "If the results file could not be updated, your scores are still safe. Press <b>Resend to sheet</b>."
  } If it still fails, wait a few minutes and try again, then tell the CSQAU lead.</p>
  <h3>The QR code will not scan</h3>
  <p>Type the link instead (last page). Hold the phone steady, in good light, about 20 cm from the code.</p>
  <h3>The page will not load</h3>
  <p>Try again. The first load after a quiet period can be slow. Wait a few seconds and refresh.</p>
</div>`

const linkRows = [
  `<tr><td><b>Taxpayer survey</b></td><td>${link(BASE + "/taxpayer")}<br><span class="small">Short link, used by the QR: ${link(BASE + "/t")}</span></td><td>Public</td></tr>`,
  `<tr><td><b>Service Optimization Checklist</b></td><td>${link(BASE + "/staff")}<br><span class="small">Short link, used by the QR: ${link(BASE + "/s")}</span></td><td>Public link, meant for NRS staff</td></tr>`,
  `<tr><td><b>Scoring page</b></td><td>${link(BASE + "/staff/score")}</td><td>Passcode needed</td></tr>`,
  `<tr><td><b>Submissions overview</b></td><td>${link(BASE + "/staff/overview")}</td><td>Passcode needed</td></tr>`,
  ...(ADMIN
    ? [
        `<tr><td><b>Taxpayer sheet</b></td><td>${link(TAXPAYER_SHEET)}</td><td>Access by invitation</td></tr>`,
        `<tr><td><b>Staff sheet</b></td><td>${link(STAFF_SHEET)}</td><td>Access by invitation</td></tr>`,
        `<tr><td><b>Old address</b></td><td>${link(OLD_ADDRESS, "survey.dako.studio")}<br><span class="small">Still works. It forwards to the new address.</span></td><td>As the page it forwards to</td></tr>`,
      ]
    : []),
]

const links = `
<div class="page">
  <h2>All the links</h2>
  <p class="lead">Every link below is clickable in the PDF.</p>
  ${section("All the links")}
  <table>
    <tr><th style="width:23%">What</th><th>Link</th><th style="width:19%">Who can open it</th></tr>
    ${linkRows.join("\n    ")}
  </table>
  ${ADMIN ? "" : passcodeBox()}
  <h3>Printed QR codes</h3>
  <p>The QR codes point to the short links (<span class="mono">/t</span> and <span class="mono">/s</span>). If NRS ever moves a form, the short links can be pointed somewhere new, and the printed posters keep working.</p>
</div>`

// Admin only: who changes what, and where.
const whoChange = ADMIN
  ? `
<div class="page">
  <h2>Who to change what</h2>
  <p class="lead">For the NRS administrator. Settings live in the Vercel project; this table gives variable <b>names</b> only, never their values.</p>
  ${section("Who to change what")}
  <table>
    <tr><th style="width:22%">What</th><th style="width:34%">Where it lives</th><th>How to change it</th></tr>
    <tr><td><b>Scoring passcode</b></td><td>Vercel project environment variable <span class="mono">CSQAU_ACCESS_CODE</span></td><td>Update it for <b>Production and Preview</b>, then redeploy. Give the new code to scorers and the NRS team separately.</td></tr>
    <tr><td><b>Staff sheet connection</b></td><td><span class="mono">NRS_SPAFF_WEBHOOK_URL</span> and its backup <span class="mono">NRS_SPAFF_WEBHOOK_URL_BACKUP</span></td><td>The web-app addresses of the staff sheet's script. Update them if the script is redeployed under a new address, then redeploy.</td></tr>
    <tr><td><b>Taxpayer sheet connection</b></td><td><span class="mono">NRS_TAXPAYER_WEBHOOK_URL</span> and its backup <span class="mono">NRS_TAXPAYER_WEBHOOK_URL_BACKUP</span></td><td>The same, for the taxpayer sheet's script.</td></tr>
    <tr><td><b>Secure database</b></td><td><span class="mono">DATABASE_URL</span>, set by the Neon integration in Vercel</td><td>Managed by the integration. Do not edit by hand.</td></tr>
    <tr><td><b>Short link <span class="mono">/t</span></b></td><td><span class="mono">SHORTLINK_TAXPAYER_URL</span></td><td>Point it at a new address and redeploy. Printed QR codes keep working.</td></tr>
    <tr><td><b>Short link <span class="mono">/s</span></b></td><td><span class="mono">SHORTLINK_STAFF_URL</span></td><td>Same as above, for the checklist.</td></tr>
    <tr><td><b>Who may open the sheets</b></td><td>Sharing settings of each Google Sheet</td><td>Add or remove people by invitation in Google Sheets.</td></tr>
  </table>
  ${callout("<b>If the passcode leaks:</b> ask IT to change <span class=\"mono\">CSQAU_ACCESS_CODE</span> straight away (Production and Preview, then redeploy), then tell scorers and the NRS team the new code in person or by phone.")}
  ${callout("<b>Keep this copy safe.</b> It shows the passcode and the sheet links. Do not email it, print it for noticeboards or upload it to shared folders. Share the general guide instead.")}
</div>`
  : ""

const appendix = ADMIN
  ? `
<div class="page">
  <h2>For IT: how it is built</h2>
  ${bar("Technical appendix")}
  <table>
    <tr><th style="width:26%">Part</th><th>Details</th></tr>
    <tr><td><b>Hosting</b></td><td>Vercel, project <span class="mono">nrs-service-surveys</span>. Production deploys from the <span class="mono">main</span> branch of ${link(REPO)}.</td></tr>
    <tr><td><b>Application</b></td><td>Next.js and TypeScript.</td></tr>
    <tr><td><b>Database</b></td><td>The staff checklist is stored in Neon (Postgres), added through the Vercel Marketplace. Resource <span class="mono">nrs-surveys-prod</span> for production; <span class="mono">nrs-surveys-dev</span> for preview and development.</td></tr>
    <tr><td><b>Reports</b></td><td>Google Sheets, fed by Google Apps Script web apps. The script files are in the repository under <span class="mono">scripts/staff-sheet</span> and <span class="mono">scripts/taxpayer-sheet</span>.</td></tr>
    <tr><td><b>DNS</b></td><td>The <span class="mono">dako.studio</span> domain is on Cloudflare. The <span class="mono">nrssurvey</span> and <span class="mono">survey</span> records point at Vercel.</td></tr>
    <tr><td><b>Short links</b></td><td><span class="mono">/t</span> and <span class="mono">/s</span> redirect to the forms and can be re-pointed without reprinting QR codes.</td></tr>
  </table>
  <h3>Checks before a release</h3>
  <p><span class="mono">npm run lint</span> &nbsp;&middot;&nbsp; <span class="mono">npx tsc --noEmit</span> &nbsp;&middot;&nbsp; <span class="mono">npm run build</span> &nbsp;&middot;&nbsp; <span class="mono">npm test</span></p>
  <h3>Rebuilding this guide</h3>
  <p><span class="mono">GUIDE_PASSCODE=&lt;passcode&gt; node scripts/make-guide.ts admin</span>, then <span class="mono">bash scripts/render-guide.sh admin</span>. The output stays in a git-ignored folder.</p>
  ${callout("<b>Contact:</b> the system administrator at the Customer Service Group.")}
</div>`
  : ""

const pages = [cover, glance, taxpayer, step1, step2, step3, saved, faq, links, whoChange, appendix].filter((p) => p !== "")
const total = pages.length
const body = pages
  .map((p, i) => (p.includes("data-nofoot") ? p : p.replace(/<\/div>\s*$/, `${foot(i + 1, total)}</div>`)))
  .join("\n")

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${ADMIN ? "NRS Service Surveys: Administrator guide (CONFIDENTIAL)" : "How the NRS Service Surveys work"}</title>
<style>${css}</style></head><body>
${body}
</body></html>`

mkdirSync(dirname(outFile), { recursive: true })
writeFileSync(outFile, html)
console.log(`wrote ${outFile} (${(html.length / 1024).toFixed(0)} KB, ${total} pages, ${variant} variant)`)
