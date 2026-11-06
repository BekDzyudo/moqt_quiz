import { createMockApi } from './app.js'

// Holat xotirada: dev server qayta ishga tushsa, namuna hisoblar boshlang'ich holatga qaytadi.
export function mockApiPlugin() {
  const mount = ({ middlewares }) => {
    middlewares.use('/api/v1', createMockApi({ latencyMs: 150 }))
  }

  return {
    name: 'moqt-mock-api',
    configureServer: mount,
    configurePreviewServer: mount,
  }
}
