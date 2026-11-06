import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { call, context, login, resetApi, tokenFor, startTestServer } from './test-helpers.js'

const SUPER = ['superadmin', 'Super12345']
const ADMIN = ['admin', 'Admin12345']
const LISTENER = ['AKT01-017', 'Ab3dE9']

const NEW_ADMIN = {
  full_name: 'Yangi Admin Testovich',
  organization: 'Andijon MOM',
  username: 'and_mom',
  password: 'Andijon2026',
}

startTestServer()
beforeEach(resetApi)

const adminId = async (token, username) => {
  const { data } = await call('GET', '/admins/', { token })
  return data.find((admin) => admin.username === username).id
}

describe('ruxsatlar', () => {
  const protectedCalls = [
    ['GET', '/admins/'],
    ['POST', '/admins/'],
    ['PATCH', '/admins/2/'],
    ['DELETE', '/admins/2/'],
    ['GET', '/audit/'],
    ['GET', '/audit/export.xlsx'],
  ]

  for (const [role, credentials] of [['admin', ADMIN], ['tinglovchi', LISTENER]]) {
    for (const [method, path] of protectedCalls) {
      it(`${role} ${method} ${path} -> 403`, async () => {
        const token = await tokenFor(...credentials)
        const { status, data } = await call(method, path, { token, body: method === 'GET' ? undefined : {} })
        assert.equal(status, 403)
        assert.equal(data.code, 'forbidden')
      })
    }
  }

  it('tokensiz so\'rov -> 401', async () => {
    assert.equal((await call('GET', '/admins/')).status, 401)
    assert.equal((await call('GET', '/audit/')).status, 401)
  })

  it('tinglovchi parol o\'zgartira olmaydi', async () => {
    const token = await tokenFor(...LISTENER)
    const { status } = await call('POST', '/auth/change-password/', {
      token,
      body: { current_password: 'Ab3dE9', new_password: 'Boshqa12345' },
    })
    assert.equal(status, 403)
  })
})

describe('adminlar CRUD', () => {
  it("ro'yxatda parol va tinglovchilar yo'q", async () => {
    const token = await tokenFor(...SUPER)
    const { data } = await call('GET', '/admins/', { token })
    assert.ok(data.length >= 5)
    for (const admin of data) {
      assert.deepEqual(
        Object.keys(admin).sort(),
        ['full_name', 'id', 'is_active', 'organization', 'username'],
      )
    }
  })

  it('yangi admin kira oladi va jurnalga yoziladi', async () => {
    const token = await tokenFor(...SUPER)
    const { status } = await call('POST', '/admins/', { token, body: NEW_ADMIN })
    assert.equal(status, 201)
    assert.equal((await login(NEW_ADMIN.username, NEW_ADMIN.password)).status, 200)
    assert.ok(context.api.auditLog.some((entry) => entry.action === 'admin_created'))
  })

  it('login unikal: katta-kichik harfdan qat\'i nazar', async () => {
    const token = await tokenFor(...SUPER)
    const { status, data } = await call('POST', '/admins/', {
      token,
      body: { ...NEW_ADMIN, username: 'ADMIN' },
    })
    assert.equal(status, 400)
    assert.ok(data.fields.username)
  })

  it('parol kamida 8 belgi', async () => {
    const token = await tokenFor(...SUPER)
    const { status, data } = await call('POST', '/admins/', {
      token,
      body: { ...NEW_ADMIN, password: '1234567' },
    })
    assert.equal(status, 400)
    assert.ok(data.fields.password)
  })

  it('superadmin va tinglovchini /admins/ orqali o\'zgartirib bo\'lmaydi', async () => {
    const token = await tokenFor(...SUPER)
    for (const id of [1, 7]) {
      const { status } = await call('PATCH', `/admins/${id}/`, { token, body: { is_active: false } })
      assert.equal(status, 404)
    }
  })

  it("o'chirilgan admin kira olmaydi, ochiq seansi tugaydi, jurnal yozuvlari qoladi", async () => {
    const token = await tokenFor(...SUPER)
    const adminToken = await tokenFor(...ADMIN)
    const id = await adminId(token, 'admin')

    assert.equal((await call('DELETE', `/admins/${id}/`, { token })).status, 204)
    assert.equal((await login(...ADMIN)).status, 401)
    assert.equal((await call('GET', '/auth/me/', { token: adminToken })).status, 401)

    const { data } = await call('GET', '/audit/', { token })
    assert.ok(data.results.some((entry) => entry.actor_label.startsWith('Saidov Rustam')))
  })
})

