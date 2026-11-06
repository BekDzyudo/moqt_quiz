// Bir-biriga o'xshash belgilar (0/O, 1/l/I) yo'q: parol varaqdan qo'lda teriladi.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
const LENGTH = 12

// 256 ga karrali bo'lmagan qiymatlar tashlanadi, aks holda ba'zi belgilar ko'proq tushadi.
const MAX_UNBIASED = 256 - (256 % ALPHABET.length)

export function generatePassword() {
  let password = ''
  while (password.length < LENGTH) {
    for (const byte of crypto.getRandomValues(new Uint8Array(LENGTH * 2))) {
      if (byte < MAX_UNBIASED && password.length < LENGTH) {
        password += ALPHABET[byte % ALPHABET.length]
      }
    }
  }
  return password
}
