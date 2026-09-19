import { useEffect, useState } from 'react'
import Icon from '../components/Icon'
import { Badge, PageHeading, Skeleton } from '../components/ui'
import { formatDate, formatPrice } from '../lib/format'
import { useToast } from '../context/ToastContext'
import { adminDeleteDiscount, adminListDiscounts, adminSaveDiscount } from '../lib/adminApi'

const BLANK = { code: '', type: 'percent', value: 10, min_spend: 0, expires_at: '', usage_limit: '', is_active: true }

export default function AdminDiscounts() {
  const [discounts, setDiscounts] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const { toast } = useToast()

  useEffect(() => { adminListDiscounts().then(setDiscounts).catch(() => setDiscounts([])) }, [])

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const startNew = () => { setForm(BLANK); setEditing('new'); setError(null) }
  const startEdit = (d) => {
    setForm({
      ...d,
      expires_at: d.expires_at ? d.expires_at.slice(0, 10) : '',
      usage_limit: d.usage_limit ?? '',
    })
    setEditing(d.id)
    setError(null)
  }
  const cancel = () => { setEditing(null); setForm(BLANK) }

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      setDiscounts(await adminSaveDiscount(editing === 'new' ? { ...form, id: undefined } : form))
      toast(editing === 'new' ? 'Discount created' : 'Discount saved')
      cancel()
    } catch (err) {
      setError(err.message?.includes('duplicate') ? 'That code already exists.' : err.message ?? 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (d) => {
    if (!window.confirm(`Delete code ${d.code}?`)) return
    setDiscounts(await adminDeleteDiscount(d.id))
    toast('Discount deleted')
  }

  const expired = (d) => d.expires_at && new Date(d.expires_at) < new Date()
  const usedUp = (d) => d.usage_limit != null && d.times_used >= d.usage_limit

  return (
    <div>
      <PageHeading
        eyebrow="Promotions"
        title="Discounts"
        subtitle="Codes customers can enter at checkout."
        action={
          !editing && (
            <button type="button" onClick={startNew} className="btn-primary">
              <Icon name="plus" size={16} />
              New code
            </button>
          )
        }
      />

      {editing && (
        <form onSubmit={submit} className="card mt-7 p-6">
          <h2 className="font-display text-[20px] font-semibold text-ink">
            {editing === 'new' ? 'New discount' : 'Edit discount'}
          </h2>

          {error && <p className="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] text-red-800">{error}</p>}

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-ink">Code</span>
              <input
                required
                value={form.code}
                onChange={(e) => set({ code: e.target.value.toUpperCase() })}
                className="field uppercase"
                placeholder="WELCOME10"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-ink">Type</span>
              <select value={form.type} onChange={(e) => set({ type: e.target.value })} className="field">
                <option value="percent">Percentage off</option>
                <option value="fixed">Fixed amount off</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-ink">
                {form.type === 'percent' ? 'Percent off' : 'Amount off (Rs)'}
              </span>
              <input
                required
                type="number"
                min={1}
                max={form.type === 'percent' ? 100 : undefined}
                value={form.value}
                onChange={(e) => set({ value: Number(e.target.value) })}
                className="field"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-ink">Minimum spend (Rs)</span>
              <input
                type="number"
                min={0}
                value={form.min_spend}
                onChange={(e) => set({ min_spend: Number(e.target.value) })}
                className="field"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-ink">Expires</span>
              <input
                type="date"
                value={form.expires_at}
                onChange={(e) => set({ expires_at: e.target.value })}
                className="field"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-ink">Usage limit</span>
              <input
                type="number"
                min={1}
                value={form.usage_limit}
                onChange={(e) => set({ usage_limit: e.target.value })}
                className="field"
                placeholder="Unlimited"
              />
            </label>
          </div>

          <label className="mt-5 flex items-center gap-2.5 text-[14px] text-ink">
            <input type="checkbox" checked={form.is_active} onChange={(e) => set({ is_active: e.target.checked })} className="h-4 w-4 accent-[#E01B6A]" />
            Active
          </label>

          <div className="mt-6 flex gap-3">
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save'}</button>
            <button type="button" onClick={cancel} className="btn-ghost">Cancel</button>
          </div>
        </form>
      )}

      <div className="mt-7 space-y-3">
        {!discounts ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-card" />)
        ) : discounts.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-sm text-muted">No discount codes yet.</p>
          </div>
        ) : (
          discounts.map((d) => (
            <article key={d.id} className="card flex flex-wrap items-center gap-4 p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blush text-wine">
                <Icon name="tag" size={18} />
              </span>

              <div className="min-w-[160px] flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-mono text-[15px] font-medium tracking-wide text-ink">{d.code}</h2>
                  {!d.is_active && <Badge tone="neutral">Off</Badge>}
                  {expired(d) && <Badge tone="neutral">Expired</Badge>}
                  {usedUp(d) && <Badge tone="neutral">Used up</Badge>}
                </div>
                <p className="mt-1 text-[12px] text-muted">
                  {d.type === 'percent' ? `${d.value}% off` : `${formatPrice(d.value)} off`}
                  {Number(d.min_spend) > 0 && ` · over ${formatPrice(d.min_spend)}`}
                  {d.expires_at && ` · until ${formatDate(d.expires_at)}`}
                </p>
              </div>

              <p className="text-[13px] text-muted">
                Used {d.times_used}{d.usage_limit != null ? ` of ${d.usage_limit}` : ''}
              </p>

              <div className="flex gap-1.5">
                <button type="button" onClick={() => startEdit(d)} className="btn-ghost !py-2 text-[13px]">Edit</button>
                <button
                  type="button"
                  onClick={() => remove(d)}
                  className="btn-quiet !px-2.5 !py-2 hover:!bg-red-50 hover:!text-red-700"
                  aria-label={`Delete ${d.code}`}
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
