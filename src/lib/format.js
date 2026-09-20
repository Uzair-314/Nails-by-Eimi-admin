/** Currency and date helpers. Change CURRENCY in one place to re-denominate the store. */

export const CURRENCY = { code: 'PKR', locale: 'en-PK' }

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

export const titleCase = (s) =>
  s.replace(/(^|[\s-])\w/g, (m) => m.toUpperCase()).replace(/-/g, ' ')

export function whatsappLink(number, message) {
  const digits = String(number ?? '').replace(/\D/g, '')
  if (!digits) return null

  const intl = digits.startsWith('92') ? digits
    : digits.startsWith('0') ? `92${digits.slice(1)}`
    : `92${digits}`

  return message
    ? `https://wa.me/${intl}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${intl}`
}
