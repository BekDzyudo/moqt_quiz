// performance.now() monoton: foydalanuvchi kompyuter soatini o'zgartirsa ham sakramaydi.
// Serverning hozirgi vaqti = oxirgi javobdagi server_now + o'shandan beri o'tgan vaqt.
let offsetMs = null

export function syncServerClock(serverNowIso) {
  if (!serverNowIso) return
  offsetMs = Date.parse(serverNowIso) - performance.now()
}

export const serverNow = () => (offsetMs === null ? Date.now() : performance.now() + offsetMs)

export const remainingMs = (deadlineIso) => Math.max(0, Date.parse(deadlineIso) - serverNow())

export function formatRemaining(ms) {
  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}
