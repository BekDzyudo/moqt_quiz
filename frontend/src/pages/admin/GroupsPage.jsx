import { FileSearch, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuestionSets } from '../../api/bank.js'
import { useGroups } from '../../api/groups.js'
import GroupModal from '../../components/admin/groups/GroupModal.jsx'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import { FilterSearch, FilterSelect } from '../../components/ui/FilterControl.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import { GROUP_STATUS } from '../../lib/groupStatus.js'
import { useDebouncedValue } from '../../lib/useDebouncedValue.js'

const COLUMNS = [
  {
    key: 'name',
    header: 'Guruh',
    render: (group) => (
      <Link to={`/admin/guruhlar/${group.id}`} className="font-semibold">
        {group.name}
      </Link>
    ),
  },
  {
    key: 'organization',
    header: 'Tashkilot',
    render: (group) => <span className="text-ink-600">{group.organization}</span>,
  },
  { key: 'set_name', header: "Savol to'plami" },
  { key: 'member_count', header: "A'zolar" },
  { key: 'finished_count', header: 'Topshirgan' },
  {
    key: 'test_status',
    header: 'Test holati',
    render: ({ test_status: status }) => (
      <StatusBadge tone={GROUP_STATUS[status].tone}>{GROUP_STATUS[status].label}</StatusBadge>
    ),
  },
]

export default function GroupsPage({ page }) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()

  const q = useDebouncedValue(search.trim())
  const { data: groups, loading, error, reload } = useGroups({ q, status })
  const { data: sets } = useQuestionSets()

  const filtered = Boolean(q || status)

  return (
    <>
      <PageHeader
        icon={page.icon}
        title={page.label}
        description={page.description}
        actions={
          <Button size="md" icon={Plus} onClick={() => setCreating(true)}>
            Yangi guruh
          </Button>
        }
      />

      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-3">
          <FilterSearch
            label="Guruh nomi bo'yicha qidirish"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <FilterSelect
            aria-label="Test holati"
            className="flex-[1_1_180px]"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">Barcha holatlar</option>
            {Object.entries(GROUP_STATUS).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </FilterSelect>
        </div>

        <DataTable
          columns={COLUMNS}
          rows={groups ?? []}
          loading={loading && !groups}
          error={error}
          onRetry={reload}
          minWidth={900}
          empty={{
            icon: FileSearch,
            title: filtered ? 'Guruh topilmadi' : "Guruhlar yo'q",
            description: filtered
              ? "Qidiruv matnini yoki filtrni o'zgartiring."
              : 'Birinchi guruhni yarating.',
          }}
        />
      </Card>

      {creating && (
        <GroupModal
          sets={sets ?? []}
          onClose={() => setCreating(false)}
          onSaved={(group) => navigate(`/admin/guruhlar/${group.id}`)}
        />
      )}
    </>
  )
}
