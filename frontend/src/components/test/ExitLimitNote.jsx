// Chiqishlar limiti haqida ogohlantirish. Limitdan oshgan chiqishda server testni o'zi yakunlaydi.
export default function ExitLimitNote({ exits, exitLimit }) {
  if (!exitLimit) return null
  const last = exits >= exitLimit

  return (
    <p
      role={last ? 'alert' : undefined}
      className={`m-0 text-[13px] leading-[19px] ${last ? 'font-bold text-error' : 'text-ink-600'}`}
    >
      {last
        ? "Bu oxirgi ogohlantirish: yana bir marta chiqsangiz, test shu paytdagi javoblaringiz bilan avtomatik yakunlanadi."
        : `${exitLimit} martadan ortiq chiqilsa, test shu paytdagi javoblar bilan avtomatik yakunlanadi.`}
    </p>
  )
}
