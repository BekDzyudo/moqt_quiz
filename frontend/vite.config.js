import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { mockApiPlugin } from './mock-api/vite-plugin.js'

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  // React va recharts `style` atributini ishlatadi; Tailwind esa alohida fayl.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  'font-src https://fonts.gstatic.com',
  "img-src 'self' blob:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')

const SECURITY_HEADERS = {
  'Content-Security-Policy': CSP,
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}

// Django tayyor bo'lganda mockApiPlugin() o'rniga server.proxy['/api'] yoziladi.
export default defineConfig({
  plugins: [react(), tailwindcss(), mockApiPlugin()],
  // Windows'da standart holatda faqat ::1 tinglanadi va 127.0.0.1 ochilmaydi.
  server: { host: '127.0.0.1' },
  // Production sarlavhalari: docs/XAVFSIZLIK.md dagi nginx sozlamasi bilan bir xil.
  // Dev serverda qo'yilmaydi, chunki HMR ichki skript ishlatadi.
  preview: { headers: SECURITY_HEADERS },
})
