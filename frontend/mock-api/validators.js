export const MIN_PASSWORD_LENGTH = 8

const USERNAME_PATTERN = /^[A-Za-z0-9._-]{3,32}$/

export function usernameError(username, users, currentUser = null) {
  if (!USERNAME_PATTERN.test(username)) {
    return "Login 3–32 belgidan iborat bo'lsin: lotin harflari, raqamlar, nuqta, chiziqcha."
  }
  const taken = users.some(
    (user) => user !== currentUser && user.username?.toLowerCase() === username.toLowerCase(),
  )
  return taken ? 'Bu login band. Boshqa login kiriting.' : undefined
}

export function passwordError(password) {
  return typeof password === 'string' && password.length >= MIN_PASSWORD_LENGTH
    ? undefined
    : `Parol kamida ${MIN_PASSWORD_LENGTH} belgidan iborat bo'lsin.`
}
