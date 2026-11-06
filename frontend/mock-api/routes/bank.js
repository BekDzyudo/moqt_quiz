import { buildOptions } from '../bank-seed.js'
import { ApiError, FileResponse, notFound, readJson, readMultipart, Reply, validationError } from '../http.js'
import { dummySource } from '../sources/dummy.js'

const PAGE_SIZE = 20
const MAX_IMAGE_BYTES = 2 * 1024 * 1024
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']

const text = (value) => (typeof value === 'string' ? value.trim() : '')
const shorten = (value) => (value.length > 60 ? `${value.slice(0, 57)}...` : value)
const positiveInt = (value) => Number.isInteger(value) && value > 0

function optionsError(options) {
  if (!Array.isArray(options) || options.length !== 4) return 'Savolda 4 ta variant bo\'lishi kerak.'
  if (options.some((option) => !text(option?.text))) return "Barcha variantlarni to'ldiring."
  if (options.filter((option) => option.is_correct === true).length !== 1) {
    return "To'g'ri javobni belgilang: aniq bitta variant."
  }
  return undefined
}

export function bankRoutes(state) {
  const { audit, requireRole, bank } = state
  const staff = (req) => requireRole(req, 'admin', 'superadmin')

  const findSet = (id) => {
    const set = bank.sets.find((candidate) => String(candidate.id) === String(id))
    if (!set) throw notFound("To'plam topilmadi. Ro'yxatni yangilab, qayta urining.")
    return set
  }

  const findQuestion = (id) => {
    const question = bank.questions.find((candidate) => String(candidate.id) === String(id))
    if (!question) throw notFound("Savol topilmadi. Ro'yxatni yangilab, qayta urining.")
    return question
  }

  const setName = (id) => bank.sets.find((set) => set.id === id)?.name ?? ''

  const presentSet = (set) => ({
    id: set.id,
    name: set.name,
    question_count: set.question_count,
    duration_minutes: set.duration_minutes,
    pass_score: set.pass_score,
    active_count: bank.questions.filter((q) => q.question_set === set.id && q.is_active).length,
    total_count: bank.questions.filter((q) => q.question_set === set.id).length,
    // 3-bosqichda guruhlar qo'shilganda to'ladi.
    groups: [],
  })

  const imageUrl = (question) =>
    question.image ? `/api/v1/media/questions/${question.id}?v=${question.image.version}` : null

  const presentRow = (question) => ({
    id: question.id,
    text: question.text,
    question_set: question.question_set,
    set_name: setName(question.question_set),
    source: question.source,
    is_active: question.is_active,
  })

  const presentDetail = (question) => ({
    ...presentRow(question),
    in_use: question.in_use,
    image_url: imageUrl(question),
    options: question.options.map(({ id, text: optionText, is_correct }) => ({
      id,
      text: optionText,
      is_correct,
    })),
  })

  const setFieldErrors = (body, currentSet = null) => {
    const name = text(body.name)
    const taken = bank.sets.some(
      (set) => set !== currentSet && set.name.toLowerCase() === name.toLowerCase(),
    )

    return {
      name: !name ? "To'plam nomini kiriting." : taken ? 'Bu nom band. Boshqa nom kiriting.' : undefined,
      question_count: positiveInt(body.question_count) ? undefined : 'Musbat butun son kiriting.',
      duration_minutes: positiveInt(body.duration_minutes) ? undefined : 'Musbat butun son kiriting.',
      pass_score:
        !positiveInt(body.pass_score)
          ? 'Musbat butun son kiriting.'
          : positiveInt(body.question_count) && body.pass_score > body.question_count
            ? "Chegara savollar sonidan oshmasin."
            : undefined,
    }
  }

  const questionErrors = (body) => ({
    question_set: bank.sets.some((set) => set.id === body.question_set)
      ? undefined
      : "Savol to'plamini tanlang.",
    text: text(body.text) ? undefined : 'Savol matnini kiriting.',
    options: optionsError(body.options),
  })

  const throwIfInvalid = (fields) => {
    if (Object.values(fields).some(Boolean)) throw validationError(fields)
  }

  return {
    'GET /question-sets/': async (req) => {
      staff(req)
      return bank.sets.map(presentSet)
    },

    'POST /question-sets/': async (req) => {
      const actor = staff(req)
      const body = await readJson(req)
      throwIfInvalid(setFieldErrors(body))

      const set = {
        id: bank.nextSetId(),
        name: text(body.name),
        question_count: body.question_count,
        duration_minutes: body.duration_minutes,
        pass_score: body.pass_score,
        created_by: actor.id,
      }
      bank.sets.push(set)
      audit(req, 'question_set_created', actor, { type: 'question_set', repr: set.name })
      return new Reply(201, presentSet(set))
    },

    'GET /question-sets/:id/': async (req) => {
      staff(req)
      return presentSet(findSet(req.params.id))
    },

    'PATCH /question-sets/:id/': async (req) => {
      const actor = staff(req)
      const set = findSet(req.params.id)
      const merged = { ...set, ...(await readJson(req)) }
      throwIfInvalid(setFieldErrors(merged, set))

      Object.assign(set, {
        name: text(merged.name),
        question_count: merged.question_count,
        duration_minutes: merged.duration_minutes,
        pass_score: merged.pass_score,
      })
      audit(req, 'question_set_updated', actor, { type: 'question_set', repr: set.name })
      return presentSet(set)
    },

    'DELETE /question-sets/:id/': async (req) => {
      const actor = staff(req)
      const set = findSet(req.params.id)
      if (bank.questions.some((question) => question.question_set === set.id)) {
        throw new ApiError(
          409,
          'set_not_empty',
          "To'plamda savollar bor. Avval savollarni o'chiring yoki boshqa to'plamga o'tkazing.",
        )
      }
      bank.sets.splice(bank.sets.indexOf(set), 1)
      audit(req, 'question_set_deleted', actor, { type: 'question_set', repr: set.name })
      return new Reply(204)
    },

    'POST /question-sets/:id/sync-api/': async (req) => {
      const actor = staff(req)
      const set = findSet(req.params.id)
      let created = 0
      let updated = 0

      for (const dto of dummySource.fetch(set)) {
        const existing = bank.questions.find((q) => q.external_id === dto.external_id)
        const options = buildOptions(
          dto.options.map((option) => option.text),
          dto.options.findIndex((option) => option.is_correct),
          bank.nextOptionId,
        )

        if (existing) {
          existing.text = dto.text
          existing.options = options
          updated += 1
        } else {
          bank.questions.push({
            id: bank.nextQuestionId(),
            question_set: set.id,
            text: dto.text,
            image: null,
            source: 'api',
            external_id: dto.external_id,
            is_active: true,
            in_use: false,
            options,
          })
          created += 1
        }
      }

      audit(req, 'questions_synced', actor, { type: 'question_set', repr: set.name }, { created, updated })
      return { created, updated }
    },

    'GET /questions/': async (req) => {
      staff(req)
      const { query } = req
      const setId = query.get('set')
      const source = query.get('source')
      const isActive = query.get('is_active')
      const search = text(query.get('q')).toLowerCase()

      const rows = bank.questions
        .filter(
          (question) =>
            (!setId || String(question.question_set) === setId) &&
            (!source || question.source === source) &&
            (!isActive || String(question.is_active) === isActive) &&
            (!search || question.text.toLowerCase().includes(search)),
        )
        .toReversed()

      const page = Math.max(Number(query.get('page')) || 1, 1)
      const start = (page - 1) * PAGE_SIZE

      return {
        count: rows.length,
        page_size: PAGE_SIZE,
        results: rows.slice(start, start + PAGE_SIZE).map(presentRow),
        totals: {
          all: bank.questions.length,
          local: bank.questions.filter((question) => question.source === 'local').length,
          api: bank.questions.filter((question) => question.source === 'api').length,
        },
      }
    },

    'POST /questions/': async (req) => {
      const actor = staff(req)
      const body = await readJson(req)
      throwIfInvalid(questionErrors(body))

      const question = {
        id: bank.nextQuestionId(),
        question_set: body.question_set,
        text: text(body.text),
        image: null,
        source: 'local',
        external_id: null,
        is_active: body.is_active !== false,
        in_use: false,
        options: buildOptions(
          body.options.map((option) => text(option.text)),
          body.options.findIndex((option) => option.is_correct),
          bank.nextOptionId,
        ),
      }
      bank.questions.push(question)
      audit(req, 'question_created', actor, { type: 'question', repr: shorten(question.text) })
      return new Reply(201, presentDetail(question))
    },

    'GET /questions/:id/': async (req) => {
      staff(req)
      return presentDetail(findQuestion(req.params.id))
    },

    'PATCH /questions/:id/': async (req) => {
      const actor = staff(req)
      const question = findQuestion(req.params.id)
      const body = await readJson(req)
      const merged = {
        question_set: body.question_set ?? question.question_set,
        text: body.text ?? question.text,
        options: body.options ?? question.options,
      }
      throwIfInvalid(questionErrors(merged))

      question.question_set = merged.question_set
      question.text = text(merged.text)
      if (typeof body.is_active === 'boolean') question.is_active = body.is_active
      if (body.options) {
        question.options = buildOptions(
          merged.options.map((option) => text(option.text)),
          merged.options.findIndex((option) => option.is_correct),
          bank.nextOptionId,
        )
      }
      audit(req, 'question_updated', actor, { type: 'question', repr: shorten(question.text) })
      return presentDetail(question)
    },

    'DELETE /questions/:id/': async (req) => {
      const actor = staff(req)
      const question = findQuestion(req.params.id)
      if (question.in_use) {
        throw new ApiError(
          409,
          'question_in_use',
          "Bu savol testda ishlatilgan, uni o'chirib bo'lmaydi. Testlarga tushmasligi uchun nofaol qiling.",
        )
      }
      bank.questions.splice(bank.questions.indexOf(question), 1)
      audit(req, 'question_deleted', actor, { type: 'question', repr: shorten(question.text) })
      return new Reply(204)
    },

    'POST /questions/:id/image/': async (req) => {
      staff(req)
      const question = findQuestion(req.params.id)
      const form = await readMultipart(req)
      const file = form.get('image')

      if (!(file instanceof File) || !IMAGE_TYPES.includes(file.type)) {
        throw validationError({ image: 'PNG, JPG yoki WEBP rasm tanlang.' })
      }
      if (file.size > MAX_IMAGE_BYTES) {
        throw validationError({ image: 'Rasm juda katta: 2 MB gacha rasm yuklang.' })
      }

      question.image = {
        buffer: Buffer.from(await file.arrayBuffer()),
        contentType: file.type,
        version: (question.image?.version ?? 0) + 1,
      }
      return { image_url: imageUrl(question) }
    },

    'DELETE /questions/:id/image/': async (req) => {
      staff(req)
      findQuestion(req.params.id).image = null
      return new Reply(204)
    },

    // <img> sarlavha yubora olmaydi, shuning uchun rasm tokensiz beriladi.
    'GET /media/questions/:id': async (req) => {
      const { image } = findQuestion(req.params.id)
      if (!image) throw notFound('Rasm topilmadi.')
      return new FileResponse({
        buffer: image.buffer,
        filename: 'savol-rasmi',
        contentType: image.contentType,
      })
    },
  }
}
