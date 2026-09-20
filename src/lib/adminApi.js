/**
 * Admin-only data access. Every call here is gated by row level security —
 * `public.is_admin()` must be true for the signed-in user, so a customer
 * calling these gets an empty result or a policy error, not data.
 */

import { supabase } from './supabase'

const fail = (error) => { if (error) throw error }

/* --------------------------------------------------------------- products */

const ADMIN_PRODUCT_SELECT =
  '*, product_categories(category_id, categories(slug, name, sort_order)), product_images(id, url, alt, sort_order)'

export async function adminListProducts({ search, status } = {}) {
  let query = supabase.from('products').select(ADMIN_PRODUCT_SELECT).order('created_at', { ascending: false })

  if (search?.trim()) query = query.ilike('name', `%${search.trim()}%`)
  if (status === 'active') query = query.eq('is_active', true)
  if (status === 'hidden') query = query.eq('is_active', false)
  if (status === 'out-of-stock') query = query.or('stock.eq.0,is_available.eq.false')

  const { data, error } = await query
  fail(error)
  return data ?? []
}

export async function adminGetProduct(id) {
  const { data, error } = await supabase
    .from('products')
    .select(ADMIN_PRODUCT_SELECT)
    .eq('id', id)
    .maybeSingle()
  fail(error)
  return data
}

const productRow = (p) => ({
  slug: p.slug,
  name: p.name,
  description: p.description ?? '',
  details: p.details ?? [],
  price: p.price,
  compare_at: p.compare_at === '' || p.compare_at == null ? null : p.compare_at,
  stock: p.stock ?? 0,
  is_available: p.is_available ?? true,
  is_active: p.is_active ?? true,
  is_featured: p.is_featured ?? false,
  tags: p.tags ?? [],
})

/**
 * Replaces a product's shelves with exactly the ids given. Done as delete-then-
 * insert rather than a diff because the set is small and this cannot drift.
 */
async function setProductCategories(productId, categoryIds) {
  fail((await supabase.from('product_categories').delete().eq('product_id', productId)).error)
  if (!categoryIds?.length) return
  fail((await supabase.from('product_categories').insert(
    categoryIds.map((category_id) => ({ product_id: productId, category_id }))
  )).error)
}

export async function adminCreateProduct(p) {
  const { data, error } = await supabase.from('products').insert(productRow(p)).select().single()
  fail(error)
  await setProductCategories(data.id, p.category_ids)
  return data
}

export async function adminUpdateProduct(id, p) {
  const { data, error } = await supabase.from('products').update(productRow(p)).eq('id', id).select().single()
  fail(error)
  await setProductCategories(id, p.category_ids)
  return data
}

export async function adminDeleteProduct(id) {
  fail((await supabase.from('products').delete().eq('id', id)).error)
}

/** Quick toggles used from the product list without opening the editor. */
export async function adminSetProductFlag(id, field, value) {
  fail((await supabase.from('products').update({ [field]: value }).eq('id', id)).error)
}

export async function adminSetStock(id, stock) {
  fail((await supabase.from('products').update({ stock }).eq('id', id)).error)
}

/* ----------------------------------------------------------------- images */

