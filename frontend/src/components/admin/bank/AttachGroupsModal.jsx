import { ArrowRight, Check, CircleAlert, Loader2, Users, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { errorMessage } from '../../../api/client.js'
import { updateGroup, useGroups } from '../../../api/groups.js'
import { GROUP_STATUS } from '../../../lib/groupStatus.js'
import Alert from '../../ui/Alert.jsx'
import Button from '../../ui/Button.jsx'
import EmptyState from '../../ui/EmptyState.jsx'
import Modal from '../../ui/Modal.jsx'
import StatusBadge from '../../ui/StatusBadge.jsx'

const ALL_GROUPS = {}

const LOCK_REASON = {
  open: "Test ochiq: to'plamni almashtirib bo'lmaydi.",
  finished: "Test yakunlangan: to'plamni almashtirib bo'lmaydi.",
}

const isLocked = (group) => group.test_status !== 'closed'

const failureReason = (error) => error.response?.data?.fields?.question_set ?? errorMessage(error)

function GroupRow({ group, checked, onToggle }) {
  const locked = isLocked(group)

  return (
    <label
      className={`flex items-center gap-3 rounded-xl border p-3 ${
        checked ? 'border-brand-700 bg-brand-soft' : 'border-border-200'
      } ${locked ? 'cursor-not-allowed bg-surface-muted' : 'cursor-pointer'}`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={locked}
        onChange={onToggle}
        className="size-5 shrink-0 accent-brand-700"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-semibold">{group.name}</span>
        <span className="text-[13px] leading-[19px] text-ink-600">
          {LOCK_REASON[group.test_status] ?? `Hozirgi to'plam: ${group.set_name}`}
        </span>
      </span>
      <StatusBadge tone={GROUP_STATUS[group.test_status].tone}>
        {GROUP_STATUS[group.test_status].label}
      </StatusBadge>
    </label>
  )
}

export default function AttachGroupsModal({ set, onClose, onChanged }) {
  const navigate = useNavigate()
  const { data: groups, loading, error, reload } = useGroups(ALL_GROUPS)
  const [selected, setSelected] = useState([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const candidates = useMemo(
    () =>
      (groups ?? [])
        .filter((group) => group.question_set !== set.id)
        .sort((first, second) => isLocked(first) - isLocked(second)),
    [groups, set.id],
  )

  const toggle = (id) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  const handleAttach = async () => {
    setSaving(true)
    setSaveError(null)
    const results = await Promise.allSettled(
      selected.map((id) => updateGroup(id, { question_set: set.id })),
    )
    const failures = results.flatMap((result, index) =>
      result.status === 'rejected' ? [{ id: selected[index], error: result.reason }] : [],
    )

    if (failures.length < selected.length) onChanged()
    if (failures.length === 0) {
      onClose()
      return
    }

    // Bir qismi saqlangan bo'lishi mumkin: ro'yxatni yangilab, sababni guruh nomi bilan aytamiz.
    const nameOf = (id) => groups.find((group) => group.id === id)?.name
    setSaveError(
      failures.map((failure) => `${nameOf(failure.id)}: ${failureReason(failure.error)}`).join(' '),
    )
    setSelected([])
    setSaving(false)
    reload()
  }

  let body
  if (error) {
    body = <EmptyState icon={CircleAlert} tone="error" title="Yuklab bo'lmadi" description={error} />
  } else if (loading && !groups) {
    body = <EmptyState icon={Loader2} spin title="Yuklanmoqda" />
  } else if (candidates.length === 0) {
    body = (
      <EmptyState
        icon={Users}
        title="Biriktiriladigan guruh yo'q"
        description={
          groups?.length
            ? "Barcha guruhlar shu to'plamga biriktirilgan."
            : "Avval Guruhlar sahifasida guruh yarating."
        }
        action={
          <Button variant="secondary" size="sm" icon={ArrowRight} onClick={() => navigate('/admin/guruhlar')}>
            Guruhlar sahifasiga o'tish
          </Button>
        }
      />
    )
  } else {
    body = (
      <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
        {candidates.map((group) => (
          <GroupRow
            key={group.id}
            group={group}
            checked={selected.includes(group.id)}
            onToggle={() => toggle(group.id)}
          />
        ))}
      </div>
    )
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Guruh biriktirish"
      width="max-w-[560px]"
      footer={
        <div className="ml-auto flex flex-wrap gap-3">
          <Button variant="secondary" icon={X} onClick={onClose}>
            Bekor qilish
          </Button>
          <Button icon={Check} loading={saving} disabled={selected.length === 0} onClick={handleAttach}>
            Biriktirish
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="m-0 text-ink-600">
          Tanlangan guruhlar <strong className="text-ink-900">{set.name}</strong> to'plami bilan test
          topshiradi.
        </p>
        {body}
        {saveError && <Alert tone="error">{saveError}</Alert>}
      </div>
    </Modal>
  )
}
