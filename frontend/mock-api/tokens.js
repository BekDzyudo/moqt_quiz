import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'

const SECRET = 'mock-only-secret'

const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
const sign = (body) => createHmac('sha256', SECRET).update(body).digest('base64url')

// simplejwt bilan bir xil shakl: frontend tokenni faqat tashiydi, ichini o'qimaydi.
export function createToken({ user, type, ttlSeconds, nowMs }) {
  const iat = Math.floor(nowMs / 1000)
  const header = encode({ alg: 'HS256', typ: 'JWT' })
  const payload = encode({
    token_type: type,
    jti: randomUUID(),
    sub: String(user.id),
    role: user.role,
    sv: user.session_version,
    iat,
    exp: iat + ttlSeconds,
  })
  const body = `${header}.${payload}`
  return `${body}.${sign(body)}`
}

// Yaroqsiz yoki muddati o'tgan token uchun null qaytaradi.
export function verifyToken(token, { type, nowMs }) {
  const parts = String(token ?? '').split('.')
  if (parts.length !== 3) return null

  const expected = Buffer.from(sign(`${parts[0]}.${parts[1]}`))
  const actual = Buffer.from(parts[2])
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null

  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
  if (payload.token_type !== type) return null
  if (payload.exp * 1000 <= nowMs) return null
  return payload
}
