# MOQT Test

KTRI malaka oshirish kurslari tinglovchilari uchun chiqish testi platformasi
(test.moqt.uz). Loyiha konteksti: [CLAUDE.md](CLAUDE.md), bosqichlar:
[docs/BOSQICHLAR.md](docs/BOSQICHLAR.md).

Bu repozitoriyda frontend bor. Backend alohida (Django), frontend barcha amallarni
unga `/api/v1/` so'rovlari orqali bajaradi. API hujjati: http://192.168.100.57/api/v1/docs/

## Ishga tushirish

Node.js 20 yoki undan yangi versiya kerak.

Birinchi marta bog'liqliklarni o'rnating:

```sh
cd frontend
npm install
```

Keyin `npm run dev` loyiha ildizida ham, `frontend/` ichida ham ishlaydi.
Sayt http://localhost:5173 manzilida ochiladi. `/api` so'rovlari dev server orqali
backendga (standart: http://192.168.100.57) uzatiladi.

## Boshqa backendga ulash

`frontend/.env.local` faylini yarating va dev serverni qayta ishga tushiring:

```sh
API_PROXY_TARGET=http://127.0.0.1:8000
```

Production'da frontend va API bitta domenda ishlaydi: nginx `dist/` ni beradi va
`/api` ni backendga uzatadi.

Backend javoblari sahifalar kutgan shaklga [frontend/src/api/adapters.js](frontend/src/api/adapters.js)
da keltiriladi.

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
| `npm run dev` | Ishlab chiqish serveri |
| `npm run build` | Production build |
| `npm run preview` | Tayyor buildni ko'rish |
| `npm run lint` | Kod tekshiruvi (oxlint) |

UI komponentlarini `npm run dev` rejimida `/admin/ui` sahifasida ko'rish mumkin.
