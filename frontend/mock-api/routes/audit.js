import ExcelJS from 'exceljs'
import { FileResponse } from '../http.js'

const PAGE_SIZE = 20

export const ACTION_LABELS = {
  login: 'Tizimga kirdi',
  logout: 'Tizimdan chiqdi',
  password_changed: "O'z parolini o'zgartirdi",
  admin_created: "Admin qo'shildi",
  admin_updated: "Admin ma'lumotlari o'zgartirildi",
  admin_password_changed: "Admin paroli o'zgartirildi",
  admin_blocked: 'Admin bloklandi',
  admin_unblocked: 'Admin blokdan chiqarildi',
  admin_deleted: "Admin o'chirildi",
  question_set_created: "To'plam yaratildi",
  question_set_updated: "To'plam o'zgartirildi",
  question_set_deleted: "To'plam o'chirildi",
  question_created: "Savol qo'shildi",
  question_updated: "Savol o'zgartirildi",
  question_deleted: "Savol o'chirildi",
  questions_imported: 'Savollar import qilindi',
  questions_synced: 'Savollar API orqali yangilandi',
  group_created: 'Guruh yaratildi',
  group_updated: "Guruh o'zgartirildi",
  member_added: "Tinglovchi qo'shildi",
  members_imported: 'Tinglovchilar import qilindi',
  credentials_generated: 'Login-parol generatsiya',
  exit_password_changed: "Chiqish paroli o'zgartirildi",
  test_opened: 'Test ochildi',
  test_closed: 'Test yopildi',
  test_open_failed: 'Test ochilmadi',
  retake_granted: 'Qayta topshirishga ruxsat',
  results_exported: 'Natijalar yuklab olindi',
}

const tashkentDateFormat = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent' })
const tashkentStampFormat = new Intl.DateTimeFormat('uz-Latn-UZ', {
  timeZone: 'Asia/Tashkent',
  dateStyle: 'short',
  timeStyle: 'medium',
})

// Sana filtri Toshkent vaqti bo'yicha: 00:30 dagi yozuv UTC'da oldingi kunga tushadi.
const tashkentDate = (iso) => tashkentDateFormat.format(new Date(iso))

const presentEntry = (entry) => ({ ...entry, action_label: ACTION_LABELS[entry.action] })

export function auditRoutes(state) {
  const { auditLog, requireRole } = state

  const filteredEntries = (query) => {
    const actor = query.get('actor')
    const action = query.get('action')
    const date = query.get('date')

    return auditLog
      .filter(
        (entry) =>
          (!actor || String(entry.actor) === actor) &&
          (!action || entry.action === action) &&
          (!date || tashkentDate(entry.at) === date),
      )
      .toReversed()
  }

  const filterOptions = () => ({
    actors: [...new Map(auditLog.map((entry) => [entry.actor, entry.actor_label]))].map(
      ([id, label]) => ({ id, label }),
    ),
    actions: Object.entries(ACTION_LABELS).map(([code, label]) => ({ code, label })),
  })

  return {
    'GET /audit/': async (req) => {
      requireRole(req, 'superadmin')
      const entries = filteredEntries(req.query)
      const page = Math.max(Number(req.query.get('page')) || 1, 1)
      const start = (page - 1) * PAGE_SIZE

      return {
        count: entries.length,
        page_size: PAGE_SIZE,
        results: entries.slice(start, start + PAGE_SIZE).map(presentEntry),
        filters: filterOptions(),
      }
    },

    'GET /audit/export.xlsx': async (req) => {
      requireRole(req, 'superadmin')
      const workbook = new ExcelJS.Workbook()
      const sheet = workbook.addWorksheet('Amallar jurnali')
      sheet.columns = [
        { header: 'Vaqt', key: 'at', width: 22 },
        { header: 'Kim', key: 'actor', width: 34 },
        { header: 'Amal', key: 'action', width: 30 },
        { header: 'Obyekt', key: 'object', width: 24 },
        { header: 'IP', key: 'ip', width: 18 },
      ]
      sheet.getRow(1).font = { bold: true }

      for (const entry of filteredEntries(req.query)) {
        sheet.addRow({
          at: tashkentStampFormat.format(new Date(entry.at)),
          actor: entry.actor_label,
          action: ACTION_LABELS[entry.action],
          object: entry.object_repr,
          ip: entry.ip,
        })
      }

      return new FileResponse({
        buffer: Buffer.from(await workbook.xlsx.writeBuffer()),
        filename: 'amallar-jurnali.xlsx',
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
    },
  }
}
