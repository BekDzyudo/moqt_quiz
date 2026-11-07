import { Check, CircleAlert, Clock, Flag, Loader2, Maximize, WifiOff } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { formatRemaining } from '../../lib/serverClock.js'
import { useAuth } from '../../store/auth.js'
import { useAttemptStore } from '../../store/attempt.js'
import Button from '../ui/Button.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import ExitKeyModal from './ExitKeyModal.jsx'
import FinishModal from './FinishModal.jsx'
import { enterFullscreen, leaveFullscreen, useTestGuards } from './guards.js'
import QuestionNavigator from './QuestionNavigator.jsx'
import QuestionPanel from './QuestionPanel.jsx'
import ReturnOverlay from './ReturnOverlay.jsx'
import { useCountdown } from './useCountdown.js'

const SYNC_MS = 30 * 1000
const END_POLL_MS = 2000
const WARNING_MS = 5 * 60 * 1000

const SAVE_STATES = {
  saving: { icon: Loader2, text: 'Saqlanmoqda…', className: 'text-ink-600', spin: true },
  saved: { icon: Check, text: 'Javob saqlandi', className: 'text-success' },
  offline: { icon: WifiOff, text: "Aloqa yo'q", className: 'text-error' },
}

function SaveStatus() {
  const status = useAttemptStore((state) => state.saveStatus)
  const view = SAVE_STATES[status]
  if (!view) return null

  const { icon: Icon, text, className, spin } = view
  return (
    <div role="status" className={`flex items-center gap-1.5 text-[13px] font-semibold ${className}`}>
      <Icon size={18} strokeWidth={1.9} aria-hidden="true" className={spin ? 'animate-spin' : undefined} />
      {text}
    </div>
  )
}

function Timer({ remaining }) {
  const urgent = remaining !== null && remaining <= WARNING_MS
  const value = remaining === null ? '--:--' : formatRemaining(remaining)
  const [minutes, seconds] = value.split(':')

  return (
    <div
      role="timer"
      aria-label={`Qolgan vaqt ${minutes} daqiqa ${seconds} soniya`}
      className={`flex items-center gap-2 rounded-full px-4 py-2 text-xl leading-7 font-extrabold text-white tabular-nums ${
        urgent ? 'bg-error' : 'bg-brand-700'
      }`}
    >
      <Clock size={18} strokeWidth={1.9} aria-hidden="true" />
      {value}
    </div>
  )
}