describe("parol o'zgarishi", () => {
  it('superadmin almashtirgach eski parol ishlamaydi, ochiq seans tugaydi', async () => {
    const token = await tokenFor(...SUPER)
    const adminToken = await tokenFor(...ADMIN)
    const id = await adminId(token, 'admin')

    const { status } = await call('PATCH', `/admins/${id}/`, {
      token,
      body: { password: 'YangiParol2026' },
    })
    assert.equal(status, 200)

    assert.equal((await login(...ADMIN)).status, 401)
    assert.equal((await login('admin', 'YangiParol2026')).status, 200)
    const stale = await call('GET', '/auth/me/', { token: adminToken })
    assert.equal(stale.status, 401)
    assert.equal(stale.data.code, 'token_invalid')
  })

  it('admin o\'z parolini o\'zgartiradi va shu seansda qoladi', async () => {
    const { access, refresh } = (await login(...ADMIN)).data
    const { status, data } = await call('POST', '/auth/change-password/', {
      token: access,
      body: { current_password: ADMIN[1], new_password: 'YangiParol2026' },
    })
    assert.equal(status, 200)

    assert.equal((await login(...ADMIN)).status, 401)
    assert.equal((await login('admin', 'YangiParol2026')).status, 200)
    assert.equal((await call('GET', '/auth/me/', { token: data.access })).status, 200)
    assert.equal((await call('GET', '/auth/me/', { token: access })).status, 401)
    assert.equal((await call('POST', '/auth/refresh/', { body: { refresh } })).status, 401)
  })

  it("joriy parol noto'g'ri bo'lsa rad etiladi", async () => {
    const token = await tokenFor(...ADMIN)
    const { status, data } = await call('POST', '/auth/change-password/', {
      token,
      body: { current_password: 'xato', new_password: 'YangiParol2026' },
    })
    assert.equal(status, 400)
    assert.ok(data.fields.current_password)
    assert.equal((await login(...ADMIN)).status, 200)
  })

  it('jurnalda parol matni saqlanmaydi', async () => {
    const token = await tokenFor(...SUPER)
    const id = await adminId(token, 'admin')
    await call('PATCH', `/admins/${id}/`, { token, body: { password: 'MaxfiyParol2026' } })
    assert.ok(!JSON.stringify(context.api.auditLog).includes('MaxfiyParol2026'))
  })
})

describe('bloklash', () => {
  it('bloklangan admin kira olmaydi, ochiq seansi keyingi so\'rovda tugaydi', async () => {
    const token = await tokenFor(...SUPER)
    const { access, refresh } = (await login(...ADMIN)).data
    const id = await adminId(token, 'admin')

    await call('PATCH', `/admins/${id}/`, { token, body: { is_active: false } })

    assert.equal((await login(...ADMIN)).status, 401)
    const me = await call('GET', '/auth/me/', { token: access })
    assert.equal(me.status, 401)
    assert.equal(me.data.code, 'account_blocked')
    const renewed = await call('POST', '/auth/refresh/', { body: { refresh } })
    assert.equal(renewed.data.code, 'account_blocked')
  })

  it('blokdan chiqarilgach eski tokenlar qayta jonlanmaydi', async () => {
    const token = await tokenFor(...SUPER)
    const { access } = (await login(...ADMIN)).data
    const id = await adminId(token, 'admin')

    await call('PATCH', `/admins/${id}/`, { token, body: { is_active: false } })
    await call('PATCH', `/admins/${id}/`, { token, body: { is_active: true } })

    assert.equal((await call('GET', '/auth/me/', { token: access })).status, 401)
    assert.equal((await login(...ADMIN)).status, 200)
  })
})

