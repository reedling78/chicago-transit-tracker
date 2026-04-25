import Image from 'next/image'
import Breadcrumb, { type BreadcrumbItem } from './Breadcrumb'
import FavoriteButton from './FavoriteButton'
import type { FavoriteType } from '@ctt/shared'

interface PageHeaderProps {
  title: string
  description?: string
  /** Breadcrumb trail rendered at the top of the hero */
  breadcrumbItems?: BreadcrumbItem[]
  /** Pill badges rendered above the title */
  badges?: React.ReactNode
  /** Icon rendered inline next to the title */
  icon?: React.ReactNode
  /** Background hero image — defaults to the CTA/Chicago photo */
  imageSrc?: string
  /** When provided, renders a FavoriteButton at top-right (next to the breadcrumb). */
  favorite?: { type: FavoriteType; id: string }
  /** Extra content rendered below the description — e.g. line colour chips */
  children?: React.ReactNode
}

export default function PageHeader({
  title,
  description,
  breadcrumbItems,
  badges,
  icon,
  imageSrc = '/hero-header.jpg',
  favorite,
  children,
}: PageHeaderProps) {
  const titleHeading = (
    <h1
      className="flex items-center gap-3 text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl"
      style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}
    >
      {icon && (
        <span className="shrink-0" aria-hidden="true">
          {icon}
        </span>
      )}
      {title}
    </h1>
  )
  return (
    <section className="relative -mx-4 -mt-8 mb-8 flex h-56 flex-col overflow-hidden sm:-mx-6 sm:h-64 lg:-mx-8 lg:h-72">
      {/* Background photo */}
      <Image
        src={imageSrc}
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

      {/* Top: breadcrumb + favorite (right-aligned) */}
      {((breadcrumbItems && breadcrumbItems.length > 0) || favorite) && (
        <div className="relative z-10 mx-auto flex w-full max-w-7xl items-start justify-between gap-3 px-4 pt-5 sm:px-6 lg:px-8">
          <div className="min-w-0 flex-1">
            {breadcrumbItems && breadcrumbItems.length > 0 && (
              <Breadcrumb items={breadcrumbItems} />
            )}
          </div>
          {favorite && (
            <div className="-mt-2 shrink-0">
              <FavoriteButton type={favorite.type} id={favorite.id} />
            </div>
          )}
        </div>
      )}

      {/* Bottom: main content — mt-auto pins to the bottom of the flex column */}
      <div className="relative z-10 mx-auto mt-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        {badges && <div className="mb-3 flex flex-wrap items-center gap-2">{badges}</div>}
        {titleHeading}
        {description && (
          <p className="mt-3 max-w-2xl text-sm text-white/85 sm:text-base">{description}</p>
        )}
        {children && <div className="mt-4">{children}</div>}
      </div>
    </section>
  )
}
