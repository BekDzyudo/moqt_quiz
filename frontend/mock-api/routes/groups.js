import { randomUUID } from 'node:crypto'
import {
  buildCredentialsExcel,
  buildCredentialsPdf,
  buildMembersTemplate,
} from '../credentials-files.js'
import { ApiError, FileResponse, notFound, readJson, readMultipart, Reply, validationError } from '../http.js'
import { parseMembersExcel } from '../import/parsers.js'
import { generateListenerPassword, hashPassword } from '../passwords.js'

const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const PINFL_PATTERN = /^\d{14}$/
const PREFIX_PATTERN = /^[A-Z0-9]{2,12}$/
const MIN_EXIT_PASSWORD_LENGTH = 6
const MAX_FILE_BYTES = 5 * 1024 * 1024

const text = (value) => (typeof value === 'string' ? value.trim() : '')

const pad = (sequence) => String(sequence).padStart(3, '0')

function formatRemaining(ms) {
  const seconds = Math.ceil(ms / 1000)
  const minutes = String(Math.floor(seconds / 60)).padStart(2, '0')
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}

export function groupRoutes(state) {
  const { audit, requireRole, bank, users, engine } = state
  const groups = state.groups
  const previews = new Map()
  const staff = (req) => requireRole(req, 'admin', 'superadmin')

  const findGroup = (id) => {
    const group = groups.find((candidate) => String(candidate.id) === String(id))
    if (!group) throw notFound("Guruh topilmadi. Ro'yxatni yangilab, qayta urining.")
    return group
  }

  const groupObject = (group) => ({ type: 'group', repr: group.name })
  const membersOf = (group) => users.filter((user) => user.group === group.id)
  const setOf = (group) => bank.sets.find((set) => set.id === group.question_set)

  const presentRow = (group) => {
    const members = membersOf(group)
    return {
      id: group.id,
      name: group.name,
      organization: group.organization,
      question_set: group.question_set,
      set_name: setOf(group)?.name ?? '',
      test_status: group.test_status,
      member_count: members.length,
      finished_count: members.filter((member) => {
        const attempt = engine.latestAttempt(member)
        return attempt && attempt.status !== 'active'
      }).length,
    }
  }

  const presentDetail = (group) => {
    const members = membersOf(group)
    const set = setOf(group)
    return {
      ...presentRow(group),
      login_prefix: group.login_prefix,
      opened_at: group.opened_at,
      closed_at: group.closed_at,
      exit_password_set: group.exit_password_hash !== null,
      credentials_count: members.filter((member) => member.has_credentials).length,
      set: set && {
        name: set.name,
        question_count: set.question_count,
        duration_minutes: set.duration_minutes,
        pass_score: set.pass_score,
      },
    }
  }

  const presentLive = (user) => {
    const attempt = engine.latestAttempt(user)
    if (!attempt) {
      return {
        status: 'not_started',
        progress: null,
        fullscreen_exits: 0,
        suspicious: false,
        can_retake: false,
      }
    }

    engine.touch(attempt)
    const total = attempt.questions.length
    const answered = attempt.questions.filter((slot) => slot.selected_option !== null).length
    const active = attempt.status === 'active'

    return {
      status: active ? 'in_progress' : 'finished',
      progress: active
        ? `${answered} / ${total} · ${formatRemaining(engine.remainingMs(attempt))} qoldi`
        : `${attempt.correct_count} / ${total} · ${attempt.passed ? "O'tdi" : "O'tmadi"}`,
      fullscreen_exits: attempt.fullscreen_exits,
      suspicious: attempt.suspicious,
      can_retake: !active && !user.retake,
    }
  }

  const presentMember = (user) => ({
    id: user.id,
    full_name: user.full_name,
    pinfl: user.pinfl,
    organization: user.organization,
    login: user.has_credentials ? user.username : null,
    has_credentials: user.has_credentials,
    live: presentLive(user),
  })

  const groupErrors = (body, current = null) => {
    const name = text(body.name)
    const prefix = text(body.login_prefix).toUpperCase()
    const others = groups.filter((group) => group !== current)
    const nameTaken = others.some((group) => group.name.toLowerCase() === name.toLowerCase())
    const prefixTaken = others.some((group) => group.login_prefix === prefix)

    return {
      name: !name ? 'Guruh nomini kiriting.' : nameTaken ? 'Bu nom band. Boshqa nom kiriting.' : undefined,
      organization: text(body.organization) ? undefined : 'Tashkilotni kiriting.',
      question_set: bank.sets.some((set) => set.id === body.question_set)
        ? undefined
        : "Savol to'plamini tanlang.",
      login_prefix: !PREFIX_PATTERN.test(prefix)
        ? '2–12 ta katta lotin harfi yoki raqam kiriting.'
        : prefixTaken
          ? 'Bu prefiks band. Boshqa prefiks kiriting.'
          : undefined,
    }
  }

  const isDateOrEmpty = (value) => value === null || value === undefined || !Number.isNaN(Date.parse(value))

  const scheduleErrors = ({ scheduled_open_at: openAt, scheduled_close_at: closeAt }) => ({
    scheduled_open_at: isDateOrEmpty(openAt) ? undefined : "Sana noto'g'ri.",
    scheduled_close_at: isDateOrEmpty(closeAt) ? undefined : "Sana noto'g'ri.",
  })

  const throwIfInvalid = (fields) => {
    if (Object.values(fields).some(Boolean)) throw validationError(fields)
  }

  // Boshqa guruhda bo'lish xato emas: tinglovchi qayta o'qishga kelgan bo'lishi mumkin.
  const otherGroupWarning = (pinfl, group) => {
    const other = users.find((user) => {
      if (user.pinfl !== pinfl || user.group === group.id) return false
      return groups.find((candidate) => candidate.id === user.group)?.test_status !== 'finished'
    })
    if (!other) return null
    const name = groups.find((candidate) => candidate.id === other.group).name
    return `Bu PINFL ${name} guruhida ham bor.`
  }

  const memberErrors = ({ full_name: fullName, pinfl }, takenPinfls) => {
    const errors = []
    if (!fullName) errors.push("F.I.Sh. bo'sh.")
    if (!PINFL_PATTERN.test(pinfl)) errors.push('PINFL 14 ta raqamdan iborat bo\'lishi kerak.')
    else if (takenPinfls.has(pinfl)) errors.push('Bu PINFL guruhda allaqachon bor.')
    return errors
  }

  const addMember = (group, { full_name: fullName, pinfl, organization }) => {
    const sequence = Math.max(0, ...membersOf(group).map((member) => member.sequence)) + 1
    return state.createUser({
      username: null,
      password_hash: null,
      full_name: fullName,
      role: 'listener',
      organization: organization || group.organization,
      is_active: true,
      group: group.id,
      sequence,
      pinfl,
      has_credentials: false,
    })
  }

  return {
    'GET /groups/': async (req) => {
      staff(req)
      const search = text(req.query.get('q')).toLowerCase()
      const status = req.query.get('status')

      return groups
        .filter(
          (group) =>
            (!search || group.name.toLowerCase().includes(search)) &&
            (!status || group.test_status === status),
        )
        .map(presentRow)
    },

    'POST /groups/': async (req) => {
      const actor = staff(req)
      const body = await readJson(req)
      throwIfInvalid(groupErrors(body))

      const group = {
        id: groups.length + 1,
        name: text(body.name),
        organization: text(body.organization),
        question_set: body.question_set,
        test_status: 'closed',
        login_prefix: text(body.login_prefix).toUpperCase(),
        opened_at: null,
        closed_at: null,
        scheduled_open_at: null,
        scheduled_close_at: null,
        exit_password_hash: null,
      }
      groups.push(group)
      audit(req, 'group_created', actor, groupObject(group))
      return new Reply(201, presentDetail(group))
    },

    'GET /groups/members/template.xlsx': async (req) => {
      staff(req)
      return new FileResponse({
        buffer: await buildMembersTemplate(),
        filename: 'tinglovchilar-shabloni.xlsx',
        contentType: XLSX_TYPE,
      })
    },

    'GET /groups/:id/': async (req) => {
      staff(req)
      return presentDetail(findGroup(req.params.id))
    },

    'PATCH /groups/:id/': async (req) => {
      const actor = staff(req)
      const group = findGroup(req.params.id)
      const merged = { ...group, ...(await readJson(req)) }
      throwIfInvalid(groupErrors(merged, group))

      const setChanged = merged.question_set !== group.question_set
      if (setChanged && group.test_status !== 'closed') {
        throw validationError({
          question_set: "Test ochilgandan keyin savol to'plamini almashtirib bo'lmaydi.",
        })
      }

      const prefix = text(merged.login_prefix).toUpperCase()
      const hasLogins = membersOf(group).some((member) => member.has_credentials)
      if (prefix !== group.login_prefix && hasLogins) {
        throw validationError({
          login_prefix: "Login-parollar yaratilgan, prefiksni o'zgartirib bo'lmaydi.",
        })
      }

      const fields = scheduleErrors(merged)
      throwIfInvalid(fields)

      Object.assign(group, {
        name: text(merged.name),
        organization: text(merged.organization),
        question_set: merged.question_set,
        login_prefix: prefix,
        scheduled_open_at: merged.scheduled_open_at ?? null,
        scheduled_close_at: merged.scheduled_close_at ?? null,
      })
      audit(req, 'group_updated', actor, groupObject(group))
      return presentDetail(group)
    },

    'GET /groups/:id/members/': async (req) => {
      staff(req)
      return membersOf(findGroup(req.params.id)).map(presentMember)
    },

    'POST /groups/:id/members/': async (req) => {
      const actor = staff(req)
      const group = findGroup(req.params.id)
      const body = await readJson(req)
      const row = {
        full_name: text(body.full_name),
        pinfl: text(body.pinfl),
        organization: text(body.organization),
      }

      const taken = new Set(membersOf(group).map((member) => member.pinfl))
      const fields = {
        full_name: row.full_name ? undefined : 'F.I.Sh. ni kiriting.',
        pinfl: memberErrors({ ...row, full_name: 'x' }, taken)[0],
      }
      throwIfInvalid(fields)

      const warning = otherGroupWarning(row.pinfl, group)
      const member = addMember(group, row)
      audit(req, 'member_added', actor, groupObject(group), { member: member.full_name })
      return new Reply(201, { ...presentMember(member), warning })
    },

    'POST /groups/:id/members/import/preview/': async (req) => {
      staff(req)
      const group = findGroup(req.params.id)
      const form = await readMultipart(req)
      const file = form.get('file')

      if (!(file instanceof File)) throw validationError({ file: 'Fayl tanlang.' })
      if (!file.name.toLowerCase().endsWith('.xlsx')) {
        throw validationError({ file: 'Faqat .xlsx fayl yuklang.' })
      }
      if (file.size > MAX_FILE_BYTES) {
        throw validationError({ file: 'Fayl juda katta: 5 MB gacha fayl yuklang.' })
      }

      let rows
      try {
        rows = await parseMembersExcel(Buffer.from(await file.arrayBuffer()))
      } catch {
        throw validationError({
          file: "Faylni o'qib bo'lmadi. Shablonni yuklab olib, ro'yxatni shunga ko'chiring.",
        })
      }

      const taken = new Set(membersOf(group).map((member) => member.pinfl))
      const valid = []
      const problems = []

      for (const row of rows) {
        const errors = memberErrors(row, taken)
        if (errors.length > 0) {
          problems.push({ row: row.row, full_name: row.full_name, pinfl: row.pinfl, errors })
          continue
        }
        taken.add(row.pinfl)
        valid.push({ ...row, warning: otherGroupWarning(row.pinfl, group) })
      }

      const token = randomUUID()
      previews.set(token, { groupId: group.id, fileName: file.name, valid })

      return {
        token,
        file_name: file.name,
        total: rows.length,
        valid_count: valid.length,
        problems,
        warnings: valid.filter((row) => row.warning),
        sample: valid.slice(0, 5),
      }
    },

    'POST /groups/:id/members/import/commit/': async (req) => {
      const actor = staff(req)
      const group = findGroup(req.params.id)
      const { token } = await readJson(req)
      const preview = previews.get(token)
      if (!preview || preview.groupId !== group.id) {
        throw notFound('Tekshiruv natijasi eskirgan. Faylni qayta tanlang.')
      }
      previews.delete(token)

      for (const row of preview.valid) addMember(group, row)

      audit(req, 'members_imported', actor, groupObject(group), {
        file: preview.fileName,
        created: preview.valid.length,
      })
      return { created: preview.valid.length }
    },

    // Ochiq parol faqat shu javobda: mock'da ham, Django'da ham boshqa joyda saqlanmaydi.
    'POST /groups/:id/credentials/': async (req) => {
      const actor = staff(req)
      const group = findGroup(req.params.id)
      const { user_ids: userIds } = await readJson(req)
      const members = membersOf(group).filter((member) => !userIds || userIds.includes(member.id))

      if (members.length === 0) {
        throw new ApiError(
          400,
          'no_members',
          "Guruhda tinglovchilar yo'q. Avval ro'yxatni yuklang.",
        )
      }

      const cards = members.map((member) => {
        const password = generateListenerPassword()
        member.username = `${group.login_prefix}-${pad(member.sequence)}`
        member.password_hash = hashPassword(password)
        member.has_credentials = true
        // Qayta generatsiyadan keyin eski seans ham bekor bo'ladi.
        member.session_version += 1
        return { user_id: member.id, full_name: member.full_name, login: member.username, password }
      })

      const setName = setOf(group)?.name ?? ''
      const [pdf, excel] = await Promise.all([
        buildCredentialsPdf(group, setName, cards),
        buildCredentialsExcel(cards),
      ])

      audit(req, 'credentials_generated', actor, groupObject(group), { count: cards.length })

      return {
        count: cards.length,
        credentials: cards,
        pdf_base64: pdf.toString('base64'),
        xlsx_base64: excel.toString('base64'),
      }
    },

    'POST /groups/:id/open/': async (req) => {
      const actor = staff(req)
      const group = findGroup(req.params.id)
      if (group.test_status !== 'open') engine.openGroup(group, actor, req)
      return presentDetail(group)
    },

    'POST /groups/:id/close/': async (req) => {
      const actor = staff(req)
      const group = findGroup(req.params.id)
      const { mode } = await readJson(req)

      if (!['let_finish', 'finish_now'].includes(mode)) {
        throw validationError({ mode: 'Yopish usulini tanlang.' })
      }
      if (group.test_status !== 'open') {
        throw new ApiError(409, 'test_closed', 'Test ochiq emas.')
      }

      const terminated = engine.closeGroup(group, mode, actor, req)
      return { ...presentDetail(group), terminated }
    },

    'POST /groups/:id/members/:uid/retake/': async (req) => {
      const actor = staff(req)
      const group = findGroup(req.params.id)
      const member = membersOf(group).find((user) => String(user.id) === req.params.uid)
      if (!member) throw notFound('Tinglovchi bu guruhda topilmadi.')

      const reason = text((await readJson(req)).reason)
      if (!reason) throw validationError({ reason: 'Sababni yozing.' })

      const attempt = engine.latestAttempt(member)
      if (!attempt) {
        throw new ApiError(409, 'no_attempt', 'Tinglovchi hali testni boshlamagan.')
      }
      if (engine.touch(attempt).status === 'active') {
        throw new ApiError(409, 'attempt_active', 'Test hali davom etmoqda. Yakunlangach ruxsat bering.')
      }

      member.retake = { reason }
      audit(req, 'retake_granted', actor, { type: 'user', repr: member.username }, { reason })
      return presentMember(member)
    },

    'POST /groups/:id/exit-password/': async (req) => {
      const actor = staff(req)
      const group = findGroup(req.params.id)
      const body = await readJson(req)
      const manual = text(body.password)

      if (manual && manual.length < MIN_EXIT_PASSWORD_LENGTH) {
        throw validationError({
          password: `Parol kamida ${MIN_EXIT_PASSWORD_LENGTH} belgidan iborat bo'lsin.`,
        })
      }

      const password = manual || generateListenerPassword()
      group.exit_password_hash = hashPassword(password)
      audit(req, 'exit_password_changed', actor, groupObject(group))
      return { password }
    },
  }
}
