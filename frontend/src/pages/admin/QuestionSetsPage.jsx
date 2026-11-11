import {
  CircleAlert,
  FileDown,
  FilterX,
  LayoutGrid,
  Layers,
  List,
  ListChecks,
  Loader2,
  PenLine,
  Plus,
  RotateCw,
  SearchX,
  Upload,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { downloadImportTemplate, useQuestionSets } from '../../api/bank.js'
import { errorMessage } from '../../api/client.js'
import AttachGroupsModal from '../../components/admin/bank/AttachGroupsModal.jsx'
import ImportModal from '../../components/admin/bank/ImportModal.jsx'
import QuestionSetModal from '../../components/admin/bank/QuestionSetModal.jsx'
import Alert from '../../components/ui/Alert.jsx'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import { FilterSearch, FilterSelect } from '../../components/ui/FilterControl.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import { formatCount } from '../../lib/format.js'
import { OTHER_CATEGORY, splitSetName } from '../../lib/setCategory.js'

const RECOMMENDED_FACTOR = 3
const OTHER = OTHER_CATEGORY
const splitName = splitSetName

function bankLevel(set) {
  if (set.active_count < set.question_count) return 'empty'
  if (set.active_count < set.question_count * RECOMMENDED_FACTOR) return 'low'
  return 'ok'
}

const STATUS_FILTERS = {
  '': "Barcha holatlar",
  attached: 'Guruhga biriktirilgan',
  free: 'Biriktirilmagan',
  attention: "E'tibor talab (savol kam)",
}

const SORTS = {
  name: 'Nomi bo‘yicha (A–Z)',
  most: "Savollar ko'p → kam",
  fewest: "Savollar kam → ko'p",
  newest: "Yangi qo'shilganlar",
}

const compareName = (a, b) => a.name.localeCompare(b.name, 'uz')
const SORTERS = {
  name: compareName,
  most: (a, b) => b.active_count - a.active_count || compareName(a, b),
  fewest: (a, b) => a.active_count - b.active_count || compareName(a, b),
  newest: (a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '') || compareName(a, b),
}

function matches(set, { q, category, status }) {
  if (category && splitName(set.name).category !== category) return false
  if (status === 'attached' && set.groups.length === 0) return false
  if (status === 'free' && set.groups.length > 0) return false
  if (status === 'attention' && bankLevel(set) === 'ok') return false
  if (q) {
    const haystack = `${set.name} ${set.description ?? ''} ${set.groups.join(' ')}`.toLocaleLowerCase('uz')
    if (!q.split(/\s+/).every((word) => haystack.includes(word))) return false
  }
  return true
}

// ---------------------------------------------------------------- kichik bloklar

function SummaryTile({ label, value, hint, tone = 'neutral', onClick, active = false }) {
  const tones = {
    neutral: 'text-ink-900',
    warning: 'text-warning',
    success: 'text-success',
  }
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-pressed={onClick ? active : undefined}
      className={`flex flex-col gap-1 rounded-2xl border bg-surface-card p-4 text-left ${
        active ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-border-200'
      } ${onClick ? 'cursor-pointer hover:bg-surface-muted' : ''}`}
    >
      <span className="text-[13px] font-semibold text-ink-600">{label}</span>
      <span className={`text-[28px] leading-9 font-extrabold tabular-nums ${tones[tone]}`}>{value}</span>
      {hint && <span className="text-[13px] text-ink-600">{hint}</span>}
    </Tag>
  )
}

function Metric({ label, value }) {
  return (
    <div className="rounded-xl bg-surface-muted p-2.5">
      <div className="text-[12px] font-semibold text-ink-600">{label}</div>
      <div className="text-[17px] font-bold tabular-nums">{value}</div>
    </div>
  )
}

