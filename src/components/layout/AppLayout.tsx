'use client'

import { useEffect } from 'react'
import { useStore } from '@/store/useStore'
import { createClient } from '@/lib/supabase/client'
import Sidebar from './Sidebar'
import Header from './Header'
import { cn } from '@/lib/utils'

interface AppLayoutProps {
  children: React.ReactNode
  title?: string
}

export default function AppLayout({ children, title }: AppLayoutProps) {
  const { sidebarOpen, setProfile } = useStore()
  const supabase = createClient()

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (data) setProfile(data)
      }
    }
    fetchProfile()
  }, [supabase, setProfile])

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
