import { Check, Eye, EyeOff, Key, RotateCw, X } from 'lucide-react'
import { useState } from 'react'
import { setExitPassword } from '../../../api/groups.js'
import { useFormErrors } from '../../../lib/useFormErrors.js'
import Alert from '../../ui/Alert.jsx'
import Button from '../../ui/Button.jsx'
import Card from '../../ui/Card.jsx'
import Field from '../../ui/Field.jsx'
import Modal from '../../ui/Modal.jsx'

function ExitPasswordModal({ groupId, onClose, onSaved }) {
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(null)
  const { errors, clearErrors, clearField, captureError } = useFormErrors()

  const save = async (value, mode) => {
    setSaving(mode)
    clearErrors()
    try {
      onSaved((await setExitPassword(groupId, value)).password)
    } catch (error) {
      captureError(error)
      setSaving(null)
    }
  }

  return (
    <Modal open onClose={onClose} title="Chiqish paroli">
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          if (password) save(password, 'manual')
        }}
        className="flex flex-col gap-4"
      >
        <p className="m-0 text-ink-600">
          Parol test paytida tinglovchini to'liq ekrandan chiqarish uchun kerak. U faqat mas'ul
          shaxsda turadi.
        </p>
        <Field
          label="Yangi parol"
          mono
          autoComplete="off"
          placeholder="Kamida 6 belgi"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value)
            clearField('password')
          }}
          error={errors.fields.password}
        />
        {errors.form && <Alert tone="error">{errors.form}</Alert>}
        <div className="flex flex-wrap justify-between gap-3">
          <Button
            variant="secondary"
            icon={RotateCw}
            loading={saving === 'generate'}
            onClick={() => save(undefined, 'generate')}
          >
            Generatsiya qilish
          </Button>
          <div className="flex flex-wrap gap-3">
            <Button variant="ghost" icon={X} onClick={onClose}>
              Bekor qilish
            </Button>
            <Button type="submit" icon={Check} disabled={!password} loading={saving === 'manual'}>
              Saqlash
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

export default function ExitPasswordCard({ group, onChanged }) {
  // Ochiq parol faqat o'zgartirilgandan keyin shu sahifada turadi: yangilansa yo'qoladi.
  const [plain, setPlain] = useState(null)
  const [visible, setVisible] = useState(false)
  const [editing, setEditing] = useState(false)

  const handleSaved = (password) => {
    setPlain(password)
    setVisible(true)
    setEditing(false)
    onChanged()
  }

  // Parol saqlangach guruh ma'lumoti qayta kelguncha ham karta to'g'ri ko'rinadi.
  const isSet = group.exit_password_set || plain !== null

  let value = '••••••'
  if (!isSet) value = "O'rnatilmagan"
  else if (plain && visible) value = plain

  return (
    <Card padding="p-5" className="flex flex-col gap-2">
      <div className="text-[13px] font-semibold text-ink-600">Chiqish paroli (Ctrl + Alt + N)</div>
      <div
        className={
          isSet
            ? 'font-mono text-[17px] font-bold tracking-[0.2em]'
            : 'text-[17px] font-bold text-warning'
        }
      >
        {value}
      </div>
      <div className="flex flex-wrap gap-2">
        {plain && (
          <Button
            variant="secondary"
            size="xs"
            icon={visible ? EyeOff : Eye}
            onClick={() => setVisible(!visible)}
          >
            {visible ? 'Yashirish' : "Ko'rsatish"}
          </Button>
        )}
        <Button variant="secondary" size="xs" icon={Key} onClick={() => setEditing(true)}>
          {isSet ? "O'zgartirish" : "O'rnatish"}
        </Button>
      </div>

      {editing && (
        <ExitPasswordModal
          groupId={group.id}
          onClose={() => setEditing(false)}
          onSaved={handleSaved}
        />
      )}
    </Card>
  )
}
