import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Runs an async loader and tracks its state, discarding results from a stale run.
 * `deps` works exactly like a useEffect dependency list.
 *
 * By default it refetches when the tab regains focus. Without that, a price
 * changed in the admin panel stays stale in an already-open shop tab until
 * someone reloads by hand — which looks like the change did not save.
 * Focus refetches are quiet: the current data stays on screen rather than
 * flashing a skeleton.
 */
export default function useAsync(loader, deps = [], { revalidateOnFocus = true } = {}) {
  const [state, setState] = useState({ data: null, loading: true, error: null })

  // Held in a ref so the loader can close over fresh props without
  // re-subscribing the focus listener on every render.
  const loaderRef = useRef(loader)
  loaderRef.current = loader

  // Only the newest request may write to state.
  const requestId = useRef(0)

  const run = useCallback((quiet = false) => {
    const id = ++requestId.current
    if (!quiet) setState((s) => ({ ...s, loading: true, error: null }))

    Promise.resolve(loaderRef.current())
      .then((data) => {
        if (id === requestId.current) setState({ data, loading: false, error: null })
      })
      .catch((error) => {
        if (id !== requestId.current) return
        // A failed background refresh should not wipe what is already shown.
        setState((s) => (quiet ? s : { data: null, loading: false, error }))
      })
  }, [])

  useEffect(() => { run() }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!revalidateOnFocus) return
    const refresh = () => { if (!document.hidden) run(true) }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [run, revalidateOnFocus])

  return { ...state, refetch: () => run(true) }
}
