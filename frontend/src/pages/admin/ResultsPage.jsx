import { ChartColumn, CircleAlert, Download, Eye, FileDown, FilterX, Loader2, LogOut, TriangleAlert } from 'lucide-react'
import { lazy, Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { errorMessage } from '../../api/client.js'
import { useGroups } from '../../api/groups.js'
import {
  downloadAttemptReport,
  downloadProtocol,
  downloadResultsExcel,
  useResults,
  useSuspiciousAttempts,
} from '../../api/results.js'
import Alert from '../../components/ui/Alert.jsx'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import { FilterSearch, FilterSelect } from '../../components/ui/FilterControl.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import { GROUP_STATUS } from '../../lib/groupStatus.js'
import { usePolling } from '../../lib/usePolling.js'

import AttemptAnswersDrawer from '../../components/admin/results/AttemptAnswersDrawer.jsx'

// recharts faqat shu sahifada kerak, alohida chunk bo'lib yuklanadi.
const DistributionChart = lazy(() => import('../../components/admin/results/DistributionChart.jsx'))

const NO_FILTERS = {}

// Guruh tanlagichidagi "barcha guruhlar bo'yicha shubhalilar" ko'rinishi.
const ALL_SUSPICIOUS = 'shubhali'

const statusBadge = (row) => {
  if (row.status === 'not_started') return <StatusBadge tone="neutral">Topshirmagan</StatusBadge>
  if (row.status === 'in_progress') return <StatusBadge tone="info">Davom etmoqda</StatusBadge>
  return row.passed ? (
    <StatusBadge tone="success">O'tdi</StatusBadge>
  ) : (
    <StatusBadge tone="error">O'tmadi</StatusBadge>
  )
}

// Oddiy yakunlash (o'zi yoki vaqt tugashi)dan tashqari sabablar ajratib ko'rsatiladi.
const FINISH_NOTES = {
  exit_limit: { tone: 'error', label: "Chiqishlar uchun to'xtatilgan" },
  admin: { tone: 'error', label: 'Admin yakunlagan' },
  terminated: { tone: 'warning', label: 'Guruh yopilganda yakunlangan' },
  expired: { tone: 'neutral', label: 'Vaqt tugagan' },
}

const formatDuration = (seconds) => {
  if (seconds === null || seconds === undefined) return '—'
  const minutes = Math.floor(seconds / 60)
  return `${minutes} daq ${String(seconds % 60).padStart(2, '0')} s`
}

const resultColumns = (onOpenAnswers, onDownload, downloadingId, exitLimit) => [
  {
    key: 'number',
    header: '№',
    width: 56,
    render: (row) => <span className="text-ink-600">{row.number}</span>,
  },
  {
    key: 'full_name',
    header: 'F.I.Sh.',
    render: (row) => (
      <div className="flex flex-col gap-0.5">
        <span className="font-semibold">{row.full_name}</span>
        {row.label && (
          <span className="text-[13px] text-ink-600">
            {row.label}
            {row.retake_reason && ` · sabab: ${row.retake_reason}`}
          </span>
        )}
      </div>
    ),
  },
  {
    key: 'pinfl',
    header: 'PINFL',
    render: (row) => <span className="text-[13px] text-ink-600">{row.pinfl}</span>,
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
    render: (row) => <span className="text-ink-600 tabular-nums">{formatDuration(row.duration_seconds)}</span>,
  },
  {
    key: 'exits',
    header: 'Chiqish',
    render: (row) =>
      row.status === 'not_started' ? (
        <span className="text-ink-400">—</span>
      ) : (
        <span
          title={`Test oynasidan chiqishlar (ruxsat: ${exitLimit})`}
          className={`inline-flex items-center gap-1 tabular-nums ${
            row.fullscreen_exits > exitLimit ? 'font-bold text-error' : row.fullscreen_exits ? 'text-warning' : 'text-ink-600'
          }`}
        >
          {row.fullscreen_exits ?? 0}
          {row.fullscreen_exits > 0 && <LogOut size={14} strokeWidth={1.9} aria-hidden="true" />}
        </span>
      ),
  },
  {
    key: 'result',
    header: 'Natija',
    render: (row) => {
      const note = FINISH_NOTES[row.finish_reason]
      return (
        <div className="flex flex-col items-start gap-1">
          {statusBadge(row)}
          {note && note.tone !== 'neutral' && <StatusBadge tone={note.tone}>{note.label}</StatusBadge>}
          {note && note.tone === 'neutral' && <span className="text-[12px] text-ink-600">{note.label}</span>}
          {row.suspicious && <StatusBadge tone="error">Shubhali</StatusBadge>}
        </div>
      )
    },
  },
  {
    key: 'answers',
    header: 'Javoblar',
    width: 170,
    render: (row) =>
      row.attemptId && row.status !== 'in_progress' ? (
        <div className="flex gap-2">
          <Button variant="secondary" size="xs" icon={Eye} onClick={() => onOpenAnswers(row.attemptId)}>
            Ko'rish
          </Button>
          <Button
            variant="secondary"
            size="xs"
            icon={FileDown}
            aria-label={`${row.full_name}: natijani PDF yuklab olish`}
            title="PDF yuklab olish"
            loading={downloadingId === row.attemptId}
            onClick={() => onDownload(row)}
          />
        </div>
      ) : null,
  },
]

// Qayta topshirgan tinglovchining har bir urinishi alohida qator, tartib raqami esa bitta.
const expandAttempts = (row, memberIndex) =>
  row.attempts.length > 1
    ? row.attempts.map((attempt, index) => ({
        ...row,
        ...attempt,
        attemptId: attempt.id,
        rowKey: `${row.id}-${index}`,
        number: index === 0 ? memberIndex + 1 : '',
      }))
    : [
        {
          ...row,
          finish_reason: row.attempts[0]?.finish_reason,
          attemptId: row.attempts[0]?.id,
          rowKey: String(row.id),
          number: memberIndex + 1,
        },
      ]

function AllSuspicious({ onOpenGroup }) {
  const { data: items, loading, error, reload } = useSuspiciousAttempts()

  const columns = [
    {
      key: 'full_name',
      header: 'F.I.Sh.',
      render: (item) => <span className="font-semibold">{item.full_name}</span>,
    },
    {
      key: 'group',
      header: 'Guruh',
      render: (item) => (
        <button
          type="button"
          onClick={() => onOpenGroup(item.group.id)}
          className="cursor-pointer font-semibold text-brand-500 underline hover:text-brand-ink-strong"
        >
          {item.group.name}
        </button>
      ),
    },
    { key: 'score', header: "To'g'ri" },
    {
      key: 'reasons',
      header: 'Sabab',
      render: (item) => (
        <div className="flex flex-col gap-0.5 text-[13px] leading-[19px] font-semibold text-error">
          {item.reasons.map((reason) => (
            <span key={reason}>{reason}</span>
          ))}
        </div>
      ),
    },
  ]

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="m-0 flex items-center gap-2 text-[17px] leading-6 font-semibold text-error">
        <TriangleAlert size={18} strokeWidth={1.9} aria-hidden="true" />
        Shubhali urinishlar · {items?.length ?? 0}
      </h2>
      <p className="m-0 text-[13px] leading-[19px] text-ink-600">
        Tekshirish uchun ro'yxat. Chiqishlar limitidan oshganlarning testi avtomatik to'xtatilgan, qolgan
        belgilar (tez javoblar, bir xil xatolar) qarorni admin qabul qilishi uchun.
      </p>
      <DataTable
        compact
        columns={columns}
        rows={items ?? []}
        loading={loading && !items}
        error={error}
        onRetry={reload}
        empty={{ title: 'Shubhali urinish topilmadi' }}
      />
    </Card>
  )
}

