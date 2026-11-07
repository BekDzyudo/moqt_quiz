import { LogOut } from 'lucide-react'
import { ROLES } from '../../lib/roles.js'
import { useAuth } from '../../store/auth.js'
import BrandMark from '../ui/BrandMark.jsx'
import Button from '../ui/Button.jsx'

export default function PageBar() {
  const user = useAuth((state) => state.user)
  const logout = useAuth((state) => state.logout)

  return (
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
  )
}
