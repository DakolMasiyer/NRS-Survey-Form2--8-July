"use client"

import { useState } from "react"
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
import { averageScore } from "@/lib/score"

const YES_NO = ["YES", "NO"]

const SECTIONS: { key: string; title: string; items?: string[] }[] = [
  {
    key: "s1",
    title: "Ambience (Is the unit conducive?)",
    items: ["Accommodation", "Setting"],
  },
  {
    key: "s2",
    title: "Number of staff",
  },
  {
    key: "s3",
    title: "Availability of working tools",
    items: [
      "Technical forms",
      "Computers",
      "Network connection",
      "Printers",
      "Photocopier",
      "Scanner",
      "Dedicated phone line",
      "Office e-mail address",
    ],
  },
  {
    key: "s4",
    title: "Educational & information materials",
    items: [
      "Availability of educational materials",
      "Availability of information materials",
      "Display rack for educational/informative materials",
    ],
  },
  {
    key: "s5",
    title: "Technical / non-technical registers maintained in the unit",
    items: [
      "VAT",
      "TCC",
      "Enquiries",
      "Complaints",
      "Dispatch to other units",
      "Tax consultants",
      "File transfer to other offices",
    ],
  },
  {
    key: "s6",
    title: "Progress report on REV 360 implementation",
    items: [
      "Tax ID registration",
      "Updates",
      "Self-service station utilization",
      "Monthly filing",
      "Annual filing",
      "Withholding Tax",
      "Withholding VAT",
      "Gap between commenced and active companies",
      "Stamp duties",
      "Review",
    ],
  },
  {
    key: "s7",
    title: "Relationship management programmes held by the office",
    items: ["Taxpayer workshops", "Tax clinics", "Road shows", "Tax Thursday"],
  },
  {
    key: "s8",
    title: "Newly registered taxpayers",
    items: [
      "Number of newly registered taxpayers in the immediate preceding month",
      "Gap between number of taxpayers on the office master list / register on REV 360",
    ],
  },
  {
    key: "s9",
    title: "Taxpayer complaints handling and resolution",
    items: [
      "Number received in the previous month",
      "Number resolved",
      "List of cases escalated to management",
    ],
  },
  {
    key: "s10",
    title: "Any other issues for Management information",
  },
]

const staffSchema = z.object({
  name: z.string().min(1, "Required"),
  ir: z.string().min(1, "Required"),
  rank: z.string().min(1, "Required"),
  phone: z.string().min(1, "Required"),
  email: z.string().min(1, "Required"),
})

const sectionSchema = z.object({
  status: z.string().min(1, "Please select YES or NO"),
  remarks: z.string().max(2000).optional(),
  score: z
    .string()
    .min(1, "Enter a score")
    .refine((v) => {
      const n = Number(v)
      return Number.isFinite(n) && n >= 0 && n <= 100
    }, "Score must be between 0 and 100"),
})

const signatorySchema = z.object({
  name: z.string().min(1, "Required"),
  ir_rank: z.string().min(1, "Required"),
  phone: z.string().min(1, "Required"),
  email: z.string().min(1, "Required"),
})

const schema = z.object({
  tax_office: z
    .string()
    .min(1, "Please select the tax office")
    .refine(isValidTaxOffice, "Please select a tax office from the list"),
  sections: z.array(sectionSchema).length(SECTIONS.length),
  staff: z.array(staffSchema).min(1, "Add at least one staff member"),
  checked_by: signatorySchema,
  head_tpsu: signatorySchema,
  controller: signatorySchema,
})

type FormValues = z.infer<typeof schema>

const EMPTY_SIGNATORY = { name: "", ir_rank: "", phone: "", email: "" }
const DEFAULTS: FormValues = {
  tax_office: "",
  sections: SECTIONS.map(() => ({ status: "", remarks: "", score: "" })),
  staff: [{ name: "", ir: "", rank: "", phone: "", email: "" }],
  checked_by: { ...EMPTY_SIGNATORY },
  head_tpsu: { ...EMPTY_SIGNATORY },
  controller: { ...EMPTY_SIGNATORY },
}

function SignatoryBlock({
  title,
  value,
  onChange,
  errors,
}: {
  title: string
  value: FormValues["checked_by"]
  onChange: (field: keyof FormValues["checked_by"], v: string) => void
  errors?: Partial<Record<keyof FormValues["checked_by"], { message?: string }>>
}) {
  return (
    <div style={{ border: "2px solid var(--nrs-gray-300)", borderRadius: "var(--nrs-r-md)", padding: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: "var(--nrs-navy)", marginBottom: 12 }}>{title}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <TextField label="Name" value={value.name} onChange={(v) => onChange("name", v)} error={errors?.name?.message} />
        <TextField label="IR / Rank" value={value.ir_rank} onChange={(v) => onChange("ir_rank", v)} error={errors?.ir_rank?.message} />
        <TextField label="Phone number" value={value.phone} onChange={(v) => onChange("phone", v)} error={errors?.phone?.message} />
        <TextField label="Email address" value={value.email} onChange={(v) => onChange("email", v)} error={errors?.email?.message} />
      </div>
    </div>
  )
}

