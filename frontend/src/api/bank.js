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

export function useQuestions({ set, source, isActive, q, page }) {
  return useRequest(
    useCallback(
      () =>
        api
          .get('/questions/', { params: clean({ set, source, is_active: isActive, q, page }) })
          .then(data),
      [set, source, isActive, q, page],
    ),
  )
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

export function previewImport(file, questionSet) {
  const form = new FormData()
  form.append('file', file)
  form.append('question_set', questionSet)
  return api.post('/questions/import/preview/', form).then(data)
}

export const commitImport = (token) => api.post('/questions/import/commit/', { token }).then(data)

export async function downloadImportTemplate(extension) {
  const { data: blob } = await api.get(`/questions/import/template.${extension}`, {
    responseType: 'blob',
  })
  saveBlob(blob, `savollar-shabloni.${extension}`)
}
