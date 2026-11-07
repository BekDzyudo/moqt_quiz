# Xavfsizlik ko'rigi

7-bosqich ko'rigining natijasi. Hozircha backend mock bo'lgani uchun hujjat ikki qismdan
iborat: nimalar tekshirilib tuzatilgan va Django yozilganda nimalar takrorlanishi shart.
Mock kodi production emas: undagi himoyalar kontrakt va testlarni belgilaydi, xolos.

## Ko'rik natijasi

| Yo'nalish | Holat | Natija |
|---|---|---|
| IDOR (boshqa urinish) | Tekshirildi | Begona urinish 404, ID'larni terib bilib bo'lmaydi |
| Rol tekshiruvi | Tekshirildi | Barcha marshrutlar avtomatik matritsa testida: tokensiz 401, begona rol 403. Yangi marshrut testga o'zi tushadi |
| CORS | Tekshirildi | Sarlavha qo'yilmagan, API bir xil domendan ishlaydi |
| CSP, `X-Frame-Options` va boshqalar | Tekshirildi | Production build shu sarlavhalar bilan sinovdan o'tdi, nginx uchun quyida |
| HTTPS | Django bilan | Quyidagi nginx sozlamasi |
| Token saqlash | Qaror | `sessionStorage`, pastda sabablari |
| Rate limit | Qisman | Login va chiqish paroli cheklangan, qolgani Django'da |
| Fayl yuklash | Tekshirildi | Hajm va tur cheklangan, rasm imzo bo'yicha tekshiriladi |
| Excel formula injection | Tuzatildi | Barcha eksportlarda |
| XSS | Tekshirildi | `dangerouslySetInnerHTML` yo'q, matn React orqali chiqadi |
| Sirlar bundle'da | Tekshirildi | `dist` da mock kodi, parollar va javob ma'lumoti yo'q. `is_correct` faqat admin chunk'ida maydon nomi sifatida uchraydi, test chunk'ida yo'q. Source map o'chiq |

## Topilgan va tuzatilganlar

1. **Rasm havolasi savol ID'si bilan tokensiz ochilardi.** Tinglovchi ID'larni terib
   test rasmlarini oldindan ko'rishi mumkin edi. Endi havola tasodifiy 128 bitli kalit
   bilan beriladi va rasm almashganda eskisi ishlamaydi.
2. **`time_spent_ms` klientga ishonardi.** Skript katta qiymat yuborib, tez javob
   belgisini aylanib o'tishi mumkin edi. Endi qiymat testning o'tgan vaqti bilan
   cheklanadi. Bu to'liq himoya emas: vaqtni taqsimlab yuborish mumkin, shuning uchun
   belgi faqat tekshirish uchun.
3. **Rasm turi klient aytgan MIME bo'yicha tekshirilardi.** Endi fayl imzosi tekshiriladi,
   `image/png` deb yuborilgan SVG rad etiladi.
4. **API javoblari keshlanishi mumkin edi.** Login-parol javobida ochiq parollar bor.
   Barcha javoblarga `Cache-Control: no-store` qo'shildi.
5. **Excel eksportlarda formula injection himoyasi yo'q edi.** `=`, `+`, `-`, `@`, tab va
   CR bilan boshlangan qiymatlar oldiga `'` qo'yiladi.
6. **Yarim uzilgan so'rov mock serverni o'chirardi** (5-bosqichda topilgan).
7. **URL'dagi guruh ID'si so'rov yo'liga to'g'ridan-to'g'ri qo'shilardi.** Endi kodlanadi.

## Qabul qilingan xavflar

- **Tokenlar `sessionStorage` da.** XSS bo'lsa o'qilishi mumkin, CSP shu xavfni
  kamaytiradi. Afzalligi: brauzer yopilganda token o'chadi, umumiy xonadagi kompyuterda
  keyingi odam kira olmaydi. Refresh tokenni `HttpOnly` cookie'ga o'tkazish Django bilan
  ko'rib chiqiladi.
- **`style-src 'unsafe-inline'`.** React va recharts `style` atributini ishlatadi. Skriptga
  ruxsat yo'q, shuning uchun xavf past.
- **Brauzerdagi himoya aylanib o'tilishi mumkin.** Ikkinchi kompyuter, telefon, skrinshot
  va DevTools'ni sahifa to'xtata olmaydi. Javob baribir brauzerga kelmaydi, savol matni
  esa keladi. Kuchliroq himoya uchun `docs/SEB.md`.
- **SEB User-Agent orqali taniladi.** Uni soxtalashtirib to'liq ekranni chetlab o'tish
  mumkin, lekin oynadan chiqish baribir qayd etiladi. Haqiqiy tekshiruv uchun Django'da
  SEB'ning Browser Exam Key sarlavhasini ko'rish kerak.
- **Adminlar barcha guruhlarni ko'radi.** Tashkilot bo'yicha ajratish `CLAUDE.md` da yo'q.
  Hududiy adminlar ishlatilsa, bu qayta ko'rilishi kerak.
- **React Router v6 audit ogohlantirishlari.** SSR ishlatilmaydi, havolalar qat'iy.
  Tuzatish v7'da, hujjat esa v6 ni belgilagan.

## Django uchun talablar

Bular mock'da tekshirib bo'lmaydigan yoki u yerda soddalashtirilgan narsalar:

- [ ] `npm test` dagi har bir mock testi `pytest` da takrorlansin, ayniqsa rol matritsasi
      va `suspicious` hamda `is_correct` tinglovchi javobiga chiqmasligi.
- [ ] `start` da `select_for_update`: mock'da parallellik yo'q, u yerda haqiqiy poyga bor.
- [ ] Parollar Django hasher bilan (Argon2 yoki PBKDF2), JWT sirlari `.env` da.
- [ ] Refresh token rotatsiyasi va blacklist.
- [ ] Rate limit: login, `refresh`, `change-password`, import, `exit-unlock`.
- [ ] Login'da mavjud bo'lmagan foydalanuvchi uchun ham xesh hisoblansin (vaqt farqi
      orqali login borligi bilinmasin).
- [ ] So'rov tanasi hajmi cheklansin (`DATA_UPLOAD_MAX_MEMORY_SIZE`), `.xlsx` va `.docx`
      zip-bomba himoyasi, yuklangan fayl media papkasidan bajarilmasin.
- [ ] Rasm kaliti: urinish rasmi test tugagach yopilsin, media fayllar tokensiz ID bilan
      ochilmasin.
- [ ] `safe_cell` barcha `openpyxl` eksportlarida, PDF'da HTML kiritish himoyasi.
- [ ] `DEBUG=False`, `ALLOWED_HOSTS`, `SECURE_SSL_REDIRECT`, HSTS.
- [ ] Yuklama sinovi (Locust): 500 tinglovchi, javob saqlash p95 < 500 ms, xato 0%.
- [ ] Zaxira nusxa: kunlik, test kunlari soatlik.

## nginx sarlavhalari

```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "no-referrer" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

`/api/` javoblariga `Cache-Control: no-store` Django tomonidan qo'yiladi. Shriftlar
serverning o'zidan berilsa, CSP'dagi Google domenlari olib tashlanadi. Internet cheklangan
MOM xonalarida shu tavsiya etiladi.