export async function adminUploadImage(productId, file) {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${productId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const { error: upErr } = await supabase.storage
    .from('product-images')
    .upload(path, file, { cacheControl: '3600', upsert: false })
  fail(upErr)

  const url = supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl

  const { count } = await supabase
    .from('product_images')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', productId)

  const { data, error } = await supabase
    .from('product_images')
    .insert({ product_id: productId, url, sort_order: count ?? 0 })
    .select()
    .single()
  fail(error)
  return data
}

export async function adminDeleteImage(image) {
  fail((await supabase.from('product_images').delete().eq('id', image.id)).error)

  // Only remove the file when it actually lives in our bucket; seeded rows
  // point at /media/*.svg in the app's public folder.
  const marker = '/product-images/'
  if (image.url.includes(marker)) {
    const path = image.url.split(marker)[1]
    await supabase.storage.from('product-images').remove([path])
  }
}

/* ------------------------------------------------------------- categories */

export async function adminListCategories() {
  const { data, error } = await supabase.from('categories').select('*').order('sort_order')
  fail(error)
  return data ?? []
}

export async function adminSaveCategory(c) {
  const row = {
    slug: c.slug,
    name: c.name,
    blurb: c.blurb ?? '',
    icon: c.icon ?? 'tag',
    parent_id: c.parent_id || null,
    sort_order: c.sort_order ?? 0,
    is_active: c.is_active ?? true,
    is_promotional: c.is_promotional ?? false,
  }
  const { error } = c.id
    ? await supabase.from('categories').update(row).eq('id', c.id)
    : await supabase.from('categories').insert(row)
  fail(error)
  return adminListCategories()
}

export async function adminDeleteCategory(id) {
  fail((await supabase.from('categories').delete().eq('id', id)).error)
  return adminListCategories()
}

/* ----------------------------------------------------------------- orders */

export async function adminListOrders({ status } = {}) {
  let query = supabase
    .from('orders')
    .select('*, order_items(*), profiles(first_name, last_name, email, phone)')
    .order('created_at', { ascending: false })
  if (status && status !== 'all') query = query.eq('status', status)

  const { data, error } = await query
  fail(error)
  return data ?? []
}

export async function adminUpdateOrder(id, patch) {
  const { error } = await supabase.from('orders').update(patch).eq('id', id)
  fail(error)
}

/* -------------------------------------------------------------- discounts */

export async function adminListDiscounts() {
  const { data, error } = await supabase.from('discounts').select('*').order('created_at', { ascending: false })
  fail(error)
  return data ?? []
}

export async function adminSaveDiscount(d) {
  const row = {
    code: d.code.trim().toUpperCase(),
    type: d.type,
    value: d.value,
    min_spend: d.min_spend || 0,
    expires_at: d.expires_at || null,
    usage_limit: d.usage_limit === '' || d.usage_limit == null ? null : Number(d.usage_limit),
    is_active: d.is_active ?? true,
  }
  const { error } = d.id
    ? await supabase.from('discounts').update(row).eq('id', d.id)
    : await supabase.from('discounts').insert(row)
  fail(error)
  return adminListDiscounts()
}

export async function adminDeleteDiscount(id) {
  fail((await supabase.from('discounts').delete().eq('id', id)).error)
  return adminListDiscounts()
}

/* --------------------------------------------------------------- settings */

export async function adminListSettings() {
  const { data, error } = await supabase.from('site_settings').select('*').order('key')
  fail(error)
  return data ?? []
}

export async function adminSaveSetting(key, value) {
  const { error } = await supabase
    .from('site_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() })
  fail(error)
}

/* -------------------------------------------------------------- customers */

export async function adminListCustomers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
  fail(error)
  return data ?? []
}

/* -------------------------------------------------------------- dashboard */

export async function adminDashboard() {
  const [orders, products, customers, messages] = await Promise.all([
    supabase.from('orders').select('id, order_number, status, total, created_at, profiles(first_name, last_name)')
      .order('created_at', { ascending: false }),
    supabase.from('products').select('id, name, slug, stock, is_available, is_active'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('contact_messages').select('id', { count: 'exact', head: true }).eq('is_read', false),
  ])
  fail(orders.error); fail(products.error)

  const all = orders.data ?? []
  const live = all.filter((o) => o.status !== 'cancelled')

  return {
    revenue: live.reduce((sum, o) => sum + Number(o.total), 0),
    orderCount: all.length,
    openOrders: all.filter((o) => o.status === 'processing' || o.status === 'shipped').length,
    customerCount: customers.count ?? 0,
    unreadMessages: messages.count ?? 0,
    productCount: (products.data ?? []).filter((p) => p.is_active).length,
    lowStock: (products.data ?? [])
      .filter((p) => p.is_active && (p.stock <= 10 || !p.is_available))
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 8),
    recentOrders: all.slice(0, 6),
  }
}

/* --------------------------------------------------------------- messages */

export async function adminListMessages() {
  const { data, error } = await supabase
    .from('contact_messages')
    .select('*')
    .order('created_at', { ascending: false })
  fail(error)
  return data ?? []
}

export async function adminMarkMessageRead(id, isRead = true) {
  fail((await supabase.from('contact_messages').update({ is_read: isRead }).eq('id', id)).error)
}

/* ---------------------------------------------------------------- history */

/**
 * Audit trail written by database triggers, so it records what actually
 * changed rather than what the UI believed it changed.
 */
export async function adminListActivity({ entity, limit = 100 } = {}) {
  let query = supabase
    .from('activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (entity && entity !== 'all') query = query.eq('entity', entity)

  const { data, error } = await query
  fail(error)
  return data ?? []
}

/** Every order, newest first — the admin-side order history. */
export async function adminOrderHistory({ limit = 200 } = {}) {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(id, name, qty, price), profiles(first_name, last_name, email, phone)')
    .order('created_at', { ascending: false })
    .limit(limit)
  fail(error)
  return data ?? []
}

/* ---------------------------------------------------------------- session */

/**
 * The signed-in admin's profile. `isAdmin` decides what the UI shows; the
 * database enforces the same rule independently through row level security.
 */
export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()
  fail(error)
  if (!data) return null

  return {
    id: data.id,
    email: data.email ?? user.email,
    firstName: data.first_name,
    lastName: data.last_name,
    isAdmin: data.is_admin,
  }
}

/**
 * Inline price edit from the product list.
 *
 * The database refuses a price above an existing "was" price, so the message is
 * translated here — the raw constraint error means nothing to whoever is typing.
 */
export async function adminSetPrice(id, price) {
  const { error } = await supabase.from('products').update({ price }).eq('id', id)
  if (error) {
    if (error.message?.includes('products_compare_at_check')) {
      throw new Error('Price cannot be higher than the “was” price. Clear that first in Edit.')
    }
    throw error
  }
}

/* --------------------------------------------------------------- shipping */

export async function adminListShippingMethods() {
  const { data, error } = await supabase.from('shipping_methods').select('*').order('sort_order')
  fail(error)
  return data ?? []
}

export async function adminSaveShippingMethod(m) {
  const row = {
    name: m.name,
    description: m.description ?? '',
    price: Number(m.price) || 0,
    free_over: m.free_over === '' || m.free_over == null ? null : Number(m.free_over),
    estimate: m.estimate ?? '',
    is_active: m.is_active ?? true,
    sort_order: Number(m.sort_order) || 0,
  }
  const { error } = m.id
    ? await supabase.from('shipping_methods').update(row).eq('id', m.id)
    : await supabase.from('shipping_methods').insert(row)
  fail(error)
  return adminListShippingMethods()
}

export async function adminDeleteShippingMethod(id) {
  fail((await supabase.from('shipping_methods').delete().eq('id', id)).error)
  return adminListShippingMethods()
}

/* ------------------------------------------------------- abandoned baskets */

export async function adminListAbandonedCarts({ includeConverted = false } = {}) {
  let query = supabase.from('abandoned_carts').select('*').order('updated_at', { ascending: false })
  if (!includeConverted) query = query.eq('converted', false)
  const { data, error } = await query
  fail(error)
  return data ?? []
}

export async function adminDeleteAbandonedCart(id) {
  fail((await supabase.from('abandoned_carts').delete().eq('id', id)).error)
}

/* ---------------------------------------------------------- notifications */

/**
 * New-order alerts for the admin. RLS limits these to `audience = 'admin'`,
 * so the filter here is about intent rather than access.
 */
export async function adminListNotifications({ unreadOnly = true, limit = 30 } = {}) {
  let query = supabase
    .from('notifications')
    .select('id, message, status, order_id, read_at, created_at')
    .eq('audience', 'admin')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (unreadOnly) query = query.is('read_at', null)
  const { data, error } = await query
  fail(error)
  return data ?? []
}

export async function adminMarkNotificationsRead(ids) {
  if (!ids?.length) return
  fail((await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .in('id', ids)).error)
}

/**
 * Pushes new admin notifications to an open panel.
 *
 * Cash on delivery means an order is not really accepted until someone rings
 * the customer, so waiting for a refresh to notice one is too slow. Returns an
 * unsubscribe function.
 */
export function subscribeToNotifications(onInsert) {
  const channel = supabase
    .channel('admin-notifications')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'audience=eq.admin' },
      (payload) => onInsert(payload.new)
    )
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}

