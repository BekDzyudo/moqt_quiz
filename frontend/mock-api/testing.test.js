import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { createBank } from './bank-seed.js'
import { buildVariant, SETTINGS } from './testing/engine.js'
import { call, context, login, resetApi, startTestServer, tokenFor } from './test-helpers.js'

startTestServer()
beforeEach(resetApi)

const FORBIDDEN_KEYS = [
  'is_correct',
  'option_id',
  'question_id',
  'question',
  'source',
  'external_id',
  'suspicious',
  'suspicious_reasons',
  'option_map',
  'correct_option',
]

const MINUTE = 60 * 1000
const adminToken = () => tokenFor('admin', 'Admin12345')

// Javob ichidagi barcha kalitlarni rekursiv yig'adi.
function collectKeys(value, found = []) {
  if (Array.isArray(value)) value.forEach((item) => collectKeys(item, found))
  else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      found.push(key)
      collectKeys(item, found)
    }
  }
  return found
}

async function listeners(admin, count, groupId = 1) {
  const { data } = await call('POST', `/groups/${groupId}/credentials/`, { token: admin, body: {} })
  const tokens = []
  for (const card of data.credentials.slice(0, count)) {
    tokens.push((await login(card.login, card.password)).data.access)
  }
  return tokens
}

const start = (token) => call('POST', '/me/test/start/', { token, body: {} })
const question = (token, id, n) => call('GET', `/attempts/${id}/questions/${n}/`, { token })
const answer = (token, id, n, key, ms = 20000) =>
  call('PUT', `/attempts/${id}/answers/${n}/`, { token, body: { key, time_spent_ms: ms } })
const finish = (token, id) => call('POST', `/attempts/${id}/finish/`, { token, body: {} })
const result = (token, id) => call('GET', `/attempts/${id}/result/`, { token })

// Javoblari ma'lum kichik to'plam: 12 savol, to'g'ri javob matni "TOGRI".
async function smallGroup(admin, { members = 2, count = 12, pass = 6 } = {}) {
  const { data: set } = await call('POST', '/question-sets/', {
    token: admin,
    body: { name: `Kichik ${count}`, question_count: count, duration_minutes: 20, pass_score: pass },
  })
  for (let i = 1; i <= count; i += 1) {
    await call('POST', '/questions/', {
      token: admin,
      body: {
        question_set: set.id,
        text: `Kichik savol ${i}`,
        options: ['TOGRI', 'X', 'Y', 'Z'].map((text, index) => ({ text, is_correct: index === 0 })),
      },
    })
  }
  const { data: group } = await call('POST', '/groups/', {
    token: admin,
    body: {
      name: `Kichik-guruh-${count}`,
      organization: 'Sinov',
      question_set: set.id,
      login_prefix: `KCH${count}`,
    },
  })
  for (let i = 1; i <= members; i += 1) {
    await call('POST', `/groups/${group.id}/members/`, {
      token: admin,
      body: { full_name: `A'zo ${i}`, pinfl: String(80000000000000 + i) },
    })
  }
  const tokens = await listeners(admin, members, group.id)
  await call('POST', `/groups/${group.id}/open/`, { token: admin, body: {} })
  return { group, set, tokens }
}

async function answerAll(token, attempt, optionText, ms = 20000) {
  for (let n = 1; n <= attempt.n_total; n += 1) {
    const { data } = await question(token, attempt.id, n)
    await answer(token, attempt.id, n, data.options.find((o) => o.text === optionText).key, ms)
  }
}

const storedAttempt = (id) => context.api.engine.attempts.find((attempt) => attempt.id === id)

