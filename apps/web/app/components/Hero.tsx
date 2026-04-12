import Link from 'next/link'

interface ServiceCardProps {
  href: string
  label: string
  description: string
  accent: string
  lines: { name: string; color: string }[]
}

function ServiceCard({ href, label, description, accent, lines }: ServiceCardProps) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition duration-300 hover:scale-[1.02] hover:border-gray-300 hover:shadow-lg dark:border-white/10 dark:bg-white/5 dark:backdrop-blur-sm dark:hover:bg-white/10 dark:hover:shadow-2xl"
    >
      {/* Accent glow */}
      <div
        className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full opacity-10 blur-3xl transition duration-300 group-hover:opacity-25 dark:opacity-20 dark:group-hover:opacity-40"
        style={{ backgroundColor: accent }}
      />

      <div>
        <p className="mb-2 text-sm font-semibold tracking-widest text-gray-400 uppercase dark:text-white/50">
          Chicago
        </p>
        <h2 className="mb-3 text-4xl font-bold text-gray-900 dark:text-white">{label}</h2>
        <p className="text-base text-gray-500 dark:text-white/60">{description}</p>
      </div>

      <div className="mt-8 flex flex-col gap-4">
        {/* Line color swatches */}
        <div className="flex flex-wrap gap-2">
          {lines.map((line) => (
            <span
              key={line.name}
              className="rounded-full px-3 py-1 text-xs font-semibold text-white/90"
              style={{ backgroundColor: line.color }}
            >
              {line.name}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2 text-sm font-medium text-gray-400 transition group-hover:text-gray-900 dark:text-white/70 dark:group-hover:text-white">
          Explore {label}
          <span className="transition-transform group-hover:translate-x-1">→</span>
        </div>
      </div>
    </Link>
  )
}

const CTA_LINES = [
  { name: 'Red', color: '#C60C30' },
  { name: 'Blue', color: '#00A1DE' },
  { name: 'Green', color: '#009B3A' },
  { name: 'Brown', color: '#62361B' },
  { name: 'Purple', color: '#522398' },
  { name: 'Pink', color: '#E27EA6' },
  { name: 'Orange', color: '#F9461C' },
  { name: 'Yellow', color: '#F9E300' },
]

const METRA_LINES = [
  { name: 'BNSF', color: '#1A3D7A' },
  { name: 'UP-N', color: '#007B40' },
  { name: 'UP-NW', color: '#007B40' },
  { name: 'UP-W', color: '#007B40' },
  { name: 'MD-N', color: '#C8872A' },
  { name: 'MD-W', color: '#C8872A' },
  { name: 'RI', color: '#BE0000' },
  { name: 'ME', color: '#003DA5' },
  { name: 'NCS', color: '#8B4513' },
  { name: 'SWS', color: '#7B3F97' },
  { name: 'HC', color: '#4A7729' },
]

const PACE_LINES = [
  { name: 'Pulse', color: '#814C9E' },
  { name: '208', color: '#00539F' },
  { name: '250', color: '#00539F' },
  { name: '353', color: '#00539F' },
  { name: '530', color: '#00539F' },
  { name: '755', color: '#00539F' },
]

export default function Hero() {
  return (
    <section className="relative -mx-4 overflow-hidden bg-gray-50 px-4 py-20 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 dark:bg-gray-950">
      {/* Background grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04] dark:opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Radial glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(120,119,198,0.08),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(120,119,198,0.15),transparent)]" />

      <div className="relative mx-auto max-w-7xl">
        {/* Headline */}
        <div className="mb-14 text-center">
          <h1 className="mb-4 text-5xl font-extrabold tracking-tight text-gray-900 sm:text-6xl dark:text-white">
            Chicago Transit Tracker
          </h1>
          <p className="mx-auto max-w-xl text-lg text-gray-500 dark:text-white/50">
            Real-time schedules, routes, and station info for every line in the Chicago metro area.
          </p>
        </div>

        {/* Service cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <ServiceCard
            href="/cta"
            label="CTA"
            description="Live Tracking & Schedules — 8 color-coded rapid transit lines serving Chicago, with 24-hour service on the Red and Blue lines."
            accent="#C60C30"
            lines={CTA_LINES}
          />
          <ServiceCard
            href="/metra"
            label="Metra"
            description="Live Tracking & Schedules — 11 commuter rail lines connecting Chicago to the suburbs across 6 counties and 243 stations."
            accent="#1A3D7A"
            lines={METRA_LINES}
          />
          <ServiceCard
            href="/pace"
            label="Pace"
            description="Schedules & Routes — explore Pace Suburban Bus's 130+ routes across the Chicago suburbs."
            accent="#00539F"
            lines={PACE_LINES}
          />
        </div>
      </div>
    </section>
  )
}
