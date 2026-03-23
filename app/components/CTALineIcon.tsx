/**
 * CTALineIcon
 *
 * Renders the CTA Standard 'L' Train Icon on an official line-color background.
 * Colors match the CTA Branding Guide (Appendix A, rev 1.0).
 * Per guidelines: icon is white on dark backgrounds, dark on light backgrounds (Yellow).
 *
 * Trademark notice:
 * The CTA 'L' train icon is used here for 'L' service information per the
 * CTA Trademark Guidelines for Developers. See docs/design guidelines/ for the full guide.
 *
 * Usage:
 *   <CTALineIcon line="Red" />
 *   <CTALineIcon line="Blue" size={32} />
 *   <CTALineIcon line="Yellow" size={56} rounded />
 */

// Official CTA 'L' route colors — Appendix A of the CTA Branding Guide.
// fg is the icon/foreground color: white on dark lines, near-black on Yellow.
export const CTA_LINE_COLORS: Record<string, { bg: string; fg: string; label: string }> = {
  Red:    { bg: '#c60c30', fg: '#ffffff', label: 'Red Line'    },
  Blue:   { bg: '#00a1de', fg: '#ffffff', label: 'Blue Line'   },
  Brown:  { bg: '#62361b', fg: '#ffffff', label: 'Brown Line'  },
  Green:  { bg: '#009b3a', fg: '#ffffff', label: 'Green Line'  },
  Orange: { bg: '#f9461c', fg: '#ffffff', label: 'Orange Line' },
  Purple: { bg: '#522398', fg: '#ffffff', label: 'Purple Line' },
  Pink:   { bg: '#e27ea6', fg: '#ffffff', label: 'Pink Line'   },
  Yellow: { bg: '#f9e300', fg: '#1a1a1a', label: 'Yellow Line' },
}

interface TrainSVGProps {
  bg: string
  fg: string
  size: number
}

/** CTA Standard 'L' Train Icon — front-facing silhouette per the CTA Branding Guide. */
function TrainSVG({ bg, fg, size }: TrainSVGProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill={fg}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* ── Car body ── */}
      <rect x="6" y="4" width="88" height="56" rx="7" />

      {/* ── Windows (bg shows through) ── */}
      <rect x="12" y="11" width="32" height="36" rx="4" fill={bg} />
      <rect x="56" y="11" width="32" height="36" rx="4" fill={bg} />

      {/* ── Wheel trucks ── */}
      <rect x="8"  y="64" width="28" height="16" rx="5" />
      <rect x="64" y="64" width="28" height="16" rx="5" />

      {/* ── Rails ── */}
      <rect x="0"  y="82" width="100" height="5" rx="2" />
      {/* gap between trucks (bg shows through) */}
      <rect x="36" y="82" width="28" height="5" fill={bg} />
    </svg>
  )
}

interface CTALineIconProps {
  /** CTA line short name: "Red" | "Blue" | "Brown" | "Green" | "Orange" | "Purple" | "Pink" | "Yellow" */
  line: string
  /** Icon size in px — sets both width and height. Default: 48 */
  size?: number
  /** Apply rounded corners per CTA solid-fill icon usage guidelines. Default: true */
  rounded?: boolean
  className?: string
}

export default function CTALineIcon({ line, size = 48, rounded = true, className }: CTALineIconProps) {
  const colors = CTA_LINE_COLORS[line]
  if (!colors) return null

  const padding = Math.round(size * 0.12)
  const svgSize = size - padding * 2

  return (
    <div
      className={`inline-flex shrink-0 items-center justify-center ${rounded ? 'rounded-lg' : ''} ${className ?? ''}`}
      style={{ width: size, height: size, backgroundColor: colors.bg }}
      role="img"
      aria-label={colors.label}
      title={colors.label}
    >
      <TrainSVG bg={colors.bg} fg={colors.fg} size={svgSize} />
    </div>
  )
}
