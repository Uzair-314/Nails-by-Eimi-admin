import { useCallback, useEffect, useState } from 'react'
import Icon from '../components/Icon'
import { Badge, PageHeading, Skeleton } from '../components/ui'
import { formatPrice } from '../lib/format'
import { useToast } from '../context/ToastContext'
import { adminDeleteAbandonedCart, adminListAbandonedCarts } from '../lib/adminApi'

/** How long ago, in words — "2 hours ago" is more useful here than a date. */
function ago(iso) {
  const mins = Math.round((Date.now() - new Date(iso)) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
  const days = Math.round(hours / 24)
  return `${days} ${days === 1 ? 'day' : 'days'} ago`
}

export default function AdminAbandoned() {
  const [carts, setCarts] = useState(null)
  const [includeConverted, setIncludeConverted] = useState(false)
  const { toast } = useToast()

  const reload = useCallback(() => {
    adminListAbandonedCarts({ includeConverted })
      .then(setCarts)
      .catch(() => setCarts([]))
  }, [includeConverted])

  useEffect(() => { reload() }, [reload])

  const remove = async (c) => {
    if (!window.confirm('Delete this saved basket?')) return
    await adminDeleteAbandonedCart(c.id)
    toast('Deleted')
    reload()
  }

  return (
    <div>
      <PageHeading
        eyebrow="Follow up"
        title="Unfinished checkouts"
        subtitle="People who entered their details but did not place the order."
        action={
          <label className="flex items-center gap-2.5 text-[13px] text-muted">
            <input
              type="checkbox"
              checked={includeConverted}
              onChange={(e) => setIncludeConverted(e.target.checked)}
              className="h-4 w-4 accent-[#E01B6A]"
            />
            Include completed
          </label>
        }
      />

      <p className="mt-5 flex items-start gap-2 rounded-xl bg-blush px-4 py-3 text-[13px] leading-relaxed text-ink">
        <Icon name="info" size={15} className="mt-0.5 shrink-0 text-wine" />
        These people gave their details but never finished. They have not consented to marketing — a single
        helpful message about the order they were making is reasonable; a mailing list is not.
      </p>

      <div className="mt-5 space-y-3">
        {!carts ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-card" />)
        ) : carts.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-sm text-muted">
              {includeConverted ? 'Nothing here yet.' : 'No unfinished checkouts — everyone who started, finished.'}
            </p>
          </div>
        ) : (
          carts.map((c) => {
            const items = Array.isArray(c.items) ? c.items : []
            const phone = String(c.phone ?? '').replace(/\D/g, '')
            return (
              <article key={c.id} className="card p-4 sm:p-5">
                <div className="flex flex-wrap items-start gap-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blush text-wine">
                    <Icon name="bag" size={18} />
                  </span>

                  <div className="min-w-[180px] flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-[15px] font-medium text-ink">{c.name || 'No name given'}</h2>
                      {c.converted && <Badge tone="sage">Ordered</Badge>}
                    </div>
                    <p className="mt-1 text-[12px] text-muted">
                      {[c.phone, c.email].filter(Boolean).join(' · ') || 'No contact details'} · {ago(c.updated_at)}
                    </p>
                  </div>

                  <p className="text-[15px] font-semibold text-wine">{formatPrice(c.subtotal)}</p>

                  <div className="flex gap-1.5">
                    {phone && !c.converted && (
                      <a
                        href={`https://wa.me/${phone.startsWith('92') ? phone : `92${phone.replace(/^0/, '')}`}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-ghost !py-2 text-[13px]"
                      >
                        <Icon name="phone" size={15} />
                        WhatsApp
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => remove(c)}
                      className="btn-quiet !px-2.5 !py-2 hover:!bg-red-50 hover:!text-red-700"
                      aria-label="Delete"
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                </div>

                {items.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-3 text-[13px] text-muted">
                    {items.map((i, n) => (
                      <li key={n}>
                        {i.qty} × {i.name}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            )
          })
        )}
      </div>
    </div>
  )
}
