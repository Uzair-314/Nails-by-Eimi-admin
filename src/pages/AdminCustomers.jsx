import Icon from '../components/Icon'
import { Badge, PageHeading, Skeleton } from '../components/ui'
import useAsync from '../hooks/useAsync'
import { adminListCustomers } from '../lib/adminApi'
import { formatDate, formatPoints } from '../lib/format'

export default function AdminCustomers() {
  const { data, loading, error } = useAsync(adminListCustomers, [])
  const customers = data ?? []

  return (
    <div>
      <PageHeading eyebrow="People" title="Customers" subtitle="Everyone who has created an account." />

      <div className="mt-7 space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-card" />)
        ) : error ? (
          <div className="card p-10 text-center">
            <p className="text-sm text-red-700">Could not load customers: {error.message}</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-sm text-muted">No accounts yet.</p>
          </div>
        ) : (
          customers.map((c) => {
            const name = `${c.first_name} ${c.last_name}`.trim()
            return (
              <article key={c.id} className="card flex flex-wrap items-center gap-4 p-4">
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl font-display text-[14px] font-semibold text-white"
                  style={{ background: c.avatar_tone }}
                >
                  {(c.first_name?.[0] ?? '?') + (c.last_name?.[0] ?? '')}
                </span>

                <div className="min-w-[170px] flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[15px] font-medium text-ink">{name || 'Unnamed'}</h2>
                    {c.is_admin && <Badge tone="amber">Admin</Badge>}
                  </div>
                  <p className="mt-0.5 text-[12px] text-muted">{c.email}</p>
                </div>

                {c.phone && (
                  <p className="flex items-center gap-1.5 text-[13px] text-muted">
                    <Icon name="phone" size={14} />
                    {c.phone}
                  </p>
                )}

                <p className="text-[13px] text-muted">{c.tier} · {formatPoints(c.points)} pts</p>
                <p className="text-[12px] text-muted">Joined {formatDate(c.created_at)}</p>
              </article>
            )
          })
        )}
      </div>
    </div>
  )
}