function BankStatus({ set }) {
  const level = bankLevel(set)
  const recommended = set.question_count * RECOMMENDED_FACTOR
  const view = {
    ok: { className: 'bg-success-soft text-success', text: 'Har bir tinglovchiga alohida variant tuzish uchun yetarli.' },
    low: {
      className: 'bg-warning-soft text-warning',
      text: `Kam: kamida ${recommended} ta tavsiya etiladi, aks holda variantlar ko'p takrorlanadi.`,
    },
    empty: {
      className: 'bg-error-soft text-error',
      text: `Test tuzib bo'lmaydi: kamida ${set.question_count} ta faol savol kerak.`,
    },
  }[level]
  const inactive = set.total_count - set.active_count

  return (
    <div className={`flex flex-col gap-0.5 rounded-xl p-3 text-[13px] leading-[19px] ${view.className}`}>
      <span className="font-bold">
        Bankda {formatCount(set.active_count)} ta faol savol
        {inactive > 0 && <span className="font-semibold"> · {formatCount(inactive)} ta nofaol</span>}
      </span>
      <span>{view.text}</span>
    </div>
  )
}

function GroupChips({ set, onAttach }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {set.groups.map((group) => (
        <span
          key={group}
          className="rounded-full bg-brand-soft px-2.5 py-1 text-[13px] font-semibold text-brand-ink-strong"
        >
          {group}
        </span>
      ))}
      <button
        type="button"
        aria-label={`${set.name} — guruh biriktirish`}
        onClick={onAttach}
        className="relative inline-flex h-7 cursor-pointer items-center gap-1 rounded-full border border-dashed border-border-400 bg-surface-card px-2.5 text-[13px] font-semibold text-ink-600 after:absolute after:-inset-2 after:content-[''] hover:bg-surface-muted"
      >
        Guruh biriktirish
        <Plus size={14} strokeWidth={1.9} aria-hidden="true" />
      </button>
    </div>
  )
}

const questionsLink = (set) => `/admin/savollar?set=${set.id}`

function SetCard({ set, showCategory, onEdit, onImport, onAttach }) {
  const { category, short } = splitName(set.name)

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          {showCategory && category !== OTHER && (
            <span className="text-[12px] font-bold tracking-wide text-brand-ink-strong uppercase">{category}</span>
          )}
          <h2 className="m-0 text-[17px] leading-6 font-semibold break-words" title={set.name}>
            {showCategory ? short : set.name}
          </h2>
        </div>
        <Button
          variant="secondary"
          size="xs"
          icon={PenLine}
          aria-label={`${set.name} — tahrirlash`}
          className="shrink-0"
          onClick={onEdit}
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Metric label="Testda" value={`${set.question_count} savol`} />
        <Metric label="Vaqt" value={`${set.duration_minutes} daq`} />
        <Metric label="Chegara" value={`${set.pass_score} ta`} />
      </div>

      <BankStatus set={set} />

      <div className="flex flex-wrap gap-2">
        <Link
          to={questionsLink(set)}
          className="relative inline-flex h-9 items-center gap-1.5 rounded-xl border border-border-400 bg-surface-card px-3 text-[13px] font-bold text-ink-900 after:absolute after:-inset-1 after:content-[''] hover:bg-surface-muted"
        >
          Savollar
          <ListChecks size={16} strokeWidth={1.9} aria-hidden="true" />
        </Link>
        <Button variant="secondary" size="xs" icon={Upload} aria-label={`${set.name} — Excel import`} onClick={onImport}>
          Excel import
        </Button>
      </div>

      <div className="mt-auto flex flex-col gap-2">
        <div className="text-[13px] font-semibold text-ink-600">
          Biriktirilgan guruhlar {set.groups.length > 0 && `(${set.groups.length})`}
        </div>
        <GroupChips set={set} onAttach={onAttach} />
      </div>
    </Card>
  )
}

const GRID = 'grid grid-cols-[repeat(auto-fill,minmax(min(320px,100%),1fr))] gap-4'

