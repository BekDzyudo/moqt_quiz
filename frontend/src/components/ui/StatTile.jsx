export default function StatTile({ label, value, padding = 'p-3' }) {
  return (
    <div className={`flex flex-col gap-1 rounded-xl bg-surface-muted ${padding}`}>
      <div className="text-[13px] font-semibold text-ink-600">{label}</div>
      <div className="text-xl leading-7 font-bold">{value}</div>
    </div>
  )
}
