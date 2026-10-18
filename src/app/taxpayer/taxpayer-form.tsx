"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  RadioPills,
  CheckboxPills,
  TextField,
  QuestionLabel,
  SubmitButton,
  SuccessState,
} from "../form-controls"
import { TaxOfficeSelect } from "../tax-office-select"
import { isValidTaxOffice } from "@/lib/tax-offices"

const YES_NO = ["YES", "NO"]

const NON_COMPLIANCE_REASONS = [
  "I am not registered on Rev360",
  "My tax office is far away",
  "I have no idea how to file my taxes or what taxes I am expected to file",
  "I am worried about unfair assessments, arrears, penalties and interests",
  "Other",
]

const EASE_OPTIONS = ["VERY EASY", "EASY", "NOT EASY", "IMPOSSIBLE"]

const WAIT_OPTIONS = [
  "Less than 15 minutes",
  "15–30 minutes",
  "30 minutes to 1 hour",
  "1–2 hours",
  "More than 2 hours",
]

const SATISFACTION_OPTIONS = ["EXCELLENT", "VERY GOOD", "GOOD", "POOR", "VERY POOR"]

const REV360_COMFORT_OPTIONS = [
  "Very comfortable",
  "Comfortable",
  "Somewhat comfortable",
  "Not comfortable",
  "I have never used it",
]

export const schema = z
  .object({
    tax_office: z
      .string()
      .min(1, "Please select your tax office")
      .refine(isValidTaxOffice, "Please select a tax office from the list"),
    has_tax_id: z.string().optional(),
    tax_id: z.string().max(50).optional(),
    rc_bn: z.string().max(100).optional(),
    address: z.string().max(300).optional(),
    line_of_business: z.string().max(200).optional(),
    phone: z.string().max(50).optional(),
    email: z.string().max(200).optional(),
    tax_compliant: z.string().min(1, "Please select an option"),
    non_compliance_reasons: z.array(z.string()),
    non_compliance_other: z.string().max(500).optional(),
    ease_of_payment: z.string().min(1, "Please select an option"),
    wait_time: z.string().min(1, "Please select an option"),
    issue_resolved: z.string().min(1, "Please select an option"),
    resolution_satisfaction: z.string().min(1, "Please select an option"),
    knows_website: z.string().min(1, "Please select an option"),
    knows_contact_centre: z.string().min(1, "Please select an option"),
    knows_ussd: z.string().min(1, "Please select an option"),
    knows_tax_id_url: z.string().min(1, "Please select an option"),
    knows_rev360: z.string().min(1, "Please select an option"),
    rev360_comfort: z.string().optional(),
    knows_einvoicing: z.string().min(1, "Please select an option"),
    knows_social_media: z.string().min(1, "Please select an option"),
    suggestions: z.string().max(1000).optional(),
    contact_email: z.string().max(200).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.tax_compliant === "NO" && data.non_compliance_reasons.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["non_compliance_reasons"],
        message: "Please tick at least one reason",
      })
    }
  })

type FormValues = z.infer<typeof schema>

const DEFAULTS: FormValues = {
  tax_office: "",
  has_tax_id: "",
  tax_id: "",
  rc_bn: "",
  address: "",
  line_of_business: "",
  phone: "",
  email: "",
  tax_compliant: "",
  non_compliance_reasons: [],
  non_compliance_other: "",
  ease_of_payment: "",
  wait_time: "",
  issue_resolved: "",
  resolution_satisfaction: "",
  knows_website: "",
  knows_contact_centre: "",
  knows_ussd: "",
  knows_tax_id_url: "",
  knows_rev360: "",
  rev360_comfort: "",
  knows_einvoicing: "",
  knows_social_media: "",
  suggestions: "",
  contact_email: "",
}