function SuspiciousList({ items, onOpen }) {
  return (
    <Card className="flex min-w-0 flex-[2_1_390px] flex-col gap-3">
      <h2 className="m-0 flex items-center gap-2 text-[17px] leading-6 font-semibold text-error">
        <TriangleAlert size={18} strokeWidth={1.9} aria-hidden="true" />
        Shubhali urinishlar · {items.length}
      </h2>
      <p className="m-0 text-[13px] leading-[19px] text-ink-600">
        Tekshirish uchun ro'yxat. Javoblarni ko'rish uchun ustiga bosing.
      </p>
      {items.length === 0 && <p className="m-0 text-ink-600">Shubhali urinish topilmadi.</p>}
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onOpen(item.id)}
          className="flex cursor-pointer flex-col gap-1 rounded-xl border border-border-200 p-3 text-left hover:border-border-400 hover:bg-surface-muted"
        >
          <div className="flex w-full justify-between gap-2 font-bold">
            <span>{item.full_name}</span>
            <span className="whitespace-nowrap tabular-nums" title="To'g'ri javoblar">
              {item.score ?? '—'}
            </span>
          </div>
          {item.reasons.map((reason) => (
            <div key={reason} className="text-[13px] leading-[19px] font-semibold text-error">
              {reason}
            </div>
          ))}
        </button>
      ))}
    </Card>
  )
}

