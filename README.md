# MOQT Test

KTRI malaka oshirish kurslari tinglovchilari uchun chiqish testi platformasi
(test.moqt.uz). Loyiha konteksti: [CLAUDE.md](CLAUDE.md), bosqichlar:
[docs/BOSQICHLAR.md](docs/BOSQICHLAR.md).

Bu repozitoriyda frontend bor, backendni boshqa dasturchi yozadi. Hozircha uning
o'rnida Vite dev server ichida ishlaydigan mock API turadi (`frontend/mock-api/`).
Mock `/api/v1/` kontraktiga amal qiladi, shuning uchun real backendga o'tishda kod
o'zgarmaydi.

## Ishga tushirish

Node.js 20 yoki undan yangi versiya kerak.

Birinchi marta bog'liqliklarni o'rnating:

```sh
cd frontend
npm install
```

Keyin `npm run dev` loyiha ildizida ham, `frontend/` ichida ham ishlaydi.
Sayt http://localhost:5173 manzilida ochiladi. Mock API shu buyruq bilan birga
ishlaydi, alohida ishga tushirilmaydi.

## Real backendga ulash

`frontend/.env.local` faylini yarating va dev serverni qayta ishga tushiring:

```sh
API_PROXY_TARGET=http://127.0.0.1:8000
```

Shundan keyin mock o'chadi va `/api` so'rovlari ko'rsatilgan manzilga ketadi. Faylni
olib tashlasangiz, mock qaytadi. Production'da frontend va API bitta domenda ishlaydi:
nginx `dist/` ni beradi va `/api` ni backendga uzatadi.

Backend quyidagilarga amal qilishi kerak: `CLAUDE.md` dagi kontrakt,
[docs/API_QOSHIMCHALAR.md](docs/API_QOSHIMCHALAR.md) va `frontend/mock-api/` testlari.

## Namuna hisoblar (faqat mock)

| Rol | Login | Parol | Sahifa |
|---|---|---|---|
| Superadmin | `superadmin` | `Super12345` | `/admin` |
| Admin | `admin` | `Admin12345` | `/admin` |
| Bloklangan admin | `nam_mom` | `Namangan2026` | kira olmaydi |
| Tinglovchi | `AKT01-017` | `Ab3dE9` | `/test` |

Birinchi guruhning (`2026-11-AKT-01`) chiqish paroli: `Chiqish1`.

Mock holati xotirada saqlanadi: dev server qayta ishga tushsa yoki
`mock-api/` dagi fayl o'zgarsa, boshlang'ich holatga qaytadi.

## Hujjatlar

| Fayl | Mazmuni |
|---|---|
| [docs/ADMIN_QOLLANMA.md](docs/ADMIN_QOLLANMA.md) | Admin uchun qo'llanma |
| [docs/SEB.md](docs/SEB.md) | Safe Exam Browser bilan ishlash |
| [docs/XAVFSIZLIK.md](docs/XAVFSIZLIK.md) | Xavfsizlik ko'rigi va Django uchun talablar |
| [docs/API_QOSHIMCHALAR.md](docs/API_QOSHIMCHALAR.md) | `CLAUDE.md` kontraktiga qo'shilgan API |

## Buyruqlar (`frontend/` ichida)

| Buyruq | Vazifasi |
|---|---|
| `npm run dev` | Ishlab chiqish serveri va mock API |
| `npm run build` | Production build |
| `npm run preview` | Tayyor buildni mock API bilan ko'rish |
| `npm run lint` | Kod tekshiruvi (oxlint) |
| `npm test` | Mock API testlari |

UI komponentlarini `npm run dev` rejimida `/admin/ui` sahifasida ko'rish mumkin.
