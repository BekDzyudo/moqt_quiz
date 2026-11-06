import { useState } from 'react'
import { errorMessage } from '../api/client.js'

const NONE = { fields: {}, form: null }

// Maydon xatosi foydalanuvchi shu maydonni o'zgartirishi bilan yo'qoladi.
export function useFormErrors() {
  const [errors, setErrors] = useState(NONE)

  return {
    errors,
    clearErrors: () => setErrors(NONE),
    setFieldError: (name, message) => setErrors({ fields: { [name]: message }, form: null }),
    clearField: (name) =>
      setErrors((current) => ({
        ...current,
        fields: { ...current.fields, [name]: undefined },
      })),
    captureError: (error) => {
      const fields = error.response?.data?.fields
      setErrors(fields ? { fields, form: null } : { fields: {}, form: errorMessage(error) })
    },
  }
}
