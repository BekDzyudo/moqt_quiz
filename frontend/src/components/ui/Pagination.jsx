import { ChevronLeft, ChevronRight } from 'lucide-react'
import Button from './Button.jsx'

export default function Pagination({ page, pageSize, count, onPageChange }) {
  if (count === 0) return null

  const first = (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, count)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-[13px] text-ink-600">
      <span>
        {first}–{last} / {count}
      </span>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="xs"
          icon={ChevronLeft}
          aria-label="Oldingi sahifa"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
        />
        <Button
          variant="secondary"
          size="xs"
          icon={ChevronRight}
          aria-label="Keyingi sahifa"
          disabled={last >= count}
          onClick={() => onPageChange(page + 1)}
        />
      </div>
    </div>
  )
}
