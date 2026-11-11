import { Check, Copy, Eye, EyeOff, KeyRound, TriangleAlert, X } from 'lucide-react'
import { useState } from 'react'
import { updateMember } from '../../../api/groups.js'
import { useFormErrors } from '../../../lib/useFormErrors.js'
import Alert from '../../ui/Alert.jsx'
import Button from '../../ui/Button.jsx'
import Field from '../../ui/Field.jsx'
import Modal from '../../ui/Modal.jsx'

const MODES = [
  { key: 'keep', label: "Parol o'zgarmasin" },
  { key: 'auto', label: 'Yangi parol yaratish (6 belgi)' },
  { key: 'manual', label: "Parolni o'zim kiritaman" },
]

function CopyValue({ label, value }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // HTTP sahifada clipboard bo'lmasligi mumkin — qiymat ekranda ko'rinib turibdi.
    }
  }
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-muted px-4 py-3">
      <div className="flex min-w-0 flex-col">
        <span className="text-[12px] font-semibold text-ink-600">{label}</span>
        <span className="truncate font-mono text-xl font-bold select-all">{value}</span>
      </div>
      <Button variant="secondary" size="xs" icon={copied ? Check : Copy} aria-label={`${label}ni nusxalash`} onClick={copy} />
    </div>
  )
}

// Login va parolni boshqarish. Saqlangach tinglovchining eski seansi bekor bo'ladi.
export default function MemberAccessModal({ groupId, groupPrefix, member, onClose, onSaved }) {
  const suggested = `${groupPrefix}-${String(member.seq ?? '').padStart(3, '0')}`
  const [login, setLogin] = useState(member.login ?? suggested)
  const [mode, setMode] = useState(member.has_credentials ? 'keep' : 'auto')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState(null)
  const { errors, clearErrors, clearField, captureError } = useFormErrors()

  const inTest = member.live?.status === 'in_progress'

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    clearErrors()
    const fields = {}
    if (login.trim() !== (member.login ?? '')) fields.username = login.trim()
    if (mode === 'auto') fields.generate_password = true
    if (mode === 'manual') fields.password = password
    try {
      const saved = await updateMember(groupId, member.id, fields)
      setResult({ login: saved.login ?? saved.username, password: saved.password ?? null })
      onSaved()
    } catch (error) {
      captureError(error)
    } finally {
      setSaving(false)
    }
  }

  if (result) {
    return (
      <Modal open onClose={onClose} title="Login va parol saqlandi" icon={KeyRound} width="max-w-[480px]">
        <div className="flex flex-col gap-4">
          <p className="m-0 font-semibold">{member.full_name}</p>
          <CopyValue label="Login" value={result.login} />
          {result.password && <CopyValue label="Parol" value={result.password} />}
          <p className="m-0 text-[13px] leading-[19px] text-ink-600">
            {result.password
              ? "Parolni hozir yozib oling yoki tinglovchiga ayting: u boshqa hech qayerda ko'rinmaydi. "
              : ''}
            Tinglovchining eski seansi bekor qilindi — yangi ma'lumot bilan qayta kiradi.
          </p>
          <div className="flex justify-end">
            <Button icon={Check} onClick={onClose}>
              Yopish
            </Button>
          </div>
        </div>
      </Modal>
    )
  }

  const nothingChanged = mode === 'keep' && login.trim() === (member.login ?? '')

  return (
    <Modal open onClose={onClose} title="Login va parol" icon={KeyRound} width="max-w-[520px]">
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="m-0 font-semibold">{member.full_name}</p>
        <Field
          label="Login"
          mono
          autoComplete="off"
          value={login}
          hint={`Lotin harflari, raqamlar, nuqta yoki chiziqcha. Standart: ${suggested}`}
          error={errors.fields.username}
          onChange={(event) => {
            setLogin(event.target.value)
            clearField('username')
          }}
        />
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-2 text-[13px] font-semibold text-ink-600">Parol</legend>
          {MODES.filter((item) => item.key !== 'keep' || member.has_credentials).map((item) => (
            <label key={item.key} className="flex cursor-pointer items-center gap-3 py-1 text-[15px]">
              <input
                type="radio"
                name="password-mode"
                className="size-5 accent-brand-700"
                checked={mode === item.key}
                onChange={() => {
                  setMode(item.key)
                  clearField('password')
                }}
              />
              {item.label}
            </label>
          ))}
        </fieldset>
        {mode === 'manual' && (
          <div className="flex items-end gap-2">
            <Field
              className="flex-1"
              label="Yangi parol"
              type={showPassword ? 'text' : 'password'}
              mono={showPassword}
              autoComplete="new-password"
              value={password}
              hint="6–64 belgi, bo'sh joysiz."
              error={errors.fields.password}
              onChange={(event) => {
                setPassword(event.target.value)
                clearField('password')
              }}
            />
            <Button
              variant="secondary"
              icon={showPassword ? EyeOff : Eye}
              aria-label={showPassword ? 'Parolni yashirish' : "Parolni ko'rsatish"}
              className="mb-7"
              onClick={() => setShowPassword(!showPassword)}
            />
          </div>
        )}
        {inTest && (
          <Alert tone="info">
            Tinglovchi hozir test ishlayapti. Saqlansa u tizimdan chiqariladi; yangi ma'lumot bilan kirgach testi
            qolgan joyidan davom etadi, vaqt esa to'xtamaydi.
          </Alert>
        )}
        {errors.form && <Alert tone="error">{errors.form}</Alert>}
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" icon={X} onClick={onClose}>
            Bekor qilish
          </Button>
          <Button type="submit" icon={nothingChanged ? TriangleAlert : Check} loading={saving} disabled={nothingChanged}>
            Saqlash
          </Button>
        </div>
      </form>
    </Modal>
  )
}
