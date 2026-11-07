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
  { key: 'row', header: 'Qator' },
  {
    key: 'text',
    header: 'Savol',
    render: (problem) => problem.text || <span className="text-ink-400">Matn yo'q</span>,
  },
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

      <div className="flex flex-col gap-2 rounded-xl bg-surface-muted p-4 text-[13px] leading-[19px] text-ink-600">
        <p className="m-0">
          Excel: savol, A, B, C, D, to'g'ri javob ustunlari. Word: raqamlangan savol, keyin A)…D)
          qatorlar, to'g'ri variant oldida * yoki qalin.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="xs" icon={FileDown} onClick={() => handleDownload('xlsx')}>
            Excel shablon
          </Button>
          <Button variant="secondary" size="xs" icon={FileDown} onClick={() => handleDownload('docx')}>
            Word shablon
          </Button>
        </div>
      </div>

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
        <section className="flex flex-col gap-2">
          <h3 className="m-0 text-[17px] leading-6 font-semibold">Saqlanmaydigan qatorlar</h3>
          <div className="max-h-64 overflow-y-auto">
            <DataTable
              columns={PROBLEM_COLUMNS}
              rows={preview.problems}
              rowKey={(problem) => problem.row}
              minWidth={560}
            />
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
