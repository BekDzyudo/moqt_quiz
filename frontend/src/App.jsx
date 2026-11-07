import { CircleAlert, Loader2, RotateCw } from 'lucide-react'
import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import Button from './components/ui/Button.jsx'
import EmptyState from './components/ui/EmptyState.jsx'
import LoginPage from './pages/auth/LoginPage.jsx'
import { HomeRedirect, RequireRole } from './routes/guards.jsx'
import { useAuth } from './store/auth.js'

// Test sahifasi admin kodidan mustaqil chunk bo'lib qoladi.
const TestPage = lazy(() => import('./pages/test/TestPage.jsx'))
const AdminRoutes = lazy(() => import('./pages/admin/AdminRoutes.jsx'))

function FullPage({ children }) {
  return <div className="flex min-h-screen items-center justify-center p-6">{children}</div>
}

function Loading() {
  return (
    <FullPage>
      <EmptyState icon={Loader2} spin title="Yuklanmoqda" />
    </FullPage>
  )
}

export default function App() {
  const status = useAuth((state) => state.status)
  const bootError = useAuth((state) => state.bootError)
  const bootstrap = useAuth((state) => state.bootstrap)

  useEffect(() => {
    bootstrap()
  }, [bootstrap])

  if (status === 'booting') return <Loading />

  if (status === 'failed') {
    return (
      <FullPage>
        <EmptyState
          icon={CircleAlert}
          tone="error"
          title="Sahifani ochib bo'lmadi"
          description={bootError}
          action={
            <Button icon={RotateCw} onClick={bootstrap}>
              Qayta urinish
            </Button>
          }
        />
      </FullPage>
    )
  }

  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireRole roles={['listener']} />}>
          <Route path="/test" element={<TestPage />} />
        </Route>
        <Route element={<RequireRole roles={['admin', 'superadmin']} />}>
          <Route path="/admin/*" element={<AdminRoutes />} />
        </Route>
        <Route path="*" element={<HomeRedirect />} />
      </Routes>
    </Suspense>
  )
}
