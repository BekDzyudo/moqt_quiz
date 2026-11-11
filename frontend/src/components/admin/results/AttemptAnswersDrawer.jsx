import { Check, CircleAlert, Download, Loader2, X } from 'lucide-react'
import { useCallback, useState } from 'react'
import { errorMessage } from '../../../api/client.js'
import { downloadAttemptReport, fetchAttemptAnswers } from '../../../api/results.js'
import { useRequest } from '../../../api/useRequest.js'
import Alert from '../../ui/Alert.jsx'
import Button from '../../ui/Button.jsx'
import Drawer from '../../ui/Drawer.jsx'
import EmptyState from '../../ui/EmptyState.jsx'
import StatusBadge from '../../ui/StatusBadge.jsx'

const FILTERS = [
  { key: 'all', label: 'Hammasi' },
  { key: 'wrong', label: "Noto'g'ri" },
  { key: 'empty', label: 'Belgilanmagan' },
  { key: 'correct', label: "To'g'ri" },
]

const matches = (filter, question) => {
  if (filter === 'wrong') return question.answered && !question.is_correct
  if (filter === 'empty') return !question.answered
  if (filter === 'correct') return question.is_correct
  return true
}

function questionBadge(question) {
  if (!question.answered) return <StatusBadge tone="neutral">Belgilanmagan</StatusBadge>
  return question.is_correct ? (
    <StatusBadge tone="success">To'g'ri</StatusBadge>
  ) : (
    <StatusBadge tone="error">Noto'g'ri</StatusBadge>
  )
}

function optionClass(option) {
  if (option.is_correct) return 'border-success bg-success-soft'
  if (option.selected) return 'border-error bg-error-soft'
  return 'border-border-200'
}

function QuestionCard({ question }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="font-bold">{question.n}-savol</span>
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-ink-600">{question.time_spent_seconds} s</span>
          {questionBadge(question)}
        </div>
      </div>
      <p className="m-0 whitespace-pre-wrap">{question.text}</p>
      {question.image_url && (
        <img
          src={question.image_url}
          alt={`${question.n}-savol rasmi`}
          className="max-h-60 max-w-full self-start rounded-xl border border-border-200"
        />
      )}
      <div className="flex flex-col gap-2">
        {question.options.map((option) => (
          <div
            key={option.letter}
            className={`flex items-start gap-2 rounded-lg border px-3 py-2 ${optionClass(option)}`}
          >
            <span className="font-semibold">{option.letter})</span>
            <span className="flex-1 whitespace-pre-wrap">{option.text}</span>
            {option.selected && (
              <span
                className={`inline-flex items-center gap-1 text-[13px] font-semibold whitespace-nowrap ${
                  option.is_correct ? 'text-success' : 'text-error'
                }`}
              >
                {option.is_correct ? <Check size={16} /> : <X size={16} />}
                Tinglovchi tanlagan
              </span>
            )}
            {!option.selected && option.is_correct && (
              <span className="inline-flex items-center gap-1 text-[13px] font-semibold whitespace-nowrap text-success">
                <Check size={16} />
                To'g'ri javob
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AttemptAnswersDrawer({ attemptId, onClose }) {
  const load = useCallback(() => fetchAttemptAnswers(attemptId), [attemptId])
  const { data, loading, error } = useRequest(load)
  const [filter, setFilter] = useState('all')
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState(null)

  const handleDownload = async () => {
    setDownloading(true)
    setDownloadError(null)
    try {
      await downloadAttemptReport(attemptId, `${data.user.full_name} - ${data.attempt.number}-urinish.pdf`)
    } catch (error) {
      setDownloadError(errorMessage(error))
    } finally {
      setDownloading(false)
    }
  }

  const title = data ? `${data.user.full_name} · ${data.attempt.number}-urinish` : 'Javoblar'

  return (
    <Drawer open onClose={onClose} title={title}>
      {loading && !data && <EmptyState icon={Loader2} spin title="Yuklanmoqda" />}
      {error && <EmptyState icon={CircleAlert} tone="error" title="Yuklab bo'lmadi" description={error} />}
      {data && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[13px] text-ink-600">{data.group.name}</span>
            <Button variant="secondary" size="xs" icon={Download} loading={downloading} onClick={handleDownload}>
              PDF yuklab olish
            </Button>
          </div>
          {downloadError && <Alert tone="error">{downloadError}</Alert>}
          <div className="flex flex-wrap items-center gap-3 text-[15px]">
            <span>
              To'g'ri: <b>{data.attempt.correct_count ?? '—'} / {data.attempt.n_total}</b>
            </span>
            {data.attempt.percent !== null && <span className="text-ink-600">{data.attempt.percent}%</span>}
            {data.attempt.passed !== null &&
              (data.attempt.passed ? (
                <StatusBadge tone="success">O'tdi</StatusBadge>
              ) : (
                <StatusBadge tone="error">O'tmadi</StatusBadge>
              ))}
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Savollarni saralash">
            {FILTERS.map((item) => {
              const count = data.questions.filter((question) => matches(item.key, question)).length
              const active = filter === item.key
              return (
                <button
                  key={item.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilter(item.key)}
                  className={`cursor-pointer rounded-full border px-3 py-1 text-[13px] font-semibold ${
                    active ? 'border-brand-500 bg-brand-soft text-brand-ink-strong' : 'border-border-200 text-ink-600'
                  }`}
                >
                  {item.label} · {count}
                </button>
              )
            })}
          </div>
          {data.questions
            .filter((question) => matches(filter, question))
            .map((question) => (
              <QuestionCard key={question.n} question={question} />
            ))}
        </div>
      )}
    </Drawer>
  )
}