export function StaffForm() {
  const [submitted, setSubmitted] = useState(false)
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
    resolver: zodResolver(schema),
    defaultValues: DEFAULTS,
  })

  const { fields: staffFields, append, remove } = useFieldArray({ control, name: "staff" })

  const values = watch()

  const totalScore = averageScore(values.sections.map((s) => s.score))

  async function onSubmit(data: FormValues) {
    setSubmitting(true)
    setServerError(null)
    try {
      const payload: Record<string, unknown> = {
        submitted_at: new Date().toISOString(),
        tax_office: data.tax_office,
      }
      SECTIONS.forEach((section, i) => {
        payload[`${section.key}_title`] = section.title
        payload[`${section.key}_status`] = data.sections[i].status
        payload[`${section.key}_remarks`] = data.sections[i].remarks ?? ""
        payload[`${section.key}_score`] = Number(data.sections[i].score)
      })
      payload.s2_staff = JSON.stringify(data.staff)
      payload.total_score = averageScore(data.sections.map((s) => s.score))
      for (const [prefix, sig] of [
        ["checked_by", data.checked_by],
        ["head_tpsu", data.head_tpsu],
        ["controller", data.controller],
      ] as const) {
        payload[`${prefix}_name`] = sig.name
        payload[`${prefix}_ir_rank`] = sig.ir_rank
        payload[`${prefix}_phone`] = sig.phone
        payload[`${prefix}_email`] = sig.email
      }

      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error((json as { error?: string }).error ?? "Submission failed")
      }
      setSubmitted(true)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  function reset() {
    setSubmitted(false)
    setServerError(null)
    resetForm(DEFAULTS)
  }

  if (submitted)
    return (
      <SuccessState
        title="Checklist submitted!"
        body="The service optimization visit report has been recorded by the Customer Service Quality Assurance Unit."
        onReset={reset}
      />
    )

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="nrs-form-group">
        <QuestionLabel>Tax Office</QuestionLabel>
        <TaxOfficeSelect
          value={values.tax_office}
          onChange={(v) => setValue("tax_office", v, { shouldValidate: true })}
          error={errors.tax_office?.message}
        />
      </div>

      <div className="nrs-form-divider" />

      {SECTIONS.map((section, i) => (
        <div key={section.key}>
          <div className="nrs-form-group">
            <QuestionLabel num={i + 1}>{section.title}</QuestionLabel>

            {section.items && (
              <ul style={{ margin: "0 0 12px 36px", fontSize: 13, color: "var(--nrs-gray-700)", lineHeight: 1.8 }}>
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}

            {section.key === "s2" && (
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
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--nrs-gray-700)", marginBottom: 6 }}>
                  Status
                </div>
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
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--nrs-gray-700)", marginBottom: 6 }}>
                  Remarks / actions required
                </div>
                <textarea
                  className="nrs-textarea"
                  style={{ minHeight: 70 }}
                  maxLength={2000}
                  value={values.sections[i]?.remarks ?? ""}
                  onChange={(e) => setValue(`sections.${i}.remarks`, e.target.value)}
                />
              </div>
              <div style={{ maxWidth: 200 }}>
                <TextField
                  label="Score (%)"
                  type="number"
                  value={values.sections[i]?.score ?? ""}
                  onChange={(v) => setValue(`sections.${i}.score`, v, { shouldValidate: true })}
                  placeholder="0–100"
                  error={errors.sections?.[i]?.score?.message}
                />
              </div>
            </div>
          </div>
          <div className="nrs-form-divider" />
        </div>
      ))}

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
          TOTAL SCORE (auto-computed average)
        </span>
        <span style={{ fontSize: 28, fontWeight: 800, color: "var(--nrs-red)" }}>
          {totalScore === null ? "—" : `${totalScore}%`}
        </span>
      </div>

      <div className="nrs-form-divider" />

      <div className="nrs-form-group">
        <QuestionLabel>Sign-off</QuestionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {(
            [
              ["checked_by", "Checked by"],
              ["head_tpsu", "Head TPSU"],
              ["controller", "Tax Controller / State Monitor"],
            ] as const
          ).map(([key, title]) => (
            <SignatoryBlock
              key={key}
              title={title}
              value={values[key]}
              onChange={(field, v) => setValue(`${key}.${field}`, v, { shouldValidate: true })}
              errors={errors[key]}
            />
          ))}
        </div>
        <p style={{ fontSize: 12, color: "var(--nrs-gray-500)", marginTop: 10 }}>
          Date is recorded automatically at submission time.
        </p>
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
