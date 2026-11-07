import { create } from 'zustand'

const STORAGE_KEY = 'moqt.theme'
const DARK_THEME = 'ktri-dark'

// Boshlang'ich holatni public/theme-init.js qo'yadi.
const isDark = () => document.documentElement.dataset.theme === DARK_THEME

export const useTheme = create((set, get) => ({
  dark: isDark(),

  toggle: () => {
    const dark = !get().dark

    if (dark) document.documentElement.dataset.theme = DARK_THEME
    else delete document.documentElement.dataset.theme

    try {
      localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light')
    } catch {
      // Tanlov faqat shu sahifa uchun qoladi.
    }

    set({ dark })
  },
}))