describe('1-2 qoida: javob va ID oshkor emas', () => {
  it("barcha tinglovchi endpointlarida taqiqlangan kalit yo'q", async () => {
    const admin = await adminToken()
    const [token] = await listeners(admin, 1)
    await call('POST', '/groups/1/exit-password/', { token: admin, body: { password: 'Chiqish1' } })

    const seen = []
    const record = (response) => {
      seen.push(response.data)
      return response
    }

    record(await call('GET', '/me/test/', { token }))
    const { data: attempt } = record(await start(token))
    record(await call('GET', '/me/test/', { token }))
    record(await call('GET', `/attempts/${attempt.id}/`, { token }))

    for (let n = 1; n <= attempt.n_total; n += 1) {
      const { data } = record(await question(token, attempt.id, n))
      record(await answer(token, attempt.id, n, data.options[0].key))
      record(await call('PUT', `/attempts/${attempt.id}/flags/${n}/`, { token, body: { flagged: true } }))
    }

    const events = `/attempts/${attempt.id}/events/`
    record(await call('POST', events, { token, body: { type: 'fullscreen_exit' } }))
    const unlock = `/attempts/${attempt.id}/exit-unlock/`
    record(await call('POST', unlock, { token, body: { password: 'xato' } }))
    record(await call('POST', unlock, { token, body: { password: 'Chiqish1' } }))
    record(await finish(token, attempt.id))
    record(await result(token, attempt.id))

    for (const body of seen) {
      const keys = collectKeys(body)
      for (const forbidden of FORBIDDEN_KEYS) {
        assert.ok(!keys.includes(forbidden), `${forbidden}: ${JSON.stringify(body).slice(0, 120)}`)
      }
    }
  })

  it("savol javobida faqat ruxsat etilgan maydonlar", async () => {
    const admin = await adminToken()
    const [token] = await listeners(admin, 1)
    const { data: attempt } = await start(token)
    const { data } = await question(token, attempt.id, 1)

    assert.deepEqual(Object.keys(data).sort(), [
      'deadline_at',
      'flagged',
      'image_url',
      'n',
      'options',
      'selected_key',
      'server_now',
      'text',
    ])
    assert.equal(data.options.length, 4)
    for (const option of data.options) {
      assert.deepEqual(Object.keys(option).sort(), ['key', 'text'])
      assert.equal(option.key.length, 8)
    }
  })

  it("rasm havolasida savol ID'si yo'q va test tugagach yopiladi", async () => {
    const admin = await adminToken()
    const { group, tokens, set } = await smallGroup(admin, { members: 1, count: 4, pass: 2 })
    const [token] = tokens
    await call('POST', `/groups/${group.id}/close/`, { token: admin, body: { mode: 'finish_now' } })

    const stored = context.api.engine
    const ids = (await call('GET', `/questions/?set=${set.id}`, { token: admin })).data.results
    for (const { id } of ids) {
      const form = new FormData()
      form.append('image', new File([Buffer.from('rasm')], 'a.png', { type: 'image/png' }))
      await fetch(`${context.baseUrl}/questions/${id}/image/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${admin}` },
        body: form,
      })
    }
    await call('POST', `/groups/${group.id}/open/`, { token: admin, body: {} })

    const { data: attempt } = await start(token)
    const { data } = await question(token, attempt.id, 1)
    assert.match(data.image_url, /^\/api\/v1\/media\/attempt\/[0-9a-f]{32}$/)
    assert.ok(!ids.some(({ id }) => data.image_url.endsWith(`/${id}`)))

    const path = data.image_url.replace('/api/v1', '')
    assert.equal((await fetch(context.baseUrl + path)).status, 200)
    await finish(token, attempt.id)
    assert.equal((await fetch(context.baseUrl + path)).status, 404)
    assert.equal(stored.attempts.length, 1)
  })

  it("boshqa tinglovchi urinishi ko'rinmaydi", async () => {
    const admin = await adminToken()
    const [first, second] = await listeners(admin, 2)
    const { data: attempt } = await start(first)

    assert.equal((await call('GET', `/attempts/${attempt.id}/`, { token: second })).status, 404)
    assert.equal((await question(second, attempt.id, 1)).status, 404)
    assert.equal((await answer(second, attempt.id, 1, 'x')).status, 404)
    assert.equal((await finish(second, attempt.id)).status, 404)
    assert.equal((await result(second, attempt.id)).status, 404)
  })

  it('admin tinglovchi endpointlariga kira olmaydi', async () => {
    const admin = await adminToken()
    assert.equal((await call('GET', '/me/test/', { token: admin })).status, 403)
    assert.equal((await start(admin)).status, 403)
  })

  it("tinglovchi guruhni ocha va retake bera olmaydi", async () => {
    const admin = await adminToken()
    const [token] = await listeners(admin, 1)
    assert.equal((await call('POST', '/groups/3/open/', { token, body: {} })).status, 403)
    assert.equal((await call('POST', '/groups/1/close/', { token, body: {} })).status, 403)
    assert.equal((await call('POST', '/groups/1/members/8/retake/', { token, body: {} })).status, 403)
  })
})

