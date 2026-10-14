import { useCallback, useEffect, useRef, useState } from 'react'

let nextId = 0
const DURATION = { success: 4000, error: 7000 }

// Keeps the list of visible toasts. `toast(message)` for success, `toast(message, 'error')` for failures.
export function useToasts() {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())

  const dismiss = useCallback(id => {
    clearTimeout(timers.current.get(id))
    timers.current.delete(id)
    setToasts(list => list.filter(t => t.id !== id))
  }, [])

  const toast = useCallback((message, type = 'success') => {
    const id = nextId++
    setToasts(list => [...list.slice(-3), { id, message, type }])
    timers.current.set(id, setTimeout(() => dismiss(id), DURATION[type] || DURATION.success))
  }, [dismiss])

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach(clearTimeout)
  }, [])

  return { toasts, toast, dismiss }
}
