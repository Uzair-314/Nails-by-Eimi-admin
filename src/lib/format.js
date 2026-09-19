/** Currency and date helpers. Change CURRENCY in one place to re-denominate the store. */

export const CURRENCY = { code: 'PKR', locale: 'en-PK' }

/** Delivery is free above the threshold, otherwise the flat rate applies. */
export const SHIPPING = { freeOver: 5000, flatRate: 300 }

/** Loyalty points awarded per unit of currency spent. */
export const POINTS_PER_UNIT = 0.02

// PKR is quoted in whole rupees — paisa would only add noise.
const money = new Intl.NumberFormat(CURRENCY.locale, {
  style: 'currency',
  currency: CURRENCY.code,
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

export const formatPrice = (value) => money.format(value ?? 0)

const shortDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export const formatDate = (iso) => (iso ? shortDate.format(new Date(iso)) : '')

export const formatPoints = (n) => new Intl.NumberFormat(CURRENCY.locale).format(n ?? 0)

/** "1,240 pts" style label used across the loyalty screens. */
export const pts = (n) => `${formatPoints(n)} pts`

/** Points earned on a given order or line total. */
export const pointsFor = (amount) => Math.round(amount * POINTS_PER_UNIT)

export const titleCase = (s) =>
  s.replace(/(^|[\s-])\w/g, (m) => m.toUpperCase()).replace(/-/g, ' ')
