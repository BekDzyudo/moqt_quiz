import { Check, FileSpreadsheet, KeyRound, Printer, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { errorMessage } from '../../../api/client.js'
import { generateCredentials } from '../../../api/groups.js'
import { saveBase64 } from '../../../lib/download.js'
import Alert from '../../ui/Alert.jsx'
import Button from '../../ui/Button.jsx'
import Card from '../../ui/Card.jsx'
import ConfirmModal from '../../ui/ConfirmModal.jsx'
import Modal from '../../ui/Modal.jsx'

const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

// Ochiq parollar faqat shu oyna ochiq turganda bor: yopilgach ularni qayta olib bo'lmaydi.
function ResultModal({ group, result, onClose }) {
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

export default function CredentialsCard({ group, members, onGenerated }) {
  const [result, setResult] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState(null)

  const created = group.credentials_count
  const total = group.member_count
  const missing = members.filter((member) => !member.has_credentials).map((member) => member.id)

  const generate = async (userIds) => {
    const generated = await generateCredentials(group.id, userIds)
    setResult(generated)
    onGenerated()
  }

  const handleGenerateMissing = async () => {
    setWorking(true)
    setError(null)
    try {
      await generate(created > 0 ? missing : undefined)
    } catch (generateError) {
      setError(errorMessage(generateError))
    } finally {
      setWorking(false)
    }
  }

  const handleRegenerate = async () => {
    await generate()
    setConfirming(false)
  }

  return (
    <Card className="flex flex-col gap-2 p-5">
      <div className="text-[13px] font-semibold text-ink-600">Login-parollar</div>
      <div className="text-[17px] font-bold">
        {created} / {total} yaratilgan
      </div>
      <div className="flex flex-wrap gap-2">
        {missing.length > 0 && (
          <Button size="sm" icon={KeyRound} loading={working} onClick={handleGenerateMissing}>
            {created > 0 ? `Yangi ${missing.length} tasiga yaratish` : 'Login-parol yaratish'}
          </Button>
        )}
        {created > 0 && (
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => setConfirming(true)}>
            Qayta generatsiya
          </Button>
        )}
      </div>
      {error && <Alert tone="error">{error}</Alert>}

      {confirming && (
        <ConfirmModal
          title="Qayta generatsiya qilasizmi?"
          confirmLabel="Qayta generatsiya"
          icon={RefreshCw}
          onConfirm={handleRegenerate}
          onClose={() => setConfirming(false)}
        >
          <p className="m-0">
            Guruhdagi barcha {total} ta tinglovchining parollari yangilanadi. Eski varaqalar
            ishlamay qoladi va kirib turganlar tizimdan chiqariladi.
          </p>
        </ConfirmModal>
      )}

      {result && <ResultModal group={group} result={result} onClose={() => setResult(null)} />}
    </Card>
  )
}
