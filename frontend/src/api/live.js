import { useCallback } from 'react'
import { api } from './client.js'
import { useRequest } from './useRequest.js'

const data = ({ data: body }) => body

// Admin: test ishlayotganlar, qulflanganlar va so'nggi hodisalar.
export function useLive(groupId) {
  return useRequest(
    useCallback(() => api.get('/live/', { params: groupId ? { group: groupId } : {} }).then(data), [groupId]),
  )
}

export const createUnlockCode = (attemptId) =>
  api.post(`/live/attempts/${attemptId}/unlock-code/`).then(data)

// Tarix: tugagan urinishlar ham (hodisalar o'chirilmaydi).
export function useLiveHistory(params) {
  return useRequest(
    useCallback(() => api.get('/live/history/', { params }).then(data), [params]),
  )
}

export const fetchAttemptTimeline = (attemptId) =>
  api.get(`/live/attempts/${attemptId}/events/`).then(data)

// Qoidabuzarni (masalan, telefon bilan ushlangan) qulflash: test yakunlanmaydi.
export const lockAttempt = (attemptId, reason) =>
  api.post(`/live/attempts/${attemptId}/lock/`, { reason }).then(data)

// Urinishni shu paytdagi javoblar bilan yakunlash.
export const finishAttemptByAdmin = (attemptId, reason) =>
  api.post(`/live/attempts/${attemptId}/finish/`, { reason }).then(data)
