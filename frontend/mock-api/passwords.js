import { randomBytes, randomInt, scryptSync, timingSafeEqual } from 'node:crypto'

// Tinglovchi parolni varaqdan qo'lda teradi: o'xshash belgilar (0/O, 1/l/I) yo'q.
const LISTENER_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
const LISTENER_PASSWORD_LENGTH = 6

// Mock uchun past narx: testlar har safar yangi holat yaratadi.
const SCRYPT_OPTIONS = { N: 1024 }
const KEY_LENGTH = 32

export function hashPassword(password) {
  const salt = randomBytes(16)
  const key = scryptSync(password, salt, KEY_LENGTH, SCRYPT_OPTIONS)
  return `${salt.toString('hex')}:${key.toString('hex')}`
}

export function verifyPassword(password, hash) {
  if (typeof password !== 'string' || !hash) return false
  const [salt, key] = hash.split(':').map((part) => Buffer.from(part, 'hex'))
  return timingSafeEqual(key, scryptSync(password, salt, KEY_LENGTH, SCRYPT_OPTIONS))
}

export function generateListenerPassword() {
  return Array.from(
    { length: LISTENER_PASSWORD_LENGTH },
    () => LISTENER_ALPHABET[randomInt(LISTENER_ALPHABET.length)],
  ).join('')
}
