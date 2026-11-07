// Salbiy margin + padding: joylashuv dizayndagidek, bosish maydoni esa 44px.
export default function Checkbox({ label, ...props }) {
  return (
    <label className="-my-3 flex cursor-pointer items-center gap-3 py-3 text-[15px] font-semibold">
      <input type="checkbox" className="mt-[3px] mr-[3px] mb-[3px] ml-[3px] size-5 accent-brand-700" {...props} />
      {label}
    </label>
  )
}
