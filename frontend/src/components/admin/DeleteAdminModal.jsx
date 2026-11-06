import { deleteAdmin } from '../../api/admins.js'
import ConfirmModal from '../ui/ConfirmModal.jsx'

export default function DeleteAdminModal({ admin, onClose, onDeleted }) {
  const handleConfirm = async () => {
    await deleteAdmin(admin.id)
    onDeleted()
  }

  return (
    <ConfirmModal title="Adminni o'chirasizmi?" onConfirm={handleConfirm} onClose={onClose}>
      <p className="m-0">
        <strong>{admin.full_name}</strong> tizimdan butunlay o'chiriladi, bu amalni ortga qaytarib
        bo'lmaydi. Jurnaldagi yozuvlari saqlanib qoladi.
      </p>
      <p className="m-0 text-ink-600">
        Vaqtincha to'xtatish kerak bo'lsa, o'chirmasdan "Faol" belgisini olib tashlang.
      </p>
    </ConfirmModal>
  )
}
