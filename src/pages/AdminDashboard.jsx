import { Link } from 'react-router-dom'
import Icon from '../components/Icon'
import { Badge, PageHeading, Skeleton } from '../components/ui'
import useAsync from '../hooks/useAsync'
import { adminDashboard } from '../lib/adminApi'
import { formatDate, formatPrice } from '../lib/format'

const STATUS_TONE = { processing: 'rose', shipped: 'lilac', delivered: 'sage', cancelled: 'neutral' }

export default function AdminDashboard() {
  const { data, loading, error } = useAsync(adminDashboard, [])

  if (error) {
    return (
      <div className="card p-6">
        <p className="text-sm text-red-700">Could not load the dashboard: {error.message}</p>
      </div>
    )
  }

  const stats = [
    { icon: 'gift', label: 'Revenue', value: data ? formatPrice(data.revenue) : '—' },
    { icon: 'truck', label: 'Open orders', value: data ? `${data.openOrders} of ${data.orderCount}` : '—' },
    { icon: 'user', label: 'Customers', value: data?.customerCount ?? '—' },
    { icon: 'bag', label: 'Live products', value: data?.productCount ?? '—' },
  ]

  return (
    <div>
      <PageHeading eyebrow="Overview" title="Dashboard" subtitle="How the shop is doing right now." />

      <div className="mt-7 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-blush text-wine">
              <Icon name={s.icon} size={17} />
            </span>
            <p className="mt-3 text-[11px] uppercase tracking-[0.12em] text-muted">{s.label}</p>
            {loading
              ? <Skeleton className="mt-1 h-7 w-20" />
              : <p className="mt-0.5 font-display text-[22px] font-semibold text-ink">{s.value}</p>}
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-[20px] font-semibold text-ink">Recent orders</h2>
            <Link to="/admin/orders" className="text-[13px] text-wine hover:underline">All orders</Link>
          </div>

          {loading ? (
            <Skeleton className="mt-4 h-32 w-full" />
          ) : data.recentOrders.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No orders yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {data.recentOrders.map((o) => (
                <li key={o.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium text-ink">#{o.order_number}</span>
                    <span className="text-[12px] text-muted">
                      {o.profiles ? `${o.profiles.first_name} ${o.profiles.last_name}`.trim() || 'Guest' : 'Guest'}
                      {' · '}{formatDate(o.created_at)}
                    </span>
                  </span>
                  <Badge tone={STATUS_TONE[o.status]} dot>{o.status}</Badge>
                  <span className="text-[14px] font-medium text-ink">{formatPrice(o.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-[20px] font-semibold text-ink">Needs restocking</h2>
            <Link to="/admin/products" className="text-[13px] text-wine hover:underline">All products</Link>
          </div>

          {loading ? (
            <Skeleton className="mt-4 h-32 w-full" />
          ) : data.lowStock.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Every product has healthy stock.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {data.lowStock.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="min-w-0 flex-1 truncate text-[14px] text-ink">{p.name}</span>
                  {!p.is_available
                    ? <Badge tone="neutral">Marked out of stock</Badge>
                    : <Badge tone={p.stock === 0 ? 'rose' : 'amber'}>{p.stock} left</Badge>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {!loading && data.unreadMessages > 0 && (
        <Link to="/admin/messages" className="card mt-6 flex items-center gap-3.5 p-5 transition hover:shadow-lift">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blush text-wine">
            <Icon name="mail" size={18} />
          </span>
          <span className="flex-1 text-[14px] text-ink">
            {data.unreadMessages} unread {data.unreadMessages === 1 ? 'message' : 'messages'} from the contact form
          </span>
          <Icon name="chevronRight" size={18} className="text-muted" />
        </Link>
      )}
    </div>
  )
}
