import { CalendarOff, Lock } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDashboard } from '../../api/results.js'
import CloseTestModal from '../../components/admin/groups/CloseTestModal.jsx'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import { formatTime, formatUzDate } from '../../lib/time.js'
import { usePolling } from '../../lib/usePolling.js'

const POLL_MS = 5000

function StatCard({ label, value, unit, danger = false }) {
  return (
    <>
      <span className={`text-[13px] font-semibold ${danger ? 'text-error' : 'text-ink-600'}`}>{label}</span>
      <span className={`text-[32px] leading-10 font-extrabold ${danger ? 'text-error' : 'text-ink-900'}`}>
        {value ?? '—'}
      </span>
      <span className="text-[13px] text-ink-600">{unit}</span>
    </>
  )
}

const CARD = 'flex flex-col gap-1.5 rounded-2xl border border-border-200 bg-surface-card p-5'

export default function DashboardPage({ page }) {
  const { data, loading, error, reload } = useDashboard()
  const [closing, setClosing] = useState(null)
  const [today] = useState(() => formatUzDate(new Date()))

  usePolling(reload, POLL_MS)

  const columns = [
    {
      key: 'name',
      header: 'Guruh',
      render: (test) => (
        <Link to={`/admin/guruhlar/${test.id}`} className="font-semibold">
          {test.name}
        </Link>
      ),
    },
    { key: 'set_name', header: "Savol to'plami" },
    {
      key: 'opened_at',
      header: 'Ochilgan',
      render: (test) => (test.opened_at ? formatTime(test.opened_at).slice(0, 5) : '—'),
    },
    {
      key: 'working',
      header: 'Ishlayapti',
      render: (test) => `${test.working} / ${test.member_count}`,
    },
    { key: 'finished', header: 'Yakunlagan' },
    {
      key: 'actions',
      header: <span className="sr-only">Amallar</span>,
      align: 'right',
      render: (test) => (
        <Button variant="secondary" size="sm" icon={Lock} onClick={() => setClosing(test)}>
          Testni yopish
        </Button>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        icon={page.icon}
        title={page.label}
        description={`Bugungi testlar holati, ${today}`}
      />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <div className={CARD}>
          <StatCard label="Ochiq testlar" value={data?.open_groups} unit="guruh" />
        </div>
        <div className={CARD}>
          <StatCard label="Hozir ishlayapti" value={data?.working_now} unit="tinglovchi" />
        </div>
        <div className={CARD}>
          <StatCard label="Bugun yakunlagan" value={data?.finished_today} unit="tinglovchi" />
        </div>
        <Link
          to="/admin/natijalar"
          className={`${CARD} no-underline hover:border-border-400`}
        >
          <StatCard label="Shubhali urinishlar" value={data?.suspicious_count} unit="ko'rib chiqish kerak" danger />
        </Link>
      </div>

      <Card className="flex flex-col gap-4">
        <h2 className="m-0 text-xl leading-7 font-bold">Ochiq testlar</h2>
        <DataTable
          columns={columns}
          rows={data?.open_tests ?? []}
          loading={loading && !data}
          error={data ? null : error}
          onRetry={reload}
          empty={{
            icon: CalendarOff,
            title: "Ochiq test yo'q",
            description: 'Testni guruh sahifasidan ochish mumkin.',
          }}
        />
      </Card>

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
