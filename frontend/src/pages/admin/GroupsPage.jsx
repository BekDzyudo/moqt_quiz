import {
  Activity,
  BarChart3,
  CircleCheck,
  FileSearch,
  FilterX,
  Plus,
  TriangleAlert,
  UserRound,
  Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuestionSets } from '../../api/bank.js'
import { useGroups } from '../../api/groups.js'
import GroupModal from '../../components/admin/groups/GroupModal.jsx'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import { FilterSearch, FilterSelect } from '../../components/ui/FilterControl.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import { formatCount } from '../../lib/format.js'
import { GROUP_STATUS } from '../../lib/groupStatus.js'
import { splitSetName } from '../../lib/setCategory.js'
import { formatDateMinutes } from '../../lib/time.js'
import { usePolling } from '../../lib/usePolling.js'
import { useDebouncedValue } from '../../lib/useDebouncedValue.js'

const POLL_MS = 15000

const READINESS = {
  '': 'Tayyorlik: hammasi',
  ready: 'Testga tayyor',
  issues: 'Muammosi bor',
}

const SORTS = {
  name: 'Nomi bo‘yicha (A–Z)',
  newest: "Yangi yaratilganlar",
  members: "A'zolar ko'p → kam",
  progress: "Topshirganlar ulushi",
}

const compareName = (a, b) => a.name.localeCompare(b.name, 'uz')
const share = (group) => (group.member_count ? group.finished_count / group.member_count : 0)
const SORTERS = {
  name: compareName,
  newest: (a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '') || compareName(a, b),
  members: (a, b) => b.member_count - a.member_count || compareName(a, b),
  progress: (a, b) => share(b) - share(a) || compareName(a, b),
}