/* ------------------------------------------------------------ hero slides */

export async function adminListSlides() {
  const { data, error } = await supabase
    .from('hero_slides')
    .select('*')
    .order('sort_order')
  fail(error)
  return data ?? []
}

/**
 * Uploads a hero image.
 *
 * Its own bucket, because a hero is a wide banner and nothing like a product
 * photo — keeping them apart stops one being picked for the other by mistake.
 */
export async function adminUploadSlideImage(file) {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const { error: upErr } = await supabase.storage
    .from('hero-slides')
    .upload(path, file, { cacheControl: '3600', upsert: false })
  fail(upErr)

  return supabase.storage.from('hero-slides').getPublicUrl(path).data.publicUrl
}

export async function adminSaveSlide(slide) {
  const row = {
    image_url: slide.image_url,
    alt: slide.alt ?? '',
    eyebrow: slide.eyebrow || null,
    title: slide.title,
    copy: slide.copy || null,
    cta_label: slide.cta_label || null,
    link_type: slide.link_type,
    // Only the field the chosen link type uses is kept, so switching from a
    // product to a category cannot leave a stale target behind it.
    product_id: slide.link_type === 'product' ? slide.product_id : null,
    category_id: slide.link_type === 'category' ? slide.category_id : null,
    url: slide.link_type === 'url' ? slide.url : null,
    focal_x: slide.focal_x,
    focal_y: slide.focal_y,
    is_active: slide.is_active,
    sort_order: slide.sort_order,
  }

  const query = slide.id
    ? supabase.from('hero_slides').update(row).eq('id', slide.id)
    : supabase.from('hero_slides').insert(row)

  const { data, error } = await query.select().single()
  fail(error)
  return data
}

