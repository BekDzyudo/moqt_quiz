import {
  Activity,
  FilterX,
  Flag,
  History,
  KeyRound,
  ListChecks,
  Lock,
  LockOpen,
  Pause,
  Play,
  Radio,
  RotateCw,
  ShieldAlert,
  Volume2,
  VolumeX,
  WifiOff,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { errorMessage } from '../../api/client.js'
import { createUnlockCode, useLive } from '../../api/live.js'
import AdminActionModal from '../../components/admin/live/AdminActionModal.jsx'
import AttemptTimelineDrawer from '../../components/admin/live/AttemptTimelineDrawer.jsx'
import HistoryTab from '../../components/admin/live/HistoryTab.jsx'
import UnlockCodeModal from '../../components/admin/live/UnlockCodeModal.jsx'
import Alert from '../../components/ui/Alert.jsx'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import { FilterSearch, FilterSelect } from '../../components/ui/FilterControl.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import { formatTime } from '../../lib/time.js'
import { usePolling } from '../../lib/usePolling.js'

const POLL_MS = 3000
const LOW_TIME_SECONDS = 5 * 60
const SOUND_KEY = 'moqt.live.sound'

const CARD = 'flex flex-col gap-1.5 rounded-2xl border bg-surface-card p-5 text-left'

const formatSeconds = (total) => {
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

const agoText = (seconds) => {
  if (seconds === null || seconds === undefined) return "so'rov yo'q"
  if (seconds < 60) return `${seconds} s oldin`
  return `${Math.floor(seconds / 60)} daq oldin`
}

// Yangi qulflanish bo'lsa qisqa signal (Web Audio, fayl kerak emas).
function beep() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    const ctx = new AudioCtx()
    ;[0, 0.22].forEach((offset) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.15, ctx.currentTime + offset)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.18)
      osc.connect(gain).connect(ctx.destination)
      osc.start(ctx.currentTime + offset)
      osc.stop(ctx.currentTime + offset + 0.2)
    })
    setTimeout(() => ctx.close(), 800)
  } catch {
    // Brauzer ovozga ruxsat bermasa — jim.
  }
}

function Stat({ label, value, unit, tone = 'neutral', active, onClick }) {
  const color = { neutral: 'text-ink-900', danger: 'text-error', warning: 'text-warning', success: 'text-success' }[tone]
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`${CARD} cursor-pointer hover:bg-surface-muted ${
        active ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-border-200'
      }`}
    >
      <span className={`text-[13px] font-semibold ${tone === 'danger' && value ? 'text-error' : 'text-ink-600'}`}>{label}</span>
      <span className={`text-[32px] leading-10 font-extrabold tabular-nums ${value ? color : 'text-ink-900'}`}>
        {value ?? '—'}
      </span>
      <span className="text-[13px] text-ink-600">{unit}</span>
    </button>
  )
}

function stateBadge(row) {
  if (row.locked) {
    return (
      <div className="flex flex-col items-start gap-1">
        <StatusBadge tone="error">{row.admin_locked ? 'Admin qulflagan' : 'Qulflangan'}</StatusBadge>
        <span className="text-[13px] leading-[18px] text-ink-600">
          {row.lock_reason} · {formatTime(row.locked_at)}
        </span>
        {row.code_active && <span className="text-[12px] font-semibold text-success">Kod berilgan</span>}
      </div>
    )
  }
  if (!row.online) return <StatusBadge tone="warning">Aloqa yo'q</StatusBadge>
  return <StatusBadge tone="success">Ishlayapti</StatusBadge>
}

const FILTERS = {
  '': 'Hammasi',
  locked: 'Qulflanganlar',
  offline: "Aloqasi yo'qlar",
  limit: 'Chiqish limitiga yetganlar',
  low_time: 'Vaqti kam qolganlar (< 5 daq)',
}

const SORTS = {
  problems: 'Muammolilar birinchi',
  remaining: 'Qolgan vaqt: kamdan',
  progress: 'Javoblar: kamdan',
  name: 'F.I.Sh. (A–Z)',
}

const problemScore = (row) => (row.locked ? 3 : 0) + (row.online ? 0 : 2) + (row.fullscreen_exits >= row.exit_limit ? 1 : 0)
const SORTERS = {
  problems: (a, b) => problemScore(b) - problemScore(a) || a.remaining_seconds - b.remaining_seconds,
  remaining: (a, b) => a.remaining_seconds - b.remaining_seconds,
  progress: (a, b) => a.answered / a.n_total - b.answered / b.n_total,
  name: (a, b) => a.user.full_name.localeCompare(b.user.full_name, 'uz'),
}