const FAMILIARITY_ITEMS: { key: keyof FormValues; label: React.ReactNode }[] = [
  { key: "knows_website", label: <>Are you familiar with our NRS website? (www.nrs.gov.ng)</> },
  { key: "knows_contact_centre", label: <>Are you familiar with our NRS Contact Centre number? (02094602700)</> },
  { key: "knows_ussd", label: <>Are you familiar with our NRS USSD code *829#?</> },
  { key: "knows_tax_id_url", label: <>Are you familiar with the NRS Tax ID URL? (taxid.nrs.gov.ng)</> },
]

export function TaxpayerForm() {
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    handleSubmit,
    watch,
    setValue,
    reset: resetForm,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULTS,
  })

  const values = watch()

  const set = (name: keyof FormValues) => (v: string) =>
    setValue(name, v, { shouldValidate: true })

  async function onSubmit(data: FormValues) {
    setSubmitting(true)
    setServerError(null)
    try {
      const res = await fetch("/api/taxpayer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          non_compliance_reasons: data.non_compliance_reasons.join("; "),
          submitted_at: new Date().toISOString(),
        }),
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
        title="We thank you for your time and response!"
        body="Your response has been recorded. The Customer Service Group, Nigeria Revenue Service, uses your feedback to improve service delivery."
        onReset={reset}
      />
    )

  let q = 0
  const next = () => ++q

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="nrs-form-group">
        <QuestionLabel>Tax Office</QuestionLabel>
        <TaxOfficeSelect
          value={values.tax_office}
          onChange={set("tax_office")}
          error={errors.tax_office?.message}
        />
      </div>

      <div className="nrs-form-divider" />

      <div className="nrs-form-group">
        <QuestionLabel num={next()} optional>
          Does your company have a Tax ID (Tax Identification Number)?
        </QuestionLabel>
        <RadioPills
          name="has_tax_id"
          options={YES_NO}
          inline
          value={values.has_tax_id ?? ""}
          onChange={set("has_tax_id")}
          error={errors.has_tax_id?.message}
        />
        {values.has_tax_id === "YES" && (
          <div style={{ marginTop: 14 }}>
            <TextField
              label="Please provide your company's Tax ID (optional)"
              value={values.tax_id ?? ""}
              onChange={set("tax_id")}
              placeholder="Tax ID"
            />
          </div>
        )}
        {values.has_tax_id === "NO" && (
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
            <TextField label="RC / BN Number (optional)" value={values.rc_bn ?? ""} onChange={set("rc_bn")} />
            <TextField label="Business address (optional)" value={values.address ?? ""} onChange={set("address")} />
            <TextField label="Line of business (optional)" value={values.line_of_business ?? ""} onChange={set("line_of_business")} />
            <TextField label="Phone number (optional)" type="tel" value={values.phone ?? ""} onChange={set("phone")} />
            <TextField label="Email address (optional)" type="email" value={values.email ?? ""} onChange={set("email")} />
          </div>
        )}
      </div>

      <div className="nrs-form-divider" />

      <div className="nrs-form-group">
        <QuestionLabel num={next()}>Have you been tax compliant?</QuestionLabel>
        <RadioPills
          name="tax_compliant"
          options={YES_NO}
          inline
          value={values.tax_compliant}
          onChange={set("tax_compliant")}
          error={errors.tax_compliant?.message}
        />
        {values.tax_compliant === "NO" && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--nrs-gray-700)", marginBottom: 8 }}>
              Could you please let us know why? (tick all that apply)
            </div>
            <CheckboxPills
              options={NON_COMPLIANCE_REASONS}
              values={values.non_compliance_reasons}
              onChange={(v) => setValue("non_compliance_reasons", v, { shouldValidate: true })}
            />
            {errors.non_compliance_reasons?.message && (
              <p className="nrs-field-error">{errors.non_compliance_reasons.message}</p>
            )}
            {values.non_compliance_reasons.includes("Other") && (
              <div style={{ marginTop: 10 }}>
                <TextField
                  label="Please explain (optional)"
                  value={values.non_compliance_other ?? ""}
                  onChange={set("non_compliance_other")}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="nrs-form-divider" />

      <div className="nrs-form-group">
        <QuestionLabel num={next()}>
          Does NRS make it easy for you as a citizen to pay your taxes?
        </QuestionLabel>
        <RadioPills
          name="ease_of_payment"
          options={EASE_OPTIONS}
          value={values.ease_of_payment}
          onChange={set("ease_of_payment")}
          error={errors.ease_of_payment?.message}
        />
      </div>

      <div className="nrs-form-divider" />

      <div className="nrs-form-group">
        <QuestionLabel num={next()}>How long did you wait before someone helped you?</QuestionLabel>
        <RadioPills
          name="wait_time"
          options={WAIT_OPTIONS}
          value={values.wait_time}
          onChange={set("wait_time")}
          error={errors.wait_time?.message}
        />
      </div>

      <div className="nrs-form-divider" />

      <div className="nrs-form-group">
        <QuestionLabel num={next()}>Was your issue resolved?</QuestionLabel>
        <RadioPills
          name="issue_resolved"
          options={YES_NO}
          inline
          value={values.issue_resolved}
          onChange={set("issue_resolved")}
          error={errors.issue_resolved?.message}
        />
      </div>

      <div className="nrs-form-divider" />

      <div className="nrs-form-group">
        <QuestionLabel num={next()}>
          Rate your satisfaction with NRS in resolving your issues
        </QuestionLabel>
        <RadioPills
          name="resolution_satisfaction"
          options={SATISFACTION_OPTIONS}
          value={values.resolution_satisfaction}
          onChange={set("resolution_satisfaction")}
          error={errors.resolution_satisfaction?.message}
        />
      </div>

      <div className="nrs-form-divider" />

      {FAMILIARITY_ITEMS.map(({ key, label }) => (
        <div key={key}>
          <div className="nrs-form-group">
            <QuestionLabel num={next()}>{label}</QuestionLabel>
            <RadioPills
              name={key}
              options={YES_NO}
              inline
              value={(values[key] as string) ?? ""}
              onChange={set(key)}
              error={errors[key]?.message as string | undefined}
            />
          </div>
          <div className="nrs-form-divider" />
        </div>
      ))}

      <div className="nrs-form-group">
        <QuestionLabel num={next()}>
          Are you familiar with the new NRS Rev360 URL (selfservice.nrs.gov.ng) for filing and payment of taxes?
        </QuestionLabel>
        <RadioPills
          name="knows_rev360"
          options={YES_NO}
          inline
          value={values.knows_rev360}
          onChange={set("knows_rev360")}
          error={errors.knows_rev360?.message}
        />
        {values.knows_rev360 === "YES" && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--nrs-gray-700)", marginBottom: 8 }}>
              How comfortable are you using the Rev360 platform? (optional)
            </div>
            <RadioPills
              name="rev360_comfort"
              options={REV360_COMFORT_OPTIONS}
              value={values.rev360_comfort ?? ""}
              onChange={set("rev360_comfort")}
            />
          </div>
        )}
      </div>

      <div className="nrs-form-divider" />

      <div className="nrs-form-group">
        <QuestionLabel num={next()}>Are you familiar with the NRS E-invoicing?</QuestionLabel>
        <RadioPills
          name="knows_einvoicing"
          options={YES_NO}
          inline
          value={values.knows_einvoicing}
          onChange={set("knows_einvoicing")}
          error={errors.knows_einvoicing?.message}
        />
      </div>

      <div className="nrs-form-divider" />

      <div className="nrs-form-group">
        <QuestionLabel num={next()}>
          Are you aware of our social media handles? (@nigeriarevenue — Nigeria Revenue Service (NRS) on Facebook, X, Instagram and LinkedIn)
        </QuestionLabel>
        <RadioPills
          name="knows_social_media"
          options={YES_NO}
          inline
          value={values.knows_social_media}
          onChange={set("knows_social_media")}
          error={errors.knows_social_media?.message}
        />
      </div>

      <div className="nrs-form-divider" />

      <div className="nrs-form-group">
        <QuestionLabel num={next()} optional>
          What suggestions do you have to help us make your experience with NRS better?
        </QuestionLabel>
        <textarea
          className="nrs-textarea"
          placeholder="Share your suggestions here…"
          maxLength={1000}
          value={values.suggestions ?? ""}
          onChange={(e) => setValue("suggestions", e.target.value)}
        />
        <div style={{ fontSize: 12, color: "var(--nrs-gray-500)", marginTop: 4, textAlign: "right" }}>
          {(values.suggestions ?? "").length} / 1000
        </div>
      </div>

      <div className="nrs-form-divider" />

      <div className="nrs-form-group" style={{ marginBottom: 0 }}>
        <QuestionLabel num={next()} optional>
          If you would like to be contacted for further customer service queries, please provide your preferred e-mail address
        </QuestionLabel>
        <TextField
          type="email"
          value={values.contact_email ?? ""}
          onChange={set("contact_email")}
          placeholder="you@example.com"
        />
      </div>

      <div className="nrs-form-divider" />

      <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start", paddingTop: 8 }}>
        {serverError && <p className="nrs-field-error" style={{ margin: 0 }}>{serverError}</p>}
        <SubmitButton submitting={submitting} label="Submit Survey" />
        <p className="nrs-submit-note">
          <svg viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          Personal details are optional — only share what you are comfortable with.
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </form>
  )
}
