import {
  Activity,
  BarChart3,
  CalendarClock,
  CalendarOff,
  CircleAlert,
  CircleCheck,
  Database,
  Flag,
  Layers,
  ListChecks,
  Lock,
  LockOpen,
  Radio,
  Server,
  ShieldAlert,
  TriangleAlert,
  WifiOff,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDashboard } from '../../api/results.js'
import CloseTestModal from '../../components/admin/groups/CloseTestModal.jsx'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import { formatCount } from '../../lib/format.js'
import { formatDateMinutes, formatTime, formatUzDate } from '../../lib/time.js'
import { usePolling } from '../../lib/usePolling.js'

const POLL_MS = 5000
const CARD = 'flex flex-col gap-1.5 rounded-2xl border border-border-200 bg-surface-card p-5'
const WEEKDAYS = ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh']

// ---------------------------------------------------------------- kichik bloklar

function StatCard({ to, label, value, unit, tone = 'neutral', children }) {
  const color = { neutral: 'text-ink-900', danger: 'text-error', success: 'text-success' }[tone]
  const body = (
    <>
      <span className={`text-[13px] font-semibold ${tone === 'danger' ? 'text-error' : 'text-ink-600'}`}>{label}</span>
      <span className={`text-[32px] leading-10 font-extrabold tabular-nums ${color}`}>
        {value === undefined || value === null ? '—' : formatCount(value)}
      </span>
      <span className="text-[13px] text-ink-600">{unit}</span>
      {children}
    </>
  )
  if (!to) return <div className={CARD}>{body}</div>
  return (
    <Link to={to} className={`${CARD} no-underline transition-colors duration-150 hover:border-border-400`}>
      {body}
    </Link>
  )
}

function Progress({ parts, total, label }) {
  // parts: [{value, className, name}] — yig'indisi total'dan oshmaydi
  return (
    <div role="img" aria-label={label} className="flex h-2 w-full overflow-hidden rounded-full bg-surface-muted">
      {total > 0 &&
        parts.map((part) =>
          part.value > 0 ? (
            <span key={part.name} className={part.className} style={{ width: `${(part.value * 100) / total}%` }} />
          ) : null,
        )}
    </div>
  )
}

function SectionTitle({ icon: Icon, children, action }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="m-0 flex items-center gap-2 text-[17px] leading-6 font-bold">
        <Icon size={18} strokeWidth={1.9} aria-hidden="true" className="text-brand-ink" />
        {children}
      </h2>
      {action}
    </div>
  )
}

const EVENT_VIEW = {
  locked: { icon: Lock, tone: 'text-error' },
  admin_locked: { icon: ShieldAlert, tone: 'text-error' },
  unlocked: { icon: LockOpen, tone: 'text-success' },
  new_session: { icon: WifiOff, tone: 'text-warning' },
  finish: { icon: Flag, tone: 'text-ink-600' },
}

