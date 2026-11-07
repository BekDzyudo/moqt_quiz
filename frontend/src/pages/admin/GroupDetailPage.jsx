import {
  CircleAlert,
  Upload,
  Key,
  Loader2,
  Lock,
  LockOpen,
  PenLine,
  RotateCcw,
  UserPlus,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuestionSets } from '../../api/bank.js'
import {
  generateCredentials,
  openGroupTest,
  useGroup,
  useGroupMembers,
} from '../../api/groups.js'
import AddMemberModal from '../../components/admin/groups/AddMemberModal.jsx'
import CloseTestModal from '../../components/admin/groups/CloseTestModal.jsx'
import CredentialsCard from '../../components/admin/groups/CredentialsCard.jsx'
import CredentialsResultModal from '../../components/admin/groups/CredentialsResultModal.jsx'
import ExitPasswordCard from '../../components/admin/groups/ExitPasswordCard.jsx'
import GroupModal from '../../components/admin/groups/GroupModal.jsx'
import MemberImportModal from '../../components/admin/groups/MemberImportModal.jsx'
import RetakeModal from '../../components/admin/groups/RetakeModal.jsx'
import ActionMenu from '../../components/ui/ActionMenu.jsx'
import Alert from '../../components/ui/Alert.jsx'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import ConfirmModal from '../../components/ui/ConfirmModal.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import { GROUP_STATUS } from '../../lib/groupStatus.js'
import { formatDateMinutes } from '../../lib/time.js'
import { usePolling } from '../../lib/usePolling.js'

const POLL_MS = 5000

const LIVE_STATUS = {
  not_started: { tone: 'neutral', label: 'Kirmagan' },
  in_progress: { tone: 'info', label: 'Ishlayapti' },
  finished: { tone: 'success', label: 'Yakunladi' },
}

const MEMBER_COLUMNS = [
  {
    key: 'number',
    header: '№',
    width: 56,
    render: (_, index) => <span className="text-ink-600">{index + 1}</span>,
  },
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
    render: ({ live }) =>
      live.retake_pending ? (
        <StatusBadge tone="warning">Qayta topshiradi</StatusBadge>
      ) : (
        <StatusBadge tone={LIVE_STATUS[live.status].tone}>{LIVE_STATUS[live.status].label}</StatusBadge>
      ),
  },
  {
    key: 'progress',
    header: 'Progress',
    render: ({ live }) => (
      <div className="flex flex-col gap-0.5 text-ink-600">
        <span>{live.progress ?? '—'}</span>
        {live.previous?.map((item) => (
          <span key={item} className="text-[13px]">
            {item}
          </span>
        ))}
      </div>
    ),
  },
  {
    key: 'exits',
    header: 'Ekrandan chiqish',
    render: ({ live }) =>
      live.suspicious ? (
        <StatusBadge tone="error">{live.fullscreen_exits} marta · shubhali</StatusBadge>
      ) : (
        <span className="text-ink-600">{live.fullscreen_exits}</span>
      ),
  },
]

function InfoCard({ label, children }) {
  return (
    <Card padding="p-5" className="flex flex-col gap-2">
      <div className="text-[13px] font-semibold text-ink-600">{label}</div>
      {children}
    </Card>
  )
}

function statusLabel(group) {
  const { label } = GROUP_STATUS[group.test_status]
  return group.test_status === 'open' && group.opened_at
    ? `Test ochiq · ${formatDateMinutes(group.opened_at)} dan`
    : label
}

