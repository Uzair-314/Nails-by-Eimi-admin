import { useCallback, useEffect, useState } from 'react'
import Icon from '../components/Icon'
import { Badge, PageHeading, Skeleton } from '../components/ui'
import { useToast } from '../context/ToastContext'
import {
  adminDeleteAnnouncement, adminListAnnouncements, adminListCategories,
  adminListProducts, adminReorderAnnouncements, adminSaveAnnouncement,
} from '../lib/adminApi'

/**
 * The pink strip at the very top of the shop.
 *
 * It is one line tall at every screen size, so the wording has to be short —
 * the counter below says so rather than leaving it to be discovered on a phone.
 */
const COMFORTABLE = 42

const blank = () => ({
  text: '', link_type: 'none', product_id: null, category_id: null,
  url: '', is_active: true, sort_order: 0,
})

export default function AdminAnnouncements() {
  const { toast } = useToast()
  const [items, setItems] = useState(null)
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [editing, setEditing] = useState(null)

  const reload = useCallback(async () => {
    setItems(await adminListAnnouncements())
  }, [])

  useEffect(() => { reload() }, [reload])
  useEffect(() => {
    adminListProducts({ status: 'active' }).then(setProducts).catch(() => {})
    adminListCategories().then(setCategories).catch(() => {})
  }, [])

  const showing = (items ?? []).filter((a) => a.is_active).length

  const remove = async (a) => {
    await adminDeleteAnnouncement(a.id)
    toast('Announcement removed')
    reload()
  }

  const move = async (index, delta) => {
    const next = [...items]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setItems(next)
    await adminReorderAnnouncements(next)
    toast('Order saved')
  }

  const toggle = async (a) => {
    await adminSaveAnnouncement({ ...a, is_active: !a.is_active })
    reload()
  }

  return (
    <div>
      <PageHeading
        eyebrow="Top of the shop"
        title="Announcements"
        subtitle={
          showing === 1
            ? 'One announcement showing. With only one, the strip sits still instead of rotating.'
            : `${showing} announcements, rotating every 3 seconds.`
        }
      />

      <button type="button" onClick={() => setEditing(blank())} className="btn-primary mt-6">
        <Icon name="plus" size={16} />
        Add an announcement
      </button>

      <div className="mt-6 space-y-3">
        {!items ? (
          <Skeleton className="h-24 w-full" />
        ) : items.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-[15px] font-medium text-ink">Nothing announced</p>
            <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-muted">
              With none set, the pink strip does not appear at all and the shop starts at the black
              contact bar.
            </p>
          </div>
        ) : (
          items.map((a, i) => (
            <article key={a.id} className="card flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-[200px] flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-[15px] font-medium text-ink">{a.text}</h2>
                  {!a.is_active && <Badge tone="neutral">Hidden</Badge>}
                </div>
                <p className="mt-1 text-[13px] text-muted">
                  {a.link_type === 'none' ? 'Not clickable' : `Links to a ${a.link_type}`}
                  {a.text.length > COMFORTABLE && ' · long for one line on a phone'}
                </p>
              </div>

              <div className="flex gap-1.5">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0}
                        aria-label="Move up" className="btn-ghost !px-2.5 !py-2 disabled:opacity-40">
                  <Icon name="chevronDown" size={15} className="rotate-180" />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1}
                        aria-label="Move down" className="btn-ghost !px-2.5 !py-2 disabled:opacity-40">
                  <Icon name="chevronDown" size={15} />
                </button>
                <button type="button" onClick={() => toggle(a)} className="btn-ghost !py-2 text-[13px]">
                  {a.is_active ? 'Hide' : 'Show'}
                </button>
                <button type="button" onClick={() => setEditing(a)} className="btn-ghost !py-2 text-[13px]">
                  Edit
                </button>
                <button type="button" onClick={() => remove(a)}
                        aria-label="Remove" className="btn-ghost !px-2.5 !py-2 text-wine">
                  <Icon name="trash" size={15} />
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      {editing && (
        <Editor
          item={editing}
          products={products}
          categories={categories}
          count={items?.length ?? 0}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); reload() }}
        />
      )}
    </div>
  )
}

