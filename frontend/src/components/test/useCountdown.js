import { useEffect, useState } from 'react'
import { remainingMs } from '../../lib/serverClock.js'

const TICK_MS = 500

// Klient vaqtni hisoblamaydi: har safar server muddatidan server vaqti ayiriladi.
export function useCountdown(deadlineAt) {
  const [remaining, setRemaining] = useState(() => (deadlineAt ? remainingMs(deadlineAt) : null))

  useEffect(() => {
    if (!deadlineAt) return undefined
    const update = () => setRemaining(remainingMs(deadlineAt))
    const timer = setInterval(update, TICK_MS)
    update()
    return () => clearInterval(timer)
  }, [deadlineAt])

  return remaining
}
