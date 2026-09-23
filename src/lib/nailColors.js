/**
 * The shade palette offered in the product editor. These are only shortcuts —
 * any colour can be picked with the custom swatch, and a product with no shade
 * set is perfectly normal (both apps simply show nothing).
 *
 * Kept here rather than in the database because it is a list of suggestions,
 * not shop content: changing it never invalidates a product, since what is
 * stored on the row is the name and the hex, not a reference to this list.
 */
export const NAIL_COLORS = [
  { name: 'Ballet Blush', hex: '#F3D7D3' },
  { name: 'French Tip', hex: '#F8E9E4' },
  { name: 'Snow White', hex: '#F7F5F2' },
  { name: 'Pearl', hex: '#EDE6DD' },
  { name: 'Nude Rose', hex: '#E0B3A8' },
  { name: 'Mocha', hex: '#8B6B5A' },
  { name: 'Hot Pink', hex: '#E01B6A' },
  { name: 'Coral', hex: '#FF7F50' },
  { name: 'Classic Red', hex: '#C41E3A' },
  { name: 'Wine', hex: '#7B2038' },
  { name: 'Lilac', hex: '#C3A6DB' },
  { name: 'Sky', hex: '#A8C8E8' },
  { name: 'Mint', hex: '#A8D8C4' },
  { name: 'Butter', hex: '#F5E1A4' },
  { name: 'Silver Chrome', hex: '#C0C0C8' },
  { name: 'Gold Chrome', hex: '#D4AF6A' },
  { name: 'Chocolate', hex: '#4A2C2A' },
  { name: 'Jet Black', hex: '#1A1A1A' },
]

/**
 * Accepts only `#RRGGBB`, returned upper case. Anything else — an empty field,
 * a half-typed value, a paste of something odd — becomes `null`, which is what
 * the column stores for "no shade". The database has the same rule as a CHECK
 * constraint, so a bad value cannot reach a customer's screen either way.
 */
export function normalizeHex(value) {
  if (typeof value !== 'string') return null
  const s = value.trim()
  return /^#[0-9a-fA-F]{6}$/.test(s) ? s.toUpperCase() : null
}

/** Picks black or white text for a label sitting on top of `hex`. */
export function readableOn(hex) {
  const h = normalizeHex(hex)
  if (!h) return '#2B2B2B'
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return lum > 0.6 ? '#2B2B2B' : '#FFFFFF'
}
