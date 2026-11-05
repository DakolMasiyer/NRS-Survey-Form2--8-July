"use client"

import Link from "next/link"
import { useRef, useState } from "react"
import { QuestionLabel, SelectField, TextField } from "../../form-controls"
import { TaxOfficeSelect } from "../../tax-office-select"
import { SignatoryBlock } from "../signatory-block"
import { averageScore } from "@/lib/score"
import { SECTIONS } from "@/lib/staff-sections"
import { scoringSchema, type Signatory } from "@/lib/staff-schema"

type VisitSummary = { id: string; submitted_at: string; first_staff_name: string }
type StaffMember = { name: string; ir: string; rank: string; phone: string; email: string }
type Visit = {
  id: string
  tax_office: string
  submitted_at: string
  payload: {
    tax_office: string
    sections: { status: string; remarks?: string }[]
    staff: StaffMember[]
  }
}
type SignoffKey = "checked_by" | "head_tpsu" | "controller"
type Signoffs = Record<SignoffKey, Signatory>
type FieldErrors = Partial<Record<keyof Signatory, { message?: string }>>

type ApiResult = { status: number; body: Record<string, unknown> }

const SIGNOFF_TITLES: [SignoffKey, string][] = [
  ["checked_by", "Checked by (CSQAU)"],
  ["head_tpsu", "Head TPSU"],
  ["controller", "Tax Controller / State Monitor"],
]
const SIGNATORY_FIELDS: (keyof Signatory)[] = ["name", "ir_rank", "phone", "email"]
const emptySignatory = (): Signatory => ({ name: "", ir_rank: "", phone: "", email: "" })
const emptySignoffs = (): Signoffs => ({
  checked_by: emptySignatory(),
  head_tpsu: emptySignatory(),
  controller: emptySignatory(),
})
const emptyScores = () => SECTIONS.map(() => "")

const REVOKED = "The access code is no longer accepted. Enter it again."

