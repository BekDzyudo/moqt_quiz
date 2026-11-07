import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import ExcelJS from 'exceljs'
import { createMockApi } from './app.js'
import { call, context, login, resetApi, startTestServer, tokenFor } from './test-helpers.js'

startTestServer()
beforeEach(resetApi)

const adminToken = () => tokenFor('admin', 'Admin12345')

async function smallGroup(admin, { members = 3, count = 4, pass = 2 } = {}) {
  const { data: set } = await call('POST', '/question-sets/', {
    token: admin,
    body: { name: `Natija ${count}`, question_count: count, duration_minutes: 20, pass_score: pass },
  })
  for (let i = 1; i <= count; i += 1) {
    await call('POST', '/questions/', {
      token: admin,
      body: {
        question_set: set.id,
        text: `Natija savoli ${i}`,
        options: ['TOGRI', 'X', 'Y', 'Z'].map((text, index) => ({ text, is_correct: index === 0 })),
      },
    })
  }
  const { data: group } = await call('POST', '/groups/', {
    token: admin,
    body: { name: `Natija-guruh-${count}`, organization: 'Sinov', question_set: set.id, login_prefix: `NTJ${count}` },
  })
  for (let i = 1; i <= members; i += 1) {
    await call('POST', `/groups/${group.id}/members/`, {
      token: admin,
      body: { full_name: `Tinglovchi O'g'il ${i}`, pinfl: String(30000000000100 + i) },
    })
  }
  const { data: gen } = await call('POST', `/groups/${group.id}/credentials/`, { token: admin, body: {} })
  const tokens = []
  for (const card of gen.credentials) tokens.push((await login(card.login, card.password)).data.access)
  await call('POST', `/groups/${group.id}/open/`, { token: admin, body: {} })
  return { group, tokens, ids: gen.credentials.map((card) => card.user_id) }
}

async function takeTest(token, correctCount, ms = 20000) {
  const { data: attempt } = await call('POST', '/me/test/start/', { token, body: {} })
  for (let n = 1; n <= attempt.n_total; n += 1) {
    const { data } = await call('GET', `/attempts/${attempt.id}/questions/${n}/`, { token })
    const text = n <= correctCount ? 'TOGRI' : 'X'
    context.clock += ms
    await call('PUT', `/attempts/${attempt.id}/answers/${n}/`, {
      token,
      body: { key: data.options.find((option) => option.text === text).key, time_spent_ms: ms },
    })
  }
  await call('POST', `/attempts/${attempt.id}/finish/`, { token, body: {} })
  return attempt
}

async function download(path, token) {
  const res = await fetch(context.baseUrl + path, { headers: { Authorization: `Bearer ${token}` } })
  return { status: res.status, type: res.headers.get('content-type'), buffer: Buffer.from(await res.arrayBuffer()) }
}

describe('ruxsatlar', () => {
  for (const [method, path] of [
    ['GET', '/results/?group=1'],
    ['GET', '/results/export.xlsx?group=1'],
    ['GET', '/results/protocol.pdf?group=1'],
    ['GET', '/dashboard/'],
  ]) {
    it(`tinglovchi ${path} -> 403`, async () => {
      const token = await tokenFor('AKT01-017', 'Ab3dE9')
      assert.equal((await call(method, path, { token })).status, 403)
    })
  }

  it('guruh majburiy', async () => {
    const { status, data } = await call('GET', '/results/', { token: await adminToken() })
    assert.equal(status, 400)
    assert.ok(data.fields.group)
  })
})