export async function adminDeleteSlide(slide) {
  fail((await supabase.from('hero_slides').delete().eq('id', slide.id)).error)

  // Seeded slides point at /media/*.svg in the shop's own public folder, which
  // is not ours to delete.
  const marker = '/hero-slides/'
  if (slide.image_url?.includes(marker)) {
    await supabase.storage.from('hero-slides').remove([slide.image_url.split(marker)[1]])
  }
}

export async function adminReorderSlides(ordered) {
  for (const [i, slide] of ordered.entries()) {
    fail((await supabase.from('hero_slides').update({ sort_order: i }).eq('id', slide.id)).error)
  }
}

/* ---------------------------------------------------------- announcements */

export async function adminListAnnouncements() {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .order('sort_order')
  fail(error)
  return data ?? []
}

export async function adminSaveAnnouncement(a) {
  const row = {
    text: a.text,
    link_type: a.link_type,
    // Only the field the chosen link type uses survives, so switching from a
    // category to a plain address cannot leave a stale target behind it.
    product_id: a.link_type === 'product' ? a.product_id : null,
    category_id: a.link_type === 'category' ? a.category_id : null,
    url: a.link_type === 'url' ? a.url : null,
    is_active: a.is_active,
    sort_order: a.sort_order,
  }

  const query = a.id
    ? supabase.from('announcements').update(row).eq('id', a.id)
    : supabase.from('announcements').insert(row)

  const { data, error } = await query.select().single()
  fail(error)
  return data
}

export async function adminDeleteAnnouncement(id) {
  fail((await supabase.from('announcements').delete().eq('id', id)).error)
}

export async function adminReorderAnnouncements(ordered) {
  for (const [i, a] of ordered.entries()) {
    fail((await supabase.from('announcements').update({ sort_order: i }).eq('id', a.id)).error)
  }
}