describe('variant generatsiyasi', () => {
  const pool = createBank(1).questions.filter((question) => question.question_set === 1)

  it("ikki tinglovchining variantlari farq qiladi", async () => {
    const admin = await adminToken()
    const [first, second] = await listeners(admin, 2)
    const a = storedAttempt((await start(first)).data.id)
    const b = storedAttempt((await start(second)).data.id)

    const ids = (attempt) => attempt.questions.map((slot) => slot.question)
    assert.equal(ids(a).length, 50)
    assert.notDeepEqual(ids(a), ids(b))
    assert.notDeepEqual(ids(a).toSorted(), ids(b).toSorted())
  })

  it("savollar variantda takrorlanmaydi, raqamlar 1..N", () => {
    const variant = buildVariant(pool, 50)
    assert.equal(new Set(variant.map((slot) => slot.question)).size, 50)
    assert.deepEqual(variant.map((slot) => slot.n), Array.from({ length: 50 }, (_, i) => i + 1))
  })

  it("to'g'ri javob pozitsiyasi A/B/C/D bo'yicha ~25% ± 5%", () => {
    const counts = [0, 0, 0, 0]
    const byId = new Map(pool.map((question) => [question.id, question]))

    for (let i = 0; i < 1000; i += 1) {
      for (const slot of buildVariant(pool, 50)) {
        const position = slot.option_map.findIndex(
          (entry) =>
            byId.get(slot.question).options.find((option) => option.id === entry.option_id).is_correct,
        )
        counts[position] += 1
      }
    }

    const total = counts.reduce((sum, count) => sum + count, 0)
    for (const count of counts) {
      assert.ok(Math.abs(count / total - 0.25) <= 0.05, String(counts))
    }
  })

  it("hamma savolga birinchi variantni belgilagan bot o'rtacha ~25% oladi", () => {
    const byId = new Map(pool.map((question) => [question.id, question]))
    const scores = []

    for (let i = 0; i < 500; i += 1) {
      const correct = buildVariant(pool, 50).filter((slot) => {
        const optionId = slot.option_map[0].option_id
        return byId.get(slot.question).options.find((option) => option.id === optionId).is_correct
      }).length
      scores.push(correct)
    }

    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length
    assert.ok(Math.abs(mean / 50 - 0.25) < 0.02, `o'rtacha ${mean}`)
    assert.ok(Math.max(...scores) < 28, `bot chegaradan o'tdi: ${Math.max(...scores)}`)
  })

  it("variant kalitlari urinishga xos", async () => {
    const admin = await adminToken()
    const { tokens } = await smallGroup(admin)
    const keys = async (token) => {
      const { data } = await start(token)
      const { data: first } = await question(token, data.id, 1)
      return first.options.map((option) => option.key)
    }
    const [a, b] = [await keys(tokens[0]), await keys(tokens[1])]
    assert.ok(!a.some((key) => b.includes(key)))
  })
})

describe('3-qoida: savollar bitta-bitta', () => {
  it("urinish javobida savol matni yo'q, noto'g'ri raqam 404", async () => {
    const admin = await adminToken()
    const [token] = await listeners(admin, 1)
    const { data: attempt } = await start(token)

    assert.ok(!JSON.stringify(attempt).includes('text'))
    assert.equal(attempt.n_total, 50)
    assert.equal((await question(token, attempt.id, 51)).status, 404)
    assert.equal((await question(token, attempt.id, 0)).status, 404)
  })
})

describe('4-qoida: vaqt serverda', () => {
  it("deadline_at o'zgarmaydi, har javobda server_now bor", async () => {
    const admin = await adminToken()
    const [token] = await listeners(admin, 1)
    const { data: attempt } = await start(token)
    const expected = new Date(context.clock + 75 * MINUTE).toISOString()
    assert.equal(attempt.deadline_at, expected)

    context.clock += 10 * MINUTE
    const { data: q } = await question(token, attempt.id, 1)
    assert.equal(q.deadline_at, expected)
    assert.equal(q.server_now, new Date(context.clock).toISOString())

    const saved = await answer(token, attempt.id, 1, q.options[0].key)
    assert.equal(saved.data.deadline_at, expected)
    assert.ok(saved.data.server_now)

    // Sahifa yangilansa, to'plam vaqti o'zgarsa ham muddat o'sha-o'sha.
    await call('PATCH', '/question-sets/1/', { token: admin, body: { duration_minutes: 200 } })
    assert.equal((await call('GET', `/attempts/${attempt.id}/`, { token })).data.deadline_at, expected)

    const stored = storedAttempt(attempt.id)
    assert.throws(() => {
      'use strict'
      stored.timing.deadline_at = 0
    }, TypeError)
  })
})

