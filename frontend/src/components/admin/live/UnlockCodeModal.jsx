import { Check, KeyRound } from 'lucide-react'
import Button from '../../ui/Button.jsx'
import Modal from '../../ui/Modal.jsx'
import { formatTime } from '../../../lib/time.js'

export default function UnlockCodeModal({ result, onClose }) {
  return (
    <Modal open onClose={onClose} title="Ochish kodi" icon={KeyRound} width="max-w-[440px]">
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="m-0 font-semibold">{result.full_name}</p>
        <div
          className="rounded-2xl bg-surface-muted px-6 py-4 text-[40px] leading-[48px] font-extrabold tracking-[0.3em] tabular-nums select-all"
          aria-label={`Kod ${result.code.split('').join(' ')}`}
        >
          {result.code}
        </div>
        <p className="m-0 text-[13px] leading-[19px] text-ink-600">
          Kodni faqat shu tinglovchiga ayting. U bir martalik va {formatTime(result.expires_at)} gacha
          amal qiladi. Yangi kod yaratilsa, eskisi bekor bo'ladi.
        </p>
        <Button icon={Check} onClick={onClose}>
          Yopish
        </Button>
      </div>
    </Modal>
  )
}
