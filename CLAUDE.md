# test.moqt.uz — loyiha konteksti

Bu fayl Claude Code uchun doimiy kontekst. Har bir bosqich topshirig'i
(`docs/BOSQICHLAR.md`) berilishidan oldin shu fayl o'qilgan bo'ladi — bosqich
matnida platformani qaytadan tushuntirish shart emas.

## Platforma nima uchun kerak

MOQT Test — Kasbiy ta'limni rivojlantirish instituti (KTRI) malaka oshirish
kurslari tinglovchilarining **chiqish testini adolatli va haqqoniy o'tkazish**
uchun mustaqil veb-platforma.

Sabab: eski my.moqt.uz chiqish testida (50 savol / 75 daqiqa / o'tish chegarasi
28 ta to'g'ri javob) tinglovchilarning ~90% vaqtning yarmida tavakkal belgilab
chiqib, baribir 28 dan ko'p to'plagan. 4 variantli 50 savolga tasodifiy
belgilashda 28+ to'plash ehtimoli ~0,0003% — demak eski tizimda javob sizib
chiqishi yoki baholash xatosi bor. Yangi platformaning butun qiymati shu:
**to'g'ri javob hech qachon brauzerga yetib bormaydi, vaqt hech qachon
to'xtamaydi, test hech qachon boshidan boshlanmaydi.**