export default function GroupDetailPage({ page }) {
  const { id } = useParams()
  const { data: group, loading, error, reload } = useGroup(id)
  const { data: members, error: membersError, reload: reloadMembers } = useGroupMembers(id)
  const { data: sets } = useQuestionSets()
  const [dialog, setDialog] = useState(null)
  const [selectedMember, setSelectedMember] = useState(null)
  const [credentials, setCredentials] = useState(null)

  const reloadAll = () => {
    reload()
    reloadMembers()
  }

  usePolling(reloadAll, POLL_MS)

  const closeDialog = () => {
    setDialog(null)
    setSelectedMember(null)
  }

  const memberDialog = (name, member) => {
    setSelectedMember(member)
    setDialog(name)
  }

  const handleOpenTest = async () => {
    await openGroupTest(group.id)
    closeDialog()
    reloadAll()
  }

  const handleRegenerateMember = async () => {
    const result = await generateCredentials(group.id, [selectedMember.id])
    closeDialog()
    setCredentials(result)
    reloadAll()
  }

  const columns = [
    ...MEMBER_COLUMNS,
    {
      key: 'actions',
      header: <span className="sr-only">Amallar</span>,
      align: 'right',
      render: (member) => (
        <ActionMenu
          label={`${member.full_name} — amallar`}
          items={[
            {
              label: 'Qayta topshirishga ruxsat',
              icon: RotateCcw,
              disabled: !member.live.can_retake,
              hint: 'Tinglovchi testni yakunlagach ruxsat berish mumkin.',
              onSelect: () => memberDialog('retake', member),
            },
            {
              label: 'Login-parolni qayta yaratish',
              icon: Key,
              onSelect: () => memberDialog('credential', member),
            },
          ]}
        />
      ),
    },
  ]

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

  const isOpen = group.test_status === 'open'

  return (
    <>
      <PageHeader
        icon={page.icon}
        eyebrow={
          <>
            <Link to="/admin/guruhlar" className="underline">
              Guruhlar
            </Link>{' '}
            / {group.organization}
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
            <Button variant="secondary" size="md" icon={Upload} onClick={() => setDialog('import')}>
              Excel import
            </Button>
            {isOpen ? (
              <Button variant="dark" size="md" icon={Lock} onClick={() => setDialog('close')}>
                Testni yopish
              </Button>
            ) : (
              <Button size="md" icon={LockOpen} onClick={() => setDialog('open')}>
                {group.test_status === 'finished' ? 'Qayta ochish' : 'Testni ochish'}
              </Button>
            )}
            <ActionMenu
              size="md"
              label="Guruh amallari"
              items={[
                { label: 'Tahrirlash', icon: PenLine, onSelect: () => setDialog('edit') },
                { label: "Tinglovchi qo'shish", icon: UserPlus, onSelect: () => setDialog('member') },
              ]}
            />
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
          compact
          columns={columns}
          rows={members ?? []}
          loading={!members && !membersError}
          error={membersError}
          onRetry={reloadMembers}
          minWidth={900}
          empty={{
            icon: Users,
            title: "Guruhda tinglovchilar yo'q",
            description: "Ro'yxatni Excel bilan yuklang yoki bittalab qo'shing.",
            action: (
              <Button size="md" icon={Upload} onClick={() => setDialog('import')}>
                Excel import
              </Button>
            ),
          }}
        />
      </Card>

      {dialog === 'open' && (
        <ConfirmModal
          title="Testni ochasizmi?"
          confirmLabel="Testni ochish"
          icon={LockOpen}
          variant="primary"
          onConfirm={handleOpenTest}
          onClose={closeDialog}
        >
          <p className="m-0">
            Guruh <strong>{group.name}</strong> tinglovchilari testni boshlay oladi.
          </p>
          {!group.exit_password_set && (
            <Alert tone="info">
              Chiqish paroli o'rnatilmagan: test paytida tinglovchini to'liq ekrandan chiqarib
              bo'lmaydi. Avval parolni o'rnatish tavsiya etiladi.
            </Alert>
          )}
        </ConfirmModal>
      )}

      {dialog === 'close' && (
        <CloseTestModal
          groupId={group.id}
          groupName={group.name}
          working={counts('in_progress')}
          onClose={closeDialog}
          onClosed={() => {
            closeDialog()
            reloadAll()
          }}
        />
      )}

      {dialog === 'retake' && (
        <RetakeModal
          groupId={group.id}
          member={selectedMember}
          onClose={closeDialog}
          onGranted={() => {
            closeDialog()
            reloadAll()
          }}
        />
      )}

      {dialog === 'credential' && (
        <ConfirmModal
          title="Login-parolni qayta yaratasizmi?"
          confirmLabel="Qayta yaratish"
          icon={Key}
          onConfirm={handleRegenerateMember}
          onClose={closeDialog}
        >
          <p className="m-0">
            <strong>{selectedMember.full_name}</strong> uchun yangi parol yaratiladi. Eski parol
            ishlamay qoladi. Tinglovchi testda bo'lsa, qayta kirishi kerak bo'ladi, vaqt to'xtamaydi.
          </p>
        </ConfirmModal>
      )}

      {credentials && (
        <CredentialsResultModal
          group={group}
          result={credentials}
          onClose={() => setCredentials(null)}
        />
      )}

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
        <AddMemberModal
          group={group}
          onClose={() => setDialog(null)}
          onAdded={reloadAll}
          onImport={() => setDialog('import')}
        />
      )}

      {dialog === 'import' && (
        <MemberImportModal groupId={group.id} onClose={() => setDialog(null)} onImported={reloadAll} />
      )}
    </>
  )
}
