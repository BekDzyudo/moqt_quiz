import { LogOut } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { ROLES } from '../../lib/roles.js'
import { useAuth } from '../../store/auth.js'
import BrandMark from '../ui/BrandMark.jsx'
import ThemeToggle from '../ui/ThemeToggle.jsx'
import Button from '../ui/Button.jsx'
import ChangePasswordModal from './ChangePasswordModal.jsx'
import { ADMIN_PAGES, SUPERADMIN_PAGES } from './navigation.js'

function NavItem({ page }) {
  const { to, label, icon: Icon } = page
  const linkClass = ({ isActive }) =>
    `flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] no-underline ${
      isActive
        ? 'bg-brand-soft font-bold text-brand-ink-strong hover:text-brand-ink-strong'
        : 'font-medium text-ink-600 hover:bg-surface-muted hover:text-ink-900'
    }`

  return (
    <NavLink to={to} end={to === '/admin'} className={linkClass}>
      <Icon size={18} strokeWidth={1.9} aria-hidden="true" />
      {label}
    </NavLink>
  )
}

export default function AdminLayout() {
  const user = useAuth((state) => state.user)
  const logout = useAuth((state) => state.logout)
  const [changingPassword, setChangingPassword] = useState(false)

  return (
    <div className="flex min-h-screen flex-wrap">
      <nav
        aria-label="Asosiy menyu"
        className="flex min-w-0 flex-[1_1_248px] flex-col gap-1 border-r [&>*]:shrink-0 border-border-200 bg-surface-card px-4 py-6 min-[808px]:sticky min-[808px]:top-0 min-[808px]:h-screen min-[808px]:self-start min-[808px]:overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-2 pb-5 pl-2">
          <BrandMark />
          <ThemeToggle size="xs" />
        </div>

        {ADMIN_PAGES.map((page) => (
          <NavItem key={page.to} page={page} />
        ))}

        {user.role === 'superadmin' && (
          <>
            <div className="px-3 pt-5 pb-2 text-xs leading-4 font-bold tracking-[0.12em] text-ink-600">
              SUPERADMIN
            </div>
            {SUPERADMIN_PAGES.map((page) => (
              <NavItem key={page.to} page={page} />
            ))}
          </>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border-200 px-2 pt-4">
          <div className="min-w-0">
            <div className="font-semibold">{user.full_name}</div>
            <div className="text-[13px] text-ink-600">{ROLES[user.role]}</div>
            <button
              type="button"
              onClick={() => setChangingPassword(true)}
              className="relative cursor-pointer text-left text-[13px] leading-[18px] text-brand-500 underline after:absolute after:-inset-y-3 after:inset-x-0 after:content-[''] hover:text-brand-ink-strong"
            >
              Parolni o'zgartirish
            </button>
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={LogOut}
            aria-label="Chiqish"
            className="shrink-0"
            onClick={logout}
          />
        </div>
      </nav>

      <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-6 p-4 sm:p-8">
        <Outlet />
      </main>

      <ChangePasswordModal open={changingPassword} onClose={() => setChangingPassword(false)} />
    </div>
  )
}
