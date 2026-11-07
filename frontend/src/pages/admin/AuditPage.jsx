import { Download, FileSearch } from 'lucide-react'
import { useMemo, useState } from 'react'
import { downloadAuditExcel, useAuditLog } from '../../api/audit.js'
import { errorMessage } from '../../api/client.js'
import Alert from '../../components/ui/Alert.jsx'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import { FilterDate, FilterSelect } from '../../components/ui/FilterControl.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Pagination from '../../components/ui/Pagination.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import { formatDateTime, formatTime, todayInTashkent } from '../../lib/time.js'

const ACTION_TONES = {
  admin_created: 'neutral',
  admin_updated: 'neutral',
  admin_password_changed: 'warning',
  password_changed: 'warning',
  admin_blocked: 'error',
  admin_deleted: 'error',
  admin_unblocked: 'info',
  question_set_deleted: 'error',
  question_deleted: 'error',
  question_set_updated: 'warning',
  question_updated: 'warning',
  questions_imported: 'info',
  questions_synced: 'info',
  credentials_generated: 'neutral',
  members_imported: 'info',
  exit_password_changed: 'warning',
  test_opened: 'info',
  test_closed: 'info',
  test_open_failed: 'error',
  retake_granted: 'warning',
  results_exported: 'neutral',
  login: 'neutral',
  logout: 'neutral',
}

export default function AuditPage({ page }) {
  const [filters, setFilters] = useState({ actor: '', action: '', date: todayInTashkent() })
  const [pageNumber, setPageNumber] = useState(1)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState(null)

  const { data, loading, error, reload } = useAuditLog({ ...filters, page: pageNumber })

  const setFilter = (name) => (event) => {
    setFilters({ ...filters, [name]: event.target.value })
    setPageNumber(1)
  }

  const handleExport = async () => {
    setExporting(true)
    setExportError(null)
    try {
      await downloadAuditExcel(filters)
    } catch (downloadError) {
      setExportError(errorMessage(downloadError))
    } finally {
      setExporting(false)
    }
  }

  const columns = useMemo(
    () => [
      {
        key: 'at',
        header: 'Vaqt',
        render: (entry) => (
          <span className="whitespace-nowrap text-ink-600 tabular-nums">
            {filters.date ? formatTime(entry.at) : formatDateTime(entry.at)}
          </span>
        ),
      },
      {
        key: 'actor_label',
        header: 'Kim',
        render: (entry) => <span className="font-semibold">{entry.actor_label}</span>,
      },
      {
        key: 'action',
        header: 'Amal',
        render: (entry) => (
          <StatusBadge tone={ACTION_TONES[entry.action] ?? 'neutral'}>
            {entry.action_label}
          </StatusBadge>
        ),
      },
      { key: 'object_repr', header: 'Obyekt' },
      {
        key: 'ip',
        header: 'IP',
        render: (entry) => <span className="font-mono text-[13px] text-ink-600">{entry.ip}</span>,
      },
    ],
    [filters.date],
  )

  return (
    <>
      <PageHeader
        icon={page.icon}
        title={page.label}
        description={page.description}
        actions={
          <Button
            variant="secondary"
            size="md"
            icon={Download}
            loading={exporting}
            onClick={handleExport}
          >
            Excel
          </Button>
        }
      />

      <Card className="flex flex-col gap-4">
        {exportError && <Alert tone="error">{exportError}</Alert>}

        <div className="flex flex-wrap gap-3">
          <FilterSelect aria-label="Foydalanuvchi" value={filters.actor} onChange={setFilter('actor')}>
            <option value="">Barcha foydalanuvchilar</option>
            {data?.filters.actors.map((actor) => (
              <option key={actor.id} value={actor.id}>
                {actor.label}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect aria-label="Amal turi" value={filters.action} onChange={setFilter('action')}>
            <option value="">Barcha amallar</option>
            {data?.filters.actions.map((action) => (
              <option key={action.code} value={action.code}>
                {action.label}
              </option>
            ))}
          </FilterSelect>
          <FilterDate aria-label="Sana" value={filters.date} onChange={setFilter('date')} />
        </div>

        <DataTable
          compact
          columns={columns}
          rows={data?.results ?? []}
          loading={loading && !data}
          error={error}
          onRetry={reload}
          minWidth={860}
          empty={{
            icon: FileSearch,
            title: "Yozuv yo'q",
            description: "Bu filtrlar bo'yicha yozuv topilmadi. Sanani yoki amal turini o'zgartiring.",
          }}
        />

        {data && !error && (
          <Pagination
            page={pageNumber}
            pageSize={data.page_size}
            count={data.count}
            onPageChange={setPageNumber}
          />
        )}
      </Card>
    </>
  )
}