describe('natijalar', () => {
  it('jadval, taqsimot, foiz va PINFL yashirilgan', async () => {
    const admin = await adminToken()
    const { group, tokens } = await smallGroup(admin)
    await takeTest(tokens[0], 4)
    await takeTest(tokens[1], 1)

    const { data } = await call('GET', `/results/?group=${group.id}`, { token: admin })
    assert.deepEqual(data.summary, { finished: 2, passed: 1 })
    assert.equal(data.chance_score, 1)
    assert.equal(data.rows[0].correct_count, 4)
    assert.equal(data.rows[0].percent, 100)
    assert.equal(data.rows[1].passed, false)
    assert.equal(data.rows[2].status, 'not_started')

    assert.match(data.rows[0].pinfl, /^3000•••••••\d{3}$/)
    assert.ok(!JSON.stringify(data).includes('30000000000101'))

    const total = data.distribution.reduce((sum, bucket) => sum + bucket.count, 0)
    assert.equal(total, 2)
    assert.ok(data.distribution.some((bucket) => bucket.note.includes('chegara 2')))
    assert.ok(data.distribution.some((bucket) => bucket.note.includes('tasodifiy daraja')))
    assert.ok(data.distribution.every((bucket) => bucket.passed === !/^[01]/.test(bucket.label)))
  })

  it("50/28 uchun dizayndagi bo'laklar", async () => {
    const { data } = await call('GET', '/results/?group=3', { token: await adminToken() })
    assert.deepEqual(data.distribution.map((bucket) => bucket.label), [
      '0–9',
      '10–18',
      '19–27',
      '28–35',
      '36–43',
      '44–50',
    ])
    assert.equal(data.distribution[1].note, 'tasodifiy daraja')
    assert.equal(data.distribution[3].note, 'chegara 28')
  })

  it('shubhali ro\'yxat 4-bosqich qoidalariga mos', async () => {
    const admin = await adminToken()
    const { group, tokens } = await smallGroup(admin, { members: 2 })
    await takeTest(tokens[0], 4, 1000)
    await takeTest(tokens[1], 4, 30000)

    const { data } = await call('GET', `/results/?group=${group.id}`, { token: admin })
    assert.equal(data.suspicious.length, 1)
    assert.match(data.suspicious[0].reasons[0], /juda tez/)
    assert.equal(data.suspicious[0].score, '4 / 4')
    assert.equal(data.rows.filter((row) => row.suspicious).length, 1)
  })

  it('retake: oxirgi urinish hisoblanadi, eksportda sabab', async () => {
    const admin = await adminToken()
    const { group, tokens, ids } = await smallGroup(admin, { members: 1 })
    await takeTest(tokens[0], 1)
    await call('POST', `/groups/${group.id}/members/${ids[0]}/retake/`, { token: admin, body: { reason: 'Elektr' } })
    await takeTest(tokens[0], 4)

    const { data } = await call('GET', `/results/?group=${group.id}`, { token: admin })
    assert.equal(data.rows[0].correct_count, 4)
    assert.deepEqual(
      data.rows[0].attempts.map((item) => [item.label, item.correct_count, item.retake_reason]),
      [
        ['1-urinish', 1, null],
        ['2-urinish', 4, 'Elektr'],
      ],
    )

    const { data: members } = await call('GET', `/groups/${group.id}/members/`, { token: admin })
    assert.deepEqual(members[0].live.previous, ["1-urinish: 1 / 4 · O'tmadi"])

    const file = await download(`/results/export.xlsx?group=${group.id}`, admin)
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(file.buffer)
    const sheet = workbook.getWorksheet('Natijalar')
    assert.equal(sheet.rowCount, 3)
    assert.equal(sheet.getCell('E2').value, 1)
    assert.equal(sheet.getCell('N2').value, '1-urinish')
    assert.equal(sheet.getCell('E3').value, 4)
    assert.equal(sheet.getCell('M3').value, 'Elektr')
    assert.equal(sheet.getCell('N3').value, '2-urinish')
  })
})

