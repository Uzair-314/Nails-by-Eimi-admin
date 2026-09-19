import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  throw new Error(
    'Supabase is not configured. Copy .env.example to .env and fill in the project URL and publishable key.'
  )
}

/**
 * Browser client. The publishable key is meant to ship to the client — row
 * level security in Postgres is what actually protects the data.
 */
export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

/** Public URL for a file in the product-images bucket. */
export const publicImageUrl = (path) =>
  supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl
