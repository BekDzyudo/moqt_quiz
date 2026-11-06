# test.moqt.uz — ishlab chiqish bosqichlari

Har bir bosqichni alohida topshiriq sifatida bajar. Kontekst — `CLAUDE.md`,
dizayn — `design/screens/`. Bosqich oxirida "Qabul mezonlari"ni tekshir,
qisqa hisobot ber va tasdiqni kut.

---

## 0-bosqich. Karkas, tema va kirish

**Vazifa**

1. Monorepo strukturasini yarat (`backend/`, `frontend/`, `docker-compose.yml`
   — postgres 16, redis 7). `README.md`da ishga tushirish buyruqlari.
2. Backend: Django 5 + DRF loyihasi (`config`), app'lar: `accounts`, `bank`,
   `groups`, `testing`, `audit`. `.env` orqali sozlamalar, `Asia/Tashkent`,
   pytest-django.
3. `accounts.User` (custom, `CLAUDE.md`dagi maydonlar). JWT (simplejwt):
   access 30 daqiqa, refresh 12 soat; token ichida `role` va `sv`
   (`session_version`). Custom authentication klassi `sv` mos kelmasa
   `401 {code: "session_replaced"}` qaytaradi. Tinglovchi login qilganda
   `session_version += 1`.
4. `POST /auth/login|refresh|logout`, `GET /auth/me/`. Login throttling.
   `createsuperuser` o'rniga `python manage.py create_superadmin` buyrug'i.
5. `audit.AuditLog` + `audit.log()` yordamchi funksiyasi; login/logout yoziladi.
6. Frontend: Vite + React 18 (.jsx) + Tailwind + DaisyUI, `ktri` temasi
   (`CLAUDE.md` jadvali), Manrope va IBM Plex Mono shriftlari.