describe('5-qoida: urinish bitta', () => {
  it('parallel ikki start bitta urinish yaratadi', async () => {
    const admin = await adminToken()
    const [token] = await listeners(admin, 1)
    const responses = await Promise.all(Array.from({ length: 8 }, () => start(token)))

    assert.equal(responses.filter((response) => response.status === 200).length, 1)
    assert.ok(
      responses
        .filter((response) => response.status !== 200)
        .every((response) => response.data.code === 'already_started'),
    )
    assert.equal(context.api.engine.attempts.length, 1)
  })

  it("retake'siz ikkinchi urinish boshlanmaydi", async () => {
    const admin = await adminToken()
    const [token] = await listeners(admin, 1)
    const { data: attempt } = await start(token)
    await finish(token, attempt.id)

    const second = await start(token)
    assert.equal(second.status, 409)
    assert.equal(second.data.code, 'already_started')
  })

  it("retake: sabab majburiy, yangi variant, eski urinish saqlanadi", async () => {
    const admin = await adminToken()
    const [token] = await listeners(admin, 1)
    const { data: first } = await start(token)
    const user = context.api.users.find((candidate) => candidate.id === storedAttempt(first.id).user)
    const path = `/groups/1/members/${user.id}/retake/`

    const early = await call('POST', path, { token: admin, body: { reason: 'Elektr' } })
    assert.equal(early.data.code, 'attempt_active')

    await finish(token, first.id)
    const noReason = await call('POST', path, { token: admin, body: { reason: ' ' } })
    assert.ok(noReason.data.fields.reason)

    assert.equal((await call('POST', path, { token: admin, body: { reason: 'Elektr o\'chdi' } })).status, 200)
    assert.equal((await call('GET', '/me/test/', { token })).data.retake_allowed, true)

    const { data: second } = await start(token)
    const stored = storedAttempt(second.id)
    assert.equal(stored.is_retake, true)
    assert.equal(stored.retake_reason, "Elektr o'chdi")
    assert.notEqual(second.id, first.id)
    assert.equal(context.api.engine.attempts.length, 2)

    const before = new Set(storedAttempt(first.id).questions.map((slot) => slot.question))
    const overlap = stored.questions.filter((slot) => before.has(slot.question)).length
    assert.equal(overlap, 0, 'bank yetarli: eski savollar takrorlanmaydi')

    await finish(token, second.id)
    assert.equal((await start(token)).status, 409, 'ruxsat bir martalik')
    assert.equal(context.api.auditLog.filter((entry) => entry.action === 'retake_granted').length, 1)
  })

  it('boshlamagan tinglovchiga retake berilmaydi', async () => {
    const admin = await adminToken()
    const { data } = await call('POST', '/groups/1/members/8/retake/', {
      token: admin,
      body: { reason: 'Sabab' },
    })
    assert.equal(data.code, 'no_attempt')
  })
})

describe('6-qoida: davom etish', () => {
  it('qayta kirganda o\'sha urinish, o\'sha savol, javoblar va qolgan vaqt', async () => {
    const admin = await adminToken()
    const { data: gen } = await call('POST', '/groups/1/credentials/', { token: admin, body: {} })
    const card = gen.credentials[0]
    const first = (await login(card.login, card.password)).data.access

    const { data: attempt } = await start(first)
    const { data: q5 } = await question(first, attempt.id, 5)
    await answer(first, attempt.id, 5, q5.options[2].key)
    await call('PUT', `/attempts/${attempt.id}/flags/7/`, { token: first, body: { flagged: true } })
    await question(first, attempt.id, 7)

    context.clock += 20 * MINUTE
    const second = (await login(card.login, card.password)).data.access

    const { data: me } = await call('GET', '/me/test/', { token: second })
    assert.deepEqual(me.attempt, { id: attempt.id, status: 'active' })

    const { data: state } = await call('GET', `/attempts/${attempt.id}/`, { token: second })
    assert.equal(state.current_n, 7)
    assert.deepEqual(state.answered, [5])
    assert.deepEqual(state.flagged, [7])
    assert.equal(state.deadline_at, attempt.deadline_at)

    const { data: again } = await question(second, attempt.id, 5)
    assert.equal(again.selected_key, q5.options[2].key)
    assert.deepEqual(again.options, q5.options, 'variantlar tartibi va kalitlari saqlanadi')
  })
})

describe('7-qoida: vaqt tugashi', () => {
  it("muddatdan keyin javob qabul qilinmaydi, urinish beat'siz expired bo'ladi", async () => {
    const admin = await adminToken()
    const { tokens } = await smallGroup(admin, { members: 1 })
    const [token] = tokens
    const { data: attempt } = await start(token)
    const { data: q } = await question(token, attempt.id, 1)
    await answer(token, attempt.id, 1, q.options.find((o) => o.text === 'TOGRI').key)

    context.clock += 20 * MINUTE + (SETTINGS.ANSWER_GRACE_SECONDS + 1) * 1000
    const late = await answer(token, attempt.id, 2, 'kalit')
    assert.equal(late.status, 409)
    assert.equal(late.data.code, 'attempt_expired')

    const { data: state } = await call('GET', `/attempts/${attempt.id}/`, { token })
    assert.equal(state.status, 'expired')

    const { data } = await result(token, attempt.id)
    assert.equal(data.correct_count, 1)
    assert.equal(data.duration_seconds, 20 * 60)
    assert.equal((await question(token, attempt.id, 1)).data.code, 'attempt_expired')
  })

  it('ANSWER_GRACE_SECONDS ichida javob qabul qilinadi', async () => {
    const admin = await adminToken()
    const { tokens } = await smallGroup(admin, { members: 1 })
    const [token] = tokens
    const { data: attempt } = await start(token)
    const { data: q } = await question(token, attempt.id, 1)

    context.clock += 20 * MINUTE + (SETTINGS.ANSWER_GRACE_SECONDS - 1) * 1000
    assert.equal((await answer(token, attempt.id, 1, q.options[0].key)).status, 200)
  })

  it('beat tinglovchi so\'rovisiz yakunlaydi', async () => {
    const admin = await adminToken()
    const { tokens } = await smallGroup(admin, { members: 1 })
    const { data: attempt } = await start(tokens[0])

    context.clock += 21 * MINUTE
    context.api.engine.tick()
    assert.equal(storedAttempt(attempt.id).status, 'expired')
    assert.equal(storedAttempt(attempt.id).correct_count, 0)
  })
})

