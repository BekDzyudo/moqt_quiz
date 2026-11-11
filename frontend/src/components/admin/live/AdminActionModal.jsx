import { Flag, Lock, X } from 'lucide-react'
import { useState } from 'react'
import { lockAttempt, finishAttemptByAdmin } from '../../../api/live.js'
import { useFormErrors } from '../../../lib/useFormErrors.js'
import Alert from '../../ui/Alert.jsx'
import Button from '../../ui/Button.jsx'
import Field from '../../ui/Field.jsx'
import Modal from '../../ui/Modal.jsx'

const ACTIONS = {
  lock: {
    title: 'Testni qulflash',
    icon: Lock,
    confirm: 'Qulflash',
    variant: 'danger',
    label: 'Sabab',
    placeholder: 'Masalan: telefon bilan ushlandi',
    required: true,
    text: "Savollar darhol yopiladi, test yakunlanmaydi va vaqt to'xtamaydi. Keyin ochish kodi berib davom ettirishingiz yoki testni yakunlashingiz mumkin.",
    run: lockAttempt,
  },
  finish: {
    title: 'Testni yakunlash',
    icon: Flag,
    confirm: 'Yakunlash',
    variant: 'danger',
    label: 'Izoh (ixtiyoriy)',
    placeholder: 'Masalan: telefondan foydalangan',
    required: false,
    text: "Test shu paytgacha berilgan javoblar bo'yicha baholanadi va yopiladi. Bu amalni qaytarib bo'lmaydi: qayta topshirish faqat alohida ruxsat bilan.",
    run: finishAttemptByAdmin,
  },
}

export default function AdminActionModal({ action, row, onClose, onDone }) {
  const config = ACTIONS[action]
  const [reason, setReason] = useState(action === 'finish' ? row.lock_note ?? '' : '')
  const [saving, setSaving] = useState(false)
  const { errors, clearErrors, clearField, captureError } = useFormErrors()

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    clearErrors()
    try {
      await config.run(row.attempt_id, reason.trim())
      onDone()
    } catch (error) {
      captureError(error)
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={config.title} icon={config.icon}>
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="m-0 text-ink-600">
          <strong className="text-ink-900">{row.user.full_name}</strong> · {row.answered} / {row.n_total} javob.{' '}
          {config.text}
        </p>
        <Field
          as="textarea"
          rows={3}
          label={config.label}
          placeholder={config.placeholder}
          maxLength={300}
          value={reason}
          onChange={(event) => {
            setReason(event.target.value)
            clearField('reason')
          }}
          error={errors.fields.reason}
        />
        {errors.form && <Alert tone="error">{errors.form}</Alert>}
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" icon={X} onClick={onClose}>
            Bekor qilish
          </Button>
          <Button
            type="submit"
            variant={config.variant}
            icon={config.icon}
            loading={saving}
            disabled={config.required && !reason.trim()}
          >
            {config.confirm}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
