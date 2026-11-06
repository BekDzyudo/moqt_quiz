import { X } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'
import Button from './Button.jsx'

// Modal va Drawer asosi. Native <dialog> fokusni ushlaydi va Esc bilan yopiladi.
export default function Dialog({ open, onClose, title, eyebrow, footer, className, children }) {
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
      className={`bg-surface-card text-ink-900 shadow-card backdrop:bg-ink-900/45 ${className}`}
    >
      {open && (
        <div className="flex h-full max-h-[inherit] flex-col">
          <div className="flex items-center justify-between gap-4 border-b border-border-200 px-6 py-4">
            <div>
              {eyebrow && (
                <div className="text-[13px] leading-[18px] font-semibold text-ink-600">{eyebrow}</div>
              )}
              <h2 id={titleId} className="m-0 text-xl leading-7 font-bold">
                {title}
              </h2>
            </div>
            <Button variant="ghost" size="sm" icon={X} aria-label="Yopish" onClick={onClose} />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
          {footer && (
            <div className="flex flex-wrap justify-between gap-3 border-t border-border-200 px-6 py-4">
              {footer}
            </div>
          )}
        </div>
      )}
    </dialog>
  )
}
