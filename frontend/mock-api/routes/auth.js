import { ApiError, readJson, unauthorized, validationError } from '../http.js'
import { hashPassword, verifyPassword } from '../passwords.js'
import { verifyToken } from '../tokens.js'
import { passwordError } from '../validators.js'

const LOGIN_LIMIT = 5
const LOGIN_WINDOW_MS = 60 * 1000

const userObject = (user) => ({ type: 'user', repr: user.username })

const publicUser = ({ id, full_name, role }) => ({ id, full_name, role })

export function authRoutes(state) {
  const { now, users, audit, issueTokens, revokedRefresh } = state
  const loginAttempts = new Map()

  const throttleLogin = (req, username) => {
    const key = `${req.socket.remoteAddress}|${username}`
    const windowStart = now() - LOGIN_WINDOW_MS
    const recent = (loginAttempts.get(key) ?? []).filter((at) => at > windowStart)

    if (recent.length >= LOGIN_LIMIT) {
      const retryAfter = Math.ceil((recent[0] + LOGIN_WINDOW_MS - now()) / 1000)
      throw new ApiError(
        429,
        'throttled',
        `Kirish urinishlari ko'payib ketdi. ${retryAfter} soniyadan keyin qayta urining yoki MOM test mas'uliga murojaat qiling.`,
        { retry_after: retryAfter },
      )
    }
    loginAttempts.set(key, [...recent, now()])
  }

  return {
    'POST /auth/login/': async (req) => {
      const { username = '', password = '' } = await readJson(req)
      const login = String(username).trim()
      throttleLogin(req, login)

      const user = users.find((candidate) => candidate.username === login)
      if (!user || !verifyPassword(password, user.password_hash) || !user.is_active) {
        throw new ApiError(
          401,
          'invalid_credentials',
          "Login yoki parol noto'g'ri. Qayta kiriting yoki MOM test mas'uliga murojaat qiling.",
        )
      }

      if (user.role === 'listener') {
        user.session_version += 1
        const attempt = state.engine.latestAttempt(user)
        if (attempt?.status === 'active') state.engine.addEvent(attempt, 'new_session')
      }
      audit(req, 'login', user, userObject(user))
      return { ...issueTokens(user), user: publicUser(user) }
    },

    'POST /auth/refresh/': async (req) => {
      const { refresh } = await readJson(req)
      const payload = verifyToken(refresh, { type: 'refresh', nowMs: now() })
      if (!payload || revokedRefresh.has(payload.jti)) throw unauthorized()
      return { access: issueTokens(state.userFromPayload(payload)).access }
    },

    'POST /auth/logout/': async (req) => {
      const user = state.authenticate(req)
      const { refresh } = await readJson(req)
      const payload = verifyToken(refresh, { type: 'refresh', nowMs: now() })
      if (payload) revokedRefresh.add(payload.jti)
      audit(req, 'logout', user, userObject(user))
      return { detail: 'Tizimdan chiqildi.' }
    },

    'GET /auth/me/': async (req) => {
      const user = state.authenticate(req)
      return { ...publicUser(user), username: user.username }
    },

    // Boshqa qurilmalardagi seanslar eskiradi, shu seans uchun yangi tokenlar qaytadi.
    'POST /auth/change-password/': async (req) => {
      const user = state.requireRole(req, 'admin', 'superadmin')
      const { current_password: currentPassword, new_password: newPassword } = await readJson(req)

      const fields = {}
      if (!verifyPassword(currentPassword, user.password_hash)) {
        fields.current_password = "Joriy parol to'g'ri kelmadi. Qayta kiriting."
      }
      const invalid = passwordError(newPassword)
      if (invalid) fields.new_password = invalid
      else if (newPassword === currentPassword) {
        fields.new_password = "Yangi parol joriy paroldan farq qilsin."
      }
      if (Object.keys(fields).length > 0) throw validationError(fields)

      user.password_hash = hashPassword(newPassword)
      user.session_version += 1
      audit(req, 'password_changed', user, userObject(user))
      return issueTokens(user)
    },
  }
}
