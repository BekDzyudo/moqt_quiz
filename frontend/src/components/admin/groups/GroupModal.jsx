import { Check, X } from 'lucide-react'
import { useState } from 'react'
import { createGroup, updateGroup } from '../../../api/groups.js'
import { useFormErrors } from '../../../lib/useFormErrors.js'
import Alert from '../../ui/Alert.jsx'
import Button from '../../ui/Button.jsx'
import Field from '../../ui/Field.jsx'
import Modal from '../../ui/Modal.jsx'

const FORM_ID = 'group-form'
const EMPTY = { name: '', organization: '', question_set: '', login_prefix: '' }

// Modal faqat ochilganda render qilinadi: `group` yo'q bo'lsa yangi guruh yaratiladi.
export default function GroupModal({ group, sets, onClose, onSaved }) {
  const [values, setValues] = useState(group ?? EMPTY)
  const [saving, setSaving] = useState(false)
  const { errors, clearErrors, clearField, captureError } = useFormErrors()

  const setLocked = group && group.test_status !== 'closed'
  const prefixLocked = group && group.credentials_count > 0

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
      organization: values.organization,
      question_set: Number(values.question_set),
      login_prefix: values.login_prefix,
    }

    try {
      onSaved(group ? await updateGroup(group.id, fields) : await createGroup(fields))
    } catch (error) {
      captureError(error)
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={group ? 'Guruhni tahrirlash' : 'Yangi guruh'}
      footer={
        <div className="ml-auto flex flex-wrap gap-3">
          <Button variant="secondary" icon={X} onClick={onClose}>
            Bekor qilish
          </Button>
          <Button type="submit" form={FORM_ID} icon={Check} loading={saving}>
            Saqlash
          </Button>
        </div>
      }
    >
      <form id={FORM_ID} noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Guruh nomi" placeholder="Masalan: 2026-11-AKT-01" {...bind('name')} />
        <Field label="Tashkilot" placeholder="Masalan: Toshkent MOM" {...bind('organization')} />
        <Field
          as="select"
          label="Savol to'plami"
          disabled={setLocked}
          hint={setLocked ? "Test ochilgandan keyin to'plamni almashtirib bo'lmaydi." : undefined}
          {...bind('question_set')}
        >
          <option value="">To'plamni tanlang</option>
          {sets.map((set) => (
            <option key={set.id} value={set.id}>
              {set.name}
            </option>
          ))}
        </Field>
        <Field
          label="Login prefiksi"
          placeholder="Masalan: AKT01"
          autoCapitalize="characters"
          spellCheck={false}
          mono
          disabled={prefixLocked}
          hint={
            prefixLocked
              ? "Login-parollar yaratilgan, prefiksni o'zgartirib bo'lmaydi."
              : 'Tinglovchi logini shu prefiks bilan boshlanadi: AKT01-017.'
          }
          {...bind('login_prefix')}
        />
        {errors.form && <Alert tone="error">{errors.form}</Alert>}
      </form>
    </Modal>
  )
}
