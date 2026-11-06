import { Check, X } from 'lucide-react'
import { useState } from 'react'
import { changeOwnPassword } from '../../api/admins.js'
import { useFormErrors } from '../../lib/useFormErrors.js'
import Alert from '../ui/Alert.jsx'
import Button from '../ui/Button.jsx'
import Field from '../ui/Field.jsx'
import Modal from '../ui/Modal.jsx'

function ChangePasswordForm({ onClose }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const { errors, clearErrors, setFieldError, clearField, captureError } = useFormErrors()
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (next !== repeat) {
      setFieldError('repeat', 'Parollar bir xil emas. Qayta kiriting.')
      return
    }

    setSaving(true)
    clearErrors()
    try {
      await changeOwnPassword({ current_password: current, new_password: next })
      setDone(true)
    } catch (error) {
      captureError(error)
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    return (
      <div className="flex flex-col gap-4">
        <Alert tone="success">
          Parol o'zgartirildi. Boshqa qurilmalardagi seanslaringiz yopildi.
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
        label="Joriy parol"
        type="password"
        autoComplete="current-password"
        value={current}
        onChange={(event) => {
          setCurrent(event.target.value)
          clearField('current_password')
        }}
        error={errors.fields.current_password}
      />
      <Field
        label="Yangi parol"
        type="password"
        placeholder="Kamida 8 belgi"
        autoComplete="new-password"
        value={next}
        onChange={(event) => {
          setNext(event.target.value)
          clearField('new_password')
        }}
        error={errors.fields.new_password}
      />
      <Field
        label="Yangi parolni takrorlang"
        type="password"
        autoComplete="new-password"
        value={repeat}
        onChange={(event) => {
          setRepeat(event.target.value)
          clearField('repeat')
        }}
        error={errors.fields.repeat}
      />
      {errors.form && <Alert tone="error">{errors.form}</Alert>}
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="secondary" icon={X} onClick={onClose}>
          Bekor qilish
        </Button>
        <Button type="submit" icon={Check} loading={saving}>
          Saqlash
        </Button>
      </div>
    </form>
  )
}

export default function ChangePasswordModal({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Parolni o'zgartirish">
      <ChangePasswordForm onClose={onClose} />
    </Modal>
  )
}
