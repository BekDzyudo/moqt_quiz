import { X } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'
import Button from './Button.jsx'

const ICON_TONES = {
  brand: 'bg-brand-soft text-brand-ink-strong',
  muted: 'bg-surface-muted text-brand-ink-strong',
}

// Modal va Drawer asosi. Native <dialog> fokusni ushlaydi va Esc bilan yopiladi.
// Dizaynda oynalar chiziqsiz, drawer esa sarlavha va pastki qism bilan ajratilgan.
export default function Dialog({
  open,
  onClose,
  title,
  eyebrow,
  icon: Icon,
  iconTone = 'brand',
  hideClose = false,
  footer,
  drawer = false,
  className,
  children,
}) {
  const ref = useRef(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const closeOnBackdrop = (event) => {
    if (event.target === ref.current) onClose()
  }

  const handleCancel = (event) => {
    event.preventDefault()
    onClose()
  }

  return (
    <dialog
      ref={ref}
      onCancel={handleCancel}
      onClick={closeOnBackdrop}
      aria-labelledby={titleId}
      className={`bg-surface-card text-ink-900 shadow-[0_12px_32px_rgba(0,0,0,0.25)] backdrop:bg-overlay/55 ${className}`}
    >
      {open && (
        <div className="flex h-full max-h-[inherit] flex-col">
          <div
            className={`flex items-center justify-between gap-4 ${
              drawer ? 'border-b border-border-200 px-4 py-6 sm:px-8' : 'px-6 pt-8 sm:px-8'
            }`}
          >
            <div className="flex items-center gap-3">
              {Icon && (
                <div
                  className={`flex size-11 shrink-0 items-center justify-center rounded-full ${ICON_TONES[iconTone]}`}
                >
                  <Icon size={20} strokeWidth={1.9} aria-hidden="true" />
                </div>
              )}
              <div>
                {eyebrow && (
                  <div className="text-[13px] leading-[18px] font-semibold text-ink-600">{eyebrow}</div>
                )}
                <h2 id={titleId} className="m-0 text-xl leading-7 font-bold">
                  {title}
                </h2>
              </div>
            </div>
            {!hideClose && (
              <Button
                variant="secondary"
                size="sm"
                icon={X}
                aria-label="Yopish"
                className="shrink-0"
                onClick={onClose}
              />
            )}
          </div>

          <div
            className={`min-h-0 flex-1 overflow-y-auto ${
              drawer ? 'px-4 py-8 sm:px-8' : `px-6 pt-5 sm:px-8 ${footer ? 'pb-5' : 'pb-8'}`
            }`}
          >
            {children}
          </div>

          {footer && (
            <div
              className={`flex flex-wrap justify-between gap-3 ${
                drawer ? 'border-t border-border-200 px-4 py-5 sm:px-8' : 'px-6 pb-8 sm:px-8'
              }`}
            >
              {footer}
            </div>
          )}
        </div>
      )}
    </dialog>
  )
}
