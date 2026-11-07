import { useEffect, useRef, useState } from 'react'

export async function enterFullscreen() {
  await document.documentElement.requestFullscreen()
  // Chromium'da Esc'ni 2 soniya bosib turmasa to'liq ekrandan chiqilmaydi.
  await navigator.keyboard?.lock?.(['Escape']).catch(() => {})
}

export async function leaveFullscreen() {
  navigator.keyboard?.unlock?.()
  if (document.fullscreenElement) await document.exitFullscreen().catch(() => {})
}

const isExitKey = (event) => event.ctrlKey && event.altKey && event.code === 'KeyN'

const block = (event) => event.preventDefault()

// Faqat faol test ekranida ishlaydi. Callback'lar ref orqali: tinglovchilar qayta ulanmaydi.
export function useTestGuards({ onViolation, onExitKey }) {
  const handlers = useRef({ onViolation, onExitKey })
  useEffect(() => {
    handlers.current = { onViolation, onExitKey }
  })

  useEffect(() => {
    const handleFullscreen = () => {
      if (!document.fullscreenElement) handlers.current.onViolation('fullscreen_exit')
    }
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') handlers.current.onViolation('hidden')
    }
    const handleBlur = () => handlers.current.onViolation('blur')
    const handleKey = (event) => {
      if (!isExitKey(event)) return
      event.preventDefault()
      handlers.current.onExitKey()
    }

    document.addEventListener('fullscreenchange', handleFullscreen)
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('blur', handleBlur)
    window.addEventListener('keydown', handleKey)
    document.addEventListener('contextmenu', block)
    document.addEventListener('copy', block)
    document.addEventListener('cut', block)
    document.body.classList.add('test-active')

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreen)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('keydown', handleKey)
      document.removeEventListener('contextmenu', block)
      document.removeEventListener('copy', block)
      document.removeEventListener('cut', block)
      document.body.classList.remove('test-active')
    }
  }, [])
}

// Test faqat kompyuterda topshiriladi.
const DESKTOP_QUERY = '(min-width: 1024px)'

export function useIsDesktop() {
  const [matches, setMatches] = useState(() => window.matchMedia(DESKTOP_QUERY).matches)

  useEffect(() => {
    const query = window.matchMedia(DESKTOP_QUERY)
    const handleChange = (event) => setMatches(event.matches)
    query.addEventListener('change', handleChange)
    return () => query.removeEventListener('change', handleChange)
  }, [])

  return matches
}
