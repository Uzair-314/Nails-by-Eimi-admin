import { useRef, useState } from 'react'
import Icon from '../components/Icon'
import { PageHeading } from '../components/ui'
import { formatPrice } from '../lib/format'
import { useToast } from '../context/ToastContext'
import {
  adminCreateProduct, adminDeleteImage, adminUpdateProduct, adminUploadImage,
} from '../lib/adminApi'
import { NAIL_COLORS, normalizeHex, readableOn } from '../lib/nailColors'

const slugify = (s) =>
  s.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')

const TAG_OPTIONS = ['new', 'bestseller', 'deal', 'press-on', 'gel', 'pro', 'sheer']

export default function ProductEditor({ product, categories, onClose, onSaved }) {
  const isNew = !product
  const { toast } = useToast()
  const fileInput = useRef(null)

  const [form, setForm] = useState(() => ({
    slug: product?.slug ?? '',
    name: product?.name ?? '',
    description: product?.description ?? '',
    details: product?.details ?? [],
    price: product?.price ?? '',
    compare_at: product?.compare_at ?? '',
    stock: product?.stock ?? 0,
    is_available: product?.is_available ?? true,
    is_active: product?.is_active ?? true,
    is_featured: product?.is_featured ?? false,
    category_ids: (product?.product_categories ?? []).map((pc) => pc.category_id),
    tags: product?.tags ?? [],
    color_name: product?.color_name ?? '',
    color_hex: product?.color_hex ?? '',
  }))

  const [images, setImages] = useState(
    () => (product?.product_images ?? []).slice().sort((a, b) => a.sort_order - b.sort_order)
  )
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const setDetail = (i, value) =>
    setForm((f) => ({ ...f, details: f.details.map((d, n) => (n === i ? value : d)) }))

  const toggleCategory = (id) =>
    setForm((f) => ({
      ...f,
      category_ids: f.category_ids.includes(id)
        ? f.category_ids.filter((c) => c !== id)
        : [...f.category_ids, id],
    }))

  const toggleTag = (tag) =>
    setForm((f) => ({ ...f, tags: f.tags.includes(tag) ? f.tags.filter((t) => t !== tag) : [...f.tags, tag] }))

  // Picking a swatch always sets the colour, but only renames the shade when the
  // current name is empty or is itself a palette name — so a shade the shop has
  // named itself ("Eimi's Red") survives a nudge to the colour.
  const pickPreset = ({ name, hex }) =>
    setForm((f) => ({
      ...f,
      color_hex: hex,
      color_name:
        !f.color_name.trim() || NAIL_COLORS.some((c) => c.name === f.color_name.trim())
          ? name
          : f.color_name,
    }))

  const clearColor = () => set({ color_name: '', color_hex: '' })

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = {
        ...form,
        slug: form.slug || slugify(form.name),
        price: Number(form.price),
        compare_at: form.compare_at === '' ? null : Number(form.compare_at),
        stock: Number(form.stock),
        details: form.details.filter((d) => d.trim()),
      }
      if (payload.compare_at != null && payload.compare_at <= payload.price) {
        throw new Error('The “was” price must be higher than the current price, or left empty.')
      }

      if (isNew) {
        const created = await adminCreateProduct(payload)
        toast('Product created — add photos next')
        onSaved(created)
      } else {
        await adminUpdateProduct(product.id, payload)
        toast('Product saved')
        onSaved()
      }
    } catch (err) {
      setError(err.message ?? 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  const upload = async (e) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length || isNew) return
    setUploading(true)
    try {
      for (const file of files) {
        const row = await adminUploadImage(product.id, file)
        setImages((list) => [...list, row])
      }
      toast(`${files.length} ${files.length === 1 ? 'photo' : 'photos'} uploaded`)
    } catch (err) {
      setError(err.message ?? 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const removeImage = async (image) => {
    await adminDeleteImage(image)
    setImages((list) => list.filter((i) => i.id !== image.id))
    toast('Photo removed')
  }

  const margin = form.compare_at && form.price
    ? Math.round(((Number(form.compare_at) - Number(form.price)) / Number(form.compare_at)) * 100)
    : null

  return (
    <form onSubmit={submit}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeading
          eyebrow={isNew ? 'New' : 'Editing'}
          title={isNew ? 'Add a product' : form.name || 'Product'}
        />
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : isNew ? 'Create' : 'Save changes'}
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-5 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-800">
          <Icon name="info" size={15} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="font-display text-[20px] font-semibold text-ink">Details</h2>

            <label className="mt-4 block">
              <span className="mb-1.5 block text-[13px] font-medium text-ink">Name</span>
              <input
                required
                value={form.name}
                onChange={(e) => set({ name: e.target.value, slug: isNew ? slugify(e.target.value) : form.slug })}
                className="field"
                placeholder="Ballet Slipper Press-On Set"
              />
            </label>

            <label className="mt-4 block">
              <span className="mb-1.5 block text-[13px] font-medium text-ink">Web address</span>
              <input
                required
                value={form.slug}
                onChange={(e) => set({ slug: slugify(e.target.value) })}
                className="field"
              />
              <span className="mt-1 block text-[12px] text-muted">/product/{form.slug || '…'}</span>
            </label>

            <label className="mt-4 block">
              <span className="mb-1.5 block text-[13px] font-medium text-ink">Description</span>
              <textarea
                rows={4}
                value={form.description}
                onChange={(e) => set({ description: e.target.value })}
                className="field resize-none"
              />
            </label>

            <div className="mt-4">
              <span className="mb-1.5 block text-[13px] font-medium text-ink">Spec list</span>
              <div className="space-y-2">
                {form.details.map((d, i) => (
                  <div key={i} className="flex gap-2">
                    <input value={d} onChange={(e) => setDetail(i, e.target.value)} className="field" />
                    <button
                      type="button"
                      onClick={() => set({ details: form.details.filter((_, n) => n !== i) })}
                      className="btn-quiet !px-3"
                      aria-label="Remove line"
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => set({ details: [...form.details, ''] })}
                className="btn-ghost mt-2 !py-2 text-[13px]"
              >
                <Icon name="plus" size={15} />
                Add a line
              </button>
            </div>
          </section>

          <section className="card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-[20px] font-semibold text-ink">Shade</h2>
              {(form.color_hex || form.color_name) && (
                <button type="button" onClick={clearColor} className="btn-quiet !py-1.5 text-[13px]">
                  Clear
                </button>
              )}
            </div>

            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
              The nail colour a shopper sees on the product page and on the card in a
              listing. Optional — leave it empty and nothing is shown.
            </p>

            <div className="mt-4 flex items-center gap-3">
              <span
                className="grid h-12 w-12 shrink-0 place-items-center rounded-full ring-1 ring-black/10"
                style={{ background: normalizeHex(form.color_hex) ?? 'repeating-linear-gradient(45deg,#F4F1EE 0 6px,#E9E4DF 6px 12px)' }}
              >
                {!normalizeHex(form.color_hex) && <Icon name="close" size={14} className="text-muted" />}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[14px] font-medium text-ink">
                  {form.color_name.trim() || 'No shade set'}
                </p>
                <p className="text-[12px] text-muted">
                  {normalizeHex(form.color_hex) ?? 'No colour chosen'}
                </p>
              </div>
            </div>

            <div className="mt-5">
              <span className="mb-2 block text-[13px] font-medium text-ink">Palette</span>
              <div className="flex flex-wrap gap-2">
                {NAIL_COLORS.map((c) => {
                  const active = normalizeHex(form.color_hex) === c.hex
                  return (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => pickPreset(c)}
                      title={`${c.name} · ${c.hex}`}
                      aria-label={c.name}
                      aria-pressed={active}
                      className={`grid h-9 w-9 place-items-center rounded-full ring-1 ring-black/10 transition
                                  hover:scale-105 ${active ? 'outline outline-2 outline-offset-2 outline-[#E01B6A]' : ''}`}
                      style={{ background: c.hex }}
                    >
                      {active && <Icon name="check" size={14} style={{ color: readableOn(c.hex) }} />}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-medium text-ink">Shade name</span>
                <input
                  value={form.color_name}
                  onChange={(e) => set({ color_name: e.target.value })}
                  className="field"
                  placeholder="Ballet Blush"
                  maxLength={40}
                />
              </label>

              <div>
                <span className="mb-1.5 block text-[13px] font-medium text-ink">Custom colour</span>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={normalizeHex(form.color_hex) ?? '#F3D7D3'}
                    onChange={(e) => set({ color_hex: e.target.value.toUpperCase() })}
                    className="h-[42px] w-14 shrink-0 cursor-pointer rounded-lg border border-line bg-white p-1"
                    aria-label="Pick a custom colour"
                  />
                  <input
                    value={form.color_hex}
                    onChange={(e) => set({ color_hex: e.target.value })}
                    className="field"
                    placeholder="#F3D7D3"
                    maxLength={7}
                    spellCheck={false}
                  />
                </div>
                {form.color_hex.trim() && !normalizeHex(form.color_hex) && (
                  <span className="mt-1 block text-[12px] text-wine">
                    Needs to look like #F3D7D3 — saved as no colour until it does.
                  </span>
                )}
              </div>
            </div>
          </section>

          <section className="card p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-[20px] font-semibold text-ink">Photos</h2>
              {!isNew && (
                <>
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={upload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    disabled={uploading}
                    className="btn-ghost !py-2 text-[13px]"
                  >
                    <Icon name="plus" size={15} />
                    {uploading ? 'Uploading…' : 'Upload'}
                  </button>
                </>
              )}
            </div>

            {isNew ? (
              <p className="mt-4 text-[13px] text-muted">Create the product first, then photos can be uploaded here.</p>
            ) : images.length === 0 ? (
              <p className="mt-4 text-[13px] text-muted">No photos yet. The first one uploaded becomes the main image.</p>
            ) : (
              <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
                {images.map((img, i) => (
                  <div key={img.id} className="group relative">
                    <img src={img.url} alt="" className="aspect-square w-full rounded-xl object-cover" />
                    {i === 0 && (
                      <span className="absolute left-1.5 top-1.5 rounded-full bg-ink/80 px-2 py-0.5 text-[10px] text-white">
                        Main
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(img)}
                      aria-label="Remove photo"
                      className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-muted
                                 opacity-0 transition group-hover:opacity-100 hover:text-red-700"
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="card p-6">
            <h2 className="font-display text-[20px] font-semibold text-ink">Price</h2>

            <label className="mt-4 block">
              <span className="mb-1.5 block text-[13px] font-medium text-ink">Selling price (Rs)</span>
              <input
                required
                type="number"
                min={0}
                step="1"
                value={form.price}
                onChange={(e) => set({ price: e.target.value })}
                className="field"
              />
            </label>

            <label className="mt-4 block">
              <span className="mb-1.5 block text-[13px] font-medium text-ink">Was (Rs)</span>
              <input
                type="number"
                min={0}
                step="1"
                value={form.compare_at ?? ''}
                onChange={(e) => set({ compare_at: e.target.value })}
                className="field"
                placeholder="Leave empty for no discount"
              />
              {margin != null && margin > 0 && (
                <span className="mt-1 block text-[12px] text-wine">
                  Shows as {margin}% off · saves {formatPrice(Number(form.compare_at) - Number(form.price))}
                </span>
              )}
            </label>
          </section>

          <section className="card p-6">
            <h2 className="font-display text-[20px] font-semibold text-ink">Stock</h2>

            <label className="mt-4 block">
              <span className="mb-1.5 block text-[13px] font-medium text-ink">Units in stock</span>
              <input
                type="number"
                min={0}
                value={form.stock}
                onChange={(e) => set({ stock: e.target.value })}
                className="field"
              />
            </label>

            <label className="mt-4 flex items-center gap-2.5 text-[14px] text-ink">
              <input
                type="checkbox"
                checked={form.is_available}
                onChange={(e) => set({ is_available: e.target.checked })}
                className="h-4 w-4 accent-[#E01B6A]"
              />
              Available to buy
            </label>
            <p className="mt-1 text-[12px] text-muted">
              Untick to show “sold out” without changing the count.
            </p>
          </section>

          <section className="card p-6">
            <h2 className="font-display text-[20px] font-semibold text-ink">Placement</h2>

            <fieldset className="mt-4">
              <legend className="mb-2 text-[13px] font-medium text-ink">Categories</legend>
              <p className="mb-2.5 text-[12px] leading-relaxed text-muted">
                Tick every shelf this should appear on. The first one, by menu order, is
                used for the breadcrumb on the shop.
              </p>

              <div className="space-y-1">
                {categories.map((c) => (
                  <label
                    key={c.id}
                    className={[
                      'flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[14px] transition',
                      c.parent_id ? 'ml-5' : '',
                      form.category_ids.includes(c.id) ? 'bg-wine-50 text-ink' : 'text-muted hover:bg-blush',
                    ].join(' ')}
                  >
                    <input
                      type="checkbox"
                      checked={form.category_ids.includes(c.id)}
                      onChange={() => toggleCategory(c.id)}
                      className="h-4 w-4 accent-[#E01B6A]"
                    />
                    {c.name}
                  </label>
                ))}
              </div>

              {form.category_ids.length === 0 && (
                <p className="mt-2 text-[12px] text-muted">
                  With none ticked this will not appear under any category.
                </p>
              )}

              <p className="mt-2.5 flex items-start gap-1.5 text-[12px] leading-relaxed text-muted">
                <Icon name="info" size={13} className="mt-0.5 shrink-0" />
                Anything with a &ldquo;was&rdquo; price also shows in Deals automatically,
                ticked or not.
              </p>
            </fieldset>

            <div className="mt-4">
              <span className="mb-2 block text-[13px] font-medium text-ink">Tags</span>
              <div className="flex flex-wrap gap-2">
                {TAG_OPTIONS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`pill !py-1.5 text-[13px] ${form.tags.includes(tag) ? 'pill-active' : ''}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <label className="mt-5 flex items-center gap-2.5 text-[14px] text-ink">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => set({ is_active: e.target.checked })}
                className="h-4 w-4 accent-[#E01B6A]"
              />
              Visible in the shop
            </label>

            <label className="mt-3 flex items-center gap-2.5 text-[14px] text-ink">
              <input
                type="checkbox"
                checked={form.is_featured}
                onChange={(e) => set({ is_featured: e.target.checked })}
                className="h-4 w-4 accent-[#E01B6A]"
              />
              Feature on the homepage
            </label>
          </section>
        </aside>
      </div>
    </form>
  )
}
