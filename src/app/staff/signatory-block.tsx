import { TextField } from "../form-controls"
import type { Signatory } from "@/lib/staff-schema"

export function SignatoryBlock({
  title,
  value,
  onChange,
  errors,
}: {
  title: string
  value: Signatory
  onChange: (field: keyof Signatory, v: string) => void
  errors?: Partial<Record<keyof Signatory, { message?: string }>>
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