function ViewToggle({ value, onChange }) {
  const options = [
    { key: 'grid', label: 'Kartochkalar', icon: LayoutGrid },
    { key: 'list', label: 'Jadval', icon: List },
  ]
  return (
    <div role="group" aria-label="Ko'rinish" className="flex h-11 shrink-0 rounded-xl border border-border-400 bg-surface-card p-1">
      {options.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          aria-pressed={value === key}
          aria-label={label}
          title={label}
          onClick={() => onChange(key)}
          className={`flex w-10 cursor-pointer items-center justify-center rounded-lg ${
            value === key ? 'bg-brand-soft text-brand-ink-strong' : 'text-ink-600 hover:bg-surface-muted'
          }`}
        >
          <Icon size={18} strokeWidth={1.9} aria-hidden="true" />
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------- sahifa

export default function QuestionSetsPage({ page }) {
  const { data: sets, loading, error, reload } = useQuestionSets()
  const [params, setParams] = useSearchParams()
  // undefined: oyna yopiq, null: yangi to'plam, obyekt: tahrirlash
  const [editing, setEditing] = useState(undefined)
  // undefined: yopiq, null: umumiy import (to'plam tanlanadi), obyekt: shu to'plamga
  const [importing, setImporting] = useState(undefined)
  const [attaching, setAttaching] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const [templateError, setTemplateError] = useState(null)

  const search = params.get('q') ?? ''
  const category = params.get('bolim') ?? ''
  const status = params.get('holat') ?? ''
  const sort = SORTS[params.get('tartib')] ? params.get('tartib') : 'name'
  const view = params.get('korinish') === 'list' ? 'list' : 'grid'

  const setParam = (name, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(name, value)
    else next.delete(name)
    setParams(next, { replace: true })
  }

  const q = search.trim().toLocaleLowerCase('uz')
  const hasFilters = Boolean(q || category || status)

  const categories = useMemo(() => {
    const counts = new Map()
    for (const set of sets ?? []) {
      const key = splitName(set.name).category
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return [...counts.entries()].sort(([a], [b]) => (a === OTHER) - (b === OTHER) || a.localeCompare(b, 'uz'))
  }, [sets])

  const stats = useMemo(() => {
    const list = sets ?? []
    return {
      sets: list.length,
      questions: list.reduce((sum, set) => sum + set.active_count, 0),
      attached: list.filter((set) => set.groups.length > 0).length,
      attention: list.filter((set) => bankLevel(set) !== 'ok').length,
    }
  }, [sets])

  const visible = useMemo(
    () => (sets ?? []).filter((set) => matches(set, { q, category, status })).sort(SORTERS[sort]),
    [sets, q, category, status, sort],
  )

  // Nomi bo'yicha saralanganda bo'limlarga ajratiladi.
  const sections = useMemo(() => {
    if (sort !== 'name' || category) return [{ key: '', sets: visible }]
    const map = new Map()
    for (const set of visible) {
      const key = splitName(set.name).category
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(set)
    }
    return [...map.entries()]
      .sort(([a], [b]) => (a === OTHER) - (b === OTHER) || a.localeCompare(b, 'uz'))
      .map(([key, list]) => ({ key, sets: list }))
  }, [visible, sort, category])
  const grouped = sections.length > 1 || sections[0]?.key !== ''

  const handleTemplate = async () => {
    setDownloading(true)
    setTemplateError(null)
    try {
      await downloadImportTemplate('xlsx')
    } catch (failure) {
      setTemplateError(errorMessage(failure))
    } finally {
      setDownloading(false)
    }
  }

  const handleSaved = () => {
    setEditing(undefined)
    reload()
  }

  const clearFilters = () => {
    const next = new URLSearchParams(params)
    for (const key of ['q', 'bolim', 'holat']) next.delete(key)
    setParams(next, { replace: true })
  }

  const columns = [
    {
      key: 'name',
      header: "To'plam",
      render: (set) => {
        const { category: cat, short } = splitName(set.name)
        return (
          <div className="flex flex-col gap-0.5">
            {cat !== OTHER && <span className="text-[12px] font-bold text-brand-ink-strong uppercase">{cat}</span>}
            <span className="font-semibold">{short}</span>
          </div>
        )
      },
    },
    {
      key: 'bank',
      header: 'Faol savollar',
      render: (set) => {
        const level = bankLevel(set)
        return (
          <StatusBadge tone={level === 'ok' ? 'success' : level === 'low' ? 'warning' : 'error'}>
            {formatCount(set.active_count)}
          </StatusBadge>
        )
      },
    },
    {
      key: 'params',
      header: 'Test',
      render: (set) => (
        <span className="text-ink-600 tabular-nums">
          {set.question_count} savol · {set.duration_minutes} daq · {set.pass_score} ta
        </span>
      ),
    },
    {
      key: 'groups',
      header: 'Guruhlar',
      render: (set) =>
        set.groups.length ? (
          <span className="font-semibold">{set.groups.join(', ')}</span>
        ) : (
          <span className="text-ink-400">—</span>
        ),
    },
    {
      key: 'actions',
      header: <span className="sr-only">Amallar</span>,
      align: 'right',
      render: (set) => (
        <div className="flex justify-end gap-2">
          <Link
            to={questionsLink(set)}
            aria-label={`${set.name} — savollar`}
            title="Savollar"
            className="inline-flex size-9 items-center justify-center rounded-xl border border-border-400 bg-surface-card text-ink-600 hover:bg-surface-muted"
          >
            <ListChecks size={16} strokeWidth={1.9} aria-hidden="true" />
          </Link>
          <Button variant="secondary" size="xs" icon={Upload} aria-label={`${set.name} — Excel import`} onClick={() => setImporting(set)} />
          <Button variant="secondary" size="xs" icon={Plus} aria-label={`${set.name} — guruh biriktirish`} onClick={() => setAttaching(set)} />
          <Button variant="secondary" size="xs" icon={PenLine} aria-label={`${set.name} — tahrirlash`} onClick={() => setEditing(set)} />
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
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="md" icon={FileDown} loading={downloading} onClick={handleTemplate}>
              Excel shablon
            </Button>
            <Button variant="secondary" size="md" icon={Upload} disabled={!sets?.length} onClick={() => setImporting(null)}>
              Excel import
            </Button>
            <Button size="md" icon={Plus} onClick={() => setEditing(null)}>
              Yangi to'plam
            </Button>
          </div>
        }
      />

      {templateError && <Alert tone="error">{templateError}</Alert>}

      {loading && !sets && (
        <Card>
          <EmptyState icon={Loader2} spin title="Yuklanmoqda" />
        </Card>
      )}

      {error && !sets && (
        <Card>
          <EmptyState
            icon={CircleAlert}
            tone="error"
            title="Yuklab bo'lmadi"
            description={error}
            action={
              <Button variant="secondary" size="xs" icon={RotateCw} onClick={reload}>
                Qayta urinish
              </Button>
            }
          />
        </Card>
      )}

      {sets?.length === 0 && (
        <Card>
          <EmptyState icon={Layers} title="To'plamlar yo'q" description="Birinchi savol to'plamini yarating." />
        </Card>
      )}

      {sets?.length > 0 && (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-4">
            <SummaryTile label="To'plamlar" value={formatCount(stats.sets)} hint={`${categories.length} ta bo'lim`} />
            <SummaryTile label="Faol savollar" value={formatCount(stats.questions)} hint="barcha to'plamlarda" />
            <SummaryTile
              label="Guruhga biriktirilgan"
              value={formatCount(stats.attached)}
              hint={`${stats.sets - stats.attached} tasi bo'sh turibdi`}
              tone="success"
              active={status === 'attached'}
              onClick={() => setParam('holat', status === 'attached' ? '' : 'attached')}
            />
            <SummaryTile
              label="E'tibor talab"
              value={formatCount(stats.attention)}
              hint="savollari kam yoki yetmaydi"
              tone={stats.attention ? 'warning' : 'neutral'}
              active={status === 'attention'}
              onClick={() => setParam('holat', status === 'attention' ? '' : 'attention')}
            />
          </div>

          <Card className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <FilterSearch
                label="To'plam yoki guruh nomi bo'yicha qidirish"
                value={search}
                onChange={(event) => setParam('q', event.target.value)}
              />
              <FilterSelect aria-label="Bo'lim" value={category} onChange={(event) => setParam('bolim', event.target.value)}>
                <option value="">Barcha bo'limlar</option>
                {categories.map(([key, count]) => (
                  <option key={key} value={key}>
                    {key} ({count})
                  </option>
                ))}
              </FilterSelect>
              <FilterSelect aria-label="Holat" value={status} onChange={(event) => setParam('holat', event.target.value)}>
                {Object.entries(STATUS_FILTERS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </FilterSelect>
              <FilterSelect aria-label="Saralash" value={sort} onChange={(event) => setParam('tartib', event.target.value === 'name' ? '' : event.target.value)}>
                {Object.entries(SORTS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </FilterSelect>
              <ViewToggle value={view} onChange={(next) => setParam('korinish', next === 'grid' ? '' : next)} />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-pressed={!category}
                onClick={() => setParam('bolim', '')}
                className={`relative h-8 cursor-pointer rounded-full border px-3 after:absolute after:-inset-1.5 after:content-[''] text-[13px] font-semibold ${
                  !category ? 'border-brand-500 bg-brand-soft text-brand-ink-strong' : 'border-border-200 text-ink-600 hover:bg-surface-muted'
                }`}
              >
                Hammasi · {stats.sets}
              </button>
              {categories.map(([key, count]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={category === key}
                  onClick={() => setParam('bolim', category === key ? '' : key)}
                  className={`relative h-8 cursor-pointer rounded-full border px-3 after:absolute after:-inset-1.5 after:content-[''] text-[13px] font-semibold ${
                    category === key
                      ? 'border-brand-500 bg-brand-soft text-brand-ink-strong'
                      : 'border-border-200 text-ink-600 hover:bg-surface-muted'
                  }`}
                >
                  {key} · {count}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-ink-600">
              <span role="status">
                {hasFilters
                  ? `${visible.length} ta to'plam topildi (jami ${stats.sets})`
                  : `Jami ${stats.sets} ta to'plam`}
              </span>
              {hasFilters && (
                <Button variant="secondary" size="xs" icon={FilterX} onClick={clearFilters}>
                  Filtrlarni tozalash
                </Button>
              )}
            </div>
          </Card>

          {visible.length === 0 && (
            <Card>
              <EmptyState
                icon={SearchX}
                title="Hech narsa topilmadi"
                description="Qidiruv so'zini yoki filtrlarni o'zgartirib ko'ring."
                action={
                  <Button variant="secondary" size="xs" icon={FilterX} onClick={clearFilters}>
                    Filtrlarni tozalash
                  </Button>
                }
              />
            </Card>
          )}

          {visible.length > 0 && view === 'list' && (
            <Card>
              <DataTable compact columns={columns} rows={visible} minWidth={900} />
            </Card>
          )}

          {visible.length > 0 &&
            view === 'grid' &&
            sections.map((section) => (
              <section key={section.key || 'all'} className="flex flex-col gap-3" aria-label={section.key || undefined}>
                {grouped && (
                  <h2 className="m-0 flex items-center gap-2 text-[15px] font-bold text-ink-600">
                    {section.key}
                    <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[13px]">{section.sets.length}</span>
                  </h2>
                )}
                <div className={GRID}>
                  {section.sets.map((set) => (
                    <SetCard
                      key={set.id}
                      set={set}
                      showCategory={!grouped}
                      onEdit={() => setEditing(set)}
                      onImport={() => setImporting(set)}
                      onAttach={() => setAttaching(set)}
                    />
                  ))}
                </div>
              </section>
            ))}
        </>
      )}

      {importing !== undefined && (
        <ImportModal
          open
          sets={sets ?? []}
          defaultSet={importing?.id}
          onClose={() => setImporting(undefined)}
          onImported={reload}
        />
      )}

      {attaching && (
        <AttachGroupsModal set={attaching} onClose={() => setAttaching(null)} onChanged={reload} />
      )}

      {editing !== undefined && (
        <QuestionSetModal set={editing} onClose={() => setEditing(undefined)} onSaved={handleSaved} />
      )}
    </>
  )
}
