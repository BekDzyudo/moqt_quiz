// Serverga hali yetmagan javob, belgi va hodisalar. Sahifa yangilansa ham yo'qolmaydi.
// localStorage yopiq bo'lsa navbat faqat xotirada ishlaydi.
const storageKey = (attemptId) => `moqt.pending.${attemptId}`

export function loadPending(attemptId) {
  try {
    return JSON.parse(localStorage.getItem(storageKey(attemptId))) ?? []
  } catch {
    return []
  }
}

export function savePending(attemptId, entries) {
  try {
    if (entries.length === 0) localStorage.removeItem(storageKey(attemptId))
    else localStorage.setItem(storageKey(attemptId), JSON.stringify(entries))
  } catch {
    // Xotira to'lgan yoki yopiq: navbat sahifa ochiq turganda ishlashda davom etadi.
  }
}
