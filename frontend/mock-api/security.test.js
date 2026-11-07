import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import ExcelJS from 'exceljs'
import { createMockApi } from './app.js'
import { safeCell } from './excel-safe.js'
import { call, context, login, resetApi, startTestServer, tokenFor } from './test-helpers.js'

startTestServer()
beforeEach(resetApi)

const PUBLIC = new Set([
  'POST /auth/login/',
  'POST /auth/refresh/',
  'GET /media/questions/:key',
  'GET /media/attempt/:key',
])
const ANY_USER = new Set(['GET /auth/me/', 'POST /auth/logout/'])

const isSuperadminRoute = (path) => path.startsWith('/admins') || path.startsWith('/audit')
const isListenerRoute = (path) => path.startsWith('/me/') || path.startsWith('/attempts/')

const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex')

// Har bir yangi marshrut shu matritsaga avtomatik tushadi.
const routes = createMockApi().routes.filter(({ key }) => !PUBLIC.has(key))

const concrete = (path) =>
  path.replace(':id', '1').replace(':n', '1').replace(':uid', '8').replace(':key', 'x')

const request = (route, token) =>
  call(route.method, concrete(route.path), {
    token,
    body: route.method === 'GET' ? undefined : {},
  })

const firstPublicRoutesExist = () => {
  const keys = createMockApi().routes.map(({ key }) => key)
  for (const key of PUBLIC) assert.ok(keys.includes(key), key)
}

describe('rol matritsasi: barcha marshrutlar', () => {
  it('ochiq marshrutlar ro\'yxati aniq', firstPublicRoutesExist)

  for (const route of routes) {
    it(`tokensiz ${route.key} -> 401`, async () => {
      assert.equal((await request(route)).status, 401)
    })

    if (!ANY_USER.has(route.key) && !isListenerRoute(route.path)) {
      it(`tinglovchi ${route.key} -> 403`, async () => {
        const token = await tokenFor('AKT01-017', 'Ab3dE9')
        assert.equal((await request(route, token)).status, 403)
      })
    }

    if (isSuperadminRoute(route.path) || isListenerRoute(route.path)) {
      it(`admin ${route.key} -> 403`, async () => {
        const token = await tokenFor('admin', 'Admin12345')
        assert.equal((await request(route, token)).status, 403)
      })
    }
  }
})

describe('javob sarlavhalari', () => {
  it("API javoblari keshlanmaydi, CORS ochilmagan", async () => {
    const res = await fetch(`${context.baseUrl}/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://yomon.example' },
      body: JSON.stringify({ username: 'admin', password: 'Admin12345' }),
    })
    assert.equal(res.headers.get('cache-control'), 'no-store')
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff')
    assert.equal(res.headers.get('access-control-allow-origin'), null)
  })

  it("xato javoblari ham keshlanmaydi", async () => {
    const res = await fetch(`${context.baseUrl}/yoq/`)
    assert.equal(res.headers.get('cache-control'), 'no-store')
  })
})

describe('rasm havolalari', () => {
  async function upload(token, id, file) {
    const form = new FormData()
    form.append('image', file)
    const res = await fetch(`${context.baseUrl}/questions/${id}/image/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    })
    return { status: res.status, data: await res.json() }
  }

  it("savol ID'si bilan rasmni terib ochib bo'lmaydi", async () => {
    const token = await tokenFor('admin', 'Admin12345')
    const { data } = await upload(token, 1, new File([PNG], 'a.png', { type: 'image/png' }))

    assert.match(data.image_url, /^\/api\/v1\/media\/questions\/[0-9a-f]{32}$/)
    assert.equal((await fetch(`${context.baseUrl}${data.image_url.replace('/api/v1', '')}`)).status, 200)
    assert.equal((await fetch(`${context.baseUrl}/media/questions/1`)).status, 404)
  })

  it('MIME soxtalashtirilsa fayl tarkibi rad etadi', async () => {
    const token = await tokenFor('admin', 'Admin12345')
    const svg = new File(['<svg onload="alert(1)"/>'], 'a.png', { type: 'image/png' })
    const { status, data } = await upload(token, 1, svg)
    assert.equal(status, 400)
    assert.ok(data.fields.image)
  })

  it("yangi rasm yuklanganda eski havola ishlamaydi", async () => {
    const token = await tokenFor('admin', 'Admin12345')
    const first = (await upload(token, 1, new File([PNG], 'a.png', { type: 'image/png' }))).data
    await upload(token, 1, new File([PNG], 'b.png', { type: 'image/png' }))
    assert.equal((await fetch(`${context.baseUrl}${first.image_url.replace('/api/v1', '')}`)).status, 404)
  })
})

