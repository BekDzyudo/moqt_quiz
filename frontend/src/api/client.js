import axios from 'axios'
import { clearTokens, readTokens, writeTokens } from './tokens.js'

const baseURL = import.meta.env.VITE_API_URL ?? '/api/v1'

export const api = axios.create({ baseURL })

let sessionEndListener = () => {}
let refreshing = null

export function onSessionEnd(listener) {
  sessionEndListener = listener
}

function endSession(message) {
  clearTokens()
  sessionEndListener(message)
}

// Bir vaqtda kelgan 401'lar uchun bitta refresh so'rovi yuboriladi.
function refreshAccess() {
  refreshing ??= axios
    .post(`${baseURL}/auth/refresh/`, { refresh: readTokens()?.refresh })
    .then(({ data }) => {
      writeTokens({ ...readTokens(), access: data.access })
      return data.access
    })
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

api.interceptors.request.use((config) => {
  const access = readTokens()?.access
  if (access) config.headers.Authorization = `Bearer ${access}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error
    if (response?.status !== 401 || !readTokens()) throw error

    if (response.data?.code === 'session_replaced') {
      endSession(response.data.detail)
      throw error
    }

    if (config.retried) {
      endSession(response.data?.detail)
      throw error
    }

    let access
    try {
      access = await refreshAccess()
    } catch (refreshError) {
      // Aloqa uzilganda seans tugamaydi: faqat server rad etsa chiqariladi.
      if (refreshError.response?.status === 401) endSession(refreshError.response.data?.detail)
      throw refreshError
    }

    config.retried = true
    config.headers.Authorization = `Bearer ${access}`
    return api(config)
  },
)

export function errorMessage(error) {
  return (
    error.response?.data?.detail ??
    "Serverga ulanib bo'lmadi. Internet aloqasini tekshirib, qayta urining."
  )
}
