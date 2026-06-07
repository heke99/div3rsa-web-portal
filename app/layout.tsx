import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Div3rsa Portal',
  description: 'Kundportal och adminpanel för Div3rsa.',
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body>{children}</body>
    </html>
  )
}
