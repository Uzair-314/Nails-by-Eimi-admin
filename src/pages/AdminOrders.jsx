import { useCallback, useEffect, useState } from 'react'
import Icon from '../components/Icon'
import { Badge, PageHeading, Skeleton } from '../components/ui'
import { formatDate, formatPrice, whatsappLink } from '../lib/format'
import { useToast } from '../context/ToastContext'
import { adminListOrders, adminUpdateOrder } from '../lib/adminApi'

const STATUSES = ['processing', 'shipped', 'delivered', 'cancelled']
const TONE = { processing: 'rose', shipped: 'lilac', delivered: 'sage', cancelled: 'neutral' }

/**
 * What to send the customer when an order moves.
 *
 * Nothing goes out on its own — the admin presses send in WhatsApp. Most
 * customers order without an account and may never come back to the site, so
 * a message they already read is the only thing that reliably reaches them.
 */
const statusMessage = (order) => {
  const ref = `#${order.order_number}`
  switch (order.status) {
    case 'processing': return `Hi, your Nails By Eimi order ${ref} is being prepared. We will let you know when it is on its way.`
    case 'shipped':    return `Hi, your Nails By Eimi order ${ref} is on its way${order.tracking ? ` — tracking ${order.tracking}` : ''}. Payment is cash on delivery.`
    case 'delivered':  return `Hi, your Nails By Eimi order ${ref} has been delivered. Thank you for shopping with us!`
    case 'cancelled':  return `Hi, your Nails By Eimi order ${ref} has been cancelled. Get in touch if that is unexpected.`
    default:           return `Hi, an update on your Nails By Eimi order ${ref}: it is now ${order.status}.`
  }
}

