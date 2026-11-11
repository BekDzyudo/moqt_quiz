import { create } from 'zustand'
import {
  fetchAttempt,
  fetchQuestion,
  finishAttempt,
  saveAnswer,
  sendEvent,
  unlockAttempt,
} from '../api/attempt.js'
import { errorMessage } from '../api/client.js'
import { loadPending, savePending } from '../lib/pendingQueue.js'
import { syncServerClock } from '../lib/serverClock.js'

const RETRY_MS = 5000

const isExpired = (error) => error.response?.data?.code === 'attempt_expired'
// Admin yakunlagan yoki chiqishlar limitdan oshib server to'xtatgan.
const isFinished = (error) => error.response?.data?.code === 'attempt_finished'
// Server testni qulflagan: admin bergan kod bilan ochilguncha savol va javob yopiq.
const isLocked = (error) => error.response?.data?.code === 'attempt_locked'

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

// "Keyinroq qaytaman" belgilari faqat shu brauzerda saqlanadi (serverga ketmaydi, baholashga ta'sir qilmaydi).
const flagsKey = (attemptId) => `moqt.flags.${attemptId}`
function loadFlags(attemptId) {
  try {
    const raw = JSON.parse(localStorage.getItem(flagsKey(attemptId)) ?? '[]')
    return Array.isArray(raw) ? raw.filter(Number.isInteger) : []
  } catch {
    return []
  }
}
function saveFlags(attemptId, flags) {
  try {
    localStorage.setItem(flagsKey(attemptId), JSON.stringify(flags))
  } catch {
    // Saqlab bo'lmasa ham test davom etadi.
  }
}

const initialState = {
  flagged: [],
  attemptId: null,
  status: null,
  total: 0,
  currentN: 1,
  answered: [],
  exits: 0,
  exitLimit: 0,
  locked: false,
  // "exit" — testdan chiqgani uchun, "admin" — admin qo'lda qulflagan.
  lockReason: null,
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
          if (entry.kind === 'event') {
            set({ exits: body.fullscreen_exits })
            if (typeof body.locked === 'boolean') set({ locked: body.locked, lockReason: body.lock_reason ?? null })
            if (body.status && body.status !== 'in_progress') {
              // Chiqishlar limitdan oshdi: server testni to'xtatdi.
              entries = []
              persist(attemptId)
              markEnded()
              return
            }
          }
        } catch (error) {
          // Aloqa yo'q, server vaqtincha ishlamayapti (5xx), cheklov (429) yoki seans tugagan (401):
          // javob o'chirilmaydi, localStorage'da qoladi va keyin (qayta kirgandan so'ng ham) yuboriladi.
          const status = error.response?.status
          if (!error.response || status === 401 || status === 429 || status >= 500) {
            set({ saveStatus: 'offline' })
            retryTimer = setTimeout(drain, RETRY_MS)
            return
          }
          if (isExpired(error) || isFinished(error)) {
            entries = []
            persist(attemptId)
            markEnded()
            return
          }
          if (isLocked(error)) {
            // Javob yo'qolmaydi: qulf ochilgach navbat davom etadi.
            set({ locked: true, saveStatus: 'idle' })
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
      if (isExpired(error) || isFinished(error)) markEnded()
      else if (isLocked(error)) set({ locked: true })
      else set({ questionError: errorMessage(error) })
    }
  }

  return {
    ...initialState,

    open: async (attemptId) => {
      entries = loadPending(attemptId)
      latestLoad = 0
      set({ ...initialState, attemptId, flagged: loadFlags(attemptId) })

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
          locked: Boolean(attempt.locked),
          lockReason: attempt.lock_reason ?? null,
          answered: applyPendingAnswers(attempt.answered),
        })
        if (!attempt.locked) await loadQuestion(attempt.current_n)
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

    toggleFlag: (n) => {
      const { attemptId, flagged } = get()
      const next = flagged.includes(n) ? without(flagged, n) : addSorted(flagged, n)
      set({ flagged: next })
      saveFlags(attemptId, next)
    },

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

    // Chiqish aniqlanganda darhol (server javobini kutmasdan) qulflanadi.
    lockNow: () => set({ locked: true }),

    unlock: async (code) => {
      const { attemptId, currentN } = get()
      const body = await unlockAttempt(attemptId, code)
      adopt(body)
      set({ locked: false, lockReason: null })
      drain()
      await loadQuestion(currentN)
    },

    // Har 30 soniyada va aloqa tiklanganda: vaqtni moslaydi, admin yakunlaganini aniqlaydi.
    sync: async () => {
      const { attemptId } = get()
      if (!attemptId) return
      try {
        const attempt = await fetchAttempt(attemptId)
        adopt(attempt)
        if (attempt.status !== 'active') markEnded()
        else set({ locked: Boolean(attempt.locked), lockReason: attempt.lock_reason ?? null })
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