describe('8-qoida: bitta faol seans', () => {
  it('boshqa qurilmadan kirilsa eski seans bekor, hodisa yoziladi', async () => {
    const admin = await adminToken()
    const { data: gen } = await call('POST', '/groups/1/credentials/', { token: admin, body: {} })
    const card = gen.credentials[0]
    const first = (await login(card.login, card.password)).data.access
    const { data: attempt } = await start(first)

    await login(card.login, card.password)
    const stale = await call('GET', `/attempts/${attempt.id}/`, { token: first })
    assert.equal(stale.data.code, 'session_replaced')
    assert.ok(storedAttempt(attempt.id).events.some((event) => event.type === 'new_session'))
  })
})

describe('9-qoida: baholash serverda', () => {
  it("klient yuborgan ball e'tiborga olinmaydi", async () => {
    const admin = await adminToken()
    const { tokens } = await smallGroup(admin, { members: 1 })
    const [token] = tokens
    const { data: attempt } = await start(token)

    await call('POST', `/attempts/${attempt.id}/finish/`, {
      token,
      body: { correct_count: 12, passed: true, percent: 100 },
    })
    const { data } = await result(token, attempt.id)
    assert.equal(data.correct_count, 0)
    assert.equal(data.passed, false)
  })

  it("to'g'ri, noto'g'ri va chegara to'g'ri hisoblanadi", async () => {
    const admin = await adminToken()
    const { tokens } = await smallGroup(admin, { members: 1 })
    const [token] = tokens
    const { data: attempt } = await start(token)

    for (let n = 1; n <= 6; n += 1) {
      const { data } = await question(token, attempt.id, n)
      await answer(token, attempt.id, n, data.options.find((o) => o.text === 'TOGRI').key)
    }
    const { data: wrong } = await question(token, attempt.id, 7)
    await answer(token, attempt.id, 7, wrong.options.find((o) => o.text === 'X').key)

    context.clock += 5 * MINUTE
    await finish(token, attempt.id)
    const { data } = await result(token, attempt.id)
    assert.deepEqual(data, {
      correct_count: 6,
      n_total: 12,
      percent: 50,
      passed: true,
      duration_seconds: 300,
    })
  })

  it('natija test tugagunicha berilmaydi', async () => {
    const admin = await adminToken()
    const [token] = await listeners(admin, 1)
    const { data: attempt } = await start(token)
    const { status, data } = await result(token, attempt.id)
    assert.equal(status, 409)
    assert.equal(data.code, 'attempt_active')
  })

  it("tahrirlangan savol boshlangan urinishni buzmaydi", async () => {
    const admin = await adminToken()
    const { tokens, set } = await smallGroup(admin, { members: 1 })
    const [token] = tokens
    const { data: attempt } = await start(token)
    const { data: q } = await question(token, attempt.id, 1)
    await answer(token, attempt.id, 1, q.options.find((o) => o.text === 'TOGRI').key)

    const stored = storedAttempt(attempt.id)
    const id = stored.questions[0].question
    const { data: detail } = await call('GET', `/questions/${id}/`, { token: admin })
    await call('PATCH', `/questions/${id}/`, {
      token: admin,
      body: { options: detail.options.map((o) => ({ text: `${o.text} (tahrir)`, is_correct: o.is_correct })) },
    })

    await finish(token, attempt.id)
    assert.equal((await result(token, attempt.id)).data.correct_count, 1)
    assert.equal(set.question_count, 12)
  })
})

describe("ishlatilgan savol: API sinxron", () => {
  it("sync to'g'ri javobni almashtirmaydi", async () => {
    const admin = await adminToken()
    await call('POST', '/question-sets/4/sync-api/', { token: admin })
    const { data: list } = await call('GET', '/questions/?set=4&source=api&q=API%20savoli%201', { token: admin })
    const row = list.results.find((item) => item.text.endsWith('API savoli 1'))

    const stored = context.api.engine.questionById(row.id)
    stored.in_use = true
    const correct = stored.options.findIndex((option) => option.is_correct)
    stored.options.forEach((option, index) => {
      option.is_correct = index === (correct + 1) % 4
    })

    await call('POST', '/question-sets/4/sync-api/', { token: admin })
    assert.equal(stored.options.findIndex((option) => option.is_correct), (correct + 1) % 4)
  })
})

