import { FileSearch, FileUp, Pencil, Plus, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useQuestions, useQuestionSets } from '../../api/bank.js'
import ImportModal from '../../components/admin/bank/ImportModal.jsx'
import QuestionDrawer from '../../components/admin/bank/QuestionDrawer.jsx'
import SyncModal from '../../components/admin/bank/SyncModal.jsx'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import { FilterSearch, FilterSelect } from '../../components/ui/FilterControl.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Pagination from '../../components/ui/Pagination.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import { formatCount } from '../../lib/format.js'
import { useDebouncedValue } from '../../lib/useDebouncedValue.js'

const NEW_QUESTION = 'new'

export default function QuestionsPage({ page }) {
  const [filters, setFilters] = useState({ set: '', source: '', isActive: '' })
  const [search, setSearch] = useState('')
  const [pageNumber, setPageNumber] = useState(1)
  const [editing, setEditing] = useState(null)
  const [dialog, setDialog] = useState(null)

  const q = useDebouncedValue(search.trim())
  const { data: sets } = useQuestionSets()
  const { data, loading, error, reload } = useQuestions({ ...filters, q, page: pageNumber })

  // Debounce tugagach birinchi sahifaga qaytiladi.
  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    setPageNumber(1)
  }, [q])

  const setFilter = (name) => (event) => {
    setFilters({ ...filters, [name]: event.target.value })
    setPageNumber(1)
  }

  const columns = [
    { key: 'id', header: '№', render: (row) => <span className="text-ink-600">{row.id}</span> },
    { key: 'text', header: 'Savol', render: (row) => <span className="line-clamp-2">{row.text}</span> },
    {
      key: 'set_name',
      header: "To'plam",
      render: (row) => <span className="text-ink-600">{row.set_name}</span>,
    },
    {
      key: 'source',
      header: 'Manba',
      render: (row) =>
        row.source === 'api' ? (
          <StatusBadge tone="info">API</StatusBadge>
        ) : (
          <StatusBadge tone="neutral">O'zimizda</StatusBadge>
        ),
    },
    {
      key: 'is_active',
      header: 'Holat',
      render: (row) =>
        row.is_active ? (
          <StatusBadge tone="success">Faol</StatusBadge>
        ) : (
          <StatusBadge tone="neutral">Nofaol</StatusBadge>
        ),
    },
    {
      key: 'actions',
      header: <span className="sr-only">Amallar</span>,
      align: 'right',
      render: (row) => (
        <Button
          variant="secondary"
          size="sm"
          icon={Pencil}
          aria-label={`${row.id}-savolni tahrirlash`}
          onClick={() => setEditing(row.id)}
        />
      ),
    },
  ]

  const totals = data?.totals
  const description = totals
    ? `Jami ${formatCount(totals.all)} ta savol: ${formatCount(totals.local)} tasi o'zimizda, ${formatCount(totals.api)} tasi API orqali`
    : page.description

  const handleSaved = () => {
    setEditing(null)
    reload()
  }

  return (
    <>
      <PageHeader
        icon={page.icon}
        title={page.label}
        description={description}
        actions={
          <>
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => setDialog('sync')}>
              API'dan yangilash
            </Button>
            <Button variant="secondary" size="sm" icon={FileUp} onClick={() => setDialog('import')}>
              Excel/Word import
            </Button>
            <Button size="sm" icon={Plus} onClick={() => setEditing(NEW_QUESTION)}>
              Yangi savol
            </Button>
          </>
        }
      />

      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-3">
          <FilterSearch
            label="Savol matni bo'yicha qidirish"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <FilterSelect aria-label="Savol to'plami" value={filters.set} onChange={setFilter('set')}>
            <option value="">Barcha to'plamlar</option>
            {sets?.map((set) => (
              <option key={set.id} value={set.id}>
                {set.name}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            aria-label="Manba"
            className="flex-[1_1_160px]"
            value={filters.source}
            onChange={setFilter('source')}
          >
            <option value="">Barcha manbalar</option>
            <option value="local">O'zimizda</option>
            <option value="api">API</option>
          </FilterSelect>
          <FilterSelect
            aria-label="Holat"
            className="flex-[1_1_140px]"
            value={filters.isActive}
            onChange={setFilter('isActive')}
          >
            <option value="">Barcha holatlar</option>
            <option value="true">Faol</option>
            <option value="false">Nofaol</option>
          </FilterSelect>
        </div>

        <DataTable
          columns={columns}
          rows={data?.results ?? []}
          loading={loading && !data}
          error={error}
          onRetry={reload}
          minWidth={820}
          empty={{
            icon: FileSearch,
            title: 'Savol topilmadi',
            description: "Qidiruv matnini yoki filtrlarni o'zgartiring.",
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

      {editing !== null && (
        <QuestionDrawer
          key={editing}
          questionId={editing === NEW_QUESTION ? null : editing}
          sets={sets ?? []}
          defaultSet={filters.set}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}

      <ImportModal
        open={dialog === 'import'}
        sets={sets ?? []}
        defaultSet={filters.set}
        onClose={() => setDialog(null)}
        onImported={reload}
      />

      <SyncModal
        open={dialog === 'sync'}
        sets={sets ?? []}
        defaultSet={filters.set}
        onClose={() => setDialog(null)}
        onSynced={reload}
      />
    </>
  )
}
