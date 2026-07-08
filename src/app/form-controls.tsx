"use client"

export function RadioPills({
  name,
  options,
  value,
  onChange,
  error,
  inline = false,
}: {
  name: string
  options: string[]
  value: string
  onChange: (v: string) => void
  error?: string
  inline?: boolean
}) {
  return (
    <div>
      <div
        className="nrs-radio-group"
        style={inline ? { flexDirection: "row", flexWrap: "wrap" } : undefined}
      >
        {options.map((opt) => (
          <label
            key={opt}
            className={`nrs-radio-label${value === opt ? " is-checked" : ""}`}
          >
            <input
              type="radio"
              name={name}
              value={opt}
              checked={value === opt}
              onChange={() => onChange(opt)}
            />
            <span>{opt}</span>
          </label>
        ))}
      </div>
      {error && <p className="nrs-field-error">{error}</p>}
    </div>
  )
}

export function CheckboxPills({
  options,
  values,
  onChange,
}: {
  options: string[]
  values: string[]
  onChange: (v: string[]) => void
}) {
  return (
    <div className="nrs-radio-group">
      {options.map((opt) => {
        const checked = values.includes(opt)
        return (
          <label key={opt} className={`nrs-radio-label${checked ? " is-checked" : ""}`}>
            <input
              type="checkbox"
              value={opt}
              checked={checked}
              onChange={() =>
                onChange(checked ? values.filter((v) => v !== opt) : [...values, opt])
              }
              style={{ width: 18, height: 18, accentColor: "var(--nrs-red)", flexShrink: 0, cursor: "pointer" }}
            />
            <span>{opt}</span>
          </label>
        )
      })}
    </div>
  )
}

export function TextField({
  label,
  value,
  onChange,
  error,
  placeholder,
  type = "text",
}: {
  label?: string
  value: string
  onChange: (v: string) => void
  error?: string
  placeholder?: string
  type?: string
}) {
  return (
    <div style={{ width: "100%" }}>
      {label && (
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--nrs-gray-700)", marginBottom: 6 }}>
          {label}
        </div>
      )}
      <input
        type={type}
        className="nrs-textarea"
        style={{ minHeight: 0, height: 46, resize: "none" }}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <p className="nrs-field-error">{error}</p>}
    </div>
  )
}

export function QuestionLabel({
  num,
  children,
  optional,
}: {
  num?: string | number
  children: React.ReactNode
  optional?: boolean
}) {
  return (
    <div className="nrs-form-label">
      {num !== undefined && <span className="nrs-q-num">{num}</span>}
      <span>
        {children}
        {optional ? (
          <span style={{ fontWeight: 400, color: "var(--nrs-gray-500)", marginLeft: 4 }}>
            (optional)
          </span>
        ) : (
          <span className="nrs-req">*</span>
        )}
      </span>
    </div>
  )
}

export function SubmitButton({ submitting, label }: { submitting: boolean; label: string }) {
  return (
    <button type="submit" className="nrs-btn-submit" disabled={submitting}>
      {submitting ? (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite" }}>
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          Submitting…
        </>
      ) : (
        <>
          {label}
          <svg width="16" height="16" viewBox="0 0 20 20" fill="white">
            <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </>
      )}
    </button>
  )
}

export function SuccessState({
  title,
  body,
  onReset,
}: {
  title: string
  body: string
  onReset: () => void
}) {
  return (
    <div className="nrs-form-success">
      <div className="nrs-form-success__icon">
        <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 18l7 7L29 11" stroke="#0D1A3A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h3>{title}</h3>
      <p>{body}</p>
      <button className="nrs-btn-submit" onClick={onReset}>
        Submit another response
      </button>
    </div>
  )
}