describe('Excel formula injection', () => {
  it('xavfli boshlanishlar zararsizlanadi', () => {
    for (const value of ['=1+1', '+1', '-1', '@SUM(A1)', '\tx', '\rx']) {
      assert.equal(safeCell(value), `'${value}`)
    }
    assert.equal(safeCell("O'tdi"), "O'tdi")
    assert.equal(safeCell(42), 42)
  })

  const EVIL = '=HYPERLINK("http://yomon.example","bos")'

  async function excelValues(path, token) {
    const res = await fetch(context.baseUrl + path, { headers: { Authorization: `Bearer ${token}` } })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(await res.arrayBuffer())
    const values = []
    for (const sheet of workbook.worksheets) {
      sheet.eachRow((row) => row.eachCell((cell) => values.push(cell.value)))
    }
    return values
  }

  async function evilMember(admin) {
    return call('POST', '/groups/3/members/', {
      token: admin,
      body: { full_name: EVIL, pinfl: '55000000000001', organization: '+998901234567' },
    })
  }

  it('natijalar eksporti', async () => {
    const admin = await tokenFor('admin', 'Admin12345')
    await evilMember(admin)
    const values = await excelValues('/results/export.xlsx?group=3', admin)
    assert.ok(values.includes(`'${EVIL}`))
    assert.ok(values.includes("'+998901234567"))
    assert.ok(!values.includes(EVIL))
    assert.ok(!values.some((value) => value?.formula))
  })

  it('login-parol Excel', async () => {
    const admin = await tokenFor('admin', 'Admin12345')
    await evilMember(admin)
    const { data } = await call('POST', '/groups/3/credentials/', { token: admin, body: {} })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(Buffer.from(data.xlsx_base64, 'base64'))
    const values = []
    workbook.getWorksheet('Login-parollar').eachRow((row) => row.eachCell((cell) => values.push(cell.value)))
    assert.ok(values.includes(`'${EVIL}`))
    assert.ok(!values.includes(EVIL))
  })

  it('jurnal eksporti', async () => {
    const superadmin = await tokenFor('superadmin', 'Super12345')
    await call('POST', '/groups/', {
      token: superadmin,
      body: { name: '=YOMON()', organization: 'S', question_set: 1, login_prefix: 'XAVF' },
    })
    const values = await excelValues('/audit/export.xlsx', superadmin)
    assert.ok(values.includes("'=YOMON()"))
  })
})

describe('klient kiritgan vaqt', () => {
  it("time_spent_ms o'tgan vaqtdan oshmaydi", async () => {
    const admin = await tokenFor('admin', 'Admin12345')
    const { data: gen } = await call('POST', '/groups/1/credentials/', { token: admin, body: {} })
    const card = gen.credentials[0]
    const { access: token } = (await login(card.login, card.password)).data
    const { data: attempt } = await call('POST', '/me/test/start/', { token, body: {} })
    const { data: question } = await call('GET', `/attempts/${attempt.id}/questions/1/`, { token })

    context.clock += 2000
    await call('PUT', `/attempts/${attempt.id}/answers/1/`, {
      token,
      body: { key: question.options[0].key, time_spent_ms: 600000 },
    })

    const stored = context.api.engine.attempts.find((item) => item.id === attempt.id)
    assert.equal(stored.questions[0].time_spent_ms, 2000)
  })
})

describe('login', () => {
  it("noto'g'ri login va parol bir xil javob beradi", async () => {
    const wrongPassword = await login('admin', 'xato')
    const wrongLogin = await login('yoq-login', 'xato')
    assert.deepEqual(wrongPassword.data, wrongLogin.data)
  })

  it("seed tinglovchining parolsiz hisobi kira olmaydi", async () => {
    assert.equal((await login('AKT01-001', '')).status, 401)
  })
})
