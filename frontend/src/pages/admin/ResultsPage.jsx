import { ChartColumn, CircleAlert, Download, FileText, Loader2, TriangleAlert } from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { errorMessage } from '../../api/client.js'
import { useGroups } from '../../api/groups.js'
import { downloadProtocol, downloadResultsExcel, useResults } from '../../api/results.js'
import Alert from '../../components/ui/Alert.jsx'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import { FilterSelect } from '../../components/ui/FilterControl.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'

// recharts faqat shu sahifada kerak, alohida chunk bo'lib yuklanadi.
const DistributionChart = lazy(() => import('../../components/admin/results/DistributionChart.jsx'))

const NO_FILTERS = {}

const statusBadge = (row) => {
  if (row.status === 'not_started') return <StatusBadge tone="neutral">Topshirmagan</StatusBadge>
  if (row.status === 'in_progress') return <StatusBadge tone="info">Davom etmoqda</StatusBadge>
  return row.passed ? (
    <StatusBadge tone="success">O'tdi</StatusBadge>
  ) : (
    <StatusBadge tone="error">O'tmadi</StatusBadge>
  )
}

const COLUMNS = [
  {
    key: 'full_name',
    header: 'F.I.Sh.',
    render: (row) => (
      <span className="flex flex-wrap items-center gap-2 font-semibold">
        {row.full_name}
        {row.suspicious && <StatusBadge tone="error">Shubhali</StatusBadge>}
      </span>
    ),
  },
  {
    key: 'pinfl',
    header: 'PINFL',
    render: (row) => <span className="font-mono text-[13px] text-ink-600">{row.pinfl}</span>,
  },
  {
    key: 'correct',
    header: "To'g'ri",
    render: (row) => (row.correct_count === null ? '—' : `${row.correct_count} / ${row.n_total}`),
  },
  { key: 'percent', header: 'Foiz', render: (row) => (row.percent === null ? '—' : `${row.percent}%`) },
  {
    key: 'time',
    header: 'Sarflangan vaqt',
    render: (row) => (
      <span className="text-ink-600">
        {row.duration_seconds === null ? '—' : `${Math.round(row.duration_seconds / 60)} daq`}
      </span>
    ),
  },
  { key: 'result', header: 'Natija', render: statusBadge },
]

function SuspiciousList({ items }) {
  return (
    <Card className="flex min-w-0 flex-[2_1_340px] flex-col gap-3">
      <h2 className="m-0 flex items-center gap-2 text-[17px] leading-6 font-semibold text-error">
        <TriangleAlert size={18} strokeWidth={1.9} aria-hidden="true" />
        Shubhali urinishlar · {items.length}
      </h2>
      <p className="m-0 text-[13px] leading-[19px] text-ink-600">
        Avtomatik jazo emas — tekshirish uchun ro'yxat.
      </p>
      {items.length === 0 && <p className="m-0 text-ink-600">Shubhali urinish topilmadi.</p>}
      {items.map((item) => (
        <div key={item.id} className="flex flex-col gap-1 rounded-xl border border-border-200 p-3">
          <div className="flex justify-between gap-2 font-bold">
            <span>{item.full_name}</span>
            <span className="whitespace-nowrap">{item.score}</span>
          </div>
          {item.reasons.map((reason) => (
            <div key={reason} className="text-[13px] leading-[19px] font-semibold text-error">
              {reason}
            </div>
          ))}
        </div>
      ))}
    </Card>
  )
}

function chanceText(score) {
  const low = Math.floor(score)
  const high = Math.ceil(score)
  return low === high ? `${low}` : `${low}–${high}`
}

