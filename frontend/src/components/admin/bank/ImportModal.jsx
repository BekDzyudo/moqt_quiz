import { ArrowLeft, Check, FileDown, Upload, Search, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { commitImport, downloadImportTemplate, previewImport } from '../../../api/bank.js'
import { errorMessage } from '../../../api/client.js'
import { useFormErrors } from '../../../lib/useFormErrors.js'
import Alert from '../../ui/Alert.jsx'
import Button from '../../ui/Button.jsx'
import DataTable from '../../ui/DataTable.jsx'
import Field from '../../ui/Field.jsx'
import Modal from '../../ui/Modal.jsx'
import StatTile from '../../ui/StatTile.jsx'
import StatusBadge from '../../ui/StatusBadge.jsx'

const PROBLEM_COLUMNS = [
  { key: 'row', header: 'Qator', render: (problem) => problem.row ?? 'Fayl' },
  {
    key: 'errors',
    header: 'Sabab',
    render: (problem) => (
      <div className="flex flex-col items-start gap-1">
        <StatusBadge tone={problem.status === 'duplicate' ? 'warning' : 'error'}>
          {problem.status === 'duplicate' ? 'Takror' : 'Xato'}
        </StatusBadge>
        <span className="text-[13px] leading-[19px] text-ink-600">{problem.errors.join(' ')}</span>
      </div>
    ),
  },
]

const SAMPLE_COLUMNS = [
  { key: 'text', header: 'savol' },
  { key: 'a', header: 'A' },
  { key: 'b', header: 'B' },
  { key: 'c', header: 'C' },
  { key: 'd', header: 'D' },
  { key: 'correct', header: "to'g'ri (A/B/C/D)" },
]

const SAMPLE_ROWS = [
  {
    id: 1,
    text: "Kompyuter tarmog'ida IP-manzilni avtomatik taqsimlovchi protokol qaysi?",
    a: 'DNS',
    b: 'DHCP',
    c: 'FTP',
    d: 'SMTP',
    correct: 'B',
  },
  {
    id: 2,
    text: "OSI modelida nechta pog'ona bor?",
    a: '4',
    b: '5',
    c: '6',
    d: '7',
    correct: 'D',
  },
]

function SelectStep({ sets, defaultSet, onPreview, onClose }) {
  const [setId, setSetId] = useState(defaultSet ?? '')
  const [file, setFile] = useState(null)
  const [checking, setChecking] = useState(false)
  const [templateError, setTemplateError] = useState(null)
  const { errors, clearErrors, clearField, captureError } = useFormErrors()
  const fileInput = useRef(null)

  const handleDownload = async (extension) => {
    setTemplateError(null)
    try {
      await downloadImportTemplate(extension)
    } catch (error) {
      setTemplateError(errorMessage(error))
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setChecking(true)
    clearErrors()
    try {
      onPreview(await previewImport(file, setId))
    } catch (error) {
      captureError(error)
      setChecking(false)
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field
        as="select"
        label="Savol to'plami"
        value={setId}
        onChange={(event) => {
          setSetId(event.target.value)
          clearField('question_set')
        }}
        error={errors.fields.question_set}
      >
        <option value="">To'plamni tanlang</option>
        {sets.map((set) => (
          <option key={set.id} value={set.id}>
            {set.name}
          </option>
        ))}
      </Field>

      <div className="flex flex-col items-start gap-2">
        <input
          ref={fileInput}
          type="file"
          accept=".xlsx,.docx"
          aria-label="Import fayli"
          className="hidden"
          onChange={(event) => {
            setFile(event.target.files[0] ?? null)
            clearField('file')
          }}
        />
        <Button variant="dashed" icon={Upload} onClick={() => fileInput.current.click()}>
          {file ? file.name : 'Excel yoki Word fayl tanlash'}
        </Button>
        {errors.fields.file && <Alert tone="error">{errors.fields.file}</Alert>}
      </div>

      <section className="flex flex-col gap-3 rounded-xl border border-border-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="m-0 text-[15px] font-semibold">Excel fayl namunasi</h3>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="xs" icon={FileDown} onClick={() => handleDownload('xlsx')}>
              Excel shablon
            </Button>
            <Button variant="secondary" size="xs" icon={FileDown} onClick={() => handleDownload('docx')}>
              Word shablon
            </Button>
          </div>
        </div>
        <DataTable compact columns={SAMPLE_COLUMNS} rows={SAMPLE_ROWS} minWidth={640} />
        <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-[13px] text-ink-600">
          <li className="leading-[19px]">Birinchi qator sarlavha, savollar ikkinchi qatordan boshlanadi.</li>
          <li className="leading-[19px]">"to'g'ri" ustunida to'g'ri javob harfi: A, B, C yoki D.</li>
          <li className="leading-[19px]">
            Word faylda: raqamlangan savol, keyin A)…D) qatorlar, to'g'ri variant oldida * yoki qalin.
          </li>
          <li className="leading-[19px]">
            Ixtiyoriy: Excel'ga 7-ustun "yo'nalish" qo'shib, to'plam nomini yozsangiz, nomi mos
            kelmagan savollar ham rad etiladi.
          </li>
          <li className="leading-[19px]">Shablondagi namuna savollarni o'chirib, o'z savollaringizni kiriting.</li>
        </ul>
        <Alert tone="info">
          Bitta ham xato bo'lsa, fayl to'liq rad etiladi: boshqa to'plamda bor savol, bir xil
          variantlar yoki takror savol. Xatolarni tuzatib, faylni qayta yuklang.
        </Alert>
      </section>

      {templateError && <Alert tone="error">{templateError}</Alert>}
      {errors.form && <Alert tone="error">{errors.form}</Alert>}

      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="secondary" icon={X} onClick={onClose}>
          Bekor qilish
        </Button>
        <Button type="submit" icon={Search} loading={checking} disabled={!file}>
          Tekshirish
        </Button>
      </div>
    </form>
  )
}

function PreviewStep({ preview, onBack, onDone }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const invalid = preview.problems.filter((problem) => problem.status === 'invalid').length
  const duplicates = preview.problems.length - invalid

  const handleCommit = async () => {
    setSaving(true)
    setError(null)
    try {
      onDone((await commitImport(preview.token)).created)
    } catch (commitError) {
      setError(errorMessage(commitError))
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 text-ink-600">
        {preview.file_name} · {preview.set_name}
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Jami" value={preview.total} />
        <StatTile label="Yaroqli" value={preview.valid_count} />
        <StatTile label="Xatoli" value={invalid} />
        <StatTile label="Takroriy" value={duplicates} />
      </div>

      {preview.problems.length > 0 && (
        <Alert tone="error">
          Fayl rad etildi: {preview.problems.length} ta xato topildi. Hech qaysi savol saqlanmaydi.
          Xatolarni tuzatib, faylni qayta yuklang.
        </Alert>
      )}

      {preview.problems.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="m-0 text-[17px] leading-6 font-semibold">Xatolar</h3>
          <div className="max-h-64 overflow-y-auto">
            <DataTable columns={PROBLEM_COLUMNS} rows={preview.problems} minWidth={480} />
          </div>
        </section>
      )}

      {preview.sample.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="m-0 text-[17px] leading-6 font-semibold">Namuna</h3>
          <ul className="m-0 flex list-none flex-col gap-1 p-0 text-ink-600">
            {preview.sample.map((row) => (
              <li key={row.row}>
                {row.text} <strong className="text-success">({row.correct})</strong>
              </li>
            ))}
          </ul>
        </section>
      )}

      {error && <Alert tone="error">{error}</Alert>}

      <div className="flex flex-wrap justify-between gap-3">
        <Button variant="secondary" icon={ArrowLeft} onClick={onBack}>
          Boshqa fayl
        </Button>
        <Button
          icon={Check}
          loading={saving}
          disabled={preview.valid_count === 0}
          onClick={handleCommit}
        >
          {preview.valid_count} ta savolni saqlash
        </Button>
      </div>
    </div>
  )
}

function ImportFlow({ sets, defaultSet, onClose, onImported }) {
  const [preview, setPreview] = useState(null)
  const [created, setCreated] = useState(null)

  if (created !== null) {
    return (
      <div className="flex flex-col gap-4">
        <Alert tone="success">{created} ta savol bankka qo'shildi.</Alert>
        <div className="flex justify-end">
          <Button icon={Check} onClick={onClose}>
            Yopish
          </Button>
        </div>
      </div>
    )
  }

  if (preview) {
    return (
      <PreviewStep
        preview={preview}
        onBack={() => setPreview(null)}
        onDone={(count) => {
          setCreated(count)
          onImported()
        }}
      />
    )
  }

  return <SelectStep sets={sets} defaultSet={defaultSet} onPreview={setPreview} onClose={onClose} />
}

export default function ImportModal({ open, sets, defaultSet, onClose, onImported }) {
  return (
    <Modal width="max-w-[760px]" open={open} onClose={onClose} title="Excel/Word import">
      <ImportFlow sets={sets} defaultSet={defaultSet} onClose={onClose} onImported={onImported} />
    </Modal>
  )
}
