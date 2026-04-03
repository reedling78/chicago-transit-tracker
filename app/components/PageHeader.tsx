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
    <div className="mb-8 border-b border-gray-100 pb-8 dark:border-gray-800">
      {badges && <div className="mb-3 flex flex-wrap items-center gap-2">{badges}</div>}
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
        {title}
      </h1>
      {description && (
        <p className="mt-3 max-w-2xl text-base text-gray-500 dark:text-gray-400">{description}</p>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}