describe('eksport', () => {
  it('Excel: barcha ustunlar, to\'liq PINFL, savollar vaqti alohida varaqda, o\'zbekcha harflar', async () => {
    const admin = await adminToken()
    const { group, tokens } = await smallGroup(admin)
    await takeTest(tokens[0], 4)

    const file = await download(`/results/export.xlsx?group=${group.id}`, admin)
    assert.equal(file.status, 200)
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(file.buffer)

    const main = workbook.getWorksheet('Natijalar')
    assert.equal(main.rowCount, 4)
    assert.equal(main.getCell('A2').value, "Tinglovchi O'g'il 1")
    assert.equal(main.getCell('B2').value, '30000000000101')
    assert.equal(main.getCell('I2').value, "O'tdi")
    assert.equal(main.getCell('I3').value, 'Topshirmagan')

    const timing = workbook.getWorksheet("Savollar bo'yicha vaqt")
    assert.equal(timing.rowCount, 2)
    assert.equal(timing.getCell('B2').value, 20)
    assert.equal(timing.getCell('E2').value, 20)
  })

  it('PDF protokol: A4, sahifalash, jurnalga yoziladi', async () => {
    const admin = await adminToken()
    const file = await download('/results/protocol.pdf?group=1', admin)
    assert.equal(file.status, 200)
    assert.equal(file.type, 'application/pdf')

    const source = file.buffer.toString('latin1')
    assert.equal(source.slice(0, 4), '%PDF')
    assert.match(source, /\/MediaBox \[0 0 595\.28 841\.89\]/)
    assert.ok(source.match(/\/Type \/Page\b/g).length >= 1)

    const actions = context.api.auditLog.map((entry) => entry.action)
    assert.ok(actions.includes('results_exported'))
  })

  it("ko'p tinglovchi sahifalarga bo'linadi", async () => {
    const admin = await adminToken()
    for (let i = 0; i < 40; i += 1) {
      await call('POST', '/groups/1/members/', {
        token: admin,
        body: { full_name: `Qo'shimcha ${i}`, pinfl: String(40000000000000 + i) },
      })
    }
    const file = await download('/results/protocol.pdf?group=1', admin)
    assert.ok(file.buffer.toString('latin1').match(/\/Type \/Page\b/g).length >= 2)
  })
})

describe('bosh panel', () => {
  it('hisoblagichlar va ochiq testlar', async () => {
    const admin = await adminToken()
    const { group, tokens } = await smallGroup(admin)
    await takeTest(tokens[0], 4, 1000)
    await call('POST', '/me/test/start/', { token: tokens[1], body: {} })

    const { data } = await call('GET', '/dashboard/', { token: admin })
    assert.equal(data.working_now, 1)
    assert.equal(data.finished_today, 1)
    assert.equal(data.suspicious_count, 1)

    const row = data.open_tests.find((item) => item.id === group.id)
    assert.deepEqual([row.working, row.finished, row.member_count], [1, 1, 3])
  })

  it('kecha yakunlangan bugunga kirmaydi', async () => {
    const admin = await adminToken()
    const { tokens } = await smallGroup(admin)
    await takeTest(tokens[0], 4)
    context.clock += 24 * 60 * 60 * 1000
    const fresh = await adminToken()
    assert.equal((await call('GET', '/dashboard/', { token: fresh })).data.finished_today, 0)
  })
})

describe('jonli holat', () => {
  it('ishlayotganda qolgan vaqt, chiqishlar va qayta topshirish imkoni', async () => {
    const admin = await adminToken()
    const { group, tokens } = await smallGroup(admin, { members: 2 })
    await call('POST', '/me/test/start/', { token: tokens[0], body: {} })
    await takeTest(tokens[1], 3)

    const { data } = await call('GET', `/groups/${group.id}/members/`, { token: admin })
    assert.match(data[0].live.progress, /^0 \/ 4 · \d\d:\d\d qoldi$/)
    assert.equal(data[0].live.can_retake, false)
    assert.equal(data[1].live.can_retake, true)
  })

  it('finish_now hamma faolni yakunlaydi, natijada ko\'rinadi', async () => {
    const admin = await adminToken()
    const { group, tokens } = await smallGroup(admin, { members: 2 })
    await call('POST', '/me/test/start/', { token: tokens[0], body: {} })
    await call('POST', '/me/test/start/', { token: tokens[1], body: {} })

    await call('POST', `/groups/${group.id}/close/`, { token: admin, body: { mode: 'finish_now' } })
    const { data } = await call('GET', `/results/?group=${group.id}`, { token: admin })
    assert.equal(data.summary.finished, 2)
    assert.ok(data.rows.every((row) => row.status === 'finished'))
  })
})