export default function ResultsPage({ page }) {
  const [params, setParams] = useSearchParams()
  const { data: groups, error: groupsError, reload: reloadGroups } = useGroups(NO_FILTERS)
  const [exporting, setExporting] = useState(null)
  const [exportError, setExportError] = useState(null)

  // Tanlanmagan bo'lsa natijasi bor guruh ochiladi: avval test yopilganlari.
  const hasResults = (group) => group.finished_count > 0
  const fallback =
    groups?.find((group) => group.test_status === 'finished' && hasResults(group)) ??
    groups?.find(hasResults) ??
    groups?.[0]
  const groupId = params.get('group') ?? (fallback ? String(fallback.id) : null)
  const selected = groups?.find((group) => String(group.id) === groupId)

  const { data: results, error, reload } = useResults(groupId)
  const isCurrent = results && String(results.group.id) === groupId

  const handleExport = async (kind, download) => {
    setExporting(kind)
    setExportError(null)
    try {
      await download(selected)
    } catch (downloadError) {
      setExportError(errorMessage(downloadError))
    } finally {
      setExporting(null)
    }
  }

  const description = isCurrent
    ? `Guruh ${results.group.name} · ${results.group.member_count} tinglovchi · ${results.summary.passed} / ${results.summary.finished} o'tgan`
    : page.description

  return (
    <>
      <PageHeader
        icon={page.icon}
        title={page.label}
        description={description}
        actions={
          <>
            <FilterSelect
              aria-label="Guruh"
              className=""
              value={groupId ?? ''}
              onChange={(event) => setParams({ group: event.target.value })}
            >
              {groups?.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </FilterSelect>
            <Button
              variant="secondary"
              size="sm"
              icon={Download}
              disabled={!selected}
              loading={exporting === 'xlsx'}
              onClick={() => handleExport('xlsx', downloadResultsExcel)}
            >
              Excel
            </Button>
            <Button
              size="sm"
              icon={FileText}
              disabled={!selected}
              loading={exporting === 'pdf'}
              onClick={() => handleExport('pdf', downloadProtocol)}
            >
              PDF protokol
            </Button>
          </>
        }
      />

      {exportError && <Alert tone="error">{exportError}</Alert>}

      {(error || groupsError) && (
        <Card>
          <EmptyState
            icon={CircleAlert}
            tone="error"
            title="Natijalarni olib bo'lmadi"
            description={error ?? groupsError}
            action={
              <Button
                variant="secondary"
                size="sm"
                icon={Loader2}
                onClick={() => (groupsError ? reloadGroups() : reload())}
              >
                Qayta urinish
              </Button>
            }
          />
        </Card>
      )}

      {!error && !groupsError && !isCurrent && (
        <Card>
          <EmptyState icon={Loader2} spin title="Yuklanmoqda" />
        </Card>
      )}

      {isCurrent && (
        <>
          <div className="flex flex-wrap items-stretch gap-6">
            <Card className="flex min-w-0 flex-[3_1_520px] flex-col gap-4">
              <div>
                <h2 className="m-0 text-[17px] leading-6 font-semibold">To'g'ri javoblar taqsimoti</h2>
                <p className="mt-1 mb-0 text-[13px] leading-[19px] text-ink-600">
                  Tasodifiy belgilashda o'rtacha {chanceText(results.chance_score)} ta to'g'ri javob
                  chiqadi; o'tish chegarasi {results.set.pass_score}.
                </p>
              </div>
              {results.summary.finished === 0 ? (
                <EmptyState
                  icon={ChartColumn}
                  title="Hali natija yo'q"
                  description="Tinglovchilar testni yakunlagach taqsimot shu yerda chiqadi."
                />
              ) : (
                <Suspense fallback={<EmptyState icon={Loader2} spin title="Yuklanmoqda" />}>
                  <DistributionChart data={results.distribution} />
                </Suspense>
              )}
            </Card>
            <SuspiciousList items={results.suspicious} />
          </div>

          <Card className="flex flex-col gap-3">
            <h2 className="m-0 text-[17px] leading-6 font-semibold">Tinglovchilar natijalari</h2>
            <DataTable
              columns={COLUMNS}
              rows={results.rows}
              minWidth={860}
              empty={{ title: "Guruhda tinglovchilar yo'q" }}
            />
          </Card>
        </>
      )}
    </>
  )
}
