import { accountBlocked, forbidden, sessionReplaced, unauthorized } from './http.js'
import { createBank } from './bank-seed.js'
import { createEngine } from './testing/engine.js'
import { createGroups } from './groups-seed.js'
import { hashPassword } from './passwords.js'
import { createToken, verifyToken } from './tokens.js'

const ACCESS_TTL_SECONDS = 30 * 60
const REFRESH_TTL_SECONDS = 12 * 60 * 60

const ACTOR_ROLES = {
  superadmin: 'superadmin',
  admin: 'admin',
  listener: 'tinglovchi',
  system: 'avtomatik',
}

// Faqat dev uchun namuna hisoblar. Ochiq parol shu mock'dan tashqariga chiqmaydi.
const seedUsers = () =>
  [
    ['superadmin', 'Super12345', "Raqamlashtirish bo'limi", 'superadmin', 'KTRI'],
    ['admin', 'Admin12345', 'Saidov Rustam Akramovich', 'admin', 'Toshkent MOM'],
    ['sam_mom', 'Samarqand2026', 'Xolmatova Dildora Ismoilovna', 'admin', 'Samarqand MOM'],
    ['bux_hf', 'Buxoro2026', 'Ortiqov Behruz Nodirovich', 'admin', 'Buxoro hududiy fakulteti'],
    ['far_mom', 'Fargona2026', 'Mirzayev Akmal Toxirovich', 'admin', "Farg'ona MOM"],
    ['nam_mom', 'Namangan2026', "Jo'rayeva Sevara Anvarovna", 'admin', 'Namangan MOM', false],
    ['AKT01-017', 'Ab3dE9', 'Karimova Dilnoza Rustamovna', 'listener', 'Toshkent MOM'],
  ].map(([username, password, full_name, role, organization, is_active = true], index) => ({
    id: index + 1,
    username,
    password_hash: hashPassword(password),
    full_name,
    role,
    organization,
    is_active,
    session_version: 0,
  }))

export function createState({ now }) {
  const users = seedUsers()
  const auditLog = []
  const revokedRefresh = new Set()
  let nextUserId = users.length + 1

  const createUser = (fields) => {
    const user = { id: nextUserId, session_version: 0, ...fields }
    nextUserId += 1
    users.push(user)
    return user
  }

  const bank = createBank(users[0].id)
  const groups = createGroups({
    seedListener: users.find((user) => user.role === 'listener'),
    createUser,
    nowIso: () => new Date(now()).toISOString(),
  })

  const actorLabel = (user) =>
    `${user.full_name.split(' ').slice(0, 2).join(' ')} (${ACTOR_ROLES[user.role]})`

  const issueTokens = (user) => ({
    access: createToken({ user, type: 'access', ttlSeconds: ACCESS_TTL_SECONDS, nowMs: now() }),
    refresh: createToken({ user, type: 'refresh', ttlSeconds: REFRESH_TTL_SECONDS, nowMs: now() }),
  })

  // Faqat tinglovchiga "boshqa qurilmadan kirdingiz" deyiladi: admin seansi parol
  // almashtirilganda ham eskiradi, unga bu xabar noto'g'ri bo'lardi.
  const userFromPayload = (payload) => {
    const user = users.find((candidate) => String(candidate.id) === payload.sub)
    if (!user) throw unauthorized()
    if (!user.is_active) throw accountBlocked()
    if (payload.sv !== user.session_version) {
      throw user.role === 'listener' ? sessionReplaced() : unauthorized()
    }
    return user
  }

  const authenticate = (req) => {
    const token = (req.headers.authorization ?? '').replace(/^Bearer /, '')
    const payload = verifyToken(token, { type: 'access', nowMs: now() })
    if (!payload) throw unauthorized()
    return userFromPayload(payload)
  }

  const requireRole = (req, ...roles) => {
    const user = authenticate(req)
    if (!roles.includes(user.role)) throw forbidden()
    return user
  }

  // Jurnal faqat qo'shiladi: yozuv muzlatiladi, uni o'zgartiruvchi marshrut yo'q.
  // Admin o'chirilgandan keyin ham yozuv o'qilishi uchun `actor_label` nusxa sifatida saqlanadi.
  const audit = (req, action, actor, object, meta = {}) => {
    auditLog.push(
      Object.freeze({
        id: auditLog.length + 1,
        actor: actor.id,
        actor_label: actorLabel(actor),
        action,
        object_type: object.type,
        object_repr: object.repr,
        ip: req.socket.remoteAddress,
        at: new Date(now()).toISOString(),
        meta,
      }),
    )
  }

  const state = {
    now,
    users,
    bank,
    groups,
    auditLog,
    revokedRefresh,
    issueTokens,
    userFromPayload,
    authenticate,
    requireRole,
    audit,
    createUser,
  }
  state.engine = createEngine(state)
  return state
}
