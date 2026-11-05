/*
 * Builds the NRS Service Surveys plain-language user guide as one self-contained HTML file:
 *
 *   node scripts/make-guide.ts [outFile]        (default docs/guide/guide.html)
 *
 * Then print it with scripts/render-guide.sh. Everything (logo, headline font, QR codes,
 * screenshots) is embedded in the HTML, so the PDF keeps its fonts.
 *
 * This file must never contain a passcode, token, webhook address, connection string or personal
 * contact detail. Environment variables are mentioned by NAME only.
 */
import { readFileSync, writeFileSync } from "node:fs"

const outFile = process.argv[2] ?? "docs/guide/guide.html"

const BASE = "https://nrssurvey.dako.studio"
const TAXPAYER_SHEET = "https://docs.google.com/spreadsheets/d/15SjHpib3MCcGQX6ZsyiIhz0GnkMvKgEGw23LolKwuoA/edit"
const STAFF_SHEET = "https://docs.google.com/spreadsheets/d/16Lk2g1M6ntN2sAurQLVbBP55lzugCb6lENhHVJwY3Ak/edit"
const REPO = "https://github.com/DakolMasiyer/NRS-Survey-Form2--8-July"

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

const link = (url: string, label = url) => `<a href="${url}">${label}</a>`
const bar = (text: string) => `<div class="bar">${text}</div>`
const callout = (html: string, cls = "") => `<div class="callout ${cls}">${html}</div>`
const passcodeBox = () =>
  `<div class="safe"><div class="safe__icon">&#128274;</div><div><b>Passcode:</b> ${PASSCODE_BOX.replace("Passcode: ", "")}</div></div>`

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
.pill{display:inline-block;padding:.2mm 2mm;border-radius:5mm;font-size:7.8pt;font-weight:bold;color:#fff}
.pill.g{background:#15803d}.pill.a{background:#b45309}.pill.r{background:#6b7280}
td{overflow-wrap:break-word}
.sample td:last-child{white-space:nowrap}
.mono{font-family:Menlo,Consolas,monospace;font-size:8.6pt;color:var(--navy)}
/* cover */
.cover{text-align:center;padding-top:20mm}
.cover img{width:74mm;display:block;margin:0 auto 3mm}
.cover .tag{font-style:italic;color:#374151;font-size:11pt;margin-bottom:9mm}
.cover .office{font-size:9.4pt;font-weight:bold;letter-spacing:.28em;text-transform:uppercase;color:#374151;margin:0 0 2.4mm}
.cover hr{border:0;border-top:.35mm solid var(--red);margin:9mm 0 20mm}
.cover h1{font-size:68pt;line-height:.96;margin-bottom:8mm}
.cover .sub{font-style:italic;color:var(--red);font-size:16pt;margin-bottom:34mm}
.cover .meta{color:var(--grey);font-size:10.5pt;letter-spacing:.08em}
.cover .meta b{color:var(--navy)}
`

function foot(n: number, total: number): string {
  return `<div class="foot"><span>Customer Service Group, Nigeria Revenue Service</span><span>Page ${n} of ${total}</span></div>`
}

// ---------------------------------------------------------------- pages
const logo = logoDataUrl()
const qrTaxpayer = inlineSvg("docs/qr/taxpayer-survey-qr-only.svg", "qr")
const qrStaff = inlineSvg("docs/qr/staff-checklist-qr-only.svg", "qr")
const shotStaff = imgDataUrl("docs/guide/img/staff-form.png")
const shotGate = imgDataUrl("docs/guide/img/score-gate.png")
const shotTaxpayer = imgDataUrl("docs/guide/img/taxpayer-form.png")

const cover = `
<div class="page cover" data-nofoot>
  <img src="${logo}" alt="Nigeria Revenue Service">
  <p class="tag">Inspiring Trust, Sustaining Growth</p>
  <p class="office">Strategic Management Office</p>
  <p class="office">Customer Service Group</p>
  <hr>
  <h1>How the NRS Service Surveys work</h1>
  <p class="sub">A plain-language guide for NRS staff</p>
  <p class="meta"><b>November 2026</b> &nbsp;&middot;&nbsp; Version 1</p>
</div>`

const glance = `
<div class="page">
  <h2>At a glance</h2>
  <p class="lead">There are two online forms. Each one has its own web address and its own QR code. Both save their answers automatically, so nobody has to type results into a spreadsheet.</p>
  ${bar("Section 1 &mdash; At a glance")}
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
  ${callout("<b>Good to know:</b> a QR code is just a quick way to open a link. If a code does not scan, type the link instead. All the links are on page 9.")}
</div>`

const taxpayer = `
<div class="page">
  <h2>The Taxpayer Survey</h2>
  <p class="lead">This is what a taxpayer sees and answers. It is short, friendly and works on any phone.</p>
  ${bar("Section 2 &mdash; The Taxpayer Satisfaction Survey")}
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
  <p>When the taxpayer presses <b>Submit</b>, the answers go straight into a Google Sheet called <b>&ldquo;NRS Taxpayer Satisfaction Survey - Responses&rdquo;</b>. Each response is <b>one row</b>. The sheet is the report: it updates by itself.</p>
  <p>Access to the sheet is <b>by invitation</b>. Taxpayers cannot see it, and the survey page never shows anyone else's answers.</p>
  ${callout("<b>Tip for field teams:</b> if a taxpayer prefers, hand over your phone or point to the poster. The same link works for everyone. Please do not fill it in on their behalf.")}
</div>`

const step1 = `
<div class="page">
  <h2>Step 1: officers</h2>
  <p class="lead">The Service Optimization Checklist is filled in at the unit by the officer on duty. It takes a few minutes.</p>
  ${bar("Section 3 &mdash; Checklist, Step 1 (officers)")}
  <ol class="steps">
    <li><b>Scan the QR code</b> or open ${link(BASE + "/staff", "nrssurvey.dako.studio/staff")}.</li>
    <li><b>Choose the State, then the Office.</b> Check that it is your own office.</li>
    <li><b>Answer Yes or No</b> for each of the 10 sections, and <b>add remarks</b> where they help.</li>
    <li><b>Add the staff details</b> at the bottom of the form.</li>
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
  ${callout("<b>Keep your reference.</b> It identifies your submission later, on the scoring page and in the staff Google Sheet.")}
</div>`

const step2 = `
<div class="page">
  <h2>Step 2: CSQAU scorers</h2>
  <p class="lead">Scoring is done by the visiting Customer Service Quality Assurance Unit (CSQAU) checker, never by the officer.</p>
  ${bar("Section 4 &mdash; Checklist, Step 2 (scoring)")}
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
      <tr><td>2</td><td>Number of staff</td><td>NO</td><td>Two officers on leave</td><td><span style="border:.3mm solid var(--navy);padding:.4mm 5mm">60</span> / 100</td></tr>
      <tr><td>3</td><td>Availability of working tools</td><td>YES</td><td>&mdash;</td><td><span style="border:.3mm solid var(--navy);padding:.4mm 5mm">&nbsp;&nbsp;&nbsp;</span> / 100</td></tr>
    </table>
    <p class="small" style="margin:0">Illustration of the review screen. Answers are read-only; only the score boxes can be typed in.</p>
  </div>
  <h3>When something goes wrong</h3>
  <ul>
    <li><b>Sheet update failed?</b> The finished record goes to the staff Google Sheet. If that step fails you will see the message &ldquo;Saved, but the sheet update failed&rdquo; and a <b>Resend to sheet</b> button. <b>Your scores are safe</b>: press it to try again.</li>
    <li><b>Wrong passcode?</b> After <b>5 wrong passcodes</b>, that connection is <b>locked out for 15 minutes</b>.</li>
  </ul>
</div>`

const step3 = `
<div class="page">
  <h2>Step 3: the NRS team</h2>
  <p class="lead">One page shows, month by month, which offices have submitted and which are still waiting.</p>
  ${bar("Section 5 &mdash; Checklist, Step 3 (Submissions overview)")}
  <p>The Submissions overview page is at ${link(BASE + "/staff/overview", "nrssurvey.dako.studio/staff/overview")}. It uses <b>the same passcode as the scorers</b>.</p>
  ${callout("<b>Status:</b> this page is being finished now and will be live shortly. This guide describes it as designed. The picture below is a drawn sample, not real data.")}
  <ol class="steps">
    <li><b>Pick a month.</b></li>
    <li>See how many of the <b>199 offices</b> have submitted.</li>
    <li>See which are <b>waiting to be scored</b>, which are <b>scored</b>, and which have <b>not submitted</b>.</li>
    <li><b>Filter</b> by state or by status.</li>
  </ol>
  <div class="sample"><span class="sample__tag">SAMPLE</span>
    <p style="margin:0 0 2mm"><b>Submissions overview</b> &nbsp;<span class="small">Month: November 2026 &nbsp;|&nbsp; State: All &nbsp;|&nbsp; Status: All</span></p>
    <div class="tiles">
      <div class="tile"><b>199</b><span>Offices</span></div>
      <div class="tile"><b>142</b><span>Submitted</span></div>
      <div class="tile"><b>31</b><span>Waiting</span></div>
      <div class="tile"><b>111</b><span>Scored</span></div>
      <div class="tile"><b>57</b><span>Not submitted</span></div>
    </div>
    <table style="margin:0;font-size:8.6pt">
      <tr><th>State</th><th>Offices</th><th>Submitted</th><th>Status of latest</th><th>Date</th></tr>
      <tr><td>Sample State A</td><td>12</td><td>10</td><td><span class="pill g">Scored</span></td><td>12 Nov</td></tr>
      <tr><td>Sample State B</td><td>8</td><td>5</td><td><span class="pill a">Waiting</span></td><td>14 Nov</td></tr>
      <tr><td>Sample State C</td><td>6</td><td>0</td><td><span class="pill r">Not submitted</span></td><td>&mdash;</td></tr>
    </table>
  </div>
  ${bar("What this page shows, and does not show")}
  <ul>
    <li>It shows <b>counts and dates only</b>.</li>
    <li>It <b>never shows names</b> of officers or scorers, and it does not show the scores or remarks.</li>
    <li>It is a progress tracker. The detailed results are in the staff Google Sheet (page 7).</li>
  </ul>
  ${passcodeBox()}
</div>`

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

const saved = `
<div class="page">
  <h2>Where things are saved</h2>
  <p class="lead">Nothing is stored on your phone or computer. Everything is saved online, as soon as you press Submit or Save.</p>
  ${bar("Section 6 &mdash; Where things are saved")}
  ${flowSvg}
  <h3>Waiting and scored</h3>
  <ul>
    <li><b>Waiting.</b> The officer has submitted. Nobody has scored it yet. It is kept safely in the secure database.</li>
    <li><b>Scored.</b> A CSQAU scorer has saved the scores. The finished record is kept in the secure database as a backup <b>and</b> added as a finished row in the staff Google Sheet.</li>
  </ul>
  <h3>The reference code</h3>
  <p>Each submission gets a reference such as <span class="mono">NRS-1A2B3C4D</span>. It follows the submission everywhere: on the scoring page, in the secure database and as a column in the staff Google Sheet. Quote it if you need help.</p>
  <h3>The Google Sheets are the reports</h3>
  <p>NRS uses the two Google Sheets as its reports. They are read by invitation only. The secure database is the safety copy behind the scenes: you never need to open it.</p>
  ${callout("<b>Why two copies?</b> If the sheet is briefly unavailable, nothing is lost. The scores are in the secure database, and the scorer can press <b>Resend</b> later.")}
</div>`

const faq = `
<div class="page">
  <h2>Who sees what, and fixes</h2>
  ${bar("Section 7 &mdash; Who can see what")}
  <table>
    <tr><th>Who</th><th>Taxpayer survey</th><th>Checklist form</th><th>Scoring page</th><th>Overview page</th><th>Google Sheets</th></tr>
    <tr><td><b>The public</b></td><td>Fill in</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td></tr>
    <tr><td><b>Officers</b></td><td>Fill in</td><td>Fill in (no scores shown)</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td></tr>
    <tr><td><b>CSQAU scorers</b></td><td>Fill in</td><td>Open</td><td>Review and score (passcode)</td><td>View (passcode)</td><td>By invitation</td></tr>
    <tr><td><b>The NRS team</b></td><td>Fill in</td><td>Open</td><td>&mdash;</td><td>View (passcode)</td><td>By invitation</td></tr>
  </table>
  ${bar("Questions and fixes")}
  <h3>I am locked out for 15 minutes</h3>
  <p>That happens after 5 wrong passcodes. Wait 15 minutes, then type the passcode carefully. Do not ask others for the passcode; ask the CSQAU lead.</p>
  <h3>I picked the wrong office</h3>
  <p>Tell the CSQAU lead the reference code. Do not submit a second form. The scorer can check which submission is the right one.</p>
  <h3>I scored the wrong submission</h3>
  <p>Stop and tell the CSQAU lead straight away, with the reference code. Scores cannot be changed on the page once saved, so the team needs to correct it.</p>
  <h3>It says someone else already scored this submission</h3>
  <p>This &ldquo;scored twice&rdquo; message means scores were already saved for this reference. Nothing is overwritten. Choose another waiting submission, or check with your colleague.</p>
  <h3>&ldquo;Sheet update failed&rdquo; and the Resend button</h3>
  <p>Your scores are safe. Press <b>Resend to sheet</b>. If it still fails, wait a few minutes and try again, then tell the CSQAU lead.</p>
  <h3>The QR code will not scan</h3>
  <p>Type the link instead (page 9). Hold the phone steady, in good light, about 20 cm from the code.</p>
  <h3>The page will not load</h3>
  <p>Try again. The first load after a quiet period can be slow. Wait a few seconds and refresh.</p>
</div>`

const links = `
<div class="page">
  <h2>All the links</h2>
  <p class="lead">Every link below is clickable in the PDF.</p>
  ${bar("Section 8 &mdash; All the links")}
  <table>
    <tr><th style="width:23%">What</th><th>Link</th><th style="width:19%">Who can open it</th></tr>
    <tr><td><b>Taxpayer survey</b></td><td>${link(BASE + "/taxpayer")}<br><span class="small">Short link, used by the QR: ${link(BASE + "/t")}</span></td><td>Public</td></tr>
    <tr><td><b>Service Optimization Checklist</b></td><td>${link(BASE + "/staff")}<br><span class="small">Short link, used by the QR: ${link(BASE + "/s")}</span></td><td>Public link, meant for NRS staff</td></tr>
    <tr><td><b>Scoring page</b></td><td>${link(BASE + "/staff/score")}</td><td>Passcode needed</td></tr>
    <tr><td><b>Submissions overview</b></td><td>${link(BASE + "/staff/overview")}<br><span class="small">Live shortly.</span></td><td>Passcode needed</td></tr>
    <tr><td><b>Taxpayer sheet</b></td><td>${link(TAXPAYER_SHEET)}</td><td>By invitation only</td></tr>
    <tr><td><b>Staff sheet</b></td><td>${link(STAFF_SHEET)}</td><td>By invitation only</td></tr>
  </table>
  ${callout("<b>Old address.</b> The earlier address, <b>survey.dako.studio</b>, still works. It forwards to the new one, so QR codes printed earlier keep working.")}
  ${passcodeBox()}
  <h3>Printed QR codes</h3>
  <p>The QR codes point to the short links (<span class="mono">/t</span> and <span class="mono">/s</span>). If NRS ever moves a form, the short links can be pointed somewhere new, and the printed posters keep working.</p>
</div>`

const appendix = `
<div class="page">
  <h2>For IT: how it is built</h2>
  ${bar("Technical appendix")}
  <table>
    <tr><th style="width:26%">Part</th><th>Details</th></tr>
    <tr><td><b>Hosting</b></td><td>Vercel, project <span class="mono">nrs-service-surveys</span>. Production deploys from the <span class="mono">main</span> branch of ${link(REPO)}.</td></tr>
    <tr><td><b>Application</b></td><td>Next.js and TypeScript.</td></tr>
    <tr><td><b>Database</b></td><td>Neon, added through the Vercel Marketplace. Resource <span class="mono">nrs-surveys-prod</span> for production; <span class="mono">nrs-surveys-dev</span> for preview and development.</td></tr>
    <tr><td><b>Reports</b></td><td>Google Sheets, fed by Google Apps Script web apps. The script files are in the repository under <span class="mono">scripts/staff-sheet</span> and <span class="mono">scripts/taxpayer-sheet</span>.</td></tr>
    <tr><td><b>DNS</b></td><td>The <span class="mono">dako.studio</span> domain is on Cloudflare. The <span class="mono">nrssurvey</span> and <span class="mono">survey</span> records point at Vercel.</td></tr>
    <tr><td><b>Short links</b></td><td><span class="mono">/t</span> and <span class="mono">/s</span> redirect to the forms and can be re-pointed without reprinting QR codes.</td></tr>
  </table>
  <h3>Environment variables (names only)</h3>
  <table>
    <tr><td class="mono">CSQAU_ACCESS_CODE</td><td>The scoring and overview passcode</td></tr>
    <tr><td class="mono">DATABASE_URL</td><td>Connection to the secure database</td></tr>
    <tr><td class="mono">NRS_SPAFF_WEBHOOK_URL</td><td>Staff sheet hook (and <span class="mono">NRS_SPAFF_WEBHOOK_URL_BACKUP</span>)</td></tr>
    <tr><td class="mono">NRS_TAXPAYER_WEBHOOK_URL</td><td>Taxpayer sheet hook (and <span class="mono">NRS_TAXPAYER_WEBHOOK_URL_BACKUP</span>)</td></tr>
    <tr><td class="mono">SHORTLINK_TAXPAYER_URL</td><td>Where <span class="mono">/t</span> goes</td></tr>
    <tr><td class="mono">SHORTLINK_STAFF_URL</td><td>Where <span class="mono">/s</span> goes</td></tr>
  </table>
  <p class="small">Values are set in the Vercel project settings and are never stored in this guide or in the repository.</p>
  <h3>Checks before a release</h3>
  <p><span class="mono">npm run lint</span> &nbsp;&middot;&nbsp; <span class="mono">npx tsc --noEmit</span> &nbsp;&middot;&nbsp; <span class="mono">npm run build</span> &nbsp;&middot;&nbsp; <span class="mono">npm test</span></p>
  ${callout("<b>Contact:</b> the system administrator at the Customer Service Group.")}
</div>`

const pages = [cover, glance, taxpayer, step1, step2, step3, saved, faq, links, appendix]
const total = pages.length
const body = pages
  .map((p, i) => (p.includes("data-nofoot") ? p : p.replace(/<\/div>\s*$/, `${foot(i + 1, total)}</div>`)))
  .join("\n")

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>How the NRS Service Surveys work</title>
<style>${css}</style></head><body>
${body}
</body></html>`

writeFileSync(outFile, html)
console.log(`wrote ${outFile} (${(html.length / 1024).toFixed(0)} KB, ${total} pages)`)
