const TONES = {
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  error: 'bg-error-soft text-error',
  info: 'bg-brand-soft text-brand-900',
  neutral: 'bg-surface-muted text-ink-600',
}

export default function StatusBadge({ tone = 'neutral', children }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] leading-[18px] font-semibold ${TONES[tone]}`}
    >
      <span aria-hidden="true" className="size-2 rounded-full bg-current" />
      {children}
    </span>
  )
}
