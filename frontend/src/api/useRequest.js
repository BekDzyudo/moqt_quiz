import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage } from './client.js'

// `load` o'zgarganda qayta yuklaydi. Eski so'rov kechroq kelsa, natijasi tashlanadi.
// Oldingi `data` yangilanish paytida ekranda qoladi, jadval sakramaydi.
export function useRequest(load) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const latest = useRef(0)

  const run = useCallback(async () => {
    latest.current += 1
    const request = latest.current
    try {
      const result = await load()
      if (request !== latest.current) return
      setData(result)
      setError(null)
    } catch (loadError) {
      if (request !== latest.current) return
      setError(errorMessage(loadError))
    }
    setLoading(false)
  }, [load])

  useEffect(() => {
    // Holat faqat `await`dan keyin o'zgaradi, sinxron render yo'q.
    // oxlint-disable-next-line react/set-state-in-effect
    run()
  }, [run])

  const reload = useCallback(() => {
    setLoading(true)
    return run()
  }, [run])

  return { data, loading, error, reload }
}