7. UI asoslari `src/components/ui/`: `Button` (variant: primary, secondary,
   danger, ghost; ikonka majburiy prop), `PageHeader`, `StatusBadge`,
   `Card`, `DataTable` (bo'sh/yuklanish/xato holatlari bilan), `Modal`,
   `Drawer`, `Field` (label + input + xato), `EmptyState`.
8. Axios instance (`src/api/client.js`): access token header, 401'da refresh,
   `session_replaced`da "Siz boshqa qurilmadan kirdingiz" xabari bilan login'ga.
9. Router: `/login`; `/test` (faqat tinglovchi); `/admin/*` (admin va
   superadmin, `AdminLayout` — sidebar `AdminPanel.dc.html`dagidek,
   "SUPERADMIN" bo'limi faqat superadmin'ga). Noto'g'ri rol → o'z sahifasiga.
10. Login sahifasi — `design/screens/Main.dc.html` bo'yicha: chap brend paneli
    (55fr), o'ng forma (45fr, max 404px), < 1080px'da bitta ustun, xato holati.

**Qabul mezonlari**

- [ ] `docker compose up` + `README` buyruqlari bilan backend va frontend ishga tushadi.
- [ ] Superadmin, admin va tinglovchi login qiladi va o'z sahifasiga tushadi;
      boshqa rol sahifasiga URL orqali kira olmaydi.
- [ ] Tinglovchi ikkinchi brauzerda kirsa, birinchisi keyingi so'rovda
      login'ga qaytadi va xabar ko'radi (pytest bilan ham tekshirilgan).
- [ ] Login sahifasi dizaynga mos (ranglar, shrift, o'lchamlar), 320px'da ham
      to'liq ko'rinadi.
- [ ] 6 ta noto'g'ri login urinishidan keyin throttling ishlaydi.
- [ ] `pytest` yashil, `npm run build` xatosiz.

---

## 1-bosqich. Adminlar va amallar jurnali (superadmin)

**Vazifa**

1. `GET/POST /admins/`, `PATCH/DELETE /admins/{id}/` — faqat superadmin.
   Login unikal, parol kamida 8 belgi; "Parol generatsiya qilish" (12 belgi).
   O'chirish — yumshoq (`is_active=False`) yoki haqiqiy, tasdiq bilan.
   Bloklangan admin login qila olmaydi, mavjud tokenlari bekor bo'ladi.
2. `POST /auth/change-password/` — admin o'z parolini o'zgartiradi.
3. `GET /audit/` — filtr: actor, action, sana; sahifalash; Excel eksport.
4. Ekranlar: `Adminlar.dc.html` (jadval + o'ngda tahrirlash formasi;
   "Admin qo'shish" modal), `Jurnal.dc.html` (filtrlar + jadval, amal turiga
   qarab rangli badge).
5. Har bir superadmin amali jurnalga yoziladi.

**Qabul mezonlari**

- [ ] Admin `/admins/` va `/audit/` endpointlariga kira olmaydi (403) — test bor.
- [ ] Admin paroli o'zgartirilgach eski parol bilan kirib bo'lmaydi.
- [ ] Bloklangan admin login qilolmaydi, ochiq sessiyasi keyingi so'rovda tugaydi.
- [ ] Jurnalda har bir amal ko'rinadi; jurnal yozuvini API orqali o'zgartirib
      yoki o'chirib bo'lmaydi.

---

## 2-bosqich. Savollar banki va savol to'plamlari

**Vazifa**

1. Modellar: `QuestionSet`, `Question`, `Option` (`CLAUDE.md`). Validatsiya:
   4 variant, aniq bitta to'g'ri, bo'sh matn yo'q.
2. CRUD API va admin serializerlar (bu yerda `is_correct` bor).
3. Import:
   - Excel shablon: `savol | A | B | C | D | to'g'ri (A/B/C/D)`; Word shablon:
     raqamlangan savol, keyin `A)`…`D)` qatorlar, to'g'ri variant oldida `*`
     yoki qalin. Ikkala shablonni `backend/templates_import/`ga qo'y va
     frontendda "Shablonni yuklab olish" bering.
   - `preview` — yaroqli/yaroqsiz qatorlar, xato sababi va qator raqami,
     takroriy savollar (to'plam ichida matn bo'yicha normalizatsiya qilib).
   - `commit` — faqat yaroqlilarni saqlaydi, natija soni qaytadi.
4. API manba: `bank/sources/base.py`da `QuestionSource` interfeysi
   (`fetch(question_set) -> list[QuestionDTO]`) va `DummySource` (fayldan).
   `sync-api` — `external_id` bo'yicha upsert, `source="api"`. Haqiqiy API
   keyin qo'shiladi — hozir faqat interfeys va bitta stub.
5. To'plam sahifasida "Bankda N ta faol savol" ko'rsatkichi:
   N ≥ 3 × `question_count` → yashil, aks holda ogohlantirish (`Toplamlar.dc.html`).
6. Ekranlar: `SavollarBanki.dc.html` (filtrlar, jadval, sahifalash),
   `SavolMuharriri.dc.html` (o'ngdan drawer, to'g'ri javob yashil bilan),
   import modali (fayl tanlash → preview jadvali → tasdiqlash),
   `Toplamlar.dc.html` (kartalar, yaratish/tahrirlash modali).

**Qabul mezonlari**

- [ ] 300 qatorlik Excel import qilinadi, xatoli qatorlar sababi bilan ko'rsatiladi.
- [ ] Word shablon import qilinadi.
- [ ] Testda ishlatilgan savolni o'chirib bo'lmaydi — faqat nofaol qilish mumkin.
- [ ] `sync-api` ikki marta ishlatilsa takroriy savol yaratmaydi.
- [ ] Tinglovchi tokeni bilan bank endpointlariga so'rov → 403 (test bor).

---

## 3-bosqich. Guruhlar, tinglovchilar va login-parollar

**Vazifa**

1. `Group` modeli va CRUD. Guruhga savol to'plami biriktiriladi (test
   ochilgandan keyin almashtirib bo'lmaydi).
2. A'zolar: qo'lda qo'shish (F.I.Sh., PINFL, tashkilot) va Excel import
   (preview/commit). Tekshiruv: PINFL 14 raqam, guruh ichida takror,
   boshqa faol guruhda borligi (ogohlantirish).
3. Login-parol generatsiyasi (`POST /groups/{id}/credentials/`):
   - login: `{login_prefix}-{tartib 3 xonali}` (`AKT01-017`), unikal;
   - parol: 6 belgi, `secrets`, alifbo `ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789`;
   - parol faqat hash'da saqlanadi; ochiq ko'rinishi faqat shu javobdagi
     PDF va JSON'da; qayta generatsiya eski parolni bekor qiladi;
   - PDF — `Varaqa.dc.html` bo'yicha A4, 2 ustun × 5 qator kesiladigan
     kartochka, sarlavha `seal-navy` rangda, sahifa raqami.
   - Excel eksport (F.I.Sh., login, parol) shu javobda.
4. Guruh chiqish paroli: `POST /groups/{id}/exit-password/` (generatsiya
   yoki qo'lda), hash'da saqlanadi, guruh sahifasida "Ko'rsatish" faqat
   generatsiyadan keyin bir marta.
5. Ekranlar: `Guruhlar.dc.html` (jadval, filtr, "Yangi guruh" modali),
   `Guruh.dc.html` (sarlavha + holat badge, 3 ta info karta, a'zolar jadvali;
   jonli holat ustunlari hozircha "Kirmagan").

**Qabul mezonlari**

- [ ] 30 kishilik guruh Excel bilan yuklanadi, login-parollar generatsiya
      qilinadi, PDF A4'da to'g'ri chiqadi (3 sahifa).
- [ ] Generatsiya qilingan login-parol bilan tinglovchi kira oladi; qayta
      generatsiyadan keyin eski parol ishlamaydi.
- [ ] Bazada ochiq parol yo'q (test bilan tekshirilgan).
- [ ] Har bir generatsiya va import jurnalga yoziladi.

---

## 4-bosqich. Test dvigateli (backend)

Bu bosqich platformaning yuragi — DAXLSIZ QOIDALARning har biriga test yoz.

**Vazifa**

1. Ochish/yopish: `open` (`test_status=open`, `opened_at`), `close`
   (`let_finish` — faol urinishlar o'z vaqtigacha davom etadi, yangi
   boshlanmaydi; `finish_now` — barcha faol urinishlar `terminated` va
   baholanadi). Rejalashtirilgan ochish/yopish — Celery beat.
2. `POST /me/test/start/`:
   - faqat `test_status=open`, faol urinishi yo'q (yoki admin retake bergan);
   - `select_for_update` bilan bir martalik (parallel ikki so'rov ikkita urinish
     yaratmaydi);
   - to'plamdan `question_count` ta faol savol tasodifiy tanlanadi, tartib
     aralashtiriladi, har savol uchun variantlar aralashtirilib `option_map`ga
     tasodifiy `key`lar bilan yoziladi;
   - `deadline_at = started_at + duration`.
3. `GET /attempts/{id}/` va `GET /attempts/{id}/questions/{n}/` — faqat egasi;
   javobda `is_correct`, `option_id`, `question_id` YO'Q.
4. `PUT /answers/{n}/` — idempotent; `now > deadline_at + ANSWER_GRACE_SECONDS`
   bo'lsa `409 attempt_expired`; `time_spent_ms` yig'iladi.
5. `POST /finish/` va avtomatik yakunlash: Celery beat (30s) + har qanday
   attempt so'rovida dangasa tekshiruv. Baholash: `correct_count`,
   `passed = correct_count >= pass_score`.
6. Hodisalar: `POST /events/` — `fullscreen_exits` hisoblagich,
   chegaradan oshsa `suspicious=True` + sabab.
7. `POST /exit-unlock/` — guruh chiqish paroli, 5 noto'g'ri → 5 daqiqa
   `423 exit_locked`; har urinish `AttemptEvent`.
8. Retake: admin ruxsati → eski urinish saqlanadi, yangisi `is_retake=True`,
   yangi variant.
9. Shubhali belgilar (yakunlanganda hisoblanadi): tez javoblar
   (`time_spent_ms < FAST_ANSWER_MS`) ulushi ≥ 50% va `passed`; chiqishlar
   chegaradan ko'p; guruh ichida ikki urinishda ≥ 10 ta bir xil noto'g'ri javob.

**Qabul mezonlari (har biri pytest bilan)**

- [ ] Tinglovchiga qaytadigan hech bir javobda `is_correct` yoki haqiqiy
      option/question ID yo'q (barcha tinglovchi endpointlari JSON'ini
      rekursiv tekshiradigan test).
- [ ] Ikki tinglovchining variantlari (savollar to'plami yoki tartibi) farq qiladi.
- [ ] To'g'ri javob `key`lari tasodifiy pozitsiyada (1000 ta generatsiyada
      A/B/C/D taqsimoti ~25% ± 5%).
- [ ] Parallel ikki `start` → bitta urinish.
- [ ] `deadline_at` o'zgarmaydi; muddatdan keyin javob qabul qilinmaydi;
      urinish beat'siz ham keyingi so'rovda `expired` bo'ladi.
- [ ] Hamma savolga birinchi variantni belgilagan bot o'rtacha ~25% oladi
      (simulyatsiya testi) — eski tizimdagi muammo takrorlanmaydi.
- [ ] Retake'siz ikkinchi urinish boshlanmaydi.

---

## 5-bosqich. Tinglovchi interfeysi

**Vazifa**

1. `/test` sahifasi holatga qarab: `waiting` (`Kutish.dc.html`) — test yopiq
   bo'lsa har 10 soniyada `GET /me/test/` (yoki SSE); ochilganda "Testni
   boshlash" faol bo'ladi (qoidalarga rozilik belgisi bilan); `active`
   (`Test.dc.html`); `finished` (`Natija.dc.html`).
2. To'liq ekran va himoya — `CLAUDE.md` "To'liq ekran va chiqish kaliti"
   bo'limi bo'yicha to'liq: requestFullscreen + Keyboard Lock, chiqishda
   savollarni DOM'dan olib tashlovchi `Qaytish.dc.html` qatlami, hodisalar,
   `Ctrl + Alt + N` → `Modallar.dc.html`dagi parol modali, nusxalash va chop
   etish cheklovi, < 1024px'da bloklash.
3. Taymer: `deadline_at - (Date.now() + serverOffset)`; `serverOffset` har
   javobdagi `server_now`dan; har 30 soniyada va `online` hodisasida qayta
   sinxronlash. Oxirgi 5 daqiqada qizil (`#c0342c`). 0 bo'lganda server
   javobini kutib natija ekraniga o'tadi.
4. Javob saqlash: tanlash → darhol `PUT`; holat belgisi "Saqlanmoqda… /
   Javob saqlandi / Aloqa yo'q". Offline navbat (`localStorage`, try/catch
   bilan), aloqa tiklanganda tartib bilan yuboriladi. Ikki marta bosish
   ikkita so'rov bermaydi.
5. Navigatsiya: oldingi/keyingi, 50 ta raqam setkasi (javob berilgan,
   berilmagan, belgilangan, joriy — dizayndagi ranglar), "Keyinroq qaytaman",
   klaviatura: ←/→ va 1–4 (A–D).
6. Yakunlash: `Modallar.dc.html`dagi tasdiq (javob berilgan / javobsiz /
   belgilangan soni, qolgan vaqt).
7. Sahifa yangilansa yoki qayta login qilinsa — to'g'ridan-to'g'ri o'sha
   savolga, to'liq ekranga qaytish tugmasi bilan.

**Qabul mezonlari**

- [ ] F5, brauzerni yopib-ochish, internetni 1 daqiqaga o'chirish — test
      qolgan joyidan, to'g'ri qolgan vaqt bilan davom etadi, javoblar yo'qolmaydi.
- [ ] Kompyuter soatini o'zgartirish taymerga ta'sir qilmaydi.
- [ ] Alt+Tab / Esc → savollar darhol yo'qoladi, admin jurnalida chiqish ko'rinadi.
- [ ] `Ctrl + Alt + N` + to'g'ri parol → qoidabuzarlik sanalmaydi;
      noto'g'ri parol 5 marta → blok.
- [ ] DevTools Network'da hech bir javobda to'g'ri javob yo'q (qo'lda tekshir
      va hisobotda yoz).
- [ ] Chrome, Edge, Firefox'da ishlaydi; Lighthouse accessibility ≥ 90.

---

## 6-bosqich. Jonli monitoring, natijalar va bosh panel

**Vazifa**

1. `GET /groups/{id}/members/` jonli holat: kirmagan / ishlayapti
   (`answered/total`, qolgan vaqt) / yakunladi (ball, o'tdi-o'tmadi), chiqishlar
   soni, shubhali belgi. `Guruh.dc.html` har 5 soniyada yangilanadi;
   yuqorida hisoblagichlar (Kirmagan / Ishlayapti / Yakunlagan).
2. Guruh sahifasi amallari: "Testni ochish" / "Testni yopish" (yopishda
   `let_finish` yoki `finish_now` tanlovi modalda), qator menyusida
   "Qayta topshirishga ruxsat" (sabab bilan), "Login-parolni qayta yaratish".
3. `Natijalar.dc.html`: guruh tanlash, to'g'ri javoblar taqsimoti (recharts
   bar, o'tganlar `#1763a0`, o'tmaganlar `#c9d6e2`, "tasodifiy daraja" va
   "chegara" belgilari), shubhali urinishlar ro'yxati (sabablar bilan),
   natijalar jadvali (PINFL qisman yashirilgan).
4. Eksport: Excel (barcha ustunlar + har savolga sarflangan vaqt alohida
   varaqda) va PDF protokol (F.I.Sh., PINFL, to'g'ri javoblar, foiz, natija,
   imzo joylari, KTRI sarlavhasi).
5. `AdminPanel.dc.html`: ochiq testlar, hozir ishlayotganlar, bugun
   yakunlaganlar, shubhali urinishlar soni (Natijalarga havola), ochiq testlar
   jadvali "Testni yopish" bilan.

**Qabul mezonlari**

- [ ] 30 ta tinglovchi simulyatsiyasida guruh sahifasi holatni ≤ 5 soniya
      kechikish bilan ko'rsatadi.
- [ ] `finish_now` barcha faol urinishlarni yakunlaydi va baholaydi.
- [ ] Shubhali urinishlar ro'yxati 4-bosqichdagi qoidalarga mos (test bor).
- [ ] Excel va PDF protokol ochiladi, o'zbekcha harflar (o', g', sh) to'g'ri.

---

## 7-bosqich. Yuklama, xavfsizlik va joylashtirish

**Vazifa**

1. Locust ssenariysi: 500 tinglovchi bir vaqtda login → start → 50 javob.
   Maqsad: javob saqlash p95 < 500ms, xato 0%. Kerak bo'lsa indekslar,
   `select_related`, Redis kesh (savol matni), gunicorn worker soni.
2. Xavfsizlik ko'rigi: IDOR (boshqa urinish/guruhga murojaat), rol tekshiruvi
   har endpointda, CORS, CSP, `X-Frame-Options`, HTTPS, cookie/token saqlash,
   rate limit, fayl yuklash cheklovi (turi, hajmi), Excel formula injection
   (eksportda `=`, `+`, `-`, `@` bilan boshlangan qiymatlar).
3. Production: `docker-compose.prod.yml` (nginx, gunicorn, celery, beat,
   postgres, redis), statik fayllar, zaxira nusxa skripti (kunlik, test
   kunlari — soatlik), `.env.example`.
4. `docs/SEB.md`: Safe Exam Browser bilan MOM kompyuter xonalarida ishlatish
   bo'yicha qisqa yo'riqnoma (sozlama fayli namunasi, quit password).
5. `docs/ADMIN_QOLLANMA.md`: admin uchun 1 sahifalik qo'llanma (guruh yaratish
   → import → login-parol → testni ochish → yopish → protokol).

**Qabul mezonlari**

- [ ] Locust hisoboti: 500 parallel tinglovchida p95 < 500ms, xato 0%.
- [ ] Xavfsizlik ko'rigi ro'yxati bajarilgan, topilganlar tuzatilgan.
- [ ] Toza serverda `docker compose -f docker-compose.prod.yml up` bilan
      platforma ishga tushadi.
