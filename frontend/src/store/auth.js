import { create } from 'zustand'
import { api, errorMessage, onSessionEnd } from '../api/client.js'
import { clearTokens, readTokens, writeTokens } from '../api/tokens.js'

export const useAuth = create((set) => ({
  // booting: saqlangan token tekshirilmoqda; failed: server javob bermadi; ready: holat aniq
  status: 'booting',
  bootError: null,
  user: null,
  notice: null,

  bootstrap: async () => {
    if (!readTokens()) {
      set({ status: 'ready', user: null })
      return
    }

    set({ status: 'booting', bootError: null })
    try {
      const { data } = await api.get('/auth/me/')
      set({ status: 'ready', user: data })
    } catch (error) {
      if (!readTokens()) return
      set({ status: 'failed', bootError: errorMessage(error) })
    }
  },

  login: async (username, password) => {
    // Login oynasida oldingi seansning tokeni qolmaydi, shuning uchun 401 refreshga ketmaydi.
    clearTokens()
    set({ notice: null })
    const { data } = await api.post('/auth/login/', { username, password })
    writeTokens({ access: data.access, refresh: data.refresh })
    const { data: me } = await api.get('/auth/me/')
    set({ user: me })
  },

  logout: async () => {
    const refresh = readTokens()?.refresh
    try {
      await api.post('/auth/logout/', { refresh })
    } catch {
      // Server javob bermasa ham foydalanuvchi shu qurilmada tizimdan chiqadi.
    }
    clearTokens()
    set({ user: null, notice: null })
  },
}))

onSessionEnd((message) => {
  useAuth.setState({ status: 'ready', user: null, notice: message ?? null })
})
