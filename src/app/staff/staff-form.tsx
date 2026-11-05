"use client"

import { useState } from "react"
import Link from "next/link"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  RadioPills,
  TextField,
  QuestionLabel,
  SubmitButton,
  SuccessState,
} from "../form-controls"
import { TaxOfficeSelect } from "../tax-office-select"
import { isValidTaxOffice } from "@/lib/tax-offices"
import { NOT_APPLICABLE, SECTIONS, YES_NO } from "@/lib/staff-sections"

const staffSchema = z.object({
  name: z.string().min(1, "Required"),
  ir: z.string().min(1, "Required"),
  rank: z.string().min(1, "Required"),
  phone: z.string().min(1, "Required"),
  email: z.string().min(1, "Required"),
})

const formSchema = z.object({
  tax_office: z
    .string()
    .min(1, "Please select the tax office")
    .refine(isValidTaxOffice, "Please select a tax office from the list"),
  sections: z
    .array(
      z.object({
        status: z.string().min(1, "Please select YES or NO"),
        remarks: z.string().max(2000).optional(),
      })
    )
    .length(SECTIONS.length),
  staff: z.array(staffSchema).min(1, "Add at least one staff member"),
})

type FormValues = z.infer<typeof formSchema>

const DEFAULTS: FormValues = {
  tax_office: "",
  sections: SECTIONS.map((s) => ({ status: s.listOnly ? NOT_APPLICABLE : "", remarks: "" })),
  staff: [{ name: "", ir: "", rank: "", phone: "", email: "" }],
}

// Builds the body for POST /api/staff (stage 1: answers only, no scores or
// sign-offs). Shape matches `stage1Schema` in src/lib/staff-schema.ts.
export function buildStage1Payload(values: FormValues) {
  return {
    tax_office: values.tax_office,
    sections: values.sections.map((s) => ({
      status: s.status,
      remarks: s.remarks ?? "",
    })),
    staff: values.staff.map((m) => ({
      name: m.name,
      ir: m.ir,
      rank: m.rank,
      phone: m.phone,
      email: m.email,
    })),
  }
}

export function StaffForm() {
  const [submittedRef, setSubmittedRef] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    handleSubmit,
    watch,
    setValue,
    control,
    reset: resetForm,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: DEFAULTS,
  })

  const { fields: staffFields, append, remove } = useFieldArray({ control, name: "staff" })

  const values = watch()

  async function onSubmit(data: FormValues) {
    setSubmitting(true)
    setServerError(null)
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildStage1Payload(data)),
      })
      const json = (await res.json().catch(() => ({}))) as { error?: string; reference?: string }
      if (!res.ok) throw new Error(json.error ?? "Submission failed")
      if (!json.reference) throw new Error("Submission saved but no reference was returned")
      setSubmittedRef(json.reference)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  function reset() {
    setSubmittedRef(null)
    setServerError(null)
    resetForm(DEFAULTS)
  }

  if (submittedRef !== null)
    return (
      <SuccessState
        title="Checklist submitted!"
        body={`Reference: ${submittedRef}. It is now waiting for the CSQAU scorer.`}
        onReset={reset}
      />
    )

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="nrs-scorer-banner">
        <p className="nrs-scorer-banner__text">
          Officers: just fill in the checklist below and submit. Scorers use this button (the
          scoring page asks for a passcode).
        </p>
        <Link href="/staff/score" className="nrs-scorer-banner__link">
          CSQAU scorer? Open the scoring page
        </Link>
      </div>

      <div className="nrs-form-group">
        <QuestionLabel>Tax Office</QuestionLabel>
        <TaxOfficeSelect
          value={values.tax_office}
          onChange={(v) => setValue("tax_office", v, { shouldValidate: true })}
          error={errors.tax_office?.message}
        />
      </div>

      <div className="nrs-form-divider" />

      <div className="nrs-check-table">
        <div className="nrs-check-head" aria-hidden="true">
          <div>S/N</div>
          <div>Issues</div>
          <div>Yes / No</div>
          <div>Remarks / actions required</div>
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

            {section.listOnly ? (
              <div className="nrs-check-heading-note">
                Attach the list of staff below.
              </div>
            ) : (
              <>
            <div>
              <span className="nrs-check-cell__label">Status</span>
              <RadioPills
                name={`sections.${i}.status`}
                options={YES_NO}
                inline
                value={values.sections[i]?.status ?? ""}
                onChange={(v) => setValue(`sections.${i}.status`, v, { shouldValidate: true })}
                error={errors.sections?.[i]?.status?.message}
              />
            </div>

            <div>
              <span className="nrs-check-cell__label">Remarks / actions required</span>
              <textarea
                className="nrs-textarea"
                style={{ minHeight: 70 }}
                maxLength={2000}
                value={values.sections[i]?.remarks ?? ""}
                onChange={(e) => setValue(`sections.${i}.remarks`, e.target.value)}
              />
            </div>
              </>
            )}

            {section.key === "s2" && (
              <div className="nrs-check-extra">
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
                  {staffFields.map((field, idx) => (
                    <div
                      key={field.id}
                      style={{ border: "2px solid var(--nrs-gray-300)", borderRadius: "var(--nrs-r-md)", padding: 16 }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: "var(--nrs-navy)" }}>
                          Staff {idx + 1}
                        </span>
                        {staffFields.length > 1 && (
                          <button
                            type="button"
                            onClick={() => remove(idx)}
                            style={{ background: "none", border: "none", color: "var(--nrs-red)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
                        {(["name", "ir", "rank", "phone", "email"] as const).map((f) => (
                          <Controller
                            key={f}
                            control={control}
                            name={`staff.${idx}.${f}`}
                            render={({ field: rhf, fieldState }) => (
                              <TextField
                                label={f === "ir" ? "IR" : f[0].toUpperCase() + f.slice(1)}
                                value={rhf.value}
                                onChange={rhf.onChange}
                                error={fieldState.error?.message}
                              />
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="nrs-btn nrs-btn--outline"
                    style={{ alignSelf: "flex-start", fontSize: 13, padding: "8px 16px" }}
                    onClick={() => append({ name: "", ir: "", rank: "", phone: "", email: "" })}
                  >
                    + Add staff member
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="nrs-form-divider" />

      <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start", paddingTop: 8 }}>
        {serverError && <p className="nrs-field-error" style={{ margin: 0 }}>{serverError}</p>}
        <SubmitButton submitting={submitting} label="Submit Checklist" />
        <p className="nrs-submit-note">
          <svg viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          For official use by the Customer Service Quality Assurance Unit.
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </form>
  )
}
