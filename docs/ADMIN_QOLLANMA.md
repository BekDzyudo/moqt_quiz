# Admin uchun qo'llanma

Chiqish testini o'tkazish tartibi: savollardan protokolgacha. Har bir bosqich chap
menyudagi bo'lim nomi bilan yozilgan.

## 1. Savollarni tayyorlash

1. **Savol to'plamlari** bo'limida "Yangi to'plam": nomi, testdagi savollar soni,
   vaqt va o'tish chegarasi.
2. **Savol to'plamlari** bo'limida to'plam kartasidagi "Excel import" tugmasini
   bosing (yoki **Savollar banki** bo'limida "Excel/Word import"da to'plamni
   tanlang), faylni yuklang, "Tekshirish" bosing. Fayl namunasi va shablon shu
   oynada.
3. Tekshiruv xatoli qatorlarni raqami va sababi bilan ko'rsatadi. Yaroqlilarini
   saqlang, xatolilarini faylda tuzatib, qayta yuklang.

To'plam kartasida "Bankda N ta faol savol" yashil bo'lishi kerak: testdagi savollar
sonidan kamida 3 baravar ko'p. Aks holda tinglovchilarning variantlari o'xshash
chiqadi.

**Muhim:** testda ishlatilgan savolni o'chirib va to'g'ri javobini o'zgartirib
bo'lmaydi. Keraksiz bo'lsa, nofaol qiling.

## 2. Guruhni tayyorlash

1. **Guruhlar** bo'limida "Yangi guruh": nomi, tashkilot, savol to'plami va login
   prefiksi (masalan `AKT01`).
2. Guruh sahifasida "Excel import" bilan tinglovchilarni yuklang: F.I.Sh., PINFL,
   tashkilot. Bittasini qo'shish uchun "Tinglovchi qo'shish".
3. "Login-parol yaratish" bosing, ochilgan oynada **PDF varaqa** va **Excel**ni
   yuklab oling.
4. Varaqani chop eting, kartochkalarni chiziq bo'ylab kesib, tinglovchilarga
   shaxsan topshiring.
5. "Chiqish paroli" kartasida parol o'rnating va uni yozib oling.

**Parollar faqat yaratilgan oynada ko'rinadi.** Oynani yopgach ularni qayta olib
bo'lmaydi, faqat qayta generatsiya qilish mumkin. Bunda eski varaqalar ishlamay
qoladi.

Ro'yxatga keyin qo'shilgan tinglovchi uchun "Yangi N tasiga yaratish" bosing:
boshqalarning varaqasi o'zgarmaydi.

## 3. Testni o'tkazish

1. Tinglovchilar joylashgach, guruh sahifasida **"Testni ochish"** bosing.
2. Tinglovchi login-parol bilan kiradi, qoidalarga rozilik belgilaydi va "Testni
   boshlash" bosadi. Sahifa to'liq ekranga o'tadi.
3. Guruh sahifasida holatni kuzating: Kirmagan, Ishlayapti, Yakunlagan. Jadval har
   5 soniyada yangilanadi.

### Test paytidagi holatlar

| Holat | Nima qilish kerak |
|---|---|
| Kompyuter qotdi yoki sahifa yopildi | Tinglovchi qayta kiradi va o'sha savoldan davom etadi. Vaqt to'xtamaydi |
| Internet uzildi | Javoblar kompyuterda saqlanadi, aloqa tiklanganda o'zi yuboriladi |
| "Siz test oynasidan chiqdingiz" oynasi | Tinglovchi "Testga qaytish" bosadi. Chiqish hisoblagichga yoziladi |
| Tinglovchini to'liq ekrandan chiqarish kerak | Tinglovchi kompyuterida `Ctrl + Alt + N` bosing va chiqish parolini kiriting. Test davom etadi, bu qoidabuzarlik sanalmaydi |
| Parolini yo'qotdi | Qator menyusida "Login-parolni qayta yaratish" |
| Qurilma ishlamay qoldi, qayta topshirish kerak | Test yakunlangach qator menyusida "Qayta topshirishga ruxsat", sababini yozing. Tinglovchi yangi variant oladi |

Bir tinglovchi ikkinchi kompyuterdan kirsa, birinchisidagi seans yopiladi va test
ikkinchisida davom etadi.

## 4. Testni yopish

"Testni yopish" bosing va usulni tanlang:

- **Ishlayotganlar tugatsin:** yangi tinglovchi boshlay olmaydi, boshlaganlar o'z
  vaqtigacha davom etadi. Odatda shu tanlanadi.
- **Hozir yakunlash:** barcha faol testlar darhol yakunlanadi va mavjud javoblar
  bilan baholanadi. Faqat favqulodda holatda.

## 5. Natijalar va protokol

1. **Natijalar** bo'limida guruhni tanlang.
2. "Shubhali urinishlar" ro'yxatini ko'rib chiqing. Bu avtomatik jazo emas, tekshirish
   uchun ro'yxat: tez javoblar, ko'p chiqish, boshqa tinglovchi bilan bir xil
   noto'g'ri javoblar.
3. **"PDF protokol"** yuklab oling, chop eting va imzolang. To'liq ma'lumot, jumladan
   har savolga sarflangan vaqt, **Excel** faylida.

Protokol va Excelda to'liq PINFL bor: ularni faqat vakolatli xodimlarga bering.
Har bir yuklab olish jurnalga yoziladi.
