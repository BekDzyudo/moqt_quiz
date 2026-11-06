import { Check, RefreshCw, X } from 'lucide-react'
import { useState } from 'react'
import { syncQuestionSet } from '../../../api/bank.js'
import { useFormErrors } from '../../../lib/useFormErrors.js'
import Alert from '../../ui/Alert.jsx'
import Button from '../../ui/Button.jsx'
import Field from '../../ui/Field.jsx'
import Modal from '../../ui/Modal.jsx'

function SyncForm({ sets, defaultSet, onClose, onSynced }) {
  const [setId, setSetId] = useState(defaultSet ?? '')
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState(null)
  const { errors, clearErrors, setFieldError, captureError } = useFormErrors()

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!setId) {
      setFieldError('question_set', "Savol to'plamini tanlang.")
      return
    }

    setSyncing(true)
    clearErrors()
    try {
      setResult(await syncQuestionSet(setId))
      onSynced()
    } catch (error) {
      captureError(error)
    } finally {
      setSyncing(false)
    }
  }

  if (result) {
    return (
      <div className="flex flex-col gap-4">
        <Alert tone="success">
          {result.created} ta yangi savol qo'shildi, {result.updated} tasi yangilandi.
        </Alert>
        <div className="flex justify-end">
          <Button icon={Check} onClick={onClose}>
            Yopish
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field
        as="select"
        label="Savol to'plami"
        value={setId}
        onChange={(event) => {
          setSetId(event.target.value)
          clearErrors()
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
      <p className="m-0 text-[13px] leading-[19px] text-ink-600">
        API manbasidagi savollar shu to'plamga qo'shiladi, avval olinganlari yangilanadi.
      </p>
      {errors.form && <Alert tone="error">{errors.form}</Alert>}
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="secondary" icon={X} onClick={onClose}>
          Bekor qilish
        </Button>
        <Button type="submit" icon={RefreshCw} loading={syncing}>
          Yangilash
        </Button>
      </div>
    </form>
  )
}

export default function SyncModal({ open, sets, defaultSet, onClose, onSynced }) {
  return (
    <Modal open={open} onClose={onClose} title="API'dan yangilash">
      <SyncForm sets={sets} defaultSet={defaultSet} onClose={onClose} onSynced={onSynced} />
    </Modal>
  )
}
