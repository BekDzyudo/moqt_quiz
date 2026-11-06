import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { call, context, login, resetApi, startTestServer } from './test-helpers.js'

startTestServer()
beforeEach(resetApi)

describe('login', () => {
  it('kontrakt shaklida javob beradi', async () => {
    const { status, data } = await login('AKT01-017', 'Ab3dE9')
    assert.equal(status, 200)
    assert.deepEqual(Object.keys(data).sort(), ['access', 'refresh', 'user'])
    assert.deepEqual(Object.keys(data.user).sort(), ['full_name', 'id', 'role'])
    assert.equal(data.user.role, 'listener')
  })

  it("noto'g'ri parolda {code, detail} qaytaradi", async () => {
    const { status, data } = await login('admin', 'xato')
    assert.equal(status, 401)
    assert.equal(data.code, 'invalid_credentials')
    assert.ok(data.detail)
  })

  it('6-urinishni throttling bilan to\'xtatadi va oyna o\'tgach ochadi', async () => {
    for (let i = 0; i < 5; i += 1) {
      assert.equal((await login('admin', 'xato')).status, 401)
    }
    const blocked = await login('admin', 'Admin12345')
    assert.equal(blocked.status, 429)
    assert.equal(blocked.data.code, 'throttled')

    context.clock += 61_000
    assert.equal((await login('admin', 'Admin12345')).status, 200)
  })

  it('throttling boshqa loginga tegmaydi', async () => {
    for (let i = 0; i < 6; i += 1) await login('admin', 'xato')
    assert.equal((await login('superadmin', 'Super12345')).status, 200)
  })
})

describe('bitta faol seans', () => {
  it('tinglovchi qayta kirsa, eski access va refresh session_replaced oladi', async () => {
    const first = (await login('AKT01-017', 'Ab3dE9')).data
    const second = (await login('AKT01-017', 'Ab3dE9')).data

    const me = await call('GET', '/auth/me/', { token: first.access })
    assert.equal(me.status, 401)
    assert.equal(me.data.code, 'session_replaced')

    const refreshed = await call('POST', '/auth/refresh/', { body: { refresh: first.refresh } })
    assert.equal(refreshed.status, 401)
    assert.equal(refreshed.data.code, 'session_replaced')

    assert.equal((await call('GET', '/auth/me/', { token: second.access })).status, 200)
  })

  it('admin ikki joydan kira oladi', async () => {
    const first = (await login('admin', 'Admin12345')).data
    await login('admin', 'Admin12345')
    assert.equal((await call('GET', '/auth/me/', { token: first.access })).status, 200)
  })
})

describe('tokenlar', () => {
  it('access 30 daqiqadan keyin eskiradi, refresh bilan yangilanadi', async () => {
    const { access, refresh } = (await login('admin', 'Admin12345')).data

    context.clock += 30 * 60 * 1000
    const expired = await call('GET', '/auth/me/', { token: access })
    assert.equal(expired.status, 401)
    assert.equal(expired.data.code, 'token_invalid')

    const renewed = await call('POST', '/auth/refresh/', { body: { refresh } })
    assert.equal(renewed.status, 200)
    assert.equal((await call('GET', '/auth/me/', { token: renewed.data.access })).status, 200)
  })

  it('refresh 12 soatdan keyin ishlamaydi', async () => {
    const { refresh } = (await login('admin', 'Admin12345')).data
    context.clock += 12 * 60 * 60 * 1000
    assert.equal((await call('POST', '/auth/refresh/', { body: { refresh } })).status, 401)
  })

  it("soxtalashtirilgan token rad etiladi", async () => {
    const { access } = (await login('admin', 'Admin12345')).data
    const [header, payload, signature] = access.split('.')
    const forged = JSON.parse(Buffer.from(payload, 'base64url'))
    forged.role = 'superadmin'
    const token = [header, Buffer.from(JSON.stringify(forged)).toString('base64url'), signature].join('.')
    assert.equal((await call('GET', '/auth/me/', { token })).status, 401)
  })

  it('logoutdan keyin refresh ishlamaydi', async () => {
    const { access, refresh } = (await login('admin', 'Admin12345')).data
    assert.equal((await call('POST', '/auth/logout/', { token: access, body: { refresh } })).status, 200)
    assert.equal((await call('POST', '/auth/refresh/', { body: { refresh } })).status, 401)
  })
})

describe('jurnal', () => {
  it('login va logout yoziladi', async () => {
    const { access, refresh } = (await login('admin', 'Admin12345')).data
    await call('POST', '/auth/logout/', { token: access, body: { refresh } })
    assert.deepEqual(context.api.auditLog.map((entry) => entry.action), ['login', 'logout'])
    assert.equal(context.api.auditLog[0].object_repr, 'admin')
    assert.ok(context.api.auditLog[0].ip)
  })
})
