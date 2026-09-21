import { useCallback, useEffect, useRef, useState } from 'react'

export const IDLE_MS = 30 * 60 * 1000  // 30 minutes
const WARN_MS = 60 * 1000              // the last minute is spent warning
const TICK_MS = 5 * 1000
const KEY = 'nbe-admin:lastActivity'

/**
 * Signs the admin out after a spell of doing nothing.
 *
 * The panel can change prices, read customer addresses and cancel orders, so a
 * session left open on a machine someone walks away from is the weak point —
 * not the password.
 *
 * Two details that matter:
 *
 * Time is compared against a stored timestamp rather than run off a long
 * `setTimeout`. A laptop that sleeps for an hour suspends timers, so a timeout
 * would fire an hour late; a timestamp is simply found to be stale on the next
 * tick.
 *
 * The timestamp lives in localStorage, so several open tabs share one idea of
 * when the admin was last active. Typing in one tab keeps the others alive,
 * which is what someone with the panel open twice would expect.
 */
export function useIdleSignOut({ enabled, onTimeout }) {
  const [msLeft, setMsLeft] = useState(null)   // non-null only while warning
  const firing = useRef(false)

  const read = () => {
    try {
      return Number(localStorage.getItem(KEY)) || Date.now()
    } catch {
      return Date.now()
    }
  }

  const mark = useCallback(() => {
    try { localStorage.setItem(KEY, String(Date.now())) } catch { /* private mode */ }
    setMsLeft(null)
  }, [])

  // `onTimeout` is held in a ref so a caller re-rendering with a fresh callback
  // does not tear down and rebuild the listeners underneath it.
  const timeout = useRef(onTimeout)
  useEffect(() => { timeout.current = onTimeout }, [onTimeout])

  useEffect(() => {
    if (!enabled) return
    mark()

    // Throttled: these fire constantly, and the value only needs to be roughly
    // right for a thirty-minute window.
    let last = 0
    const onActivity = () => {
      const now = Date.now()
      if (now - last < 5000) return
      last = now
      mark()
    }

    const events = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'focus']
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }))

    const tick = setInterval(() => {
      const idle = Date.now() - read()

      if (idle >= IDLE_MS) {
        if (firing.current) return
        firing.current = true
        setMsLeft(null)
        timeout.current?.()
        return
      }

      setMsLeft(idle >= IDLE_MS - WARN_MS ? IDLE_MS - idle : null)
    }, TICK_MS)

    return () => {
      clearInterval(tick)
      events.forEach((e) => window.removeEventListener(e, onActivity))
    }
  }, [enabled, mark])

  return { msLeft, staySignedIn: mark }
}
