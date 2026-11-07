import { RotateCcw, X } from 'lucide-react'
import { useState } from 'react'
import { grantRetake } from '../../../api/groups.js'
import { useFormErrors } from '../../../lib/useFormErrors.js'
import Alert from '../../ui/Alert.jsx'
import Button from '../../ui/Button.jsx'
import Field from '../../ui/Field.jsx'
import Modal from '../../ui/Modal.jsx'

export default function RetakeModal({ groupId, member, onClose, onGranted }) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const { errors, clearErrors, clearField, captureError } = useFormErrors()

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    clearErrors()
    try {
      await grantRetake(groupId, member.id, reason)
      onGranted()
    } catch (error) {
      captureError(error)
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="Qayta topshirishga ruxsat">
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="m-0 text-ink-600">
          <strong className="text-ink-900">{member.full_name}</strong> yangi variant bilan qayta
          topshiradi. Avvalgi urinish saqlanib qoladi, natijalarda oxirgisi hisoblanadi.
        </p>
        <Field
          as="textarea"
          rows={3}
          label="Sabab"
          placeholder="Masalan: elektr o'chdi"
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
          <Button type="submit" icon={RotateCcw} loading={saving}>
            Ruxsat berish
          </Button>
        </div>
      </form>
    </Modal>
  )
}
