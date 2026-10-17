"use client"

import { useState } from "react"
import { SelectField } from "./form-controls"
import { TAX_OFFICES, formatTaxOffice } from "@/lib/tax-offices"

const STATE_OPTIONS = TAX_OFFICES.map((s) => ({ value: s.state, label: s.label }))

/*
 * Two-step State → Office picker. The chosen state is local UI state only;
 * the form value is the single string "<office>, <state>" (see tax-offices.ts).
 * The parent remounts this component (via `key`) to clear the state on reset.
 */
export function TaxOfficeSelect({
  value,
  onChange,
  error,
}: {
  value: string
  onChange: (v: string) => void
  error?: string
}) {
  const [state, setState] = useState("")
  const [office, setOffice] = useState("")

  const offices = TAX_OFFICES.find((s) => s.state === state)?.offices ?? []

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
      <SelectField
        label="State"
        value={state}
        onChange={(s) => {
          setState(s)
          setOffice("")
          if (value) onChange("")
        }}
        options={STATE_OPTIONS}
        placeholder="Select a state"
      />
      <SelectField
        label="Office"
        value={office}
        onChange={(o) => {
          setOffice(o)
          onChange(o ? formatTaxOffice(state, o) : "")
        }}
        options={offices.map((o) => ({ value: o, label: o }))}
        placeholder={state ? "Select an office" : "Select a state first"}
        disabled={!state}
        error={error}
      />
    </div>
  )
}
