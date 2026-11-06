// sessionStorage: har bir vkladka alohida seans, brauzer yopilsa token o'chadi.
const KEY = 'moqt.tokens'

let cached = null

export function readTokens() {
  if (cached) return cached
  try {
    cached = JSON.parse(sessionStorage.getItem(KEY))
  } catch {
    cached = null
  }
  return cached
}

export function writeTokens(tokens) {
  cached = tokens
  try {
    sessionStorage.setItem(KEY, JSON.stringify(tokens))
  } catch {
    // Xotira yopiq bo'lsa ham seans sahifa ochiq turganda ishlaydi.
  }
}

export function clearTokens() {
  cached = null
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // O'chirib bo'lmasa ham, xotiradagi nusxa tozalandi.
  }
}
