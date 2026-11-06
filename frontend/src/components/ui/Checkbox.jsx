export default function Checkbox({ label, ...props }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px] font-semibold">
      <input type="checkbox" className="size-5 accent-brand-700" {...props} />
      {label}
    </label>
  )
}
