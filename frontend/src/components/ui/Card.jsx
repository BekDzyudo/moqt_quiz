export default function Card({ padding = 'p-6', className = '', children, ...props }) {
  return (
    <section
      className={`rounded-2xl border border-border-200 bg-surface-card ${padding} ${className}`}
      {...props}
    >
      {children}
    </section>
  )
}
