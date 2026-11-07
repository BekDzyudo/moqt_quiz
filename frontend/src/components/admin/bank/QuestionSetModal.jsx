import { Check, Trash, X } from 'lucide-react'
import { useState } from 'react'
import { createQuestionSet, deleteQuestionSet, updateQuestionSet } from '../../../api/bank.js'
import { useFormErrors } from '../../../lib/useFormErrors.js'
import Alert from '../../ui/Alert.jsx'
import Button from '../../ui/Button.jsx'
import ConfirmModal from '../../ui/ConfirmModal.jsx'
import Field from '../../ui/Field.jsx'
import Modal from '../../ui/Modal.jsx'

const FORM_ID = 'question-set-form'
const DEFAULTS = { name: '', question_count: 50, duration_minutes: 75, pass_score: 28 }

// Modal faqat ochilganda render qilinadi: `set` yo'q bo'lsa yangi to'plam yaratiladi.
export default function QuestionSetModal({ set, onClose, onSaved }) {
  const [values, setValues] = useState(set ?? DEFAULTS)
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const { errors, clearErrors, clearField, captureError } = useFormErrors()

  const bind = (name) => ({
    value: values[name],
    onChange: (event) => {
      setValues({ ...values, [name]: event.target.value })
      clearField(name)
    },
    error: errors.fields[name],
  })

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    clearErrors()

    const fields = {
      name: values.name,
      question_count: Number(values.question_count),
      duration_minutes: Number(values.duration_minutes),
      pass_score: Number(values.pass_score),
    }

    try {
      if (set) await updateQuestionSet(set.id, fields)
      else await createQuestionSet(fields)
      onSaved()
    } catch (error) {
      captureError(error)
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    await deleteQuestionSet(set.id)
    onSaved()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={set ? "To'plamni tahrirlash" : "Yangi to'plam"}
      footer={
        <>
          {set ? (
            <Button variant="dangerOutline" icon={Trash} onClick={() => setConfirming(true)}>
              O'chirish
            </Button>
          ) : (
            <span />
          )}
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" icon={X} onClick={onClose}>
              Bekor qilish
            </Button>
            <Button type="submit" form={FORM_ID} icon={Check} loading={saving}>
              Saqlash
            </Button>
          </div>
        </>
      }
    >
      <form id={FORM_ID} noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="To'plam nomi" placeholder="Masalan: AKT — maxsus fanlar" {...bind('name')} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Testdagi savollar" type="number" min="1" {...bind('question_count')} />
          <Field label="Vaqt (daqiqa)" type="number" min="1" {...bind('duration_minutes')} />
          <Field label="O'tish chegarasi" type="number" min="1" {...bind('pass_score')} />
        </div>
        {errors.form && <Alert tone="error">{errors.form}</Alert>}
      </form>

      {confirming && (
        <ConfirmModal
          title="To'plamni o'chirasizmi?"
          onConfirm={handleDelete}
          onClose={() => setConfirming(false)}
        >
          <p className="m-0">
            <strong>{set.name}</strong> o'chiriladi. Savollari bor to'plamni o'chirib bo'lmaydi.
          </p>
        </ConfirmModal>
      )}
    </Modal>
  )
}
