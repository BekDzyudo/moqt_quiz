import { CircleCheck, Info, TriangleAlert } from 'lucide-react'

const TONES = {
  error: { className: 'bg-error-soft text-error', icon: TriangleAlert, role: 'alert' },
  success: { className: 'bg-success-soft text-success', icon: CircleCheck, role: 'status' },
  info: { className: 'bg-brand-soft text-brand-900', icon: Info, role: 'alert' },
}

export default function Alert({ tone, children }) {
  const { className, icon: Icon, role } = TONES[tone]

  return (
    <div
      role={role}
      className={`flex items-start gap-2 rounded-xl p-3 text-[13px] leading-[19px] font-semibold ${className}`}
    >
      <Icon size={18} strokeWidth={1.9} aria-hidden="true" className="shrink-0" />
      <span>{children}</span>
    </div>
  )
}
