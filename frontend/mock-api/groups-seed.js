const MEN = [
  ['Abdullayev', 'Jasur', 'Baxtiyorovich'],
  ['Bakirov', 'Otabek', 'Ravshanovich'],
  ['Ergashev', 'Ulugbek', 'Toirovich'],
  ["G'aniyev", 'Sherzod', 'Anvarovich'],
  ['Hamidov', 'Doniyor', 'Alisherovich'],
  ['Toshmatov', 'Sardor', 'Ilhomovich'],
  ['Yusupov', 'Bekzod', 'Shavkatovich'],
  ['Qodirov', 'Azizbek', 'Murodovich'],
]

const WOMEN = [
  ['Azimova', 'Malika', 'Sobirovna'],
  ['Davlatova', 'Shahnoza', 'Erkinovna'],
  ['Fayzullayeva', 'Kamola', 'Ikromovna'],
  ['Ergasheva', 'Nilufar', 'Akmalovna'],
  ['Ismoilova', 'Zarina', 'Baxromovna'],
  ['Rahimova', 'Gulnoza', 'Odilovna'],
]

// [nom, tashkilot, to'plam id, holat, login prefiksi, a'zolar soni, login-parol yaratilganmi]
const GROUPS = [
  ['2026-11-AKT-01', 'Toshkent MOM', 1, 'open', 'AKT01', 30, true],
  ['2026-11-IQT-03', 'Samarqand MOM', 2, 'open', 'IQT03', 28, true],
  ['2026-11-AKT-02', 'Toshkent MOM', 1, 'closed', 'AKT02', 26, false],
  ['2026-11-ICHT-01', 'Buxoro hududiy fakulteti', 3, 'closed', 'ICHT01', 32, false],
  ['2026-10-AKT-04', "Farg'ona MOM", 1, 'finished', 'AKT04', 29, true],
  ['2026-10-IQT-01', 'Namangan MOM', 2, 'finished', 'IQT01', 25, true],
]

const SEED_LISTENER_SEQUENCE = 17

function personName(index) {
  const pool = index % 2 === 0 ? MEN : WOMEN
  const [last, first, middle] = pool[Math.floor(index / 2) % pool.length]
  return `${last} ${first} ${middle}`
}

// `seedListener` — parolini bilib turiladigan namuna tinglovchi, u birinchi guruhga tushadi.
export function createGroups({ seedListener, createUser, nowIso }) {
  const groups = []
  let pinfl = 30101900000000

  GROUPS.forEach(([name, organization, questionSet, status, prefix, count, hasLogins], index) => {
    const group = {
      id: index + 1,
      name,
      organization,
      question_set: questionSet,
      test_status: status,
      login_prefix: prefix,
      opened_at: status === 'closed' ? null : nowIso(),
      closed_at: status === 'finished' ? nowIso() : null,
      scheduled_open_at: null,
      scheduled_close_at: null,
      exit_password_hash: null,
    }
    groups.push(group)

    for (let sequence = 1; sequence <= count; sequence += 1) {
      pinfl += 7

      if (index === 0 && sequence === SEED_LISTENER_SEQUENCE) {
        Object.assign(seedListener, {
          group: group.id,
          sequence,
          pinfl: String(pinfl),
          has_credentials: true,
        })
        continue
      }

      createUser({
        username: hasLogins ? `${prefix}-${String(sequence).padStart(3, '0')}` : null,
        password_hash: null,
        full_name: personName(sequence + index * 3),
        role: 'listener',
        organization,
        is_active: true,
        group: group.id,
        sequence,
        pinfl: String(pinfl),
        has_credentials: hasLogins,
      })
    }
  })

  return groups
}
