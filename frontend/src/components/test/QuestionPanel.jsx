import { Bookmark, BookmarkCheck, ChevronLeft, ChevronRight, CircleAlert, CircleDashed, Loader2, RotateCw } from 'lucide-react'
import { useAttemptStore } from '../../store/attempt.js'
import Button from '../ui/Button.jsx'
import EmptyState from '../ui/EmptyState.jsx'

const LETTERS = ['A', 'B', 'C', 'D']

function OptionButton({ letter, text, selected, onSelect }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex min-h-16 cursor-pointer items-center gap-4 rounded-xl px-4 py-3 text-left text-[17px] transition-colors duration-150 ${
        selected
          ? 'border-2 border-brand-700 bg-brand-soft font-semibold'
          : 'border border-border-400 bg-surface-card font-medium hover:bg-surface-muted'
      }`}
    >
      <span
        className={`flex size-9 shrink-0 items-center justify-center rounded-full font-bold ${
          selected ? 'bg-brand-700 text-white' : 'bg-surface-muted'
        }`}
      >
        {letter}
      </span>
      {text}
    </button>
  )
}

export default function QuestionPanel() {
  const question = useAttemptStore((state) => state.question)
  const questionError = useAttemptStore((state) => state.questionError)
  const total = useAttemptStore((state) => state.total)
  const currentN = useAttemptStore((state) => state.currentN)
  const select = useAttemptStore((state) => state.select)
  const goTo = useAttemptStore((state) => state.goTo)
  const retryQuestion = useAttemptStore((state) => state.retryQuestion)
  const answered = useAttemptStore((state) => state.answered)
  const flagged = useAttemptStore((state) => state.flagged)
  const toggleFlag = useAttemptStore((state) => state.toggleFlag)

  const panelClass =
    'flex min-w-0 flex-[999_1_560px] flex-col gap-7 rounded-2xl border border-border-200 bg-surface-card p-10 shadow-card'

  if (questionError) {
    return (
      <section className={panelClass}>
        <EmptyState
          icon={CircleAlert}
          tone="error"
          title="Savol yuklanmadi"
          description={questionError}
          action={
            <Button variant="secondary" size="xs" icon={RotateCw} onClick={retryQuestion}>
              Qayta urinish
            </Button>
          }
        />
      </section>
    )
  }

  if (!question) {
    return (
      <section className={panelClass}>
        <EmptyState icon={Loader2} spin title="Yuklanmoqda" />
      </section>
    )
  }

  const isFlagged = flagged.includes(question.n)
  const isLast = currentN === total
  // Oxirgi savoldan keyin: birinchi javobsiz savolga qaytish taklifi.
  const firstUnanswered = Array.from({ length: total }, (_, index) => index + 1).find(
    (n) => n !== currentN && !answered.includes(n),
  )

  return (
    <section className={panelClass}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-[13px] leading-[18px] font-bold text-brand-500">
          Savol {question.n} / {total}
        </div>
        <button
          type="button"
          aria-pressed={isFlagged}
          onClick={() => toggleFlag(question.n)}
          className={`relative inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold after:absolute after:-inset-1 after:content-[''] ${
            isFlagged ? 'border-warning bg-warning-soft text-warning' : 'border-border-400 text-ink-600 hover:bg-surface-muted'
          }`}
        >
          {isFlagged ? 'Belgilangan' : 'Keyinroq qaytaman'}
          {isFlagged ? (
            <BookmarkCheck size={16} strokeWidth={1.9} aria-hidden="true" />
          ) : (
            <Bookmark size={16} strokeWidth={1.9} aria-hidden="true" />
          )}
        </button>
      </div>
      <h1 className="m-0 text-[26px] leading-9 font-bold">{question.text}</h1>
      {question.image_url && (
        <img
          src={question.image_url}
          alt="Savolga ilova qilingan rasm"
          draggable={false}
          className="max-h-80 max-w-full self-start rounded-xl border border-border-200"
        />
      )}

      <div role="radiogroup" aria-label="Javob variantlari" className="flex flex-col gap-3">
        {question.options.map((option, index) => (
          <OptionButton
            key={option.key}
            letter={LETTERS[index]}
            text={option.text}
            selected={question.selected_key === option.key}
            onSelect={() => select(option.key)}
          />
        ))}
      </div>

      <div className="flex flex-wrap justify-between gap-3 border-t border-border-200 pt-2">
        <Button
          variant="secondary"
          icon={ChevronLeft}
          iconFirst
          disabled={currentN === 1}
          onClick={() => goTo(currentN - 1)}
        >
          Oldingi
        </Button>
        <span className="hidden self-center text-[12px] text-ink-600 md:inline">
          Klaviatura: 1–4 — variant, ← → — savollar
        </span>
        {isLast && firstUnanswered ? (
          <Button variant="secondary" icon={CircleDashed} onClick={() => goTo(firstUnanswered)}>
            Javobsiz savolga ({firstUnanswered})
          </Button>
        ) : (
          <Button icon={ChevronRight} px="px-[22px]" disabled={isLast} onClick={() => goTo(currentN + 1)}>
            Keyingi
          </Button>
        )}
      </div>
    </section>
  )
}