function Editor({ item, products, categories, count, onClose, onSaved }) {
  const { toast } = useToast()
  const [form, setForm] = useState({ ...item })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await adminSaveAnnouncement({ ...form, sort_order: form.sort_order ?? count })
      toast('Announcement saved')
      onSaved()
    } catch (err) {
      setError(err.message ?? 'Could not save that')
      setBusy(false)
    }
  }

  const long = form.text.length > COMFORTABLE

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()}
            className="card max-h-[90vh] w-full max-w-[560px] overflow-y-auto p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-[22px] font-semibold text-ink">
            {item.id ? 'Edit announcement' : 'New announcement'}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close"
                  className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-blush">
            <Icon name="close" size={18} />
          </button>
        </div>

        <label className="mt-6 block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink">What it says</span>
          <input required value={form.text} onChange={set('text')} className="field"
                 placeholder="Explore Deals! Click Here" />
          <span className={`mt-1.5 block text-[12px] ${long ? 'text-wine' : 'text-muted'}`}>
            {form.text.length} characters
            {long && ' — long for a single line on a phone. Around 42 reads comfortably.'}
          </span>
        </label>

        {/* Shown as the shop shows it, so the wording is judged in place. */}
        <div className="mt-5">
          <p className="text-[13px] font-medium text-ink">How it will look</p>
          <div className="mt-2 overflow-hidden rounded-xl border border-line">
            <div className="flex h-9 items-center justify-center gap-1.5 bg-blush px-4">
              <Icon name="sparkle" size={13} className="shrink-0 text-wine" />
              <span className="truncate text-[13px] font-medium text-ink">
                {form.text || 'Your announcement'}
              </span>
              {form.link_type !== 'none' && (
                <Icon name="arrowRight" size={13} className="shrink-0 text-wine" />
              )}
            </div>
          </div>
        </div>

        <label className="mt-5 block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink">Where it goes when clicked</span>
          <select value={form.link_type} onChange={set('link_type')} className="field">
            <option value="none">Nowhere — just text</option>
            <option value="category">A category</option>
            <option value="product">A product</option>
            <option value="url">A page</option>
          </select>
        </label>

        {form.link_type === 'category' && (
          <label className="mt-4 block">
            <span className="mb-1.5 block text-[12px] font-medium text-ink">Which category</span>
            <select required value={form.category_id ?? ''} onChange={set('category_id')} className="field">
              <option value="">Choose a category…</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
        )}

        {form.link_type === 'product' && (
          <label className="mt-4 block">
            <span className="mb-1.5 block text-[12px] font-medium text-ink">Which product</span>
            <select required value={form.product_id ?? ''} onChange={set('product_id')} className="field">
              <option value="">Choose a product…</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
        )}

        {form.link_type === 'url' && (
          <label className="mt-4 block">
            <span className="mb-1.5 block text-[12px] font-medium text-ink">Address</span>
            <input required value={form.url ?? ''} onChange={set('url')} className="field"
                   placeholder="/new-arrivals" />
          </label>
        )}

        <label className="mt-5 flex items-center gap-3">
          <input type="checkbox" checked={form.is_active}
                 onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                 className="h-4 w-4 accent-wine" />
          <span className="text-[13px] text-ink">Show this on the shop</span>
        </label>

        {error && <p className="mt-4 text-[13px] text-wine">{error}</p>}

        <div className="mt-6 flex gap-3">
          <button type="submit" disabled={busy} className="btn-primary disabled:opacity-50">
            {busy ? 'Saving…' : 'Save'}
          </button>
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
        </div>
      </form>
    </div>
  )
}
