import { CircleAlert, Loader2, Monitor, RotateCw } from 'lucide-react'
import { useEffect } from 'react'
import { fetchMyTest } from '../../api/attempt.js'
import { useRequest } from '../../api/useRequest.js'
import ActiveTest from '../../components/test/ActiveTest.jsx'
import { useIsDesktop } from '../../components/test/guards.js'
import PageBar from '../../components/test/PageBar.jsx'
import ResultScreen from '../../components/test/ResultScreen.jsx'
import WaitingScreen from '../../components/test/WaitingScreen.jsx'
import Button from '../../components/ui/Button.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'

const WAITING_POLL_MS = 10 * 1000

function Centered({ children }) {
  return <div className="flex min-h-screen items-center justify-center p-6">{children}</div>
}

export default function TestPage() {
  const { data: test, error, reload } = useRequest(fetchMyTest)
  const isDesktop = useIsDesktop()

  const attempt = test?.attempt
  const isActive = attempt?.status === 'active'
  const isFinished = attempt && !isActive && !test.retake_allowed

  // Kutishda test ochilganini shu so'rov aniqlaydi. Boshqa qurilmadan kirilgani ham shu yerda bilinadi.
  useEffect(() => {
    if (!test || isActive || isFinished) return undefined
    const timer = setInterval(reload, WAITING_POLL_MS)
    return () => clearInterval(timer)
  }, [test, isActive, isFinished, reload])

  if (!test) {
    return (
      <Centered>
        {error ? (
          <EmptyState
            icon={CircleAlert}
            tone="error"
            title="Test ma'lumotini olib bo'lmadi"
            description={error}
            action={
              <Button variant="secondary" size="xs" icon={RotateCw} onClick={reload}>
                Qayta urinish
              </Button>
            }
          />
        ) : (
          <EmptyState icon={Loader2} spin title="Yuklanmoqda" />
        )}
      </Centered>
    )
  }

  if (isFinished) return <ResultScreen attemptId={attempt.id} test={test} />

  if (!isDesktop) {
    return (
      <div className="flex min-h-screen flex-col">
        <PageBar />
        <Centered>
          <EmptyState
            icon={Monitor}
            title="Kompyuterdan kiring"
            description="Test faqat kompyuterda topshiriladi: ekran kengligi kamida 1024 piksel bo'lishi kerak."
          />
        </Centered>
      </div>
    )
  }

  if (isActive) {
    return <ActiveTest attemptId={attempt.id} setName={test.set.name} onEnded={reload} />
  }

  return <WaitingScreen test={test} onStarted={reload} />
}
