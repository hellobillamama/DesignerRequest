'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useStore } from '@/store/useStore'
import Sidebar from './Sidebar'
import Header from './Header'
import { cn } from '@/lib/utils'

interface AppLayoutProps {
  children: React.ReactNode
  title?: string
}

export default function AppLayout({ children, title }: AppLayoutProps) {
  const { sidebarOpen, setProfile } = useStore()
  const { data: session } = useSession()

  useEffect(() => {
    if (session?.user) {
      setProfile({
        email: session.user.email || '',
        name: session.user.name || '',
        image: session.user.image || undefined,
        role: (session.user as Record<string, unknown>).role as string || 'designer',
        department: (session.user as Record<string, unknown>).department as string || '',
      })
    }
  }, [session, setProfile])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0f1c]">
      <Sidebar />
      <Header title={title} />
      <main className={cn(
        'pt-16 min-h-screen transition-all duration-300',
        sidebarOpen ? 'lg:pl-64' : 'lg:pl-16'
      )}>
        <div className="p-4 md:p-6 animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  )
}
