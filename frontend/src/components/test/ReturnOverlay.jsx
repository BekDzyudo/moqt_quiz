import { Maximize, TriangleAlert } from 'lucide-react'
import { formatRemaining } from '../../lib/serverClock.js'
import Alert from '../ui/Alert.jsx'
import Button from '../ui/Button.jsx'

// Bu qatlam ochiq turganda savol va variantlar DOM'da umuman bo'lmaydi.
export default function ReturnOverlay({ remaining, exits, exitLimit, error, onReturn }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-brand-900 p-6">
      <section
        role="alertdialog"
        aria-labelledby="return-title"
        className="flex w-full max-w-[560px] flex-col items-center gap-5 rounded-3xl bg-surface-card p-10 text-center shadow-card"
      >
        <div className="flex size-16 items-center justify-center rounded-full bg-warning-soft text-warning">
          <TriangleAlert size={30} strokeWidth={1.9} aria-hidden="true" />
        </div>
        <h1 id="return-title" className="m-0 text-[26px] leading-[34px] font-bold">
          Siz test oynasidan chiqdingiz
        </h1>
        <p className="m-0 text-ink-600">
          Savollar yopildi. Vaqt to'xtamaydi — davom etish uchun testga qayting. Bu holat jurnalga
          yozildi.
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

        <p className="m-0 text-[13px] leading-[19px] text-ink-600">
          {exitLimit} martadan ortiq chiqish urinishni "shubhali" deb belgilaydi va adminga
          ko'rsatiladi.
        </p>

        {error && <Alert tone="error">{error}</Alert>}

        <Button icon={Maximize} className="h-[52px] px-7" onClick={onReturn}>
          Testga qaytish
        </Button>
      </section>
    </div>
  )
}
