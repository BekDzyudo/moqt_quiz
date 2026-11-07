import { Key, LockOpen, X } from 'lucide-react'
import { useState } from 'react'
import { unlockExit } from '../../api/attempt.js'
import { errorMessage } from '../../api/client.js'
import Alert from '../ui/Alert.jsx'
import Button from '../ui/Button.jsx'
import Field from '../ui/Field.jsx'
import Modal from '../ui/Modal.jsx'

export default function ExitKeyModal({ attemptId, onClose, onUnlocked }) {
  const [password, setPassword] = useState('')
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setChecking(true)
    setError(null)
    try {
      await unlockExit(attemptId, password)
      onUnlocked()
    } catch (unlockError) {
      setError(errorMessage(unlockError))
      setPassword('')
      setChecking(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="To'liq ekrandan chiqish" icon={Key} iconTone="muted" width="max-w-[440px]" hideClose>
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
        <p className="m-0 text-ink-600">
          Ctrl + Alt + N bosildi. Faqat mas'ul shaxs chiqara oladi. Test to'xtamaydi, vaqt o'tib
          turadi.
        </p>
        <Field
          label="Chiqish paroli"
          type="password"
          autoComplete="off"
          autoFocus
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {error && <Alert tone="error">{error}</Alert>}
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" icon={X} onClick={onClose}>
            Bekor qilish
          </Button>
          <Button type="submit" variant="dark" icon={LockOpen} loading={checking} disabled={!password}>
            Chiqarish
          </Button>
        </div>
      </form>
    </Modal>
  )
}
