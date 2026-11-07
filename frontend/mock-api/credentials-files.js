import ExcelJS from 'exceljs'
import PDFDocument from 'pdfkit'

const SEAL_NAVY = '#283770'
const INK = '#10202e'
const MUTED = '#4a5b6b'
const CUT_LINE = '#7b93a8'

const PAGE_MARGIN = 36
const COLUMNS = 2
const ROWS = 5
const PER_PAGE = COLUMNS * ROWS
const CARD_HEIGHT = 126
const GRID_TOP = 122
const CARD_PADDING = 15

// Standart PDF shriftlarida ʻ belgisi yo'q; loyihada apostrof oddiy '.
const plain = (text) => text.replace(/[ʻʼ‘’`]/g, "'")

function drawHeader(doc, group, page, pages) {
  const width = doc.page.width - PAGE_MARGIN * 2

  doc.font('Helvetica-Bold').fontSize(9).fillColor(SEAL_NAVY)
  doc.text("KASBIY TA'LIMNI RIVOJLANTIRISH INSTITUTI", PAGE_MARGIN, PAGE_MARGIN, {
    characterSpacing: 1,
    lineBreak: false,
  })
  doc.font('Helvetica-Bold').fontSize(15).fillColor(INK)
  doc.text('Chiqish testi uchun login va parollar', PAGE_MARGIN, PAGE_MARGIN + 14, {
    lineBreak: false,
  })

  doc.font('Helvetica').fontSize(10).fillColor(MUTED)
  doc.text(`Guruh ${group.name}`, PAGE_MARGIN, PAGE_MARGIN + 4, { width, align: 'right' })
  doc.text(`${page}-sahifa / ${pages}`, PAGE_MARGIN, PAGE_MARGIN + 18, { width, align: 'right' })

  const ruleY = PAGE_MARGIN + 38
  doc
    .moveTo(PAGE_MARGIN, ruleY)
    .lineTo(PAGE_MARGIN + width, ruleY)
    .lineWidth(1.5)
    .strokeColor(SEAL_NAVY)
    .stroke()

  doc.font('Helvetica').fontSize(10).fillColor(MUTED)
  doc.text(
    "Kartochkalarni chiziq bo'ylab kesib, har bir tinglovchiga shaxsan topshiring. Kirish manzili: test.moqt.uz",
    PAGE_MARGIN,
    ruleY + 16,
    { width },
  )
}

function drawCard(doc, card, setName, x, y, width) {
  doc
    .rect(x, y, width, CARD_HEIGHT)
    .dash(3, { space: 3 })
    .lineWidth(0.75)
    .strokeColor(CUT_LINE)
    .stroke()
    .undash()

  const left = x + CARD_PADDING
  const inner = width - CARD_PADDING * 2

  doc.font('Helvetica-Bold').fontSize(11).fillColor(INK)
  doc.text(plain(card.full_name), left, y + CARD_PADDING, { width: inner, lineBreak: false, ellipsis: true })

  const rows = [
    ['Login', card.login, y + 42],
    ['Parol', card.password, y + 66],
  ]
  for (const [label, value, rowY] of rows) {
    doc.font('Helvetica-Bold').fontSize(10).fillColor(MUTED).text(label, left, rowY + 2, { lineBreak: false })
    doc.font('Courier-Bold').fontSize(14).fillColor(INK).text(value, left + 48, rowY, { lineBreak: false })
  }

  doc.font('Helvetica').fontSize(9).fillColor(MUTED)
  doc.text(`${plain(setName)} · faqat shu test uchun`, left, y + CARD_HEIGHT - 24, {
    width: inner,
    lineBreak: false,
  })
}

// Design/screens/Varaqa.dc.html: A4, 2 ustun × 5 qator kesiladigan kartochka.
export function buildCredentialsPdf(group, setName, cards) {
  const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: false })
  const chunks = []
  doc.on('data', (chunk) => chunks.push(chunk))
  const finished = new Promise((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
  })

  const pages = Math.ceil(cards.length / PER_PAGE)

  for (let page = 0; page < pages; page += 1) {
    doc.addPage()
    drawHeader(doc, group, page + 1, pages)

    const width = (doc.page.width - PAGE_MARGIN * 2) / COLUMNS
    cards.slice(page * PER_PAGE, (page + 1) * PER_PAGE).forEach((card, index) => {
      const x = PAGE_MARGIN + (index % COLUMNS) * width
      const y = GRID_TOP + Math.floor(index / COLUMNS) * CARD_HEIGHT
      drawCard(doc, card, setName, x, y, width)
    })
  }

  doc.end()
  return finished
}

export async function buildCredentialsExcel(cards) {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Login-parollar')
  sheet.columns = [
    { header: 'F.I.Sh.', key: 'full_name', width: 36 },
    { header: 'Login', key: 'login', width: 16 },
    { header: 'Parol', key: 'password', width: 12 },
  ]
  sheet.getRow(1).font = { bold: true }
  sheet.addRows(cards)
  return Buffer.from(await workbook.xlsx.writeBuffer())
}

export async function buildMembersTemplate(rows = [['Karimova Dilnoza Rustamovna', '30101900000017', 'Toshkent MOM']]) {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Tinglovchilar')
  sheet.columns = [
    { header: 'F.I.Sh.', width: 36 },
    { header: 'PINFL', width: 18 },
    { header: 'Tashkilot', width: 28 },
  ]
  sheet.getRow(1).font = { bold: true }
  sheet.getColumn(2).numFmt = '@'
  sheet.addRows(rows)
  return Buffer.from(await workbook.xlsx.writeBuffer())
}
