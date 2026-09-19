import { useEffect, useState } from 'react'

/**
 * Runs an async loader and tracks its state, discarding results from a stale run.
 * `deps` works exactly like a useEffect dependency list.
 */
export default function useAsync(loader, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null })

  useEffect(() => {
    let live = true
    setState((s) => ({ ...s, loading: true, error: null }))
    Promise.resolve(loader())
      .then((data) => { if (live) setState({ data, loading: false, error: null }) })
      .catch((error) => { if (live) setState({ data: null, loading: false, error }) })
    return () => { live = false }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  return state
}
