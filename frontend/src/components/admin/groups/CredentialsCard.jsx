import { Key, RotateCw } from 'lucide-react'
import { useState } from 'react'
import { errorMessage } from '../../../api/client.js'
import { generateCredentials } from '../../../api/groups.js'
import Alert from '../../ui/Alert.jsx'
import Button from '../../ui/Button.jsx'
import Card from '../../ui/Card.jsx'
import ConfirmModal from '../../ui/ConfirmModal.jsx'
import CredentialsResultModal from './CredentialsResultModal.jsx'

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
    <Card padding="p-5" className="flex flex-col gap-2">
      <div className="text-[13px] font-semibold text-ink-600">Login-parollar</div>
      <div className="text-[17px] font-bold">
        {created} / {total} yaratilgan
      </div>
      <div className="flex flex-wrap gap-2">
        {missing.length > 0 && (
          <Button size="xs" icon={Key} loading={working} onClick={handleGenerateMissing}>
            {created > 0 ? `Yangi ${missing.length} tasiga yaratish` : 'Login-parol yaratish'}
          </Button>
        )}
        {created > 0 && (
          <Button variant="secondary" size="xs" icon={RotateCw} onClick={() => setConfirming(true)}>
            Qayta generatsiya
          </Button>
        )}
      </div>
      {error && <Alert tone="error">{error}</Alert>}

      {confirming && (
        <ConfirmModal
          title="Qayta generatsiya qilasizmi?"
          confirmLabel="Qayta generatsiya"
          icon={RotateCw}
          onConfirm={handleRegenerate}
          onClose={() => setConfirming(false)}
        >
          <p className="m-0">
            Guruhdagi barcha {total} ta tinglovchining parollari yangilanadi. Eski varaqalar
            ishlamay qoladi va kirib turganlar tizimdan chiqariladi.
          </p>
        </ConfirmModal>
      )}

      {result && (
        <CredentialsResultModal group={group} result={result} onClose={() => setResult(null)} />
      )}
    </Card>
  )
}
