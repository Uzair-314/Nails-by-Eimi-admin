import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/**
 * Whether the two required environment variables are present.
 *
 * This deliberately does not throw. Throwing here happens while modules are
 * still loading, so React never mounts and the visitor gets a blank page with
 * the reason buried in the console. `main.jsx` checks this flag instead and
 * renders a setup screen that says what is missing.
 */
export const SUPABASE_CONFIGURED = Boolean(url && key)

export const MISSING_ENV = [
  !url && 'VITE_SUPABASE_URL',
  !key && 'VITE_SUPABASE_PUBLISHABLE_KEY',
].filter(Boolean)

/**
 * Browser client. The publishable key is meant to ship to the client — row
 * level security in Postgres is what actually protects the data.
 *
 * The placeholders keep `createClient` from throwing when configuration is
 * missing; nothing calls this client in that case, because the app renders the
 * setup screen rather than the store.
 */
export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  key || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
)
