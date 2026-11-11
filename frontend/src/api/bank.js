import { useCallback } from 'react'
import { saveBlob } from '../lib/download.js'
import { api } from './client.js'
import { useRequest } from './useRequest.js'

const data = ({ data: body }) => body

const clean = (filters) =>
  Object.fromEntries(Object.entries(filters).filter(([, value]) => value))

const fetchSets = () => api.get('/question-sets/').then(data)

export const useQuestionSets = () => useRequest(fetchSets)

export const createQuestionSet = (fields) => api.post('/question-sets/', fields).then(data)
export const updateQuestionSet = (id, fields) =>
  api.patch(`/question-sets/${id}/`, fields).then(data)
export const deleteQuestionSet = (id) => api.delete(`/question-sets/${id}/`)
export const syncQuestionSet = (id) => api.post(`/question-sets/${id}/sync-api/`).then(data)

// Savollar ro'yxati filtrlari: backend `filtered_questions` bilan bir xil nomlar.
const questionParams = ({ set, category, source, isActive, hasImage, inUse, q, ordering, page, pageSize }) =>
  clean({
    set,
    category,
    source,
    is_active: isActive,
    has_image: hasImage,
    in_use: inUse,
    q,
    ordering,
    page,
    page_size: pageSize,
  })

export function useQuestions(filters) {
  const key = JSON.stringify(questionParams(filters))
  return useRequest(useCallback(() => api.get('/questions/', { params: JSON.parse(key) }).then(data), [key]))
}

// action: activate | deactivate | move | delete
export const bulkQuestions = (action, ids, questionSet) =>
  api.post('/questions/bulk/', { action, ids, question_set: questionSet }).then(data)

export async function downloadQuestions(filters) {
  // Eksport sahifalanmaydi: joriy filtr bo'yicha hammasi.
  const { data: blob } = await api.get('/questions/export.xlsx', {
    params: questionParams({ ...filters, page: undefined, pageSize: undefined }),
    responseType: 'blob',
  })
  saveBlob(blob, 'savollar.xlsx')
}

export const fetchQuestion = (id) => api.get(`/questions/${id}/`).then(data)
export const createQuestion = (fields) => api.post('/questions/', fields).then(data)
export const updateQuestion = (id, fields) => api.patch(`/questions/${id}/`, fields).then(data)
export const deleteQuestion = (id) => api.delete(`/questions/${id}/`)

export function uploadQuestionImage(id, file) {
  const form = new FormData()
  form.append('image', file)
  return api.post(`/questions/${id}/image/`, form)
}

export const removeQuestionImage = (id) => api.delete(`/questions/${id}/image/`)

// Backend xatosi: {row, message}. Sahifa {row, errors[], status} kutadi.
const toProblem = (problem, index) => ({
  ...problem,
  id: `${problem.row ?? 'fayl'}-${index}`,
  errors: problem.errors ?? [problem.message],
  status: /takror|allaqachon bor/i.test(problem.message ?? '') ? 'duplicate' : 'invalid',
})

export function previewImport(file, questionSet) {
  const form = new FormData()
  form.append('file', file)
  form.append('question_set', questionSet)
  return api
    .post('/questions/import/preview/', form)
    .then(data)
    .then((preview) => ({ ...preview, problems: (preview.problems ?? []).map(toProblem) }))
}

export const commitImport = (token) => api.post('/questions/import/commit/', { token }).then(data)

export async function downloadImportTemplate(extension) {
  const { data: blob } = await api.get(`/questions/import/template.${extension}`, {
    responseType: 'blob',
  })
  saveBlob(blob, `savollar-shabloni.${extension}`)
}
