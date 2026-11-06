import { CircleAlert } from 'lucide-react'
import { forwardRef, useId } from 'react'

const CONTROL_SIZES = {
  input: 'h-12 px-3',
  select: 'h-12 px-3',
  textarea: 'px-3 py-3 leading-[23px]',
}

// `as`: input, select yoki textarea. Select variantlari `children` orqali beriladi.
const Field = forwardRef(function Field(
  { label, error, hint, mono = false, as: Control = 'input', className = '', ...props },
  ref,
) {
  const id = useId()
  const messageId = `${id}-message`
  const message = error ?? hint

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor={id} className="text-[13px] leading-[18px] font-semibold tracking-[0.01em] text-ink-600">
        {label}
      </label>
      <Control
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={`w-full rounded-xl border bg-surface-card text-[15px] leading-5 font-medium text-ink-900 shadow-control ${
          CONTROL_SIZES[Control]
        } ${error ? 'border-error' : 'border-border-400'} ${mono ? 'font-mono' : ''}`}
        {...props}
      />
      {message && (
        <div
          id={messageId}
          className={`flex items-start gap-1.5 text-[13px] leading-[19px] ${
            error ? 'font-semibold text-error' : 'text-ink-600'
          }`}
        >
          {error && (
            <CircleAlert size={16} strokeWidth={1.9} aria-hidden="true" className="mt-px shrink-0" />
          )}
          <span>{message}</span>
        </div>
      )}
    </div>
  )
})

export default Field