describe('jurnal', () => {
  it('har bir superadmin amali yoziladi', async () => {
    const token = await tokenFor(...SUPER)
    const { data: created } = await call('POST', '/admins/', { token, body: NEW_ADMIN })
    const path = `/admins/${created.id}/`
    await call('PATCH', path, { token, body: { username: 'and_mom2' } })
    await call('PATCH', path, { token, body: { password: 'YangiParol2026' } })
    await call('PATCH', path, { token, body: { is_active: false } })
    await call('PATCH', path, { token, body: { is_active: true } })
    await call('DELETE', path, { token })

    assert.deepEqual(
      context.api.auditLog.map((entry) => entry.action),
      [
        'login',
        'admin_created',
        'admin_updated',
        'admin_password_changed',
        'admin_blocked',
        'admin_unblocked',
        'admin_deleted',
      ],
    )
  })

  it("yozuvni API orqali o'zgartirib yoki o'chirib bo'lmaydi", async () => {
    const token = await tokenFor(...SUPER)
    for (const path of ['/audit/', '/audit/1/']) {
      for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
        const { status } = await call(method, path, { token, body: { action: 'soxta' } })
        assert.equal(status, 405, `${method} ${path}`)
      }
    }
    assert.equal(context.api.auditLog.length, 1)
    assert.equal(context.api.auditLog[0].action, 'login')
  })

  it('yangi yozuv yuqorida, actor va action bo\'yicha filtrlanadi', async () => {
    const token = await tokenFor(...SUPER)
    await login(...ADMIN)

    const all = (await call('GET', '/audit/', { token })).data
    assert.equal(all.results[0].object_repr, 'admin')
    assert.equal(all.results[0].action_label, 'Tizimga kirdi')

    const byActor = (await call('GET', `/audit/?actor=${all.results[0].actor}`, { token })).data
    assert.equal(byActor.count, 1)

    const byAction = (await call('GET', '/audit/?action=logout', { token })).data
    assert.equal(byAction.count, 0)
    assert.equal(byAction.filters.actors.length, 2)
  })

  it("sana Toshkent vaqti bo'yicha filtrlanadi", async () => {
    context.clock = Date.parse('2026-11-05T19:30:00Z') // Toshkentda 6-noyabr, 00:30
    const token = await tokenFor(...SUPER)

    assert.equal((await call('GET', '/audit/?date=2026-11-06', { token })).data.count, 1)
    assert.equal((await call('GET', '/audit/?date=2026-11-05', { token })).data.count, 0)
  })

  it('sahifalanadi: 20 tadan', async () => {
    const token = await tokenFor(...SUPER)
    for (let i = 0; i < 24; i += 1) {
      await login(...ADMIN)
      context.clock += 13_000 // throttling oynasiga tushmaslik uchun
    }

    const first = (await call('GET', '/audit/', { token })).data
    const second = (await call('GET', '/audit/?page=2', { token })).data
    assert.equal(first.count, 25)
    assert.equal(first.results.length, 20)
    assert.equal(second.results.length, 5)
    assert.notEqual(first.results[0].id, second.results[0].id)
  })

  it('Excel eksport haqiqiy .xlsx va filtrga amal qiladi', async () => {
    const token = await tokenFor(...SUPER)
    await login(...ADMIN)

    const res = await fetch(`${context.baseUrl}/audit/export.xlsx?action=login`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    assert.equal(res.status, 200)
    assert.match(res.headers.get('content-type'), /spreadsheetml/)

    const { default: ExcelJS } = await import('exceljs')
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(await res.arrayBuffer())
    const sheet = workbook.getWorksheet('Amallar jurnali')
    assert.equal(sheet.rowCount, 3)
    assert.equal(sheet.getCell('C2').value, 'Tizimga kirdi')
  })
})
