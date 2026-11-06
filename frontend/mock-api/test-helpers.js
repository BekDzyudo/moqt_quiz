import { createServer } from 'node:http'
import { after, before } from 'node:test'
import { createMockApi } from './app.js'

export const context = { api: null, clock: 0, baseUrl: '' }

export function startTestServer() {
  let server

  before(async () => {
    server = createServer((req, res) => context.api(req, res))
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    context.baseUrl = `http://127.0.0.1:${server.address().port}`
  })

  after(() => server.close())
}

export function resetApi() {
  context.clock = Date.parse('2026-11-06T10:00:00Z')
  context.api = createMockApi({ now: () => context.clock })
}

export async function call(method, path, { body, token } = {}) {
  const res = await fetch(context.baseUrl + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  return { status: res.status, data: text ? JSON.parse(text) : null }
}

export const login = (username, password) =>
  call('POST', '/auth/login/', { body: { username, password } })

export const tokenFor = async (username, password) => (await login(username, password)).data.access
