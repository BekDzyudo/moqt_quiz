import { CircleDashed, Lock } from 'lucide-react'
import Button from '../ui/Button.jsx'
import { useAttemptStore } from '../../store/attempt.js'

const STYLES = {
  current: 'bg-brand-soft text-ink-900 border-2 border-ink-900',
  answered: 'bg-brand-700 text-white border border-brand-700',
  empty: 'bg-surface-card text-ink-900 border border-border-400',
}

const LABELS = {
  current: 'joriy savol',
  answered: 'javob berilgan',
  empty: 'javob berilmagan',
}

const LEGEND = [
  ['bg-brand-700', 'Javob berilgan'],
  ['bg-surface-card border border-border-400', 'Javob berilmagan'],
  ['border-2 border-ink-900', 'Joriy savol'],
  ['bg-warning rounded-full', 'Keyinroq qaytaman (belgilangan)'],
]

export default function QuestionNavigator() {
  const total = useAttemptStore((state) => state.total)
  const currentN = useAttemptStore((state) => state.currentN)
  const answered = useAttemptStore((state) => state.answered)
  const goTo = useAttemptStore((state) => state.goTo)
  const flagged = useAttemptStore((state) => state.flagged)

  const all = Array.from({ length: total }, (_, index) => index + 1)
  const unanswered = all.filter((n) => !answered.includes(n))
  // Joriy savoldan keyingi birinchi javobsiz (oxiriga yetsa — boshidan).
  const nextUnanswered = unanswered.find((n) => n > currentN) ?? unanswered.find((n) => n !== currentN)
  const nextFlagged = flagged.find((n) => n > currentN) ?? flagged.find((n) => n !== currentN)

  const stateOf = (n) => {
    if (n === currentN) return 'current'
    return answered.includes(n) ? 'answered' : 'empty'
  }

  return (
    <aside className="flex flex-[1_1_320px] flex-col gap-4 rounded-2xl border border-border-200 bg-surface-card p-6">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="m-0 text-[17px] leading-6 font-semibold">Savollar</h2>
        <span className="text-[13px] text-ink-600 tabular-nums">
          {unanswered.length ? `${unanswered.length} ta javobsiz` : 'Hammasiga javob berildi'}
        </span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: total }, (_, index) => index + 1).map((n) => {
          const state = stateOf(n)
          return (
            <button
              key={n}
              type="button"
              aria-label={`${n}-savol, ${LABELS[state]}${flagged.includes(n) ? ', belgilangan' : ''}`}
              aria-current={state === 'current' ? 'true' : undefined}
              onClick={() => goTo(n)}
              className={`relative h-11 cursor-pointer rounded-lg text-[15px] font-bold ${STYLES[state]}`}
            >
              {n}
              {flagged.includes(n) && (
                <span aria-hidden="true" className="absolute -top-1 -right-1 size-3 rounded-full border-2 border-surface-card bg-warning" />
              )}
            </button>
          )
        })}
      </div>

      {(nextUnanswered || nextFlagged) && (
        <div className="flex flex-wrap gap-2">
          {nextUnanswered && (
            <Button variant="secondary" size="xs" icon={CircleDashed} onClick={() => goTo(nextUnanswered)}>
              Keyingi javobsiz
            </Button>
          )}
          {nextFlagged && (
            <Button variant="secondary" size="xs" icon={CircleDashed} onClick={() => goTo(nextFlagged)}>
              Belgilanganga ({flagged.length})
            </Button>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2 text-[13px] leading-[18px] text-ink-600">
        {LEGEND.map(([swatch, label]) => (
          <div key={label} className="flex items-center gap-2">
            <span aria-hidden="true" className={`box-content size-3.5 rounded ${swatch}`} />
            {label}
          </div>
        ))}
      </div>

      <div className="flex items-start gap-2 rounded-xl bg-surface-muted p-3 text-[13px] leading-[19px] text-ink-600">
        <Lock size={18} strokeWidth={1.9} aria-hidden="true" className="shrink-0" />
        <span>To'liq ekran rejimi. Chiqish faqat mas'ul shaxs paroli bilan.</span>
      </div>
    </aside>
  )
}
