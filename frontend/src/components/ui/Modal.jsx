import Dialog from './Dialog.jsx'

export default function Modal({ width = 'max-w-[480px]', ...props }) {
  return (
    <Dialog
      {...props}
      className={`m-auto w-[calc(100%-32px)] rounded-2xl ${width}`}
    />
  )
}
