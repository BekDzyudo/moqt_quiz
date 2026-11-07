import { notFound, readJson, Reply, validationError } from '../http.js'
import { hashPassword } from '../passwords.js'
import { passwordError, usernameError } from '../validators.js'

// Parol va session_version bu javobga hech qachon kirmaydi.
const publicAdmin = ({ id, full_name, username, organization, is_active }) => ({
  id,
  full_name,
  username,
  organization,
  is_active,
})

const adminObject = (admin) => ({ type: 'user', repr: admin.username })

const text = (value) => (typeof value === 'string' ? value.trim() : '')

export function adminRoutes(state) {
  const { users, audit, requireRole } = state

  const isAdmin = (user) => user.role === 'admin'

  const findAdmin = (id) => {
    const admin = users.find((user) => String(user.id) === id && isAdmin(user))
    if (!admin) throw notFound("Admin topilmadi. Ro'yxatni yangilab, qayta urining.")
    return admin
  }

  return {
    'GET /admins/': async (req) => {
      requireRole(req, 'superadmin')
      return users.filter(isAdmin).map(publicAdmin)
    },

    'POST /admins/': async (req) => {
      const actor = requireRole(req, 'superadmin')
      const body = await readJson(req)
      const fullName = text(body.full_name)
      const organization = text(body.organization)
      const username = text(body.username)

      const fields = {
        full_name: fullName ? undefined : 'F.I.Sh. ni kiriting.',
        organization: organization ? undefined : 'Tashkilotni kiriting.',
        username: usernameError(username, users),
        password: passwordError(body.password),
      }
      if (Object.values(fields).some(Boolean)) throw validationError(fields)

      const admin = state.createUser({
        username,
        password_hash: hashPassword(body.password),
        full_name: fullName,
        organization,
        role: 'admin',
        is_active: true,
      })
      audit(req, 'admin_created', actor, adminObject(admin))
      return new Reply(201, publicAdmin(admin))
    },

    'PATCH /admins/:id/': async (req) => {
      const actor = requireRole(req, 'superadmin')
      const admin = findAdmin(req.params.id)
      const body = await readJson(req)
      const username = body.username === undefined ? admin.username : text(body.username)
      const fullName = body.full_name === undefined ? admin.full_name : text(body.full_name)
      const organization =
        body.organization === undefined ? admin.organization : text(body.organization)

      const fields = {
        full_name: fullName ? undefined : 'F.I.Sh. ni kiriting.',
        organization: organization ? undefined : 'Tashkilotni kiriting.',
        username: usernameError(username, users, admin),
        password: body.password === undefined ? undefined : passwordError(body.password),
      }
      if (Object.values(fields).some(Boolean)) throw validationError(fields)

      const previous = { username: admin.username, full_name: admin.full_name, organization: admin.organization }
      const changed = Object.entries({ username, full_name: fullName, organization }).filter(
        ([key, value]) => value !== previous[key],
      )
      if (changed.length > 0) {
        Object.assign(admin, Object.fromEntries(changed))
        const before = Object.fromEntries(changed.map(([key]) => [key, previous[key]]))
        audit(req, 'admin_updated', actor, adminObject(admin), { previous: before })
      }

      if (body.password !== undefined) {
        admin.password_hash = hashPassword(body.password)
        admin.session_version += 1
        audit(req, 'admin_password_changed', actor, adminObject(admin))
      }

      if (typeof body.is_active === 'boolean' && body.is_active !== admin.is_active) {
        admin.is_active = body.is_active
        // Blokdan chiqarilgach eski tokenlar qayta jonlanmasligi uchun.
        admin.session_version += 1
        audit(req, body.is_active ? 'admin_unblocked' : 'admin_blocked', actor, adminObject(admin))
      }

      return publicAdmin(admin)
    },

    'DELETE /admins/:id/': async (req) => {
      const actor = requireRole(req, 'superadmin')
      const admin = findAdmin(req.params.id)
      users.splice(users.indexOf(admin), 1)
      audit(req, 'admin_deleted', actor, adminObject(admin))
      return new Reply(204)
    },
  }
}
