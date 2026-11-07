import { Check, CircleAlert, Loader2, LogOut, RotateCw, X } from 'lucide-react'
import { useCallback } from 'react'
import { fetchResult } from '../../api/attempt.js'
import { useRequest } from '../../api/useRequest.js'
import { useAuth } from '../../store/auth.js'
import Button from '../ui/Button.jsx'
import EmptyState from '../ui/EmptyState.jsx'

function Tile({ label, value, className = 'bg-surface-muted text-ink-600', valueClass = 'text-[32px] text-ink-900' }) {
  return (
    <div className={`flex flex-col gap-1 rounded-2xl p-4 ${className}`}>
      <span className="text-[13px] font-semibold">{label}</span>
      <span className={`leading-10 font-extrabold ${valueClass}`}>{value}</span>
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

        <p className="m-0 text-ink-600">
          O'tish chegarasi — {test.set.pass_score} ta to'g'ri javob. Sarflangan vaqt:{' '}
          {Math.max(1, Math.round(result.duration_seconds / 60))} daqiqa. Natija MOM test mas'uliga
          yuborildi.
        </p>
        <p className="m-0 text-[13px] leading-[19px] text-ink-600">
          To'g'ri javoblar va savollar savollar bankini himoya qilish uchun ko'rsatilmaydi.
        </p>

        <Button variant="secondary" icon={LogOut} px="px-[22px]" onClick={logout}>
          Chiqish
        </Button>
      </section>
    </main>
  )
}
