import { Clock, Keyboard, Play } from 'lucide-react'
import { useState } from 'react'
import { startTest } from '../../api/attempt.js'
import { errorMessage } from '../../api/client.js'
import Alert from '../ui/Alert.jsx'
import Button from '../ui/Button.jsx'
import Card from '../ui/Card.jsx'
import Checkbox from '../ui/Checkbox.jsx'
import StatTile from '../ui/StatTile.jsx'
import StatusBadge from '../ui/StatusBadge.jsx'
import { enterFullscreen, leaveFullscreen } from './guards.js'
import PageBar from './PageBar.jsx'

function Kbd({ children }) {
  return (
    <kbd className="inline-flex min-w-6 items-center justify-center rounded-md border border-border-400 bg-surface-card px-1.5 font-sans text-[12px] font-bold text-ink-900">
      {children}
    </kbd>
  )
}

const rulesFor = (limit) => [
  "Test boshlangach sahifa to'liq ekranga o'tadi. Boshqa oyna yoki dasturga o'tsangiz, test qulflanadi: davom etish uchun administrator ochish kodini beradi. Vaqt bu paytda to'xtamaydi.",
  `Test oynasidan ${limit} martadan ortiq chiqsangiz, test shu paytgacha bergan javoblaringiz bilan avtomatik yakunlanadi.`,
  "Telefon, konspekt va boshqa yordamchi vositalardan foydalanish taqiqlanadi. Qoidabuzarlik aniqlansa, administrator testni qulflaydi yoki yakunlaydi.",
  "Vaqt server bo'yicha hisoblanadi. Sahifani yangilasangiz yoki internet uzilsa, test qolgan joyidan davom etadi.",
  'Har bir javob darhol saqlanadi. Vaqt tugaganda test avtomatik yakunlanadi.',
  'Testni faqat bir marta boshlash mumkin.',
]

export default function WaitingScreen({ test, onStarted }) {
  const [agreed, setAgreed] = useState(false)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState(null)

  const isOpen = test.test_status === 'open'

  const handleStart = async () => {
    setStarting(true)
    setError(null)

    // To'liq ekran foydalanuvchi bosishi ichida so'ralishi shart, shuning uchun so'rovdan oldin.
    await enterFullscreen().catch(() => {})

    try {
      await startTest()
      onStarted()
    } catch (startError) {
      await leaveFullscreen()
      setError(errorMessage(startError))
      setStarting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PageBar />
      <main className="flex flex-1 justify-center px-4 py-12 sm:px-6">
        <div className="flex w-full max-w-[880px] flex-col gap-5">
          <Card padding="p-8" className="flex flex-col gap-6 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex flex-col gap-1.5">
                <div className="text-[13px] leading-[18px] font-semibold text-ink-600">
                  Chiqish testi · Guruh {test.group.name}
                </div>
                <h1 className="m-0 text-[26px] leading-[34px] font-bold tracking-[-0.01em]">
                  {test.set.name}
                </h1>
              </div>
              {isOpen ? (
                <StatusBadge large tone="success">Test ochiq</StatusBadge>
              ) : (
                <StatusBadge large tone="warning">Test hali ochilmagan</StatusBadge>
              )}
            </div>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
              <StatTile label="Savollar soni" value={`${test.set.question_count} ta`} padding="p-4" />
              <StatTile label="Vaqt" value={`${test.set.duration_minutes} daqiqa`} padding="p-4" />
              <StatTile label="O'tish chegarasi" value={`${test.set.pass_score} ta to'g'ri`} padding="p-4" />
            </div>

            {!isOpen && (
              <div className="flex items-start gap-3 rounded-xl bg-brand-soft p-4">
                <Clock
                  size={18}
                  strokeWidth={1.9}
                  aria-hidden="true"
                  className="mt-[3px] shrink-0 text-brand-ink-strong"
                />
                <span className="leading-[23px]">
                  Admin testni ochgach, shu yerda "Testni boshlash" tugmasi paydo bo'ladi. Sahifani
                  yangilash shart emas.
                </span>
              </div>
            )}
          </Card>

          <Card padding="p-8" className="flex flex-col gap-4">
            <h2 className="m-0 text-xl leading-7 font-bold">Test qoidalari</h2>
            <ol className="m-0 flex list-decimal flex-col gap-2 pl-5">
              {rulesFor(test.exit_limit ?? 3).map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ol>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-surface-muted px-4 py-3 text-[13px] leading-[19px] text-ink-600">
              <span className="flex items-center gap-1.5 font-semibold text-ink-900">
                Klaviatura <Keyboard size={16} strokeWidth={1.9} aria-hidden="true" />
              </span>
              <span>
                <Kbd>1</Kbd>–<Kbd>4</Kbd> variant tanlash
              </span>
              <span>
                <Kbd>←</Kbd> <Kbd>→</Kbd> oldingi / keyingi savol
              </span>
            </div>
            <Checkbox
              label="Qoidalar bilan tanishdim va roziman"
              checked={agreed}
              onChange={(event) => setAgreed(event.target.checked)}
            />
            {error && <Alert tone="error">{error}</Alert>}
            <div className="flex justify-end">
              <Button
                icon={Play}
                px="px-6"
                loading={starting}
                disabled={!isOpen || !agreed}
                onClick={handleStart}
              >
                Testni boshlash
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  )
}
