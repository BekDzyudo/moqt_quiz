// Backend javoblarini sahifalar kutgan shaklga keltiradi.

// Backend hali ochilmagan guruhni "draft" deb qaytaradi; interfeysda u "Yopiq".
const status = (value) => (value === 'draft' ? 'closed' : value)

export const adaptGroup = (group) => group && { ...group, test_status: status(group.test_status) }

export const adaptMyTest = (test) => test && { ...test, test_status: status(test.test_status) }

function progressText(progress, liveStatus) {
  if (!progress || typeof progress !== 'object') return progress ?? null
  const { answered, total, correct_count: correct, passed } = progress
  if (!total) return null
  if (liveStatus !== 'in_progress' && correct != null) {
    return `${correct} / ${total} · ${passed ? "O'tdi" : "O'tmadi"}`
  }
  return `${answered} / ${total}`
}

export function adaptMember(member) {
  const live = member.live && {
    ...member.live,
    progress: progressText(member.live.progress, member.live.status),
  }
  return { ...member, login: member.login ?? member.username ?? null, live }
}

export const adaptAuditEntry = (entry) => ({
  ...entry,
  at: entry.at ?? entry.created_at,
  object_repr: entry.object_repr ?? entry.object_label ?? '',
})

const CHANCE_PER_QUESTION = 0.25
const BUCKETS_PER_SIDE = 3

// [from, to] oralig'ini teng bo'laklarga bo'ladi.
function splitRange(from, to, parts) {
  const ranges = []
  let start = from
  for (let part = parts; part > 0 && start <= to; part -= 1) {
    const length = Math.ceil((to - start + 1) / part)
    ranges.push([start, start + length - 1])
    start += length
  }
  return ranges
}

// Backend har bir ball uchun son beradi ({score, count}); diagramma oraliqlarni kutadi.
function bucketDistribution(perScore, questionCount, passScore) {
  const chance = questionCount * CHANCE_PER_QUESTION
  const ranges = [
    ...splitRange(0, passScore - 1, BUCKETS_PER_SIDE),
    ...splitRange(passScore, questionCount, BUCKETS_PER_SIDE),
  ]
  return ranges.map(([from, to]) => {
    const notes = []
    if (chance >= from && chance < to + 1) notes.push('tasodifiy daraja')
    if (from === passScore) notes.push(`chegara ${passScore}`)
    return {
      label: from === to ? String(from) : `${from}–${to}`,
      count: perScore
        .filter(({ score }) => score >= from && score <= to)
        .reduce((sum, { count }) => sum + count, 0),
      passed: from >= passScore,
      note: notes.join(', '),
    }
  })
}

export function adaptResults(results) {
  if (!results) return results
  const { group, set, summary, distribution = [], rows = [] } = results
  const perScore = distribution.length > 0 && distribution[0].label === undefined
  return {
    ...results,
    group: {
      ...group,
      member_count: group.member_count ?? summary?.members ?? rows.length,
    },
    distribution: perScore
      ? bucketDistribution(distribution, set.question_count, set.pass_score)
      : distribution,
    rows: rows.map((row) => ({ ...row, id: row.id ?? row.user_id })),
  }
}
