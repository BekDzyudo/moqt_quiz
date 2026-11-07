import { Lock } from 'lucide-react'
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
]

export default function QuestionNavigator() {
  const total = useAttemptStore((state) => state.total)
  const currentN = useAttemptStore((state) => state.currentN)
  const answered = useAttemptStore((state) => state.answered)
  const goTo = useAttemptStore((state) => state.goTo)

  const stateOf = (n) => {
    if (n === currentN) return 'current'
    return answered.includes(n) ? 'answered' : 'empty'
  }

  return (
    <aside className="flex flex-[1_1_320px] flex-col gap-4 rounded-2xl border border-border-200 bg-surface-card p-6">
      <h2 className="m-0 text-[17px] leading-6 font-semibold">Savollar</h2>
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: total }, (_, index) => index + 1).map((n) => {
          const state = stateOf(n)
          return (
            <button
              key={n}
              type="button"
              aria-label={`${n}-savol, ${LABELS[state]}`}
              aria-current={state === 'current' ? 'true' : undefined}
              onClick={() => goTo(n)}
              className={`h-11 cursor-pointer rounded-lg text-[15px] font-bold ${STYLES[state]}`}
            >
              {n}
            </button>
          )
        })}
      </div>

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
