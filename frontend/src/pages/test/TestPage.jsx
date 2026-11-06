import { ClipboardCheck, LogOut } from 'lucide-react'
import { useEffect } from 'react'
import { api } from '../../api/client.js'
import BrandMark from '../../components/ui/BrandMark.jsx'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import { ROLES } from '../../lib/roles.js'
import { useAuth } from '../../store/auth.js'

const POLL_MS = 10_000

// 5-bosqichda kutish, test va natija holatlari shu sahifaga qo'shiladi.
export default function TestPage() {
  const user = useAuth((state) => state.user)
  const logout = useAuth((state) => state.logout)

  // Boshqa qurilmadan kirilganini shu so'rov aniqlaydi (5-bosqichda GET /me/test/ almashtiradi).
  useEffect(() => {
    const timer = setInterval(() => {
      api.get('/auth/me/').catch(() => {})
    }, POLL_MS)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex min-h-[68px] flex-wrap items-center justify-between gap-4 border-b border-border-200 bg-surface-card px-4 py-3 sm:px-8">
        <BrandMark />
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="leading-5 font-semibold">{user.full_name}</div>
            <div className="text-[13px] leading-[18px] text-ink-600">
              {ROLES[user.role]} · <span className="font-mono">{user.username}</span>
            </div>
          </div>
          <Button variant="secondary" size="sm" icon={LogOut} onClick={logout}>
            Chiqish
          </Button>
        </div>
      </header>
      <main className="flex flex-1 justify-center px-4 py-12 sm:px-6">
        <Card className="h-fit w-full max-w-[880px]">
          <EmptyState
            icon={ClipboardCheck}
            title="Test sahifasi tayyorlanmoqda"
            description="Bu sahifa 5-bosqichda to'ldiriladi."
          />
        </Card>
      </main>
    </div>
  )
}
