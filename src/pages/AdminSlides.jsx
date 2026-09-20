import { useCallback, useEffect, useRef, useState } from 'react'
import Icon from '../components/Icon'
import { Badge, PageHeading, Skeleton } from '../components/ui'
import { useToast } from '../context/ToastContext'
import {
  adminDeleteSlide, adminListCategories, adminListProducts, adminListSlides,
  adminReorderSlides, adminSaveSlide, adminUploadSlideImage,
} from '../lib/adminApi'

const MAX_SLIDES = 3

/**
 * The shop draws a hero at three different shapes. A picture cannot be all
 * three at once, and stretching it to fit is not an option — so it is always
 * drawn with object-cover, which keeps its proportions, and the focal point
 * below decides which part survives the crop.
 *
 * These are the same ratios the storefront uses. Keep them in step.
 */
const SHAPES = [
  { label: 'Desktop', ratio: '21 / 9' },
  { label: 'Tablet', ratio: '16 / 9' },
  { label: 'Phone', ratio: '4 / 5' },
]

/** Wide enough for a large screen without making anyone wait for it to load. */
const IDEAL = { width: 2100, height: 900 }

const blank = () => ({
  image_url: '', alt: '', eyebrow: '', title: '', copy: '', cta_label: '',
  link_type: 'none', product_id: null, category_id: null, url: '',
  focal_x: 50, focal_y: 50, is_active: true, sort_order: 0,
})

export default function AdminSlides() {
  const { toast } = useToast()
  const [slides, setSlides] = useState(null)
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [editing, setEditing] = useState(null)

  const reload = useCallback(async () => {
    setSlides(await adminListSlides())
  }, [])

  useEffect(() => { reload() }, [reload])
  useEffect(() => {
    adminListProducts({ status: 'active' }).then(setProducts).catch(() => {})
    adminListCategories().then(setCategories).catch(() => {})
  }, [])

  const activeCount = (slides ?? []).filter((s) => s.is_active).length
  const full = activeCount >= MAX_SLIDES

  const remove = async (slide) => {
    await adminDeleteSlide(slide)
    toast('Slide removed')
    reload()
  }

  const move = async (index, delta) => {
    const next = [...slides]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setSlides(next)
    await adminReorderSlides(next)
    toast('Order saved')
  }

  return (
    <div>
      <PageHeading
        eyebrow="Home page"
        title="Slideshow"
        subtitle={`The three big pictures at the top of the shop. ${activeCount} of ${MAX_SLIDES} showing.`}
      />

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={full}
          onClick={() => setEditing(blank())}
          title={full ? 'Hide or remove a slide first' : undefined}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Icon name="plus" size={16} />
          Add a slide
        </button>
        {full && (
          <p className="text-[13px] text-muted">
            The slideshow holds three. Hide or remove one to add another.
          </p>
        )}
      </div>

      <div className="mt-6 space-y-4">
        {!slides ? (
          <Skeleton className="h-32 w-full" />
        ) : slides.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-[15px] font-medium text-ink">No slides yet</p>
            <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-muted">
              With none set, the shop shows no slideshow at all — the page simply starts at the
              collections below it.
            </p>
          </div>
        ) : (
          slides.map((slide, i) => (
            <article key={slide.id} className="card flex flex-wrap items-center gap-4 p-4">
              <div className="h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-blush">
                {slide.image_url && (
                  <img
                    src={slide.image_url}
                    alt=""
                    className="h-full w-full object-cover"
                    style={{ objectPosition: `${slide.focal_x}% ${slide.focal_y}%` }}
                  />
                )}
              </div>

              <div className="min-w-[180px] flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-[15px] font-medium text-ink">{slide.title}</h2>
                  {!slide.is_active && <Badge tone="neutral">Hidden</Badge>}
                </div>
                <p className="mt-1 text-[13px] text-muted">
                  {slide.eyebrow ? `${slide.eyebrow} · ` : ''}
                  {slide.cta_label ? `Button: ${slide.cta_label}` : 'No button'}
                </p>
              </div>

              <div className="flex gap-1.5">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0}
                        aria-label="Move up" className="btn-ghost !px-2.5 !py-2 disabled:opacity-40">
                  <Icon name="chevronDown" size={15} className="rotate-180" />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === slides.length - 1}
                        aria-label="Move down" className="btn-ghost !px-2.5 !py-2 disabled:opacity-40">
                  <Icon name="chevronDown" size={15} />
                </button>
                <button type="button" onClick={() => setEditing(slide)} className="btn-ghost !py-2 text-[13px]">
                  Edit
                </button>
                <button type="button" onClick={() => remove(slide)}
                        aria-label="Remove slide" className="btn-ghost !px-2.5 !py-2 text-wine">
                  <Icon name="trash" size={15} />
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      {editing && (
        <SlideEditor
          slide={editing}
          products={products}
          categories={categories}
          slideCount={slides?.length ?? 0}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); reload() }}
        />
      )}
    </div>
  )
}

