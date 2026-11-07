import { Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { errorMessage } from '../../api/client.js'
import Alert from './Alert.jsx'
import Button from './Button.jsx'
import Modal from './Modal.jsx'

// Qaytarib bo'lmaydigan amal uchun tasdiq. Modal faqat kerak bo'lganda render qilinadi.
export default function ConfirmModal({
  title,
  confirmLabel = "O'chirish",
  icon = Trash2,
  variant = 'danger',
  onConfirm,
  onClose,
  children,
}) {
  const [error, setError] = useState(null)
  const [working, setWorking] = useState(false)

  const handleConfirm = async () => {
    setWorking(true)
    setError(null)
    try {
      await onConfirm()
    } catch (confirmError) {
      setError(errorMessage(confirmError))
      setWorking(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      footer={
        <div className="ml-auto flex flex-wrap gap-3">
          <Button variant="secondary" icon={X} onClick={onClose}>
            Bekor qilish
          </Button>
          <Button variant={variant} icon={icon} loading={working} onClick={handleConfirm}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        {children}
        {error && <Alert tone="error">{error}</Alert>}
      </div>
    </Modal>
  )
}
