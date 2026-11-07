import { useCallback } from 'react'
import { saveBlob } from '../lib/download.js'
import { api } from './client.js'
import { useRequest } from './useRequest.js'

const data = ({ data: body }) => body

export function useGroups({ q, status }) {
  return useRequest(
    useCallback(
      () =>
        api
          .get('/groups/', { params: { q: q || undefined, status: status || undefined } })
          .then(data),
      [q, status],
    ),
  )
}

export const useGroup = (id) =>
  useRequest(useCallback(() => api.get(`/groups/${id}/`).then(data), [id]))

export const useGroupMembers = (id) =>
  useRequest(useCallback(() => api.get(`/groups/${id}/members/`).then(data), [id]))

export const createGroup = (fields) => api.post('/groups/', fields).then(data)
export const updateGroup = (id, fields) => api.patch(`/groups/${id}/`, fields).then(data)
export const addMember = (id, fields) => api.post(`/groups/${id}/members/`, fields).then(data)

export function previewMembers(id, file) {
  const form = new FormData()
  form.append('file', file)
  return api.post(`/groups/${id}/members/import/preview/`, form).then(data)
}

export const commitMembers = (id, token) =>
  api.post(`/groups/${id}/members/import/commit/`, { token }).then(data)

// Javobdagi ochiq parollar faqat ekrandagi holatda turadi, hech qayerga saqlanmaydi.
export const generateCredentials = (id, userIds) =>
  api.post(`/groups/${id}/credentials/`, userIds ? { user_ids: userIds } : {}).then(data)

export const openGroupTest = (id) => api.post(`/groups/${id}/open/`).then(data)

export const closeGroupTest = (id, mode) =>
  api.post(`/groups/${id}/close/`, { mode }).then(data)

export const grantRetake = (groupId, userId, reason) =>
  api.post(`/groups/${groupId}/members/${userId}/retake/`, { reason }).then(data)

export const setExitPassword = (id, password) =>
  api.post(`/groups/${id}/exit-password/`, password ? { password } : {}).then(data)

export async function downloadMembersTemplate() {
  const { data: blob } = await api.get('/groups/members/template.xlsx', { responseType: 'blob' })
  saveBlob(blob, 'tinglovchilar-shabloni.xlsx')
}
