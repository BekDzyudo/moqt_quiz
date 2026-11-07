import { ApiError, FileResponse, notFound, readJson, validationError } from '../http.js'
import { verifyPassword } from '../passwords.js'
import { SETTINGS } from '../testing/engine.js'

const CLIENT_EVENTS = ['fullscreen_exit', 'hidden', 'blur', 'return', 'reconnect']

const iso = (ms) => new Date(ms).toISOString()

const attemptExpired = () =>
  new ApiError(409, 'attempt_expired', "Test yakunlangan. Natijani ko'rish uchun sahifani yangilang.")

// DIQQAT: bu fayldagi har bir javob tinglovchiga boradi. is_correct, option_id, question_id,
// source va suspicious maydonlari bu yerda hech qachon paydo bo'lmasligi kerak.
export function attemptRoutes(state) {
  const { now, requireRole, bank, engine } = state

  const listener = (req) => requireRole(req, 'listener')

  const ownedAttempt = (req) => {
    const user = listener(req)
    const attempt = engine.attempts.find((candidate) => String(candidate.id) === req.params.id)
    // Boshqa tinglovchi urinishi "yo'q" deb ko'rinadi: ID'larni terib tekshirib bo'lmaydi.
    if (!attempt || attempt.user !== user.id) throw notFound('Urinish topilmadi.')
    return engine.touch(attempt)
  }

  const activeAttempt = (req) => {
    const attempt = ownedAttempt(req)
    if (attempt.status !== 'active') throw attemptExpired()
    return attempt
  }

  const slotAt = (attempt, n) => {
    const slot = attempt.questions.find((candidate) => String(candidate.n) === n)
    if (!slot) throw notFound('Bunday raqamli savol yo\'q.')
    return slot
  }

  const clock = (attempt) => ({
    server_now: iso(now()),
    deadline_at: iso(attempt.timing.deadline_at),
  })

  const keyOf = (slot) =>
    slot.option_map.find((entry) => entry.option_id === slot.selected_option)?.key ?? null

  const presentAttempt = (attempt) => ({
    id: attempt.id,
    status: attempt.status,
    n_total: attempt.questions.length,
    current_n: attempt.current_n,
    answered: attempt.questions.filter((slot) => slot.selected_option !== null).map((slot) => slot.n),
    flagged: attempt.questions.filter((slot) => slot.flagged).map((slot) => slot.n),
    fullscreen_exits: attempt.fullscreen_exits,
    exit_limit: SETTINGS.EXIT_VIOLATION_LIMIT,
    ...clock(attempt),
  })

  return {
    'GET /me/test/': async (req) => {
      const user = listener(req)
      const group = engine.groupById(user.group)
      if (!group) throw notFound("Siz guruhga biriktirilmagansiz. MOM test mas'uliga murojaat qiling.")

      const set = bank.sets.find((candidate) => candidate.id === group.question_set)
      const latest = engine.latestAttempt(user)
      if (latest) engine.touch(latest)

      return {
        group: { name: group.name },
        set: {
          name: set.name,
          question_count: set.question_count,
          duration_minutes: set.duration_minutes,
          pass_score: set.pass_score,
        },
        test_status: group.test_status,
        attempt: latest && { id: latest.id, status: latest.status },
        retake_allowed: Boolean(user.retake),
        server_now: iso(now()),
      }
    },

    'POST /me/test/start/': async (req) => {
      const user = listener(req)
      if (!engine.groupById(user.group)) {
        throw notFound("Siz guruhga biriktirilmagansiz. MOM test mas'uliga murojaat qiling.")
      }
      return presentAttempt(engine.start(user))
    },

    'GET /attempts/:id/': async (req) => presentAttempt(ownedAttempt(req)),

    'GET /attempts/:id/questions/:n/': async (req) => {
      const attempt = activeAttempt(req)
      const slot = slotAt(attempt, req.params.n)
      const question = engine.questionById(slot.question)
      attempt.current_n = slot.n

      const options = slot.option_map.map(({ key, option_id: optionId }) => ({
        key,
        text: question.options.find((option) => option.id === optionId).text,
      }))

      return {
        n: slot.n,
        text: question.text,
        image_url: slot.image_key ? `/api/v1/media/attempt/${slot.image_key}` : null,
        options,
        selected_key: keyOf(slot),
        flagged: slot.flagged,
        ...clock(attempt),
      }
    },

    'PUT /attempts/:id/answers/:n/': async (req) => {
      const attempt = activeAttempt(req)
      const slot = slotAt(attempt, req.params.n)
      const { key = null, time_spent_ms: timeSpent } = await readJson(req)

      const entry = slot.option_map.find((candidate) => candidate.key === key)
      if (key !== null && !entry) {
        throw validationError({ key: "Javob saqlanmadi. Sahifani yangilab, qayta tanlang." })
      }

      const selected = entry?.option_id ?? null
      // Aloqa uzilganda bir xil so'rov qayta keladi: vaqt ikki marta qo'shilmaydi.
      if (selected !== slot.selected_option) {
        slot.selected_option = selected
        slot.answered_at = selected === null ? null : now()
        if (Number.isFinite(timeSpent) && timeSpent > 0) slot.time_spent_ms += timeSpent
      }

      return { n: slot.n, selected_key: keyOf(slot), ...clock(attempt) }
    },

    'PUT /attempts/:id/flags/:n/': async (req) => {
      const attempt = activeAttempt(req)
      const slot = slotAt(attempt, req.params.n)
      const { flagged } = await readJson(req)
      slot.flagged = flagged === true
      return { n: slot.n, flagged: slot.flagged, ...clock(attempt) }
    },

    'POST /attempts/:id/events/': async (req) => {
      const attempt = ownedAttempt(req)
      const { type, meta = {} } = await readJson(req)
      if (!CLIENT_EVENTS.includes(type)) {
        throw validationError({ type: "Noma'lum hodisa turi." })
      }
      if (attempt.status === 'active') engine.recordEvent(attempt, type, meta)

      return {
        fullscreen_exits: attempt.fullscreen_exits,
        exit_limit: SETTINGS.EXIT_VIOLATION_LIMIT,
        ...clock(attempt),
      }
    },

    'POST /attempts/:id/exit-unlock/': async (req) => {
      const attempt = activeAttempt(req)
      const group = engine.groupById(attempt.group)
      const { password } = await readJson(req)

      if (now() < attempt.exit_locked_until) {
        const retryAfter = Math.ceil((attempt.exit_locked_until - now()) / 1000)
        throw new ApiError(
          423,
          'exit_locked',
          `Parol ko'p marta noto'g'ri kiritildi. ${retryAfter} soniyadan keyin qayta urining.`,
          { retry_after: retryAfter },
        )
      }

      if (!verifyPassword(password, group.exit_password_hash)) {
        attempt.exit_failures += 1
        engine.addEvent(attempt, 'exit_key_failed')

        if (attempt.exit_failures >= SETTINGS.EXIT_KEY_MAX_TRIES) {
          attempt.exit_failures = 0
          attempt.exit_locked_until = now() + SETTINGS.EXIT_LOCK_MS
          throw new ApiError(423, 'exit_locked', "Parol ko'p marta noto'g'ri kiritildi. 5 daqiqadan keyin qayta urining.", {
            retry_after: SETTINGS.EXIT_LOCK_MS / 1000,
          })
        }
        throw new ApiError(400, 'exit_wrong_password', "Parol to'g'ri kelmadi. Mas'ul shaxsdan so'rang.")
      }

      attempt.exit_failures = 0
      attempt.exit_key_window_until = now() + SETTINGS.EXIT_KEY_WINDOW_MS
      engine.addEvent(attempt, 'exit_key_used')
      return { unlocked: true, ...clock(attempt) }
    },

    'POST /attempts/:id/finish/': async (req) => {
      const attempt = ownedAttempt(req)
      if (attempt.status === 'active') engine.finalize(attempt, 'finished', 'submitted')
      return { id: attempt.id, status: attempt.status }
    },

    'GET /attempts/:id/result/': async (req) => {
      const attempt = ownedAttempt(req)
      if (attempt.status === 'active') {
        throw new ApiError(409, 'attempt_active', 'Test hali yakunlanmagan.')
      }

      const total = attempt.questions.length
      return {
        correct_count: attempt.correct_count,
        n_total: total,
        percent: Math.round((attempt.correct_count / total) * 100),
        passed: attempt.passed,
        duration_seconds: Math.round((attempt.finished_at - attempt.timing.started_at) / 1000),
      }
    },

    // Havola tasodifiy va urinishga xos: URL'da Question.id yo'q, test tugagach yopiladi.
    'GET /media/attempt/:key': async (req) => {
      for (const attempt of engine.activeAttempts()) {
        const slot = attempt.questions.find((candidate) => candidate.image_key === req.params.key)
        const image = slot && engine.questionById(slot.question).image
        if (image) {
          return new FileResponse({
            buffer: image.buffer,
            filename: 'rasm',
            contentType: image.contentType,
          })
        }
      }
      throw notFound('Rasm topilmadi.')
    },
  }
}
