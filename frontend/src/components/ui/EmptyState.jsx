const TONES = {
  neutral: 'bg-brand-soft text-brand-700',
  error: 'bg-error-soft text-error',
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  tone = 'neutral',
  spin = false,
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      <div className={`flex size-11 items-center justify-center rounded-xl ${TONES[tone]}`}>
        <Icon
          size={20}
          strokeWidth={1.9}
          aria-hidden="true"
          className={spin ? 'animate-spin' : undefined}
        />
      </div>
      <div className="text-[17px] leading-6 font-semibold">{title}</div>
      {description && <p className="m-0 max-w-md text-ink-600">{description}</p>}
      {action}
    </div>
  )
}
