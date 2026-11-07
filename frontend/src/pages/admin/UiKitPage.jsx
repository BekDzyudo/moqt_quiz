import { Blocks, Plus, Save, SlidersHorizontal, Trash, X } from 'lucide-react'
import { useState } from 'react'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import DataTable from '../../components/ui/DataTable.jsx'
import Drawer from '../../components/ui/Drawer.jsx'
import Field from '../../components/ui/Field.jsx'
import Modal from '../../components/ui/Modal.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'

const columns = [
  { key: 'name', header: 'Guruh' },
  { key: 'status', header: 'Holat', render: (row) => row.status },
]

const rows = [
  { id: 1, name: '2026-11-AKT-01', status: <StatusBadge tone="success">Ochiq</StatusBadge> },
  { id: 2, name: '2026-11-IQT-03', status: <StatusBadge tone="neutral">Yopiq</StatusBadge> },
]

// Faqat dev rejimida ochiladi: /admin/ui
export default function UiKitPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      <PageHeader
        icon={Blocks}
        title="UI komponentlar"
        description="0-bosqich komponentlarini ko'zdan kechirish uchun"
        actions={
          <Button icon={Plus} onClick={() => setModalOpen(true)}>
            Modal
          </Button>
        }
      />

      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button icon={Save}>Saqlash</Button>
          <Button variant="secondary" icon={X}>
            Bekor qilish
          </Button>
          <Button variant="danger" icon={Trash}>
            O'chirish
          </Button>
          <Button variant="ghost" icon={SlidersHorizontal} onClick={() => setDrawerOpen(true)}>
            Drawer
          </Button>
          <Button icon={Save} loading>
            Saqlanmoqda
          </Button>
          <Button icon={Save} disabled>
            Nofaol
          </Button>
        </div>
        <div className="flex flex-wrap gap-3">
          <StatusBadge tone="success">O'tdi</StatusBadge>
          <StatusBadge tone="warning">Belgilangan</StatusBadge>
          <StatusBadge tone="error">Shubhali</StatusBadge>
          <StatusBadge tone="info">Yangi</StatusBadge>
          <StatusBadge tone="neutral">Yopiq</StatusBadge>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Oddiy maydon" placeholder="Matn kiriting" hint="Yordamchi izoh" />
          <Field label="Xatoli maydon" mono defaultValue="12345" error="PINFL 14 raqamdan iborat." />
        </div>
      </Card>

      <Card>
        <DataTable columns={columns} rows={rows} />
      </Card>
      <Card>
        <DataTable columns={columns} loading />
      </Card>
      <Card>
        <DataTable columns={columns} rows={[]} />
      </Card>
      <Card>
        <DataTable columns={columns} error="Ro'yxatni olib bo'lmadi." onRetry={() => {}} />
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Namuna oyna"
        footer={
          <>
            <Button variant="secondary" icon={X} onClick={() => setModalOpen(false)}>
              Bekor qilish
            </Button>
            <Button icon={Save} onClick={() => setModalOpen(false)}>
              Saqlash
            </Button>
          </>
        }
      >
        Tasdiqlash oynasi matni.
      </Modal>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Namuna drawer">
        <Field label="Savol matni" placeholder="Matn kiriting" />
      </Drawer>
    </>
  )
}
