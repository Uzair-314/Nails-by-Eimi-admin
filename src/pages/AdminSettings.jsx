import { useEffect, useState } from 'react'
import Icon from '../components/Icon'
import { PageHeading, Skeleton } from '../components/ui'
import { useToast } from '../context/ToastContext'
import { adminListSettings, adminSaveSetting } from '../lib/adminApi'

/**
 * Settings are stored as jsonb key/value rows, so the shape of each one is
 * declared here rather than in the database.
 */
const FIELDS = [
  { key: 'store_name',         label: 'Store name',              type: 'text',   group: 'Brand' },
  { key: 'contact_whatsapp',   label: 'WhatsApp / phone',        type: 'text',   group: 'Contact',
    hint: 'Shown in the top bar and footer.' },
  { key: 'contact_email',      label: 'Email',                   type: 'text',   group: 'Contact' },
  { key: 'announcement',       label: 'Top bar message',         type: 'text',   group: 'Contact' },
  { key: 'minimum_order',      label: 'Minimum order (Rs)',      type: 'number', group: 'Orders',
    hint: 'Customers cannot check out below this.' },
  { key: 'points_per_unit',    label: 'Points per Rs 1',         type: 'number', group: 'Loyalty',
    hint: '0.02 means 2 points for every Rs 100 spent.' },
]

const GROUPS = ['Brand', 'Contact', 'Orders', 'Loyalty']

export default function AdminSettings() {
  const [values, setValues] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const { toast } = useToast()

  useEffect(() => {
    adminListSettings().then((rows) => {
      const map = {}
      for (const r of rows) map[r.key] = r.value
      // Make sure every declared field has an entry, even if the row is missing.
      for (const f of FIELDS) if (!(f.key in map)) map[f.key] = f.type === 'number' ? 0 : ''
      setValues(map)
    })
  }, [])

  const set = (key, value) => setValues((v) => ({ ...v, [key]: value }))

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      for (const f of FIELDS) {
        const raw = values[f.key]
        await adminSaveSetting(f.key, f.type === 'number' ? Number(raw) : String(raw))
      }
      toast('Settings saved — reload the shop to see them')
    } catch (err) {
      setError(err.message ?? 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  if (!values) {
    return (
      <div>
        <PageHeading eyebrow="Configuration" title="Settings" />
        <Skeleton className="mt-7 h-80 w-full rounded-card" />
      </div>
    )
  }

  return (
    <form onSubmit={submit}>
      <PageHeading
        eyebrow="Configuration"
        title="Settings"
        subtitle="Contact details, delivery rules and the loyalty rate."
        action={
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        }
      />

      {error && (
        <p className="mt-5 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-800">
          <Icon name="info" size={15} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}

      <div className="mt-7 grid gap-6 sm:grid-cols-2">
        {GROUPS.map((group) => (
          <section key={group} className="card p-6">
            <h2 className="font-display text-[20px] font-semibold text-ink">{group}</h2>

            {FIELDS.filter((f) => f.group === group).map((f) => (
              <label key={f.key} className="mt-4 block">
                <span className="mb-1.5 block text-[13px] font-medium text-ink">{f.label}</span>
                <input
                  type={f.type}
                  step={f.key === 'points_per_unit' ? '0.001' : '1'}
                  value={values[f.key] ?? ''}
                  onChange={(e) => set(f.key, e.target.value)}
                  className="field"
                />
                {f.hint && <span className="mt-1 block text-[12px] text-muted">{f.hint}</span>}
              </label>
            ))}
          </section>
        ))}
      </div>

      <p className="mt-6 flex items-start gap-2 text-[12px] leading-relaxed text-muted">
        <Icon name="info" size={14} className="mt-0.5 shrink-0" />
        The shop reads these when a page loads, so an open tab keeps the old values until it is refreshed.
      </p>
    </form>
  )
}
