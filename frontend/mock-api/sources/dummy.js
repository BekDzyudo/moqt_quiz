// CLAUDE.md dagi QuestionSource interfeysining mock'dagi yagona stubi:
// fetch(questionSet) -> [{ external_id, text, options: [{ text, is_correct }] }].
// Haqiqiy API Django tomonda shu shaklda qo'shiladi.
const COUNT = 24

export const dummySource = {
  fetch(questionSet) {
    return Array.from({ length: COUNT }, (_, index) => {
      const n = index + 1
      return {
        external_id: `dummy-${questionSet.id}-${n}`,
        text: `${questionSet.name}: API savoli ${n}`,
        options: ['A javob', 'B javob', 'C javob', 'D javob'].map((text, position) => ({
          text,
          is_correct: position === n % 4,
        })),
      }
    })
  },
}
