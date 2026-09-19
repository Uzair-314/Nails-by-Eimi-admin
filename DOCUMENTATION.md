# Nails By Eimi Admin — Reference

Deeper than the README: how each screen works, what it writes, and what to watch
out for.

**Stack:** React 18 · Vite 5 · React Router 6 · Tailwind 3 · Supabase
**Storefront:** https://github.com/Uzair-314/Nails-by-Eimi
**Port:** 5174, so it runs alongside the shop on 5173

---

## 1. Setup

```bash
npm install
cp .env.example .env
npm run dev
```

`.env` needs the **same** Supabase values as the storefront — both apps talk to
one database. `VITE_SHOP_URL` sets where "View the shop" points; it defaults to
`http://localhost:5173`.

| | |
| --- | --- |
| Project | `nails-by-eimi` |
| Ref | `ydsixxnrcgvibtfchvts` |
| Dashboard | https://supabase.com/dashboard/project/ydsixxnrcgvibtfchvts |

---

## 2. Access

There is **no signup here**. Admin rights are a flag on the account:

```sql
update public.profiles set is_admin = true where email = 'someone@example.com';
```

Signing in without it shows an "Admins only" notice instead of the panel.

The first admin exists because `handle_new_user()` grants the flag when a new
email matches `site_settings.bootstrap_admin_email` — so nobody had to hand a
password around to bootstrap the account.

> **The guard in this app is convenience, not security.** `AdminLayout` checks
> `isAdmin` to decide what to render, but every table is independently protected
> by row level security requiring `public.is_admin()`. Someone who deleted the
> guard, or skipped this app and called the API directly, would still get
> nothing.

---

## 3. Screens

### Dashboard

Revenue (excluding cancelled), order counts, customer count, live products,
unread messages, the eight lowest-stock products, six most recent orders.

Revenue is computed client-side from the orders list. Fine at this scale; if the
shop grows to thousands of orders, move it to a database view.

### Products

The main screen. List gives inline **stock editing** and three quick toggles
without opening the editor:

| Control | Field | |
| --- | --- | --- |
| Tick / cross | `is_available` | Show "sold out" without changing the count |
| Eye | `is_active` | Hide from the shop entirely |
| Stock box | `stock` | Saves on change |

Filters: All, Live, Hidden, Out of stock. Search is debounced 180ms.

**Editor** (`ProductEditor.jsx`) covers name, slug, description, spec list,
price, sale price, stock, availability, category, tags, visibility, featured,
and photos.

- Slug auto-generates from the name for **new** products only, so editing a name
  never silently breaks a live URL
- Sale price must exceed the selling price, or the save is refused — the database
  has the same constraint, this is just a friendlier error
- Photos upload only after a product exists, because the storage path is keyed by
  product id

### Categories

Create, rename, nest, reorder, hide. Parents render with their children
indented. Deleting a parent cascades to its children and leaves its products
uncategorised — the confirmation says so.

This screen controls the shop's menu directly.

### Orders

Status dropdown (processing / shipped / delivered / cancelled), tracking number,
and an expandable detail view with items, totals, discount and delivery address.

**Changing status does not restock a cancelled order.** Cancel one and the stock
stays decremented; put it back by hand on the Products screen. Worth knowing
before you cancel anything.

### Discounts

Percentage or fixed, minimum spend, expiry, usage limit. Badges mark codes that
are off, expired or used up.

Codes are validated **server-side** inside `place_order`, never in the browser,
and the `discounts` table is unreadable to shoppers — so codes cannot be
enumerated from the client.

### History

Two tabs.

**Activity log** — written by database triggers on `products`, `categories`,
`discounts`, `orders` and `site_settings`. Each entry shows actor, timestamp and
a field-level diff. Filterable by entity.

Because triggers write it, the log records what actually changed, even if
something bypasses this app. It starts from when the triggers were added;
earlier changes are not in it.

**Order history** — every order newest-first with customer, item count, tracking
and total.

### Customers

Accounts with tier, points and join date. Read-only.

### Messages

Contact form submissions with read/unread and a mailto reply link.

### Settings

Key/value rows in `site_settings`, rendered from a `FIELDS` declaration in
`AdminSettings.jsx` — the shape lives in that file, not the database.

| Setting | Affects |
| --- | --- |
| `contact_whatsapp`, `contact_email` | Top bar, footer, contact page |
| `announcement` | Black top bar message |
| `minimum_order` | Blocks checkout below it |
| `shipping_free_over`, `shipping_flat_rate` | Cart, checkout, `place_order` |
| `points_per_unit` | Points awarded. `0.02` = 2 points per Rs 100 |

The shop reads these when a page loads, so an open tab keeps old values until
refreshed.

---

## 4. Structure

```
src/
  pages/        AdminLayout + nine screens + ProductEditor + Login
  components/   Icon, ui          ← copied from the storefront
  context/      AuthContext       ← copied
                ToastContext      ← this app only
  hooks/        useAsync          ← copied
  lib/          adminApi.js       ← this app only
                supabase, format  ← copied
```

`lib/adminApi.js` is the only module that touches the database.

---

## 5. The duplication

Six modules are **copies**, not shared code:

```
components/Icon    components/ui       context/AuthContext
hooks/useAsync     lib/format          lib/supabase
```

plus `tailwind.config.js` and `src/index.css`.

**A change to any of them has to be made in both repositories** or the two apps
drift apart — different icons, different button styles, different brand colour.
This is the cost of running the admin as a separate app, and it is worth
re-reading before changing anything in that list.

If the drift becomes annoying, the options are a shared npm package, a git
submodule, or folding the admin back into the storefront repository.

Two things deliberately differ from the copies:

- `AuthContext` has `signUp` removed — no self-service registration here
- `ToastContext` replaces the storefront's `StoreContext`, which carried a cart
  this app has no use for

---

## 6. Gotchas

| | |
| --- | --- |
| **Cancelling does not restock** | Stock stays decremented; fix it manually |
| **Deleting a product** | Removes it permanently. Order history survives because line items copy name, price and image. Hiding is usually what you want |
| **Image order** | First uploaded is the main image; there is no reordering yet |
| **Settings are cached per page load** | The shop needs a refresh to pick up changes |
| **Activity log is not retrospective** | It only covers changes made after the triggers existed |
| **Prices** | Still the original GBP figures with a rupee symbol — edit them here |

---

## 7. Not built yet

- Bulk actions on products
- CSV export of orders
- Image reordering
- Refunds and partial cancellations
- Restocking on cancellation
- Tests
