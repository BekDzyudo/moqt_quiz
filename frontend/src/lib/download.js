export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function saveBase64(base64, filename, type) {
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))
  saveBlob(new Blob([bytes], { type }), filename)
}
