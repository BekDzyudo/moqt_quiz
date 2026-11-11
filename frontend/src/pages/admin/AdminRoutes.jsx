import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from '../../components/admin/AdminLayout.jsx'
import { ADMIN_PAGES, SUPERADMIN_PAGES } from '../../components/admin/navigation.js'
import { RequireRole } from '../../routes/guards.jsx'
import AdminsPage from './AdminsPage.jsx'
import AuditPage from './AuditPage.jsx'
import DashboardPage from './DashboardPage.jsx'
import GroupDetailPage from './GroupDetailPage.jsx'
import GroupsPage from './GroupsPage.jsx'
import LivePage from './LivePage.jsx'
import PlaceholderPage from './PlaceholderPage.jsx'
import QuestionSetsPage from './QuestionSetsPage.jsx'
import QuestionsPage from './QuestionsPage.jsx'
import ResultsPage from './ResultsPage.jsx'

const UiKitPage = import.meta.env.DEV ? lazy(() => import('./UiKitPage.jsx')) : null

const SCREENS = {
  '/admin': DashboardPage,
  '/admin/test-jarayoni': LivePage,
  '/admin/natijalar': ResultsPage,
  '/admin/savollar': QuestionsPage,
  '/admin/toplamlar': QuestionSetsPage,
  '/admin/guruhlar': GroupsPage,
  '/admin/adminlar': AdminsPage,
  '/admin/jurnal': AuditPage,
}

const routePath = (to) => to.replace('/admin', '').replace(/^\//, '')

const screenRoute = (page) => {
  const Screen = SCREENS[page.to] ?? PlaceholderPage
  const element = <Screen page={page} />
  return page.to === '/admin' ? (
    <Route key={page.to} index element={element} />
  ) : (
    <Route key={page.to} path={routePath(page.to)} element={element} />
  )
}

export default function AdminRoutes() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        {ADMIN_PAGES.map(screenRoute)}
        <Route
          path="guruhlar/:id"
          element={<GroupDetailPage page={ADMIN_PAGES.find((page) => page.to === '/admin/guruhlar')} />}
        />
        <Route element={<RequireRole roles={['superadmin']} />}>
          {SUPERADMIN_PAGES.map(screenRoute)}
        </Route>
        {import.meta.env.DEV && <Route path="ui" element={<UiKitPage />} />}
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  )
}
