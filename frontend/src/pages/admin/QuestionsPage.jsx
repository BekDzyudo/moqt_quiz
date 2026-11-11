import {
  Check,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  CircleOff,
  FileDown,
  FileSearch,
  FilterX,
  FolderInput,
  ImageIcon,
  Lock,
  PenLine,
  Plus,
  RotateCw,
  Trash,
  Upload,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { bulkQuestions, downloadQuestions, useQuestions, useQuestionSets } from '../../api/bank.js'
import { errorMessage } from '../../api/client.js'
import ImportModal from '../../components/admin/bank/ImportModal.jsx'
import QuestionDrawer from '../../components/admin/bank/QuestionDrawer.jsx'
import SyncModal from '../../components/admin/bank/SyncModal.jsx'
import Alert from '../../components/ui/Alert.jsx'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import ConfirmModal from '../../components/ui/ConfirmModal.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import { FilterSearch, FilterSelect } from '../../components/ui/FilterControl.jsx'
import Modal from '../../components/ui/Modal.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import Pagination from '../../components/ui/Pagination.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import { formatCount } from '../../lib/format.js'
import { groupSets, splitSetName } from '../../lib/setCategory.js'
import { useDebouncedValue } from '../../lib/useDebouncedValue.js'

const NEW_QUESTION = 'new'
const LETTERS = 'ABCD'

// URL parametri -> filtr nomi. Sahifa yangilansa yoki havola ulashilsa, filtr saqlanadi.
const FILTER_KEYS = {
  set: 'set',
  category: 'bolim',
  isActive: 'holat',
  source: 'manba',
  hasImage: 'rasm',
  inUse: 'testda',
  ordering: 'tartib',
  pageSize: 'soni',
}

const ORDERINGS = { new: 'Avval yangilari', old: 'Avval eskilari', text: 'Matn bo‘yicha (A–Z)' }
const PAGE_SIZES = ['25', '50', '100']

function Highlight({ text, query }) {
  if (!query) return text
  const index = text.toLocaleLowerCase('uz').indexOf(query.toLocaleLowerCase('uz'))
  if (index < 0) return text
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded bg-warning-soft px-0.5 text-ink-900">{text.slice(index, index + query.length)}</mark>
      {text.slice(index + query.length)}
    </>
  )
}

function OptionsPreview({ options, query }) {
  return (
    <ol className="m-0 mt-2 flex list-none flex-col gap-1.5 p-0">
      {options.map((option, index) => (
        <li
          key={option.id}
          className={`flex items-start gap-2 rounded-lg px-2.5 py-1.5 text-[13px] leading-[19px] ${
            option.is_correct ? 'bg-success-soft font-semibold text-success' : 'bg-surface-muted text-ink-600'
          }`}
        >
          <span className="w-4 shrink-0 font-bold">{LETTERS[index]}</span>
          <span className="flex-1">
            <Highlight text={option.text} query={query} />
          </span>
          {option.is_correct && (
            <>
              <Check size={16} strokeWidth={2.2} aria-hidden="true" className="shrink-0" />
              <span className="sr-only">to'g'ri javob</span>
            </>
          )}
        </li>
      ))}
    </ol>
  )
}

