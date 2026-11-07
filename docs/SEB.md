# Safe Exam Browser bilan ishlash

MOM kompyuter xonalarida testni Safe Exam Browser (SEB) orqali o'tkazish bo'yicha
qisqa yo'riqnoma. Hujjat texnik mas'ul uchun.

## Nega kerak

Oddiy brauzer sahifani to'liq qulflay olmaydi: `Alt + Tab`, `Win` va boshqa dasturlar
ishlayveradi. Platforma buni faqat aniqlaydi va qayd etadi. SEB esa kompyuterni kiosk
rejimiga o'tkazadi va bularni tizim darajasida yopadi.

SEB majburiy emas. Platforma oddiy Chrome yoki Edge'da ham ishlaydi, himoya esa
`CLAUDE.md` dagi to'liq ekran qoidalari darajasida qoladi.

## O'rnatish

1. Rasmiy saytdan ([safeexambrowser.org](https://safeexambrowser.org)) Windows uchun
   SEB'ni yuklab oling va xonadagi har bir kompyuterga o'rnating.
2. Test mas'uli kompyuterida **SEB Configuration Tool** bilan `.seb` faylini tuzing.
3. Faylni kompyuterlarga tarqating yoki USB'da olib boring.
4. Tinglovchi kompyuterida `.seb` faylini ikki marta bossa, SEB test sahifasini ochadi.

## Sozlamalar

Configuration Tool'dagi asosiy qiymatlar:

| Bo'lim | Sozlama | Qiymat |
|---|---|---|
| General | Start URL | `https://test.moqt.uz/login` |
| General | Quit Password | Mas'ul shaxs paroli, guruh chiqish parolidan boshqa |
| Config File | Use SEB settings file for | Starting an exam |
| User Interface | View Mode | Use full screen mode |
| User Interface | Show task bar | O'chiq yoki faqat soat |
| Browser | Allow reload | Yoqiq: aloqa uzilganda kerak bo'ladi |
| Browser | Allow downloads | O'chiq |
| Network, Filter | URL Filter | Yoqiq, faqat `test.moqt.uz` va shriftlar domenlari |
| Security | Enable Print Screen | O'chiq |
| Applications | Allow switching to third party applications | O'chiq |

## Sozlama fayli namunasi

`.seb` shifrlanmagan holda XML (plist) bo'ladi. Quyidagi namuna tuzilishni ko'rsatadi.
Ishlatishdan oldin uni Configuration Tool'da ochib, o'zingizdagi SEB versiyasi bilan
tekshiring: kalit nomlari versiyaga qarab farq qilishi mumkin.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>startURL</key>
  <string>https://test.moqt.uz/login</string>
  <key>sebConfigPurpose</key>
  <integer>0</integer>
  <key>allowQuit</key>
  <true/>
  <key>hashedQuitPassword</key>
  <string>BU_YERGA_PAROLNING_SHA256_XESHI</string>
  <key>browserViewMode</key>
  <integer>1</integer>
  <key>browserWindowAllowReload</key>
  <true/>
  <key>allowDownUploads</key>
  <false/>
  <key>enablePrintScreen</key>
  <false/>
  <key>URLFilterEnable</key>
  <true/>
  <key>allowSwitchToApplications</key>
  <false/>
</dict>
</plist>
```

Quit Password'ni Configuration Tool o'zi xeshlaydi. Faylni qo'lda tahrirlasangiz, parol
matnining SHA-256 xeshini kichik harflarda yozing.

## Tekshirish ro'yxati

Haqiqiy testdan oldin bitta kompyuterda sinab ko'ring. Quyidagilar hali haqiqiy SEB
muhitida sinovdan o'tkazilmagan:

- [ ] Login sahifasi ochiladi, shriftlar yuklanadi.
- [ ] "Testni boshlash" bosilganda test darhol ochiladi. Platforma SEB'ni User-Agent
      (`SEB/`) orqali taniydi va to'liq ekran talab qilmaydi. Haqiqiy SEB'ning User-Agent
      satrida `SEB/` borligini tekshiring, aks holda "Testga qaytish" oynasidan chiqib
      bo'lmaydi.
- [ ] `Ctrl + Alt + N` SEB'da sahifaga yetib boradi va chiqish paroli oynasi ochiladi.
- [ ] Sahifa yangilanganda test o'sha savoldan davom etadi.
- [ ] Quit Password bilan SEB yopiladi.

## Ikki xil parol

| Parol | Kim ishlatadi | Nima qiladi |
|---|---|---|
| Guruh chiqish paroli (platformada) | Mas'ul shaxs, `Ctrl + Alt + N` | Sahifani to'liq ekrandan chiqaradi, test davom etadi |
| SEB Quit Password | Texnik mas'ul | SEB dasturini yopadi |

Ikkalasini bir xil qilmang va tinglovchilarga ko'rsatmang.
