import { create } from 'zustand'
import {
  fetchAttempt,
  fetchQuestion,
  finishAttempt,
  saveAnswer,
  sendEvent,
} from '../api/attempt.js'
import { errorMessage } from '../api/client.js'
import { loadPending, savePending } from '../lib/pendingQueue.js'
import { syncServerClock } from '../lib/serverClock.js'

const RETRY_MS = 5000

const isExpired = (error) => error.response?.data?.code === 'attempt_expired'

// Navbat holati store'dan tashqarida: u render bilan bog'liq emas.
let entries = []
let draining = false
let retryTimer = null
let questionShownAt = 0
let latestLoad = 0

const addSorted = (list, n) => (list.includes(n) ? list : [...list, n].sort((a, b) => a - b))
const without = (list, n) => list.filter((item) => item !== n)

function persist(attemptId) {
  savePending(attemptId, entries)
}

function sendEntry(attemptId, entry) {
  if (entry.kind === 'answer') return saveAnswer(attemptId, entry.n, entry.key, entry.timeSpentMs)
  return sendEvent(attemptId, entry.type, entry.meta)
}

const isSaveEntry = (entry) => entry.kind !== 'event'

// Serverda hali yo'q javoblar ekranda ko'rinishda qoladi.
function applyPendingAnswers(answered) {
  let result = answered

  for (const entry of entries) {
    if (entry.kind === 'answer') {
      result = entry.key ? addSorted(result, entry.n) : without(result, entry.n)
    }
  }
  return result
}

function applyPendingToQuestion(question) {
  const answer = entries.find((entry) => entry.kind === 'answer' && entry.n === question.n)

  return {
    ...question,
    selected_key: answer ? answer.key : question.selected_key,
  }
}

const initialState = {
  attemptId: null,
  status: null,
  total: 0,
  currentN: 1,
  answered: [],
  exits: 0,
  exitLimit: 0,
  deadlineAt: null,
  question: null,
  questionError: null,
  saveStatus: 'idle',
  loadError: null,
  ended: false,
}

export const useAttemptStore = create((set, get) => {
  const markEnded = () => set({ ended: true })

  const adopt = (body) => {
    syncServerClock(body.server_now)
    if (body.deadline_at) set({ deadlineAt: body.deadline_at })
  }

  const drain = async () => {
    const { attemptId } = get()
    if (draining || !attemptId) return
    draining = true
    clearTimeout(retryTimer)

    try {
      while (entries.length > 0) {
        const entry = entries[0]
        if (isSaveEntry(entry)) set({ saveStatus: 'saving' })

        try {
          const body = await sendEntry(attemptId, entry)
          adopt(body)
          if (entry.kind === 'event') set({ exits: body.fullscreen_exits })
        } catch (error) {
          if (!error.response) {
            set({ saveStatus: 'offline' })
            retryTimer = setTimeout(drain, RETRY_MS)
            return
          }
          if (isExpired(error)) {
            entries = []
            persist(attemptId)
            markEnded()
            return
          }
          // Server rad etdi: qayta yuborish foyda bermaydi, navbat to'xtab qolmasin.
        }

        // `entry` yuborilayotganda yangi javob bilan almashgan bo'lishi mumkin.
        entries = entries.filter((candidate) => candidate !== entry)
        persist(attemptId)
      }
      set({ saveStatus: get().saveStatus === 'idle' ? 'idle' : 'saved' })
    } finally {
      draining = false
    }
  }

  const enqueue = (entry, sameAs) => {
    const index = sameAs ? entries.findIndex(sameAs) : -1
    if (index >= 0) entries[index] = entry
    else entries.push(entry)
    persist(get().attemptId)
    drain()
  }

  const loadQuestion = async (n) => {
    const { attemptId } = get()
    latestLoad += 1
    const load = latestLoad

    try {
      const question = await fetchQuestion(attemptId, n)
      if (load !== latestLoad) return
      adopt(question)
      questionShownAt = performance.now()
      set({ question: applyPendingToQuestion(question), currentN: n, questionError: null })
    } catch (error) {
      if (load !== latestLoad) return
      if (isExpired(error)) markEnded()
      else set({ questionError: errorMessage(error) })
    }
  }

  return {
    ...initialState,

    open: async (attemptId) => {
      entries = loadPending(attemptId)
      latestLoad = 0
      set({ ...initialState, attemptId })

      try {
        const attempt = await fetchAttempt(attemptId)
        adopt(attempt)

        if (attempt.status !== 'active') {
          markEnded()
          return
        }

        set({
          status: attempt.status,
          total: attempt.n_total,
          currentN: attempt.current_n,
          exits: attempt.fullscreen_exits,
          exitLimit: attempt.exit_limit,
          answered: applyPendingAnswers(attempt.answered),
        })
        await loadQuestion(attempt.current_n)
        drain()
      } catch (error) {
        set({ loadError: errorMessage(error) })
      }
    },

    close: () => {
      clearTimeout(retryTimer)
      entries = []
      set(initialState)
    },

    goTo: (n) => {
      const { total } = get()
      if (n >= 1 && n <= total) loadQuestion(n)
    },

    retryQuestion: () => loadQuestion(get().currentN),

    select: (key) => {
      const { question, answered } = get()
      // Tanlangan variantni qayta bosish so'rov yubormaydi.
      if (!question || question.selected_key === key) return

      const timeSpentMs = Math.round(performance.now() - questionShownAt)
      questionShownAt = performance.now()

      set({
        question: { ...question, selected_key: key },
        answered: addSorted(answered, question.n),
      })

      const previous = entries.find((entry) => entry.kind === 'answer' && entry.n === question.n)
      enqueue(
        {
          kind: 'answer',
          n: question.n,
          key,
          timeSpentMs: timeSpentMs + (previous?.timeSpentMs ?? 0),
        },
        (entry) => entry.kind === 'answer' && entry.n === question.n,
      )
    },

    // Hodisa ham navbatdan o'tadi: internetni uzib chiqish jurnaldan yashirinmaydi.
    report: (type) => enqueue({ kind: 'event', type, meta: { at: new Date().toISOString() } }),

    flush: drain,

    // Har 30 soniyada va aloqa tiklanganda: vaqtni moslaydi, admin yakunlaganini aniqlaydi.
    sync: async () => {
      const { attemptId } = get()
      if (!attemptId) return
      try {
        const attempt = await fetchAttempt(attemptId)
        adopt(attempt)
        if (attempt.status !== 'active') markEnded()
      } catch {
        // Aloqa yo'q: keyingi urinishda moslanadi.
      }
      drain()
    },

    hasUnsaved: () => entries.some(isSaveEntry),

    finish: async () => {
      const { attemptId } = get()
      await drain()
      if (entries.some(isSaveEntry)) {
        throw new Error('unsaved')
      }
      await finishAttempt(attemptId)
      markEnded()
    },
  }
})
