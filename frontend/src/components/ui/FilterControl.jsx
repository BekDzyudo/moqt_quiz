import { Search } from 'lucide-react'

const CONTROL =
  'h-11 min-w-0 rounded-xl border border-border-400 bg-surface-card px-3 text-[15px] text-ink-900'

export function FilterSelect({ children, className = 'flex-[1_1_200px]', ...props }) {
  return (
    <select className={`${CONTROL} ${className}`} {...props}>
      {children}
    </select>
  )
}

export function FilterDate(props) {
  return <input type="date" className={`${CONTROL} flex-[1_1_200px]`} {...props} />
}

export function FilterSearch({ label, ...props }) {
  return (
    <label className="flex h-11 min-w-0 flex-[2_1_280px] items-center gap-2 rounded-xl border border-border-400 bg-surface-card px-3 text-ink-400">
      <Search size={18} strokeWidth={1.9} aria-hidden="true" className="shrink-0" />
      <input
        type="search"
        aria-label={label}
        placeholder={label}
        className="h-full min-w-0 flex-1 text-[15px] text-ink-900"
        {...props}
      />
    </label>
  )
}
