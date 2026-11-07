// Excel, LibreOffice va CSV'ga o'tkazilgan fayllar `=`, `+`, `-`, `@` bilan boshlangan matnni
// formula deb bajarishi mumkin. Apostrof qiymatni matn sifatida saqlaydi.
const FORMULA_START = /^[=+\-@\t\r]/

export const safeCell = (value) =>
  typeof value === 'string' && FORMULA_START.test(value) ? `'${value}` : value

export const safeRow = (row) =>
  Object.fromEntries(Object.entries(row).map(([key, value]) => [key, safeCell(value)]))
