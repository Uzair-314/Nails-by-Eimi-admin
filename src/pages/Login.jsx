import { useEffect, useState } from 'react'
import Icon from '../components/Icon'
import { useAuth } from '../context/AuthContext'

/**
 * Sign-in only — there is no self-service signup here. Admin rights are granted
 * on the account itself, so a new admin is made by promoting an existing
 * account rather than registering through this screen.
 */
export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [mode, setMode] = useState('signin')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  // Being dropped at a login screen with no explanation reads as a fault. The
  // shell leaves this behind when it signs an idle session out.
  useEffect(() => {
    try {
      if (sessionStorage.getItem('nbe-admin:idleOut')) {
        sessionStorage.removeItem('nbe-admin:idleOut')
        setNotice('You were signed out after 30 minutes of inactivity. Sign in to carry on.')
      }
    } catch { /* private mode */ }
  }, [])

  const { signIn, resetPassword } = useAuth()
  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      if (mode === 'signin') {
        await signIn(form)
        // AuthProvider picks the session up and App swaps to the panel.
      } else {
        await resetPassword(form.email)
        setNotice('If that address has an account, a reset link is on its way.')
        setMode('signin')
      }
    } catch (err) {
      setError(err.message ?? 'Could not sign in')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-ink px-5">
      <div className="w-full max-w-[400px]">
        <div className="text-center">
          <p className="font-display text-[26px] font-semibold text-white">Nails By Eimi</p>
          <p className="text-[9px] uppercase tracking-[0.3em] text-wine-300">Admin</p>
        </div>

        <form onSubmit={submit} className="mt-7 rounded-card bg-white p-6 shadow-lift">
          <h1 className="font-display text-[22px] font-semibold text-ink">
            {mode === 'signin' ? 'Sign in' : 'Reset your password'}
          </h1>

          {error && (
            <p className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] text-red-800">
              <Icon name="info" size={15} className="mt-0.5 shrink-0" />
              {error}
            </p>
          )}
          {notice && (
            <p className="mt-4 flex items-start gap-2 rounded-xl bg-blush px-3.5 py-2.5 text-[13px] text-ink">
              <Icon name="check" size={15} className="mt-0.5 shrink-0 text-wine" />
              {notice}
            </p>
          )}

          <label className="mt-5 block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink">Email</span>
            <input
              required
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={update('email')}
              className="field"
            />
          </label>

          {mode === 'signin' && (
            <label className="mt-4 block">
              <span className="mb-1.5 block text-[13px] font-medium text-ink">Password</span>
              <input
                required
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={update('password')}
                className="field"
              />
            </label>
          )}

          <button type="submit" disabled={busy} className="btn-primary mt-6 w-full">
            {busy ? 'Just a moment…' : mode === 'signin' ? 'Sign in' : 'Send reset link'}
          </button>

          <p className="mt-4 text-center text-[13px] text-muted">
            <button
              type="button"
              onClick={() => setMode(mode === 'signin' ? 'reset' : 'signin')}
              className="text-wine hover:underline"
            >
              {mode === 'signin' ? 'Forgotten your password?' : 'Back to sign in'}
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}
