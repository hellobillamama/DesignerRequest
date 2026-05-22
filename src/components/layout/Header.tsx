'use client'

import { useStore } from '@/store/useStore'
import { Menu, Bell, Sun, Moon, Search } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function Header({ title }: { title?: string }) {
  const { toggleSidebar, sidebarOpen, notifications } = useStore()
  const { theme, setTheme } = useTheme()
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/materials?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
    }
  }

  return (
    <header className={cn(
      'fixed top-0 right-0 h-16 z-10 flex items-center gap-3 px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 transition-all duration-300',
      sidebarOpen ? 'left-64' : 'left-16'
    )}>
      <button onClick={toggleSidebar}
        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors lg:hidden">
        <Menu className="w-5 h-5" />
      </button>

      {title && (
        <h1 className="font-semibold text-slate-900 dark:text-white text-sm hidden md:block">{title}</h1>
      )}

      <form onSubmit={handleSearch} className="flex-1 max-w-md ml-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            type="search"
            placeholder="Search materials, codes, colors..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg bg-slate-100 dark:bg-slate-800 border-0 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </form>

      <div className="ml-auto flex items-center gap-1">
        <Link href="/notifications"
          className="relative p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <Bell className="w-5 h-5" />
          {notifications > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </Link>

        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>
    </header>
  )
}