function SummaryTile({ label, value, hint, tone = 'neutral', active, onClick }) {
  const color = { neutral: 'text-ink-900', success: 'text-success', warning: 'text-warning' }[tone]
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex cursor-pointer flex-col gap-1 rounded-2xl border bg-surface-card p-4 text-left hover:bg-surface-muted ${
        active ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-border-200'
      }`}
    >
      <span className="text-[13px] font-semibold text-ink-600">{label}</span>
      <span className={`text-[28px] leading-9 font-extrabold tabular-nums ${color}`}>{value}</span>
      <span className="text-[13px] text-ink-600">{hint}</span>
    </button>
  )
}

function Readiness({ group }) {
  if (group.issues.length === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-success">
        Tayyor <CircleCheck size={16} strokeWidth={1.9} aria-hidden="true" />
      </span>
    )
  }
  return (
    <details className="group/issues text-[13px]">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 font-semibold text-warning">
        {group.issues.length} ta muammo
        <TriangleAlert size={16} strokeWidth={1.9} aria-hidden="true" />
      </summary>
      <ul className="m-0 mt-1.5 flex list-disc flex-col gap-0.5 pl-5 text-ink-600">
        {group.issues.map((issue) => (
          <li key={issue.code} className="leading-[19px]">
            {issue.text}
          </li>
        ))}
      </ul>
    </details>
  )
}

function ProgressCell({ group }) {
  const total = group.member_count
  const finished = Math.min(group.finished_count, total)
  const working = Math.min(group.working, Math.max(0, total - finished))
  return (
    <div className="flex min-w-[170px] flex-col gap-1.5">
      <div
        role="img"
        aria-label={`${finished} topshirdi, ${working} ishlayapti, jami ${total}`}
        className="flex h-2 overflow-hidden rounded-full bg-surface-muted"
      >
        {total > 0 && (
          <>
            <span className="bg-success" style={{ width: `${(finished * 100) / total}%` }} />
            <span className="bg-brand-500" style={{ width: `${(working * 100) / total}%` }} />
          </>
        )}
      </div>
      <div className="flex flex-wrap gap-x-3 text-[12px] text-ink-600 tabular-nums">
        <span>
          <b className="text-ink-900">
            {group.finished_count} / {total}
          </b>{' '}
          topshirdi
        </span>
        {group.finished_count > 0 && (
          <span>
            <b className="text-success">{group.passed_count}</b> o'tdi
          </span>
        )}
        {group.working > 0 && (
          <span>
            <b className="text-brand-ink-strong">{group.working}</b> ishlayapti
          </span>
        )}
      </div>
    </div>
  )
}

function StatusCell({ group }) {
  const view = GROUP_STATUS[group.test_status]
  let detail = null
  if (group.test_status === 'open' && group.opened_at) detail = `ochilgan: ${formatDateMinutes(group.opened_at)}`
  else if (group.test_status === 'closed' && group.scheduled_open_at) detail = `ochiladi: ${formatDateMinutes(group.scheduled_open_at)}`
  else if (group.closed_at) detail = `yopilgan: ${formatDateMinutes(group.closed_at)}`
  return (
    <div className="flex flex-col items-start gap-1">
      <StatusBadge tone={view.tone}>{view.label}</StatusBadge>
      {detail && <span className="text-[12px] text-ink-600 tabular-nums">{detail}</span>}
      {group.suspicious_count > 0 && <StatusBadge tone="error">{group.suspicious_count} shubhali</StatusBadge>}
    </div>
  )
}

const ICON_LINK =
  'inline-flex size-9 items-center justify-center rounded-xl border border-border-400 bg-surface-card text-ink-600 hover:bg-surface-muted'

export default function GroupsPage({ page }) {
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState(() => params.get('q') ?? '')
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()

  const status = params.get('holat') ?? ''
  const readiness = params.get('tayyorlik') ?? ''
  const setId = params.get('toplam') ?? ''
  const sort = SORTS[params.get('tartib')] ? params.get('tartib') : 'name'

  const setParam = (name, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(name, value)
    else next.delete(name)
    setParams(next, { replace: true })
  }

  const q = useDebouncedValue(search.trim())
  // Holat filtri ro'yxat ichida qo'llanadi: yuqoridagi kartochkalar umumiy sonni ko'rsatadi.
  const { data: groups, loading, error, reload } = useGroups({ q, status: '' })
  const { data: sets } = useQuestionSets()
  usePolling(reload, POLL_MS)

  const all = useMemo(() => groups ?? [], [groups])
  const stats = useMemo(
    () => ({
      total: all.length,
      open: all.filter((group) => group.test_status === 'open').length,
      members: all.reduce((sum, group) => sum + group.member_count, 0),
      working: all.reduce((sum, group) => sum + group.working, 0),
      issues: all.filter((group) => group.test_status !== 'finished' && group.issues.length > 0).length,
    }),
    [all],
  )

  const usedSets = useMemo(() => {
    const ids = new Set(all.map((group) => group.question_set).filter(Boolean))
    return (sets ?? []).filter((set) => ids.has(set.id)).sort((a, b) => a.name.localeCompare(b.name, 'uz'))
  }, [all, sets])

  const rows = useMemo(
    () =>
      all
        .filter((group) => !status || group.test_status === status)
        .filter((group) => !setId || String(group.question_set) === setId)
        .filter((group) => !readiness || (readiness === 'ready') === (group.issues.length === 0))
        .sort(SORTERS[sort]),
    [all, status, setId, readiness, sort],
  )

  const hasFilters = Boolean(q || status || readiness || setId)
  const clearFilters = () => {
    setSearch('')
    const next = new URLSearchParams()
    if (params.get('tartib')) next.set('tartib', params.get('tartib'))
    setParams(next, { replace: true })
  }

  const columns = [
    {
      key: 'name',
      header: 'Guruh',
      render: (group) => (
        <div className="flex flex-col gap-0.5">
          <Link to={`/admin/guruhlar/${group.id}`} className="font-semibold">
            {group.name}
          </Link>
          <span className="font-mono text-[12px] text-ink-600">{group.login_prefix}</span>
        </div>
      ),
    },
    {
      key: 'organization',
      header: 'Tashkilot',
      render: (group) =>
        group.organization_count === 0 ? (
          <span className="text-ink-400">—</span>
        ) : (
          <div className="flex max-w-[220px] flex-col gap-0.5 text-[13px]">
            <span className="line-clamp-2" title={group.organizations.join('\n')}>
              {group.organizations[0]}
            </span>
            {group.organization_count > 1 && (
              <span className="text-[12px] text-ink-600">va yana {group.organization_count - 1} ta tashkilot</span>
            )}
          </div>
        ),
    },
    {
      key: 'set_name',
      header: "Savol to'plami",
      render: (group) => {
        if (!group.set_name) return <span className="text-warning">Biriktirilmagan</span>
        const { category, short } = splitSetName(group.set_name)
        return (
          <div className="flex max-w-[240px] flex-col gap-0.5">
            <span className="text-[12px] font-bold text-brand-ink-strong uppercase">{category}</span>
            <span className="text-[13px]">{short}</span>
          </div>
        )
      },
    },
    {
      key: 'members',
      header: "A'zolar",
      render: (group) => (
        <div className="flex flex-col gap-0.5 tabular-nums">
          <span className="font-semibold">{group.member_count}</span>
          {group.member_count > 0 && (
            <span className={`text-[12px] ${group.credentials_count < group.member_count ? 'text-warning' : 'text-ink-600'}`}>
              login: {group.credentials_count} / {group.member_count}
            </span>
          )}
        </div>
      ),
    },
    { key: 'progress', header: 'Topshirgan', render: (group) => <ProgressCell group={group} /> },
    { key: 'status', header: 'Test holati', render: (group) => <StatusCell group={group} /> },
    {
      key: 'ready',
      header: 'Tayyorlik',
      render: (group) => (group.test_status === 'finished' ? <span className="text-ink-400">—</span> : <Readiness group={group} />),
    },
    {
      key: 'actions',
      header: <span className="sr-only">Amallar</span>,
      align: 'right',
      render: (group) => (
        <div className="flex justify-end gap-2">
          {group.test_status === 'open' && (
            <Link to={`/admin/test-jarayoni?group=${group.id}`} aria-label={`${group.name} — test jarayoni`} title="Test jarayoni" className={ICON_LINK}>
              <Activity size={16} strokeWidth={1.9} aria-hidden="true" />
            </Link>
          )}
          {group.finished_count > 0 && (
            <Link to={`/admin/natijalar?group=${group.id}`} aria-label={`${group.name} — natijalar`} title="Natijalar" className={ICON_LINK}>
              <BarChart3 size={16} strokeWidth={1.9} aria-hidden="true" />
            </Link>
          )}
          <Link to={`/admin/guruhlar/${group.id}`} aria-label={`${group.name} — guruh sahifasi`} title="Guruh sahifasi" className={ICON_LINK}>
            <Users size={16} strokeWidth={1.9} aria-hidden="true" />
          </Link>
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        icon={page.icon}
        title={page.label}
        description={page.description}
        actions={
          <Button size="md" icon={Plus} onClick={() => setCreating(true)}>
            Yangi guruh
          </Button>
        }
      />

      {groups && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-4">
          <SummaryTile
            label="Jami guruhlar"
            value={formatCount(stats.total)}
            hint="barcha holatlarda"
            active={!status && !readiness}
            onClick={() => {
              const next = new URLSearchParams(params)
              next.delete('holat')
              next.delete('tayyorlik')
              setParams(next, { replace: true })
            }}
          />
          <SummaryTile
            label="Test ochiq"
            value={formatCount(stats.open)}
            hint={stats.working ? `${formatCount(stats.working)} kishi hozir ishlayapti` : 'hozir hech kim ishlamayapti'}
            tone="success"
            active={status === 'open'}
            onClick={() => setParam('holat', status === 'open' ? '' : 'open')}
          />
          <SummaryTile
            label="Tinglovchilar"
            value={formatCount(stats.members)}
            hint="barcha guruhlarda"
            active={false}
            onClick={() => setParam('tartib', 'members')}
          />
          <SummaryTile
            label="Tayyor emas"
            value={formatCount(stats.issues)}
            hint="ochishdan oldin hal qilish kerak"
            tone={stats.issues ? 'warning' : 'neutral'}
            active={readiness === 'issues'}
            onClick={() => setParam('tayyorlik', readiness === 'issues' ? '' : 'issues')}
          />
        </div>
      )}

      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-3">
          <FilterSearch
            label="Guruh, login prefiksi yoki tashkilot bo'yicha qidirish"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <FilterSelect aria-label="Test holati" className="flex-[1_1_160px]" value={status} onChange={(event) => setParam('holat', event.target.value)}>
            <option value="">Barcha holatlar</option>
            {Object.entries(GROUP_STATUS).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect aria-label="Tayyorlik" className="flex-[1_1_160px]" value={readiness} onChange={(event) => setParam('tayyorlik', event.target.value)}>
            {Object.entries(READINESS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect aria-label="Savol to'plami" className="flex-[1_1_220px]" value={setId} onChange={(event) => setParam('toplam', event.target.value)}>
            <option value="">Barcha to'plamlar</option>
            {usedSets.map((set) => (
              <option key={set.id} value={set.id}>
                {set.name}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect aria-label="Saralash" className="flex-[1_1_180px]" value={sort} onChange={(event) => setParam('tartib', event.target.value === 'name' ? '' : event.target.value)}>
            {Object.entries(SORTS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </FilterSelect>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-ink-600">
          <span role="status" className="flex items-center gap-1.5">
            <UserRound size={16} strokeWidth={1.9} aria-hidden="true" />
            {groups ? `${rows.length} ta guruh${hasFilters ? ` topildi (jami ${stats.total})` : ''}` : ' '}
          </span>
          {hasFilters && (
            <Button variant="secondary" size="xs" icon={FilterX} onClick={clearFilters}>
              Filtrlarni tozalash
            </Button>
          )}
        </div>

        <DataTable
          columns={columns}
          rows={rows}
          loading={loading && !groups}
          error={groups ? null : error}
          onRetry={reload}
          minWidth={1150}
          rowClassName={(group) => (group.test_status === 'open' ? 'bg-success-soft/30' : '')}
          empty={{
            icon: FileSearch,
            title: hasFilters ? 'Guruh topilmadi' : "Guruhlar yo'q",
            description: hasFilters ? "Qidiruv matnini yoki filtrni o'zgartiring." : 'Birinchi guruhni yarating.',
            action: hasFilters ? (
              <Button variant="secondary" size="xs" icon={FilterX} onClick={clearFilters}>
                Filtrlarni tozalash
              </Button>
            ) : (
              <Button size="xs" icon={Plus} onClick={() => setCreating(true)}>
                Yangi guruh
              </Button>
            ),
          }}
        />
      </Card>

      {creating && (
        <GroupModal
          sets={sets ?? []}
          onClose={() => setCreating(false)}
          onSaved={(group) => navigate(`/admin/guruhlar/${group.id}`)}
        />
      )}
    </>
  )
}
