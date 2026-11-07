import Dialog from './Dialog.jsx'

export default function Drawer(props) {
  return (
    <Dialog
      {...props}
      drawer
      className="my-0 mr-0 ml-auto h-dvh max-h-dvh w-full max-w-[640px]"
    />
  )
}
