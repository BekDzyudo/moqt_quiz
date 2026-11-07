import { Check, FileSpreadsheet, Printer } from 'lucide-react'
import { saveBase64 } from '../../../lib/download.js'
import Alert from '../../ui/Alert.jsx'
import Button from '../../ui/Button.jsx'
import Modal from '../../ui/Modal.jsx'

const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

// Ochiq parollar faqat shu oyna ochiq turganda bor: yopilgach ularni qayta olib bo'lmaydi.
export default function CredentialsResultModal({ group, result, onClose }) {
  return (
    <Modal open onClose={onClose} title="Login-parollar tayyor">
      <div className="flex flex-col gap-4">
        <Alert tone="info">
          {result.count} ta login-parol yaratildi. Parollar faqat hozir ko'rinadi: oynani yopishdan
          oldin varaqani yuklab oling. Keyin ularni olish uchun qayta generatsiya kerak bo'ladi.
        </Alert>
        <div className="flex flex-wrap gap-3">
          <Button
            icon={Printer}
            onClick={() =>
              saveBase64(result.pdf_base64, `${group.name}-varaqa.pdf`, 'application/pdf')
            }
          >
            PDF varaqa
          </Button>
          <Button
            variant="secondary"
            icon={FileSpreadsheet}
            onClick={() => saveBase64(result.xlsx_base64, `${group.name}-loginlar.xlsx`, XLSX_TYPE)}
          >
            Excel
          </Button>
        </div>
        <div className="flex justify-end">
          <Button variant="ghost" icon={Check} onClick={onClose}>
            Yopish
          </Button>
        </div>
      </div>
    </Modal>
  )
}
