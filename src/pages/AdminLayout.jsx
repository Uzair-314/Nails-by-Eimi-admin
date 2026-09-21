import { useCallback, useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import { Toasts } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useNewOrders } from '../hooks/useNewOrders'
import { useIdleSignOut } from '../hooks/useIdleSignOut'

/** Where "View the shop" points. Set VITE_SHOP_URL to the deployed storefront. */
const SHOP_URL = import.meta.env.VITE_SHOP_URL ?? 'http://localhost:5173'

const ADMIN_NAV = [
  { to: '/', label: 'Dashboard', icon: 'home', end: true },
  { to: '/products', label: 'Products', icon: 'bag' },
  { to: '/categories', label: 'Categories', icon: 'tag' },
  { to: '/slides', label: 'Slideshow', icon: 'sparkle' },
  { to: '/announcements', label: 'Announcements', icon: 'info' },
  { to: '/orders', label: 'Orders', icon: 'truck' },
  { to: '/discounts', label: 'Discounts', icon: 'gift' },
  { to: '/shipping', label: 'Delivery', icon: 'truck' },
  { to: '/abandoned', label: 'Unfinished', icon: 'clock' },
  { to: '/history', label: 'History', icon: 'clock' },
  { to: '/customers', label: 'Customers', icon: 'user' },
  { to: '/messages', label: 'Messages', icon: 'mail' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
  { to: '/password', label: 'Password', icon: 'shield' },
]

/**
 * Admin shell. The guard here is convenience only — every table is protected
 * independently by row level security, so a non-admin who forced their way to
 * these routes would simply see nothing.
 */
export default function AdminLayout() {
  const { loading, isAdmin, profile, signOut, recovery } = useAuth()
  const { toasts, toast } = useToast()
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const announce = useCallback((row) => toast(row.message), [toast])
  const { count, markRead } = useNewOrders({ enabled: isAdmin, onNew: announce })

  // Opening Orders is the acknowledgement — there is nothing else to click.
  useEffect(() => {
    if (location.pathname === '/orders') markRead()
  }, [location.pathname, markRead])

  // Arriving from a recovery link signs you in but changes nothing. Hold the
  // password form until it is done, or the link achieves precisely nothing.
  useEffect(() => {
    if (recovery && location.pathname !== '/password') navigate('/password', { replace: true })
  }, [recovery, location.pathname, navigate])

  // A session left open on a machine someone has walked away from is the weak
  // point here, not the password. The flag survives the sign-out so the login
  // screen can say why it happened rather than looking like a glitch.
  const idleSignOut = useCallback(async () => {
    try { sessionStorage.setItem('nbe-admin:idleOut', '1') } catch { /* private mode */ }
    await signOut()
  }, [signOut])

  const { msLeft, staySignedIn } = useIdleSignOut({ enabled: isAdmin, onTimeout: idleSignOut })

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas">
        <p className="text-sm text-muted">Checking your access…</p>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas px-6">
        <div className="card max-w-md p-8 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-blush text-wine">
            <Icon name="shield" size={22} />
          </span>
          <h1 className="mt-4 font-display text-[24px] font-semibold text-ink">Admins only</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            This account does not have admin access. If it should, ask whoever runs the store to grant it.
          </p>
          <a href={SHOP_URL} className="btn-primary mx-auto mt-6">Back to the shop</a>
        </div>
      </div>
    )
  }

  const rowClass = ({ isActive }) =>
    [
      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] transition',
      isActive ? 'bg-wine text-white shadow-card' : 'text-white/70 hover:bg-white/10 hover:text-white',
    ].join(' ')

  return (
    <div className="flex min-h-screen bg-canvas">
      {/* Dark rail keeps the admin visually distinct from the storefront. */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 flex w-[250px] flex-col bg-ink transition-transform duration-300',
          'lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="leading-tight">
            <p className="font-display text-[19px] font-semibold text-white">Nails By Eimi</p>
            <p className="text-[9px] uppercase tracking-[0.3em] text-wine-300">Admin</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="grid h-9 w-9 place-items-center rounded-full text-white/60 hover:text-white lg:hidden"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-0.5">
            {ADMIN_NAV.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} end={item.end} className={rowClass} onClick={() => setOpen(false)}>
                  <Icon name={item.icon} size={18} className="shrink-0 opacity-80" />
                  {item.label}
                  {item.to === '/orders' && count > 0 && (
                    <span
                      aria-label={`${count} new ${count === 1 ? 'order' : 'orders'}`}
                      className="ml-auto grid h-5 min-w-[20px] place-items-center rounded-full bg-white px-1.5 text-[11px] font-semibold text-wine"
                    >
                      {count}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-white/10 p-3">
          <a
            href={SHOP_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <Icon name="arrowRight" size={18} className="shrink-0 opacity-80" />
            View the shop
          </a>
          <button
            type="button"
            onClick={async () => { await signOut(); toast('Signed out') }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <Icon name="logout" size={18} className="shrink-0 opacity-80" />
            Sign out
          </button>
          <p className="truncate px-3 pt-2 text-[11px] text-white/40">{profile?.email}</p>
        </div>
      </aside>

      {open && (
        <div onClick={() => setOpen(false)} aria-hidden="true" className="fixed inset-0 z-40 bg-ink/50 lg:hidden" />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-canvas/90 px-4 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="grid h-10 w-10 place-items-center rounded-full text-ink hover:bg-wine-50"
          >
            <Icon name="menu" size={22} />
          </button>
          <p className="font-display text-[18px] font-semibold text-wine">Admin</p>
          {count > 0 && (
            <NavLink
              to="/orders"
              className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-wine px-3 py-1.5 text-[12px] font-medium text-white"
            >
              <Icon name="truck" size={14} />
              {count} new
            </NavLink>
          )}
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {msLeft != null && (
        <div
          role="alertdialog"
          aria-label="About to be signed out"
          className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-[420px] rounded-2xl border border-line bg-white p-4 shadow-lift sm:inset-x-auto sm:right-6"
        >
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blush text-wine">
              <Icon name="clock" size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium text-ink">
                Signing you out in {Math.max(1, Math.round(msLeft / 1000))}s
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-muted">
                You have been inactive for a while. Anything unsaved will be lost.
              </p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={staySignedIn} className="btn-primary !py-2 text-[13px]">
              Stay signed in
            </button>
            <button type="button" onClick={idleSignOut} className="btn-ghost !py-2 text-[13px]">
              Sign out now
            </button>
          </div>
        </div>
      )}

      <Toasts toasts={toasts} />
    </div>
  )
}
