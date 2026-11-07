import PDFDocument from 'pdfkit'

const SEAL_NAVY = '#283770'
const INK = '#10202e'
const MUTED = '#4a5b6b'
const RULE = '#e2eaf2'

const MARGIN = 40
const ROW_HEIGHT = 20
const FOOTER_SPACE = 110
const SIGNED_TAIL_ROWS = 2

const COLUMNS = [
  { key: 'index', label: 'T/r', width: 26 },
  { key: 'full_name', label: 'F.I.Sh.', width: 205 },
  { key: 'pinfl', label: 'PINFL', width: 104 },
  { key: 'correct', label: "To'g'ri", width: 52 },
  { key: 'percent', label: 'Foiz', width: 40 },
  { key: 'result', label: 'Natija', width: 88 },
]

// Standart PDF shriftlarida ʻ belgisi yo'q; loyihada apostrof oddiy '.
const plain = (text) => String(text).replace(/[ʻʼ‘’`]/g, "'")

const dateFormat = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tashkent' })

function drawTitle(doc, group, set, date) {
  const width = doc.page.width - MARGIN * 2

  doc.font('Helvetica-Bold').fontSize(9).fillColor(SEAL_NAVY)
  doc.text("KASBIY TA'LIMNI RIVOJLANTIRISH INSTITUTI", MARGIN, MARGIN, {
    characterSpacing: 1,
    lineBreak: false,
  })
  doc.font('Helvetica-Bold').fontSize(16).fillColor(INK)
  doc.text('Chiqish testi natijalari protokoli', MARGIN, MARGIN + 14, { lineBreak: false })

  const ruleY = MARGIN + 38
  doc.moveTo(MARGIN, ruleY).lineTo(MARGIN + width, ruleY).lineWidth(1.5).strokeColor(SEAL_NAVY).stroke()

  doc.font('Helvetica').fontSize(10).fillColor(MUTED)
  doc.text(`Guruh: ${plain(group.name)} · ${plain(group.organization)}`, MARGIN, ruleY + 12, { width })
  doc.text(
    `To'plam: ${plain(set.name)} · ${set.question_count} savol · o'tish chegarasi ${set.pass_score}`,
    MARGIN,
    ruleY + 26,
    { width },
  )
  doc.text(`Sana: ${dateFormat.format(date).replaceAll('/', '.')}`, MARGIN, ruleY + 40, { width })
  return ruleY + 64
}

function drawHeaderRow(doc, y) {
  let x = MARGIN
  doc.font('Helvetica-Bold').fontSize(9).fillColor(MUTED)
  for (const column of COLUMNS) {
    doc.text(column.label, x + 3, y + 6, { width: column.width - 6, lineBreak: false })
    x += column.width
  }
  const right = x
  doc.moveTo(MARGIN, y + ROW_HEIGHT).lineTo(right, y + ROW_HEIGHT).lineWidth(0.75).strokeColor(CUT_COLOR).stroke()
  return y + ROW_HEIGHT
}

const CUT_COLOR = '#7b93a8'

function drawRow(doc, row, y) {
  let x = MARGIN
  doc.font('Helvetica').fontSize(9.5).fillColor(INK)
  for (const column of COLUMNS) {
    doc.font(column.key === 'pinfl' ? 'Courier' : 'Helvetica')
    doc.text(plain(row[column.key]), x + 3, y + 6, {
      width: column.width - 6,
      lineBreak: false,
      ellipsis: true,
    })
    x += column.width
  }
  doc.moveTo(MARGIN, y + ROW_HEIGHT).lineTo(x, y + ROW_HEIGHT).lineWidth(0.5).strokeColor(RULE).stroke()
  return y + ROW_HEIGHT
}

function drawSignatures(doc, y) {
  const width = doc.page.width - MARGIN * 2
  const slots = ["Test mas'uli", "Komissiya a'zosi"]
  const slotWidth = width / slots.length

  doc.font('Helvetica').fontSize(10).fillColor(INK)
  slots.forEach((label, index) => {
    const x = MARGIN + index * slotWidth
    doc.text(label, x, y, { lineBreak: false })
    doc
      .moveTo(x, y + 36)
      .lineTo(x + slotWidth - 24, y + 36)
      .lineWidth(0.75)
      .strokeColor(INK)
      .stroke()
    doc.fontSize(8).fillColor(MUTED).text('imzo, F.I.Sh.', x, y + 40, { lineBreak: false })
    doc.fontSize(10).fillColor(INK)
  })
}

export function buildProtocolPdf({ group, set, rows, date }) {
  const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true, bufferPages: true })
  const chunks = []
  doc.on('data', (chunk) => chunks.push(chunk))
  const finished = new Promise((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
  })

  const bottom = doc.page.height - MARGIN
  let y = drawHeaderRow(doc, drawTitle(doc, group, set, date))

  rows.forEach((row, index) => {
    const remaining = rows.length - index
    const isTail = remaining <= SIGNED_TAIL_ROWS
    const tooLow = y + ROW_HEIGHT > bottom
    // Imzolar sahifada yolg'iz qolmasin: oxirgi qatorlar ular bilan birga ko'chadi.
    const footerWontFit = isTail && y + remaining * ROW_HEIGHT + FOOTER_SPACE > bottom

    if (tooLow || footerWontFit) {
      doc.addPage()
      y = drawHeaderRow(doc, MARGIN)
    }
    y = drawRow(doc, { ...row, index: index + 1 }, y)
  })

  drawSignatures(doc, y + 32)

  const { start, count } = doc.bufferedPageRange()
  for (let page = 0; page < count; page += 1) {
    doc.switchToPage(start + page)
    doc.font('Helvetica').fontSize(8).fillColor(MUTED)
    doc.text(`${page + 1}-sahifa / ${count}`, MARGIN, doc.page.height - 26, {
      width: doc.page.width - MARGIN * 2,
      align: 'right',
      lineBreak: false,
    })
  }

  doc.end()
  return finished
}
