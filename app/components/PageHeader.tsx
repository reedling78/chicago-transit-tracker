import Image from 'next/image'

interface PageHeaderProps {
  title: string
  description?: string
  /** Pill badges rendered above the title */
  badges?: React.ReactNode
  /** Extra content rendered below the description — e.g. line colour chips */
  children?: React.ReactNode
}

export default function PageHeader({ title, description, badges, children }: PageHeaderProps) {
  return (
    <section className="relative -mx-4 mb-8 flex h-56 flex-col justify-end overflow-hidden sm:-mx-6 sm:h-64 lg:-mx-8 lg:h-72">
      {/* Background photo */}
      <Image
        src="/hero-header.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-[center_40%]"
      />

      {/* Layer 1 — flat tint */}
      <div className="absolute inset-0 bg-black/30 dark:bg-black/40" aria-hidden="true" />

      {/* Layer 2 — bottom gradient */}
      <div
        className="absolute inset-0 bg-linear-to-t from-black/75 via-black/20 to-transparent dark:from-black/85 dark:via-black/40"
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        {badges && <div className="mb-3 flex flex-wrap items-center gap-2">{badges}</div>}
        <h1
          className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl"
          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}
        >
          {title}
        </h1>
        {description && (
          <p className="mt-3 max-w-2xl text-sm text-white/85 sm:text-base">{description}</p>
        )}
        {children && <div className="mt-4">{children}</div>}
      </div>
    </section>
  )
}
