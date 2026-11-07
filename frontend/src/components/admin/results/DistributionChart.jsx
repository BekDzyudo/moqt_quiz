import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

// Ranglar hujjatda belgilangan. O'tmaganlar rangi fon bilan kam kontrastli, shuning uchun
// ustunga ingichka chegara, ustiga son, yonida afsona va pastda jadval bor.
const PASSED = '#1763a0'
const FAILED = '#c9d6e2'
const FAILED_EDGE = '#7b93a8'

function Tick({ x, y, payload, notes }) {
  const note = notes[payload.value]
  return (
    <g transform={`translate(${x},${y})`}>
      <text textAnchor="middle" dy={14} fontSize={12} fontWeight={700} fill="#10202e">
        {payload.value}
      </text>
      {note && (
        <text textAnchor="middle" dy={30} fontSize={12} fill="#4a5b6b">
          {note}
        </text>
      )}
    </g>
  )
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { label, count, passed } = payload[0].payload

  return (
    <div className="rounded-xl border border-border-200 bg-surface-card px-3 py-2 text-[13px] leading-[19px] shadow-card">
      <div className="font-bold">{label} ta to'g'ri javob</div>
      <div className="text-ink-600">
        {count} tinglovchi · {passed ? "o'tgan" : "o'tmagan"}
      </div>
    </div>
  )
}

export default function DistributionChart({ data }) {
  const notes = Object.fromEntries(data.map((bucket) => [bucket.label, bucket.note]))

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <div
          role="img"
          aria-label="To'g'ri javoblar soni bo'yicha tinglovchilar taqsimoti. Aniq sonlar pastdagi jadvalda."
          className="h-[288px] min-w-[440px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 24, right: 0, bottom: 0, left: 0 }} barCategoryGap="14%" maxBarSize={72}>
              <XAxis
                dataKey="label"
                interval={0}
                height={44}
                stroke="#7b93a8"
                tickLine={false}
                tick={<Tick notes={notes} />}
              />
              <YAxis hide allowDecimals={false} />
              <Tooltip cursor={{ fill: '#eaf2fa' }} content={<ChartTooltip />} isAnimationActive={false} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} minPointSize={2} isAnimationActive={false}>
                {data.map((bucket) => (
                  <Cell
                    key={bucket.label}
                    fill={bucket.passed ? PASSED : FAILED}
                    stroke={bucket.passed ? PASSED : FAILED_EDGE}
                  />
                ))}
                <LabelList dataKey="count" position="top" fontSize={13} fontWeight={700} fill="#10202e" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-[13px] text-ink-600">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-3 rounded-[3px] bg-brand-700" />
          O'tgan
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-3 rounded-[3px] border border-border-400 bg-[#c9d6e2]" />
          O'tmagan
        </span>
      </div>
    </div>
  )
}
