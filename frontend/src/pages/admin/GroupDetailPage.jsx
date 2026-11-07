import { CircleAlert, FileUp, Loader2, Pencil, UserPlus, Users } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuestionSets } from '../../api/bank.js'
import { useGroup, useGroupMembers } from '../../api/groups.js'
import AddMemberModal from '../../components/admin/groups/AddMemberModal.jsx'
import CredentialsCard from '../../components/admin/groups/CredentialsCard.jsx'
import ExitPasswordCard from '../../components/admin/groups/ExitPasswordCard.jsx'
import GroupModal from '../../components/admin/groups/GroupModal.jsx'
import MemberImportModal from '../../components/admin/groups/MemberImportModal.jsx'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import { GROUP_STATUS } from '../../lib/groupStatus.js'
import { formatTime } from '../../lib/time.js'

const LIVE_STATUS = {
  not_started: { tone: 'neutral', label: 'Kirmagan' },
  in_progress: { tone: 'info', label: 'Ishlayapti' },
  finished: { tone: 'success', label: 'Yakunladi' },
}

const MEMBER_COLUMNS = [
  {
    key: 'full_name',
    header: 'F.I.Sh.',
    render: (member) => <span className="font-semibold">{member.full_name}</span>,
  },
  {
    key: 'login',
    header: 'Login',
    render: (member) =>
      member.login ? (
        <span className="font-mono text-[13px]">{member.login}</span>
      ) : (
        <span className="text-ink-400">Yaratilmagan</span>
      ),
  },
  {
    key: 'status',
    header: 'Holat',
    render: ({ live }) => (
      <StatusBadge tone={LIVE_STATUS[live.status].tone}>{LIVE_STATUS[live.status].label}</StatusBadge>
    ),
  },
  {
    key: 'progress',
    header: 'Progress',
    render: ({ live }) => <span className="text-ink-600">{live.progress ?? '—'}</span>,
  },
  {
    key: 'exits',
    header: 'Ekrandan chiqish',
    render: ({ live }) => <span className="text-ink-600">{live.fullscreen_exits}</span>,
  },
]

function InfoCard({ label, children }) {
  return (
    <Card className="flex flex-col gap-2 p-5">
      <div className="text-[13px] font-semibold text-ink-600">{label}</div>
      {children}
    </Card>
  )
}

function statusLabel(group) {
  const { label } = GROUP_STATUS[group.test_status]
  return group.test_status === 'open' && group.opened_at
    ? `Test ochiq · ${formatTime(group.opened_at).slice(0, 5)} dan`
    : label
}

export default function GroupDetailPage({ page }) {
  const { id } = useParams()
  const { data: group, loading, error, reload } = useGroup(id)
  const { data: members, error: membersError, reload: reloadMembers } = useGroupMembers(id)
  const { data: sets } = useQuestionSets()
  const [dialog, setDialog] = useState(null)

  const reloadAll = () => {
    reload()
    reloadMembers()
  }

  if (!group) {
    return (
      <Card>
        {error ? (
          <EmptyState
            icon={CircleAlert}
            tone="error"
            title="Guruhni ochib bo'lmadi"
            description={error}
            action={<Link to="/admin/guruhlar">Guruhlar ro'yxatiga qaytish</Link>}
          />
        ) : (
          <EmptyState icon={Loader2} spin={loading} title="Yuklanmoqda" />
        )}
      </Card>
    )
  }

  const counts = (status) =>
    (members ?? []).filter((member) => member.live.status === status).length

  return (
    <>
      <PageHeader
        icon={page.icon}
        eyebrow={
          <>
            <Link to="/admin/guruhlar">Guruhlar</Link> / {group.organization}
          </>
        }
        title={
          <>
            {group.name}
            <StatusBadge tone={GROUP_STATUS[group.test_status].tone}>{statusLabel(group)}</StatusBadge>
          </>
        }
        actions={
          <>
            <Button variant="secondary" size="sm" icon={Pencil} onClick={() => setDialog('edit')}>
              Tahrirlash
            </Button>
            <Button variant="secondary" size="sm" icon={UserPlus} onClick={() => setDialog('member')}>
              Tinglovchi qo'shish
            </Button>
            <Button size="sm" icon={FileUp} onClick={() => setDialog('import')}>
              Excel import
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-4">
        <InfoCard label="Savol to'plami">
          <div className="text-[17px] font-bold">{group.set_name}</div>
          {group.set && (
            <div className="text-[13px] text-ink-600">
              {group.set.question_count} savol · {group.set.duration_minutes} daqiqa · chegara{' '}
              {group.set.pass_score}
            </div>
          )}
        </InfoCard>
        <CredentialsCard group={group} members={members ?? []} onGenerated={reloadAll} />
        <ExitPasswordCard group={group} onChanged={reload} />
      </div>

      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="m-0 text-xl leading-7 font-bold">A'zolar — jonli holat</h2>
          <div className="flex flex-wrap gap-2 text-[13px] font-semibold">
            <span className="rounded-full bg-surface-muted px-2.5 py-1 text-ink-600">
              Kirmagan {counts('not_started')}
            </span>
            <span className="rounded-full bg-brand-soft px-2.5 py-1 text-brand-900">
              Ishlayapti {counts('in_progress')}
            </span>
            <span className="rounded-full bg-success-soft px-2.5 py-1 text-success">
              Yakunlagan {counts('finished')}
            </span>
          </div>
        </div>

        <DataTable
          columns={MEMBER_COLUMNS}
          rows={members ?? []}
          loading={!members && !membersError}
          error={membersError}
          onRetry={reloadMembers}
          minWidth={900}
          empty={{
            icon: Users,
            title: "Guruhda tinglovchilar yo'q",
            description: "Ro'yxatni Excel bilan yuklang yoki bittalab qo'shing.",
          }}
        />
      </Card>

      {dialog === 'edit' && (
        <GroupModal
          group={group}
          sets={sets ?? []}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null)
            reload()
          }}
        />
      )}

      {dialog === 'member' && (
        <AddMemberModal group={group} onClose={() => setDialog(null)} onAdded={reloadAll} />
      )}

      {dialog === 'import' && (
        <MemberImportModal groupId={group.id} onClose={() => setDialog(null)} onImported={reloadAll} />
      )}
    </>
  )
}
