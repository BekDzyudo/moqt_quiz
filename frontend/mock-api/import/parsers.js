import ExcelJS from 'exceljs'
import JSZip from 'jszip'

const LETTERS = ['A', 'B', 'C', 'D']
const OPTION_LINE = /^(\*?)\s*([A-Da-d])\s*[).]\s*(.*)$/
const NUMBER_PREFIX = /^\d+\s*[.)]\s*/

// Excel katagi matn, raqam, boyitilgan matn yoki formula natijasi bo'lishi mumkin.
function cellText(cell) {
  const { value } = cell
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') {
    if (value.richText) return value.richText.map((part) => part.text).join('').trim()
    if (value.result !== undefined) return String(value.result).trim()
    if (value.text) return String(value.text).trim()
  }
  return String(value).trim()
}

// Sarlavha qatori tashlanadi. `row` — foydalanuvchi faylda ko'radigan qator raqami.
export async function parseExcel(buffer) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const sheet = workbook.worksheets[0]
  const rows = []

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    const cells = [1, 2, 3, 4, 5, 6].map((column) => cellText(row.getCell(column)))
    if (cells.every((value) => value === '')) return

    rows.push({
      row: rowNumber,
      text: cells[0],
      options: cells.slice(1, 5),
      correct: cells[5].toUpperCase(),
    })
  })

  return rows
}

// Excel PINFL'ni raqam qilib saqlashi mumkin: 14 xonali son aniqlikni yo'qotmaydi.
export async function parseMembersExcel(buffer) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const rows = []

  workbook.worksheets[0].eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    const [fullName, pinfl, organization] = [1, 2, 3].map((column) => cellText(row.getCell(column)))
    if (!fullName && !pinfl && !organization) return
    rows.push({ row: rowNumber, full_name: fullName, pinfl, organization })
  })

  return rows
}

const decodeXml = (value) =>
  value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&amp;', '&')

function readParagraphs(xml) {
  return [...xml.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)]
    .map(([paragraph]) => {
      const runs = [...paragraph.matchAll(/<w:r[ >][\s\S]*?<\/w:r>/g)]
        .map(([run]) => ({
          text: decodeXml([...run.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]).join('')),
          bold: /<w:b(\s+[^>]*)?\/>/.test(run) && !/<w:b\s+w:val="(0|false)"/.test(run),
        }))
        .filter((run) => run.text.trim() !== '')

      return {
        text: runs.map((run) => run.text).join('').trim(),
        bold: runs.length > 0 && runs.every((run) => run.bold),
      }
    })
    .filter((paragraph) => paragraph.text !== '')
}

// Har bir savol uchun: raqamlangan qator, keyin A)…D). To'g'ri variant `*` yoki qalin bilan.
export async function parseWord(buffer) {
  const zip = await JSZip.loadAsync(buffer)
  const documentXml = await zip.file('word/document.xml').async('string')
  const rows = []
  let current = null

  for (const paragraph of readParagraphs(documentXml)) {
    const option = OPTION_LINE.exec(paragraph.text)

    if (option && current) {
      const [, star, letter, text] = option
      const index = LETTERS.indexOf(letter.toUpperCase())
      current.options[index] = text.trim()
      if (star || paragraph.bold) current.marked.push(LETTERS[index])
    } else {
      current = {
        row: rows.length + 1,
        text: paragraph.text.replace(NUMBER_PREFIX, ''),
        options: ['', '', '', ''],
        marked: [],
      }
      rows.push(current)
    }
  }

  return rows.map(({ marked, ...row }) => ({
    ...row,
    correct: marked.length === 1 ? marked[0] : marked.join(','),
  }))
}
