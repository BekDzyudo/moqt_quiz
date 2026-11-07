import ExcelJS from 'exceljs'
import { safeCell, safeRow } from '../excel-safe.js'
import { FileResponse, notFound, validationError } from '../http.js'
import { buildProtocolPdf } from '../protocol-pdf.js'

const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const CHANCE_PER_QUESTION = 0.25
const BUCKETS_PER_SIDE = 3

const tashkentDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent' })

const maskPinfl = (pinfl) => `${pinfl.slice(0, 4)}•••••••${pinfl.slice(-3)}`

// [from, to] oralig'ini teng bo'laklarga bo'ladi; qisqa oraliqda bo'laklar kamroq bo'ladi.
function splitRange(from, to, parts) {
  const size = to - from + 1
  if (size <= 0) return []

  const ranges = []
  let start = from
  for (let part = parts; part > 0 && start <= to; part -= 1) {
    const length = Math.ceil((to - start + 1) / part)
    ranges.push([start, start + length - 1])
    start += length
  }
  return ranges
}

function buildDistribution(finished, questionCount, passScore) {
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
      count: finished.filter(({ correct_count: score }) => score >= from && score <= to).length,
      passed: from >= passScore,
      note: notes.join(', '),
    }
  })
}

export function resultRoutes(state) {
  const { now, requireRole, audit, bank, users, groups, engine } = state
  const staff = (req) => requireRole(req, 'admin', 'superadmin')

  const groupFromQuery = (req) => {
    const id = req.query.get('group')
    if (!id) throw validationError({ group: 'Guruhni tanlang.' })
    const group = groups.find((candidate) => String(candidate.id) === id)
    if (!group) throw notFound('Guruh topilmadi.')
    return group
  }

  const memberResults = (group) =>
    users
      .filter((user) => user.group === group.id)
      .map((user) => {
        const attempt = engine.latestAttempt(user)
        if (attempt) engine.touch(attempt)
        return { user, attempt }
      })

  const isFinished = ({ attempt }) => attempt && attempt.status !== 'active'

  const durationSeconds = (attempt) =>
    Math.round((attempt.finished_at - attempt.timing.started_at) / 1000)

  const percentOf = (attempt) =>
    Math.round((attempt.correct_count / attempt.questions.length) * 100)

  const summarize = (attempt, index) => {
    engine.touch(attempt)
    const finished = attempt.status !== 'active'
    return {
      label: `${index + 1}-urinish`,
      status: finished ? 'finished' : 'in_progress',
      correct_count: finished ? attempt.correct_count : null,
      n_total: attempt.questions.length,
      percent: finished ? percentOf(attempt) : null,
      duration_seconds: finished ? durationSeconds(attempt) : null,
      passed: finished ? attempt.passed : null,
      retake_reason: attempt.retake_reason,
    }
  }

  // Eksportda har bir urinish alohida qator.
  const perAttempt = ({ user }) => {
    const attempts = engine.attemptsOf(user)
    if (attempts.length === 0) return [{ user, attempt: null, label: '' }]
    return attempts.map((attempt, index) => ({
      user,
      attempt: engine.touch(attempt),
      label: attempts.length > 1 ? `${index + 1}-urinish` : '',
    }))
  }

  // Har bir shubhali urinish, jumladan qayta topshirishdan oldingisi ham.
  const suspiciousAttempts = (group) =>
    engine.attempts
      .filter((attempt) => attempt.suspicious && (!group || attempt.group === group.id))
      .map((attempt) => ({
        id: attempt.id,
        full_name: users.find((user) => user.id === attempt.user).full_name,
        group: {
          id: attempt.group,
          name: groups.find((candidate) => candidate.id === attempt.group).name,
        },
        score: `${attempt.correct_count ?? '—'} / ${attempt.questions.length}`,
        reasons: attempt.suspicious_reasons.map((reason) => reason.detail),
      }))

  const present = ({ user, attempt }) => {
    const finished = attempt && attempt.status !== 'active'
    return {
      id: user.id,
      full_name: user.full_name,
      pinfl: maskPinfl(user.pinfl),
      status: !attempt ? 'not_started' : finished ? 'finished' : 'in_progress',
      correct_count: finished ? attempt.correct_count : null,
      n_total: attempt ? attempt.questions.length : null,
      percent: finished ? percentOf(attempt) : null,
      duration_seconds: finished ? durationSeconds(attempt) : null,
      passed: finished ? attempt.passed : null,
      suspicious: attempt?.suspicious ?? false,
      attempts: engine.attemptsOf(user).map(summarize),
    }
  }

  const setOf = (group) => bank.sets.find((set) => set.id === group.question_set)

  // Avval eng yuqori natija, keyin hali topshirmaganlar.
  const byScore = (a, b) => (b.attempt?.correct_count ?? -1) - (a.attempt?.correct_count ?? -1)

  return {
    'GET /results/': async (req) => {
      staff(req)
      const group = groupFromQuery(req)
      const set = setOf(group)
      const members = memberResults(group).toSorted(byScore)
      const finished = members.filter(isFinished)

      return {
        group: { id: group.id, name: group.name, member_count: members.length },
        set: { name: set.name, question_count: set.question_count, pass_score: set.pass_score },
        chance_score: set.question_count * CHANCE_PER_QUESTION,
        summary: {
          finished: finished.length,
          passed: finished.filter(({ attempt }) => attempt.passed).length,
        },
        distribution: buildDistribution(
          finished.map(({ attempt }) => attempt),
          set.question_count,
          set.pass_score,
        ),
        suspicious: suspiciousAttempts(group),
        rows: members.map(present),
      }
    },

    'GET /results/suspicious/': async (req) => {
      staff(req)
      engine.activeAttempts().forEach(engine.touch)
      return suspiciousAttempts()
    },

    'GET /results/export.xlsx': async (req) => {
      const actor = staff(req)
      const group = groupFromQuery(req)
      const members = memberResults(group).toSorted(byScore)
      const workbook = new ExcelJS.Workbook()

      const sheet = workbook.addWorksheet('Natijalar')
      sheet.columns = [
        { header: 'F.I.Sh.', key: 'full_name', width: 36 },
        { header: 'PINFL', key: 'pinfl', width: 18 },
        { header: 'Tashkilot', key: 'organization', width: 26 },
        { header: 'Login', key: 'login', width: 14 },
        { header: "To'g'ri", key: 'correct', width: 9 },
        { header: 'Jami', key: 'total', width: 8 },
        { header: 'Foiz', key: 'percent', width: 8 },
        { header: 'Sarflangan vaqt (daq)', key: 'minutes', width: 20 },
        { header: 'Natija', key: 'result', width: 14 },
        { header: 'Ekrandan chiqish', key: 'exits', width: 16 },
        { header: 'Shubhali', key: 'suspicious', width: 10 },
        { header: 'Sabablar', key: 'reasons', width: 50 },
        { header: 'Qayta topshirish', key: 'retake', width: 30 },
        { header: 'Urinish', key: 'attempt_label', width: 12 },
      ]
      sheet.getRow(1).font = { bold: true }

      for (const { user, attempt, label } of members.flatMap(perAttempt)) {
        const finished = isFinished({ attempt })
        const row = {
          full_name: user.full_name,
          pinfl: user.pinfl,
          organization: user.organization,
          login: user.username,
          correct: finished ? attempt.correct_count : '',
          total: attempt?.questions.length ?? '',
          percent: finished ? percentOf(attempt) : '',
          minutes: finished ? Math.round(durationSeconds(attempt) / 60) : '',
          result: !attempt
            ? 'Topshirmagan'
            : !finished
              ? 'Davom etmoqda'
              : attempt.passed
                ? "O'tdi"
                : "O'tmadi",
          exits: attempt?.fullscreen_exits ?? 0,
          suspicious: attempt?.suspicious ? 'Ha' : "Yo'q",
          reasons: attempt?.suspicious_reasons.map((reason) => reason.detail).join('; ') ?? '',
          retake: attempt?.retake_reason ?? '',
          attempt_label: label,
        }
        sheet.addRow(safeRow(row))
      }

      const timing = workbook.addWorksheet("Savollar bo'yicha vaqt")
      const questionCount = setOf(group).question_count
      timing.columns = [
        { header: 'F.I.Sh.', key: 'full_name', width: 36 },
        ...Array.from({ length: questionCount }, (_, index) => ({
          header: String(index + 1),
          key: `q${index + 1}`,
          width: 6,
        })),
      ]
      timing.getRow(1).font = { bold: true }

      for (const { user, attempt, label } of members.flatMap(perAttempt).filter(isFinished)) {
        const row = { full_name: safeCell(label ? `${user.full_name} (${label})` : user.full_name) }
        for (const slot of attempt.questions) row[`q${slot.n}`] = Math.round(slot.time_spent_ms / 1000)
        timing.addRow(row)
      }

      audit(req, 'results_exported', actor, { type: 'group', repr: group.name }, { format: 'xlsx' })

      return new FileResponse({
        buffer: Buffer.from(await workbook.xlsx.writeBuffer()),
        filename: 'natijalar.xlsx',
        contentType: XLSX_TYPE,
      })
    },

    'GET /results/protocol.pdf': async (req) => {
      const actor = staff(req)
      const group = groupFromQuery(req)
      const set = setOf(group)
      const rows = memberResults(group)
        .toSorted((a, b) => a.user.full_name.localeCompare(b.user.full_name))
        .flatMap(perAttempt)
        .map(({ user, attempt, label }) => {
          const finished = isFinished({ attempt })
          return {
            full_name: label ? `${user.full_name} (${label})` : user.full_name,
            pinfl: user.pinfl,
            correct: finished ? `${attempt.correct_count} / ${attempt.questions.length}` : '—',
            percent: finished ? `${percentOf(attempt)}%` : '—',
            result: !attempt
              ? 'Topshirmagan'
              : !finished
                ? 'Davom etmoqda'
                : attempt.passed
                  ? "O'tdi"
                  : "O'tmadi",
          }
        })

      audit(req, 'results_exported', actor, { type: 'group', repr: group.name }, { format: 'pdf' })

      return new FileResponse({
        buffer: await buildProtocolPdf({ group, set, rows, date: new Date(now()) }),
        filename: 'protokol.pdf',
        contentType: 'application/pdf',
      })
    },

    'GET /dashboard/': async (req) => {
      staff(req)
      const openGroups = groups.filter((group) => group.test_status === 'open')
      engine.activeAttempts().forEach(engine.touch)

      const today = tashkentDate.format(new Date(now()))
      const finishedToday = engine.attempts.filter(
        (attempt) =>
          attempt.status !== 'active' && tashkentDate.format(new Date(attempt.finished_at)) === today,
      )

      return {
        open_groups: openGroups.length,
        working_now: engine.activeAttempts().length,
        finished_today: finishedToday.length,
        suspicious_count: suspiciousAttempts().length,
        open_tests: openGroups.map((group) => {
          const members = memberResults(group)
          return {
            id: group.id,
            name: group.name,
            set_name: setOf(group)?.name ?? '',
            opened_at: group.opened_at,
            member_count: members.length,
            working: members.filter(({ attempt }) => attempt?.status === 'active').length,
            finished: members.filter(isFinished).length,
          }
        }),
      }
    },
  }
}
