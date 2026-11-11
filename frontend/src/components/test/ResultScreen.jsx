import { Check, CircleAlert, Loader2, LogOut, RotateCw, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { formatDateMinutes } from '../../lib/time.js'
import { fetchResult } from '../../api/attempt.js'
import { useRequest } from '../../api/useRequest.js'
import { useAuth } from '../../store/auth.js'
import Alert from '../ui/Alert.jsx'
import Button from '../ui/Button.jsx'
import EmptyState from '../ui/EmptyState.jsx'

const STOP_NOTES = {
  exit_limit:
    "Test oynasidan ruxsat etilganidan ko'p marta chiqilgani uchun test avtomatik yakunlandi. Natija shu paytgacha berilgan javoblar bo'yicha hisoblandi.",
  admin: "Testingizni administrator yakunladi. Natija shu paytgacha berilgan javoblar bo'yicha hisoblandi.",
}

function Tile({ label, value, className = 'bg-surface-muted text-ink-600', valueClass = 'text-[32px] text-ink-900' }) {
  return (
    <div className={`flex flex-col gap-1 rounded-2xl p-4 ${className}`}>
      <span className="text-[13px] font-semibold">{label}</span>
      <span className={`leading-10 font-extrabold ${valueClass}`}>{value}</span>
    </div>
  )
}

// Umumiy (sinf) kompyuterlarida keyingi tinglovchi oldingisining akkauntiga tushib qolmasligi uchun.
const AUTO_LOGOUT_SECONDS = 120

function AutoLogout({ onLogout }) {
  const [left, setLeft] = useState(AUTO_LOGOUT_SECONDS)
  const [stopped, setStopped] = useState(false)

  useEffect(() => {
    if (stopped) return undefined
    const timer = setInterval(() => setLeft((value) => value - 1), 1000)
    return () => clearInterval(timer)
  }, [stopped])

  useEffect(() => {
    if (!stopped && left <= 0) onLogout()
  }, [left, stopped, onLogout])

  if (stopped) return null
  return (
    <div role="status" className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[13px] text-ink-600">
      <span>
        Xavfsizlik uchun <b className="text-ink-900 tabular-nums">{Math.max(0, left)}</b> soniyadan keyin tizimdan
        avtomatik chiqasiz.
      </span>
      <button
        type="button"
        onClick={() => setStopped(true)}
        className="relative cursor-pointer font-semibold text-brand-500 underline after:absolute after:-inset-2 after:content-[''] hover:text-brand-ink-strong"
      >
        Bekor qilish
      </button>
    </div>
  )
}

export default function ResultScreen({ attemptId, test }) {
  const user = useAuth((state) => state.user)
  const logout = useAuth((state) => state.logout)
  const load = useCallback(() => fetchResult(attemptId), [attemptId])
  const { data: result, error, reload } = useRequest(load)

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <EmptyState
          icon={CircleAlert}
          tone="error"
          title="Natijani olib bo'lmadi"
          description={error}
          action={
            <Button variant="secondary" size="xs" icon={RotateCw} onClick={reload}>
              Qayta urinish
            </Button>
          }
        />
      </div>
    )
  }

  if (!result) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <EmptyState icon={Loader2} spin title="Natija yuklanmoqda" />
      </div>
    )
  }

  const StatusIcon = result.passed ? Check : X
  const tone = result.passed ? 'bg-success-soft text-success' : 'bg-error-soft text-error'

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6">
      <section className="flex w-full max-w-[600px] flex-col items-center gap-6 rounded-3xl border border-border-200 bg-surface-card p-6 text-center shadow-card sm:p-10">
        <div className={`flex size-[72px] items-center justify-center rounded-full ${tone}`}>
          <StatusIcon size={34} strokeWidth={1.9} aria-hidden="true" />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="text-[13px] leading-[18px] font-semibold text-ink-600">
            {test.set.name} · {user.full_name}
          </div>
          <h1 className="m-0 text-[26px] leading-[34px] font-bold">Test yakunlandi</h1>
        </div>

        {STOP_NOTES[result.finish_reason] && (
          <Alert tone="error">{STOP_NOTES[result.finish_reason]}</Alert>
        )}

        <div className="grid w-full gap-3 sm:grid-cols-3">
          <Tile label="To'g'ri javoblar" value={`${result.correct_count} / ${result.n_total}`} />
          <Tile label="Natija" value={`${result.percent}%`} />
          <Tile
            label="Holat"
            value={result.passed ? "O'tdi" : "O'tmadi"}
            className={tone}
            valueClass="text-[26px]"
          />
        </div>

        <dl className="m-0 grid w-full grid-cols-1 gap-x-6 gap-y-2 rounded-2xl bg-surface-muted p-4 text-left text-[15px] sm:grid-cols-2">
          <div className="flex justify-between gap-3">
            <dt className="text-ink-600">O'tish chegarasi</dt>
            <dd className="m-0 font-semibold">{test.set.pass_score} ta to'g'ri</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-600">Javob berilgan</dt>
            <dd className="m-0 font-semibold tabular-nums">
              {result.answered_count ?? '—'} / {result.n_total}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-600">Sarflangan vaqt</dt>
            <dd className="m-0 font-semibold tabular-nums">
              {Math.max(1, Math.round(result.duration_seconds / 60))} daq / {test.set.duration_minutes} daq
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-600">Yakunlangan</dt>
            <dd className="m-0 font-semibold tabular-nums">{result.finished_at ? formatDateMinutes(result.finished_at) : '—'}</dd>
          </div>
        </dl>
        <p className="m-0 text-ink-600">Natija MOM test mas'uliga yuborildi.</p>
        <p className="m-0 text-[13px] leading-[19px] text-ink-600">
          To'g'ri javoblar va savollar savollar bankini himoya qilish uchun ko'rsatilmaydi.
        </p>

        <Button variant="secondary" icon={LogOut} px="px-[22px]" onClick={logout}>
          Chiqish
        </Button>
        <AutoLogout onLogout={logout} />
      </section>
    </main>
  )
}
