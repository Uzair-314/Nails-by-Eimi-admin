import { useEffect, useState } from 'react'
import Icon from '../components/Icon'
import { Badge, PageHeading, Skeleton } from '../components/ui'
import { adminListActivity, adminOrderHistory } from '../lib/adminApi'
import { formatPrice } from '../lib/format'

const TABS = [
  { id: 'activity', label: 'Activity log' },
  { id: 'orders', label: 'Order history' },
]

const ENTITY_FILTERS = [
  { value: 'all', label: 'Everything' },
  { value: 'product', label: 'Products' },
  { value: 'order', label: 'Orders' },
  { value: 'category', label: 'Categories' },
  { value: 'discount', label: 'Discounts' },
  { value: 'setting', label: 'Settings' },
]

const ENTITY_ICON = {
  product: 'bag', order: 'truck', category: 'tag', discount: 'gift', setting: 'settings',
}

const ACTION_TONE = { created: 'sage', updated: 'lilac', deleted: 'rose' }
const STATUS_TONE = { processing: 'rose', shipped: 'lilac', delivered: 'sage', cancelled: 'neutral' }

/** Fields worth showing in plain words, and how to print their values. */
const FIELD_LABELS = {
  price: 'Price', compare_at: 'Was price', stock: 'Stock', name: 'Name', slug: 'Web address',
  is_active: 'Visible in shop', is_available: 'Available to buy', is_featured: 'Featured',
  status: 'Status', tracking: 'Tracking', description: 'Description', tags: 'Tags',
  value: 'Value', code: 'Code', is_default: 'Default', is_promotional: 'Promotional shelf',
}

const MONEY_FIELDS = new Set(['price', 'compare_at', 'min_spend', 'subtotal', 'total', 'shipping'])

function printValue(field, value) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'yes' : 'no'
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—'
  if (MONEY_FIELDS.has(field)) return formatPrice(Number(value))
  if (typeof value === 'object') return JSON.stringify(value)
  const s = String(value)
  return s.length > 60 ? `${s.slice(0, 60)}…` : s
}

/** Exact timestamp — "when did the price change" needs the hour, not just the day. */
const stamp = (iso) =>
  new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))

export default function AdminHistory() {
  const [tab, setTab] = useState('activity')
  const [entity, setEntity] = useState('all')
  const [activity, setActivity] = useState(null)
  const [orders, setOrders] = useState(null)

  useEffect(() => {
    if (tab === 'activity') {
      setActivity(null)
      adminListActivity({ entity }).then(setActivity).catch(() => setActivity([]))
    } else if (!orders) {
      adminOrderHistory().then(setOrders).catch(() => setOrders([]))
    }
  }, [tab, entity]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <PageHeading
        eyebrow="Record"
        title="History"
        subtitle="What changed, who changed it, and every order placed."
      />

      <div className="mt-7 inline-flex rounded-full bg-blush p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
            className={[
              'rounded-full px-5 py-2 text-[14px] transition',
              tab === t.id ? 'bg-white text-ink shadow-card' : 'text-muted hover:text-wine',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'activity' && (
        <>
          <div className="mt-5 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {ENTITY_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setEntity(f.value)}
                className={`pill !py-2 ${entity === f.value ? 'pill-active' : ''}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-3">
            {!activity ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-card" />)
            ) : activity.length === 0 ? (
              <div className="card p-10 text-center">
                <p className="text-sm text-muted">
                  Nothing recorded yet. Changes you make in the admin panel will appear here.
                </p>
              </div>
            ) : (
              activity.map((row) => {
                const changed = Object.entries(row.changes ?? {})
                return (
                  <article key={row.id} className="card p-4 sm:p-5">
                    <div className="flex flex-wrap items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blush text-wine">
                        <Icon name={ENTITY_ICON[row.entity] ?? 'info'} size={18} />
                      </span>

                      <div className="min-w-[180px] flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-[15px] font-medium text-ink">
                            {row.entity_label ?? row.entity}
                          </h2>
                          <Badge tone={ACTION_TONE[row.action]}>{row.action}</Badge>
                          <Badge tone="neutral">{row.entity}</Badge>
                        </div>
                        <p className="mt-1 text-[12px] text-muted">
                          {stamp(row.created_at)}
                          {row.actor_email ? ` · ${row.actor_email}` : ' · system'}
                        </p>
                      </div>
                    </div>

                    {changed.length > 0 && (
                      <ul className="mt-3 space-y-1.5 border-t border-line pt-3">
                        {changed.map(([field, diff]) => (
                          <li key={field} className="flex flex-wrap items-baseline gap-x-2 text-[13px]">
                            <span className="font-medium text-ink">{FIELD_LABELS[field] ?? field}</span>
                            <span className="text-muted line-through">{printValue(field, diff.from)}</span>
                            <Icon name="arrowRight" size={12} className="text-muted" />
                            <span className="font-medium text-wine">{printValue(field, diff.to)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </article>
                )
              })
            )}
          </div>
        </>
      )}

      {tab === 'orders' && (
        <div className="mt-5 space-y-3">
          {!orders ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-card" />)
          ) : orders.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="text-sm text-muted">No orders have been placed yet.</p>
            </div>
          ) : (
            orders.map((o) => {
              const customer = o.profiles
                ? `${o.profiles.first_name} ${o.profiles.last_name}`.trim() || o.profiles.email
                : 'Guest'
              return (
                <article key={o.id} className="card flex flex-wrap items-center gap-4 p-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blush text-wine">
                    <Icon name="truck" size={18} />
                  </span>

                  <div className="min-w-[180px] flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-[15px] font-medium text-ink">#{o.order_number}</h2>
                      <Badge tone={STATUS_TONE[o.status]} dot>{o.status}</Badge>
                    </div>
                    <p className="mt-1 text-[12px] text-muted">
                      {customer} · {stamp(o.created_at)} ·{' '}
                      {(o.order_items ?? []).reduce((n, i) => n + i.qty, 0)} items
                    </p>
                  </div>

                  {o.tracking && (
                    <p className="text-[12px] text-muted">Tracking {o.tracking}</p>
                  )}

                  <p className="text-[15px] font-semibold text-wine">{formatPrice(o.total)}</p>
                </article>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
