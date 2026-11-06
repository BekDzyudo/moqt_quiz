// 1284 -> "1 284"
export const formatCount = (value) => String(value).replace(/\B(?=(\d{3})+$)/g, ' ')