describe('javob saqlash', () => {
  it("idempotent: bir xil so'rov vaqtni ikki marta qo'shmaydi", async () => {
    const admin = await adminToken()
    const [token] = await listeners(admin, 1)
    const { data: attempt } = await start(token)
    const { data: q } = await question(token, attempt.id, 1)

    await answer(token, attempt.id, 1, q.options[0].key, 8000)
    await answer(token, attempt.id, 1, q.options[0].key, 8000)
    const slot = storedAttempt(attempt.id).questions[0]
    assert.equal(slot.time_spent_ms, 8000)

    await answer(token, attempt.id, 1, q.options[1].key, 3000)
    assert.equal(slot.time_spent_ms, 11000)
    assert.equal((await question(token, attempt.id, 1)).data.selected_key, q.options[1].key)
  })

  it("begona kalit rad etiladi, null javobni olib tashlaydi", async () => {
    const admin = await adminToken()
    const [token] = await listeners(admin, 1)
    const { data: attempt } = await start(token)
    const { data: q } = await question(token, attempt.id, 1)

    assert.equal((await answer(token, attempt.id, 1, 'begona12')).status, 400)
    await answer(token, attempt.id, 1, q.options[0].key)
    await answer(token, attempt.id, 1, null)
    assert.deepEqual((await call('GET', `/attempts/${attempt.id}/`, { token })).data.answered, [])
  })

  it('test yopiq bo\'lsa boshlanmaydi', async () => {
    const admin = await adminToken()
    const { data: group } = await call('POST', '/groups/', {
      token: admin,
      body: { name: 'Yopiq', organization: 'S', question_set: 1, login_prefix: 'YPQ' },
    })
    await call('POST', `/groups/${group.id}/members/`, {
      token: admin,
      body: { full_name: 'Bir', pinfl: '90000000000001' },
    })
    const [token] = await listeners(admin, 1, group.id)
    const response = await start(token)
    assert.equal(response.status, 409)
    assert.equal(response.data.code, 'test_closed')
  })
})

describe('ochish va yopish', () => {
  it('let_finish: faol urinish davom etadi, yangisi boshlanmaydi', async () => {
    const admin = await adminToken()
    const [running, late] = await listeners(admin, 2)
    const { data: attempt } = await start(running)

    await call('POST', '/groups/1/close/', { token: admin, body: { mode: 'let_finish' } })

    assert.equal((await start(late)).data.code, 'test_closed')
    const { data: q } = await question(running, attempt.id, 1)
    assert.equal((await answer(running, attempt.id, 1, q.options[0].key)).status, 200)
    assert.equal(storedAttempt(attempt.id).status, 'active')
  })

  it('finish_now: barcha faol urinishlar terminated va baholanadi', async () => {
    const admin = await adminToken()
    const { group, tokens } = await smallGroup(admin)
    const a = (await start(tokens[0])).data
    const b = (await start(tokens[1])).data
    await answerAll(tokens[0], a, 'TOGRI')

    const { data } = await call('POST', `/groups/${group.id}/close/`, {
      token: admin,
      body: { mode: 'finish_now' },
    })
    assert.equal(data.terminated, 2)
    assert.equal(storedAttempt(a.id).status, 'terminated')
    assert.equal(storedAttempt(a.id).correct_count, 12)
    assert.equal(storedAttempt(a.id).passed, true)
    assert.equal(storedAttempt(b.id).correct_count, 0)
    assert.equal(data.finished_count, 2)
  })

  it('bank yetarli bo\'lmasa test ochilmaydi', async () => {
    const admin = await adminToken()
    const { data: set } = await call('POST', '/question-sets/', {
      token: admin,
      body: { name: "Bo'sh", question_count: 5, duration_minutes: 5, pass_score: 3 },
    })
    const { data: group } = await call('POST', '/groups/', {
      token: admin,
      body: { name: "Bo'sh guruh", organization: 'S', question_set: set.id, login_prefix: 'BSH' },
    })
    const { status, data } = await call('POST', `/groups/${group.id}/open/`, { token: admin, body: {} })
    assert.equal(status, 409)
    assert.equal(data.code, 'not_enough_questions')
  })

  it('yopish usuli majburiy, jurnalga yoziladi', async () => {
    const admin = await adminToken()
    const bad = await call('POST', '/groups/1/close/', { token: admin, body: { mode: 'xato' } })
    assert.ok(bad.data.fields.mode)

    await call('POST', '/groups/1/close/', { token: admin, body: { mode: 'let_finish' } })
    await call('POST', '/groups/1/open/', { token: admin, body: {} })
    const actions = context.api.auditLog.map((entry) => entry.action)
    assert.ok(actions.includes('test_closed') && actions.includes('test_opened'))
  })

  it('rejalashtirilgan ochish va yopish beat orqali', async () => {
    const admin = await adminToken()
    const iso = (ms) => new Date(ms).toISOString()
    await call('PATCH', '/groups/3/', {
      token: admin,
      body: {
        scheduled_open_at: iso(context.clock + 10 * MINUTE),
        scheduled_close_at: iso(context.clock + 20 * MINUTE),
      },
    })

    context.api.engine.tick()
    assert.equal((await call('GET', '/groups/3/', { token: admin })).data.test_status, 'closed')

    context.clock += 11 * MINUTE
    context.api.engine.tick()
    assert.equal((await call('GET', '/groups/3/', { token: admin })).data.test_status, 'open')

    context.clock += 10 * MINUTE
    context.api.engine.tick()
    assert.equal((await call('GET', '/groups/3/', { token: admin })).data.test_status, 'finished')

    const entry = context.api.auditLog.findLast((candidate) => candidate.action === 'test_closed')
    assert.equal(entry.actor_label, 'Tizim (avtomatik)')
  })

  it("test ochilgach guruh va to'plam ishlatilgan bo'ladi", async () => {
    const admin = await adminToken()
    const [token] = await listeners(admin, 1)
    const { data: attempt } = await start(token)
    const id = storedAttempt(attempt.id).questions[0].question

    const removed = await call('DELETE', `/questions/${id}/`, { token: admin })
    assert.equal(removed.data.code, 'question_in_use')
  })
})

