import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { mockApiPlugin } from './mock-api/vite-plugin.js'

// Django tayyor bo'lganda mockApiPlugin() o'rniga server.proxy['/api'] yoziladi.
export default defineConfig({
  plugins: [react(), tailwindcss(), mockApiPlugin()],
  // Windows'da standart holatda faqat ::1 tinglanadi va 127.0.0.1 ochilmaydi.
  server: { host: '127.0.0.1' },
})