function SlideEditor({ slide, products, categories, slideCount, onClose, onSaved }) {
  const { toast } = useToast()
  const [form, setForm] = useState({ ...slide })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [size, setSize] = useState(null)
  const fileRef = useRef(null)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  // Read the real dimensions so the warning below is about this picture rather
  // than a general rule nobody reads.
  useEffect(() => {
    if (!form.image_url) { setSize(null); return }
    const img = new Image()
    img.onload = () => setSize({ w: img.naturalWidth, h: img.naturalHeight })
    img.onerror = () => setSize(null)
    img.src = form.image_url
  }, [form.image_url])

  const upload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const url = await adminUploadSlideImage(file)
      setForm((f) => ({ ...f, image_url: url }))
      toast('Picture uploaded')
    } catch (err) {
      setError(err.message ?? 'Could not upload that picture')
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await adminSaveSlide({
        ...form,
        sort_order: form.sort_order ?? slideCount,
        focal_x: Number(form.focal_x),
        focal_y: Number(form.focal_y),
      })
      toast('Slide saved')
      onSaved()
    } catch (err) {
      setError(err.message ?? 'Could not save that slide')
      setBusy(false)
    }
  }

  const tooSmall = size && size.w < 1400
  const oddShape = size && Math.abs(size.w / size.h - IDEAL.width / IDEAL.height) > 1.2
  const focal = `${form.focal_x}% ${form.focal_y}%`

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4" onClick={onClose}>
      <form
        onSubmit={save}
        onClick={(e) => e.stopPropagation()}
        className="card max-h-[90vh] w-full max-w-[760px] overflow-y-auto p-6"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-[22px] font-semibold text-ink">
            {slide.id ? 'Edit slide' : 'New slide'}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close"
                  className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-blush">
            <Icon name="close" size={18} />
          </button>
        </div>

        <label className="mt-6 block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink">Picture</span>
          <input ref={fileRef} type="file" accept="image/*" onChange={upload} className="field !py-2" />
          <span className="mt-1.5 block text-[12px] text-muted">
            Best at about {IDEAL.width} × {IDEAL.height}. Anything wide and landscape works —
            it is never stretched, only cropped to fit.
          </span>
        </label>

        {(tooSmall || oddShape) && (
          <p className="mt-2 flex items-start gap-2 rounded-xl bg-blush px-3.5 py-2.5 text-[12px] leading-relaxed text-ink">
            <Icon name="info" size={14} className="mt-0.5 shrink-0 text-wine" />
            {tooSmall
              ? `This picture is ${size.w}px wide, so it will look soft on a large screen. Around ${IDEAL.width}px is better.`
              : `This picture is quite ${size.w > size.h ? 'wide' : 'tall'} for a banner, so the desktop crop takes a narrow strip of it. Check the previews below.`}
          </p>
        )}

        {form.image_url && (
          <div className="mt-5">
            <p className="text-[13px] font-medium text-ink">How it will look</p>
            <p className="mt-1 text-[12px] leading-relaxed text-muted">
              The same picture at the three shapes the shop uses. Drag the focal point until the part
              that matters stays in frame in all three.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {SHAPES.map((shape) => (
                <div key={shape.label}>
                  <div className="overflow-hidden rounded-lg bg-blush" style={{ aspectRatio: shape.ratio }}>
                    <img src={form.image_url} alt="" className="h-full w-full object-cover"
                         style={{ objectPosition: focal }} />
                  </div>
                  <p className="mt-1 text-center text-[11px] text-muted">{shape.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-ink">
                  Focal point — across
                </span>
                <input type="range" min="0" max="100" value={form.focal_x}
                       onChange={set('focal_x')} className="w-full accent-wine" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-ink">
                  Focal point — up and down
                </span>
                <input type="range" min="0" max="100" value={form.focal_y}
                       onChange={set('focal_y')} className="w-full accent-wine" />
              </label>
            </div>
          </div>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink">Small line above</span>
            <input value={form.eyebrow ?? ''} onChange={set('eyebrow')} className="field"
                   placeholder="Autumn / Winter Edit" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink">Heading</span>
            <input required value={form.title ?? ''} onChange={set('title')} className="field"
                   placeholder="Ballet Slipper" />
          </label>
        </div>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink">One line about it</span>
          <textarea rows={2} value={form.copy ?? ''} onChange={set('copy')} className="field resize-none"
                    placeholder="Sheer blush press-ons, sized to your nail profile." />
        </label>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink">
            Description for screen readers
          </span>
          <input value={form.alt ?? ''} onChange={set('alt')} className="field"
                 placeholder="Soft blush press-on nail set on a pink background" />
          <span className="mt-1.5 block text-[12px] text-muted">
            What the picture shows, for anyone who cannot see it.
          </span>
        </label>

        <fieldset className="mt-5 rounded-xl border border-line p-4">
          <legend className="px-1.5 text-[13px] font-medium text-ink">The button</legend>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-medium text-ink">Button text</span>
              <input value={form.cta_label ?? ''} onChange={set('cta_label')} className="field"
                     placeholder="Shop the edit" />
              <span className="mt-1.5 block text-[12px] text-muted">Leave empty for no button.</span>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[12px] font-medium text-ink">Where it goes</span>
              <select value={form.link_type} onChange={set('link_type')} className="field">
                <option value="none">Nowhere</option>
                <option value="product">A product</option>
                <option value="category">A category</option>
                <option value="url">A page</option>
              </select>
            </label>
          </div>

          {form.link_type === 'product' && (
            <label className="mt-4 block">
              <span className="mb-1.5 block text-[12px] font-medium text-ink">Which product</span>
              <select required value={form.product_id ?? ''} onChange={set('product_id')} className="field">
                <option value="">Choose a product…</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
          )}

          {form.link_type === 'category' && (
            <label className="mt-4 block">
              <span className="mb-1.5 block text-[12px] font-medium text-ink">Which category</span>
              <select required value={form.category_id ?? ''} onChange={set('category_id')} className="field">
                <option value="">Choose a category…</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
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
        </fieldset>

        <label className="mt-5 flex items-center gap-3">
          <input type="checkbox" checked={form.is_active}
                 onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                 className="h-4 w-4 accent-wine" />
          <span className="text-[13px] text-ink">Show this slide on the shop</span>
        </label>

        {error && <p className="mt-4 text-[13px] text-wine">{error}</p>}

        <div className="mt-6 flex flex-wrap gap-3">
          <button type="submit" disabled={busy || !form.image_url} className="btn-primary disabled:opacity-50">
            {busy ? 'Saving…' : 'Save slide'}
          </button>
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          {!form.image_url && (
            <p className="w-full text-[12px] text-muted">A slide needs a picture before it can be saved.</p>
          )}
        </div>
      </form>
    </div>
  )
}