function median(values) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function SummaryTiles({ results, onFilter, active }) {
  const done = results.rows.filter((row) => row.status !== 'not_started' && row.status !== 'in_progress')
  const scores = done.map((row) => row.correct_count).filter((value) => value !== null)
  const durations = done.map((row) => row.duration_seconds).filter((value) => value !== null)
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null
  const { summary } = results
  const passRate = summary.finished ? Math.round((summary.passed * 100) / summary.finished) : null
  const tiles = [
    { key: '', label: 'Topshirgan', value: `${summary.finished} / ${summary.members}`, hint: `${summary.not_started} ta boshlamagan` },
    { key: 'passed', label: "O'tdi", value: summary.passed, hint: passRate === null ? '—' : `${passRate}%`, tone: 'text-success' },
    { key: 'failed', label: "O'tmadi", value: summary.failed, hint: passRate === null ? '—' : `${100 - passRate}%`, tone: 'text-error' },
    { key: 'in_progress', label: 'Davom etmoqda', value: summary.in_progress, hint: 'hozir ishlayapti' },
    {
      key: null,
      label: "O'rtacha natija",
      value: avg === null ? '—' : `${avg.toFixed(1)} ta`,
      hint: scores.length ? `median ${median(scores)} · eng yuqori ${Math.max(...scores)} · eng past ${Math.min(...scores)}` : '—',
    },
    {
      key: null,
      label: "O'rtacha vaqt",
      value: durations.length ? `${Math.round(durations.reduce((a, b) => a + b, 0) / durations.length / 60)} daq` : '—',
      hint: results.set ? `ajratilgan ${results.set.duration_minutes} daq` : '—',
    },
  ]
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(170px,100%),1fr))] gap-4">
      {tiles.map((tile) => {
        const clickable = tile.key !== null
        const Tag = clickable ? 'button' : 'div'
        const isActive = clickable && active === tile.key
        return (
          <Tag
            key={tile.label}
            type={clickable ? 'button' : undefined}
            aria-pressed={clickable ? isActive : undefined}
            onClick={clickable ? () => onFilter(tile.key) : undefined}
            className={`flex flex-col gap-1 rounded-2xl border bg-surface-card p-4 text-left ${
              isActive ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-border-200'
            } ${clickable ? 'cursor-pointer hover:bg-surface-muted' : ''}`}
          >
            <span className="text-[13px] font-semibold text-ink-600">{tile.label}</span>
            <span className={`text-[26px] leading-9 font-extrabold tabular-nums ${tile.tone ?? 'text-ink-900'}`}>{tile.value}</span>
            <span className="text-[12px] text-ink-600">{tile.hint}</span>
          </Tag>
        )
      })}
    </div>
  )
}

const RESULT_FILTERS = {
  '': 'Barcha natijalar',
  passed: "O'tganlar",
  failed: "O'tmaganlar",
  in_progress: 'Davom etmoqda',
  not_started: 'Topshirmaganlar',
  suspicious: 'Shubhalilar',
  stopped: "To'xtatilganlar",
}

const ROW_SORTS = {
  list: "Ro'yxat tartibida",
  name: 'F.I.Sh. (A–Z)',
  best: 'Ball: yuqoridan',
  worst: 'Ball: pastdan',
  fastest: 'Vaqt: tezdan',
}

