import type { SocialPlatform } from "@/lib/nrs-channels"

const FILL: Record<SocialPlatform, string> = {
  Facebook: "#1877F2",
  X: "#000000",
  Instagram: "#C13584",
  LinkedIn: "#0A66C2",
}

const GLYPH: Partial<Record<SocialPlatform, string>> = { Facebook: "f", X: "X", LinkedIn: "in" }

/* Small brand-coloured badge, one per platform (decorative; the platform name is shown beside it). */
export function SocialIcon({ platform }: { platform: SocialPlatform }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
      <rect width="24" height="24" rx="6" fill={FILL[platform]} />
      {platform === "Instagram" ? (
        <>
          <rect x="5.5" y="5.5" width="13" height="13" rx="4" fill="none" stroke="#fff" strokeWidth="1.6" />
          <circle cx="12" cy="12" r="3.1" fill="none" stroke="#fff" strokeWidth="1.6" />
          <circle cx="16.1" cy="7.9" r="0.9" fill="#fff" />
        </>
      ) : (
        <text
          x="12"
          y="16.5"
          textAnchor="middle"
          fontSize={platform === "LinkedIn" ? 11 : 14}
          fontWeight="800"
          fontFamily="Arial, Helvetica, sans-serif"
          fill="#fff"
        >
          {GLYPH[platform]}
        </text>
      )}
    </svg>
  )
}
