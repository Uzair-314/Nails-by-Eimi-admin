import { useEffect, useState } from 'react'
import Icon from '../components/Icon'
import { Badge, PageHeading, Skeleton } from '../components/ui'
import { formatPrice } from '../lib/format'
import { useToast } from '../context/ToastContext'
import {
  adminDeleteShippingMethod, adminListShippingMethods, adminSaveShippingMethod,
} from '../lib/adminApi'

const BLANK = {
  name: '', description: '', price: 300, free_over: 5000,
  estimate: '', is_active: true, sort_order: 0,
}

export default function AdminShipping() {
  const [methods, setMethods] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const { toast } = useToast()

  useEffect(() => {
    adminListShippingMethods().then(setMethods).catch(() => setMethods([]))
  }, [])

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const startNew = () => { setForm(BLANK); setEditing('new'); setError(null) }
  const startEdit = (m) => {
    setForm({ ...m, free_over: m.free_over ?? '' })
    setEditing(m.id)
    setError(null)
  }
  const cancel = () => { setEditing(null); setForm(BLANK) }

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      setMethods(await adminSaveShippingMethod(editing === 'new' ? { ...form, id: undefined } : form))
      toast(editing === 'new' ? 'Delivery option added' : 'Delivery option saved')
      cancel()
    } catch (err) {
      setError(err.message ?? 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (m) => {
    if (!window.confirm(`Delete "${m.name}"? Past orders keep the name they were placed with.`)) return
    setMethods(await adminDeleteShippingMethod(m.id))
    toast('Delivery option deleted')
  }

  const activeCount = (methods ?? []).filter((m) => m.is_active).length

  return (
    <div>
      <PageHeading
        eyebrow="Fulfilment"
        title="Delivery options"
        subtitle="What customers can choose from at checkout, and what each one costs."
        action={
          !editing && (
            <button type="button" onClick={startNew} className="btn-primary">
              <Icon name="plus" size={16} />
              New option
            </button>
          )
        }
      />

      {methods && activeCount === 0 && (
        <p className="mt-6 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-800">
          <Icon name="info" size={15} className="mt-0.5 shrink-0" />
          No active delivery option, so checkout has nothing to offer and shipping falls back to free.
          Add one or reactivate an existing one.
        </p>
      )}

      {editing && (
        <form onSubmit={submit} className="card mt-7 p-6">
          <h2 className="font-display text-[20px] font-semibold text-ink">
            {editing === 'new' ? 'New delivery option' : 'Edit delivery option'}
          </h2>

          {error && <p className="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] text-red-800">{error}</p>}

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-ink">Name</span>
              <input
                required
                value={form.name}
                onChange={(e) => set({ name: e.target.value })}
                className="field"
                placeholder="Standard Delivery"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-ink">Delivery estimate</span>
              <input
                value={form.estimate}
                onChange={(e) => set({ estimate: e.target.value })}
                className="field"
                placeholder="3–5 working days"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-[13px] font-medium text-ink">Description</span>
              <input
                value={form.description}
                onChange={(e) => set({ description: e.target.value })}
                className="field"
                placeholder="Dispatched within 24 hours."
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-ink">Price (Rs)</span>
              <input
                required
                type="number"
                min={0}
                value={form.price}
                onChange={(e) => set({ price: e.target.value })}
                className="field"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-ink">Free over (Rs)</span>
              <input
                type="number"
                min={0}
                value={form.free_over}
                onChange={(e) => set({ free_over: e.target.value })}
                className="field"
                placeholder="Leave empty to always charge"
              />
              <span className="mt-1 block text-[12px] text-muted">
                Orders at or above this get this option free.
              </span>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-ink">Order in the list</span>
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) => set({ sort_order: e.target.value })}
                className="field"
              />
              <span className="mt-1 block text-[12px] text-muted">
                Lowest shows first and is selected by default.
              </span>
            </label>
          </div>

          <label className="mt-5 flex items-center gap-2.5 text-[14px] text-ink">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => set({ is_active: e.target.checked })}
              className="h-4 w-4 accent-[#E01B6A]"
            />
            Offer at checkout
          </label>

          <div className="mt-6 flex gap-3">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={cancel} className="btn-ghost">Cancel</button>
          </div>
        </form>
      )}

      <div className="mt-7 space-y-3">
        {!methods ? (
          Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-card" />)
        ) : methods.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-sm text-muted">No delivery options yet.</p>
          </div>
        ) : (
          methods.map((m) => (
            <article key={m.id} className="card flex flex-wrap items-center gap-4 p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blush text-wine">
                <Icon name="truck" size={18} />
              </span>

              <div className="min-w-[180px] flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[15px] font-medium text-ink">{m.name}</h2>
                  {!m.is_active && <Badge tone="neutral">Off</Badge>}
                </div>
                <p className="mt-1 text-[12px] text-muted">
                  {m.estimate || 'No estimate'}
                  {m.description && ` · ${m.description}`}
                </p>
              </div>

              <div className="text-right">
                <p className="text-[15px] font-semibold text-wine">{formatPrice(m.price)}</p>
                {m.free_over != null && (
                  <p className="text-[12px] text-muted">Free over {formatPrice(m.free_over)}</p>
                )}
              </div>

              <div className="flex gap-1.5">
                <button type="button" onClick={() => startEdit(m)} className="btn-ghost !py-2 text-[13px]">
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => remove(m)}
                  className="btn-quiet !px-2.5 !py-2 hover:!bg-red-50 hover:!text-red-700"
                  aria-label={`Delete ${m.name}`}
                >
                  <Icon name="trash" size={16} />
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  )
}
