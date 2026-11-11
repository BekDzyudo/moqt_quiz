import { Lock, LockOpen } from 'lucide-react'
import { useState } from 'react'
import { errorMessage } from '../../api/client.js'
import { formatRemaining } from '../../lib/serverClock.js'
import Alert from '../ui/Alert.jsx'
import Button from '../ui/Button.jsx'
import Field from '../ui/Field.jsx'
import ExitLimitNote from './ExitLimitNote.jsx'

// Test qulflangan: savollar DOM'da yo'q, server ham savol bermaydi. Faqat admin bergan kod ochadi.
// byAdmin: admin qoidabuzarlik uchun qo'lda qulflagan — davom etish yoki yakunlashni admin hal qiladi.
export default function LockedOverlay({ remaining, exits, exitLimit, byAdmin = false, onUnlock }) {
  const [code, setCode] = useState('')
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setChecking(true)
    setError(null)
    try {
      await onUnlock(code.trim())
    } catch (unlockError) {
      setError(errorMessage(unlockError))
      setCode('')
      setChecking(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-brand-900 p-6">
      <section
        role="alertdialog"
        aria-labelledby="locked-title"
        className="flex w-full max-w-[560px] flex-col items-center gap-5 rounded-3xl bg-surface-card p-10 text-center shadow-card"
      >
        <div className="flex size-16 items-center justify-center rounded-full bg-error-soft text-error">
          <Lock size={30} strokeWidth={1.9} aria-hidden="true" />
        </div>
        <h1 id="locked-title" className="m-0 text-[26px] leading-[34px] font-bold">
          {byAdmin ? 'Test administrator tomonidan qulflandi' : 'Test qulflandi'}
        </h1>
        <p className="m-0 text-ink-600">
          {byAdmin
            ? "Qoidabuzarlik aniqlangani uchun testingiz to'xtatib turilibdi. Testni davom ettirish yoki yakunlashni administrator hal qiladi. Vaqt to'xtamaydi."
            : "Siz test sahifasidan boshqa sahifa yoki dasturga o'tdingiz. Davom etish uchun administratorga murojaat qiling: u sizga ochish kodini beradi. Vaqt to'xtamaydi."}
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          <div className="flex min-w-[150px] flex-col gap-0.5 rounded-xl bg-surface-muted px-4 py-2.5">
            <span className="text-[13px] font-semibold text-ink-600">Qolgan vaqt</span>
            <span className="text-xl leading-7 font-extrabold tabular-nums">
              {remaining === null ? '—' : formatRemaining(remaining)}
            </span>
          </div>
          <div className="flex min-w-[150px] flex-col gap-0.5 rounded-xl bg-error-soft px-4 py-2.5 text-error">
            <span className="text-[13px] font-semibold">Chiqishlar soni</span>
            <span className="text-xl leading-7 font-extrabold">
              {exits} / {exitLimit}
            </span>
          </div>
        </div>

        {!byAdmin && <ExitLimitNote exits={exits} exitLimit={exitLimit} />}

        <form noValidate onSubmit={handleSubmit} className="flex w-full max-w-[320px] flex-col gap-4">
          <Field
            label="Ochish kodi"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
          />
          {error && <Alert tone="error">{error}</Alert>}
          <Button type="submit" size="xl" icon={LockOpen} loading={checking} disabled={code.length !== 6}>
            Ochish va davom etish
          </Button>
        </form>
      </section>
    </div>
  )
}
