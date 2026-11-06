import { LogIn } from 'lucide-react'
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { errorMessage } from '../../api/client.js'
import Alert from '../../components/ui/Alert.jsx'
import Button from '../../components/ui/Button.jsx'
import Field from '../../components/ui/Field.jsx'
import { homeFor } from '../../lib/roles.js'
import { useAuth } from '../../store/auth.js'

function BrandPanel() {
  return (
    <section className="relative flex flex-col justify-between gap-10 overflow-hidden bg-[linear-gradient(142deg,#0f4a7c,#12629f_48%,#0d7cbb)] p-6 text-white min-[1080px]:p-14">
      <div
        aria-hidden="true"
        className="absolute -top-[120px] -right-[120px] size-[420px] rounded-full bg-white/7"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-40 -left-20 size-[360px] rounded-full border-2 border-white/14"
      />
      <div className="relative flex items-center gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-[15px] font-extrabold text-brand-900">
          KT
        </div>
        <div className="text-[15px] leading-5 font-semibold">
          Kasbiy ta'limni rivojlantirish instituti
        </div>
      </div>
      <div className="relative max-w-[560px]">
        <div className="text-xs leading-4 font-bold tracking-[0.12em] uppercase opacity-90">
          MOQT Test
        </div>
        <h2 className="mt-3 mb-4 text-[32px] leading-10 font-extrabold tracking-[-0.02em] min-[1280px]:text-[40px] min-[1280px]:leading-12">
          Chiqish testi platformasi
        </h2>
        <p className="m-0 opacity-92">
          Malaka oshirish kursi yakunidagi chiqish testi. Har bir tinglovchiga alohida variant
          beriladi, vaqt server bo'yicha hisoblanadi.
        </p>
      </div>
      <div className="relative text-xs leading-4 font-medium opacity-85">
        © 2026 Kasbiy ta'limni rivojlantirish instituti
      </div>
    </section>
  )
}

export default function LoginPage() {
  const user = useAuth((state) => state.user)
  const notice = useAuth((state) => state.notice)
  const login = useAuth((state) => state.login)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to={homeFor(user.role)} replace />

  const handleSubmit = async (event) => {
    event.preventDefault()

    const errors = {
      username: username.trim() ? undefined : 'Loginni kiriting.',
      password: password ? undefined : 'Parolni kiriting.',
    }
    setFieldErrors(errors)
    setFormError(null)
    if (errors.username || errors.password) return

    setSubmitting(true)
    try {
      await login(username.trim(), password)
    } catch (error) {
      setFormError(errorMessage(error))
      setPassword('')
      setSubmitting(false)
    }
  }

  return (
    <div className="grid min-h-screen min-[1080px]:grid-cols-[55fr_45fr]">
      <BrandPanel />
      <section className="flex items-center justify-center px-4 py-8 min-[1080px]:px-6 min-[1080px]:py-[72px]">
        <form
          noValidate
          onSubmit={handleSubmit}
          className="flex w-full max-w-[404px] flex-col gap-5 rounded-2xl border border-border-200 bg-surface-card p-6 shadow-card sm:p-8"
        >
          <div className="flex flex-col gap-2">
            <h1 className="m-0 text-[26px] leading-[34px] font-bold tracking-[-0.01em]">
              Tizimga kirish
            </h1>
            <p className="m-0 text-ink-600">
              Login va parolni kiriting. Tinglovchilar ularni MOM test mas'ulidan oladi.
            </p>
          </div>

          {notice && !formError && (
            <Alert tone="info">{notice}</Alert>
          )}

          <div className="flex flex-col gap-4">
            <Field
              label="Login"
              name="username"
              placeholder="Masalan: AKT01-017"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              error={fieldErrors.username}
            />
            <Field
              label="Parol"
              name="password"
              type="password"
              placeholder="Parolni kiriting"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              error={fieldErrors.password}
            />
          </div>

          {formError && (
            <Alert tone="error">{formError}</Alert>
          )}

          <Button type="submit" icon={LogIn} loading={submitting} className="w-full">
            Kirish
          </Button>

          <p className="m-0 text-[13px] leading-[19px] text-ink-600">
            Rolingiz avtomatik aniqlanadi: admin boshqaruv paneliga, tinglovchi test sahifasiga
            o'tadi.
          </p>
        </form>
      </section>
    </div>
  )
}
