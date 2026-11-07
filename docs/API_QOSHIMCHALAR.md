# API kontraktiga qo'shimchalar

`CLAUDE.md` dagi kontraktdan tashqari frontend tayanadigan narsalar. Django yozilganda
mock (`frontend/mock-api/`) va uning testlari asosiy manba bo'ladi.

## Umumiy

- Validatsiya xatosi: `400 {code: "validation_error", detail, fields: {nom: "matn"}}`.
- Kutilmagan xato: `500 {code: "server_error", detail}`.
- Barcha javoblarda `Cache-Control: no-store`.

## Xato kodlari

| Kod | Holat | Qachon |
|---|---|---|
| `account_blocked` | 401 | Bloklangan hisob tokeni |
| `token_invalid` | 401 | Yaroqsiz yoki muddati o'tgan token, admin paroli almashgan |
| `invalid_credentials` | 401 | Login yoki parol noto'g'ri |
| `forbidden` | 403 | Rol mos emas |
| `throttled` | 429 | Login cheklovi, `retry_after` bilan |
| `question_in_use` | 409 | Ishlatilgan savolni o'chirish |
| `set_not_empty`, `set_in_use` | 409 | To'plamni o'chirish |
| `no_members` | 400 | A'zosiz guruhga generatsiya |
| `not_enough_questions` | 409 | Bankda savol yetmaydi |
| `no_attempt`, `attempt_active` | 409 | Retake va natija |
| `exit_wrong_password` | 400 | Chiqish paroli noto'g'ri |

`session_replaced` faqat tinglovchiga qaytadi.

## Auth

- `GET /auth/me/` javobida `username` ham bor.
- `POST /auth/change-password/` `{current_password, new_password}`, javobi yangi
  `{access, refresh}`: boshqa seanslar bekor bo'ladi, joriy seans davom etadi.

## Adminlar va jurnal

- `PATCH /admins/{id}/` `full_name` va `organization` ni ham qabul qiladi.
- `GET /audit/` `?actor=&action=&date=&page=` → `{count, page_size, results, filters:
  {actors, actions}}`. Yozuvda `actor_label` va `action_label` bor. Sana Toshkent bo'yicha.
- `GET /audit/export.xlsx` shu filtrlar bilan.
- Jurnal manzillariga `GET` dan boshqa so'rov `405`.

## Bank

- `GET /questions/` → `{count, page_size, results, totals: {all, local, api}}`.
- `GET /questions/{id}/` javobida `in_use`, `image_url`, `options`.
- `PATCH /questions/{id}/`: `in_use` savolda to'g'ri javobni o'zgartirish `400`.
- `POST` va `DELETE /questions/{id}/image/`, `GET /media/questions/{key}`.
- `GET /questions/import/template.xlsx`, `template.docx`.
- `POST /questions/import/preview/` → `{token, file_name, set_name, total, valid_count,
  problems, sample}`, `commit` `{token}` bilan, token bir martalik.
- `question-sets` javobida `active_count`, `total_count`, `groups`.

## Guruhlar

- `GET /groups/members/template.xlsx`.
- `GET /groups/{id}/` javobida `credentials_count`, `exit_password_set`, `set`.
- `PATCH /groups/{id}/` `scheduled_open_at`, `scheduled_close_at` ni qabul qiladi.
- `GET /groups/{id}/members/`: `live: {status, progress, fullscreen_exits, suspicious,
  can_retake}`.
- `POST /groups/{id}/credentials/` → `{count, credentials, pdf_base64, xlsx_base64}`.
- `POST /groups/{id}/exit-password/` → `{password}`.
- `POST /groups/{id}/close/` javobida `terminated`.

## Tinglovchi

- `GET /me/test/` javobida `retake_allowed` va `server_now`.
- `GET /attempts/{id}/` javobida `fullscreen_exits`, `exit_limit`.
- `GET /media/attempt/{key}`: urinishga xos rasm, test tugagach yopiladi.
- `POST /attempts/{id}/events/` → `{fullscreen_exits, exit_limit, server_now, deadline_at}`.
  Bir xil chiqishning `blur`, `hidden`, `fullscreen_exit` hodisalari 2 soniya ichida bitta
  sanaladi. Parol bilan ruxsat etilgan chiqishdan keyingi 10 soniya sanalmaydi.

## Natijalar

- `GET /results/` → `{group, set, chance_score, summary: {finished, passed}, distribution,
  suspicious, rows}`. `rows` da PINFL yashirilgan.
- `GET /dashboard/` → `{open_groups, working_now, finished_today, suspicious_count,
  open_tests}`.
