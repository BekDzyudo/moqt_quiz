import { useCallback } from 'react'
import { saveBlob } from '../lib/download.js'
import { api } from './client.js'
import { useRequest } from './useRequest.js'

const data = ({ data: body }) => body

const fetchDashboard = () => api.get('/dashboard/').then(data)

export const useDashboard = () => useRequest(fetchDashboard)

export function useResults(groupId) {
  return useRequest(
    useCallback(
      () => (groupId ? api.get('/results/', { params: { group: groupId } }).then(data) : Promise.resolve(null)),
      [groupId],
    ),
  )
}

async function download(path, groupId, filename) {
  const { data: blob } = await api.get(path, { params: { group: groupId }, responseType: 'blob' })
  saveBlob(blob, filename)
}

export const downloadResultsExcel = (group) =>
  download('/results/export.xlsx', group.id, `${group.name}-natijalar.xlsx`)

export const downloadProtocol = (group) =>
  download('/results/protocol.pdf', group.id, `${group.name}-protokol.pdf`)
