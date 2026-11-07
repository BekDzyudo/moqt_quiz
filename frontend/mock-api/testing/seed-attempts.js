const MINUTE = 60 * 1000
const DAY = 24 * MINUTE * 60

// Faqat dev server uchun: natijalar va bosh panel bo'sh ko'rinmasin.
// `2026-11-AKT-01` tegilmaydi: tinglovchi sinovi shu guruhda boshlanadi.
const FINISHED_GROUPS = [5, 6]
const LIVE_GROUP = 2
const LIVE_FINISHED = 6
const LIVE_WORKING = 14

// Tartib raqamiga qarab barqaror natija: guruhda past va yuqori ballar aralash chiqadi.
const shareCorrect = (index) => 0.28 + ((index * 37) % 61) / 100

function answerSlots(attempt, engine, { share, timeMs, count = attempt.questions.length }) {
  attempt.questions.slice(0, count).forEach((slot, index) => {
    const { options } = engine.questionById(slot.question)
    const correct = options.find((option) => option.is_correct)
    const wrong = options.find((option) => !option.is_correct)

    slot.selected_option = (index / count) % 1 < share ? correct.id : wrong.id
    slot.time_spent_ms = timeMs
    slot.answered_at = attempt.timing.started_at + index * timeMs
  })
}

function runAttempt(engine, user, { startedAt, group }) {
  const status = group.test_status
  group.test_status = 'open'
  const attempt = engine.start(user, { startedAt })
  group.test_status = status
  return attempt
}

export function seedAttempts(state) {
  const { engine, groups, users, now } = state
  const membersOf = (group) => users.filter((user) => user.group === group.id)

  for (const id of FINISHED_GROUPS) {
    const group = groups.find((candidate) => candidate.id === id)

    membersOf(group).forEach((user, index) => {
      // Oxirgi tinglovchi testga kelmagan.
      if (index === membersOf(group).length - 1) return

      const startedAt = now() - DAY * (id - 3)
      const attempt = runAttempt(engine, user, { startedAt, group })
      const suspiciousFast = index === 4
      const manyExits = index === 7

      answerSlots(attempt, engine, {
        share: suspiciousFast ? 0.9 : shareCorrect(index),
        timeMs: suspiciousFast ? 2000 : 40 * 1000 + index * 3000,
      })
      if (manyExits) attempt.fullscreen_exits = 7
      engine.finalize(attempt, 'finished', 'submitted', startedAt + (35 + index) * MINUTE)
    })
  }

  const live = groups.find((candidate) => candidate.id === LIVE_GROUP)
  membersOf(live)
    .slice(0, LIVE_FINISHED + LIVE_WORKING)
    .forEach((user, index) => {
      const startedAt = now() - (20 + index) * MINUTE
      const attempt = runAttempt(engine, user, { startedAt, group: live })

      if (index < LIVE_FINISHED) {
        answerSlots(attempt, engine, { share: shareCorrect(index + 3), timeMs: 50 * 1000 })
        engine.finalize(attempt, 'finished', 'submitted', now() - index * MINUTE)
      } else {
        answerSlots(attempt, engine, { share: 0.6, timeMs: 45 * 1000, count: 10 + index })
        attempt.current_n = 10 + index
        if (index === 10) attempt.fullscreen_exits = 2
      }
    })
}
