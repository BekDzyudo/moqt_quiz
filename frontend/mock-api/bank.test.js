import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { buildExcelTemplate, buildWordDocument, buildWordTemplate } from './import/templates.js'
import { call, context, resetApi, startTestServer, tokenFor } from './test-helpers.js'

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

const options = (correct = 1) =>
  ['Bir', 'Ikki', 'Uch', "To'rt"].map((text, index) => ({ text, is_correct: index === correct }))

startTestServer()
beforeEach(resetApi)

const adminToken = () => tokenFor('admin', 'Admin12345')

async function upload(token, path, fields) {
  const form = new FormData()
  for (const [key, value] of Object.entries(fields)) form.append(key, value)
  const res = await fetch(context.baseUrl + path, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  return { status: res.status, data: await res.json() }
}

const preview = (token, buffer, name, setId = 4) =>
  upload(token, '/questions/import/preview/', {
    file: new File([buffer], name, { type: XLSX }),
    question_set: String(setId),
  })

const setStats = async (token, id) =>
  (await call('GET', `/question-sets/${id}/`, { token })).data

describe('ruxsatlar', () => {
  const calls = [
    ['GET', '/question-sets/'],
    ['POST', '/question-sets/'],
    ['GET', '/question-sets/1/'],
    ['PATCH', '/question-sets/1/'],
    ['DELETE', '/question-sets/1/'],
    ['POST', '/question-sets/1/sync-api/'],
    ['GET', '/questions/'],
    ['POST', '/questions/'],
    ['GET', '/questions/1/'],
    ['PATCH', '/questions/1/'],
    ['DELETE', '/questions/1/'],
    ['POST', '/questions/1/image/'],
    ['DELETE', '/questions/1/image/'],
    ['POST', '/questions/import/preview/'],
    ['POST', '/questions/import/commit/'],
    ['GET', '/questions/import/template.xlsx'],
    ['GET', '/questions/import/template.docx'],
  ]

  for (const [method, path] of calls) {
    it(`tinglovchi ${method} ${path} -> 403`, async () => {
      const token = await tokenFor('AKT01-017', 'Ab3dE9')
      const { status } = await call(method, path, { token, body: method === 'GET' ? undefined : {} })
      assert.equal(status, 403)
    })
  }

  it('admin va superadmin bankka kira oladi', async () => {
    assert.equal((await call('GET', '/questions/', { token: await adminToken() })).status, 200)
    const superToken = await tokenFor('superadmin', 'Super12345')
    assert.equal((await call('GET', '/questions/', { token: superToken })).status, 200)
  })
})

describe('savol validatsiyasi', () => {
  const create = async (body) =>
    call('POST', '/questions/', {
      token: await adminToken(),
      body: { question_set: 1, text: 'Yangi savol', options: options(), ...body },
    })

  it("to'g'ri savol yaratiladi va is_correct admin javobida bor", async () => {
    const { status, data } = await create({})
    assert.equal(status, 201)
    assert.equal(data.options.filter((option) => option.is_correct).length, 1)
    assert.equal(data.source, 'local')
  })

  it('variantlar soni 4 ta', async () => {
    const { status, data } = await create({ options: options().slice(0, 3) })
    assert.equal(status, 400)
    assert.ok(data.fields.options)
  })

  it("aniq bitta to'g'ri javob", async () => {
    const none = options().map((option) => ({ ...option, is_correct: false }))
    const two = options().map((option) => ({ ...option, is_correct: true }))
    assert.equal((await create({ options: none })).status, 400)
    assert.equal((await create({ options: two })).status, 400)
  })

  it("bo'sh matn yo'q", async () => {
    assert.ok((await create({ text: '   ' })).data.fields.text)
    const blank = options()
    blank[2].text = ' '
    assert.ok((await create({ options: blank })).data.fields.options)
  })
})

describe("savolni o'chirish", () => {
  it("testda ishlatilgan savolni o'chirib bo'lmaydi, nofaol qilish mumkin", async () => {
    const token = await adminToken()
    const { status, data } = await call('DELETE', '/questions/1/', { token })
    assert.equal(status, 409)
    assert.equal(data.code, 'question_in_use')

    const updated = await call('PATCH', '/questions/1/', { token, body: { is_active: false } })
    assert.equal(updated.status, 200)
    assert.equal(updated.data.is_active, false)
  })

  it("ishlatilmagan savol o'chiriladi", async () => {
    const token = await adminToken()
    assert.equal((await call('DELETE', '/questions/10/', { token })).status, 204)
    assert.equal((await call('GET', '/questions/10/', { token })).status, 404)
  })
})

describe("ishlatilgan savolda to'g'ri javob", () => {
  it("o'zgartirib bo'lmaydi, matnni tuzatish mumkin", async () => {
    const token = await adminToken()
    const { data: question } = await call('GET', '/questions/1/', { token })
    const moved = question.options.map((option, index) => ({
      text: option.text,
      is_correct: index === (question.options.findIndex((o) => o.is_correct) + 1) % 4,
    }))

    const rejected = await call('PATCH', '/questions/1/', { token, body: { options: moved } })
    assert.equal(rejected.status, 400)
    assert.match(rejected.data.fields.options, /to'g'ri javobni o'zgartirib bo'lmaydi/)

    const typoFixed = question.options.map((option) => ({ ...option, text: `${option.text}!` }))
    assert.equal((await call('PATCH', '/questions/1/', { token, body: { options: typoFixed } })).status, 200)
  })

  it('ishlatilmagan savolda erkin', async () => {
    const token = await adminToken()
    const { data: question } = await call('GET', '/questions/10/', { token })
    const moved = question.options.map((option) => ({ text: option.text, is_correct: !option.is_correct }))
    moved.forEach((option, index) => {
      option.is_correct = index === (question.options.findIndex((o) => o.is_correct) + 1) % 4
    })
    assert.equal((await call('PATCH', '/questions/10/', { token, body: { options: moved } })).status, 200)
  })
})

describe("ro'yxat", () => {
  it('filtrlar va sahifalash ishlaydi', async () => {
    const token = await adminToken()
    const all = (await call('GET', '/questions/', { token })).data
    assert.equal(all.results.length, 20)
    assert.equal(all.totals.all, all.totals.local + all.totals.api)

    const api = (await call('GET', '/questions/?source=api&set=1', { token })).data
    assert.ok(api.results.every((row) => row.source === 'api' && row.question_set === 1))

    const inactive = (await call('GET', '/questions/?is_active=false', { token })).data
    assert.ok(inactive.results.every((row) => row.is_active === false))

    const found = (await call('GET', `/questions/?q=${encodeURIComponent('osi modelida')}`, { token })).data
    assert.equal(found.count, 1)
  })

  it("ro'yxat javobida variantlar yo'q", async () => {
    const { data } = await call('GET', '/questions/', { token: await adminToken() })
    assert.ok(!JSON.stringify(data).includes('is_correct'))
  })
})

describe("to'plamlar", () => {
  it('yaratiladi, chegara savollar sonidan oshmaydi', async () => {
    const token = await adminToken()
    const body = { name: 'Yangi', question_count: 10, duration_minutes: 20, pass_score: 6 }
    assert.equal((await call('POST', '/question-sets/', { token, body })).status, 201)

    const bad = await call('POST', '/question-sets/', {
      token,
      body: { ...body, name: 'Boshqa', pass_score: 11 },
    })
    assert.ok(bad.data.fields.pass_score)
  })

  it("savoli bor to'plam o'chirilmaydi", async () => {
    const { status, data } = await call('DELETE', '/question-sets/1/', { token: await adminToken() })
    assert.equal(status, 409)
    assert.equal(data.code, 'set_not_empty')
  })

  it("bankda faol savollar soni to'g'ri", async () => {
    const token = await adminToken()
    const before = await setStats(token, 1)
    await call('PATCH', '/questions/1/', { token, body: { is_active: false } })
    assert.equal((await setStats(token, 1)).active_count, before.active_count - 1)
  })
})

describe('sync-api', () => {
  it('ikki marta ishlatilsa takroriy savol yaratmaydi', async () => {
    const token = await adminToken()
    const before = (await setStats(token, 4)).total_count

    const first = await call('POST', '/question-sets/4/sync-api/', { token })
    assert.deepEqual(first.data, { created: 24, updated: 0 })

    const second = await call('POST', '/question-sets/4/sync-api/', { token })
    assert.deepEqual(second.data, { created: 0, updated: 24 })
    assert.equal((await setStats(token, 4)).total_count, before + 24)
  })
})

describe('Excel import', () => {
  const goodRow = (n) => [`Import savoli ${n}`, 'Bir', 'Ikki', 'Uch', "To'rt", 'B']

  it("300 qator: xatolilar sababi va qator raqami bilan ko'rsatiladi", async () => {
    const rows = Array.from({ length: 300 }, (_, index) => goodRow(index + 1))
    rows[9] = ['', 'Bir', 'Ikki', 'Uch', "To'rt", 'A'] // 11-qator
    rows[19] = ['Variantsiz', 'Bir', '', 'Uch', "To'rt", 'A'] // 21-qator
    rows[29] = ['Javobsiz', 'Bir', 'Ikki', 'Uch', "To'rt", 'E'] // 31-qator
    rows[39] = [`  import SAVOLI 1 ?`, 'Bir', 'Ikki', 'Uch', "To'rt", 'A'] // 41-qator, takror

    const token = await adminToken()
    const before = (await setStats(token, 4)).total_count
    const { status, data } = await preview(token, await buildExcelTemplate(rows), 'savollar.xlsx')

    assert.equal(status, 200)
    assert.equal(data.total, 300)
    assert.equal(data.valid_count, 296)
    assert.deepEqual(data.problems.map((problem) => problem.row), [11, 21, 31, 41])
    assert.equal(data.problems[0].status, 'invalid')
    assert.match(data.problems[0].errors[0], /Savol matni/)
    assert.match(data.problems[1].errors[0], /B variant/)
    assert.equal(data.problems[3].status, 'duplicate')
    assert.equal(data.sample.length, 5)
    assert.equal((await setStats(token, 4)).total_count, before, "preview hech narsa yozmaydi")

    const commit = await call('POST', '/questions/import/commit/', {
      token,
      body: { token: data.token },
    })
    assert.deepEqual(commit.data, { created: 296 })
    assert.equal((await setStats(token, 4)).total_count, before + 296)
  })

  it("commit tokeni bir martalik", async () => {
    const token = await adminToken()
    const { data } = await preview(token, await buildExcelTemplate([goodRow(1)]), 'a.xlsx')
    const body = { token: data.token }
    assert.equal((await call('POST', '/questions/import/commit/', { token, body })).status, 200)
    assert.equal((await call('POST', '/questions/import/commit/', { token, body })).status, 404)
  })

  it('bazadagi savol takroriy deb topiladi', async () => {
    const token = await adminToken()
    const row = ["OSI modelida nechta pog'ona bor", '4', '5', '6', '7', 'D']
    const { data } = await preview(token, await buildExcelTemplate([row]), 'a.xlsx', 1)
    assert.equal(data.problems[0].status, 'duplicate')
  })

  it("noto'g'ri fayl tushunarli xato beradi", async () => {
    const token = await adminToken()
    const wrongType = await preview(token, Buffer.from('salom'), 'savollar.txt')
    assert.ok(wrongType.data.fields.file)
    const broken = await preview(token, Buffer.from('salom'), 'savollar.xlsx')
    assert.match(broken.data.fields.file, /o'qib bo'lmadi/)
  })

  it('shablonning o\'zi xatosiz import qilinadi', async () => {
    const token = await adminToken()
    const { data } = await preview(token, await buildExcelTemplate(), 'shablon.xlsx')
    assert.equal(data.valid_count, 2)
  })
})

describe('Word import', () => {
  it('shablon: `*` va qalin belgi tanib olinadi', async () => {
    const token = await adminToken()
    const { data } = await preview(token, await buildWordTemplate(), 'shablon.docx')
    assert.equal(data.valid_count, 2)
    assert.equal(data.sample[0].correct, 'B')
    assert.equal(data.sample[1].correct, 'D')
    assert.equal(data.sample[0].options[1], 'DHCP')
  })

  it("xatoli savol: variant yetishmaydi yoki to'g'ri javob belgilanmagan", async () => {
    const token = await adminToken()
    const doc = await buildWordDocument([
      ['1. Variant yetishmaydi'],
      ['A) Bir'],
      ['*B) Ikki'],
      ['C) Uch'],
      ['2. Javob belgilanmagan'],
      ['A) Bir'],
      ['B) Ikki'],
      ['C) Uch'],
      ['D) Tort'],
      ['3. Ikki javob'],
      ['*A) Bir'],
      ['*B) Ikki'],
      ['C) Uch'],
      ['D) Tort'],
    ])
    const { data } = await preview(token, doc, 'xato.docx')
    assert.equal(data.valid_count, 0)
    assert.match(data.problems[0].errors[0], /D variant/)
    assert.match(data.problems[1].errors[0], /To'g'ri javob/)
    assert.match(data.problems[2].errors[0], /Bir nechta/)
  })

  it('maxsus belgilar buzilmaydi', async () => {
    const token = await adminToken()
    const doc = await buildWordDocument([
      ['1. <h1> va & belgisi nima?'],
      ['A) <a>'],
      ['*B) &amp;'],
      ['C) x'],
      ['D) y'],
    ])
    const { data } = await preview(token, doc, 'belgi.docx')
    assert.equal(data.sample[0].text, '<h1> va & belgisi nima?')
    assert.equal(data.sample[0].options[1], '&amp;')
  })
})

describe('rasm', () => {
  it('yuklanadi, tokensiz ochiladi, turi va hajmi tekshiriladi', async () => {
    const token = await adminToken()
    const signature = Buffer.from('89504e470d0a1a0a00', 'hex')
    const png = new File([signature], 'a.png', { type: 'image/png' })
    const { status, data } = await upload(token, '/questions/1/image/', { image: png })
    assert.equal(status, 200)

    const res = await fetch(context.baseUrl + data.image_url.replace('/api/v1', ''))
    assert.equal(res.headers.get('content-type'), 'image/png')

    const pdf = new File([Buffer.from('x')], 'a.pdf', { type: 'application/pdf' })
    assert.ok((await upload(token, '/questions/1/image/', { image: pdf })).data.fields.image)

    const big = new File([signature, Buffer.alloc(2 * 1024 * 1024)], 'b.png', { type: 'image/png' })
    assert.ok((await upload(token, '/questions/1/image/', { image: big })).data.fields.image)
  })
})

describe('jurnal', () => {
  it('bank amallari yoziladi', async () => {
    const token = await adminToken()
    await call('POST', '/question-sets/', {
      token,
      body: { name: 'Yangi', question_count: 10, duration_minutes: 20, pass_score: 6 },
    })
    await call('POST', '/questions/', {
      token,
      body: { question_set: 1, text: 'Yangi savol', options: options() },
    })
    await call('PATCH', '/questions/10/', { token, body: { is_active: false } })
    await call('DELETE', '/questions/10/', { token })
    await call('POST', '/question-sets/4/sync-api/', { token })

    const { data } = await preview(token, await buildExcelTemplate(), 'a.xlsx')
    await call('POST', '/questions/import/commit/', { token, body: { token: data.token } })

    assert.deepEqual(
      context.api.auditLog.map((entry) => entry.action).slice(1),
      [
        'question_set_created',
        'question_created',
        'question_updated',
        'question_deleted',
        'questions_synced',
        'questions_imported',
      ],
    )
    assert.ok(!JSON.stringify(context.api.auditLog).includes('is_correct'))
  })
})
