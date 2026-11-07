import { useEffect, useRef } from 'react'

// Yashirin vkladka serverni bezovta qilmaydi: qaytganda keyingi urinishda yangilanadi.
export function usePolling(callback, intervalMs) {
  const latest = useRef(callback)
  useEffect(() => {
    latest.current = callback
  })

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') latest.current()
    }, intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])
}
