import { Loader2 } from 'lucide-react'
import { forwardRef } from 'react'

const VARIANTS = {
  primary: 'border-0 bg-brand-700 text-white shadow-raised hover:bg-brand-900 active:bg-brand-900',
  secondary:
    'border border-border-400 bg-surface-card hover:bg-surface-muted active:bg-brand-soft',
  dark: 'border-0 bg-brand-900 text-white hover:bg-brand-700 active:bg-brand-700',
  danger: 'border-0 bg-error-solid text-white shadow-raised hover:bg-error-solid-strong active:bg-error-solid-strong',
  dangerOutline: 'border border-error bg-surface-card text-error hover:bg-error-soft active:bg-error-soft',
  dashed: 'border border-dashed border-border-400 bg-surface-card text-ink-600 hover:bg-surface-muted',
  ghost: 'border-0 bg-transparent text-brand-ink hover:bg-brand-soft active:bg-brand-soft',
}

// Dizayndagi o'lchamlar. 36 va 40px tugmalarning bosish maydoni ko'rinmas qatlam bilan 44px.
const SIZES = {
  xs: { box: "h-9 gap-1.5 text-[13px] after:absolute after:-inset-1 after:content-['']", px: 'px-3', square: 'w-9', icon: 16 },
  sm: { box: "h-10 gap-2 text-[13px] after:absolute after:-inset-0.5 after:content-['']", px: 'px-3.5', square: 'w-10', icon: 18 },
  md: { box: 'h-11 gap-2 text-[15px]', px: 'px-4', square: 'w-11', icon: 18 },
  lg: { box: 'h-12 gap-2 text-[15px]', px: 'px-[18px]', square: 'w-12', icon: 18 },
  xl: { box: 'h-[52px] gap-2 text-[15px]', px: 'px-7', square: 'w-[52px]', icon: 18 },
}

// `icon` majburiy: loyihada matnli-only tugma yo'q. Ikonka matndan keyin turadi.
// Matnsiz (faqat ikonka) tugmaga `aria-label` beriladi.
const Button = forwardRef(function Button(
  {
    icon: Icon,
    variant = 'primary',
    size = 'lg',
    type = 'button',
    loading = false,
    disabled = false,
    iconFirst = false,
    px,
    className = '',
    children,
    ...props
  },
  ref,
) {
  const { box, px: defaultPx, square, icon } = SIZES[size]

  const shownIcon = loading ? (
    <Loader2 size={icon} strokeWidth={1.9} aria-hidden="true" className="animate-spin" />
  ) : (
    <Icon size={icon} strokeWidth={1.9} aria-hidden="true" />
  )

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`relative inline-flex cursor-pointer items-center justify-center rounded-xl font-bold transition-colors duration-150 disabled:cursor-not-allowed disabled:border-transparent disabled:bg-surface-muted disabled:text-ink-400 disabled:shadow-none ${VARIANTS[variant]} ${variant === 'secondary' ? (children ? 'text-ink-900' : 'text-ink-600') : ''} ${box} ${children ? (px ?? defaultPx) : `${square} px-0`} ${className}`}
      {...props}
    >
      {iconFirst && shownIcon}
      {children}
      {!iconFirst && shownIcon}
    </button>
  )
})

export default Button
