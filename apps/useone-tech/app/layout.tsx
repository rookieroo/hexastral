import './globals.css'
import { createMetadata } from '@/lib/content/metadata'

export const metadata = createMetadata({
  title: {
    template: '%s | UseONE Tech',
    default: 'UseONE Tech',
  },
  description:
    'All-in-one platform for online growth. Build, distribute, and market your digital presence.',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
