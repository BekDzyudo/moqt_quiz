const TONES = {
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  error: 'bg-error-soft text-error',
  info: 'bg-brand-soft text-brand-ink-strong',
  neutral: 'bg-surface-muted text-ink-600',
}

export default function StatusBadge({ tone = 'neutral', large = false, children }) {
  return (
    <span
      className={`inline-flex items-center rounded-full text-[13px] font-semibold ${
        large ? 'gap-2 px-3 py-1.5' : 'gap-1.5 px-2.5 py-1'
      } ${TONES[tone]}`}
    >
      <span aria-hidden="true" className="size-2 rounded-full bg-current" />
      {children}
    </span>
  )
}