export default function AdminOrders() {
  const [orders, setOrders] = useState(null)
  const [filter, setFilter] = useState('all')
  const [open, setOpen] = useState(null)
  const [tracking, setTracking] = useState({})
  const { toast } = useToast()

  const reload = useCallback(async () => {
    setOrders(await adminListOrders({ status: filter }))
  }, [filter])

  useEffect(() => { reload() }, [reload])

  const setStatus = async (order, status) => {
    await adminUpdateOrder(order.id, { status })
    toast(`#${order.order_number} marked ${status}`)
    reload()
  }

  const saveTracking = async (order) => {
    const value = (tracking[order.id] ?? order.tracking ?? '').trim()
    await adminUpdateOrder(order.id, { tracking: value || null })
    toast('Tracking saved')
    reload()
  }

  return (
    <div>
      <PageHeading eyebrow="Fulfilment" title="Orders" subtitle="Track what has been paid for and where it is." />

      <div className="mt-7 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {['all', ...STATUSES].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`pill !py-2 ${filter === s ? 'pill-active' : ''}`}
          >
            {s === 'all' ? 'All orders' : s[0].toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {!orders ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-card" />)
        ) : orders.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-sm text-muted">No orders here yet.</p>
          </div>
        ) : (
          orders.map((o) => {
            const expanded = open === o.id
            const customer = o.guest_name
              || (o.profiles ? `${o.profiles.first_name} ${o.profiles.last_name}`.trim() || o.profiles.email : null)
              || 'Guest'
            const contact = [o.guest_phone, o.guest_email ?? o.profiles?.email].filter(Boolean).join(' · ')
            // An account holder has no guest_phone, so fall back to their profile.
            const waPhone = o.guest_phone ?? o.profiles?.phone ?? null
            return (
              <article key={o.id} className="card p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="min-w-[180px] flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="text-[15px] font-medium text-ink">#{o.order_number}</h2>
                      <Badge tone={TONE[o.status]} dot>{o.status}</Badge>
                    </div>
                    <p className="mt-1 text-[13px] text-muted">
                      {customer} · {formatDate(o.created_at)} · {o.order_items?.length ?? 0} items
                    </p>
                    {contact && (
                      <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px] text-muted">
                        {contact}
                        {waPhone && (
                          <a
                            href={whatsappLink(waPhone)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-wine hover:underline"
                          >
                            WhatsApp
                          </a>
                        )}
                      </p>
                    )}
                  </div>

                  <p className="text-[15px] font-semibold text-wine">{formatPrice(o.total)}</p>

                  <select
                    value={o.status}
                    onChange={(e) => setStatus(o, e.target.value)}
                    className="rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:border-wine-200"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>

                  {waPhone && (
                    <a
                      href={whatsappLink(waPhone, statusMessage(o))}
                      target="_blank"
                      rel="noreferrer"
                      title="Opens WhatsApp with a message ready to send"
                      className="btn-ghost !py-2 text-[13px]"
                    >
                      <Icon name="phone" size={15} />
                      Tell customer
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => setOpen(expanded ? null : o.id)}
                    aria-expanded={expanded}
                    className="btn-ghost !py-2 text-[13px]"
                  >
                    Details
                    <Icon name="chevronDown" size={15} className={expanded ? 'rotate-180 transition-transform' : 'transition-transform'} />
                  </button>
                </div>

                <div className={`grid transition-all duration-300 ${expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                  <div className="overflow-hidden">
                    <div className="mt-4 grid gap-6 border-t border-line pt-4 sm:grid-cols-2">
                      <div>
                        <h3 className="text-[13px] font-medium text-ink">Items</h3>
                        <ul className="mt-3 space-y-2.5">
                          {(o.order_items ?? []).map((i) => (
                            <li key={i.id} className="flex items-center gap-3 text-[13px]">
                              <img src={i.image ?? '/media/p-pearl.svg'} alt="" className="h-10 w-10 rounded-lg object-cover" />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-ink">{i.name}</span>
                                <span className="text-muted">Qty {i.qty} · {formatPrice(i.price)}</span>
                              </span>
                              <span className="font-medium text-ink">{formatPrice(i.price * i.qty)}</span>
                            </li>
                          ))}
                        </ul>

                        <dl className="mt-4 space-y-1.5 border-t border-line pt-3 text-[13px]">
                          <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{formatPrice(o.subtotal)}</dd></div>
                          {Number(o.discount) > 0 && (
                            <div className="flex justify-between">
                              <dt className="text-muted">Discount {o.discount_code ? `(${o.discount_code})` : ''}</dt>
                              <dd>−{formatPrice(o.discount)}</dd>
                            </div>
                          )}
                          <div className="flex justify-between"><dt className="text-muted">Delivery</dt><dd>{Number(o.shipping) === 0 ? 'Free' : formatPrice(o.shipping)}</dd></div>
                          <div className="flex justify-between font-medium"><dt>Total</dt><dd className="text-wine">{formatPrice(o.total)}</dd></div>
                        </dl>
                      </div>

                      <div>
                        <h3 className="text-[13px] font-medium text-ink">Deliver to</h3>
                        {o.address ? (
                          <address className="mt-2 text-[13px] not-italic leading-relaxed text-muted">
                            {o.address.name}<br />
                            {o.address.line1}{o.address.line2 ? `, ${o.address.line2}` : ''}<br />
                            {o.address.city} {o.address.postcode}<br />
                            {o.address.country}
                            {o.address.phone && <><br />{o.address.phone}</>}
                          </address>
                        ) : (
                          <p className="mt-2 text-[13px] text-muted">No address recorded.</p>
                        )}

                        {o.delivery_notes && (
                          <div className="mt-4">
                            <h3 className="text-[13px] font-medium text-ink">Delivery notes</h3>
                            <p className="mt-1.5 rounded-xl bg-blush px-3.5 py-2.5 text-[13px] leading-relaxed text-ink">
                              {o.delivery_notes}
                            </p>
                          </div>
                        )}

                        {o.shipping_method && (
                          <p className="mt-3 text-[13px] text-muted">
                            Method: <span className="text-ink">{o.shipping_method}</span>
                          </p>
                        )}

                        <label className="mt-4 block">
                          <span className="mb-1.5 block text-[13px] font-medium text-ink">Tracking number</span>
                          <div className="flex gap-2">
                            <input
                              value={tracking[o.id] ?? o.tracking ?? ''}
                              onChange={(e) => setTracking((t) => ({ ...t, [o.id]: e.target.value }))}
                              className="field"
                              placeholder="Courier reference"
                            />
                            <button type="button" onClick={() => saveTracking(o)} className="btn-primary shrink-0 !py-2">
                              Save
                            </button>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            )
          })
        )}
      </div>
    </div>
  )
}
