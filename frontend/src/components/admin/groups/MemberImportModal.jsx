import { ArrowLeft, Check, FileDown, Upload, Search, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { errorMessage } from '../../../api/client.js'
import { commitMembers, downloadMembersTemplate, previewMembers } from '../../../api/groups.js'
import { useFormErrors } from '../../../lib/useFormErrors.js'
import Alert from '../../ui/Alert.jsx'
import Button from '../../ui/Button.jsx'
import DataTable from '../../ui/DataTable.jsx'
import Modal from '../../ui/Modal.jsx'
import StatTile from '../../ui/StatTile.jsx'

const PROBLEM_COLUMNS = [
  { key: 'row', header: 'Qator' },
  {
    key: 'full_name',
    header: 'F.I.Sh.',
    render: (problem) => problem.full_name || <span className="text-ink-400">Matn yo'q</span>,
  },
  {
    key: 'pinfl',
    header: 'PINFL',
    render: (problem) => <span className="font-mono text-[13px]">{problem.pinfl}</span>,
  },
  {
    key: 'errors',
    header: 'Sabab',
    render: (problem) => <span className="text-[13px] text-error">{problem.errors.join(' ')}</span>,
  },
]

const SAMPLE_COLUMNS = [
  { key: 'full_name', header: 'F.I.Sh.' },
  {
    key: 'pinfl',
    header: 'PINFL',
    render: (row) => <span className="font-mono text-[13px]">{row.pinfl}</span>,
  },
  {
    key: 'organization',
    header: 'Tashkilot',
    render: (row) => row.organization || <span className="text-ink-400">Bo'sh</span>,
  },
]

const SAMPLE_ROWS = [
  { id: 1, full_name: 'Karimova Dilnoza Rustamovna', pinfl: '30101900000017', organization: 'Toshkent MOM' },
  { id: 2, full_name: 'Abdullayev Jasur Baxtiyorovich', pinfl: '30101900000024', organization: '' },
]

function SelectStep({ groupId, onPreview, onClose }) {
  const [file, setFile] = useState(null)
  const [checking, setChecking] = useState(false)
  const [templateError, setTemplateError] = useState(null)
  const { errors, clearErrors, clearField, captureError } = useFormErrors()
  const fileInput = useRef(null)

  const handleTemplate = async () => {
    setTemplateError(null)
    try {
      await downloadMembersTemplate()
    } catch (error) {
      setTemplateError(errorMessage(error))
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setChecking(true)
    clearErrors()
    try {
      onPreview(await previewMembers(groupId, file))
    } catch (error) {
      captureError(error)
      setChecking(false)
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col items-start gap-2">
        <input
          ref={fileInput}
          type="file"
          accept=".xlsx"
          aria-label="Tinglovchilar fayli"
          className="hidden"
          onChange={(event) => {
            setFile(event.target.files[0] ?? null)
            clearField('file')
          }}
        />
        <Button variant="dashed" icon={Upload} onClick={() => fileInput.current.click()}>
          {file ? file.name : 'Excel fayl tanlash'}
        </Button>
        {errors.fields.file && <Alert tone="error">{errors.fields.file}</Alert>}
      </div>

      <section className="flex flex-col gap-3 rounded-xl border border-border-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="m-0 text-[15px] font-semibold">Excel fayl namunasi</h3>
          <Button variant="secondary" size="xs" icon={FileDown} onClick={handleTemplate}>
            Shablonni yuklab olish
          </Button>
        </div>
        <DataTable compact columns={SAMPLE_COLUMNS} rows={SAMPLE_ROWS} minWidth={520} />
        <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-[13px] text-ink-600">
          <li className="leading-[19px]">Birinchi qator sarlavha, ro'yxat ikkinchi qatordan boshlanadi.</li>
          <li className="leading-[19px]">PINFL 14 ta raqamdan iborat.</li>
          <li className="leading-[19px]">Tashkilot bo'sh bo'lsa, guruh tashkiloti yoziladi.</li>
          <li className="leading-[19px]">Shablondagi namuna qatorlarni o'chirib, o'z ro'yxatingizni kiriting.</li>
        </ul>
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

function PreviewStep({ groupId, preview, onBack, onDone }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleCommit = async () => {
    setSaving(true)
    setError(null)
    try {
      onDone((await commitMembers(groupId, preview.token)).created)
    } catch (commitError) {
      setError(errorMessage(commitError))
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 text-ink-600">{preview.file_name}</p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Jami" value={preview.total} />
        <StatTile label="Yaroqli" value={preview.valid_count} />
        <StatTile label="Xatoli" value={preview.problems.length} />
        <StatTile label="Ogohlantirish" value={preview.warnings.length} />
      </div>

      {preview.problems.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="m-0 text-[17px] leading-6 font-semibold">Saqlanmaydigan qatorlar</h3>
          <div className="max-h-64 overflow-y-auto">
            <DataTable
              columns={PROBLEM_COLUMNS}
              rows={preview.problems}
              rowKey={(problem) => problem.row}
              minWidth={600}
            />
          </div>
        </section>
      )}

      {preview.warnings.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="m-0 text-[17px] leading-6 font-semibold">Ogohlantirishlar</h3>
          <p className="m-0 text-[13px] leading-[19px] text-ink-600">
            Bu tinglovchilar saqlanadi, lekin ularni tekshirib ko'ring.
          </p>
          <ul className="m-0 flex list-none flex-col gap-1 p-0 text-warning">
            {preview.warnings.map((row) => (
              <li key={row.row}>
                {row.full_name}: {row.warning}
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
        <Button icon={Check} loading={saving} disabled={preview.valid_count === 0} onClick={handleCommit}>
          {preview.valid_count} ta tinglovchini saqlash
        </Button>
      </div>
    </div>
  )
}

export default function MemberImportModal({ groupId, onClose, onImported }) {
  const [preview, setPreview] = useState(null)
  const [created, setCreated] = useState(null)

  let body
  if (created !== null) {
    body = (
      <div className="flex flex-col gap-4">
        <Alert tone="success">
          {created} ta tinglovchi guruhga qo'shildi. Endi ularga login-parol yarating.
        </Alert>
        <div className="flex justify-end">
          <Button icon={Check} onClick={onClose}>
            Yopish
          </Button>
        </div>
      </div>
    )
  } else if (preview) {
    body = (
      <PreviewStep
        groupId={groupId}
        preview={preview}
        onBack={() => setPreview(null)}
        onDone={(count) => {
          setCreated(count)
          onImported()
        }}
      />
    )
  } else {
    body = <SelectStep groupId={groupId} onPreview={setPreview} onClose={onClose} />
  }

  return (
    <Modal width="max-w-[760px]" open onClose={onClose} title="Tinglovchilarni import qilish">
      {body}
    </Modal>
  )
}
