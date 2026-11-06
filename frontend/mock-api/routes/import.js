import { randomUUID } from 'node:crypto'
import { buildOptions } from '../bank-seed.js'
import { FileResponse, notFound, readJson, readMultipart, validationError } from '../http.js'
import { parseExcel, parseWord } from '../import/parsers.js'
import { buildExcelTemplate, buildWordTemplate } from '../import/templates.js'

const MAX_FILE_BYTES = 5 * 1024 * 1024
const SAMPLE_SIZE = 5
const LETTERS = ['A', 'B', 'C', 'D']

const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const DOCX_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

// "Savol?" va "savol ?" bir xil savol hisoblanadi.
const normalize = (text) =>
  text
    .toLowerCase()
    .replace(/[ʻʼ‘’`]/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/[\s.?!:;]+$/, '')
    .trim()

function rowErrors({ text, options, correct }) {
  const errors = []
  if (!text) errors.push("Savol matni bo'sh.")
  options.forEach((option, index) => {
    if (!option) errors.push(`${LETTERS[index]} variant bo'sh.`)
  })
  if (!LETTERS.includes(correct)) {
    errors.push(
      correct.includes(',')
        ? "Bir nechta to'g'ri javob belgilangan: bittasini qoldiring."
        : "To'g'ri javob A, B, C yoki D bo'lishi kerak.",
    )
  }
  return errors
}

export function importRoutes(state) {
  const { audit, requireRole, bank } = state
  const previews = new Map()

  const findSet = (id) => bank.sets.find((set) => String(set.id) === String(id))

  const parseFile = async (file) => {
    const buffer = Buffer.from(await file.arrayBuffer())
    const parse = file.name.toLowerCase().endsWith('.docx')
      ? parseWord
      : file.name.toLowerCase().endsWith('.xlsx')
        ? parseExcel
        : null
    if (!parse) throw validationError({ file: 'Faqat .xlsx yoki .docx fayl yuklang.' })

    try {
      return await parse(buffer)
    } catch {
      throw validationError({
        file: "Faylni o'qib bo'lmadi. Shablonni yuklab olib, savollarni shunga ko'chiring.",
      })
    }
  }

  return {
    'POST /questions/import/preview/': async (req) => {
      requireRole(req, 'admin', 'superadmin')
      const form = await readMultipart(req)
      const file = form.get('file')
      const set = findSet(form.get('question_set'))

      if (!set) throw validationError({ question_set: "Savol to'plamini tanlang." })
      if (!(file instanceof File)) throw validationError({ file: 'Fayl tanlang.' })
      if (file.size > MAX_FILE_BYTES) {
        throw validationError({ file: 'Fayl juda katta: 5 MB gacha fayl yuklang.' })
      }

      const seen = new Set(
        bank.questions.filter((q) => q.question_set === set.id).map((q) => normalize(q.text)),
      )
      const valid = []
      const problems = []

      for (const row of await parseFile(file)) {
        const errors = rowErrors(row)
        const key = normalize(row.text)

        if (errors.length > 0) {
          problems.push({ row: row.row, text: row.text, status: 'invalid', errors })
        } else if (seen.has(key)) {
          problems.push({
            row: row.row,
            text: row.text,
            status: 'duplicate',
            errors: ["Bu savol to'plamda yoki faylda allaqachon bor."],
          })
        } else {
          seen.add(key)
          valid.push(row)
        }
      }

      const token = randomUUID()
      previews.set(token, { setId: set.id, fileName: file.name, valid })

      return {
        token,
        file_name: file.name,
        set_name: set.name,
        total: valid.length + problems.length,
        valid_count: valid.length,
        problems,
        sample: valid.slice(0, SAMPLE_SIZE),
      }
    },

    // Token bir martalik: ikki marta bosilsa savollar ikki marta yozilmaydi.
    'POST /questions/import/commit/': async (req) => {
      const actor = requireRole(req, 'admin', 'superadmin')
      const { token } = await readJson(req)
      const preview = previews.get(token)
      if (!preview) throw notFound("Tekshiruv natijasi eskirgan. Faylni qayta tanlang.")
      previews.delete(token)

      for (const row of preview.valid) {
        bank.questions.push({
          id: bank.nextQuestionId(),
          question_set: preview.setId,
          text: row.text,
          image: null,
          source: 'local',
          external_id: null,
          is_active: true,
          in_use: false,
          options: buildOptions(row.options, LETTERS.indexOf(row.correct), bank.nextOptionId),
        })
      }

      const set = findSet(preview.setId)
      audit(req, 'questions_imported', actor, { type: 'question_set', repr: set.name }, {
        file: preview.fileName,
        created: preview.valid.length,
      })
      return { created: preview.valid.length }
    },

    'GET /questions/import/template.xlsx': async (req) => {
      requireRole(req, 'admin', 'superadmin')
      return new FileResponse({
        buffer: await buildExcelTemplate(),
        filename: 'savollar-shabloni.xlsx',
        contentType: XLSX_TYPE,
      })
    },

    'GET /questions/import/template.docx': async (req) => {
      requireRole(req, 'admin', 'superadmin')
      return new FileResponse({
        buffer: await buildWordTemplate(),
        filename: 'savollar-shabloni.docx',
        contentType: DOCX_TYPE,
      })
    },
  }
}
