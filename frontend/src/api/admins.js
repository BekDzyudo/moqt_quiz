import { api } from './client.js'
import { writeTokens } from './tokens.js'
import { useRequest } from './useRequest.js'

const fetchAdmins = () => api.get('/admins/').then(({ data }) => data)

export function useAdmins() {
  return useRequest(fetchAdmins)
}

export const createAdmin = (fields) => api.post('/admins/', fields).then(({ data }) => data)

export const updateAdmin = (id, fields) =>
  api.patch(`/admins/${id}/`, fields).then(({ data }) => data)

export const deleteAdmin = (id) => api.delete(`/admins/${id}/`)

// Server boshqa seanslarni bekor qiladi, shu seans yangi tokenlar bilan davom etadi.
export async function changeOwnPassword(fields) {
  const { data } = await api.post('/auth/change-password/', fields)
  writeTokens(data)
}
