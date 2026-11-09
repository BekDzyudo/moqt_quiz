import { adaptMyTest } from './adapters.js'
import { api } from './client.js'

const data = ({ data: body }) => body

export const fetchMyTest = () => api.get('/me/test/').then(data).then(adaptMyTest)
export const startTest = () => api.post('/me/test/start/').then(data)

export const fetchAttempt = (id) => api.get(`/attempts/${id}/`).then(data)
export const fetchQuestion = (id, n) => api.get(`/attempts/${id}/questions/${n}/`).then(data)

export const saveAnswer = (id, n, key, timeSpentMs) =>
  api.put(`/attempts/${id}/answers/${n}/`, { key, time_spent_ms: timeSpentMs }).then(data)

export const sendEvent = (id, type, meta) =>
  api.post(`/attempts/${id}/events/`, { type, meta }).then(data)

export const unlockExit = (id, password) =>
  api.post(`/attempts/${id}/exit-unlock/`, { password }).then(data)

export const finishAttempt = (id) => api.post(`/attempts/${id}/finish/`).then(data)
export const fetchResult = (id) => api.get(`/attempts/${id}/result/`).then(data)
