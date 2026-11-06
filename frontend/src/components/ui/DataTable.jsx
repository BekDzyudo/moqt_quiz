import { CircleAlert, Inbox, Loader2, RefreshCw } from 'lucide-react'
import Button from './Button.jsx'
import EmptyState from './EmptyState.jsx'

// columns: [{ key, header, render?(row), align?: 'right' }]
export default function DataTable({
  columns,
  rows = [],
  rowKey = (row) => row.id,
  loading = false,
  error = null,
  onRetry,
  empty = { title: "Ma'lumot yo'q" },
  minWidth = 760,
  rowClassName = () => '',
}) {
  if (loading) return <EmptyState icon={Loader2} spin title="Yuklanmoqda" />

  if (error) {
    return (
      <EmptyState
        icon={CircleAlert}
        tone="error"
        title="Yuklab bo'lmadi"
        description={error}
        action={
          onRetry && (
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={onRetry}>
              Qayta urinish
            </Button>
          )
        }
      />
    )
  }

  if (rows.length === 0) {
    return <EmptyState icon={empty.icon ?? Inbox} title={empty.title} description={empty.description} action={empty.action} />
  }

  return (
    <div className="relative overflow-x-auto">
      <table className="w-full border-collapse text-[15px]" style={{ minWidth }}>
        <thead>
          <tr className="text-left text-[13px] text-ink-600">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={`border-b border-border-200 px-3 py-2.5 font-semibold ${
                  column.align === 'right' ? 'text-right' : ''
                }`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className={`border-b border-border-200 last:border-b-0 ${rowClassName(row)}`}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`px-3 py-3.5 ${column.align === 'right' ? 'text-right' : ''}`}
                >
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