Platforma eski my.moqt.uz'ga **bog'liq emas** (u yerdan API olish imkoni yo'q):
savollar, guruhlar, login-parollar va natijalar shu platformaning o'zida.
Natijalar Excel/PDF protokol bilan chiqariladi.

## Rollar (3 ta)

| Rol | Vazifasi |
|---|---|
| Superadmin | Admin qila oladigan hamma narsa + adminlarni qo'shish, o'chirish, bloklash, ularning login va parolini o'zgartirish, amallar jurnalini ko'rish |
| Admin | Savollar banki, savol to'plamlari, guruhlar, tinglovchilar, login-parol generatsiyasi, testni ochish/yopish, chiqish paroli, natijalar va eksport |
| Tinglovchi | Faqat o'z guruhining testini topshirish va o'z natijasini ko'rish. Parolini o'zgartira olmaydi |

Platforma ochilishi bilan **faqat login oynasi** chiqadi (boshqa ochiq sahifa
yo'q). Login'dan keyin rolga qarab: superadmin/admin → `/admin`, tinglovchi →
`/test`.

## Asosiy jarayon

1. Admin savollarni bankka kiritadi (qo'lda, Excel/Word import yoki API manbadan).
2. Savollar **savol to'plamlari**ga guruhlanadi; to'plamda testdagi savollar
   soni, vaqt va o'tish chegarasi saqlanadi.
3. Admin guruh yaratadi, unga savol to'plamini biriktiradi, a'zolarni (Excel)
   yuklaydi va **login-parol generatsiya** qiladi → A4 varaqa (PDF) chop etiladi.
4. Test vaqtida admin guruh uchun **testni ochadi**. Tinglovchi kirib "Testni
   boshlash"ni bosadi → to'liq ekranli test boshlanadi.
5. Tugatganda yoki vaqt tugaganda server baholaydi → tinglovchi natijani ko'radi.
6. Admin **testni yopadi**, natijalarni ko'radi, shubhali urinishlarni tekshiradi,
   protokolni (Excel/PDF) yuklab oladi.

## DAXLSIZ QOIDALAR (hech qachon buzilmaydi)

Bular platformaning maqsadi. Har bir bosqichda shularga qarshi test yoziladi.

1. **To'g'ri javob hech qachon tinglovchiga ketadigan API javobida bo'lmaydi.**
   `is_correct` faqat admin serializerlarida. Tinglovchi uchun alohida
   serializer, alohida view.
2. **Variant ID'lari oshkor emas.** Tinglovchiga variantlar urinishga xos
   tasodifiy kalitlar bilan (`option_key`, masalan 8 belgili token) beriladi;
   haqiqiy `Option.id` ham, savol ID ham yuborilmaydi (admin to'g'ri javobni
   ko'pincha birinchi kiritadi → eng kichik ID to'g'ri javob bo'lib qoladi).
   Savolga tartib raqami (`n`, 1..50) orqali murojaat qilinadi.
3. **Savollar bitta-bitta beriladi**: `GET /attempts/{id}/questions/{n}/`.
   Butun variant birdaniga yuklanmaydi.
4. **Vaqt serverda.** "Boshlash"da `started_at` va `deadline_at = started_at +
   duration` bir marta yoziladi va o'zgarmaydi. Har bir javobda `server_now` va
   `deadline_at` qaytadi; klient faqat ko'rsatadi, hisoblamaydi.
5. **Urinish bitta.** Bir tinglovchi bir guruhda faqat bitta urinish boshlaydi.
   Qayta topshirish faqat admin ruxsati bilan (sabab yoziladi) va **yangi
   variant** bilan.
6. **Davom etish, qayta boshlanmaslik.** Sahifa yangilansa, brauzer yopilsa,
   internet uzilsa — qayta kirganda o'sha urinish, o'sha savol, qolgan vaqt.
7. **Vaqt tugasa — serverda yakunlanadi** (Celery beat har 30 soniyada +
   har qanday so'rovda "dangasa" tekshiruv). Klient yuborishini kutmaydi.
8. **Bitta faol seans.** Tinglovchi boshqa qurilmadan kirsa, eski seans
   bekor bo'ladi (`session_version` JWT ichida), hodisa jurnalga yoziladi.
9. **Baholash faqat serverda.** Ball klientdan hech qachon qabul qilinmaydi.
10. **Admin amallari jurnalga yoziladi**: kim, qachon, nima, qaysi obyekt, IP.
    Jurnal faqat qo'shiladi (append-only), tahrirlanmaydi va o'chirilmaydi.

## To'liq ekran va chiqish kaliti

Oddiy brauzer sahifani to'liq qulflay olmaydi (Esc, Alt+Tab, Win). Shuning
uchun:

- "Testni boshlash" bosilganda (user gesture) `document.documentElement
  .requestFullscreen()` va Chromium'da `navigator.keyboard?.lock?.(['Escape'])`
  (Esc'ni 2 soniya bosib turmasa chiqmaydi).
- `fullscreenchange` (chiqildi), `visibilitychange` (hidden), `blur` →
  savollar ustiga **"Testga qaytish" qatlami** (savol matni DOM'dan olib
  tashlanadi, shunchaki yashirilmaydi), `POST /attempts/{id}/events/`.
  Vaqt to'xtamaydi. "Testga qaytish" tugmasi qayta `requestFullscreen()`.
- Chiqishlar soni sozlamadagi chegaradan (standart 3) oshsa urinish
  `suspicious` deb belgilanadi — avtomatik jazo YO'Q.
- **Chiqish kaliti: `Ctrl + Alt + N`** (faqat test sahifasida `keydown`
  tinglanadi). `Ctrl + Shift + N` ISHLATILMAYDI — Chrome/Edge uni yashirin
  oyna uchun band qilgan, sahifa ushlay olmaydi. Kalit → "Chiqish paroli"
  modal → `POST /attempts/{id}/exit-unlock/` (guruhning chiqish paroli, server
  tekshiradi, 5 ta noto'g'ri urinishdan keyin 5 daqiqa blok) → to'g'ri bo'lsa
  `document.exitFullscreen()` va bu chiqish **qoidabuzarlik sanalmaydi**,
  lekin `exit_key_used` hodisasi yoziladi. Test baribir davom etadi.
- Matnni belgilash, nusxalash (`copy`/`cut`), o'ng tugma, chop etish
  (`@media print { body { display:none } }`) o'chiriladi.
- Telefon/kichik ekranda (< 1024px) test boshlanmaydi: "Kompyuterdan kiring".

## Texnologik stack

**Monorepo:**

```
moqt-test/
  CLAUDE.md
  docs/BOSQICHLAR.md
  design/              # dizayn ma'lumotnomasi (pastda)
  backend/             # Django
  frontend/            # React
  docker-compose.yml   # postgres, redis (dev)
```

**Backend:** Python 3.12, Django 5, DRF, PostgreSQL 16, Redis, Celery +
Celery beat, `djangorestframework-simplejwt`, `openpyxl` (Excel),
`python-docx` (Word import), `weasyprint` yoki `reportlab` (PDF),
`pytest-django`. Apps: `accounts`, `bank`, `groups`, `testing`, `audit`.
Vaqt zonasi `Asia/Tashkent`, `USE_TZ=True`.

**Frontend:** React 18 (**JavaScript .jsx, TypeScript emas**) + Vite +
Tailwind CSS + DaisyUI + Zustand + React Router v6 + Axios + lucide-react.
recharts faqat Natijalar sahifasida `React.lazy` bilan. Test sahifasi
(`/test`) alohida chunk, admin kodidan mustaqil va yengil.

Papkalar: `src/pages/{auth,test,admin}`, `src/components/{ui,admin,test}`,
`src/store`, `src/api` (bitta Axios instance + hooklar: `useGroups()`,
`useAttempt()` ...), `src/lib`.

## Dizayn tizimi — KTRI

Dizayn **KTRI dizayn tizimi** asosida (my.moqt.uz'dagi indigo/violet
`moqtlight` EMAS). `design/tokens.json` — manba. Tailwind/DaisyUI'da
`ktri` nomli custom tema:

| Token | Qiymat | Ishlatilishi |
|---|---|---|
| primary | `#1763a0` | Asosiy tugma, faol menyu, taymer |
| primary-focus / brand-900 | `#0f4a7c` | Hover, bosilgan, to'q tugma |
| secondary / brand-500 | `#0d7cbb` | Havola, fokus halqasi |
| accent / brand-400 | `#009adc` | Faqat bezak va 24px+ matn |
| base-100 (surface-card) | `#ffffff` | Karta, forma |
| base-200 (surface-page) | `#f4f8fd` | Sahifa foni |
| surface-muted | `#eaf2fa` | Nofaol/segment fon, stat bloklar |
| brand-soft | `#d9edf9` | Tanlangan qator, faol menyu foni, badge |
| base-300 (border-200) | `#e2eaf2` | Karta chegarasi, ajratuvchi |
| border-400 | `#7b93a8` | Input, ikkilamchi tugma chegarasi |
| base-content (ink-900) | `#10202e` | Asosiy matn |
| ink-600 | `#4a5b6b` | Ikkilamchi matn, yorliqlar |
| ink-400 | `#616f7d` | Placeholder |
| success | `#1a6f4a` (fon `#e5f4e4`) | O'tdi, faol |
| warning | `#8a5300` (fon `#f9eeda`) | Ogohlantirish |
| error | `#c0342c` (fon `#fbebeb`) | Xato, o'tmadi, shubhali |
| seal-navy | `#283770` | Faqat rasmiy hujjat (PDF varaqa) sarlavhasi |

- Shrift: **Manrope** (Google Fonts), zaxira `Segoe UI, system-ui`.
  Raqamli ma'lumot (login, parol, PINFL) — `IBM Plex Mono`.
- Radius: input/tugma 12px, karta 16px, katta panel 24px, badge 999px.
- Soya faqat 3 ta: control `0 1px 2px rgba(16,32,46,.06)`, card
  `0 12px 32px rgba(15,74,124,.10)`, raised `0 2px 6px rgba(15,74,124,.18)`.
- Ikonkalar: lucide-react, 18px, `strokeWidth={1.9}`. **Har bir tugmada
  ikonka** (CRUD, saqlash, bekor qilish, yopish ham) — matnli-only tugma yo'q.
  Tugma ichida ikonka matndan keyin turadi.
- `PageHeader` komponenti: oq karta, chap tomonda `brand-soft` fonli
  ikonka belgisi, sarlavha + tavsif, o'ngda amal tugmalari. Har bir admin
  sahifa shuni ishlatadi.
- `StatusBadge`: soft fon + kichik nuqta (masalan `bg-[#e5f4e4]
  text-[#1a6f4a]`), DaisyUI `badge` klassi emas.
- Xato holati rang + ikonka + matn bilan (faqat rang emas).
  Xato matni aybni foydalanuvchiga yuklamaydi va nima qilishni aytadi.
- Bo'sh/yuklanish/xato holatlari doim ikonka + qisqa matn.
- Barcha matn **o'zbek lotin**, apostrof oddiy `'`. Tugmalarda fe'l
  ("Saqlash", "Bekor qilish"), "OK"/"Submit" yo'q. Sarlavhada faqat birinchi
  harf bosh. Emoji yo'q.
- Animatsiya ≤ 150ms. Fokus doim ko'rinadi (`outline: 2px solid #0d7cbb`).
- Kontrast WCAG AA. Tugma/bosish maydoni ≥ 44px. Test ekranida variantlar
  ≥ 64px balandlik, 17px shrift.

## Dizayn ma'lumotnomasi (`design/`)

`design/screens/` ichida 16 ta ekran `.dc.html` fayl ko'rinishida. Bular
**ma'lumotnoma** — ishga tushirilmaydi, React'ga ko'chirilmaydi:

- Ichidagi `<x-dc>`, `<helmet>`, `<sc-for>`, `{{...}}`, `support.js` va
  `class Component extends DCLogic` — dizayn muharririning formati, e'tibor
  berma.
- Ulardan **layout, ranglar, o'lchamlar, matnlar, ikonkalar va holatlar**ni
  ol. `renderVals()` ichidagi massivlar — namuna ma'lumot (jadval qatorlari),
  ular API'dan keladi.
- Inline SVG ikonkalar lucide uslubida — React'da mos lucide-react ikonkasi
  ishlatiladi.

| Fayl | Ekran | Marshrut |
|---|---|---|
| `Main.dc.html` | Login | `/login` |
| `Kutish.dc.html` | Test kutish (test yopiq / Boshlash) | `/test` (holat: waiting) |
| `Test.dc.html` | To'liq ekranli test | `/test` (holat: active) |
| `Qaytish.dc.html` | "Testga qaytish" qatlami | `/test` overlay |
| `Modallar.dc.html` | Yakunlash tasdiqi + Chiqish paroli modallari | `/test` modallar |
| `Natija.dc.html` | Tinglovchi natijasi | `/test` (holat: finished) |
| `AdminPanel.dc.html` | Bosh panel | `/admin` |
| `SavollarBanki.dc.html` | Savollar banki | `/admin/savollar` |
| `SavolMuharriri.dc.html` | Savol muharriri (drawer) | `/admin/savollar` drawer |
| `Toplamlar.dc.html` | Savol to'plamlari | `/admin/toplamlar` |
| `Guruhlar.dc.html` | Guruhlar ro'yxati | `/admin/guruhlar` |
| `Guruh.dc.html` | Guruh sahifasi (jonli holat) | `/admin/guruhlar/:id` |
| `Varaqa.dc.html` | Login-parol varaqasi (A4) | backend PDF |
| `Natijalar.dc.html` | Natijalar va shubhali urinishlar | `/admin/natijalar` |
| `Adminlar.dc.html` | Adminlar (superadmin) | `/admin/adminlar` |
| `Jurnal.dc.html` | Amallar jurnali (superadmin) | `/admin/jurnal` |

Dizaynda yo'q holatlarni (bo'sh ro'yxat, yuklanish, xato, tasdiq oynalari)
shu uslubda o'zing qo'sh.

## Ma'lumotlar modeli (asos)

- `User` (custom): `username` (login), `password` (hash), `full_name`, `role`
  (`superadmin|admin|listener`), `pinfl` (tinglovchi, 14 raqam), `organization`,
  `group` (FK, tinglovchi), `is_active`, `session_version` (int).
- `QuestionSet`: `name`, `question_count`, `duration_minutes`, `pass_score`,
  `created_by`.
- `Question`: `question_set` FK, `text`, `image` (ixtiyoriy), `source`
  (`local|api`), `external_id` (API uchun, unikal), `is_active`.
- `Option`: `question` FK, `text`, `is_correct`. Har savolda 4 ta, bittasi to'g'ri.
- `Group`: `name` (unikal, masalan `2026-11-AKT-01`), `organization`,
  `question_set` FK, `test_status` (`closed|open|finished`), `opened_at`,
  `closed_at`, `scheduled_open_at`, `scheduled_close_at`,
  `exit_password_hash`, `login_prefix` (masalan `AKT01`).
- `Attempt`: `user`, `group`, `started_at`, `deadline_at`, `finished_at`,
  `status` (`active|finished|expired|terminated`), `finish_reason`,
  `correct_count`, `passed`, `current_n`, `fullscreen_exits`, `suspicious`
  (bool) + `suspicious_reasons` (JSON), `is_retake`, `retake_reason`.
- `AttemptQuestion`: `attempt`, `n` (1..N), `question` FK, `option_map`
  (JSON: `[{key, option_id}]` aralashtirilgan tartibda), `selected_option`
  FK null, `answered_at`, `time_spent_ms`.
- `AttemptEvent`: `attempt`, `type` (`fullscreen_exit|hidden|blur|return|
  reconnect|new_session|exit_key_used|exit_key_failed`), `at`, `meta` JSON.
- `AuditLog`: `actor`, `action`, `object_type`, `object_repr`, `ip`, `at`,
  `meta` JSON. Append-only.

## API kontrakti (`/api/v1/`)

Auth: `POST /auth/login/` → `{access, refresh, user:{id, full_name, role}}`,
`POST /auth/refresh/`, `GET /auth/me/`, `POST /auth/logout/`,
`POST /auth/change-password/` (admin/superadmin).

Superadmin: `GET/POST /admins/`, `PATCH/DELETE /admins/{id}/`
(login, yangi parol, `is_active`), `GET /audit/` (filtr: actor, action, sana).

Bank: `GET/POST /question-sets/`, `GET/PATCH/DELETE /question-sets/{id}/`;
`GET/POST /questions/` (filtr: set, source, is_active, q),
`GET/PATCH/DELETE /questions/{id}/`, `POST /questions/import/preview/`
(fayl → xatolar + namuna), `POST /questions/import/commit/`,
`POST /question-sets/{id}/sync-api/` (API adapter).

Guruhlar: `GET/POST /groups/`, `GET/PATCH /groups/{id}/`,
`GET /groups/{id}/members/` (jonli holat bilan), `POST /groups/{id}/members/`,
`POST /groups/{id}/members/import/preview|commit/`,
`POST /groups/{id}/credentials/` (barchaga yoki `user_ids` → PDF + JSON;
ochiq parol faqat shu javobda), `POST /groups/{id}/open/`,
`POST /groups/{id}/close/` `{mode: "let_finish"|"finish_now"}`,
`POST /groups/{id}/exit-password/`, `POST /groups/{id}/members/{uid}/retake/`
`{reason}`.

Tinglovchi: `GET /me/test/` → `{group, set:{name, question_count,
duration_minutes, pass_score}, test_status, attempt:{id, status} | null}`;
`POST /me/test/start/` → attempt; `GET /attempts/{id}/` →
`{status, n_total, current_n, answered:[n...], server_now, deadline_at}`; `GET /attempts/{id}/questions/{n}/` → `{n, text, image_url,
options:[{key, text}], selected_key}`;
`PUT /attempts/{id}/answers/{n}/` `{key, time_spent_ms}` (idempotent);
`POST /attempts/{id}/events/`;
`POST /attempts/{id}/exit-unlock/` `{password}`;
`POST /attempts/{id}/finish/`; `GET /attempts/{id}/result/` →
`{correct_count, n_total, percent, passed, duration_seconds}`.

Natijalar: `GET /results/?group=` (jadval + taqsimot + shubhalilar),
`GET /results/export.xlsx?group=`, `GET /results/protocol.pdf?group=`,
`GET /dashboard/`.

Xato javoblari bir xil shaklda: `{code, detail}` (`code` — mashina uchun,
`detail` — o'zbekcha matn). Muhim kodlar: `session_replaced`,
`attempt_expired`, `test_closed`, `already_started`, `exit_locked`.

## Umumiy tamoyillar

- Har bir bosqich oxirida: backend testlari (`pytest`) yashil, frontend
  `npm run build` xatosiz, DAXLSIZ QOIDALAR bo'yicha testlar o'tadi.
- Sozlamalar (`.env`): `EXIT_VIOLATION_LIMIT=3`, `FAST_ANSWER_MS=5000`,
  `ANSWER_GRACE_SECONDS=5`, `EXIT_KEY_MAX_TRIES=5`.
- Login urinishlari throttling bilan cheklanadi (5/daqiqa IP+login).
- Har bir admin amali `audit.log(request, action, obj, meta)` orqali.
- Kod izohlari va commit xabarlari o'zbek yoki ingliz tilida, interfeys matni
  faqat o'zbek lotin.
- Shubha bo'lsa — DAXLSIZ QOIDALAR va xavfsizlik tomonga qaror qil va
  menga qisqa yoz.

## Ishlash tartibi

Bosqichlar `docs/BOSQICHLAR.md` faylida (0–7). Har biri avvalgisi tugagach
boshlanadi. Har bosqich oxirida "Qabul mezonlari" bo'yicha o'zingni tekshir,
qisqa hisobot ber (nima qilindi, qanday tekshirish mumkin, ochiq savollar) va
keyingisiga o'tishdan oldin mening tasdig'imni kut.
