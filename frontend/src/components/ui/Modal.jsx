import Dialog from './Dialog.jsx'

export default function Modal({ wide = false, ...props }) {
  return (
    <Dialog
      {...props}
      className={`m-auto w-[calc(100%-32px)] rounded-2xl ${wide ? 'max-w-[760px]' : 'max-w-[520px]'}`}
    />
  )
}
