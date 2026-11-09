import { LogIn } from 'lucide-react'
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { errorMessage } from '../../api/client.js'
import building from '../../assets/ktri-building.webp'
import logo from '../../assets/ktri-logo.webp'
import Alert from '../../components/ui/Alert.jsx'
import Button from '../../components/ui/Button.jsx'
import Field from '../../components/ui/Field.jsx'
import ThemeToggle from '../../components/ui/ThemeToggle.jsx'
import { homeFor } from '../../lib/roles.js'
import { useAuth } from '../../store/auth.js'

function BrandPanel() {
  return (
    <section className="relative isolate flex flex-col justify-between gap-12 overflow-hidden p-6 text-white min-[1080px]:p-14">
      <img src={building} alt="" className="absolute inset-0 -z-20 size-full object-cover" />
      <div aria-hidden="true" className="login-overlay absolute inset-0 -z-10" />
      <div
        aria-hidden="true"
        className="absolute -top-[140px] hidden min-[1080px]:block -right-[100px] -z-10 size-[400px] rounded-full bg-white/8"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-[140px] hidden min-[1080px]:block -left-[70px] -z-10 size-[280px] rounded-full bg-brand-500/25"
      />
      <div
        aria-hidden="true"
        className="absolute right-[90px] hidden min-[1080px]:block bottom-[110px] -z-10 size-[180px] rounded-full border border-white/30"
      />

      <div className="flex items-center gap-4 pr-14 min-[1080px]:pr-0">
        <div className="size-[58px] shrink-0 rounded-full bg-white p-1">
          <img src={logo} alt="" width="50" height="50" className="size-full" />
        </div>
        <div className="max-w-[230px] text-[15px] leading-5 font-semibold">
          Kasbiy ta'limni rivojlantirish instituti
        </div>
      </div>

      <div className="max-w-[560px]">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/10 px-3.5 py-1.5 text-xs leading-4 font-bold tracking-[0.12em] uppercase">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-[#b4e0f9]" />
          test.moqt.uz
        </div>
        <h2 className="mt-5 mb-4 text-[32px] leading-10 font-extrabold tracking-[-0.02em] min-[1280px]:text-[42px] min-[1280px]:leading-[50px]">
          Chiqish testi platformasi
        </h2>
        <p className="m-0 max-w-[460px] text-base leading-[26px]">
          Malaka oshirish kursi yakunidagi chiqish testi. Har bir tinglovchiga alohida variant
          beriladi, vaqt server bo'yicha hisoblanadi.
        </p>
      </div>

      <div className="border-t border-white/30 pt-5 text-xs leading-4 font-medium">
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
    <main className="grid min-h-screen min-[1080px]:grid-cols-[55fr_45fr]">
      <BrandPanel />
      <section className="relative flex items-center justify-center px-4 py-16 min-[1080px]:px-6">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
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

          {notice && !formError && <Alert tone="info">{notice}</Alert>}

          <div className="flex flex-col gap-4">
            <Field
              label="Login"
              name="username"
              placeholder="Masalan: AKT01-017"
              elevated
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
              elevated
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              error={fieldErrors.password}
            />
          </div>

          {formError && <Alert tone="error">{formError}</Alert>}

          <Button type="submit" icon={LogIn} loading={submitting} className="w-full tracking-[0.01em]">
            Kirish
          </Button>

          <p className="m-0 text-[13px] leading-[19px] text-ink-600">
            Rolingiz avtomatik aniqlanadi: admin boshqaruv paneliga, tinglovchi test sahifasiga
            o'tadi.
          </p>
        </form>
      </section>
    </main>
  )
}
