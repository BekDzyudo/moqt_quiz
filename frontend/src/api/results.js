import { useCallback } from 'react'
import { saveBlob } from '../lib/download.js'
import { adaptResults, adaptSuspicious } from './adapters.js'
import { api } from './client.js'
import { useRequest } from './useRequest.js'

const data = ({ data: body }) => body

const fetchDashboard = () => api.get('/dashboard/').then(data)

export const useDashboard = () => useRequest(fetchDashboard)

export function useResults(groupId) {
  return useRequest(
    useCallback(
      () => (groupId ? api.get('/results/', { params: { group: groupId } }).then(data).then(adaptResults) : Promise.resolve(null)),
      [groupId],
    ),
  )
}

const fetchSuspicious = () =>
  api.get('/results/suspicious/').then(data).then((items) => (items ?? []).map(adaptSuspicious))

export const useSuspiciousAttempts = () => useRequest(fetchSuspicious)

async function download(path, groupId, filename) {
  const { data: blob } = await api.get(path, { params: { group: groupId }, responseType: 'blob' })
  saveBlob(blob, filename)
}

export const downloadResultsExcel = (group) =>
  download('/results/export.xlsx', group.id, `${group.name}-natijalar.xlsx`)

export const downloadProtocol = (group) =>
  download('/results/protocol.pdf', group.id, `${group.name}-protokol.pdf`)

// Admin: urinishdagi har savolga nima belgilangani va to'g'ri javob (apellyatsiya uchun).
export const fetchAttemptAnswers = (attemptId) => api.get(`/results/attempts/${attemptId}/`).then(data)

// Admin: bitta urinishning natija varaqasi (PDF).
export async function downloadAttemptReport(attemptId, filename) {
  const { data: blob } = await api.get(`/results/attempts/${attemptId}/report.pdf`, { responseType: 'blob' })
  saveBlob(blob, filename)
}
