import { Check, CircleAlert, ImagePlus, Loader2, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createQuestion,
  deleteQuestion,
  fetchQuestion,
  removeQuestionImage,
  updateQuestion,
  uploadQuestionImage,
} from '../../../api/bank.js'
import { useRequest } from '../../../api/useRequest.js'
import { useFormErrors } from '../../../lib/useFormErrors.js'
import Alert from '../../ui/Alert.jsx'
import Button from '../../ui/Button.jsx'
import Checkbox from '../../ui/Checkbox.jsx'
import ConfirmModal from '../../ui/ConfirmModal.jsx'
import Drawer from '../../ui/Drawer.jsx'
import EmptyState from '../../ui/EmptyState.jsx'
import Field from '../../ui/Field.jsx'

const LETTERS = ['A', 'B', 'C', 'D']
const FORM_ID = 'question-form'
const MAX_IMAGE_BYTES = 2 * 1024 * 1024
const EMPTY_OPTIONS = LETTERS.map(() => ({ text: '', is_correct: false }))

function OptionRow({ letter, option, correctLocked, onText, onSelect }) {
  const correct = option.is_correct

  return (
    <div
      className={`flex items-center gap-3 rounded-xl px-3 py-2 ${
        correct ? 'border-2 border-success bg-success-soft' : 'border border-border-400'
      }`}
    >
      <input
        type="radio"
        name="correct-option"
        checked={correct}
        disabled={correctLocked}
        onChange={onSelect}
        aria-label={`${letter} variant to'g'ri javob`}
        className={`size-5 shrink-0 ${correct ? 'accent-success' : 'accent-brand-700'}`}
      />
      <span className={`font-bold ${correct ? 'text-success' : 'text-ink-600'}`}>{letter}</span>
      <input
        type="text"
        value={option.text}
        onChange={(event) => onText(event.target.value)}
        aria-label={`${letter} variant`}
        className="h-9 min-w-0 flex-1 bg-transparent text-[15px] text-ink-900"
      />
      {correct && (
        <span className="hidden text-[13px] font-bold whitespace-nowrap text-success sm:inline">
          To'g'ri javob
        </span>
      )}
    </div>
  )
}