function EventFeed({ events }) {
  if (!events?.length) {
    return <p className="m-0 text-[13px] text-ink-600">Bugun hali muhim hodisa yo'q.</p>
  }
  return (
    <ol className="m-0 flex list-none flex-col gap-2 p-0">
      {events.map((event) => {
        const stopped = event.type === 'finish' && event.why
        const view = stopped ? { icon: ShieldAlert, tone: 'text-error' } : EVENT_VIEW[event.type] ?? EVENT_VIEW.finish
        const Icon = view.icon
        return (
          <li key={event.id} className="flex gap-3 rounded-xl border border-border-200 px-3 py-2">
            <Icon size={18} strokeWidth={1.9} aria-hidden="true" className={`mt-0.5 shrink-0 ${view.tone}`} />
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex justify-between gap-2">
                <span className="truncate font-semibold">{event.full_name}</span>
                <span className="shrink-0 text-[13px] text-ink-600 tabular-nums">{formatTime(event.at)}</span>
              </div>
              <span className={`text-[13px] ${view.tone}`}>{event.label}</span>
              <Link to={`/admin/guruhlar/${event.group_id}`} className="text-[12px] text-ink-600">
                {event.group}
              </Link>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function WeekChart({ week }) {
  const max = Math.max(1, ...week.map((day) => day.finished))
  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-36 items-end gap-2" role="img" aria-label="Oxirgi 7 kunda yakunlangan testlar">
        {week.map((day) => {
          const date = new Date(`${day.date}T00:00:00`)
          const height = (day.finished * 100) / max
          const passedShare = day.finished ? (day.passed * 100) / day.finished : 0
          return (
            <div key={day.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
              <span className="text-[12px] font-bold text-ink-600 tabular-nums">{day.finished || ''}</span>
              <div
                title={`${day.date}: ${day.finished} ta yakunlangan, ${day.passed} tasi o'tdi`}
                className="flex w-full max-w-10 flex-col-reverse overflow-hidden rounded-t-lg bg-error-soft"
                style={{ height: `${Math.max(day.finished ? 6 : 2, height)}%` }}
              >
                <span className="w-full bg-success" style={{ height: `${passedShare}%` }} />
              </div>
              <span className="text-[12px] text-ink-600">{WEEKDAYS[date.getDay()]}</span>
            </div>
          )
        })}
      </div>
      <div className="flex flex-wrap gap-4 text-[12px] text-ink-600">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-success" aria-hidden="true" /> O'tdi
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-error-soft" aria-hidden="true" /> O'tmadi
        </span>
      </div>
    </div>
  )
}

function HealthRow({ icon: Icon, label, ok, detail }) {
  return (
    <li className="flex items-center gap-3">
      <Icon size={18} strokeWidth={1.9} aria-hidden="true" className="shrink-0 text-ink-600" />
      <span className="flex-1">{label}</span>
      {detail && <span className="text-[12px] text-ink-600">{detail}</span>}
      <StatusBadge tone={ok ? 'success' : 'error'}>{ok ? 'Ishlayapti' : 'Muammo'}</StatusBadge>
    </li>
  )
}

function LastUpdated({ data, error }) {
  const [stamp, setStamp] = useState(null)
  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    if (data) setStamp(new Date())
  }, [data])
  if (error && data) {
    return (
      <span className="flex items-center gap-1.5 text-[13px] font-semibold text-error">
        <WifiOff size={16} strokeWidth={1.9} aria-hidden="true" /> Aloqa yo'q — oxirgi ma'lumot ko'rsatilmoqda
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1.5 text-[13px] font-semibold text-success">
      <span className="relative flex size-2.5" aria-hidden="true">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-50" />
        <span className="relative inline-flex size-2.5 rounded-full bg-success" />
      </span>
      Jonli{stamp && ` · ${stamp.toLocaleTimeString('uz-UZ', { hour12: false })}`}
    </span>
  )
}

// ---------------------------------------------------------------- sahifa

export default function DashboardPage({ page }) {
  const { data, loading, error, reload } = useDashboard()
  const [closing, setClosing] = useState(null)
  const [today] = useState(() => formatUzDate(new Date()))

  usePolling(reload, POLL_MS)

  const live = data?.live
  const day = data?.today
  const health = data?.health
  const passRate = day?.finished ? Math.round((day.passed * 100) / day.finished) : null

  const columns = [
    {
      key: 'name',
      header: 'Guruh',
      render: (test) => (
        <div className="flex flex-col gap-0.5">
          <Link to={`/admin/guruhlar/${test.id}`} className="font-semibold">
            {test.name}
          </Link>
          <span className="text-[12px] text-ink-600">{test.set_name ?? "To'plam yo'q"}</span>
        </div>
      ),
    },
    {
      key: 'opened_at',
      header: 'Ochilgan',
      render: (test) => (
        <div className="flex flex-col gap-0.5 text-[13px]">
          <span className="tabular-nums">{test.opened_at ? formatDateMinutes(test.opened_at) : '—'}</span>
          {test.scheduled_close_at && (
            <span className="text-ink-600">yopiladi: {formatDateMinutes(test.scheduled_close_at)}</span>
          )}
        </div>
      ),
    },
    {
      key: 'progress',
      header: 'Jarayon',
      render: (test) => (
        <div className="flex min-w-[220px] flex-col gap-1.5">
          <Progress
            total={test.member_count}
            label={`${test.finished} yakunladi, ${test.working} ishlayapti, ${test.not_started} boshlamagan`}
            parts={[
              { name: 'finished', value: test.finished, className: 'bg-success' },
              { name: 'working', value: test.working, className: 'bg-brand-500' },
            ]}
          />
          <div className="flex flex-wrap gap-x-3 text-[12px] text-ink-600 tabular-nums">
            <span>
              <b className="text-success">{test.finished}</b> yakunladi
            </span>
            <span>
              <b className="text-brand-ink-strong">{test.working}</b> ishlayapti
            </span>
            <span>
              <b className="text-ink-900">{test.not_started}</b> boshlamagan
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'flags',
      header: 'Diqqat',
      render: (test) => (
        <div className="flex flex-wrap gap-1.5">
          {test.locked > 0 && <StatusBadge tone="error">{test.locked} qulflangan</StatusBadge>}
          {test.offline > 0 && <StatusBadge tone="warning">{test.offline} aloqa yo'q</StatusBadge>}
          {test.suspicious > 0 && <StatusBadge tone="error">{test.suspicious} shubhali</StatusBadge>}
          {!test.locked && !test.offline && !test.suspicious && <span className="text-ink-400">—</span>}
        </div>
      ),
    },
    {
      key: 'passed',
      header: "O'tdi",
      render: (test) =>
        test.finished ? (
          <span className="tabular-nums">
            {test.passed} / {test.finished}
          </span>
        ) : (
          <span className="text-ink-400">—</span>
        ),
    },
    {
      key: 'actions',
      header: <span className="sr-only">Amallar</span>,
      align: 'right',
      render: (test) => (
        <div className="flex justify-end gap-2">
          <Link
            to={`/admin/test-jarayoni?group=${test.id}`}
            aria-label={`${test.name} — test jarayoni`}
            title="Test jarayoni"
            className="inline-flex size-9 items-center justify-center rounded-xl border border-border-400 bg-surface-card text-ink-600 hover:bg-surface-muted"
          >
            <Activity size={16} strokeWidth={1.9} aria-hidden="true" />
          </Link>
          <Button variant="secondary" size="xs" icon={Lock} onClick={() => setClosing(test)}>
            Testni yopish
          </Button>
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        icon={page.icon}
        title={page.label}
        description={`Bugungi testlar holati, ${today}`}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <LastUpdated data={data} error={error} />
            <Link
              to="/admin/test-jarayoni"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-border-400 bg-surface-card px-4 text-[15px] font-bold text-ink-900 no-underline hover:bg-surface-muted"
            >
              Test jarayoni
              <Radio size={18} strokeWidth={1.9} aria-hidden="true" />
            </Link>
            <Link
              to="/admin/natijalar"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-border-400 bg-surface-card px-4 text-[15px] font-bold text-ink-900 no-underline hover:bg-surface-muted"
            >
              Natijalar
              <BarChart3 size={18} strokeWidth={1.9} aria-hidden="true" />
            </Link>
          </div>
        }
      />

      {data?.warnings?.length > 0 && (
        <div role="alert" className="flex flex-col gap-2 rounded-2xl border border-warning bg-warning-soft p-4 text-warning">
          <span className="flex items-center gap-2 font-bold">
            <TriangleAlert size={18} strokeWidth={1.9} aria-hidden="true" />
            E'tibor bering ({data.warnings.length})
          </span>
          <ul className="m-0 flex list-disc flex-col gap-1 pl-6 text-[13px] leading-[19px]">
            {data.warnings.map((warning) => (
              <li key={warning.text}>
                <Link to={`/admin/guruhlar/${warning.group_id}`} className="text-warning">
                  {warning.text}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <StatCard to="/admin/guruhlar" label="Ochiq testlar" value={data?.open_groups} unit="guruh" />
        <StatCard to="/admin/test-jarayoni" label="Hozir ishlayapti" value={live?.working} unit="tinglovchi">
          {live && (live.locked > 0 || live.offline > 0) && (
            <span className="flex flex-wrap gap-1.5 pt-1">
              {live.locked > 0 && <StatusBadge tone="error">{live.locked} qulflangan</StatusBadge>}
              {live.offline > 0 && <StatusBadge tone="warning">{live.offline} aloqa yo'q</StatusBadge>}
            </span>
          )}
        </StatCard>
        <StatCard
          to="/admin/natijalar"
          label="Bugun yakunlagan"
          value={day?.finished}
          unit={passRate === null ? 'tinglovchi' : `tinglovchi · ${passRate}% o'tdi`}
        />
        <StatCard
          to="/admin/natijalar?group=shubhali"
          label="Shubhali urinishlar"
          value={data?.suspicious_count}
          unit="ko'rib chiqish kerak"
          tone={data?.suspicious_count ? 'danger' : 'neutral'}
        />
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <Card className="flex min-w-0 flex-[3_1_640px] flex-col gap-4">
          <SectionTitle icon={Activity}>Ochiq testlar</SectionTitle>
          <DataTable
            compact
            columns={columns}
            rows={data?.open_tests ?? []}
            loading={loading && !data}
            error={data ? null : error}
            onRetry={reload}
            minWidth={900}
            empty={{
              icon: CalendarOff,
              title: "Ochiq test yo'q",
              description: 'Testni guruh sahifasidan ochish mumkin.',
            }}
          />
        </Card>

        <Card className="flex min-w-0 flex-[1_1_300px] flex-col gap-3">
          <SectionTitle
            icon={Radio}
            action={
              <Link to="/admin/test-jarayoni" className="text-[13px] font-semibold">
                Hammasi
              </Link>
            }
          >
            Bugungi hodisalar
          </SectionTitle>
          <EventFeed events={data?.events} />
        </Card>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] gap-6">
        <Card className="flex flex-col gap-4">
          <SectionTitle icon={CircleCheck}>Bugungi natijalar</SectionTitle>
          {day?.finished ? (
            <>
              <Progress
                total={day.finished}
                label={`${day.passed} o'tdi, ${day.failed} o'tmadi`}
                parts={[
                  { name: 'passed', value: day.passed, className: 'bg-success' },
                  { name: 'failed', value: day.failed, className: 'bg-error' },
                ]}
              />
              <dl className="m-0 grid grid-cols-2 gap-3">
                {[
                  ["O'tdi", day.passed, 'text-success'],
                  ["O'tmadi", day.failed, 'text-error'],
                  ["O'rtacha natija", day.avg_percent === null ? '—' : `${day.avg_percent}%`, 'text-ink-900'],
                  ['Vaqti tugagan', day.expired, 'text-ink-900'],
                  ['Chiqishlar uchun to‘xtatilgan', day.exit_limit, day.exit_limit ? 'text-error' : 'text-ink-900'],
                  ['Admin yakunlagan', day.admin_finished, 'text-ink-900'],
                ].map(([label, value, color]) => (
                  <div key={label} className="rounded-xl bg-surface-muted p-3">
                    <dt className="text-[12px] font-semibold text-ink-600">{label}</dt>
                    <dd className={`m-0 text-xl leading-7 font-extrabold tabular-nums ${color}`}>{value}</dd>
                  </div>
                ))}
              </dl>
            </>
          ) : (
            <p className="m-0 text-[13px] text-ink-600">Bugun hali hech kim testni yakunlamagan.</p>
          )}
        </Card>

        <Card className="flex flex-col gap-4">
          <SectionTitle icon={BarChart3}>Oxirgi 7 kun</SectionTitle>
          {data?.week ? <WeekChart week={data.week} /> : <p className="m-0 text-ink-600">Yuklanmoqda…</p>}
        </Card>

        <Card className="flex flex-col gap-3">
          <SectionTitle
            icon={CalendarClock}
            action={
              <Link to="/admin/guruhlar" className="text-[13px] font-semibold">
                Guruhlar
              </Link>
            }
          >
            Rejalashtirilgan testlar
          </SectionTitle>
          {data?.upcoming?.length ? (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {data.upcoming.map((group) => (
                <li key={group.id} className="flex items-center justify-between gap-3 rounded-xl border border-border-200 px-3 py-2">
                  <div className="flex min-w-0 flex-col">
                    <Link to={`/admin/guruhlar/${group.id}`} className="truncate font-semibold">
                      {group.name}
                    </Link>
                    <span className="truncate text-[12px] text-ink-600">
                      {group.set_name ?? "To'plam yo'q"} · {group.member_count} tinglovchi
                    </span>
                  </div>
                  <StatusBadge tone="info">{formatDateMinutes(group.scheduled_open_at)}</StatusBadge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 text-[13px] text-ink-600">Rejalashtirilgan ochilish yo'q.</p>
          )}
        </Card>

        <Card className="flex flex-col gap-3">
          <SectionTitle
            icon={Layers}
            action={
              <Link to="/admin/toplamlar" className="text-[13px] font-semibold">
                To'plamlar
              </Link>
            }
          >
            Savollar banki
          </SectionTitle>
          <dl className="m-0 grid grid-cols-2 gap-3">
            {[
              ["To'plamlar", data?.bank.sets, 'text-ink-900', '/admin/toplamlar'],
              ['Faol savollar', data?.bank.questions, 'text-ink-900', '/admin/savollar'],
              ['Savoli yetmaydi', data?.bank.sets_short, data?.bank.sets_short ? 'text-error' : 'text-ink-900', '/admin/toplamlar?holat=attention'],
              ['Guruhsiz to‘plam', data?.bank.sets_unattached, 'text-ink-900', '/admin/toplamlar?holat=free'],
            ].map(([label, value, color, to]) => (
              <Link key={label} to={to} className="rounded-xl bg-surface-muted p-3 no-underline hover:bg-brand-soft">
                <dt className="text-[12px] font-semibold text-ink-600">{label}</dt>
                <dd className={`m-0 text-xl leading-7 font-extrabold tabular-nums ${color}`}>
                  {value === undefined ? '—' : formatCount(value)}
                </dd>
              </Link>
            ))}
          </dl>
        </Card>

        <Card className="flex flex-col gap-3">
          <SectionTitle icon={Server}>Tizim holati</SectionTitle>
          {health ? (
            <>
              <ul className="m-0 flex list-none flex-col gap-3 p-0 text-[15px]">
                <HealthRow icon={Server} label="Server" ok detail={formatTime(health.server_now)} />
                <HealthRow icon={Database} label="Ma'lumotlar bazasi" ok={health.db} />
                <HealthRow icon={ListChecks} label="Kesh (Redis)" ok={health.cache} />
                <HealthRow
                  icon={Activity}
                  label="Fon xizmati"
                  ok={health.worker}
                  detail={health.worker_last_seen ? `oxirgi: ${formatTime(health.worker_last_seen)}` : "ma'lumot yo'q"}
                />
              </ul>
              {!health.worker && (
                <p className="m-0 flex items-start gap-2 text-[13px] leading-[19px] text-error">
                  <CircleAlert size={16} strokeWidth={1.9} aria-hidden="true" className="mt-0.5 shrink-0" />
                  Fon xizmati 2 daqiqadan beri ishlamayapti: vaqti tugagan testlar avtomatik yopilmasligi va
                  rejalashtirilgan testlar ochilmasligi mumkin. Server administratoriga xabar bering.
                </p>
              )}
            </>
          ) : (
            <p className="m-0 text-ink-600">Yuklanmoqda…</p>
          )}
        </Card>
      </div>

      {closing && (
        <CloseTestModal
          groupId={closing.id}
          groupName={closing.name}
          working={closing.working}
          onClose={() => setClosing(null)}
          onClosed={() => {
            setClosing(null)
            reload()
          }}
        />
      )}
    </>
  )
}
