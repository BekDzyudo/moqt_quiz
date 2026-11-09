# Backend topshirig'i: test.moqt.uz

Bu hujjat backend dasturchisi uchun. Uni to'liq o'zingiz o'qib ishlashingiz yoki AI
yordamchisiga (Claude Code va boshqalar) prompt sifatida berishingiz mumkin. Frontend
tayyor va mock API bilan ishlaydi. Sizning vazifangiz shu mock o'rniga real Django
backend yozish, frontendda hech narsa o'zgartirmasdan.

---

## 1. Kontekst

**MOQT Test** — Kasbiy ta'limni rivojlantirish instituti (KTRI) malaka oshirish kursi
tinglovchilarining chiqish testini o'tkazadigan mustaqil veb-platforma.

Eski tizimda tinglovchilarning ~90% i vaqtning yarmida tavakkal belgilab, baribir o'tish
chegarasidan (50 dan 28) ko'p to'plagan. Tasodifan bunday natija ehtimoli ~0,0003%, demak
javob brauzerga sizib chiqqan yoki baholash xato bo'lgan. Yangi platformaning butun
qiymati uch narsada:

> **To'g'ri javob hech qachon brauzerga yetib bormaydi. Vaqt hech qachon to'xtamaydi.
> Test hech qachon boshidan boshlanmaydi.**

Platforma boshqa tizimlarga bog'liq emas: savollar, guruhlar, login-parollar va natijalar
shu yerda saqlanadi.

## 2. Repozitoriydan nimani o'qish kerak

Ishni boshlashdan oldin shu fayllarni o'qing. Ular shu hujjatdan ustun turadi:

| Fayl | Nima uchun |
|---|---|
| `CLAUDE.md` | Platforma, rollar, DAXLSIZ QOIDALAR, ma'lumotlar modeli, asosiy API kontrakti |
| `docs/API_QOSHIMCHALAR.md` | Frontend tayanadigan qo'shimcha maydonlar, xato kodlari, javob shakllari |
| `docs/BOSQICHLAR.md` | Bosqichlar va har birining qabul mezonlari |
| `docs/XAVFSIZLIK.md` | Xavfsizlik ko'rigi va "Django uchun talablar" ro'yxati, nginx sarlavhalari |
| `docs/SEB.md` | Safe Exam Browser bilan ishlash (ixtiyoriy kuchaytirish) |
| `frontend/mock-api/` | **Javob shakllarining aniq manbai.** Har bir endpoint `routes/*.js` da |
| `frontend/mock-api/*.test.js` | 314 ta test: xatti-harakatning bajariladigan spetsifikatsiyasi |
| `frontend/mock-api/testing/engine.js` | Test dvigateli: start, baholash, shubhali belgilar, beat |
| `design/screens/Varaqa.dc.html` | Login-parol varaqasi (PDF) dizayni |

Qoida: CLAUDE.md, `API_QOSHIMCHALAR.md` va mock bir-biriga zid bo'lsa, **mock va uning
testlari to'g'ri** (frontend aynan shunga moslab yozilgan). Ziddiyatni yozib qo'ying.

## 3. Asosiy maqsad va natija

1. `backend/` papkasida Django loyihasi, `/api/v1/` ostida mock bilan **bir xil** kontrakt.
2. `frontend/.env.local` ga `API_PROXY_TARGET=http://127.0.0.1:8000` yozilganda frontend
   mock o'rniga sizning backendingiz bilan to'liq ishlaydi.
3. `pytest` yashil. Har bir mock testining mazmuni pytest'da takrorlangan.
4. `docker compose up` bilan PostgreSQL, Redis, Django, Celery worker va beat ko'tariladi.
5. Joylashtirish yo'riqnomasi (nginx, HTTPS, zaxira nusxa).

### Real API talablari

Frontend mock'ka emas, sizning API'ingizga ulanadi. Shuning uchun:

- **8-bo'limdagi har bir endpoint ishlaydigan real API bo'lishi shart.** U PostgreSQL'dan
  o'qiydi va yozadi, stub yoki soxta javob qaytarmaydi. Yagona istisno `DummySource`,
  chunki haqiqiy savollar manbai hali yo'q.
