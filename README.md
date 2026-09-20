# Nails By Eimi — Admin

Admin panel for the [Nails By Eimi](https://github.com/Uzair-314/Nails-by-Eimi)
storefront. Separate app, same Supabase project.

## Running it

```bash
npm install
cp .env.example .env    # fill in the two Supabase values
npm run dev
```

Runs on **http://localhost:5174**, so it can sit alongside the storefront on 5173.

## Signing in

There is no signup here. Admin rights are a flag on the account itself
(`profiles.is_admin`), so a new admin is made by promoting an existing account:

```sql
update public.profiles set is_admin = true where email = 'someone@example.com';
```

Signing in without that flag shows an "Admins only" notice rather than the panel.

## Deploying

Any static host works. On Vercel the Vite preset is detected automatically.

**Three environment variables**, applied to production, preview and development:

| Name | |
| --- | --- |
| `VITE_SUPABASE_URL` | Same value as the storefront |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Same value as the storefront |
| `VITE_SHOP_URL` | Where "View the shop" points. Optional |

Vite inlines these **at build time**, so saving them does nothing until the site
is redeployed. If they are missing, the app shows a setup screen naming what is
absent rather than a blank page.

`vercel.json` rewrites every path to `index.html`, without which refreshing on
`/products` returns a 404.

Consider restricting access further — Vercel password protection, or an allowed
IP list — though the database is already the real boundary. See
[Signing in](#signing-in).

## What it does

| Section | |
| --- | --- |
| **Dashboard** | Revenue, open orders, customer count, low stock, unread messages |
| **Products** | Price and sale price, stock, out-of-stock toggle, hide/show, photo upload, categories, tags, spec list |
| **Categories** | Create, rename, reorder, nest, mark promotional; controls the shop's menu |
| **Orders** | Status, tracking number, full order detail, guest contact details |
| **Delivery** | Shipping methods — name, price, free-over threshold, estimate |
| **Unfinished** | Checkouts that were started but not completed |
| **Discounts** | Percentage or fixed, minimum spend, expiry, usage limits |
| **History** | Audit log of every change, plus full order history |
| **Customers** | Accounts, tier and points balance |
| **Messages** | Contact form submissions |
| **Settings** | Contact details, minimum order, points rate. Delivery prices live under Delivery |

Changing anything here changes the live shop — both apps read the same database.

## Security

The guard in the UI is convenience only. Every table is protected by row level
security in Postgres, and the admin policies require `public.is_admin()` to be
true. Someone who bypassed this interface entirely and called the API directly
would still get nothing.

The publishable key in `.env` is meant to ship to the browser; it grants no
privilege on its own.

## History

The audit log is written by database triggers, not by this app, so it records
what actually changed rather than what the UI believed it changed. Each entry
carries the actor, the timestamp and a field-level diff.

## Relationship to the storefront

This is a separate app with **copies** of six shared modules:

```
components/Icon    components/ui       context/AuthContext
hooks/useAsync     lib/format          lib/supabase
```

plus `tailwind.config.js` and `index.css`. They were copied rather than shared,
so a change to an icon, a button style or a brand colour has to be made in both
repositories to keep the two looking alike.

`lib/adminApi.js` is unique to this app.

## Not built yet

- Bulk actions on products
- CSV export of orders
- Image reordering (the first upload is the main image)
- Refunds or partial cancellations
