import { Check, ChevronLeft, Flag } from 'lucide-react'
import { useState } from 'react'
import { errorMessage } from '../../api/client.js'
import { formatRemaining } from '../../lib/serverClock.js'
import { useAttemptStore } from '../../store/attempt.js'
import Alert from '../ui/Alert.jsx'
import Button from '../ui/Button.jsx'
import Modal from '../ui/Modal.jsx'

const UNSAVED_MESSAGE =
  "Ba'zi javoblar hali saqlanmagan. Internet aloqasini tekshirib, qayta urining: javoblaringiz yo'qolmaydi."

function Stat({ label, value, className }) {
  return (
    <div className={`flex flex-col gap-0.5 rounded-xl p-3 ${className}`}>
      <span className="text-[13px] font-semibold">{label}</span>
      <span className="text-xl font-extrabold">{value}</span>
    </div>
  )
}

function NumberList({ label, numbers, onPick, tone }) {
  const shown = numbers.slice(0, 20)
  return (
    <div className="flex flex-col gap-2">
      <span className={`text-[13px] font-semibold ${tone === 'error' ? 'text-error' : 'text-warning'}`}>{label}:</span>
      <div className="flex flex-wrap gap-1.5">
        {shown.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onPick(n)}
            aria-label={`${n}-savolga o'tish`}
            className={`relative h-8 min-w-9 cursor-pointer rounded-lg border px-2 text-[13px] font-bold after:absolute after:-inset-1.5 after:content-[''] ${
              tone === 'error' ? 'border-error text-error hover:bg-error-soft' : 'border-warning text-warning hover:bg-warning-soft'
            }`}
          >
            {n}
          </button>
        ))}
        {numbers.length > shown.length && <span className="self-center text-[13px] text-ink-600">va yana {numbers.length - shown.length} ta</span>}
      </div>
    </div>
  )
}

export default function FinishModal({ remaining, onClose }) {
  const total = useAttemptStore((state) => state.total)
  const answered = useAttemptStore((state) => state.answered)
  const finish = useAttemptStore((state) => state.finish)
  const flagged = useAttemptStore((state) => state.flagged)
  const goTo = useAttemptStore((state) => state.goTo)
  const unanswered = Array.from({ length: total }, (_, index) => index + 1).filter((n) => !answered.includes(n))
  const jump = (n) => {
    onClose()
    goTo(n)
  }

  const [finishing, setFinishing] = useState(false)
  const [error, setError] = useState(null)

  const handleFinish = async () => {
    setFinishing(true)
    setError(null)
    try {
      await finish()
    } catch (finishError) {
      setError(finishError.message === 'unsaved' ? UNSAVED_MESSAGE : errorMessage(finishError))
      setFinishing(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Testni yakunlaysizmi?"
      icon={Flag}
      hideClose
      footer={
        <div className="ml-auto flex flex-wrap gap-3">
          <Button variant="secondary" icon={ChevronLeft} onClick={onClose}>
            Testga qaytish
          </Button>
          <Button icon={Check} loading={finishing} onClick={handleFinish}>
            Ha, yakunlash
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Javob berilgan" value={answered.length} className="bg-surface-muted text-ink-600" />
          <Stat label="Javobsiz" value={total - answered.length} className="bg-error-soft text-error" />
        </div>
        {unanswered.length > 0 && (
          <NumberList label="Javobsiz savollar" numbers={unanswered} onPick={jump} tone="error" />
        )}
        {flagged.length > 0 && (
          <NumberList label="Keyinroq qaytaman deb belgilanganlar" numbers={flagged} onPick={jump} tone="warning" />
        )}
        <p className="m-0 text-ink-600">
          Yakunlagandan keyin javoblarni o'zgartirib bo'lmaydi. Qolgan vaqt:{' '}
          {remaining === null ? '—' : formatRemaining(remaining)}.
        </p>
        {error && <Alert tone="error">{error}</Alert>}
      </div>
    </Modal>
  )
}
