export default function Card({ className = '', children, ...props }) {
  return (
    <section
      className={`rounded-2xl border border-border-200 bg-surface-card p-6 ${className}`}
      {...props}
    >
      {children}
    </section>
  )
}
