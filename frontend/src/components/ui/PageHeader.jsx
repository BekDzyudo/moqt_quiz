export default function PageHeader({ icon: Icon, title, description, actions }) {
  return (
    <header className="flex flex-wrap items-center gap-4 rounded-2xl border border-border-200 bg-surface-card px-6 py-5">
      <div className="flex size-11 items-center justify-center rounded-xl bg-brand-soft text-brand-700">
        <Icon size={20} strokeWidth={1.9} aria-hidden="true" />
      </div>
      <div className="flex-[1_1_240px]">
        <h1 className="m-0 text-[26px] leading-[34px] font-bold">{title}</h1>
        {description && <p className="m-0 text-ink-600">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </header>
  )
}
