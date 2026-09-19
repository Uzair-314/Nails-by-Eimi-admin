import { useCallback, useEffect, useState } from 'react'
import Icon from '../components/Icon'
import { Badge, PageHeading, Skeleton } from '../components/ui'
import { formatPrice } from '../lib/format'
import { useToast } from '../context/ToastContext'
import {
  adminDeleteProduct, adminListCategories, adminListProducts,
  adminSetPrice, adminSetProductFlag, adminSetStock,
} from '../lib/adminApi'
import ProductEditor from './ProductEditor'

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Live' },
  { value: 'hidden', label: 'Hidden' },
  { value: 'out-of-stock', label: 'Out of stock' },
]

export default function AdminProducts() {
  const [products, setProducts] = useState(null)
  const [categories, setCategories] = useState([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [editing, setEditing] = useState(null) // null | 'new' | product row
  const [priceDraft, setPriceDraft] = useState({}) // id -> in-progress price text
  const { toast } = useToast()

  const reload = useCallback(async () => {
    setProducts(await adminListProducts({ search, status }))
  }, [search, status])

  useEffect(() => { adminListCategories().then(setCategories).catch(() => setCategories([])) }, [])

  useEffect(() => {
    const t = setTimeout(reload, 180)
    return () => clearTimeout(t)
  }, [reload])

  // Picks up changes made elsewhere — another tab, or the shop in a second window.
  useEffect(() => {
    const refresh = () => { if (!document.hidden) reload() }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [reload])

  const toggleFlag = async (product, field) => {
    await adminSetProductFlag(product.id, field, !product[field])
    toast(field === 'is_active'
      ? (product.is_active ? 'Hidden from the shop' : 'Now live in the shop')
      : (product.is_available ? 'Marked out of stock' : 'Back in stock'))
    reload()
  }

  const changeStock = async (product, value) => {
    const n = Math.max(0, Number(value) || 0)
    await adminSetStock(product.id, n)
    setProducts((list) => list.map((p) => (p.id === product.id ? { ...p, stock: n } : p)))
  }

  // Committed on blur or Enter rather than per keystroke, so typing "1200"
  // does not save 1, then 12, then 120 on the way.
  const commitPrice = async (product, value) => {
    const n = Number(value)
    if (!Number.isFinite(n) || n < 0 || n === Number(product.price)) {
      setPriceDraft((d) => { const next = { ...d }; delete next[product.id]; return next })
      return
    }
    try {
      await adminSetPrice(product.id, n)
      setProducts((list) => list.map((p) => (p.id === product.id ? { ...p, price: n } : p)))
      toast(`${product.name} is now ${formatPrice(n)}`)
    } catch (err) {
      toast(err.message ?? 'Could not save that price')
    } finally {
      setPriceDraft((d) => { const next = { ...d }; delete next[product.id]; return next })
    }
  }

  const remove = async (product) => {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return
    await adminDeleteProduct(product.id)
    toast('Product deleted')
    reload()
  }

  if (editing) {
    return (
      <ProductEditor
        product={editing === 'new' ? null : editing}
        categories={categories}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); reload() }}
      />
    )
  }

  return (
    <div>
      <PageHeading
        eyebrow="Catalogue"
        title="Products"
        subtitle="Prices, stock, photos and what shows in the shop."
        action={
          <button type="button" onClick={() => setEditing('new')} className="btn-primary">
            <Icon name="plus" size={16} />
            New product
          </button>
        }
      />

      <div className="mt-7 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Icon name="search" size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className="w-full rounded-full border border-line bg-white py-2.5 pl-10 pr-4 text-sm focus:border-wine-200"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatus(f.value)}
              className={`pill !py-2 ${status === f.value ? 'pill-active' : ''}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {!products ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-card" />)
        ) : products.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-sm text-muted">No products match that.</p>
          </div>
        ) : (
          products.map((p) => {
            const image = p.product_images?.slice().sort((a, b) => a.sort_order - b.sort_order)[0]?.url
            const outOfStock = p.stock === 0 || !p.is_available
            return (
              <article key={p.id} className="card flex flex-wrap items-center gap-4 p-4">
                <img
                  src={image ?? '/media/p-pearl.svg'}
                  alt=""
                  className="h-16 w-16 shrink-0 rounded-xl object-cover"
                />

                <div className="min-w-[180px] flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[15px] font-medium text-ink">{p.name}</h2>
                    {!p.is_active && <Badge tone="neutral">Hidden</Badge>}
                    {outOfStock && <Badge tone="rose">Out of stock</Badge>}
                    {p.is_featured && <Badge tone="amber">Featured</Badge>}
                  </div>
                  <p className="mt-1 text-[12px] text-muted">
                    {(p.product_categories ?? []).length
                      ? p.product_categories
                          .map((pc) => pc.categories?.name)
                          .filter(Boolean)
                          .join(', ')
                      : 'Uncategorised'} · {p.slug}
                  </p>
                </div>

                <label className="flex items-center gap-2 text-[12px] text-muted">
                  Rs
                  <input
                    type="number"
                    min={0}
                    step="1"
                    value={priceDraft[p.id] ?? p.price}
                    onChange={(e) => setPriceDraft((d) => ({ ...d, [p.id]: e.target.value }))}
                    onBlur={(e) => commitPrice(p, e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                    aria-label={`Price for ${p.name}`}
                    className="w-24 rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm font-semibold
                               text-wine focus:border-wine-200"
                  />
                  {p.compare_at && (
                    <span className="text-[11px] text-muted line-through">{formatPrice(p.compare_at)}</span>
                  )}
                </label>

                <label className="flex items-center gap-2 text-[12px] text-muted">
                  Stock
                  <input
                    type="number"
                    min={0}
                    value={p.stock}
                    onChange={(e) => changeStock(p, e.target.value)}
                    className="w-20 rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm text-ink focus:border-wine-200"
                  />
                </label>

                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => toggleFlag(p, 'is_available')}
                    title={p.is_available ? 'Mark out of stock' : 'Mark back in stock'}
                    className="btn-ghost !px-2.5 !py-2"
                  >
                    <Icon name={p.is_available ? 'check' : 'close'} size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleFlag(p, 'is_active')}
                    title={p.is_active ? 'Hide from shop' : 'Show in shop'}
                    className="btn-ghost !px-2.5 !py-2"
                  >
                    <Icon name="eye" size={16} />
                  </button>
                  <button type="button" onClick={() => setEditing(p)} className="btn-ghost !py-2 text-[13px]">
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(p)}
                    className="btn-quiet !px-2.5 !py-2 hover:!bg-red-50 hover:!text-red-700"
                    title="Delete"
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              </article>
            )
          })
        )}
      </div>
    </div>
  )
}
