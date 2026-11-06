import { Plus, X } from 'lucide-react'
import { useState } from 'react'
import { createAdmin } from '../../api/admins.js'
import { useFormErrors } from '../../lib/useFormErrors.js'
import Alert from '../ui/Alert.jsx'
import Button from '../ui/Button.jsx'
import Field from '../ui/Field.jsx'
import Modal from '../ui/Modal.jsx'
import PasswordField from './PasswordField.jsx'

const EMPTY = { full_name: '', organization: '', username: '', password: '' }

function AddAdminForm({ onClose, onCreated }) {
  const [values, setValues] = useState(EMPTY)
  const { errors, clearErrors, clearField, captureError } = useFormErrors()
  const [saving, setSaving] = useState(false)

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
      onCreated(await createAdmin(values))
    } catch (error) {
      captureError(error)
      setSaving(false)
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="F.I.Sh." autoComplete="off" {...bind('full_name')} />
      <Field label="Tashkilot" placeholder="Masalan: Toshkent MOM" {...bind('organization')} />
      <Field
        label="Login"
        placeholder="Masalan: tosh_mom"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        {...bind('username')}
      />
      <PasswordField
        label="Parol"
        value={values.password}
        onChange={(password) => {
          setValues({ ...values, password })
          clearField('password')
        }}
        error={errors.fields.password}
      />
      {errors.form && <Alert tone="error">{errors.form}</Alert>}
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="secondary" icon={X} onClick={onClose}>
          Bekor qilish
        </Button>
        <Button type="submit" icon={Plus} loading={saving}>
          Qo'shish
        </Button>
      </div>
    </form>
  )
}

export default function AddAdminModal({ open, onClose, onCreated }) {
  return (
    <Modal open={open} onClose={onClose} title="Admin qo'shish">
      <AddAdminForm onClose={onClose} onCreated={onCreated} />
    </Modal>
  )
}
