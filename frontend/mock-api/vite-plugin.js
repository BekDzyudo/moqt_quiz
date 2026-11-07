import { createMockApi } from './app.js'

const BEAT_INTERVAL_MS = 30 * 1000

// Holat xotirada: dev server qayta ishga tushsa, namuna hisoblar boshlang'ich holatga qaytadi.
export function mockApiPlugin() {
  const mount = ({ middlewares, httpServer }) => {
    const api = createMockApi({ latencyMs: 150 })
    middlewares.use('/api/v1', api)

    // Celery beat o'rnida.
    const timer = setInterval(api.engine.tick, BEAT_INTERVAL_MS)
    timer.unref()
    httpServer?.once('close', () => clearInterval(timer))
  }

  return {
    name: 'moqt-mock-api',
    configureServer: mount,
    configurePreviewServer: mount,
  }
}
