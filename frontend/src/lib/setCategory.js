// "Buxoro XF / Payvandlash" -> bo'lim "Buxoro XF", qisqa nom "Payvandlash".
// Backend ham shu qoidadan foydalanadi (`category` filtri, "Boshqa" = nomida " / " yo'q).
export const OTHER_CATEGORY = 'Boshqa'

export function splitSetName(name) {
  const index = name.indexOf(' / ')
  if (index < 0) return { category: OTHER_CATEGORY, short: name }
  return { category: name.slice(0, index), short: name.slice(index + 3) }
}

// [[bo'lim, to'plamlar[]], ...] — alifbo tartibida, "Boshqa" oxirida.
export function groupSets(sets) {
  const map = new Map()
  for (const set of sets ?? []) {
    const key = splitSetName(set.name).category
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(set)
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a === OTHER_CATEGORY) - (b === OTHER_CATEGORY) || a.localeCompare(b, 'uz'))
    .map(([key, list]) => [key, list.sort((x, y) => x.name.localeCompare(y.name, 'uz'))])
}
