import { Check, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { updateAdmin } from '../../api/admins.js'
import { useFormErrors } from '../../lib/useFormErrors.js'
import Alert from '../ui/Alert.jsx'
import Button from '../ui/Button.jsx'
import Checkbox from '../ui/Checkbox.jsx'
import Field from '../ui/Field.jsx'
import PasswordField from './PasswordField.jsx'

// Admin almashganda `key` orqali qayta yaratiladi, shuning uchun ichki holatni tozalash shart emas.
export default function EditAdminForm({ admin, onSaved, onDelete }) {
  const [username, setUsername] = useState(admin.username)
  const [password, setPassword] = useState('')
  const [isActive, setIsActive] = useState(admin.is_active)
  const { errors, clearErrors, clearField, captureError } = useFormErrors()
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const ref = useRef(null)

  // Tor ekranda forma jadval ostida qoladi.
  useEffect(() => {
    ref.current.scrollIntoView({ block: 'nearest' })
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setSaved(false)
    clearErrors()
    try {
      await updateAdmin(admin.id, {
        username,
        is_active: isActive,
        ...(password ? { password } : {}),
      })
      setPassword('')
      setSaved(true)
      onSaved()
    } catch (error) {
      captureError(error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      ref={ref}
      noValidate
      onSubmit={handleSubmit}
      className="flex min-w-0 flex-[2_1_340px] flex-col gap-4 rounded-2xl border border-border-200 bg-surface-card p-6 shadow-card"
    >
      <div>
        <div className="text-[13px] font-semibold text-ink-600">Tahrirlanmoqda</div>
        <h2 className="m-0 text-xl leading-7 font-bold">{admin.full_name}</h2>
      </div>

      <Field
        label="Login"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        value={username}
        onChange={(event) => {
          setUsername(event.target.value)
          clearField('username')
        }}
        error={errors.fields.username}
      />
      <PasswordField
        label="Yangi parol"
        value={password}
        onChange={(value) => {
          setPassword(value)
          clearField('password')
        }}
        error={errors.fields.password}
      />
      <Checkbox
        label="Faol — tizimga kira oladi"
        checked={isActive}
        onChange={(event) => setIsActive(event.target.checked)}
      />

      {errors.form && <Alert tone="error">{errors.form}</Alert>}
      {saved && <Alert tone="success">O'zgarishlar saqlandi.</Alert>}

      <div className="flex flex-wrap justify-between gap-3 border-t border-border-200 pt-4">
        <Button variant="dangerOutline" size="sm" icon={Trash2} onClick={onDelete}>
          O'chirish
        </Button>
        <Button type="submit" size="sm" icon={Check} loading={saving}>
          Saqlash
        </Button>
      </div>
    </form>
  )
}