describe('hodisalar va ekrandan chiqish', () => {
  const event = (token, id, type) =>
    call('POST', `/attempts/${id}/events/`, { token, body: { type } })

  it("bitta Alt+Tab bitta chiqish, chegaradan oshsa shubhali, jazo yo'q", async () => {
    const admin = await adminToken()
    const [token] = await listeners(admin, 1)
    const { data: attempt } = await start(token)

    for (let i = 1; i <= SETTINGS.EXIT_VIOLATION_LIMIT + 1; i += 1) {
      await event(token, attempt.id, 'blur')
      await event(token, attempt.id, 'hidden')
      await event(token, attempt.id, 'fullscreen_exit')
      await event(token, attempt.id, 'return')
      assert.equal(storedAttempt(attempt.id).fullscreen_exits, i)
      context.clock += 5000
    }

    const stored = storedAttempt(attempt.id)
    assert.equal(stored.suspicious, true)
    assert.equal(stored.suspicious_reasons[0].code, 'too_many_exits')
    assert.equal(stored.status, 'active', 'avtomatik jazo yo\'q')
    assert.equal(stored.events.length, 16)
  })

  it('tinglovchi ichki hodisa turini yubora olmaydi', async () => {
    const admin = await adminToken()
    const [token] = await listeners(admin, 1)
    const { data: attempt } = await start(token)
    assert.equal((await event(token, attempt.id, 'exit_key_used')).status, 400)
    assert.equal((await event(token, attempt.id, 'new_session')).status, 400)
  })

  it("Ctrl+Alt+N paroli: to'g'ri parol qoidabuzarlik sanalmaydi, hodisa yoziladi", async () => {
    const admin = await adminToken()
    const [token] = await listeners(admin, 1)
    await call('POST', '/groups/1/exit-password/', { token: admin, body: { password: 'Chiqish1' } })
    const { data: attempt } = await start(token)

    const { status } = await call('POST', `/attempts/${attempt.id}/exit-unlock/`, {
      token,
      body: { password: 'Chiqish1' },
    })
    assert.equal(status, 200)

    await event(token, attempt.id, 'fullscreen_exit')
    const stored = storedAttempt(attempt.id)
    assert.equal(stored.fullscreen_exits, 0)
    assert.ok(stored.events.some((item) => item.type === 'exit_key_used'))
    assert.equal(stored.status, 'active', 'test davom etadi')

    context.clock += SETTINGS.EXIT_KEY_WINDOW_MS + 3000
    await event(token, attempt.id, 'fullscreen_exit')
    assert.equal(stored.fullscreen_exits, 1, 'ruxsat bir martalik oyna')
  })

  it("5 noto'g'ri urinishdan keyin 5 daqiqa 423, har urinish yoziladi", async () => {
    const admin = await adminToken()
    const [token] = await listeners(admin, 1)
    await call('POST', '/groups/1/exit-password/', { token: admin, body: { password: 'Chiqish1' } })
    const { data: attempt } = await start(token)
    const path = `/attempts/${attempt.id}/exit-unlock/`
    const unlock = (password) => call('POST', path, { token, body: { password } })

    for (let i = 1; i < SETTINGS.EXIT_KEY_MAX_TRIES; i += 1) {
      assert.equal((await unlock('xato')).status, 400)
    }
    const locked = await unlock('xato')
    assert.equal(locked.status, 423)
    assert.equal(locked.data.code, 'exit_locked')

    assert.equal((await unlock('Chiqish1')).status, 423, "blokda to'g'ri parol ham o'tmaydi")
    const failures = storedAttempt(attempt.id).events.filter((item) => item.type === 'exit_key_failed')
    assert.equal(failures.length, 5)

    context.clock += SETTINGS.EXIT_LOCK_MS + 1000
    assert.equal((await unlock('Chiqish1')).status, 200)
  })

  it('chiqish paroli o\'rnatilmagan bo\'lsa o\'tmaydi', async () => {
    const admin = await adminToken()
    const [token] = await listeners(admin, 1)
    const { data: attempt } = await start(token)
    const { status } = await call('POST', `/attempts/${attempt.id}/exit-unlock/`, {
      token,
      body: { password: 'nimadir' },
    })
    assert.equal(status, 400)
  })
})

