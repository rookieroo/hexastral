import { Toaster } from 'sonner'
export { Toaster } from 'sonner'
export { toast } from 'sonner'

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  )
}
