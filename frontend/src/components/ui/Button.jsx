import { Loader2 } from 'lucide-react'

const VARIANTS = {
  primary:
    'border-transparent bg-brand-700 text-white shadow-raised hover:bg-brand-900 active:bg-brand-900',
  secondary:
    'border-border-400 bg-surface-card text-ink-900 shadow-control hover:bg-surface-muted active:bg-brand-soft',
  dark: 'border-transparent bg-brand-900 text-white hover:bg-brand-700 active:bg-brand-700',
  danger: 'border-transparent bg-error text-white shadow-raised hover:bg-[#a32a23] active:bg-[#a32a23]',
  dangerOutline: 'border-error bg-surface-card text-error hover:bg-error-soft active:bg-error-soft',
  dashed: 'border-dashed border-border-400 bg-surface-card text-ink-600 hover:bg-surface-muted',
  ghost: 'border-transparent bg-transparent text-brand-700 hover:bg-brand-soft active:bg-brand-soft',
}

const SIZES = {
  md: 'h-12 px-5 text-[15px]',
  sm: 'h-11 px-3.5 text-[13px]',
}

// `icon` majburiy: loyihada matnli-only tugma yo'q. Ikonka matndan keyin turadi.
// Matnsiz (faqat ikonka) tugmaga `aria-label` beriladi.
export default function Button({
  icon: Icon,
  variant = 'primary',
  size = 'md',
  type = 'button',
  loading = false,
  disabled = false,
  iconFirst = false,
  className = '',
  children,
  ...props
}) {
  const shownIcon = loading ? (
    <Loader2 size={18} strokeWidth={1.9} aria-hidden="true" className="animate-spin" />
  ) : (
    <Icon size={18} strokeWidth={1.9} aria-hidden="true" />
  )

  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border font-bold tracking-[0.01em] transition-colors duration-150 disabled:cursor-not-allowed disabled:border-transparent disabled:bg-surface-muted disabled:text-ink-400 disabled:shadow-none ${VARIANTS[variant]} ${SIZES[size]} ${children ? '' : 'w-11 px-0'} ${className}`}
      {...props}
    >
      {iconFirst && shownIcon}
      {children}
      {!iconFirst && shownIcon}
    </button>
  )
}
