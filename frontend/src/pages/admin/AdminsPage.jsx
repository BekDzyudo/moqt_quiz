import { Pencil, Plus, UserRound } from 'lucide-react'
import { useState } from 'react'
import { useAdmins } from '../../api/admins.js'
import AddAdminModal from '../../components/admin/AddAdminModal.jsx'
import DeleteAdminModal from '../../components/admin/DeleteAdminModal.jsx'
import EditAdminForm from '../../components/admin/EditAdminForm.jsx'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'

export default function AdminsPage({ page }) {
  const { data: admins, loading, error, reload } = useAdmins()
  const [selectedId, setSelectedId] = useState(null)
  const [adding, setAdding] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const selected = admins?.find((admin) => admin.id === selectedId)

  const columns = [
    {
      key: 'full_name',
      header: 'F.I.Sh.',
      render: (admin) => <span className="font-semibold">{admin.full_name}</span>,
    },
    {
      key: 'username',
      header: 'Login',
      render: (admin) => <span className="font-mono text-[13px]">{admin.username}</span>,
    },
    {
      key: 'organization',
      header: 'Tashkilot',
      render: (admin) => <span className="text-ink-600">{admin.organization}</span>,
    },
    {
      key: 'is_active',
      header: 'Holat',
      render: (admin) =>
        admin.is_active ? (
          <StatusBadge tone="success">Faol</StatusBadge>
        ) : (
          <StatusBadge tone="error">Bloklangan</StatusBadge>
        ),
    },
    {
      key: 'actions',
      header: <span className="sr-only">Amallar</span>,
      align: 'right',
      render: (admin) => (
        <Button
          variant="secondary"
          size="sm"
          icon={Pencil}
          aria-label={`${admin.full_name} — tahrirlash`}
          onClick={() => setSelectedId(admin.id)}
        />
      ),
    },
  ]

  const handleCreated = (admin) => {
    setAdding(false)
    setSelectedId(admin.id)
    reload()
  }

  const handleDeleted = () => {
    setDeleting(false)
    setSelectedId(null)
    reload()
  }

  return (
    <>
      <PageHeader
        icon={page.icon}
        title={page.label}
        description={page.description}
        actions={
          <Button size="sm" icon={Plus} onClick={() => setAdding(true)}>
            Admin qo'shish
          </Button>
        }
      />

      <div className="flex flex-wrap items-start gap-6">
        <Card className="min-w-0 flex-[3_1_560px]">
          <DataTable
            columns={columns}
            rows={admins ?? []}
            loading={loading && !admins}
            error={error}
            onRetry={reload}
            minWidth={620}
            rowClassName={(admin) => (admin.id === selectedId ? 'bg-brand-soft' : '')}
            empty={{
              icon: UserRound,
              title: "Adminlar yo'q",
              description: 'Birinchi adminni qo\'shing.',
            }}
          />
        </Card>

        {selected ? (
          <EditAdminForm
            key={selected.id}
            admin={selected}
            onSaved={reload}
            onDelete={() => setDeleting(true)}
          />
        ) : (
          <Card className="min-w-0 flex-[2_1_340px]">
            <EmptyState
              icon={Pencil}
              title="Admin tanlanmagan"
              description="Tahrirlash uchun jadvaldagi qalam tugmasini bosing."
            />
          </Card>
        )}
      </div>

      <AddAdminModal open={adding} onClose={() => setAdding(false)} onCreated={handleCreated} />

      {deleting && selected && (
        <DeleteAdminModal
          admin={selected}
          onClose={() => setDeleting(false)}
          onDeleted={handleDeleted}
        />
      )}
    </>
  )
}
