import { Lock, X } from 'lucide-react'
import { useState } from 'react'
import { errorMessage } from '../../../api/client.js'
import { closeGroupTest } from '../../../api/groups.js'
import Alert from '../../ui/Alert.jsx'
import Button from '../../ui/Button.jsx'
import Modal from '../../ui/Modal.jsx'

const MODES = [
  {
    value: 'let_finish',
    title: 'Ishlayotganlar tugatsin',
    description: "Yangi tinglovchi boshlay olmaydi. Boshlaganlar o'z vaqtigacha davom etadi.",
  },
  {
    value: 'finish_now',
    title: 'Hozir yakunlash',
    description: 'Barcha faol urinishlar darhol yakunlanadi va mavjud javoblar bilan baholanadi.',
  },
]

export default function CloseTestModal({ groupId, groupName, working, onClose, onClosed }) {
  const [mode, setMode] = useState('let_finish')
  const [closing, setClosing] = useState(false)
  const [error, setError] = useState(null)

  const handleClose = async () => {
    setClosing(true)
    setError(null)
    try {
      await closeGroupTest(groupId, mode)
      onClosed()
    } catch (closeError) {
      setError(errorMessage(closeError))
      setClosing(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Testni yopish"
      footer={
        <div className="ml-auto flex flex-wrap gap-3">
          <Button variant="secondary" icon={X} onClick={onClose}>
            Bekor qilish
          </Button>
          <Button variant="dark" icon={Lock} loading={closing} onClick={handleClose}>
            Testni yopish
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="m-0 text-ink-600">
          Guruh <strong className="text-ink-900">{groupName}</strong>. Hozir {working} ta tinglovchi
          ishlayapti.
        </p>
        <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
          <legend className="sr-only">Yopish usuli</legend>
          {MODES.map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer items-start gap-3 rounded-xl p-3 ${
                mode === option.value
                  ? 'border-2 border-brand-700 bg-brand-soft'
                  : 'border border-border-400'
              }`}
            >
              <input
                type="radio"
                name="close-mode"
                value={option.value}
                checked={mode === option.value}
                onChange={() => setMode(option.value)}
                className="mt-0.5 size-5 shrink-0 accent-brand-700"
              />
              <span className="flex flex-col gap-0.5">
                <span className="font-semibold">{option.title}</span>
                <span className="text-[13px] leading-[19px] text-ink-600">{option.description}</span>
              </span>
            </label>
          ))}
        </fieldset>
        {error && <Alert tone="error">{error}</Alert>}
      </div>
    </Modal>
  )
}
