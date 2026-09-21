import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import { PageHeading } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

/**
 * Changing the admin password.
 *
 * Reached two ways: from the menu at any time, or by following a recovery link,
 * which signs the user in and lands them here. Supabase enforces the project's
 * length and character rules inside `updateUser`, so this form is where a weak
 * password is actually refused — not at sign-in, where an existing weak
 * password still works.
 */
export default function AdminPassword() {
  const { recovery, changePassword } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [current, setCurrent] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)

  // Typed twice, because a typo here is not discovered until the next sign-in,
  // by which time the only way back in is another recovery email.
  const mismatch = confirm.length > 0 && password !== confirm

  const submit = async (e) => {
    e.preventDefault()
    if (mismatch) return
    setBusy(true)
    setError(null)
    try {
      await changePassword({ currentPassword: current, newPassword: password })
      setDone(true)
      setCurrent('')
      setPassword('')
      setConfirm('')
      toast('Password changed')
    } catch (err) {
      // Supabase says which rule failed — too short, missing a symbol, found in
      // a breach list. Replacing that with something generic would leave the
      // person guessing at what to fix.
      setError(err.message ?? 'Could not change the password')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-[520px]">
        <div className="card p-8 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-wine text-white">
            <Icon name="check" size={22} />
          </span>
          <h1 className="mt-4 font-display text-[24px] font-semibold text-ink">Password changed</h1>
          <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-muted">
            Use the new one next time you sign in. This session stays open, so there is nothing else
            to do now.
          </p>
          <button type="button" onClick={() => navigate('/')} className="btn-primary mx-auto mt-6">
            Back to the dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[520px]">
      <PageHeading
        eyebrow="Security"
        title={recovery ? 'Set a new password' : 'Change password'}
        subtitle={
          recovery
            ? 'You are signed in from the link in your email. Choose a new password to finish.'
            : 'Choose a new password for this admin account.'
        }
      />

      <form onSubmit={submit} className="card mt-6 p-6">
        {/* Not asked for during recovery: someone following a reset link has
            forgotten this, which is why they are here. */}
        {!recovery && (
          <label className="mb-5 block border-b border-line pb-5">
            <span className="mb-1.5 block text-[13px] font-medium text-ink">Current password</span>
            <input
              required
              type={show ? 'text' : 'password'}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              className="field"
              placeholder="The password you sign in with now"
            />
            <span className="mt-1.5 block text-[12px] text-muted">
              Asked for so that an open session on an unattended machine is not enough to take the
              account.
            </span>
          </label>
        )}

        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink">New password</span>
          <input
            required
            type={show ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className="field"
            placeholder="At least 8 characters"
          />
        </label>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink">Type it again</span>
          <input
            required
            type={show ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            className="field"
            placeholder="The same password"
          />
          {mismatch && (
            <span className="mt-1.5 block text-[12px] text-wine">These two do not match.</span>
          )}
        </label>

        <label className="mt-4 flex items-center gap-2.5">
          <input
            type="checkbox"
            checked={show}
            onChange={(e) => setShow(e.target.checked)}
            className="h-4 w-4 accent-wine"
          />
          <span className="text-[13px] text-muted">Show what I am typing</span>
        </label>

        {error && (
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-blush px-3.5 py-2.5 text-[13px] leading-relaxed text-ink">
            <Icon name="info" size={14} className="mt-0.5 shrink-0 text-wine" />
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || mismatch || !password || (!recovery && !current)}
          className="btn-primary mt-6 w-full disabled:opacity-50 sm:w-auto"
        >
          {busy ? 'Saving…' : 'Change password'}
        </button>

        <p className="mt-4 text-[12px] leading-relaxed text-muted">
          Your project&rsquo;s password rules are checked here, so a password that is too short or too
          simple is refused with the reason.
        </p>
      </form>
    </div>
  )
}
