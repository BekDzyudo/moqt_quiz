import { Navigate, Outlet } from 'react-router-dom'
import { homeFor } from '../lib/roles.js'
import { useAuth } from '../store/auth.js'

export function RequireRole({ roles }) {
  const user = useAuth((state) => state.user)

  if (!user) return <Navigate to="/login" replace />
  if (!roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />
  return <Outlet />
}

export function HomeRedirect() {
  const user = useAuth((state) => state.user)
  return <Navigate to={user ? homeFor(user.role) : '/login'} replace />
}
