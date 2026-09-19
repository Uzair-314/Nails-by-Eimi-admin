import { useEffect, useState } from 'react'
import Icon from '../components/Icon'
import { Badge, PageHeading, Skeleton } from '../components/ui'
import { useToast } from '../context/ToastContext'
import { adminDeleteCategory, adminListCategories, adminSaveCategory } from '../lib/adminApi'

const ICONS = ['tag', 'bottle', 'kit', 'gem', 'ring', 'nail', 'sparkle', 'gift', 'heart']

const BLANK = { slug: '', name: '', blurb: '', icon: 'tag', parent_id: '', sort_order: 0, is_active: true }

export default function AdminCategories() {
  const [categories, setCategories] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const { toast } = useToast()

  useEffect(() => { adminListCategories().then(setCategories).catch(() => setCategories([])) }, [])

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const startNew = () => { setForm(BLANK); setEditing('new'); setError(null) }
  const startEdit = (c) => {
    setForm({ ...c, parent_id: c.parent_id ?? '', blurb: c.blurb ?? '' })
    setEditing(c.id)
    setError(null)
  }
  const cancel = () => { setEditing(null); setForm(BLANK) }

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      setCategories(await adminSaveCategory(editing === 'new' ? { ...form, id: undefined } : form))
      toast(editing === 'new' ? 'Category added' : 'Category saved')
      cancel()
    } catch (err) {
      setError(err.message ?? 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (c) => {
    if (!window.confirm(`Delete "${c.name}"? Products in it become uncategorised, and any sub-categories are removed too.`)) return
    setCategories(await adminDeleteCategory(c.id))
    toast('Category deleted')
  }

  const parents = (categories ?? []).filter((c) => !c.parent_id)
  const childrenOf = (id) => (categories ?? []).filter((c) => c.parent_id === id)

  return (
    <div>
      <PageHeading
        eyebrow="Structure"
        title="Categories"
        subtitle="What appears in the menu and how products are grouped."
        action={
          !editing && (
            <button type="button" onClick={startNew} className="btn-primary">
              <Icon name="plus" size={16} />
              New category
            </button>
          )
        }
      />

      {editing && (
        <form onSubmit={submit} className="card mt-7 p-6">
          <h2 className="font-display text-[20px] font-semibold text-ink">
            {editing === 'new' ? 'New category' : 'Edit category'}
          </h2>

          {error && (
            <p className="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] text-red-800">{error}</p>
          )}

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-ink">Name</span>
              <input required value={form.name} onChange={(e) => set({ name: e.target.value })} className="field" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-ink">Web address</span>
              <input required value={form.slug} onChange={(e) => set({ slug: e.target.value })} className="field" placeholder="gel-polishes" />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-[13px] font-medium text-ink">Description</span>
              <input value={form.blurb} onChange={(e) => set({ blurb: e.target.value })} className="field" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-ink">Sits under</span>
              <select value={form.parent_id} onChange={(e) => set({ parent_id: e.target.value })} className="field">
                <option value="">Top level</option>
                {parents.filter((p) => p.id !== form.id).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-ink">Order</span>
              <input type="number" value={form.sort_order} onChange={(e) => set({ sort_order: Number(e.target.value) })} className="field" />
            </label>
          </div>

          <div className="mt-4">
            <span className="mb-2 block text-[13px] font-medium text-ink">Icon</span>
            <div className="flex flex-wrap gap-2">
              {ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => set({ icon })}
                  aria-label={icon}
                  className={[
                    'grid h-10 w-10 place-items-center rounded-xl border transition',
                    form.icon === icon ? 'border-wine bg-wine text-white' : 'border-line bg-white text-muted hover:text-wine',
                  ].join(' ')}
                >
                  <Icon name={icon} size={18} />
                </button>
              ))}
            </div>
          </div>

          <label className="mt-5 flex items-center gap-2.5 text-[14px] text-ink">
            <input type="checkbox" checked={form.is_active} onChange={(e) => set({ is_active: e.target.checked })} className="h-4 w-4 accent-[#E01B6A]" />
            Show in the menu
          </label>

          <div className="mt-6 flex gap-3">
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save'}</button>
            <button type="button" onClick={cancel} className="btn-ghost">Cancel</button>
          </div>
        </form>
      )}

      <div className="mt-7 space-y-3">
        {!categories ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-card" />)
        ) : (
          parents.map((c) => (
            <article key={c.id} className="card p-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blush text-wine">
                  <Icon name={c.icon} size={18} />
                </span>
                <div className="min-w-[160px] flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-[15px] font-medium text-ink">{c.name}</h2>
                    {!c.is_active && <Badge tone="neutral">Hidden</Badge>}
                  </div>
                  <p className="text-[12px] text-muted">/category/{c.slug}</p>
                </div>
                <button type="button" onClick={() => startEdit(c)} className="btn-ghost !py-2 text-[13px]">Edit</button>
                <button
                  type="button"
                  onClick={() => remove(c)}
                  className="btn-quiet !px-2.5 !py-2 hover:!bg-red-50 hover:!text-red-700"
                  aria-label={`Delete ${c.name}`}
                >
                  <Icon name="trash" size={16} />
                </button>
              </div>

              {childrenOf(c.id).length > 0 && (
                <ul className="ml-[52px] mt-3 space-y-2 border-l border-line pl-4">
                  {childrenOf(c.id).map((child) => (
                    <li key={child.id} className="flex flex-wrap items-center gap-3">
                      <span className="min-w-[140px] flex-1">
                        <span className="block text-[14px] text-ink">{child.name}</span>
                        <span className="text-[12px] text-muted">/category/{child.slug}</span>
                      </span>
                      {!child.is_active && <Badge tone="neutral">Hidden</Badge>}
                      <button type="button" onClick={() => startEdit(child)} className="btn-quiet !py-1.5 text-[13px]">Edit</button>
                      <button
                        type="button"
                        onClick={() => remove(child)}
                        className="btn-quiet !px-2 !py-1.5 hover:!bg-red-50 hover:!text-red-700"
                        aria-label={`Delete ${child.name}`}
                      >
                        <Icon name="trash" size={15} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))
        )}
      </div>
    </div>
  )
}
