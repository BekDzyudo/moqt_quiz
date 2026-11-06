export default function BrandMark({ className = '' }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex size-9 items-center justify-center rounded-full bg-brand-700 text-[13px] font-extrabold text-white">
        KT
      </div>
      <div className="text-[15px] font-bold">MOQT Test</div>
    </div>
  )
}
