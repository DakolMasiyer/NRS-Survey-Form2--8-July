import { NRS_LOGO } from "./nrs-logo"

export const NRS_TAGLINE = "Inspiring Trust, Sustaining Growth"

/*
 * Centred form letterhead, in the order printed on the paper forms:
 * logo, tagline, Strategic Management Office, issuing unit(s), address (optional),
 * red rule, title, subtitle, intro.
 */
export function Letterhead({
  title,
  units,
  address,
  subtitle,
  intro,
}: {
  title: string
  units: string[]
  address?: string
  subtitle?: string
  intro?: string
}) {
  return (
    <header className="nrs-letterhead">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={NRS_LOGO} alt="Nigeria Revenue Service" className="nrs-letterhead__logo" />
      <p className="nrs-letterhead__tagline">{NRS_TAGLINE}</p>
      <p className="nrs-letterhead__office">Strategic Management Office</p>
      {units.map((unit) => (
        <p key={unit} className="nrs-letterhead__office">{unit}</p>
      ))}
      {address && <p className="nrs-letterhead__address">{address}</p>}
      <hr className="nrs-letterhead__rule" />
      <h1 className="nrs-letterhead__title">{title}</h1>
      {subtitle && <p className="nrs-letterhead__subtitle">{subtitle}</p>}
      {intro && <p className="nrs-letterhead__intro">{intro}</p>}
    </header>
  )
}
