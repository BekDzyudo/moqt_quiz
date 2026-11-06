const TIME_ZONE = 'Asia/Tashkent'

const dateKey = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE })
const clock = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})
const dayMonthYear = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

// Foydalanuvchi soati boshqa zonada bo'lsa ham kun Toshkent bo'yicha olinadi.
export const todayInTashkent = () => dateKey.format(new Date())

export const formatTime = (iso) => clock.format(new Date(iso))

export const formatDateTime = (iso) =>
  `${dayMonthYear.format(new Date(iso)).replaceAll('/', '.')} ${formatTime(iso)}`
