import ExcelJS from 'exceljs'
import JSZip from 'jszip'

const SAMPLES = [
  ["Kompyuter tarmog'ida IP-manzilni avtomatik taqsimlovchi protokol qaysi?", 'DNS', 'DHCP', 'FTP', 'SMTP', 'B'],
  ["OSI modelida nechta pog'ona bor?", '4', '5', '6', '7', 'D'],
]

export async function buildExcelTemplate(rows = SAMPLES) {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Savollar')
  sheet.columns = [
    { header: 'savol', width: 70 },
    { header: 'A', width: 20 },
    { header: 'B', width: 20 },
    { header: 'C', width: 20 },
    { header: 'D', width: 20 },
    { header: "to'g'ri (A/B/C/D)", width: 18 },
  ]
  sheet.getRow(1).font = { bold: true }
  sheet.addRows(rows)
  return Buffer.from(await workbook.xlsx.writeBuffer())
}

const escapeXml = (value) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

const paragraph = (text, bold = false) =>
  `<w:p><w:r>${bold ? '<w:rPr><w:b/></w:rPr>' : ''}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`

const NAMESPACE = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'

// Eng kichik yaroqli .docx: Word shu uchta qism bilan ochadi.
export async function buildWordDocument(lines) {
  const body = lines.map(([text, bold]) => paragraph(text, bold)).join('')
  const zip = new JSZip()

  zip.file(
    '[Content_Types].xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
  )
  zip.file(
    '_rels/.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
  )
  zip.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NAMESPACE}><w:body>${body}</w:body></w:document>`,
  )

  return zip.generateAsync({ type: 'nodebuffer' })
}

export const buildWordTemplate = () =>
  buildWordDocument([
    ["1. Kompyuter tarmog'ida IP-manzilni avtomatik taqsimlovchi protokol qaysi?"],
    ['A) DNS'],
    ['*B) DHCP'],
    ['C) FTP'],
    ['D) SMTP'],
    ["2. OSI modelida nechta pog'ona bor?"],
    ['A) 4'],
    ['B) 5'],
    ['C) 6'],
    ['D) 7', true],
  ])
