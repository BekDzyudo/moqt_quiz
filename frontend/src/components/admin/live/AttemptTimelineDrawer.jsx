import { CircleAlert, Loader2 } from 'lucide-react'
import { useCallback } from 'react'
import { fetchAttemptTimeline } from '../../../api/live.js'
import { useRequest } from '../../../api/useRequest.js'
import { formatDateTime } from '../../../lib/time.js'
import Drawer from '../../ui/Drawer.jsx'
import EmptyState from '../../ui/EmptyState.jsx'
import StatusBadge from '../../ui/StatusBadge.jsx'

const DANGER = new Set(['hidden', 'blur', 'fullscreen_exit', 'locked', 'admin_locked', 'unlock_failed', 'exit_key_failed'])
const GOOD = new Set(['unlocked', 'return', 'start', 'finish'])

const dotClass = (type) => (DANGER.has(type) ? 'bg-error' : GOOD.has(type) ? 'bg-success' : 'bg-brand-500')

export default function AttemptTimelineDrawer({ attemptId, onClose }) {
  const load = useCallback(() => fetchAttemptTimeline(attemptId), [attemptId])
  const { data, loading, error } = useRequest(load)
  const a = data?.attempt

  return (
    <Drawer open onClose={onClose} title={a ? `${a.user.full_name} · ${a.number}-urinish` : 'Hodisalar'}>
      {loading && !data && <EmptyState icon={Loader2} spin title="Yuklanmoqda" />}
      {error && <EmptyState icon={CircleAlert} tone="error" title="Yuklab bo'lmadi" description={error} />}
      {a && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2 text-[15px]">
            <span className="text-ink-600">{a.group.name}</span>
            <StatusBadge tone={a.status === 'in_progress' ? 'info' : 'neutral'}>{a.status_label}</StatusBadge>
            {a.status === 'terminated' && a.finish_label && (
              <StatusBadge tone="error">{a.finish_label}</StatusBadge>
            )}
            {a.correct_count !== null && (
              <span>
                <b>
                  {a.correct_count} / {a.n_total}
                </b>{' '}
                {a.passed ? "· O'tdi" : "· O'tmadi"}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge tone={a.fullscreen_exits > a.exit_limit ? 'error' : 'neutral'}>
              Chiqishlar: {a.fullscreen_exits}
            </StatusBadge>
            <StatusBadge tone={a.lock_count ? 'warning' : 'neutral'}>Qulflangan: {a.lock_count}</StatusBadge>
            <StatusBadge tone="neutral">Berilgan kod: {a.unlock_codes}</StatusBadge>
          </div>
          {a.suspicious && (
            <div className="flex flex-col gap-1 rounded-xl bg-error-soft px-4 py-3 text-[13px] font-semibold text-error">
              <span>Shubhali urinish</span>
              {a.suspicious_reasons.map((reason) => (
                <span key={reason} className="font-normal">
                  {reason}
                </span>
              ))}
            </div>
          )}
          <ol className="m-0 flex list-none flex-col p-0">
            {data.timeline.map((item, index) => (
              <li key={`${item.at}-${index}`} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${dotClass(item.type)}`} aria-hidden="true" />
                  {index < data.timeline.length - 1 && <span className="w-px flex-1 bg-border-200" aria-hidden="true" />}
                </div>
                <div className="flex flex-col gap-0.5 pb-4">
                  <span className="text-[13px] text-ink-600 tabular-nums">{formatDateTime(item.at)}</span>
                  <span className={`font-semibold ${DANGER.has(item.type) ? 'text-error' : ''}`}>{item.label}</span>
                  {item.detail && <span className="text-[13px] text-ink-600">{item.detail}</span>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </Drawer>
  )
}