const dateFormat = new Intl.DateTimeFormat("en-NG", {
  timeZone: "Africa/Lagos",
  dateStyle: "medium",
  timeStyle: "short",
})
function formatWhen(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid submission time: ${iso}`)
  return dateFormat.format(d)
}

function errorText(body: Record<string, unknown>, fallback: string) {
  return typeof body.error === "string" ? body.error : fallback
}

function waitText(body: Record<string, unknown>, fallback: string) {
  const message = errorText(body, fallback)
  const secs = body.retryAfterSeconds
  if (typeof secs !== "number") return message
  const wait = secs >= 60 ? `${Math.ceil(secs / 60)} minute(s)` : `${secs} second(s)`
  return `${message} Please wait ${wait} before trying again.`
}

function readVisit(body: Record<string, unknown>): Visit {
  const payload = body.payload as Visit["payload"] | undefined
  if (
    typeof body.id !== "string" ||
    !payload ||
    !Array.isArray(payload.sections) ||
    payload.sections.length !== SECTIONS.length ||
    !Array.isArray(payload.staff)
  ) {
    throw new Error("The server returned a submission in an unexpected format")
  }
  return body as unknown as Visit
}

type Phase =
  | { kind: "gate" }
  | { kind: "picker" }
  | { kind: "review"; visit: Visit }
  | { kind: "unsynced"; id: string; total: number }
  | { kind: "done"; total: number }

export function ScoreApp() {
  const [phase, setPhase] = useState<Phase>({ kind: "gate" })
  // The CSQAU code lives only in React state; it is never persisted.
  const [code, setCode] = useState<string | null>(null)
  const [codeInput, setCodeInput] = useState("")
  const [gateMessage, setGateMessage] = useState<string | null>(null)
  const [unlocking, setUnlocking] = useState(false)

  const [office, setOffice] = useState("")
  const [visits, setVisits] = useState<VisitSummary[] | null>(null)
  const [loadingList, setLoadingList] = useState(false)
  const [loadingVisit, setLoadingVisit] = useState(false)
  const [pickerMessage, setPickerMessage] = useState<string | null>(null)
  const [officeKey, setOfficeKey] = useState(0)
  const listRequest = useRef(0)

  const [scores, setScores] = useState<string[]>(emptyScores)
  const [signoffs, setSignoffs] = useState<Signoffs>(emptySignoffs)
  const [scoreErrors, setScoreErrors] = useState<(string | undefined)[]>([])
  const [signoffErrors, setSignoffErrors] = useState<Partial<Record<SignoffKey, FieldErrors>>>({})
  const [saving, setSaving] = useState(false)
  const [reviewMessage, setReviewMessage] = useState<string | null>(null)
  const [resending, setResending] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)

  async function call(path: string, body: unknown, withCode: string | null): Promise<ApiResult> {
    const res = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(withCode !== null && { "x-csqau-code": withCode }),
      },
      body: JSON.stringify(body),
    })
    const parsed: unknown = await res.json().catch(() => ({}))
    const json = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {}
    return { status: res.status, body: json }
  }

  function backToGate(message: string) {
    setCode(null)
    setPhase({ kind: "gate" })
    setGateMessage(message)
    setVisits(null)
    setOffice("")
    setOfficeKey((k) => k + 1)
  }

  function resetReview() {
    setScores(emptyScores())
    setSignoffs(emptySignoffs())
    setScoreErrors([])
    setSignoffErrors({})
    setReviewMessage(null)
    setResendMessage(null)
  }

  async function unlock() {
    setUnlocking(true)
    setGateMessage(null)
    try {
      const { status, body } = await call("/api/staff/unlock", { code: codeInput }, null)
      if (status === 200 && body.ok === true) {
        setCode(codeInput)
        setCodeInput("")
        setPhase({ kind: "picker" })
      } else if (status === 429) {
        setGateMessage(waitText(body, "Too many attempts."))
      } else {
        setGateMessage(errorText(body, "Could not verify the access code"))
      }
    } catch (err) {
      setGateMessage(err instanceof Error ? err.message : "Could not verify the access code")
    } finally {
      setUnlocking(false)
    }
  }

  async function loadVisits(taxOffice: string, activeCode: string) {
    const requestId = ++listRequest.current
    setLoadingList(true)
    setPickerMessage(null)
    try {
      const { status, body } = await call("/api/staff/pending", { tax_office: taxOffice }, activeCode)
      if (requestId !== listRequest.current) return
      if (status === 403) return backToGate(errorText(body, REVOKED))
      if (status === 429) {
        setVisits(null)
        setPickerMessage(waitText(body, "Too many requests."))
        return
      }
      if (status !== 200 || !Array.isArray(body.visits)) {
        setVisits(null)
        setPickerMessage(errorText(body, "Could not load pending submissions"))
        return
      }
      setVisits(body.visits as VisitSummary[])
    } catch (err) {
      if (requestId !== listRequest.current) return
      setVisits(null)
      setPickerMessage(err instanceof Error ? err.message : "Could not load pending submissions")
    } finally {
      if (requestId === listRequest.current) setLoadingList(false)
    }
  }

  function chooseOffice(value: string) {
    setOffice(value)
    setVisits(null)
    setPickerMessage(null)
    if (!value || code === null) {
      listRequest.current++
      setLoadingList(false)
      return
    }
    void loadVisits(value, code)
  }

  async function chooseVisit(id: string) {
    if (!id || code === null) return
    setLoadingVisit(true)
    setPickerMessage(null)
    try {
      const { status, body } = await call(`/api/staff/pending/${encodeURIComponent(id)}`, {}, code)
      if (status === 403) return backToGate(errorText(body, REVOKED))
      if (status === 409 || status === 404) {
        await loadVisits(office, code)
        setPickerMessage(errorText(body, status === 409 ? "already scored" : "Submission not found"))
        return
      }
      if (status === 429) {
        setPickerMessage(waitText(body, "Too many requests."))
        return
      }
      if (status !== 200) {
        setPickerMessage(errorText(body, "Could not load the submission"))
        return
      }
      resetReview()
      setPhase({ kind: "review", visit: readVisit(body) })
    } catch (err) {
      setPickerMessage(err instanceof Error ? err.message : "Could not load the submission")
    } finally {
      setLoadingVisit(false)
    }
  }

  function backToPicker() {
    setPhase({ kind: "picker" })
    if (code !== null && office) void loadVisits(office, code)
  }

  function validate(): boolean {
    const nextScoreErrors = scores.map((v) => {
      if (v.trim() === "") return "Enter a score"
      const n = Number(v)
      if (!Number.isFinite(n) || n < 0 || n > 100) return "Score must be between 0 and 100"
      return undefined
    })
    const nextSignoffErrors: Partial<Record<SignoffKey, FieldErrors>> = {}
    for (const [key] of SIGNOFF_TITLES) {
      for (const f of SIGNATORY_FIELDS) {
        if (signoffs[key][f].trim() === "") {
          nextSignoffErrors[key] = { ...nextSignoffErrors[key], [f]: { message: "Required" } }
        }
      }
    }
    setScoreErrors(nextScoreErrors)
    setSignoffErrors(nextSignoffErrors)
    return nextScoreErrors.every((e) => e === undefined) && Object.keys(nextSignoffErrors).length === 0
  }

  async function save(visit: Visit) {
    if (code === null || saving) return
    setReviewMessage(null)
    if (!validate()) {
      setReviewMessage("Please fix the highlighted fields before saving.")
      return
    }
    // The request carries no total: the server recomputes it.
    const checked = scoringSchema.safeParse({ id: visit.id, scores: scores.map(Number), signoffs })
    if (!checked.success) {
      setReviewMessage(`The scoring details are not valid: ${checked.error.issues[0]?.message ?? "unknown problem"}`)
      return
    }
    setSaving(true)
    try {
      const { status, body } = await call("/api/staff/score", checked.data, code)
      if (status === 200 && body.saved === true && typeof body.total_score === "number") {
        if (body.sheetSynced === true) setPhase({ kind: "done", total: body.total_score })
        else setPhase({ kind: "unsynced", id: visit.id, total: body.total_score })
      } else if (status === 409) {
        setPhase({ kind: "picker" })
        await loadVisits(office, code)
        setPickerMessage("Someone else already scored this submission")
      } else if (status === 403) {
        backToGate(errorText(body, REVOKED))
      } else if (status === 429) {
        setReviewMessage(waitText(body, "Too many requests."))
      } else {
        setReviewMessage(errorText(body, "Could not save the scores"))
      }
    } catch (err) {
      setReviewMessage(err instanceof Error ? err.message : "Could not save the scores")
    } finally {
      setSaving(false)
    }
  }

  async function resend(id: string, total: number) {
    if (code === null) return
    setResending(true)
    setResendMessage(null)
    try {
      const { status, body } = await call(`/api/staff/score/${encodeURIComponent(id)}/resend`, {}, code)
      if (status === 200 && body.sheetSynced === true) setPhase({ kind: "done", total })
      else if (status === 403) backToGate(errorText(body, REVOKED))
      else setResendMessage(errorText(body, "Could not update the sheet"))
    } catch (err) {
      setResendMessage(err instanceof Error ? err.message : "Could not update the sheet")
    } finally {
      setResending(false)
    }
  }

  // ---------------------------------------------------------------- gate
  if (phase.kind === "gate") {
    return (
      <div style={{ border: "2px solid var(--nrs-gray-300)", borderRadius: "var(--nrs-r-md)", padding: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "var(--nrs-navy)", marginBottom: 6 }}>
          CSQAU scoring access
        </div>
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--nrs-gray-700)" }}>
          This page is for the visiting Customer Service Quality Assurance Unit checker. Enter the access code to
          review and score submitted checklists.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!unlocking && codeInput !== "") void unlock()
          }}
          style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}
        >
          <div style={{ flex: "1 1 220px" }}>
            <TextField
              label="Access code"
              type="password"
              value={codeInput}
              onChange={setCodeInput}
              error={gateMessage ?? undefined}
            />
          </div>
          <button
            type="submit"
            className="nrs-btn nrs-btn--outline"
            style={{ fontSize: 13, padding: "12px 16px" }}
            disabled={unlocking || codeInput === ""}
          >
            {unlocking ? "Checking…" : "Unlock"}
          </button>
        </form>
      </div>
    )
  }

  // ---------------------------------------------------------------- finished states
  if (phase.kind === "done") {
    return (
      <div className="nrs-form-success">
        <h3>Scored. Total {phase.total}%</h3>
        <p>The scores and sign-offs have been recorded.</p>
        <button
          type="button"
          className="nrs-btn-submit"
          onClick={() => {
            resetReview()
            backToPicker()
          }}
        >
          Score another
        </button>
      </div>
    )
  }

  if (phase.kind === "unsynced") {
    return (
      <div className="nrs-form-success">
        <h3>Scored. Total {phase.total}%</h3>
        <p>Saved, but the sheet update failed. The scores are safe; resend them to the sheet.</p>
        {resendMessage && <p className="nrs-field-error">{resendMessage}</p>}
        <button
          type="button"
          className="nrs-btn-submit"
          disabled={resending}
          onClick={() => void resend(phase.id, phase.total)}
        >
          {resending ? "Sending…" : "Resend to sheet"}
        </button>
      </div>
    )
  }

  // ---------------------------------------------------------------- picker
  if (phase.kind === "picker") {
    return (
      <div>
        <p style={{ margin: "0 0 16px", fontSize: 13 }}>
          <Link href="/staff/overview" className="nrs-ov-link">
            See who has submitted
          </Link>
        </p>
        <div className="nrs-form-group">
          <QuestionLabel>Tax Office</QuestionLabel>
          <TaxOfficeSelect key={officeKey} value={office} onChange={chooseOffice} />
        </div>

        {pickerMessage && <p className="nrs-field-error">{pickerMessage}</p>}
        {loadingList && <p style={{ fontSize: 13, color: "var(--nrs-gray-700)" }}>Loading submissions…</p>}

        {visits !== null && visits.length === 0 && (
          <p style={{ fontSize: 14, color: "var(--nrs-gray-700)" }}>No pending submissions for this office</p>
        )}
        {visits !== null && visits.length > 0 && (
          <SelectField
            label="Pending submissions"
            value=""
            onChange={(id) => void chooseVisit(id)}
            options={visits.map((v) => ({
              value: v.id,
              label: `${formatWhen(v.submitted_at)} — ${v.first_staff_name}`,
            }))}
            placeholder={loadingVisit ? "Loading…" : "Select a submission"}
            disabled={loadingVisit}
          />
        )}
      </div>
    )
  }

  // ---------------------------------------------------------------- review
  const { visit } = phase
  const total = averageScore(scores)

  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--nrs-gray-700)", marginTop: 0 }}>
        <strong>{visit.tax_office}</strong> · submitted {formatWhen(visit.submitted_at)}
      </p>

      <div className="nrs-check-table nrs-check-table--scored">
        <div className="nrs-check-head" aria-hidden="true">
          <div>S/N</div>
          <div>Issues</div>
          <div>Yes / No</div>
          <div>Remarks / actions required</div>
          <div>Score (%)</div>
        </div>

        {SECTIONS.map((section, i) => (
          <div key={section.key} className="nrs-check-row">
            <div className="nrs-check-sn">{i + 1}</div>

            <div>
              <div className="nrs-check-title">{section.title}</div>
              {section.items && (
                <ul className="nrs-check-items">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <span className="nrs-check-cell__label">Status</span>
              <strong>{visit.payload.sections[i].status}</strong>
            </div>

            <div>
              <span className="nrs-check-cell__label">Remarks / actions required</span>
              <div style={{ whiteSpace: "pre-wrap", fontSize: 14 }}>{visit.payload.sections[i].remarks ?? ""}</div>
            </div>

            <div className="nrs-check-score">
              <span className="nrs-check-cell__label">Score (%)</span>
              <TextField
                type="number"
                value={scores[i]}
                onChange={(v) => setScores((prev) => prev.map((s, idx) => (idx === i ? v : s)))}
                placeholder="0–100"
                error={scoreErrors[i]}
              />
            </div>

            {section.key === "s2" && (
              <div className="nrs-check-extra">
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {visit.payload.staff.map((member, idx) => (
                    <div
                      key={idx}
                      style={{ border: "2px solid var(--nrs-gray-300)", borderRadius: "var(--nrs-r-md)", padding: 16 }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 800, color: "var(--nrs-navy)", marginBottom: 8 }}>
                        Staff {idx + 1}
                      </div>
                      <dl
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                          gap: 8,
                          margin: 0,
                          fontSize: 13,
                        }}
                      >
                        {(
                          [
                            ["Name", member.name],
                            ["IR", member.ir],
                            ["Rank", member.rank],
                            ["Phone", member.phone],
                            ["Email", member.email],
                          ] as const
                        ).map(([label, v]) => (
                          <div key={label}>
                            <dt style={{ fontWeight: 600, color: "var(--nrs-gray-700)" }}>{label}</dt>
                            <dd style={{ margin: 0 }}>{v}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div
        style={{
          background: "var(--nrs-gray-100)",
          border: "2px solid var(--nrs-gray-300)",
          borderRadius: "var(--nrs-r-md)",
          padding: "18px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 28,
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 800, color: "var(--nrs-navy)" }}>
          TOTAL SCORE (preview; the server recomputes it)
        </span>
        <span style={{ fontSize: 28, fontWeight: 800, color: "var(--nrs-red)" }}>
          {total === null ? "—" : `${total}%`}
        </span>
      </div>

      <div className="nrs-form-group">
        <QuestionLabel>Sign-off</QuestionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {SIGNOFF_TITLES.map(([key, title]) => (
            <SignatoryBlock
              key={key}
              title={title}
              value={signoffs[key]}
              onChange={(field, v) =>
                setSignoffs((prev) => ({ ...prev, [key]: { ...prev[key], [field]: v } }))
              }
              errors={signoffErrors[key]}
            />
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start", paddingTop: 8 }}>
        {reviewMessage && <p className="nrs-field-error" style={{ margin: 0 }}>{reviewMessage}</p>}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button type="button" className="nrs-btn-submit" disabled={saving} onClick={() => void save(visit)}>
            {saving ? "Saving…" : "Save scores"}
          </button>
          <button type="button" className="nrs-btn nrs-btn--outline" disabled={saving} onClick={backToPicker}>
            Back to list
          </button>
        </div>
      </div>
    </div>
  )
}