function matchesRow(row, filter) {
  const done = row.status !== 'not_started' && row.status !== 'in_progress'
  if (filter === 'passed') return done && row.passed
  if (filter === 'failed') return done && !row.passed
  if (filter === 'in_progress') return row.status === 'in_progress'
  if (filter === 'not_started') return row.status === 'not_started'
  if (filter === 'suspicious') return row.suspicious || row.attempts.some((attempt) => attempt.suspicious)
  if (filter === 'stopped') return ['exit_limit', 'admin'].includes(row.attempts.at(-1)?.finish_reason)
  return true
}

const scoreOf = (row) => row.correct_count ?? -1
const ROW_SORTERS = {
  list: () => 0,
  name: (a, b) => a.full_name.localeCompare(b.full_name, 'uz'),
  best: (a, b) => scoreOf(b) - scoreOf(a),
  worst: (a, b) => (a.correct_count ?? 999) - (b.correct_count ?? 999),
  fastest: (a, b) => (a.duration_seconds ?? 1e9) - (b.duration_seconds ?? 1e9),
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
  const [answersAttempt, setAnswersAttempt] = useState(null)
  const [downloadingId, setDownloadingId] = useState(null)
  const [search, setSearch] = useState('')
  const rowFilter = params.get('natija') ?? ''
  const rowSort = ROW_SORTS[params.get('tartib')] ? params.get('tartib') : 'list'
  const setParam = (name, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(name, value)
    else next.delete(name)
    setParams(next, { replace: true })
  }

  const handleAttemptDownload = async (row) => {
    setDownloadingId(row.attemptId)
    setExportError(null)
    try {
      await downloadAttemptReport(row.attemptId, `${row.full_name} - ${row.label ?? '1-urinish'}.pdf`)
    } catch (downloadError) {
      setExportError(errorMessage(downloadError))
    } finally {
      setDownloadingId(null)
    }
  }

  // Tanlanmagan bo'lsa natijasi bor guruh ochiladi: avval test yopilganlari.
  const hasResults = (group) => group.finished_count > 0
  const fallback =
    groups?.find((group) => group.test_status === 'finished' && hasResults(group)) ??
    groups?.find(hasResults) ??
    groups?.[0]
  const groupId = params.get('group') ?? (fallback ? String(fallback.id) : null)
  const isAllSuspicious = groupId === ALL_SUSPICIOUS
  const selected = groups?.find((group) => String(group.id) === groupId)

  const { data: results, error, reload } = useResults(isAllSuspicious ? null : groupId)
  const isCurrent = !isAllSuspicious && results && String(results.group.id) === groupId
  // Test ochiq bo'lsa natijalar o'zi yangilanib turadi.
  const isOpen = Boolean(isCurrent && results.group.test_status === 'open')
  usePolling(() => {
    if (isOpen) reload()
  }, 15000)

  const exitLimit = results?.exit_limit ?? 3
  const tableRows = useMemo(() => {
    if (!isCurrent) return []
    const q = search.trim().toLocaleLowerCase('uz')
    return results.rows
      .map((row, index) => ({ ...row, listIndex: index }))
      .filter((row) => matchesRow(row, rowFilter))
      .filter(
        (row) =>
          !q ||
          `${row.full_name} ${row.pinfl ?? ''} ${row.organization ?? ''} ${row.username ?? ''}`
            .toLocaleLowerCase('uz')
            .includes(q),
      )
      .sort((a, b) => ROW_SORTERS[rowSort](a, b) || a.listIndex - b.listIndex)
  }, [isCurrent, results, search, rowFilter, rowSort])
  const rowsFiltered = Boolean(search.trim() || rowFilter)

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

  let description = page.description
  if (isAllSuspicious) description = "Barcha guruhlar bo'yicha"
  else if (isCurrent) {
    description = `Guruh ${results.group.name} · ${results.summary.members} tinglovchi${
      results.set ? ` · ${results.set.name}` : ''
    }${isOpen ? ' · test ochiq, natijalar yangilanib turadi' : ''}`
  }

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
              <option value={ALL_SUSPICIOUS}>Barcha shubhali urinishlar</option>
              {['open', 'finished', 'closed'].map((status) => {
                const list = (groups ?? []).filter((group) => group.test_status === status)
                if (!list.length) return null
                return (
                  <optgroup key={status} label={GROUP_STATUS[status].label}>
                    {list.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name} ({group.finished_count}/{group.member_count})
                      </option>
                    ))}
                  </optgroup>
                )
              })}
            </FilterSelect>
            {!isAllSuspicious && (
              <>
                <Button
                  variant="secondary"
                  size="md"
                  icon={Download}
                  disabled={!selected}
                  loading={exporting === 'xlsx'}
                  onClick={() => handleExport('xlsx', downloadResultsExcel)}
                >
                  Excel
                </Button>
                <Button
                  size="md"
                  icon={Download}
                  disabled={!selected}
                  loading={exporting === 'pdf'}
                  onClick={() => handleExport('pdf', downloadProtocol)}
                >
                  PDF protokol
                </Button>
              </>
            )}
          </>
        }
      />

      {exportError && <Alert tone="error">{exportError}</Alert>}

      {isAllSuspicious && <AllSuspicious onOpenGroup={(id) => setParams({ group: id })} />}

      {!isAllSuspicious && (error || groupsError) && (
        <Card>
          <EmptyState
            icon={CircleAlert}
            tone="error"
            title="Natijalarni olib bo'lmadi"
            description={error ?? groupsError}
            action={
              <Button
                variant="secondary"
                size="xs"
                icon={Loader2}
                onClick={() => (groupsError ? reloadGroups() : reload())}
              >
                Qayta urinish
              </Button>
            }
          />
        </Card>
      )}

      {!isAllSuspicious && !error && !groupsError && !isCurrent && (
        <Card>
          <EmptyState icon={Loader2} spin title="Yuklanmoqda" />
        </Card>
      )}

      {isCurrent && (
        <>
          <SummaryTiles results={results} active={rowFilter} onFilter={(key) => setParam('natija', rowFilter === key ? '' : key)} />

          <div className="flex flex-wrap items-stretch gap-6">
            <Card className="flex min-w-0 flex-[3_1_570px] flex-col gap-4">
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
            <SuspiciousList items={results.suspicious} onOpen={setAnswersAttempt} />
          </div>

          <Card className="flex flex-col gap-3">
            <h2 className="m-0 text-[17px] leading-6 font-semibold">Tinglovchilar natijalari</h2>
            <div className="flex flex-wrap gap-3">
              <FilterSearch
                label="F.I.Sh., PINFL yoki tashkilot bo'yicha qidirish"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <FilterSelect aria-label="Natija" className="flex-[1_1_180px]" value={rowFilter} onChange={(event) => setParam('natija', event.target.value)}>
                {Object.entries(RESULT_FILTERS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </FilterSelect>
              <FilterSelect aria-label="Saralash" className="flex-[1_1_180px]" value={rowSort} onChange={(event) => setParam('tartib', event.target.value === 'list' ? '' : event.target.value)}>
                {Object.entries(ROW_SORTS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </FilterSelect>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-ink-600">
              <span role="status">
                {rowsFiltered ? `${tableRows.length} ta tinglovchi topildi (jami ${results.rows.length})` : `Jami ${results.rows.length} ta tinglovchi`}
              </span>
              {rowsFiltered && (
                <Button
                  variant="secondary"
                  size="xs"
                  icon={FilterX}
                  onClick={() => {
                    setSearch('')
                    setParam('natija', '')
                  }}
                >
                  Filtrlarni tozalash
                </Button>
              )}
            </div>
            <DataTable
              compact
              columns={resultColumns(setAnswersAttempt, handleAttemptDownload, downloadingId, exitLimit)}
              rows={tableRows.flatMap((row) => expandAttempts(row, row.listIndex))}
              rowKey={(row) => row.rowKey}
              rowClassName={(row) => (row.suspicious ? 'bg-error-soft/40' : '')}
              minWidth={1100}
              empty={{ title: rowsFiltered ? 'Mos tinglovchi topilmadi' : "Guruhda tinglovchilar yo'q" }}
            />
          </Card>
        </>
      )}

      {answersAttempt && (
        <AttemptAnswersDrawer attemptId={answersAttempt} onClose={() => setAnswersAttempt(null)} />
      )}
    </>
  )
}
