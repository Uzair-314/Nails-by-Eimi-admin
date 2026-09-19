import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getUser } from '../lib/adminApi'

const AuthContext = createContext(null)

/**
 * Supabase session plus the matching profile row. `profile.isAdmin` is what
 * gates the admin area in the UI — the database enforces the same rule
 * independently through row level security, so hiding the link is convenience,
 * not the actual protection.
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const refreshProfile = useCallback(async () => {
    try {
      setProfile(await getUser())
    } catch {
      setProfile(null)
    }
  }, [])

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      if (data.session) await refreshProfile()
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, next) => {
      if (!active) return
      setSession(next)
      if (next) await refreshProfile()
      else setProfile(null)
    })

    return () => { active = false; sub.subscription.unsubscribe() }
  }, [refreshProfile])

  const value = useMemo(() => ({
    session,
    user: session?.user ?? null,
    profile,
    loading,
    isSignedIn: !!session,
    isAdmin: !!profile?.isAdmin,
    refreshProfile,


    signIn: async ({ email, password }) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    },

    signOut: async () => {
      await supabase.auth.signOut()
      setProfile(null)
    },

    resetPassword: async (email) => {
      // Back to the panel root — this app has no /account routes.
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      })
      if (error) throw error
    },
  }), [session, profile, loading, refreshProfile])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
