import Icon from './Icon'

/** Small shared presentational pieces used across the storefront and account area. */

export function Eyebrow({ children }) {
  return <p className="eyebrow">{children}</p>
}

export function PageHeading({ eyebrow, title, subtitle, action }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className="mt-2 font-display text-[30px] font-semibold leading-tight text-ink sm:text-[36px]">{title}</h1>
        {subtitle && <p className="mt-2 text-[15px] leading-relaxed text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function SectionHeading({ eyebrow, title, to, linkLabel = 'View all' }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h2 className="mt-2 font-display text-[26px] font-semibold leading-tight text-ink sm:text-[30px]">{title}</h2>
      </div>
      {to && (
        <a href={to} className="group hidden shrink-0 items-center gap-1.5 text-sm text-wine sm:inline-flex">
          {linkLabel}
          <Icon name="arrowRight" size={15} className="transition-transform group-hover:translate-x-0.5" />
        </a>
      )}
    </div>
  )
}

export function Rating({ value, count, size = 13 }) {
  return (
    <span className="inline-flex items-center gap-1 text-[12px] text-muted">
      <Icon name="star" size={size} filled className="text-wine-400" />
      <span className="font-medium text-ink">{value.toFixed(1)}</span>
      {count != null && <span>({count})</span>}
    </span>
  )
}

const BADGE_TONES = {
  default: 'bg-blush text-wine',
  rose: 'bg-wine-100 text-wine-700',
  lilac: 'bg-[#EDE7FB] text-[#5B47A8]',
  sage: 'bg-[#E4F3EC] text-[#2F7256]',
  amber: 'bg-gold-soft text-gold-deep',
  neutral: 'bg-line/70 text-muted',
}

export function Badge({ children, tone = 'default', dot = false }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${BADGE_TONES[tone] ?? BADGE_TONES.default}`}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  )
}

export function EmptyState({ icon = 'bag', title, body, action }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-blush text-wine">
        <Icon name={icon} size={24} />
      </span>
      <h3 className="mt-4 font-display text-[22px] font-semibold text-ink">{title}</h3>
      {body && <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-line/70 ${className}`} />
}

export function ProductGridSkeleton({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card overflow-hidden p-0">
          <Skeleton className="aspect-square rounded-none" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function Toasts({ toasts }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="animate-fade-up pointer-events-auto flex items-center gap-2.5 rounded-full bg-ink px-4 py-2.5
                     text-sm text-white shadow-lift"
        >
          <Icon name="check" size={15} className="text-wine-300" />
          {t.message}
        </div>
      ))}
    </div>
  )
}