function matches(row, filter, q) {
  if (filter === 'locked' && !row.locked) return false
  if (filter === 'offline' && row.online) return false
  if (filter === 'limit' && row.fullscreen_exits < row.exit_limit) return false
  if (filter === 'low_time' && row.remaining_seconds > LOW_TIME_SECONDS) return false
  if (q && !`${row.user.full_name} ${row.user.username} ${row.group.name}`.toLocaleLowerCase('uz').includes(q)) return false
  return true
}

const EVENT_ICONS = { locked: Lock, admin_locked: ShieldAlert, reconnect: WifiOff, new_session: WifiOff, unlocked: LockOpen, finish: Flag }

function OpenTests({ tests, onSelect }) {
  if (!tests?.length) return null
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(280px,100%),1fr))] gap-4">
      {tests.map((test) => {
        const total = test.members || 1
        return (
          <button
            key={test.id}
            type="button"
            onClick={() => onSelect(String(test.id))}
            className="flex cursor-pointer flex-col gap-2 rounded-2xl border border-border-200 bg-surface-card p-4 text-left hover:border-border-400"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-bold">{test.name}</span>
              <StatusBadge tone="success">Ochiq</StatusBadge>
            </div>
            <span className="line-clamp-1 text-[12px] text-ink-600">
              {test.set_name ?? "To'plam yo'q"}
              {test.opened_at && ` · ochilgan ${formatTime(test.opened_at)}`}
            </span>
            <div className="flex h-2 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
              <span className="bg-success" style={{ width: `${(test.finished * 100) / total}%` }} />
              <span className="bg-brand-500" style={{ width: `${(test.working * 100) / total}%` }} />
            </div>
            <div className="flex flex-wrap gap-x-3 text-[12px] text-ink-600 tabular-nums">
              <span>
                <b className="text-brand-ink-strong">{test.working}</b> ishlayapti
              </span>
              <span>
                <b className="text-success">{test.finished}</b> topshirdi
              </span>
              <span>
                <b className="text-ink-900">{test.not_started}</b> boshlamagan
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}

function LiveNow({ groupId, onGroups, onOpenTimeline, onSelectGroup }) {
  const [paused, setPaused] = useState(false)
  const { data, loading, error, reload } = useLive(groupId)
  const groupsKey = JSON.stringify(data?.groups ?? null)
  useEffect(() => {
    onGroups(JSON.parse(groupsKey))
  }, [groupsKey, onGroups])
  const [issuing, setIssuing] = useState(null)
  const [issued, setIssued] = useState(null)
  const [issueError, setIssueError] = useState(null)
  const [action, setAction] = useState(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('')
  const [sort, setSort] = useState('problems')
  const [sound, setSound] = useState(() => {
    try {
      return localStorage.getItem(SOUND_KEY) === '1'
    } catch {
      return false
    }
  })
  const [updatedAt, setUpdatedAt] = useState(null)

  usePolling(() => {
    if (!paused) reload()
  }, POLL_MS)

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    if (data) setUpdatedAt(new Date())
  }, [data])

  // Yangi qulflanish: ovoz (yoqilgan bo'lsa) va tab sarlavhasi.
  const lockedIds = useRef(null)
  useEffect(() => {
    if (!data) return
    const now = new Set(data.rows.filter((row) => row.locked).map((row) => row.attempt_id))
    const prev = lockedIds.current
    if (prev && sound && [...now].some((id) => !prev.has(id))) beep()
    lockedIds.current = now
  }, [data, sound])
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\) /, '')
    const locked = data?.summary.locked ?? 0
    document.title = locked ? `(${locked}) ${base}` : base
    return () => {
      document.title = document.title.replace(/^\(\d+\) /, '')
    }
  }, [data?.summary.locked])

  const toggleSound = () => {
    const next = !sound
    setSound(next)
    try {
      localStorage.setItem(SOUND_KEY, next ? '1' : '0')
    } catch {
      // saqlab bo'lmasa ham ishlayveradi
    }
    if (next) beep()
  }

  const handleIssue = async (row) => {
    setIssuing(row.attempt_id)
    setIssueError(null)
    try {
      setIssued(await createUnlockCode(row.attempt_id))
      reload()
    } catch (issueFailure) {
      setIssueError(errorMessage(issueFailure))
    } finally {
      setIssuing(null)
    }
  }

  const q = search.trim().toLocaleLowerCase('uz')
  const rows = useMemo(
    () => (data?.rows ?? []).filter((row) => matches(row, filter, q)).sort(SORTERS[sort]),
    [data, filter, q, sort],
  )
  const filtered = Boolean(q || filter)

  const columns = [
    {
      key: 'full_name',
      header: 'F.I.Sh.',
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold">{row.user.full_name}</span>
          <span className="font-mono text-[12px] text-ink-600">
            {row.user.username}
            {row.number > 1 && ` · ${row.number}-urinish`}
          </span>
        </div>
      ),
    },
    { key: 'group', header: 'Guruh', render: (row) => <span className="text-[13px]">{row.group.name}</span> },
    {
      key: 'progress',
      header: 'Jarayon',
      render: (row) => (
        <div className="flex min-w-[140px] flex-col gap-1">
          <div className="flex h-2 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
            <span className="bg-brand-500" style={{ width: `${(row.answered * 100) / (row.n_total || 1)}%` }} />
          </div>
          <span className="text-[12px] text-ink-600 tabular-nums">
            <b className="text-ink-900">
              {row.answered} / {row.n_total}
            </b>{' '}
            javob · {row.current_n}-savolda
          </span>
        </div>
      ),
    },
    {
      key: 'remaining',
      header: 'Qolgan vaqt',
      render: (row) => (
        <span
          className={`font-semibold tabular-nums ${
            row.remaining_seconds <= LOW_TIME_SECONDS ? 'text-error' : row.remaining_seconds <= 2 * LOW_TIME_SECONDS ? 'text-warning' : ''
          }`}
        >
          {formatSeconds(row.remaining_seconds)}
        </span>
      ),
    },
    {
      key: 'exits',
      header: 'Chiqishlar',
      render: (row) => (
        <div className="flex flex-col gap-0.5 tabular-nums">
          <span
            className={
              row.fullscreen_exits >= row.exit_limit ? 'font-bold text-error' : row.fullscreen_exits ? 'font-semibold text-warning' : 'text-ink-600'
            }
            title={row.fullscreen_exits >= row.exit_limit ? 'Keyingi chiqishda test avtomatik yakunlanadi' : undefined}
          >
            {row.fullscreen_exits} / {row.exit_limit}
          </span>
          {row.lock_count > 0 && <span className="text-[12px] text-ink-600">qulf: {row.lock_count}</span>}
        </div>
      ),
    },
    {
      key: 'seen',
      header: 'Faollik',
      render: (row) => (
        <span className={`inline-flex items-center gap-1.5 text-[13px] ${row.online ? 'text-ink-600' : 'font-semibold text-warning'}`}>
          <span className={`size-2 rounded-full ${row.online ? 'bg-success' : 'bg-warning'}`} aria-hidden="true" />
          {agoText(row.last_seen_seconds)}
        </span>
      ),
    },
    { key: 'state', header: 'Holat', render: stateBadge },
    {
      key: 'actions',
      header: <span className="sr-only">Amallar</span>,
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="xs" icon={ListChecks} aria-label={`${row.user.full_name} — hodisalar`} onClick={() => onOpenTimeline(row.attempt_id)} />
          {row.locked && (
            <Button size="xs" icon={KeyRound} loading={issuing === row.attempt_id} onClick={() => handleIssue(row)}>
              {row.code_active ? 'Yangi kod' : 'Kod berish'}
            </Button>
          )}
          {!row.admin_locked && (
            <Button variant="dangerOutline" size="xs" icon={Lock} onClick={() => setAction({ type: 'lock', row })}>
              Qulflash
            </Button>
          )}
          <Button variant="danger" size="xs" icon={Flag} onClick={() => setAction({ type: 'finish', row })}>
            Yakunlash
          </Button>
        </div>
      ),
    },
  ]

  const summary = data?.summary
  const statFilter = (key) => setFilter(filter === key ? '' : key)

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className={`flex items-center gap-1.5 text-[13px] font-semibold ${error && data ? 'text-error' : paused ? 'text-warning' : 'text-success'}`}>
          {error && data ? (
            <>
              <WifiOff size={16} strokeWidth={1.9} aria-hidden="true" /> Aloqa yo'q — oxirgi ma'lumot ko'rsatilmoqda
            </>
          ) : (
            <>
              <span className={`size-2.5 rounded-full ${paused ? 'bg-warning' : 'animate-pulse bg-success'}`} aria-hidden="true" />
              {paused ? "Yangilanish to'xtatilgan" : 'Jonli · har 3 soniyada'}
              {updatedAt && ` · ${updatedAt.toLocaleTimeString('uz-UZ', { hour12: false })}`}
            </>
          )}
        </span>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="xs" icon={sound ? Volume2 : VolumeX} aria-pressed={sound} onClick={toggleSound}>
            {sound ? 'Ovozli signal yoqilgan' : 'Ovozli signal'}
          </Button>
          <Button variant="secondary" size="xs" icon={paused ? Play : Pause} onClick={() => setPaused(!paused)}>
            {paused ? 'Davom ettirish' : "To'xtatish"}
          </Button>
          <Button variant="secondary" size="xs" icon={RotateCw} onClick={reload}>
            Yangilash
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
        <Stat label="Hozir ishlayapti" value={summary?.working} unit="tinglovchi" tone="success" active={filter === ''} onClick={() => setFilter('')} />
        <Stat label="Qulflangan" value={summary?.locked} unit="kod kutmoqda" tone="danger" active={filter === 'locked'} onClick={() => statFilter('locked')} />
        <Stat label="Aloqa yo'q" value={summary?.offline} unit="75 soniyadan beri so'rov yo'q" tone="warning" active={filter === 'offline'} onClick={() => statFilter('offline')} />
        <Stat
          label="Limitga yetgan"
          value={summary?.near_limit}
          unit="yana chiqsa test yakunlanadi"
          tone="danger"
          active={filter === 'limit'}
          onClick={() => statFilter('limit')}
        />
        <div className={`${CARD} border-border-200`}>
          <span className="text-[13px] font-semibold text-ink-600">Bugun yakunlagan</span>
          <span className="text-[32px] leading-10 font-extrabold tabular-nums">{summary?.finished_today ?? '—'}</span>
          <span className={`text-[13px] ${summary?.stopped_today ? 'font-semibold text-error' : 'text-ink-600'}`}>
            {summary?.stopped_today ? `${summary.stopped_today} tasi to'xtatilgan` : 'tinglovchi'}
          </span>
        </div>
      </div>

      {!groupId && <OpenTests tests={data?.open_tests} onSelect={onSelectGroup} />}

      {issueError && <Alert tone="error">{issueError}</Alert>}

      <div className="flex flex-wrap items-start gap-6">
        <Card className="flex min-w-0 flex-[3_1_640px] flex-col gap-3">
          <h2 className="m-0 text-[17px] leading-6 font-semibold">Test ishlayotganlar</h2>
          <div className="flex flex-wrap gap-3">
            <FilterSearch label="F.I.Sh., login yoki guruh bo'yicha qidirish" value={search} onChange={(event) => setSearch(event.target.value)} />
            <FilterSelect aria-label="Filtr" className="flex-[1_1_200px]" value={filter} onChange={(event) => setFilter(event.target.value)}>
              {Object.entries(FILTERS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect aria-label="Saralash" className="flex-[1_1_180px]" value={sort} onChange={(event) => setSort(event.target.value)}>
              {Object.entries(SORTS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </FilterSelect>
          </div>
          {filtered && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-ink-600">
              <span role="status">
                {rows.length} ta topildi (jami {data?.rows.length ?? 0})
              </span>
              <Button
                variant="secondary"
                size="xs"
                icon={FilterX}
                onClick={() => {
                  setSearch('')
                  setFilter('')
                }}
              >
                Filtrlarni tozalash
              </Button>
            </div>
          )}
          <DataTable
            compact
            columns={columns}
            rows={rows}
            rowKey={(row) => row.attempt_id}
            rowClassName={(row) => (row.locked ? 'bg-error-soft/40' : !row.online ? 'bg-warning-soft/40' : '')}
            loading={loading && !data}
            error={data ? null : error}
            onRetry={reload}
            minWidth={1240}
            empty={
              filtered
                ? { icon: FilterX, title: 'Mos tinglovchi topilmadi', description: "Filtrni o'zgartiring." }
                : {
                    icon: Activity,
                    title: 'Hozir hech kim test ishlamayapti',
                    description: data?.open_tests?.length
                      ? `Ochiq testlar: ${data.open_tests.length} ta. Tinglovchilar "Testni boshlash"ni bosgach shu yerda ko'rinadi.`
                      : "Ochiq test yo'q. Testni guruh sahifasidan ochish mumkin.",
                  }
            }
          />
        </Card>

        <Card className="flex min-w-0 flex-[1_1_300px] flex-col gap-3">
          <h2 className="m-0 text-[17px] leading-6 font-semibold">So'nggi hodisalar</h2>
          {data?.events.length === 0 && <p className="m-0 text-ink-600">Hozircha hodisa yo'q.</p>}
          <ol className="m-0 flex max-h-[640px] list-none flex-col gap-2 overflow-y-auto p-0">
            {data?.events.map((event) => {
              const danger = ['locked', 'admin_locked', 'hidden', 'blur', 'fullscreen_exit', 'unlock_failed'].includes(event.type)
              const good = ['unlocked', 'return'].includes(event.type)
              const Icon = EVENT_ICONS[event.type]
              return (
                <li key={event.id}>
                  <button
                    type="button"
                    onClick={() => onOpenTimeline(event.attempt_id)}
                    className="flex w-full cursor-pointer flex-col gap-0.5 rounded-xl border border-border-200 px-3 py-2 text-left hover:border-border-400 hover:bg-surface-muted"
                  >
                    <div className="flex justify-between gap-2 text-[13px] text-ink-600">
                      <span>{event.group}</span>
                      <span className="tabular-nums">{formatTime(event.at)}</span>
                    </div>
                    <span className="font-semibold">{event.full_name}</span>
                    <span className={`flex items-center gap-1 text-[13px] ${danger ? 'text-error' : good ? 'text-success' : 'text-ink-600'}`}>
                      {Icon && <Icon size={14} aria-hidden="true" />}
                      {event.label}
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
        </Card>
      </div>

      {issued && <UnlockCodeModal result={issued} onClose={() => setIssued(null)} />}
      {action && (
        <AdminActionModal
          action={action.type}
          row={action.row}
          onClose={() => setAction(null)}
          onDone={() => {
            setAction(null)
            reload()
          }}
        />
      )}
    </>
  )
}

const TABS = [
  { key: 'hozir', label: 'Hozir', icon: Radio },
  { key: 'tarix', label: 'Tarix', icon: History },
]

export default function LivePage({ page }) {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'tarix' ? 'tarix' : 'hozir'
  // Bosh paneldan: /admin/test-jarayoni?group=ID — guruh oldindan tanlanadi.
  const [groupId, setGroupId] = useState(() => params.get('group') ?? '')
  const [groups, setGroups] = useState(null)
  const [timeline, setTimeline] = useState(null)

  const handleGroups = useCallback((next) => {
    if (next) setGroups(next)
  }, [])

  return (
    <>
      <PageHeader
        icon={page.icon}
        title={page.label}
        description={
          tab === 'tarix'
            ? "Tugagan urinishlar: kim chiqqan, qulflangan, kod olgan. Ma'lumot o'chirilmaydi."
            : page.description
        }
        actions={
          tab === 'hozir' && (
            <FilterSelect
              aria-label="Guruh"
              className=""
              value={groupId}
              onChange={(event) => setGroupId(event.target.value)}
            >
              <option value="">Barcha guruhlar</option>
              {groups?.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </FilterSelect>
          )
        }
      />

      <div role="tablist" aria-label="Ko'rinish" className="flex gap-2">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setParams(key === 'hozir' ? {} : { tab: key })}
            className={`flex h-11 cursor-pointer items-center gap-2 rounded-xl border px-4 text-[15px] font-semibold ${
              tab === key
                ? 'border-brand-500 bg-brand-soft text-brand-ink-strong'
                : 'border-border-200 bg-surface-card text-ink-600'
            }`}
          >
            {label}
            <Icon size={18} strokeWidth={1.9} aria-hidden="true" />
          </button>
        ))}
      </div>

      {tab === 'hozir' ? (
        <LiveNow groupId={groupId} onGroups={handleGroups} onOpenTimeline={setTimeline} onSelectGroup={setGroupId} />
      ) : (
        <HistoryTab onOpenTimeline={setTimeline} />
      )}

      {timeline && <AttemptTimelineDrawer attemptId={timeline} onClose={() => setTimeline(null)} />}
    </>
  )
}
