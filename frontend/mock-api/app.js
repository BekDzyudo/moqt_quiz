import { ApiError, FileResponse, notFound, Reply } from './http.js'
import { adminRoutes } from './routes/admins.js'
import { attemptRoutes } from './routes/attempts.js'
import { auditRoutes } from './routes/audit.js'
import { authRoutes } from './routes/auth.js'
import { bankRoutes } from './routes/bank.js'
import { groupRoutes } from './routes/groups.js'
import { importRoutes } from './routes/import.js'
import { resultRoutes } from './routes/results.js'
import { createState } from './state.js'
import { seedAttempts } from './testing/seed-attempts.js'

const methodNotAllowed = () => new ApiError(405, 'method_not_allowed', "Bu amalga ruxsat yo'q.")

// 'PATCH /admins/:id/' -> { method, pattern, handler }
function compileRoutes(table) {
  return Object.entries(table).map(([key, handler]) => {
    const [method, path] = key.split(' ')
    const source = path
      .replace(/[.]/g, '\\.')
      .replace(/:(\w+)/g, '(?<$1>[^/]+)')
    return { key, method, path, pattern: new RegExp(`^${source}$`), handler }
  })
}

function matchRoute(routes, method, path) {
  const onPath = routes
    .map((route) => ({ route, match: route.pattern.exec(path) }))
    .filter(({ match }) => match)
  const found = onPath.find(({ route }) => route.method === method)

  // Jurnal append-only: manzilidan qat'i nazar yozuvni o'zgartirib bo'lmaydi.
  const isAudit = path.startsWith('/audit/')
  if (isAudit && method !== 'GET') throw methodNotAllowed()
  if (found) return found
  throw onPath.length > 0 ? methodNotAllowed() : notFound()
}

function send(res, result) {
  if (result instanceof FileResponse) {
    res.statusCode = 200
    res.setHeader('Content-Type', result.contentType)
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`)
    res.end(result.buffer)
    return
  }

  const { status, body } = result
  res.statusCode = status
  if (body === undefined) {
    res.end()
    return
  }
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

export function createMockApi({ now = Date.now, latencyMs = 0, seedDemo = false } = {}) {
  const state = createState({ now })
  if (seedDemo) seedAttempts(state)

  const routes = compileRoutes({
    ...authRoutes(state),
    ...adminRoutes(state),
    ...auditRoutes(state),
    ...bankRoutes(state),
    ...importRoutes(state),
    ...groupRoutes(state),
    ...attemptRoutes(state),
    ...resultRoutes(state),
  })

  const handler = async (req, res) => {
    const url = new URL(req.url, 'http://mock')

    // Javoblarda ochiq parol bo'lishi mumkin: brauzer va proksi saqlab qolmasin.
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')

    if (latencyMs) await new Promise((resolve) => setTimeout(resolve, latencyMs))

    try {
      const { route, match } = matchRoute(routes, req.method, url.pathname)
      req.params = match.groups ?? {}
      req.query = url.searchParams

      const result = await route.handler(req)
      send(res, result instanceof FileResponse || result instanceof Reply ? result : new Reply(200, result))
    } catch (error) {
      if (error instanceof ApiError) {
        send(res, new Reply(error.status, error.body))
        return
      }
      // Sahifa yangilanganda brauzer yarim so'rovni uzadi: javob beradigan hech kim yo'q.
      if (req.destroyed || error.code === 'ECONNRESET') return

      // Bu yerdan xato tashqariga chiqsa, butun dev server o'ladi.
      console.error('[mock-api]', req.method, req.url, error)
      send(res, new Reply(500, { code: 'server_error', detail: "Serverda xatolik. Qayta urining." }))
    }
  }

  return Object.assign(handler, {
    auditLog: state.auditLog,
    users: state.users,
    engine: state.engine,
    routes,
  })
}
