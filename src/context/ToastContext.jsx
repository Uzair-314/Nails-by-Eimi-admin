import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const ToastContext = createContext(null)

/**
 * Small confirmation messages after a save or delete.
 *
 * The storefront keeps these inside its cart context; this app has no cart, so
 * they live on their own here.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const toast = useCallback((message) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((list) => [...list, { id, message }])
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 2600)
  }, [])

  const value = useMemo(() => ({ toasts, toast }), [toasts, toast])

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
