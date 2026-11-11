import { History, ListChecks } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useLiveHistory } from '../../../api/live.js'
import { formatDateMinutes } from '../../../lib/time.js'
import { useDebouncedValue } from '../../../lib/useDebouncedValue.js'
import Button from '../../ui/Button.jsx'
import Card from '../../ui/Card.jsx'
import Checkbox from '../../ui/Checkbox.jsx'
import DataTable from '../../ui/DataTable.jsx'
import { FilterDate, FilterSearch, FilterSelect } from '../../ui/FilterControl.jsx'
import Pagination from '../../ui/Pagination.jsx'
import StatusBadge from '../../ui/StatusBadge.jsx'

function resultCell(row) {
  if (row.status === 'in_progress') return <StatusBadge tone="info">Jarayonda</StatusBadge>
  if (row.correct_count === null) return <span className="text-ink-600">{row.status_label}</span>
  return (
    <div className="flex flex-col items-start gap-1">
      <span>
        {row.correct_count} / {row.n_total}
      </span>
      <span className="text-[13px] text-ink-600">{row.status_label}</span>
      {row.finish_label && row.status === 'terminated' && (
        <span className="text-[13px] font-semibold text-error">{row.finish_label}</span>
      )}
    </div>
  )
}

export default function HistoryTab({ onOpenTimeline }) {
  const [group, setGroup] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')
  const [flagged, setFlagged] = useState(true)
  const [pageNumber, setPageNumber] = useState(1)
  const q = useDebouncedValue(search, 300)

  const params = useMemo(
    () => ({
      group: group || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      q: q || undefined,
      flagged: flagged ? 1 : undefined,
      page: pageNumber,
    }),
    [group, dateFrom, dateTo, q, flagged, pageNumber],
  )
  const { data, loading, error, reload } = useLiveHistory(params)

  const change = (setter) => (event) => {
    setter(event.target.value)
    setPageNumber(1)
  }

  const columns = [
    {
      key: 'full_name',
      header: 'F.I.Sh.',
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold">{row.user.full_name}</span>
          <span className="text-[13px] text-ink-600">
            {row.user.username}
            {row.number > 1 && ` · ${row.number}-urinish`}
          </span>
        </div>
      ),
    },
    { key: 'group', header: 'Guruh', render: (row) => row.group.name },
    {
      key: 'started',
      header: 'Boshlangan',
      render: (row) => <span className="tabular-nums">{formatDateMinutes(row.started_at)}</span>,
    },
    { key: 'result', header: 'Natija', render: resultCell },
    {
      key: 'exits',
      header: 'Chiqish',
      render: (row) => (
        <span className={row.fullscreen_exits > row.exit_limit ? 'font-bold text-error' : ''}>
          {row.fullscreen_exits}
        </span>
      ),
    },
    { key: 'locks', header: 'Qulf / kod', render: (row) => `${row.lock_count} / ${row.unlock_codes}` },
    {
      key: 'suspicious',
      header: 'Shubha',
      render: (row) => (row.suspicious ? <StatusBadge tone="error">Shubhali</StatusBadge> : null),
    },
    {
      key: 'actions',
      header: <span className="sr-only">Amallar</span>,
      align: 'right',
      render: (row) => (
        <Button variant="secondary" size="xs" icon={ListChecks} onClick={() => onOpenTimeline(row.attempt_id)}>
          Hodisalar
        </Button>
      ),
    },
  ]

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <FilterSearch label="F.I.Sh. yoki login" value={search} onChange={change(setSearch)} />
        <FilterSelect aria-label="Guruh" value={group} onChange={change(setGroup)}>
          <option value="">Barcha guruhlar</option>
          {data?.groups.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </FilterSelect>
        <FilterDate aria-label="Sanadan" title="Sanadan" value={dateFrom} onChange={change(setDateFrom)} />
        <FilterDate aria-label="Sanagacha" title="Sanagacha" value={dateTo} onChange={change(setDateTo)} />
        <Checkbox
          label="Faqat chiqqan, qulflangan yoki shubhalilar"
          checked={flagged}
          onChange={(event) => {
            setFlagged(event.target.checked)
            setPageNumber(1)
          }}
        />
      </div>
      <DataTable
        compact
        columns={columns}
        rows={data?.results ?? []}
        rowKey={(row) => row.attempt_id}
        loading={loading && !data}
        error={data ? null : error}
        onRetry={reload}
        minWidth={980}
        empty={{
          icon: History,
          title: 'Urinish topilmadi',
          description: flagged ? "Filtrni o'zgartiring yoki belgini olib tashlang." : undefined,
        }}
      />
      {data && (
        <Pagination page={pageNumber} pageSize={data.page_size} count={data.count} onPageChange={setPageNumber} />
      )}
    </Card>
  )
}