- **Yo'llar, metodlar, maydon nomlari, turlari, HTTP holatlari va xato kodlari mock bilan
  aynan bir xil.** Masalan `active_count` ni `activeCount` deb yoki `409` ni `400` deb
  qaytarsangiz, frontend buziladi.
- **Kontraktdan chetga chiqish faqat kelishuv bilan.** O'zgarish kerak bo'lsa, avval
  yozing. Kelishilgandan keyin `docs/API_QOSHIMCHALAR.md` ga qo'shing.
- **Hech bir endpoint tashlab ketilmaydi.** Bajarib bo'lmasa, sababini hisobotda yozing.

### Topshiriladigan narsalar

1. **Ishlaydigan API manzili.** Sinov serveri, masalan `https://test.moqt.uz/api/v1/` yoki
   vaqtinchalik domen, va unga kirish uchun sinov hisoblari.
2. **OpenAPI hujjati** (`drf-spectacular`): `GET /api/v1/schema/` va Swagger UI
   `/api/v1/docs/` (faqat admin yoki dev muhitida ochiq). Har endpointda so'rov va javob
   namunasi bo'lsin.
3. **Endpointlar jadvali** (`docs/API_HOLATI.md`): 8-bo'limdagi har bir endpoint uchun
   holat (tayyor/qisman/yo'q), uni qamraydigan pytest nomi va mock'dan farqi (bo'lsa).
4. **Kontrakt testi.** Har bir endpoint uchun mock javobi bilan sizning javobingizning
   kalitlari va turlarini solishtiradigan test yoki skript. Mock'ni Node'da ishga
   tushirib solishtirsa bo'ladi (`frontend/mock-api/app.js` dagi `createMockApi`).
5. **Seed buyrug'i** (`python manage.py seed_demo`): 14-bo'limdagi namuna hisoblar va
   bir nechta to'plam/guruh. Frontend shu ma'lumot bilan sinaladi.
6. Kod `backend/` papkasida, `README` dagi buyruqlar bilan ishga tushadi, `.env.example`
   bor.

## 4. Texnologiyalar

- Python 3.12, Django 5, Django REST Framework, PostgreSQL 16, Redis.
- Celery + Celery beat.
- `djangorestframework-simplejwt` (refresh rotatsiyasi va blacklist bilan).
- `openpyxl` (Excel import/eksport), `python-docx` (Word import),
  `weasyprint` yoki `reportlab` (PDF).
- `pytest-django`, `factory_boy` (ixtiyoriy), Locust (yuklama sinovi).
- Vaqt zonasi `Asia/Tashkent`, `USE_TZ=True`. API'da sanalar ISO 8601 UTC.
- App'lar: `accounts`, `bank`, `groups`, `testing`, `audit`.

Tuzilma:

```
backend/
  config/            # settings (base/dev/prod), urls, celery
  accounts/          # User, auth, adminlar
  bank/              # QuestionSet, Question, Option, import, sources/
  groups/            # Group, a'zolar, login-parol, varaqa PDF
  testing/           # Attempt, AttemptQuestion, AttemptEvent, dvigatel, beat
  audit/             # AuditLog, audit.log(), jurnal API
  templates_import/  # Excel va Word shablonlari
docker-compose.yml   # loyiha ildizida: postgres, redis, backend, worker, beat
```

## 5. DAXLSIZ QOIDALAR

Bular platformaning maqsadi. Har biriga alohida pytest yozing. Buzilgan qoida bilan
topshiriq qabul qilinmaydi.

1. **To'g'ri javob tinglovchiga ketadigan hech qaysi API javobida yo'q.** `is_correct`
   faqat admin serializerlarida. Tinglovchi uchun alohida serializer va alohida view.
2. **Variant va savol ID'lari oshkor emas.** Tinglovchi variantlarni urinishga xos
   tasodifiy `key` (8 belgili token) bilan oladi. Haqiqiy `Option.id` va `Question.id`
   yuborilmaydi. Savolga tartib raqami `n` (1..N) bilan murojaat qilinadi.
3. **Savollar bitta-bitta:** `GET /attempts/{id}/questions/{n}/`. Butun variant birdaniga
   berilmaydi.
4. **Vaqt serverda.** Boshlashda `started_at` va `deadline_at = started_at + duration` bir
   marta yoziladi va hech qachon o'zgarmaydi. Har javobda `server_now` va `deadline_at`.
5. **Urinish bitta.** Qayta topshirish faqat admin ruxsati bilan (sabab yoziladi) va
   **yangi variant** bilan. Eski urinish o'chirilmaydi.
6. **Davom etish.** Sahifa yangilansa, brauzer yopilsa, internet uzilsa: o'sha urinish,
   o'sha savol, qolgan vaqt.
7. **Vaqt tugasa serverda yakunlanadi:** Celery beat har 30 soniyada va har qanday
   urinish so'rovida "dangasa" tekshiruv. Klientni kutmaydi.
8. **Bitta faol seans.** Tinglovchi boshqa qurilmadan kirsa, eskisi bekor bo'ladi
   (`session_version` JWT ichida), hodisa yoziladi, eski seans `session_replaced` oladi.
9. **Baholash faqat serverda.** Ball klientdan qabul qilinmaydi.
10. **Admin amallari jurnalga yoziladi:** kim, qachon, nima, qaysi obyekt, IP.
    Jurnal append-only: API, Django admin va ORM orqali ham tahrirlanmaydi, o'chirilmaydi.

## 6. Rollar

| Rol | Huquqlar |
|---|---|
| `superadmin` | Admin qila oladigan hamma narsa + adminlarni boshqarish va amallar jurnali |
| `admin` | Bank, to'plamlar, guruhlar, tinglovchilar, login-parol, testni ochish/yopish, chiqish paroli, natijalar |
| `listener` | Faqat o'z guruhining testi va o'z natijasi. Parolini o'zgartira olmaydi |

Rol tekshiruvini **matritsa testi** bilan qamrang: barcha marshrutlar ro'yxati, tokensiz
so'rov `401`, begona rol `403`. Yangi marshrut qo'shilsa testga avtomatik tushsin
(`frontend/mock-api/security.test.js` ga qarang). Begona urinish yoki obyekt `404`
(mavjudligi bilinmasin).

## 7. Ma'lumotlar modeli

`CLAUDE.md` dagi model asos. Qo'shimcha eslatmalar:

- `User`: `username`, `password` (Argon2 yoki PBKDF2), `full_name`, `role`, `pinfl`
  (14 raqam), `organization`, `group` (FK), `is_active`, `session_version`.
- `Option`: har savolda aniq 4 ta, aniq bittasi `is_correct`. Bo'sh matn yo'q.
- `Question.in_use`: testda ishlatilgan savolni o'chirib bo'lmaydi (`409
  question_in_use`), faqat nofaol qilinadi. To'g'ri javobini ham o'zgartirib bo'lmaydi.
- `Question.image`: tinglovchiga tasodifiy 128 bitli kalit bilan beriladi
  (`/api/v1/media/attempt/{key}`), test tugagach yopiladi. Tokensiz ID bilan ochilmaydi.
- `Group.question_set`: test ochilgandan keyin almashtirib bo'lmaydi.
- `Group.exit_password_hash`: ochiq qiymat faqat generatsiya javobida bir marta.
- `AttemptQuestion.option_map`: `[{key, option_id}]` aralashtirilgan tartibda.
- `AuditLog`: append-only. Model darajasida `save()` (mavjud yozuv) va `delete()` taqiqlang.

## 8. API kontrakti

Hamma yo'llar `/api/v1/` ostida va `/` bilan tugaydi. Autentifikatsiya:
`Authorization: Bearer <access>`. Barcha javoblarda `Cache-Control: no-store`.
Javob shakllari uchun mock'dagi tegishli marshrutni oching, quyida qisqa ro'yxat.

### Auth (`routes/auth.js`)

| Endpoint | Izoh |
|---|---|
| `POST /auth/login/` | `{username, password}` → `{access, refresh, user: {id, full_name, role}}`. 5 urinish/daqiqa IP+login, `429 throttled` + `retry_after` |
| `POST /auth/refresh/` | Rotatsiya, eski refresh blacklist'ga |
| `GET /auth/me/` | `username` ham bor |
| `POST /auth/logout/` | Refresh bekor qilinadi |
| `POST /auth/change-password/` | Admin/superadmin. `{current_password, new_password}` → yangi `{access, refresh}`, boshqa seanslar bekor |

Access 30 daqiqa, refresh 12 soat (mock'dagi qiymatlar).

### Adminlar va jurnal, faqat superadmin (`routes/admins.js`, `routes/audit.js`)

- `GET/POST /admins/`, `PATCH/DELETE /admins/{id}/`: login unikal, parol kamida 8 belgi,
  `full_name`, `organization`, `is_active`. Bloklangan admin kira olmaydi, mavjud tokenlari
  keyingi so'rovda `401 account_blocked`.
- `GET /audit/?actor=&action=&date=&page=` → `{count, page_size, results, filters:
  {actors, actions}}`. Yozuvda `actor_label`, `action_label`. Sana Toshkent bo'yicha.
- `GET /audit/export.xlsx` shu filtrlar bilan. Jurnalga `GET` dan boshqa so'rov `405`.
- Amal kodlari va o'zbekcha nomlari: `routes/audit.js` dagi `ACTION_LABELS`.

### Bank (`routes/bank.js`, `routes/import.js`)

- `GET/POST /question-sets/`, `GET/PATCH/DELETE /question-sets/{id}/`. Javobda
  `active_count`, `total_count`, `groups` (guruh nomlari). O'chirishda `409
  set_not_empty` yoki `set_in_use`.
- `GET/POST /questions/` (filtr: `set`, `source`, `is_active`, `q`, `page`) →
  `{count, page_size, results, totals: {all, local, api}}`.
- `GET/PATCH/DELETE /questions/{id}/`, javobda `in_use`, `image_url`, `options`.
- `POST/DELETE /questions/{id}/image/` (2 MB gacha, tur **fayl imzosi** bo'yicha,
  SVG rad etiladi), `GET /media/questions/{key}` (admin ko'rishi uchun).
- Import: `GET /questions/import/template.xlsx` va `template.docx`;
  `POST /questions/import/preview/` (multipart: `file`, `question_set`, 5 MB gacha) →
  `{token, file_name, set_name, total, valid_count, problems, sample}`;
  `POST /questions/import/commit/` `{token}` → `{created}`. Token bir martalik.
  - Excel: `savol | A | B | C | D | to'g'ri (A/B/C/D)`, birinchi qator sarlavha.
  - Word: raqamlangan savol, keyin `A)`…`D)`, to'g'ri variant oldida `*` yoki qalin.
  - Takror: to'plam ichida matn normallashtirilib solishtiriladi.
  - Parser mantiqi: `frontend/mock-api/import/parsers.js`.
- `POST /question-sets/{id}/sync-api/`: `bank/sources/base.py` da `QuestionSource`
  interfeysi (`fetch(question_set) -> list[QuestionDTO]`) va `DummySource`.
  `external_id` bo'yicha upsert, `source="api"`, ikki marta chaqirilsa takror yaratmaydi.
  Ishlatilgan savolning to'g'ri javobi API'dan ham o'zgarmaydi.

### Guruhlar (`routes/groups.js`)

- `GET/POST /groups/` (filtr `q`, `status`), `GET/PATCH /groups/{id}/`. Ro'yxatda
  `question_set`, `set_name`, `test_status`, `member_count`, `finished_count`.
  Batafsil javobda `credentials_count`, `exit_password_set`, `set`.
- `PATCH` qisman yangilashni qabul qiladi (frontend to'plam biriktirishda faqat
  `{question_set}` yuboradi). Ochiq yoki yakunlangan guruhda to'plamni almashtirish:
  `400 validation_error`, `fields.question_set` da sabab. `scheduled_open_at`,
  `scheduled_close_at` ham qabul qilinadi (Celery beat bajaradi).
- Login prefiksi login yaratilgandan keyin o'zgarmaydi.
- `GET /groups/{id}/members/`: har a'zoda `live: {status, progress, fullscreen_exits,
  suspicious, can_retake, retake_pending, previous}`. Frontend har 5 soniyada so'raydi,
  so'rov arzon bo'lsin (N+1 yo'q).
- `POST /groups/{id}/members/` (F.I.Sh., PINFL, tashkilot). PINFL 14 raqam, guruh ichida
  takror bo'lmaydi; boshqa faol guruhda bo'lsa ogohlantirish (`warning`), rad etish emas.
- `GET /groups/members/template.xlsx`, `POST /groups/{id}/members/import/preview/`
  (`.xlsx`, 5 MB gacha) va `commit/` `{token}`. Ustunlar: `F.I.Sh. | PINFL | Tashkilot`.
- `POST /groups/{id}/credentials/` (barchaga yoki `{user_ids}`) → `{count, credentials,
  pdf_base64, xlsx_base64}`. Login `{login_prefix}-{tartib 3 xonali}` (`AKT01-017`),
  parol 6 belgi, `secrets`, alifbo
  `ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789`. Bazada faqat hash. Qayta
  generatsiya eski parolni bekor qiladi. A'zo yo'q: `400 no_members`.
  PDF: A4, 2 ustun × 5 qator kesiladigan kartochka, sarlavha `#283770`, sahifa raqami.
- `POST /groups/{id}/exit-password/` (generatsiya yoki qo'lda, kamida 6 belgi) →
  `{password}`.
- `POST /groups/{id}/open/`. Bankda faol savol yetmasa `409 not_enough_questions`.
- `POST /groups/{id}/close/` `{mode: "let_finish" | "finish_now"}` → javobda
  `terminated` (to'xtatilgan urinishlar soni).
- `POST /groups/{id}/members/{uid}/retake/` `{reason}`. Urinish yo'q `409 no_attempt`,
  faol urinish bor `409 attempt_active`.

### Tinglovchi (`routes/attempts.js`)

- `GET /me/test/` → `{group: {name}, set: {name, question_count, duration_minutes,
  pass_score}, test_status, attempt: {id, status} | null, retake_allowed, server_now}`.
- `POST /me/test/start/` → urinish (pastdagi shakl).
- `GET /attempts/{id}/` → `{id, status, n_total, current_n, answered: [n...],
  fullscreen_exits, exit_limit, server_now, deadline_at}`.
- `GET /attempts/{id}/questions/{n}/` → `{n, text, image_url, options: [{key, text}],
  selected_key, server_now, deadline_at}`. So'rov `current_n` ni yangilaydi.
- `PUT /attempts/{id}/answers/{n}/` `{key | null, time_spent_ms}`: idempotent, bir xil
  so'rov qayta kelsa vaqt ikki marta qo'shilmaydi. `time_spent_ms` testning o'tgan
  vaqtidan oshmaydi. Noma'lum `key` → `400 validation_error`.
  `now > deadline_at + ANSWER_GRACE_SECONDS` → `409 attempt_expired`.
- `POST /attempts/{id}/events/` `{type, meta}` → `{fullscreen_exits, exit_limit,
  server_now, deadline_at}`. Turlar: `fullscreen_exit, hidden, blur, return, reconnect,
  exit_key_used, exit_key_failed`. Bitta chiqishning `blur`, `hidden`,
  `fullscreen_exit` hodisalari **2 soniya ichida bitta** sanaladi. Parol bilan ruxsat
  etilgan chiqishdan keyingi **10 soniya** sanalmaydi.
- `POST /attempts/{id}/exit-unlock/` `{password}`: noto'g'ri `400 exit_wrong_password`,
  5 noto'g'ri urinishdan keyin 5 daqiqa `423 exit_locked` + `retry_after`. Har urinish
  hodisa sifatida yoziladi. To'g'ri parol qoidabuzarlik sanalmaydi.
- `POST /attempts/{id}/finish/`, `GET /attempts/{id}/result/` → `{correct_count, n_total,
  percent, passed, duration_seconds}`. Javob ham, `suspicious` ham tinglovchiga
  chiqmaydi.
- `GET /media/attempt/{key}`: urinish rasmi, faqat egasi va faqat test davomida.
- **`PUT /attempts/{id}/flags/{n}/` ni yozmang:** mock'da qolgan, kontraktdan olib
  tashlangan. `flagged` maydonlari ham kerak emas.

### Natijalar va bosh panel (`routes/results.js`)

- `GET /results/?group=` → `{group, set, chance_score, summary: {finished, passed},
  distribution, suspicious, rows}`. `rows` da PINFL yashirilgan. Har qatorda `attempts`:
  barcha urinishlar `{label, status, correct_count, n_total, percent, duration_seconds,
  passed, retake_reason}`. Qator, `summary` va `distribution` oxirgi urinish bo'yicha.
- `GET /results/suspicious/` → barcha guruhlardagi shubhali urinishlar `[{id, full_name,
  group: {id, name}, score, reasons}]`, retake'dan oldingilari ham.
- `GET /results/export.xlsx?group=`, `GET /results/protocol.pdf?group=`: har urinish
  alohida qator.
- `GET /dashboard/` → `{open_groups, working_now, finished_today, suspicious_count,
  open_tests}`. `suspicious_count` = `/results/suspicious/` uzunligi.

## 9. Xato javoblari

Har qanday xato bir xil shaklda: `{code, detail}`. `code` mashina uchun, `detail`
o'zbekcha (lotin) matn: aybni foydalanuvchiga yuklamaydi va nima qilishni aytadi.

- Validatsiya: `400 {code: "validation_error", detail, fields: {nom: "matn"}}`.
  DRF'ning standart `{field: [..]}` shakli ishlamaydi, exception handler yozing.
- Kutilmagan xato: `500 {code: "server_error", detail}`, ichki ma'lumotsiz.
- Fayl qaytaradigan endpointlar xato bo'lsa `application/json` qaytaradi.

| Kod | HTTP | Qachon |
|---|---|---|
| `invalid_credentials` | 401 | Login yoki parol noto'g'ri |
| `token_invalid` | 401 | Yaroqsiz/eskirgan token, admin paroli almashgan |
| `account_blocked` | 401 | Bloklangan hisob |
| `session_replaced` | 401 | Tinglovchi boshqa qurilmadan kirgan (faqat tinglovchiga) |
| `forbidden` | 403 | Rol mos emas |
| `throttled` | 429 | Cheklov, `retry_after` bilan |
| `test_closed` | 409 | Test ochilmagan |
| `already_started` | 409 | Urinish allaqachon bor |
| `attempt_expired` | 409 | Muddat o'tgan |
| `not_enough_questions` | 409 | Bankda savol yetmaydi |
| `question_in_use` | 409 | Ishlatilgan savolni o'chirish |
| `set_not_empty`, `set_in_use` | 409 | To'plamni o'chirish |
| `no_members` | 400 | A'zosiz guruhga generatsiya |
| `no_attempt`, `attempt_active` | 409 | Retake |
| `exit_wrong_password` | 400 | Chiqish paroli noto'g'ri |
| `exit_locked` | 423 | Chiqish paroli bloklangan, `retry_after` bilan |

Frontend `detail` ni to'g'ridan-to'g'ri ko'rsatadi. Matnlar uchun mock'dagi tayyor
o'zbekcha xabarlardan foydalaning.

## 10. Test dvigateli qoidalari (`testing/engine.js`)

**Sozlamalar** (`.env`):

```
EXIT_VIOLATION_LIMIT=3
FAST_ANSWER_MS=5000
ANSWER_GRACE_SECONDS=5
EXIT_KEY_MAX_TRIES=5
EXIT_LOCK_SECONDS=300
SAME_WRONG_ANSWERS=10
EXIT_EVENT_WINDOW_MS=2000
EXIT_KEY_WINDOW_MS=10000
```

**Start:**
- faqat `test_status=open`, faol urinish yo'q yoki admin retake bergan;
- `select_for_update` (yoki unikal cheklov) bilan: parallel ikki so'rov bitta urinish
  yaratadi;
- to'plamdan `question_count` ta faol savol tasodifiy tanlanadi, tartibi aralashtiriladi;
  har savol variantlari aralashtirilib, `secrets` bilan yaratilgan `key` lar bilan
  `option_map` ga yoziladi;
- `deadline_at = started_at + duration_minutes`.

**Yakunlash:** `finish`, muddat o'tishi (`expired`), `close finish_now` (`terminated`).
`correct_count` hisoblanadi, `passed = correct_count >= pass_score`, `finish_reason`
yoziladi. Beat har 30 soniyada muddati o'tganlarni yopadi, rejalashtirilgan
ochish/yopishni bajaradi. Ochish muvaffaqiyatsiz bo'lsa jurnalga `test_open_failed`.

**Shubhali belgilar** (`suspicious=True`, `suspicious_reasons: [{code, detail}]`,
avtomatik jazo YO'Q):
- `too_many_exits`: chiqishlar `EXIT_VIOLATION_LIMIT` dan ko'p;
- `fast_answers`: `passed` va javoblarning ≥ 50% i `FAST_ANSWER_MS` dan tez;
- `same_wrong_{id}`: guruhdagi boshqa urinish bilan ≥ `SAME_WRONG_ANSWERS` ta bir xil
  noto'g'ri javob (ikkalasiga belgi qo'yiladi).

**Seans:** tinglovchi qayta login qilganda `session_version += 1`, eski token
`401 session_replaced`, urinishga `new_session` hodisasi.

## 11. Xavfsizlik talablari

`docs/XAVFSIZLIK.md` dagi "Django uchun talablar" ro'yxatini to'liq bajaring. Asosiylari:

- Parollar Django hasher bilan, JWT sirlari `.env` da, refresh rotatsiyasi va blacklist.
- Rate limit: login, refresh, change-password, import, exit-unlock.
- Mavjud bo'lmagan login uchun ham xesh hisoblansin (vaqt farqidan login bilinmasin).
- So'rov hajmi cheklangan, `.xlsx` va `.docx` zip-bomba himoyasi, media papkasidan kod
  bajarilmaydi, rasm turi fayl imzosi bo'yicha.
- Excel eksportlarda formula injection himoyasi: `=`, `+`, `-`, `@`, tab, CR bilan
  boshlangan qiymat oldiga `'` (mock'dagi `excel-safe.js`). PDF'da HTML kiritilmaydi.
- IDOR: begona urinish, guruh, rasm `404`.
- `DEBUG=False`, `ALLOWED_HOSTS`, `SECURE_SSL_REDIRECT`, HSTS, CORS kerak emas
  (frontend va API bitta domenda).
- nginx sarlavhalari va CSP: `docs/XAVFSIZLIK.md` oxirida. CSP tufayli rasmlar faqat
  o'z domenidan.
- Ixtiyoriy: SEB'ning Browser Exam Key sarlavhasini tekshirish (`docs/SEB.md`).

## 12. Ishlash tartibi

Har bosqich oxirida `pytest` yashil bo'lsin, frontendni backendga ulab ekranlarni
qo'lda sinang va qisqa hisobot bering.

1. **Karkas:** Django, settings, Docker, custom `User`, JWT auth, `session_version`,
   xato handler, `audit.log(request, action, obj, meta)`, rol matritsasi testi.
2. **Adminlar va jurnal.**
3. **Bank va to'plamlar:** CRUD, rasm, Excel/Word import, `sync-api`.
4. **Guruhlar:** a'zolar, import, login-parol (PDF + Excel), chiqish paroli.
5. **Test dvigateli:** start, savollar, javoblar, hodisalar, exit-unlock, yakunlash,
   beat, retake, shubhali belgilar. Eng muhim bosqich.
6. **Monitoring va natijalar:** members `live`, results, eksport, protokol, dashboard.
7. **Yuklama va joylashtirish:** Locust, nginx, HTTPS, zaxira nusxa.

## 13. Qabul mezonlari

- [ ] 8-bo'limdagi har bir endpoint real API sifatida ishlaydi, `docs/API_HOLATI.md`
      da hammasi "tayyor", kontrakt testi mock bilan farq topmaydi.
- [ ] OpenAPI sxemasi va Swagger UI ochiladi, sinov server manzili berilgan.
- [ ] Frontend `API_PROXY_TARGET` bilan barcha ekranlarda xatosiz ishlaydi: login, uch
      rol, bank, import, guruh, login-parol PDF, test, monitoring, natijalar, eksport.
- [ ] Barcha tinglovchi endpointlari JSON'ini **rekursiv** tekshiradigan test:
      `is_correct`, `option_id`, `question_id`, `suspicious` yo'q.
- [ ] Ikki tinglovchining variantlari farq qiladi; 1000 generatsiyada to'g'ri javob
      pozitsiyasi A/B/C/D bo'yicha 25% ± 5%.
- [ ] Hamma savolga birinchi variantni belgilagan bot o'rtacha ~25% oladi.
- [ ] Parallel ikki `start` → bitta urinish.
- [ ] `deadline_at` o'zgarmaydi; muddatdan keyin javob qabul qilinmaydi; beat'siz ham
      keyingi so'rovda urinish `expired`.
- [ ] Retake'siz ikkinchi urinish yo'q; retake yangi variant beradi, eski natija saqlanadi.
- [ ] Boshqa qurilmadan kirish eski seansni bekor qiladi.
- [ ] Bazada ochiq parol yo'q; qayta generatsiyadan keyin eski parol ishlamaydi.
- [ ] 300 qatorlik Excel va Word shablon import qilinadi, xatolar qator raqami bilan.
- [ ] `sync-api` ikki marta chaqirilsa takror yaratmaydi.
- [ ] Jurnal yozuvini o'zgartirib yoki o'chirib bo'lmaydi.
- [ ] Rol matritsasi: tokensiz `401`, begona rol `403`, begona obyekt `404`.
- [ ] Locust: 500 tinglovchi, javob saqlash p95 < 500 ms, xato 0%.
- [ ] `npm test` (mock, 314 ta) dagi har bir xatti-harakat pytest'da bor.

## 14. Frontendni backendga ulash

```sh
# frontend/.env.local
API_PROXY_TARGET=http://127.0.0.1:8000

cd frontend
npm install
npm run dev        # http://localhost:5173, /api so'rovlari backendga ketadi
```

Production'da nginx `frontend/dist` ni beradi va `/api/` ni Django'ga proksi qiladi.
Namuna hisoblar (mock'dagi): `superadmin / Super12345`, `admin / Admin12345`,
tinglovchi `AKT01-017 / Ab3dE9`. Backend'da shunga o'xshash `seed` buyrug'i bo'lsa,
frontend e2e sinovlari qulay bo'ladi.

## 15. Ochiq savollar (javobini buyurtmachidan oling)

1. Adminlar barcha guruhlarni ko'radi. Hududiy (tashkilot bo'yicha) ajratish kerakmi?
2. Refresh token `HttpOnly` cookie'ga o'tkaziladimi? Hozir frontend tokenlarni
   `sessionStorage` da saqlaydi.
3. Haqiqiy savollar API manbai (`QuestionSource`) qachon va qanday formatda bo'ladi?
4. Shriftlar serverdan beriladimi (internet cheklangan xonalar uchun)?
5. Server, domen va zaxira nusxa joyi.

Kontraktga zid yoki noaniq joy topsangiz, o'zingiz qaror qilmasdan oldin DAXLSIZ
QOIDALAR va xavfsizlik tomonga hal qiling va buni hisobotda yozing.