export default function ActiveTest({ attemptId, setName, onEnded }) {
  const user = useAuth((state) => state.user)
  const open = useAttemptStore((state) => state.open)
  const close = useAttemptStore((state) => state.close)
  const report = useAttemptStore((state) => state.report)
  const sync = useAttemptStore((state) => state.sync)
  const flush = useAttemptStore((state) => state.flush)
  const goTo = useAttemptStore((state) => state.goTo)
  const select = useAttemptStore((state) => state.select)

  const total = useAttemptStore((state) => state.total)
  const currentN = useAttemptStore((state) => state.currentN)
  const answeredCount = useAttemptStore((state) => state.answered.length)
  const deadlineAt = useAttemptStore((state) => state.deadlineAt)
  const exits = useAttemptStore((state) => state.exits)
  const exitLimit = useAttemptStore((state) => state.exitLimit)
  const ended = useAttemptStore((state) => state.ended)
  const loadError = useAttemptStore((state) => state.loadError)
  const question = useAttemptStore((state) => state.question)

  // Sahifa yangilangandan keyin ham to'liq ekran yo'q: avval qaytish tugmasi bosiladi.
  const [locked, setLocked] = useState(() => !document.fullscreenElement)
  const [returnError, setReturnError] = useState(null)
  const [dialog, setDialog] = useState(null)
  // Mas'ul shaxs paroli bilan chiqarilgan: to'liq ekran talab qilinmaydi, test davom etadi.
  const [released, setReleased] = useState(false)
  const releasedRef = useRef(false)

  const remaining = useCountdown(deadlineAt)
  const timeUp = remaining === 0

  useEffect(() => {
    open(attemptId)
    if (!document.fullscreenElement) useAttemptStore.getState().report('reconnect')
    return close
  }, [attemptId, open, close])

  useEffect(() => {
    if (ended) leaveFullscreen().then(onEnded)
  }, [ended, onEnded])

  useEffect(() => {
    const timer = setInterval(sync, SYNC_MS)
    window.addEventListener('online', sync)
    return () => {
      clearInterval(timer)
      window.removeEventListener('online', sync)
    }
  }, [sync])

  // Vaqt tugagach natijani server beradi: klient o'zi yakunlamaydi.
  useEffect(() => {
    if (!timeUp) return undefined
    flush()
    const timer = setInterval(sync, END_POLL_MS)
    return () => clearInterval(timer)
  }, [timeUp, sync, flush])

  const handleViolation = useCallback(
    (type) => {
      report(type)
      if (type === 'fullscreen_exit' && releasedRef.current) return
      setLocked(true)
      setDialog(null)
    },
    [report],
  )

  const handleExitKey = useCallback(() => setDialog('exit'), [])

  useTestGuards({ onViolation: handleViolation, onExitKey: handleExitKey })

  // Klaviatura faqat test ekrani ochiq turganda ishlaydi.
  useEffect(() => {
    if (locked || dialog || timeUp) return undefined

    const handleKey = (event) => {
      if (event.ctrlKey || event.altKey || event.metaKey) return
      if (event.key === 'ArrowLeft') goTo(currentN - 1)
      if (event.key === 'ArrowRight') goTo(currentN + 1)

      const index = ['1', '2', '3', '4'].indexOf(event.key)
      const option = index >= 0 ? question?.options[index] : null
      if (option) select(option.key)
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [locked, dialog, timeUp, currentN, question, goTo, select])

  const handleReturn = async () => {
    setReturnError(null)
    try {
      if (!document.fullscreenElement) await enterFullscreen()
      releasedRef.current = false
      setReleased(false)
      setLocked(false)
      report('return')
    } catch {
      setReturnError("To'liq ekranga o'tib bo'lmadi. Qayta bosing yoki mas'ul shaxsga murojaat qiling.")
    }
  }

  const handleUnlocked = async () => {
    releasedRef.current = true
    setReleased(true)
    setDialog(null)
    setLocked(false)
    await leaveFullscreen()
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <EmptyState
          icon={CircleAlert}
          tone="error"
          title="Testni ochib bo'lmadi"
          description={loadError}
          action={
            <Button variant="secondary" size="sm" icon={Loader2} onClick={() => open(attemptId)}>
              Qayta urinish
            </Button>
          }
        />
      </div>
    )
  }

  if (timeUp) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <EmptyState
          icon={Loader2}
          spin
          title="Vaqt tugadi"
          description="Javoblaringiz saqlandi, natija tayyorlanmoqda."
        />
      </div>
    )
  }

  if (locked) {
    return (
      <>
        <ReturnOverlay
          remaining={remaining}
          exits={exits}
          exitLimit={exitLimit}
          error={returnError}
          onReturn={handleReturn}
        />
        {dialog === 'exit' && (
          <ExitKeyModal
            attemptId={attemptId}
            onClose={() => setDialog(null)}
            onUnlocked={handleUnlocked}
          />
        )}
      </>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex min-h-[72px] flex-wrap items-center justify-between gap-4 border-b border-border-200 bg-surface-card px-8 py-3">
        <div className="flex flex-col">
          <div className="text-[15px] leading-5 font-bold">{setName}</div>
          <div className="text-[13px] leading-[18px] text-ink-600">
            {user.full_name} · {user.username}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SaveStatus />
          <div className="rounded-full bg-surface-muted px-3.5 py-2 text-[15px] font-bold">
            {answeredCount} / {total} javob
          </div>
          <Timer remaining={remaining} />
          {released && (
            <Button variant="secondary" size="sm" icon={Maximize} onClick={handleReturn}>
              To'liq ekranga qaytish
            </Button>
          )}
          <Button variant="dark" size="sm" icon={Flag} onClick={() => setDialog('finish')}>
            Testni yakunlash
          </Button>
        </div>
      </header>

      <main className="flex flex-1 flex-wrap items-start gap-6 p-8">
        <QuestionPanel />
        <QuestionNavigator />
      </main>

      {dialog === 'finish' && <FinishModal remaining={remaining} onClose={() => setDialog(null)} />}
      {dialog === 'exit' && (
        <ExitKeyModal
          attemptId={attemptId}
          onClose={() => setDialog(null)}
          onUnlocked={handleUnlocked}
        />
      )}
    </div>
  )
}
