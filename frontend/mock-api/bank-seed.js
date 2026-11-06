const REAL_QUESTIONS = [
  ["Kompyuter tarmog'ida IP-manzilni avtomatik taqsimlovchi protokol qaysi?", ['DNS', 'DHCP', 'FTP', 'SMTP'], 1],
  ['HTML hujjatida eng katta sarlavha qaysi teg bilan beriladi?', ['<h6>', '<head>', '<h1>', '<title>'], 2],
  ["Elektron jadvalda katakdagi formulani mutlaq manzilga o'tkazuvchi belgi qaysi?", ['#', '$', '%', '&'], 1],
  ["Ma'lumotlar bazasida jadvallarni bog'lash uchun ishlatiladigan maydon qanday ataladi?", ['Tashqi kalit', 'Indeks', "Ko'rinish", 'Trigger'], 0],
  ["OSI modelida nechta pog'ona bor?", ['4', '5', '6', '7'], 3],
]

const SETS = [
  ['AKT — maxsus fanlar', 312],
  ['Iqtisodiyot — umumkasbiy fanlar', 268],
  ["Ishlab chiqarish ta'limi ustalari", 96],
  ["Umumta'lim fanlari", 204],
]

export const buildOptions = (texts, correctIndex, nextOptionId) =>
  texts.map((text, index) => ({
    id: nextOptionId(),
    text,
    is_correct: index === correctIndex,
  }))

export function createBank(createdBy) {
  let optionId = 0
  let questionId = 0
  let setId = 0

  const bank = {
    sets: [],
    questions: [],
    nextOptionId: () => (optionId += 1),
    nextQuestionId: () => (questionId += 1),
    nextSetId: () => (setId += 1),
  }

  for (const [name, count] of SETS) {
    const set = {
      id: bank.nextSetId(),
      name,
      question_count: 50,
      duration_minutes: 75,
      pass_score: 28,
      created_by: createdBy,
    }
    bank.sets.push(set)

    for (let n = 1; n <= count; n += 1) {
      const real = set.id === 1 ? REAL_QUESTIONS[n - 1] : undefined
      const [text, options, correct] = real ?? [
        `${name}: namuna savol ${n}`,
        ['Birinchi javob', 'Ikkinchi javob', 'Uchinchi javob', "To'rtinchi javob"],
        n % 4,
      ]
      const fromApi = n % 5 === 0

      bank.questions.push({
        id: bank.nextQuestionId(),
        question_set: set.id,
        text,
        image: null,
        source: fromApi ? 'api' : 'local',
        external_id: fromApi ? `seed-${set.id}-${n}` : null,
        is_active: n % 17 !== 0,
        // 4-bosqichgacha urinishlar yo'q: "testda ishlatilgan" holati shu belgi bilan beriladi.
        in_use: set.id === 1 && n <= 3,
        options: buildOptions(options, correct, bank.nextOptionId),
      })
    }
  }

  return bank
}
