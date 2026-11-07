import { randomBytes, randomInt } from 'node:crypto'
import { ApiError } from '../http.js'

// CLAUDE.md dagi .env sozlamalari.
export const SETTINGS = {
  EXIT_VIOLATION_LIMIT: 3,
  FAST_ANSWER_MS: 5000,
  ANSWER_GRACE_SECONDS: 5,
  EXIT_KEY_MAX_TRIES: 5,
  EXIT_LOCK_MS: 5 * 60 * 1000,
  SAME_WRONG_ANSWERS: 10,
  // Bitta Alt+Tab blur, hidden va fullscreen_exit hodisalarini birga beradi.
  EXIT_EVENT_WINDOW_MS: 2000,
  // Parol bilan ruxsat etilgan chiqishning hodisasi shu vaqt ichida keladi.
  EXIT_KEY_WINDOW_MS: 10 * 1000,
}

const SYSTEM_ACTOR = { id: 0, full_name: 'Tizim', role: 'system' }
const SYSTEM_REQUEST = { socket: { remoteAddress: 'tizim' } }

function shuffle(items) {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

const randomKey = () => randomBytes(6).toString('base64url')

// Tinglovchi faqat `key` ni ko'radi: haqiqiy Option.id va Question.id urinish ichida qoladi.
export function buildVariant(pool, count, previouslySeen = new Set()) {
  const fresh = pool.filter((question) => !previouslySeen.has(question.id))
  const seen = pool.filter((question) => previouslySeen.has(question.id))
  const chosen = [...shuffle(fresh), ...shuffle(seen)].slice(0, count)

  return shuffle(chosen).map((question, index) => ({
    n: index + 1,
    question: question.id,
    option_map: shuffle(question.options).map((option) => ({
      key: randomKey(),
      option_id: option.id,
    })),
    image_key: question.image ? randomBytes(16).toString('hex') : null,
    selected_option: null,
    flagged: false,
    answered_at: null,
    time_spent_ms: 0,
  }))
}

export function createEngine(state) {
  const { now, bank, groups, users } = state
  const attempts = []
  let nextAttemptId = 1

  const questionById = (id) => bank.questions.find((question) => question.id === id)
  const groupById = (id) => groups.find((group) => group.id === id)
  const userById = (id) => users.find((user) => user.id === id)

  const attemptsOf = (user) => attempts.filter((attempt) => attempt.user === user.id)
  const latestAttempt = (user) => attemptsOf(user).at(-1) ?? null
  const activeAttempts = () => attempts.filter((attempt) => attempt.status === 'active')

  const addEvent = (attempt, type, meta = {}) => {
    attempt.events.push({ type, at: now(), meta })
  }

  const addReason = (attempt, code, detail) => {
    attempt.suspicious = true
    if (!attempt.suspicious_reasons.some((reason) => reason.code === code)) {
      attempt.suspicious_reasons.push({ code, detail })
    }
  }

  const correctOption = (slot) =>
    questionById(slot.question).options.find((option) => option.is_correct)

  const isCorrect = (slot) =>
    slot.selected_option !== null && slot.selected_option === correctOption(slot).id

  const markExitViolation = (attempt) => {
    if (attempt.fullscreen_exits > SETTINGS.EXIT_VIOLATION_LIMIT) {
      addReason(
        attempt,
        'too_many_exits',
        `Test oynasidan ${attempt.fullscreen_exits} marta chiqqan.`,
      )
    }
  }

  const markFastAnswers = (attempt) => {
    const answered = attempt.questions.filter((slot) => slot.selected_option !== null)
    const fast = answered.filter((slot) => slot.time_spent_ms < SETTINGS.FAST_ANSWER_MS)

    if (attempt.passed && answered.length > 0 && fast.length / answered.length >= 0.5) {
      addReason(attempt, 'fast_answers', `${answered.length} ta javobdan ${fast.length} tasi juda tez berilgan.`)
    }
  }

  const wrongSelections = (attempt) =>
    new Set(
      attempt.questions
        .filter((slot) => slot.selected_option !== null && !isCorrect(slot))
        .map((slot) => slot.selected_option),
    )

  // Bir xil noto'g'ri javoblar tasodifan kam uchraydi: ko'chirish belgisi, ikkala urinish belgilanadi.
  const markSameWrongAnswers = (attempt) => {
    const mine = wrongSelections(attempt)

    for (const other of attempts) {
      if (other === attempt || other.group !== attempt.group || other.status === 'active') continue
      const shared = [...wrongSelections(other)].filter((option) => mine.has(option)).length

      if (shared >= SETTINGS.SAME_WRONG_ANSWERS) {
        const detail = (user) => `${user.full_name} bilan ${shared} ta bir xil noto'g'ri javob.`
        addReason(attempt, `same_wrong_${other.id}`, detail(userById(other.user)))
        addReason(other, `same_wrong_${attempt.id}`, detail(userById(attempt.user)))
      }
    }
  }

  const finalize = (attempt, status, reason, finishedAt = now()) => {
    attempt.status = status
    attempt.finish_reason = reason
    attempt.finished_at = finishedAt
    attempt.correct_count = attempt.questions.filter(isCorrect).length
    attempt.passed = attempt.correct_count >= attempt.pass_score

    markExitViolation(attempt)
    markFastAnswers(attempt)
    markSameWrongAnswers(attempt)
  }

  const isPastGrace = (attempt) =>
    now() > attempt.timing.deadline_at + SETTINGS.ANSWER_GRACE_SECONDS * 1000

  // "Dangasa" tekshiruv: har bir so'rov urinishni shu orqali o'tkazadi.
  const touch = (attempt) => {
    if (attempt.status === 'active' && isPastGrace(attempt)) {
      finalize(attempt, 'expired', 'timeout', attempt.timing.deadline_at)
    }
    return attempt
  }

  const activePool = (set) =>
    bank.questions.filter((question) => question.question_set === set.id && question.is_active)

  const requireEnoughQuestions = (set) => {
    if (activePool(set).length < set.question_count) {
      throw new ApiError(
        409,
        'not_enough_questions',
        `Bankda faol savollar yetarli emas: ${set.question_count} ta kerak. Savollar qo'shing yoki to'plamni o'zgartiring.`,
      )
    }
  }

  // Tekshiruv va yozuv orasida `await` yo'q: parallel so'rovlar bir-birini ko'radi
  // (Django'da buni select_for_update bajaradi).
  const start = (user) => {
    const group = groupById(user.group)
    const previous = attemptsOf(user).map(touch)

    if (group.test_status !== 'open') {
      throw new ApiError(409, 'test_closed', 'Test hali ochilmagan. Admin ochgach boshlash mumkin.')
    }
    if (previous.some((attempt) => attempt.status === 'active')) {
      throw new ApiError(409, 'already_started', 'Test allaqachon boshlangan. Sahifani yangilang.')
    }
    if (previous.length > 0 && !user.retake) {
      throw new ApiError(
        409,
        'already_started',
        "Testni faqat bir marta topshirish mumkin. Qayta topshirish uchun admin ruxsati kerak.",
      )
    }

    const set = bank.sets.find((candidate) => candidate.id === group.question_set)
    requireEnoughQuestions(set)

    const seen = new Set(previous.flatMap((attempt) => attempt.questions.map((slot) => slot.question)))
    const questions = buildVariant(activePool(set), set.question_count, seen)
    for (const slot of questions) questionById(slot.question).in_use = true

    const startedAt = now()
    const attempt = {
      id: nextAttemptId,
      user: user.id,
      group: group.id,
      // Muzlatilgan: boshlanish va muddat bir marta yoziladi, keyin o'zgarmaydi.
      timing: Object.freeze({
        started_at: startedAt,
        deadline_at: startedAt + set.duration_minutes * 60 * 1000,
      }),
      pass_score: set.pass_score,
      finished_at: null,
      status: 'active',
      finish_reason: null,
      correct_count: null,
      passed: null,
      current_n: 1,
      fullscreen_exits: 0,
      suspicious: false,
      suspicious_reasons: [],
      is_retake: previous.length > 0,
      retake_reason: user.retake?.reason ?? null,
      questions,
      events: [],
      last_exit_at: null,
      exit_key_window_until: 0,
      exit_failures: 0,
      exit_locked_until: 0,
    }
    nextAttemptId += 1
    user.retake = null
    attempts.push(attempt)
    return attempt
  }

  const VIOLATION_EVENTS = ['fullscreen_exit', 'hidden', 'blur']

  const recordEvent = (attempt, type, meta) => {
    addEvent(attempt, type, meta)
    if (!VIOLATION_EVENTS.includes(type)) return

    const exitAllowed = now() <= attempt.exit_key_window_until
    const sameExit = attempt.last_exit_at !== null && now() - attempt.last_exit_at <= SETTINGS.EXIT_EVENT_WINDOW_MS
    attempt.last_exit_at = now()

    if (exitAllowed || sameExit) return
    attempt.fullscreen_exits += 1
    markExitViolation(attempt)
  }

  const openGroup = (group, actor, req = SYSTEM_REQUEST) => {
    requireEnoughQuestions(bank.sets.find((set) => set.id === group.question_set))
    group.test_status = 'open'
    group.opened_at = new Date(now()).toISOString()
    group.closed_at = null
    group.scheduled_open_at = null
    state.audit(req, 'test_opened', actor, { type: 'group', repr: group.name })
  }

  const closeGroup = (group, mode, actor, req = SYSTEM_REQUEST) => {
    group.test_status = 'finished'
    group.closed_at = new Date(now()).toISOString()
    group.scheduled_close_at = null

    let terminated = 0
    if (mode === 'finish_now') {
      for (const attempt of activeAttempts().filter((candidate) => candidate.group === group.id)) {
        finalize(attempt, 'terminated', 'admin_closed')
        terminated += 1
      }
    }
    state.audit(req, 'test_closed', actor, { type: 'group', repr: group.name }, { mode, terminated })
    return terminated
  }

  // Celery beat o'rnida: vite-plugin har 30 soniyada chaqiradi, testlar qo'lda chaqiradi.
  const tick = () => {
    activeAttempts().forEach(touch)

    for (const group of groups) {
      const openAt = Date.parse(group.scheduled_open_at)
      const closeAt = Date.parse(group.scheduled_close_at)

      if (group.test_status !== 'open' && openAt <= now()) {
        try {
          openGroup(group, SYSTEM_ACTOR)
        } catch (error) {
          if (!(error instanceof ApiError)) throw error
          group.scheduled_open_at = null
          state.audit(SYSTEM_REQUEST, 'test_open_failed', SYSTEM_ACTOR, { type: 'group', repr: group.name }, {
            reason: error.body.code,
          })
        }
      }
      if (group.test_status === 'open' && closeAt <= now()) {
        closeGroup(group, 'let_finish', SYSTEM_ACTOR)
      }
    }
  }

  return {
    attempts,
    start,
    touch,
    finalize,
    tick,
    latestAttempt,
    attemptsOf,
    activeAttempts,
    addEvent,
    recordEvent,
    openGroup,
    closeGroup,
    questionById,
    groupById,
  }
}
