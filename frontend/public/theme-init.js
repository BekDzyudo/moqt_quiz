// Sahifa chizilishidan oldin ishlaydi: qorong'i rejimda oq chaqnash bo'lmaydi.
// CSP inline skriptga ruxsat bermaydi, shuning uchun alohida fayl.
try {
  if (localStorage.getItem('moqt.theme') === 'dark') {
    document.documentElement.dataset.theme = 'ktri-dark'
  }
} catch {
  // Brauzer xotirasi yopiq bo'lsa, yorug' tema qoladi.
}
