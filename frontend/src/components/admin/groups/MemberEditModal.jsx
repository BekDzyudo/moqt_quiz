import { Check, PenLine, X } from 'lucide-react'
import { useState } from 'react'
import { updateMember } from '../../../api/groups.js'
import { useFormErrors } from '../../../lib/useFormErrors.js'
import Alert from '../../ui/Alert.jsx'
import Button from '../../ui/Button.jsx'
import Field from '../../ui/Field.jsx'
import Modal from '../../ui/Modal.jsx'

export default function MemberEditModal({ groupId, member, onClose, onSaved }) {
  const [values, setValues] = useState({
    full_name: member.full_name ?? '',
    pinfl: member.pinfl ?? '',
    organization: member.organization ?? '',
  })
  const [saving, setSaving] = useState(false)
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
    try {
      await updateMember(groupId, member.id, values)
      onSaved()
    } catch (error) {
      captureError(error)
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="Tinglovchi ma'lumotlari" icon={PenLine}>
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="F.I.Sh." autoComplete="off" {...bind('full_name')} />
        <Field label="PINFL" inputMode="numeric" maxLength={14} mono {...bind('pinfl')} />
        <Field label="Tashkilot" autoComplete="off" {...bind('organization')} />
        {(errors.form || errors.fields.form) && <Alert tone="error">{errors.form ?? errors.fields.form}</Alert>}
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" icon={X} onClick={onClose}>
            Bekor qilish
          </Button>
          <Button type="submit" icon={Check} loading={saving}>
            Saqlash
          </Button>
        </div>
      </form>
    </Modal>
  )
}
