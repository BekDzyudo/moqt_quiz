import { CircleAlert, Layers, Loader2, PenLine, Plus, RotateCw, Upload } from 'lucide-react'
import { useState } from 'react'
import { useQuestionSets } from '../../api/bank.js'
import AttachGroupsModal from '../../components/admin/bank/AttachGroupsModal.jsx'
import ImportModal from '../../components/admin/bank/ImportModal.jsx'
import QuestionSetModal from '../../components/admin/bank/QuestionSetModal.jsx'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import { formatCount } from '../../lib/format.js'

const RECOMMENDED_FACTOR = 3

function Metric({ label, value }) {
  return (
    <div className="rounded-xl bg-surface-muted p-2.5">
      <div className="text-[12px] font-semibold text-ink-600">{label}</div>
      <div className="text-[17px] font-bold">{value}</div>
    </div>
  )
}

function BankStatus({ set }) {
  const recommended = set.question_count * RECOMMENDED_FACTOR
  const enough = set.active_count >= recommended

  return (
    <div
      className={`flex flex-col gap-0.5 rounded-xl p-3 text-[13px] leading-[19px] ${
        enough ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning'
      }`}
    >
      <span className="font-bold">Bankda {formatCount(set.active_count)} ta faol savol</span>
      <span>
        {enough
          ? 'Har bir tinglovchiga alohida variant tuzish uchun yetarli.'
          : `Kam: kamida ${recommended} ta tavsiya etiladi, aks holda variantlar ko'p takrorlanadi.`}
      </span>
    </div>
  )
}

function SetCard({ set, onEdit, onImport, onAttach }) {
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <h2 className="m-0 text-[17px] leading-6 font-semibold">{set.name}</h2>
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

      <Button
        variant="secondary"
        size="xs"
        icon={Upload}
        aria-label={`${set.name} — Excel import`}
        className="self-start"
        onClick={onImport}
      >
        Excel import
      </Button>

      <div className="flex flex-col gap-2">
        <div className="text-[13px] font-semibold text-ink-600">Biriktirilgan guruhlar</div>
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
      </div>
    </Card>
  )
}

export default function QuestionSetsPage({ page }) {
  const { data: sets, loading, error, reload } = useQuestionSets()
  // undefined: oyna yopiq, null: yangi to'plam, obyekt: tahrirlash
  const [editing, setEditing] = useState(undefined)
  const [importing, setImporting] = useState(null)
  const [attaching, setAttaching] = useState(null)

  const handleSaved = () => {
    setEditing(undefined)
    reload()
  }

  return (
    <>
      <PageHeader
        icon={page.icon}
        title={page.label}
        description={page.description}
        actions={
          <Button size="md" icon={Plus} onClick={() => setEditing(null)}>
            Yangi to'plam
          </Button>
        }
      />

      {loading && !sets && (
        <Card>
          <EmptyState icon={Loader2} spin title="Yuklanmoqda" />
        </Card>
      )}

      {error && (
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
          <EmptyState
            icon={Layers}
            title="To'plamlar yo'q"
            description="Birinchi savol to'plamini yarating."
          />
        </Card>
      )}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(340px,100%),1fr))] gap-4">
        {sets?.map((set) => (
          <SetCard
            key={set.id}
            set={set}
            onEdit={() => setEditing(set)}
            onImport={() => setImporting(set)}
            onAttach={() => setAttaching(set)}
          />
        ))}
      </div>

      {importing && (
        <ImportModal
          open
          sets={sets ?? []}
          defaultSet={importing.id}
          onClose={() => setImporting(null)}
          onImported={reload}
        />
      )}

      {attaching && (
        <AttachGroupsModal
          set={attaching}
          onClose={() => setAttaching(null)}
          onChanged={reload}
        />
      )}

      {editing !== undefined && (
        <QuestionSetModal
          set={editing}
          onClose={() => setEditing(undefined)}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}
