'use client'

import { ThemeProvider } from 'next-themes'
import { Toaster } from 'react-hot-toast'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      {children}
      <Toaster position="top-right" toastOptions={{
        className: '!bg-white dark:!bg-slate-800 !text-slate-900 dark:!text-white !border !border-slate-200 dark:!border-slate-700 !shadow-lg',
      }} />
    </ThemeProvider>
  )
}