describe('shubhali belgilar', () => {
  it('tez javoblar ulushi >= 50% va passed', async () => {
    const admin = await adminToken()
    const { tokens } = await smallGroup(admin, { members: 1 })
    const [token] = tokens
    const { data: attempt } = await start(token)
    await answerAll(token, attempt, 'TOGRI', 1000)
    await finish(token, attempt.id)

    const stored = storedAttempt(attempt.id)
    assert.equal(stored.passed, true)
    assert.equal(stored.suspicious_reasons[0].code, 'fast_answers')
  })

  it("tez javob berib o'tmagan urinish shubhali emas", async () => {
    const admin = await adminToken()
    const { tokens } = await smallGroup(admin, { members: 1 })
    const [token] = tokens
    const { data: attempt } = await start(token)
    await answerAll(token, attempt, 'X', 1000)
    await finish(token, attempt.id)
    assert.equal(storedAttempt(attempt.id).suspicious, false)
  })

  it("oddiy tezlikda to'g'ri javob bergan urinish shubhali emas", async () => {
    const admin = await adminToken()
    const { tokens } = await smallGroup(admin, { members: 1 })
    const [token] = tokens
    const { data: attempt } = await start(token)
    await answerAll(token, attempt, 'TOGRI', 30000)
    await finish(token, attempt.id)
    assert.equal(storedAttempt(attempt.id).suspicious, false)
  })

  it("guruhda >= 10 ta bir xil noto'g'ri javob ikkala urinishni belgilaydi", async () => {
    const admin = await adminToken()
    const { tokens } = await smallGroup(admin)
    const a = (await start(tokens[0])).data
    const b = (await start(tokens[1])).data
    await answerAll(tokens[0], a, 'X')
    await answerAll(tokens[1], b, 'X')
    await finish(tokens[0], a.id)
    assert.equal(storedAttempt(a.id).suspicious, false)
    await finish(tokens[1], b.id)

    for (const id of [a.id, b.id]) {
      assert.ok(storedAttempt(id).suspicious_reasons.some((r) => r.code.startsWith('same_wrong_')))
    }
  })

  it("turli noto'g'ri javoblar shubhali emas", async () => {
    const admin = await adminToken()
    const { tokens } = await smallGroup(admin)
    const a = (await start(tokens[0])).data
    const b = (await start(tokens[1])).data
    await answerAll(tokens[0], a, 'X')
    await answerAll(tokens[1], b, 'Y')
    await finish(tokens[0], a.id)
    await finish(tokens[1], b.id)
    assert.equal(storedAttempt(b.id).suspicious, false)
  })
})

describe("guruh sahifasi bilan bog'lanish", () => {
  it("a'zolarda jonli holat va topshirganlar soni", async () => {
    const admin = await adminToken()
    const { group, tokens } = await smallGroup(admin)
    const a = (await start(tokens[0])).data
    await start(tokens[1])
    await answerAll(tokens[0], a, 'TOGRI')
    await finish(tokens[0], a.id)

    const { data: members } = await call('GET', `/groups/${group.id}/members/`, { token: admin })
    assert.equal(members[0].live.status, 'finished')
    assert.equal(members[0].live.progress, "12 / 12 · O'tdi")
    assert.equal(members[1].live.status, 'in_progress')
    assert.match(members[1].live.progress, /^0 \/ 12 · \d\d:\d\d qoldi$/)

    const { data: detail } = await call('GET', `/groups/${group.id}/`, { token: admin })
    assert.equal(detail.finished_count, 1)
  })
})

describe('qolgan me/test holatlari', () => {
  it('kutish holati', async () => {
    const admin = await adminToken()
    const [token] = await listeners(admin, 1)
    const { data } = await call('GET', '/me/test/', { token })
    assert.equal(data.test_status, 'open')
    assert.equal(data.attempt, null)
    assert.equal(data.set.question_count, 50)
  })
})