function MoveModal({ count, sets, onClose, onConfirm }) {
  const [target, setTarget] = useState('')
  const [working, setWorking] = useState(false)
  const [error, setError] = useState(null)
  const grouped = useMemo(() => groupSets(sets), [sets])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setWorking(true)
    setError(null)
    try {
      await onConfirm(Number(target))
    } catch (failure) {
      setError(errorMessage(failure))
      setWorking(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="Boshqa to'plamga ko'chirish" icon={FolderInput}>
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="m-0 text-ink-600">
          Tanlangan <strong className="text-ink-900">{formatCount(count)} ta</strong> savol ko'chiriladi. Testda
          ishlatilgan savollar va to'plamda allaqachon bor savollar o'tkazib yuboriladi.
        </p>
        <FilterSelect
          aria-label="Qaysi to'plamga"
          className="w-full"
          value={target}
          onChange={(event) => setTarget(event.target.value)}
        >
          <option value="">To'plamni tanlang</option>
          {grouped.map(([category, list]) => (
            <optgroup key={category} label={category}>
              {list.map((set) => (
                <option key={set.id} value={set.id}>
                  {splitSetName(set.name).short}
                </option>
              ))}
            </optgroup>
          ))}
        </FilterSelect>
        {error && <Alert tone="error">{error}</Alert>}
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" icon={X} onClick={onClose}>
            Bekor qilish
          </Button>
          <Button type="submit" icon={FolderInput} loading={working} disabled={!target}>
            Ko'chirish
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default function QuestionsPage({ page }) {
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState(() => params.get('q') ?? '')
  const [editing, setEditing] = useState(null)
  const [dialog, setDialog] = useState(null)
  const [selected, setSelected] = useState(() => new Set())
  const [expanded, setExpanded] = useState(() => new Set())
  const [bulkResult, setBulkResult] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState(null)

  const filters = Object.fromEntries(Object.entries(FILTER_KEYS).map(([key, param]) => [key, params.get(param) ?? '']))
  const pageNumber = Math.max(1, Number(params.get('sahifa')) || 1)
  const q = useDebouncedValue(search.trim())

  const { data: sets, reload: reloadSets } = useQuestionSets()
  const { data, loading, error, reload } = useQuestions({ ...filters, q, page: pageNumber })

  const update = (changes, { keepPage = false } = {}) => {
    const next = new URLSearchParams(params)
    for (const [name, value] of Object.entries(changes)) {
      if (value) next.set(name, value)
      else next.delete(name)
    }
    if (!keepPage) next.delete('sahifa')
    setParams(next, { replace: true })
  }

  // Qidiruv matni URL'ga debounce tugagach yoziladi; filtr o'zgarsa tanlov tozalanadi.
  const filterKey = JSON.stringify({ ...filters, q })
  useEffect(() => {
    if ((params.get('q') ?? '') !== q) update({ q })
    // oxlint-disable-next-line react/set-state-in-effect
    setSelected(new Set())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey])

  const setFilter = (key) => (event) => {
    const changes = { [FILTER_KEYS[key]]: event.target.value }
    // Bo'lim o'zgarsa, boshqa bo'limdagi to'plam tanlovi tushiriladi.
    if (key === 'category' && filters.set) {
      const current = sets?.find((set) => String(set.id) === filters.set)
      if (current && splitSetName(current.name).category !== event.target.value) changes[FILTER_KEYS.set] = ''
    }
    update(changes)
  }

  const groupedSets = useMemo(() => groupSets(sets), [sets])
  const setsInCategory = filters.category
    ? groupedSets.find(([category]) => category === filters.category)?.[1] ?? []
    : null

  const hasFilters = Boolean(q || Object.entries(filters).some(([key, value]) => value && !['ordering', 'pageSize'].includes(key)))
  const clearFilters = () => {
    setSearch('')
    const next = new URLSearchParams()
    for (const keep of [FILTER_KEYS.ordering, FILTER_KEYS.pageSize]) if (params.get(keep)) next.set(keep, params.get(keep))
    setParams(next, { replace: true })
  }

  const rows = data?.results ?? []
  const pageIds = rows.map((row) => row.id)
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => selected.has(id))
  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const togglePage = () =>
    setSelected((prev) => {
      const next = new Set(prev)
      for (const id of pageIds) {
        if (allOnPage) next.delete(id)
        else next.add(id)
      }
      return next
    })
  const toggleExpanded = (id) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const allExpanded = pageIds.length > 0 && pageIds.every((id) => expanded.has(id))

  const runBulk = async (action, questionSet) => {
    const result = await bulkQuestions(action, [...selected], questionSet)
    setDialog(null)
    setSelected(new Set())
    setBulkResult(result)
    reload()
    reloadSets()
  }

  const handleExport = async () => {
    setExporting(true)
    setExportError(null)
    try {
      await downloadQuestions({ ...filters, q })
    } catch (failure) {
      setExportError(errorMessage(failure))
    } finally {
      setExporting(false)
    }
  }

  const columns = [
    {
      key: 'select',
      header: (
        <input
          type="checkbox"
          aria-label="Shu sahifadagi barcha savollarni tanlash"
          className="size-5 cursor-pointer accent-brand-700"
          checked={allOnPage}
          onChange={togglePage}
        />
      ),
      render: (row) => (
        <input
          type="checkbox"
          aria-label={`${row.id}-savolni tanlash`}
          className="size-5 cursor-pointer accent-brand-700"
          checked={selected.has(row.id)}
          onChange={() => toggle(row.id)}
        />
      ),
    },
    { key: 'id', header: '№', render: (row) => <span className="text-ink-600 tabular-nums">{row.id}</span> },
    {
      key: 'text',
      header: 'Savol',
      render: (row) => {
        const open = expanded.has(row.id)
        return (
          <div className="flex min-w-0 flex-col">
            <button
              type="button"
              aria-expanded={open}
              onClick={() => toggleExpanded(row.id)}
              className="flex cursor-pointer items-start gap-2 text-left"
            >
              <span className={`flex-1 ${open ? '' : 'line-clamp-2'}`}>
                <Highlight text={row.text} query={q} />
              </span>
              {open ? (
                <ChevronUp size={18} strokeWidth={1.9} aria-hidden="true" className="mt-0.5 shrink-0 text-ink-600" />
              ) : (
                <ChevronDown size={18} strokeWidth={1.9} aria-hidden="true" className="mt-0.5 shrink-0 text-ink-600" />
              )}
              <span className="sr-only">{open ? 'Variantlarni yopish' : "Variantlarni ko'rish"}</span>
            </button>
            {(row.image_url || row.in_use) && (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {row.image_url && (
                  <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-ink-600">
                    Rasmli <ImageIcon size={14} strokeWidth={1.9} aria-hidden="true" />
                  </span>
                )}
                {row.in_use && (
                  <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-warning">
                    Testda ishlatilgan <Lock size={14} strokeWidth={1.9} aria-hidden="true" />
                  </span>
                )}
              </div>
            )}
            {open && <OptionsPreview options={row.options} query={q} />}
          </div>
        )
      },
    },
    {
      key: 'set_name',
      header: "To'plam",
      render: (row) => {
        const { category, short } = splitSetName(row.set_name)
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-[12px] font-bold text-brand-ink-strong uppercase">{category}</span>
            <span className="text-ink-600">{short}</span>
          </div>
        )
      },
    },
    {
      key: 'source',
      header: 'Manba',
      render: (row) =>
        row.source === 'api' ? <StatusBadge tone="info">API</StatusBadge> : <StatusBadge tone="neutral">O'zimizda</StatusBadge>,
    },
    {
      key: 'is_active',
      header: 'Holat',
      render: (row) =>
        row.is_active ? <StatusBadge tone="success">Faol</StatusBadge> : <StatusBadge tone="neutral">Nofaol</StatusBadge>,
    },
    {
      key: 'actions',
      header: <span className="sr-only">Amallar</span>,
      align: 'right',
      render: (row) => (
        <Button
          variant="secondary"
          size="xs"
          icon={PenLine}
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
            <Button variant="secondary" size="md" icon={FileDown} loading={exporting} disabled={!data?.count} onClick={handleExport}>
              Excel'ga yuklab olish
            </Button>
            <Button variant="secondary" size="md" icon={RotateCw} onClick={() => setDialog('sync')}>
              API'dan yangilash
            </Button>
            <Button variant="secondary" size="md" icon={Upload} onClick={() => setDialog('import')}>
              Excel/Word import
            </Button>
            <Button size="md" icon={Plus} onClick={() => setEditing(NEW_QUESTION)}>
              Yangi savol
            </Button>
          </>
        }
      />

      {exportError && <Alert tone="error">{exportError}</Alert>}

      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-3">
          <FilterSearch
            label="Savol yoki variant matni bo'yicha qidirish"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <FilterSelect aria-label="Bo'lim" className="flex-[1_1_180px]" value={filters.category} onChange={setFilter('category')}>
            <option value="">Barcha bo'limlar</option>
            {groupedSets.map(([category, list]) => (
              <option key={category} value={category}>
                {category} ({list.length})
              </option>
            ))}
          </FilterSelect>
          <FilterSelect aria-label="Savol to'plami" className="flex-[2_1_260px]" value={filters.set} onChange={setFilter('set')}>
            <option value="">{filters.category ? `${filters.category}: barcha to'plamlar` : "Barcha to'plamlar"}</option>
            {setsInCategory
              ? setsInCategory.map((set) => (
                  <option key={set.id} value={set.id}>
                    {splitSetName(set.name).short} ({formatCount(set.total_count)})
                  </option>
                ))
              : groupedSets.map(([category, list]) => (
                  <optgroup key={category} label={category}>
                    {list.map((set) => (
                      <option key={set.id} value={set.id}>
                        {splitSetName(set.name).short} ({formatCount(set.total_count)})
                      </option>
                    ))}
                  </optgroup>
                ))}
          </FilterSelect>
        </div>

        <div className="flex flex-wrap gap-3">
          <FilterSelect aria-label="Holat" className="flex-[1_1_150px]" value={filters.isActive} onChange={setFilter('isActive')}>
            <option value="">Barcha holatlar</option>
            <option value="true">Faol</option>
            <option value="false">Nofaol</option>
          </FilterSelect>
          <FilterSelect aria-label="Manba" className="flex-[1_1_150px]" value={filters.source} onChange={setFilter('source')}>
            <option value="">Barcha manbalar</option>
            <option value="local">O'zimizda</option>
            <option value="api">API</option>
          </FilterSelect>
          <FilterSelect aria-label="Rasm" className="flex-[1_1_150px]" value={filters.hasImage} onChange={setFilter('hasImage')}>
            <option value="">Rasmli va rasmsiz</option>
            <option value="true">Faqat rasmli</option>
            <option value="false">Faqat rasmsiz</option>
          </FilterSelect>
          <FilterSelect aria-label="Testda ishlatilganmi" className="flex-[1_1_190px]" value={filters.inUse} onChange={setFilter('inUse')}>
            <option value="">Ishlatilgan va ishlatilmagan</option>
            <option value="true">Testda ishlatilgan</option>
            <option value="false">Hali ishlatilmagan</option>
          </FilterSelect>
          <FilterSelect aria-label="Saralash" className="flex-[1_1_170px]" value={filters.ordering || 'new'} onChange={(event) => update({ [FILTER_KEYS.ordering]: event.target.value === 'new' ? '' : event.target.value })}>
            {Object.entries(ORDERINGS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect aria-label="Sahifadagi savollar soni" className="flex-[0_1_130px]" value={String(data?.page_size ?? (filters.pageSize || 50))} onChange={(event) => update({ [FILTER_KEYS.pageSize]: event.target.value === '50' ? '' : event.target.value })}>
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size} tadan
              </option>
            ))}
          </FilterSelect>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-ink-600">
          <span role="status">
            {data ? `${formatCount(data.count)} ta savol topildi` : ' '}
          </span>
          <div className="flex flex-wrap gap-2">
            {rows.length > 0 && (
              <Button
                variant="secondary"
                size="xs"
                icon={allExpanded ? ChevronUp : ChevronDown}
                onClick={() => setExpanded(allExpanded ? new Set() : new Set(pageIds))}
              >
                {allExpanded ? 'Variantlarni yopish' : "Barcha variantlarni ko'rish"}
              </Button>
            )}
            {hasFilters && (
              <Button variant="secondary" size="xs" icon={FilterX} onClick={clearFilters}>
                Filtrlarni tozalash
              </Button>
            )}
          </div>
        </div>

        {bulkResult && (
          <div className="flex flex-col gap-2">
            <Alert tone={bulkResult.skipped.length ? 'info' : 'success'}>
              {formatCount(bulkResult.done)} ta savol bilan amal bajarildi.
              {bulkResult.skipped.length > 0 &&
                ` ${bulkResult.skipped.length} tasi o'tkazib yuborildi: ${[...new Set(bulkResult.skipped.map((item) => item.reason.toLowerCase()))].join(', ')} (№ ${bulkResult.skipped
                  .slice(0, 10)
                  .map((item) => item.id)
                  .join(', ')}${bulkResult.skipped.length > 10 ? '…' : ''}).`}
            </Alert>
            <div>
              <Button variant="secondary" size="xs" icon={X} onClick={() => setBulkResult(null)}>
                Yopish
              </Button>
            </div>
          </div>
        )}

        {selected.size > 0 && (
          <div
            role="region"
            aria-label="Tanlangan savollar bilan amallar"
            className="sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-brand-500 bg-brand-soft p-3 shadow-raised"
          >
            <span className="mr-auto font-bold text-brand-ink-strong">{formatCount(selected.size)} ta savol tanlandi</span>
            <Button variant="secondary" size="xs" icon={CircleCheck} onClick={() => runBulk('activate')}>
              Faol qilish
            </Button>
            <Button variant="secondary" size="xs" icon={CircleOff} onClick={() => runBulk('deactivate')}>
              Nofaol qilish
            </Button>
            <Button variant="secondary" size="xs" icon={FolderInput} onClick={() => setDialog('move')}>
              Ko'chirish
            </Button>
            <Button variant="dangerOutline" size="xs" icon={Trash} onClick={() => setDialog('delete')}>
              O'chirish
            </Button>
            <Button variant="secondary" size="xs" icon={X} onClick={() => setSelected(new Set())}>
              Tanlovni bekor qilish
            </Button>
          </div>
        )}

        <DataTable
          columns={columns}
          rows={rows}
          loading={loading && !data}
          error={error}
          onRetry={reload}
          minWidth={900}
          rowClassName={(row) => (selected.has(row.id) ? 'bg-brand-soft/50' : '')}
          empty={{
            icon: FileSearch,
            title: 'Savol topilmadi',
            description: "Qidiruv matnini yoki filtrlarni o'zgartiring.",
            action: hasFilters && (
              <Button variant="secondary" size="xs" icon={FilterX} onClick={clearFilters}>
                Filtrlarni tozalash
              </Button>
            ),
          }}
        />

        {data && !error && (
          <Pagination
            page={pageNumber}
            pageSize={data.page_size}
            count={data.count}
            onPageChange={(next) => update({ sahifa: next > 1 ? String(next) : '' }, { keepPage: true })}
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

      {dialog === 'move' && (
        <MoveModal
          count={selected.size}
          sets={sets ?? []}
          onClose={() => setDialog(null)}
          onConfirm={(target) => runBulk('move', target)}
        />
      )}

      {dialog === 'delete' && (
        <ConfirmModal
          title="Savollarni o'chirish"
          confirmLabel="O'chirish"
          onConfirm={() => runBulk('delete')}
          onClose={() => setDialog(null)}
        >
          <p className="m-0">
            Tanlangan <strong>{formatCount(selected.size)} ta</strong> savol butunlay o'chiriladi. Testda ishlatilgan
            savollar o'chirilmaydi — ularni "Nofaol qilish" mumkin.
          </p>
        </ConfirmModal>
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
