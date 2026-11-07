import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { buildMembersTemplate } from './credentials-files.js'
import { call, context, login, resetApi, startTestServer, tokenFor } from './test-helpers.js'

startTestServer()
beforeEach(resetApi)

const adminToken = () => tokenFor('admin', 'Admin12345')
const pinflFor = (n) => String(50000000000000 + n)

const NEW_GROUP = {
  name: '2026-12-TEST-01',
  organization: 'Andijon MOM',
  question_set: 1,
  login_prefix: 'TST01',
}

async function upload(token, path, buffer, name) {
  const form = new FormData()
  form.append('file', new File([buffer], name))
  const res = await fetch(context.baseUrl + path, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  return { status: res.status, data: await res.json() }
}

async function createGroup(token, overrides = {}) {
  const { data } = await call('POST', '/groups/', { token, body: { ...NEW_GROUP, ...overrides } })
  return data
}

async function importMembers(token, groupId, count) {
  const rows = Array.from({ length: count }, (_, i) => [`Tinglovchi ${i + 1}`, pinflFor(i + 1), ''])
  const path = `/groups/${groupId}/members/import`
  const { data } = await upload(token, `${path}/preview/`, await buildMembersTemplate(rows), 'r.xlsx')
  await call('POST', `${path}/commit/`, { token, body: { token: data.token } })
}

const generate = (token, groupId, body = {}) =>
  call('POST', `/groups/${groupId}/credentials/`, { token, body })

describe('ruxsatlar', () => {
  const calls = [
    ['GET', '/groups/'],
    ['POST', '/groups/'],
    ['GET', '/groups/1/'],
    ['PATCH', '/groups/1/'],
    ['GET', '/groups/1/members/'],
    ['POST', '/groups/1/members/'],
    ['POST', '/groups/1/members/import/preview/'],
    ['POST', '/groups/1/members/import/commit/'],
    ['POST', '/groups/1/credentials/'],
    ['POST', '/groups/1/exit-password/'],
    ['GET', '/groups/members/template.xlsx'],
  ]

  for (const [method, path] of calls) {
    it(`tinglovchi ${method} ${path} -> 403`, async () => {
      const token = await tokenFor('AKT01-017', 'Ab3dE9')
      const { status } = await call(method, path, { token, body: method === 'GET' ? undefined : {} })
      assert.equal(status, 403)
    })
  }
})

describe('guruhlar', () => {
  it("ro'yxat, qidiruv va holat filtri", async () => {
    const token = await adminToken()
    assert.equal((await call('GET', '/groups/', { token })).data.length, 6)
    assert.equal((await call('GET', '/groups/?q=iqt', { token })).data.length, 2)
    const open = (await call('GET', '/groups/?status=open', { token })).data
    assert.ok(open.every((group) => group.test_status === 'open'))
  })

  it('nom va prefiks unikal, prefiks formati tekshiriladi', async () => {
    const token = await adminToken()
    const body = { ...NEW_GROUP, name: '2026-11-AKT-01', login_prefix: 'AKT01' }
    const { data } = await call('POST', '/groups/', { token, body })
    assert.ok(data.fields.name)
    assert.ok(data.fields.login_prefix)

    const bad = await call('POST', '/groups/', { token, body: { ...NEW_GROUP, login_prefix: 'a b' } })
    assert.ok(bad.data.fields.login_prefix)
  })

  it("test ochilgandan keyin to'plamni almashtirib bo'lmaydi", async () => {
    const token = await adminToken()
    const open = await call('PATCH', '/groups/1/', { token, body: { question_set: 2 } })
    assert.equal(open.status, 400)
    assert.ok(open.data.fields.question_set)

    const closed = await call('PATCH', '/groups/3/', { token, body: { question_set: 2 } })
    assert.equal(closed.status, 200)
    assert.equal(closed.data.question_set, 2)
  })

  it("login-parol yaratilgach prefiks o'zgarmaydi", async () => {
    const token = await adminToken()
    const { status, data } = await call('PATCH', '/groups/1/', { token, body: { login_prefix: 'ZZZ' } })
    assert.equal(status, 400)
    assert.ok(data.fields.login_prefix)
  })

  it("to'plam kartasida biriktirilgan guruhlar ko'rinadi va bunday to'plam o'chmaydi", async () => {
    const token = await adminToken()
    const set = (await call('GET', '/question-sets/1/', { token })).data
    assert.ok(set.groups.includes('2026-11-AKT-01'))

    const { data: created } = await call('POST', '/question-sets/', {
      token,
      body: { name: "Bo'sh", question_count: 5, duration_minutes: 5, pass_score: 3 },
    })
    await createGroup(token, { question_set: created.id })
    const removed = await call('DELETE', `/question-sets/${created.id}/`, { token })
    assert.equal(removed.status, 409)
    assert.equal(removed.data.code, 'set_in_use')
  })
})

describe("a'zolar", () => {
  it("qo'lda qo'shish: PINFL tekshiriladi, takror rad etiladi", async () => {
    const token = await adminToken()
    const group = await createGroup(token)
    const path = `/groups/${group.id}/members/`
    const body = { full_name: 'Sinov Tinglovchi', pinfl: pinflFor(1), organization: '' }

    const created = await call('POST', path, { token, body })
    assert.equal(created.status, 201)
    assert.equal(created.data.organization, NEW_GROUP.organization)
    assert.equal(created.data.login, null)

    const short = await call('POST', path, { token, body: { ...body, pinfl: '123' } })
    assert.match(short.data.fields.pinfl, /14 ta raqam/)

    const again = await call('POST', path, { token, body })
    assert.match(again.data.fields.pinfl, /allaqachon/)
  })

  it('jonli holat hozircha Kirmagan', async () => {
    const { data } = await call('GET', '/groups/1/members/', { token: await adminToken() })
    assert.equal(data.length, 30)
    assert.ok(data.every((member) => member.live.status === 'not_started'))
  })

  it("boshqa faol guruhdagi PINFL ogohlantirish beradi, lekin qo'shiladi", async () => {
    const token = await adminToken()
    const group = await createGroup(token)
    const [existing] = (await call('GET', '/groups/1/members/', { token })).data

    const { status, data } = await call('POST', `/groups/${group.id}/members/`, {
      token,
      body: { full_name: 'Takror', pinfl: existing.pinfl },
    })
    assert.equal(status, 201)
    assert.match(data.warning, /2026-11-AKT-01/)
  })

  it('Excel import: xatolar qator raqami bilan, ogohlantirish alohida', async () => {
    const token = await adminToken()
    const group = await createGroup(token)
    const [existing] = (await call('GET', '/groups/1/members/', { token })).data
    const rows = [
      ['Birinchi', pinflFor(1), 'Andijon MOM'],
      ['', pinflFor(2), ''],
      ['Qisqa PINFL', '123', ''],
      ['Fayl ichida takror', pinflFor(1), ''],
      ['Boshqa guruhda', existing.pinfl, ''],
    ]
    const path = `/groups/${group.id}/members/import`
    const { data } = await upload(token, `${path}/preview/`, await buildMembersTemplate(rows), 'r.xlsx')

    assert.equal(data.total, 5)
    assert.equal(data.valid_count, 2)
    assert.deepEqual(data.problems.map((problem) => problem.row), [3, 4, 5])
    assert.equal(data.warnings.length, 1)

    const commit = await call('POST', `${path}/commit/`, { token, body: { token: data.token } })
    assert.deepEqual(commit.data, { created: 2 })
    const again = await call('POST', `${path}/commit/`, { token, body: { token: data.token } })
    assert.equal(again.status, 404)
  })

  it('raqam sifatida saqlangan PINFL ham o\'qiladi', async () => {
    const token = await adminToken()
    const group = await createGroup(token)
    const rows = [['Raqamli', 12345678901234, '']]
    const { data } = await upload(
      token,
      `/groups/${group.id}/members/import/preview/`,
      await buildMembersTemplate(rows),
      'r.xlsx',
    )
    assert.equal(data.valid_count, 1)
  })

  it('.xlsx dan boshqa fayl rad etiladi', async () => {
    const token = await adminToken()
    const { data } = await upload(token, '/groups/1/members/import/preview/', Buffer.from('x'), 'r.csv')
    assert.ok(data.fields.file)
  })
})

describe('login-parol generatsiyasi', () => {
  it("30 kishi: login formati, 6 belgi, alifbo, PDF 3 sahifa A4", async () => {
    const token = await adminToken()
    const group = await createGroup(token)
    await importMembers(token, group.id, 30)

    const { status, data } = await generate(token, group.id)
    assert.equal(status, 200)
    assert.equal(data.count, 30)
    assert.equal(data.credentials[16].login, 'TST01-017')

    const alphabet = /^[ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789]{6}$/
    assert.ok(data.credentials.every((card) => alphabet.test(card.password)))
    assert.equal(new Set(data.credentials.map((card) => card.login)).size, 30)

    const pdf = Buffer.from(data.pdf_base64, 'base64')
    const source = pdf.toString('latin1')
    assert.equal(source.slice(0, 4), '%PDF')
    assert.equal(source.match(/\/Type \/Page\b/g).length, 3)
    assert.match(source, /\/MediaBox \[0 0 595\.28 841\.89\]/)

    const { default: ExcelJS } = await import('exceljs')
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(Buffer.from(data.xlsx_base64, 'base64'))
    const sheet = workbook.getWorksheet('Login-parollar')
    assert.equal(sheet.rowCount, 31)
    assert.equal(sheet.getCell('C2').value, data.credentials[0].password)
  })

  it('tinglovchi kira oladi, qayta generatsiyadan keyin eski parol va seans ishlamaydi', async () => {
    const token = await adminToken()
    const group = await createGroup(token)
    await importMembers(token, group.id, 2)

    const [first] = (await generate(token, group.id)).data.credentials
    const session = await login(first.login, first.password)
    assert.equal(session.status, 200)
    assert.equal(session.data.user.role, 'listener')

    const [second] = (await generate(token, group.id)).data.credentials
    assert.equal(second.login, first.login, 'login o\'zgarmaydi')
    assert.notEqual(second.password, first.password)

    assert.equal((await login(first.login, first.password)).status, 401)
    assert.equal((await call('GET', '/auth/me/', { token: session.data.access })).status, 401)
    assert.equal((await login(second.login, second.password)).status, 200)
  })

  it("user_ids bilan faqat tanlanganlar yangilanadi", async () => {
    const token = await adminToken()
    const group = await createGroup(token)
    await importMembers(token, group.id, 3)
    const all = (await generate(token, group.id)).data.credentials

    const only = await generate(token, group.id, { user_ids: [all[1].user_id] })
    assert.equal(only.data.count, 1)
    assert.equal((await login(all[0].login, all[0].password)).status, 200)
    assert.equal((await login(all[1].login, all[1].password)).status, 401)
  })

  it("keyin qo'shilgan a'zo keyingi tartib raqamini oladi", async () => {
    const token = await adminToken()
    const group = await createGroup(token)
    await importMembers(token, group.id, 2)
    await generate(token, group.id)

    const { data: member } = await call('POST', `/groups/${group.id}/members/`, {
      token,
      body: { full_name: 'Kechikkan', pinfl: pinflFor(99) },
    })
    const { data } = await generate(token, group.id, { user_ids: [member.id] })
    assert.equal(data.credentials[0].login, 'TST01-003')
  })

  it("a'zosiz guruhda tushunarli xato", async () => {
    const token = await adminToken()
    const group = await createGroup(token)
    const { status, data } = await generate(token, group.id)
    assert.equal(status, 400)
    assert.equal(data.code, 'no_members')
  })
})

describe("ochiq parol yo'q", () => {
  it("foydalanuvchilar holatida va jurnalda ochiq parol saqlanmaydi", async () => {
    const token = await adminToken()
    const group = await createGroup(token)
    await importMembers(token, group.id, 2)
    const { credentials } = (await generate(token, group.id)).data
    const { data: exit } = await call('POST', `/groups/${group.id}/exit-password/`, { token, body: {} })

    const stored = JSON.stringify(context.api.users)
    const log = JSON.stringify(context.api.auditLog)

    for (const secret of [...credentials.map((card) => card.password), exit.password, 'Admin12345']) {
      assert.ok(!stored.includes(secret), 'users')
      assert.ok(!log.includes(secret), 'audit')
    }
    assert.ok(context.api.users.every((user) => !('password' in user)))
  })

  it("a'zolar va guruh javobida parol yo'q", async () => {
    const token = await adminToken()
    const { credentials } = (await generate(token, 1)).data
    const members = JSON.stringify((await call('GET', '/groups/1/members/', { token })).data)
    assert.ok(!members.includes(credentials[0].password))
    assert.ok(!members.includes('password_hash'))

    await call('POST', '/groups/1/exit-password/', { token, body: {} })
    const detail = (await call('GET', '/groups/1/', { token })).data
    assert.equal(detail.exit_password_set, true)
    assert.ok(!JSON.stringify(detail).includes('hash'))
  })
})

describe('chiqish paroli', () => {
  it("qo'lda va generatsiya, qisqa parol rad etiladi", async () => {
    const token = await adminToken()
    const path = '/groups/1/exit-password/'
    assert.equal((await call('POST', path, { token, body: { password: 'Xavfsiz1' } })).data.password, 'Xavfsiz1')
    assert.equal((await call('POST', path, { token, body: {} })).data.password.length, 6)
    assert.ok((await call('POST', path, { token, body: { password: '123' } })).data.fields.password)
  })
})

describe('jurnal', () => {
  it('har bir generatsiya va import yoziladi', async () => {
    const token = await adminToken()
    const group = await createGroup(token)
    await importMembers(token, group.id, 2)
    await generate(token, group.id)
    await generate(token, group.id)
    await call('POST', `/groups/${group.id}/exit-password/`, { token, body: {} })

    assert.deepEqual(
      context.api.auditLog.map((entry) => entry.action).slice(1),
      [
        'group_created',
        'members_imported',
        'credentials_generated',
        'credentials_generated',
        'exit_password_changed',
      ],
    )
  })
})

describe('admin tahriri', () => {
  it("F.I.Sh. va tashkilot o'zgaradi, jurnalga yoziladi, bo'sh bo'lmaydi", async () => {
    const token = await tokenFor('superadmin', 'Super12345')
    const { data } = await call('PATCH', '/admins/2/', {
      token,
      body: { full_name: 'Yangi Ism Sharif', organization: 'Yangi tashkilot' },
    })
    assert.equal(data.full_name, 'Yangi Ism Sharif')
    assert.equal(data.organization, 'Yangi tashkilot')
    const entry = context.api.auditLog.at(-1)
    assert.equal(entry.action, 'admin_updated')
    assert.equal(entry.meta.previous.organization, 'Toshkent MOM')

    const blank = await call('PATCH', '/admins/2/', { token, body: { full_name: ' ' } })
    assert.equal(blank.status, 400)
  })
})
