import { RotateCw } from 'lucide-react'
import { useState } from 'react'
import { generatePassword } from '../../lib/password.js'
import Button from '../ui/Button.jsx'
import Field from '../ui/Field.jsx'

// Generatsiya qilingan parol ochiq ko'rsatiladi: superadmin uni adminga yetkazishi kerak,
// saqlangandan keyin esa uni qayta ko'rib bo'lmaydi.
export default function PasswordField({ label, value, onChange, error }) {
  const [generated, setGenerated] = useState(false)

  const reveal = generated && value !== ''

  const handleChange = (event) => {
    setGenerated(false)
    onChange(event.target.value)
  }

  const handleGenerate = () => {
    setGenerated(true)
    onChange(generatePassword())
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <Field
        className="w-full"
        label={label}
        type={reveal ? 'text' : 'password'}
        mono={reveal}
        placeholder="Kamida 8 belgi"
        autoComplete="new-password"
        value={value}
        onChange={handleChange}
        error={error}
        hint={reveal ? "Saqlashdan oldin parolni yozib oling: keyin ko'rinmaydi." : undefined}
      />
      <Button variant="secondary" size="xs" icon={RotateCw} onClick={handleGenerate}>
        Parol generatsiya qilish
      </Button>
    </div>
  )
}
