import logo from '../../assets/ktri-logo.webp'

export default function BrandMark({ className = '' }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img src={logo} alt="" width="40" height="40" className="size-10 rounded-full bg-white" />
      <div className="text-[15px] font-bold">MOQT Test</div>
    </div>
  )
}
