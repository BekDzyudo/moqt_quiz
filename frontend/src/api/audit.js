import { useCallback } from 'react'
import { saveBlob } from '../lib/download.js'
import { api } from './client.js'
import { useRequest } from './useRequest.js'

// Bo'sh filtrlar so'rovga qo'shilmaydi.
const clean = (filters) =>
  Object.fromEntries(Object.entries(filters).filter(([, value]) => value))

export function useAuditLog({ actor, action, date, page }) {
  return useRequest(
    useCallback(
      () =>
        api
          .get('/audit/', { params: clean({ actor, action, date, page }) })
          .then(({ data }) => data),
      [actor, action, date, page],
    ),
  )
}

export async function downloadAuditExcel(filters) {
  const { data } = await api.get('/audit/export.xlsx', {
    params: clean(filters),
    responseType: 'blob',
  })
  saveBlob(data, 'amallar-jurnali.xlsx')
}
