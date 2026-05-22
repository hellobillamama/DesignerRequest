import type { Metadata } from 'next'
import Providers from '@/components/providers/Providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'MateriX — Material Management System',
  description: 'Fast material stock management and designer request system for garment/fashion industry',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