function QuestionForm({ question, sets, defaultSet, onClose, onSaved }) {
  const [setId, setSetId] = useState(question?.question_set ?? defaultSet ?? '')
  const [text, setText] = useState(question?.text ?? '')
  const [options, setOptions] = useState(question?.options ?? EMPTY_OPTIONS)
  const [isActive, setIsActive] = useState(question?.is_active ?? true)
  const [imageUrl, setImageUrl] = useState(question?.image_url ?? null)
  const [imageFile, setImageFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  // Savol yozilib, rasm yuklanmasa, qayta bosish ikkinchi savol yaratmasligi kerak.
  const [savedId, setSavedId] = useState(question?.id ?? null)
  const { errors, clearErrors, setFieldError, clearField, captureError } = useFormErrors()
  const fileInput = useRef(null)

  useEffect(() => {
    if (!imageFile) return undefined
    return () => URL.revokeObjectURL(imageUrl)
  }, [imageFile, imageUrl])

  const setOption = (index, patch) => {
    setOptions(options.map((option, i) => (i === index ? { ...option, ...patch } : option)))
    clearField('options')
  }

  const markCorrect = (index) => {
    setOptions(options.map((option, i) => ({ ...option, is_correct: i === index })))
    clearField('options')
  }

  const handlePickImage = (event) => {
    const file = event.target.files[0]
    event.target.value = ''
    if (!file) return
    if (file.size > MAX_IMAGE_BYTES) {
      setFieldError('image', 'Rasm juda katta: 2 MB gacha rasm yuklang.')
      return
    }
    clearField('image')
    setImageFile(file)
    setImageUrl(URL.createObjectURL(file))
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    setImageUrl(null)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    clearErrors()

    const fields = { question_set: Number(setId), text, options, is_active: isActive }
    try {
      const saved = savedId ? await updateQuestion(savedId, fields) : await createQuestion(fields)
      setSavedId(saved.id)

      if (imageFile) await uploadQuestionImage(saved.id, imageFile)
      else if (!imageUrl && question?.image_url) await removeQuestionImage(saved.id)

      onSaved()
    } catch (error) {
      captureError(error)
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    await deleteQuestion(question.id)
    onSaved()
  }

  const inUse = question?.in_use

  return (
    <Drawer
      open
      onClose={onClose}
      eyebrow={question ? `Savollar banki · № ${question.id}` : 'Savollar banki'}
      title={question ? 'Savolni tahrirlash' : 'Yangi savol'}
      footer={
        <>
          {question ? (
            <Button
              variant="dangerOutline"
              icon={Trash2}
              disabled={inUse}
              onClick={() => setConfirming(true)}
            >
              O'chirish
            </Button>
          ) : (
            <span />
          )}
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" icon={X} onClick={onClose}>
              Bekor qilish
            </Button>
            <Button type="submit" form={FORM_ID} icon={Check} loading={saving}>
              Saqlash
            </Button>
          </div>
        </>
      }
    >
      <form id={FORM_ID} noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Field
          as="select"
          label="Savol to'plami"
          value={setId}
          onChange={(event) => {
            setSetId(event.target.value)
            clearField('question_set')
          }}
          error={errors.fields.question_set}
        >
          <option value="">To'plamni tanlang</option>
          {sets.map((set) => (
            <option key={set.id} value={set.id}>
              {set.name}
            </option>
          ))}
        </Field>

        <Field
          as="textarea"
          rows={3}
          label="Savol matni"
          value={text}
          onChange={(event) => {
            setText(event.target.value)
            clearField('text')
          }}
          error={errors.fields.text}
        />

        <div className="flex flex-col items-start gap-3">
          {imageUrl && (
            <img
              src={imageUrl}
              alt="Savol rasmi"
              className="max-h-48 max-w-full rounded-xl border border-border-200"
            />
          )}
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            aria-label="Savol rasmi"
            onChange={handlePickImage}
            className="hidden"
          />
          <div className="flex flex-wrap gap-3">
            <Button
              variant="dashed"
              size="sm"
              icon={ImagePlus}
              onClick={() => fileInput.current.click()}
            >
              {imageUrl ? 'Rasmni almashtirish' : "Rasm qo'shish"}
            </Button>
            {imageUrl && (
              <Button variant="ghost" size="sm" icon={X} onClick={handleRemoveImage}>
                Rasmni olib tashlash
              </Button>
            )}
          </div>
          {errors.fields.image && <Alert tone="error">{errors.fields.image}</Alert>}
        </div>

        <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
          <legend className="mb-2 text-[13px] leading-[18px] font-semibold text-ink-600">
            Javob variantlari — to'g'risini belgilang
          </legend>
          {options.map((option, index) => (
            <OptionRow
              key={LETTERS[index]}
              letter={LETTERS[index]}
              option={option}
              correctLocked={inUse}
              onText={(value) => setOption(index, { text: value })}
              onSelect={() => markCorrect(index)}
            />
          ))}
          {errors.fields.options && <Alert tone="error">{errors.fields.options}</Alert>}
        </fieldset>

        <p className="m-0 text-[13px] leading-[19px] text-ink-600">
          Testda variantlar tartibi har bir tinglovchi uchun aralashtiriladi.
        </p>

        <Checkbox
          label="Faol — testlarga tushadi"
          checked={isActive}
          onChange={(event) => setIsActive(event.target.checked)}
        />

        {inUse && (
          <Alert tone="info">
            Bu savol testda ishlatilgan: uni o'chirib va to'g'ri javobini o'zgartirib bo'lmaydi.
            Testlarga tushmasligi uchun nofaol qiling.
          </Alert>
        )}
        {errors.form && <Alert tone="error">{errors.form}</Alert>}
      </form>

      {confirming && (
        <ConfirmModal
          title="Savolni o'chirasizmi?"
          onConfirm={handleDelete}
          onClose={() => setConfirming(false)}
        >
          <p className="m-0">Savol bankdan butunlay o'chiriladi, bu amalni ortga qaytarib bo'lmaydi.</p>
        </ConfirmModal>
      )}
    </Drawer>
  )
}

// questionId yo'q bo'lsa yangi savol ochiladi.
export default function QuestionDrawer({ questionId, sets, defaultSet, onClose, onSaved }) {
  const load = useCallback(
    () => (questionId ? fetchQuestion(questionId) : Promise.resolve(null)),
    [questionId],
  )
  const { data: question, loading, error } = useRequest(load)

  if (loading || error) {
    return (
      <Drawer open onClose={onClose} title="Savol">
        {error ? (
          <EmptyState icon={CircleAlert} tone="error" title="Yuklab bo'lmadi" description={error} />
        ) : (
          <EmptyState icon={Loader2} spin title="Yuklanmoqda" />
        )}
      </Drawer>
    )
  }

  return (
    <QuestionForm
      question={question}
      sets={sets}
      defaultSet={defaultSet}
      onClose={onClose}
      onSaved={onSaved}
    />
  )
}
