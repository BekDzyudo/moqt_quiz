import { Readable } from 'node:stream'

export class ApiError extends Error {
  constructor(status, code, detail, extra = {}) {
    super(detail)
    this.status = status
    this.body = { code, detail, ...extra }
  }
}

export const unauthorized = () =>
  new ApiError(401, 'token_invalid', 'Seans tugagan. Davom etish uchun qayta kiring.')

export const sessionReplaced = () =>
  new ApiError(401, 'session_replaced', 'Siz boshqa qurilmadan kirdingiz. Bu yerda davom etish uchun qayta kiring.')

export const accountBlocked = () =>
  new ApiError(401, 'account_blocked', 'Hisobingiz bloklangan. Superadminga murojaat qiling.')

export const forbidden = () =>
  new ApiError(403, 'forbidden', "Bu amal uchun ruxsat yo'q. Kerak bo'lsa superadminga murojaat qiling.")

export const notFound = (detail = "Bu manzil mock API'da hali yo'q.") =>
  new ApiError(404, 'not_found', detail)

// `fields` — maydon nomi bo'yicha xatolar, forma ularni tegishli input ostida ko'rsatadi.
export const validationError = (fields) =>
  new ApiError(400, 'validation_error', "Ma'lumotlarni tekshirib, qayta urining.", { fields })

const MAX_UPLOAD_BYTES = 6 * 1024 * 1024

// Node'ning o'zidagi FormData tahlilchisi: alohida kutubxona shart emas.
export async function readMultipart(req) {
  const contentType = req.headers['content-type'] ?? ''
  if (!contentType.startsWith('multipart/form-data')) {
    throw validationError({ file: 'Fayl tanlang va qayta urining.' })
  }
  if (Number(req.headers['content-length']) > MAX_UPLOAD_BYTES) {
    throw validationError({ file: 'Fayl juda katta: 5 MB gacha fayl yuklang.' })
  }
  return new Response(Readable.toWeb(req), { headers: { 'content-type': contentType } }).formData()
}

export async function readJson(req) {
  let raw = ''
  for await (const chunk of req) raw += chunk
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    throw new ApiError(400, 'bad_request', "So'rov noto'g'ri. Sahifani yangilab, qayta urining.")
  }
}

// Marshrut 200 dan boshqa holatni shu obyekt bilan qaytaradi.
export class Reply {
  constructor(status, body) {
    this.status = status
    this.body = body
  }
}

// Marshrut shu obyektni qaytarsa, JSON o'rniga fayl yuboriladi.
export class FileResponse {
  constructor({ buffer, filename, contentType }) {
    this.buffer = buffer
    this.filename = filename
    this.contentType = contentType
  }
}
