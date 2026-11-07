import { EllipsisVertical } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Button from './Button.jsx'

// Portal orqali: jadvalning overflow-x konteyneri menyuni kesmasin.
export default function ActionMenu({ label, items, size = 'xs' }) {
  const [position, setPosition] = useState(null)
  const trigger = useRef(null)
  const menu = useRef(null)

  const open = position !== null

  useEffect(() => {
    if (!open) return undefined

    const close = () => setPosition(null)
    const handleKey = (event) => {
      if (event.key !== 'Escape') return
      close()
      trigger.current?.focus()
    }
    const handlePointer = (event) => {
      if (!menu.current?.contains(event.target)) close()
    }

    menu.current?.querySelector('button:not(:disabled)')?.focus()
    document.addEventListener('keydown', handleKey)
    document.addEventListener('mousedown', handlePointer)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)

    return () => {
      document.removeEventListener('keydown', handleKey)
      document.removeEventListener('mousedown', handlePointer)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  const handleToggle = () => {
    if (open) {
      setPosition(null)
      return
    }
    const rect = trigger.current.getBoundingClientRect()
    setPosition({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
  }

  return (
    <>
      <Button
        ref={trigger}
        variant="secondary"
        size={size}
        icon={EllipsisVertical}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={handleToggle}
      />
      {open &&
        createPortal(
          <div
            ref={menu}
            role="menu"
            aria-label={label}
            style={position}
            className="fixed z-40 flex min-w-64 flex-col rounded-xl border border-border-200 bg-surface-card p-1 shadow-card"
          >
            {items.map(({ label: itemLabel, icon: Icon, onSelect, disabled, hint }) => (
              <button
                key={itemLabel}
                type="button"
                role="menuitem"
                disabled={disabled}
                title={disabled ? hint : undefined}
                onClick={() => {
                  setPosition(null)
                  onSelect()
                }}
                className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg px-3 text-left text-[15px] font-medium text-ink-900 hover:bg-surface-muted disabled:cursor-not-allowed disabled:text-ink-400 disabled:hover:bg-transparent"
              >
                {itemLabel}
                <Icon size={18} strokeWidth={1.9} aria-hidden="true" />
              </button>
            ))}
          </div>,
          document.querySelector('main') ?? document.body,
        )}
    </>
  )
}
