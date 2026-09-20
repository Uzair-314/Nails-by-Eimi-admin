import { useCallback, useEffect, useRef, useState } from 'react'
import { adminListNotifications, adminMarkNotificationsRead, subscribeToNotifications } from '../lib/adminApi'

/**
 * Unread new-order alerts, kept live.
 *
 * Orders are paid on delivery, so one is not really accepted until somebody has
 * rung the customer to confirm it. Waiting for a refresh to notice an order is
 * too slow, hence the subscription rather than a poll.
 */
export function useNewOrders({ enabled, onNew }) {
  const [unread, setUnread] = useState([])
  const seen = useRef(new Set())
  const pending = useRef([])
  useEffect(() => { pending.current = unread }, [unread])

  // Keeps the subscription from being torn down and rebuilt whenever the
  // caller re-renders with a fresh callback.
  const notify = useRef(onNew)
  useEffect(() => { notify.current = onNew }, [onNew])

  useEffect(() => {
    if (!enabled) return
    let active = true

    adminListNotifications({ unreadOnly: true })
      .then((rows) => {
        if (!active) return
        rows.forEach((r) => seen.current.add(r.id))
        setUnread(rows)
      })
      .catch(() => { /* the badge is not worth an error screen */ })

    const unsubscribe = subscribeToNotifications((row) => {
      if (!active || seen.current.has(row.id)) return
      seen.current.add(row.id)
      setUnread((list) => [row, ...list])
      notify.current?.(row)
    })

    return () => { active = false; unsubscribe() }
  }, [enabled])

  // The write stays outside the state updater: React may call an updater twice,
  // and this one would then mark the same rows read on a second, wasted request.
  const markRead = useCallback(() => {
    const ids = pending.current.map((n) => n.id)
    if (!ids.length) return
    setUnread([])
    adminMarkNotificationsRead(ids).catch(() => {})
  }, [])

  return { unread, count: unread.length, markRead }
}
