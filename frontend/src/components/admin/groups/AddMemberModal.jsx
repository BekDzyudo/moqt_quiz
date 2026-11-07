import { Check, Upload, UserPlus, X } from 'lucide-react'
import { useState } from 'react'
import { addMember } from '../../../api/groups.js'
import { useFormErrors } from '../../../lib/useFormErrors.js'
import Alert from '../../ui/Alert.jsx'
import Button from '../../ui/Button.jsx'
import Field from '../../ui/Field.jsx'
import Modal from '../../ui/Modal.jsx'

const EMPTY = { full_name: '', pinfl: '', organization: '' }

export default function AddMemberModal({ group, onClose, onAdded, onImport }) {
  const [values, setValues] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [warning, setWarning] = useState(null)
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
      const member = await addMember(group.id, values)
      onAdded()
      if (member.warning) setWarning(member.warning)
      else onClose()
    } catch (error) {
      captureError(error)
    } finally {
      setSaving(false)
    }
  }

  if (warning) {
    return (
      <Modal open onClose={onClose} title="Tinglovchi qo'shildi">
        <div className="flex flex-col gap-4">
          <Alert tone="info">{warning} Xato bo'lsa, ro'yxatni tekshiring.</Alert>
          <div className="flex justify-end">
            <Button icon={Check} onClick={onClose}>
              Yopish
            </Button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open onClose={onClose} title="Tinglovchi qo'shish">
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="F.I.Sh." autoComplete="off" {...bind('full_name')} />
        <Field
          label="PINFL"
          mono
          inputMode="numeric"
          maxLength={14}
          autoComplete="off"
          placeholder="14 ta raqam"
          {...bind('pinfl')}
        />
        <Field label="Tashkilot" placeholder={group.organization} {...bind('organization')} />
        {errors.form && <Alert tone="error">{errors.form}</Alert>}
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" icon={X} onClick={onClose}>
            Bekor qilish
          </Button>
          <Button type="submit" icon={UserPlus} loading={saving}>
            Qo'shish
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-muted p-3">
          <span className="text-[13px] leading-[19px] text-ink-600">
            Tinglovchilar ko'p bo'lsa, ro'yxatni Excel bilan yuklang.
          </span>
          <Button variant="secondary" size="xs" icon={Upload} onClick={onImport}>
            Excel import
          </Button>
        </div>
      </form>
    </Modal>
  )
}
