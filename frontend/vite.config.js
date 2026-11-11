import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  // React va recharts `style` atributini ishlatadi; Tailwind esa alohida fayl.
  "style-src 'self' 'unsafe-inline'",
  // Shriftlar saytning o'zidan (@fontsource), data: URI emas.
  "font-src 'self'",
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

// Barcha /api so'rovlari real backendga ketadi. Boshqa manzil kerak bo'lsa,
// .env.local da API_PROXY_TARGET beriladi.
const DEFAULT_API = 'http://192.168.100.57'

export default defineConfig(({ mode }) => {
  const target = loadEnv(mode, process.cwd(), '').API_PROXY_TARGET || DEFAULT_API
  const proxy = { '/api': { target, changeOrigin: true } }

  return {
    plugins: [react(), tailwindcss()],
    // Windows'da standart holatda faqat ::1 tinglanadi va 127.0.0.1 ochilmaydi.
    server: { host: '127.0.0.1', proxy },
    // Production sarlavhalari: docs/XAVFSIZLIK.md dagi nginx sozlamasi bilan bir xil.
    // Dev serverda qo'yilmaydi, chunki HMR ichki skript ishlatadi.
    preview: { headers: SECURITY_HEADERS, proxy },
    build: {
      // Kichik shriftlar data: URI bo'lib CSS ichiga kirmasin: CSP font-src 'self'.
      assetsInlineLimit: (file) => (/\.(woff2?|ttf|otf)$/.test(file) ? false : undefined),
    },
  }
})