describe('namuna urinishlar', () => {
  it("dev seed: natijalar to'ladi, birinchi guruh toza qoladi", async () => {
    context.api = createMockApi({ now: () => context.clock, seedDemo: true })
    const admin = await adminToken()

    const finished = (await call('GET', '/results/?group=5', { token: admin })).data
    assert.equal(finished.summary.finished, 28)
    assert.equal(finished.rows.at(-1).status, 'not_started')
    assert.ok(finished.suspicious.length >= 2)
    assert.ok(finished.summary.passed > 0 && finished.summary.passed < 28)

    assert.equal((await call('GET', '/results/?group=1', { token: admin })).data.summary.finished, 0)
    assert.equal((await call('GET', '/dashboard/', { token: admin })).data.working_now, 14)

    const listener = await tokenFor('AKT01-017', 'Ab3dE9')
    assert.equal((await call('POST', '/me/test/start/', { token: listener, body: {} })).status, 200)
  })
})

describe('shubhali urinishlar: barcha guruhlar', () => {
  it('bosh panel soni bilan ro\'yxat bir xil, guruh nomi bor', async () => {
    const admin = await adminToken()
    const { group, tokens } = await smallGroup(admin, { members: 2 })
    await takeTest(tokens[0], 4, 1000)
    await takeTest(tokens[1], 4, 1000)

    const { data: list } = await call('GET', '/results/suspicious/', { token: admin })
    const { data: dashboard } = await call('GET', '/dashboard/', { token: admin })
    assert.equal(list.length, 2)
    assert.equal(dashboard.suspicious_count, list.length)
    assert.equal(list[0].group.name, group.name)
    assert.ok(list[0].reasons.length > 0)
  })

  it("qayta topshirilgach eski shubhali urinish yo'qolmaydi", async () => {
    const admin = await adminToken()
    const { group, tokens, ids } = await smallGroup(admin, { members: 1 })
    await takeTest(tokens[0], 4, 1000)
    await call('POST', `/groups/${group.id}/members/${ids[0]}/retake/`, { token: admin, body: { reason: 'Sabab' } })
    await takeTest(tokens[0], 4, 30000)

    const { data } = await call('GET', `/results/?group=${group.id}`, { token: admin })
    assert.equal(data.suspicious.length, 1)
    assert.equal((await call('GET', '/dashboard/', { token: admin })).data.suspicious_count, 1)
  })

  it('namuna ma\'lumotda ham sonlar teng', async () => {
    context.api = createMockApi({ now: () => context.clock, seedDemo: true })
    const admin = await adminToken()
    const { data: list } = await call('GET', '/results/suspicious/', { token: admin })
    const { data: dashboard } = await call('GET', '/dashboard/', { token: admin })
    assert.ok(list.length >= 2)
    assert.equal(dashboard.suspicious_count, list.length)
  })
})

describe('protokol tartibi', () => {
  it("bo'sh guruhda ham imzo sahifasi chiqadi", async () => {
    const admin = await adminToken()
    const { data: group } = await call('POST', '/groups/', {
      token: admin,
      body: { name: "Bo'sh protokol", organization: 'S', question_set: 1, login_prefix: 'BOSH' },
    })
    const file = await download(`/results/protocol.pdf?group=${group.id}`, admin)
    assert.equal(file.buffer.toString('latin1').match(/\/Type \/Page\b/g).length, 1)
  })
})
