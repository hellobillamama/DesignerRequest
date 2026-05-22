'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useStore } from '@/store/useStore'
import {
  LayoutDashboard, Package, QrCode, Upload, ClipboardList,
  Users, BarChart3, Bell, Settings, Package2, ChevronLeft,
  History, MapPin, FileText, LogOut,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navItems = [
  {
    group: 'Main',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/materials', label: 'Materials', icon: Package },
      { href: '/scanner', label: 'QR Scanner', icon: QrCode },
      { href: '/requests', label: 'Requests', icon: ClipboardList },
    ],
  },
  {
    group: 'Management',
    items: [
      { href: '/upload', label: 'Stock Upload', icon: Upload, adminOnly: true },
      { href: '/inventory', label: 'Issue History', icon: History },
      { href: '/locations', label: 'Rack Locations', icon: MapPin, adminOnly: true },
      { href: '/reports', label: 'Reports', icon: FileText, adminOnly: true },
    ],
  },
  {
    group: 'Admin',
    adminOnly: true,
    items: [
      { href: '/analytics', label: 'Analytics', icon: BarChart3, adminOnly: true },
      { href: '/users', label: 'Users', icon: Users, adminOnly: true },
      { href: '/notifications', label: 'Notifications', icon: Bell },
      { href: '/settings', label: 'Settings', icon: Settings, adminOnly: true },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { sidebarOpen, toggleSidebar, profile } = useStore()
  const isAdmin = profile?.role === 'admin'
  const supabase = createClient()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={toggleSidebar} />
      )}

      <aside className={cn(
        'fixed top-0 left-0 h-full z-30 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 transition-all duration-300',
        sidebarOpen ? 'w-64' : 'w-16',
      )}>
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Package2 className="w-4 h-4 text-white" />
            </div>
            {sidebarOpen && (
              <span className="font-bold text-slate-900 dark:text-white truncate text-sm">MateriX</span>
            )}
          </Link>
          <button onClick={toggleSidebar}
            className="flex-shrink-0 p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <ChevronLeft className={cn('w-4 h-4 transition-transform duration-300', !sidebarOpen && 'rotate-180')} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-thin">
          {navItems.map((group) => {
            if (group.adminOnly && !isAdmin) return null
            const visibleItems = group.items.filter(i => !i.adminOnly || isAdmin)
            if (visibleItems.length === 0) return null
            return (
              <div key={group.group} className="mb-5">
                {sidebarOpen && (
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-600 px-2 mb-1.5">
                    {group.group}
                  </p>
                )}
                <ul className="space-y-0.5">
                  {visibleItems.map(({ href, label, icon: Icon }) => {
                    const isActive = pathname === href || pathname.startsWith(href + '/')
                    return (
                      <li key={href}>
                        <Link href={href}
                          className={cn(isActive ? 'nav-link-active' : 'nav-link-inactive',
                            !sidebarOpen && 'justify-center px-2'
                          )}
                          title={!sidebarOpen ? label : undefined}>
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          {sidebarOpen && <span className="truncate">{label}</span>}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </nav>

        {/* User profile + logout */}
        <div className="border-t border-slate-200 dark:border-slate-700 p-3 flex-shrink-0">
          {sidebarOpen ? (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-semibold">
                  {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                  {profile?.full_name || 'User'}
                </p>
                <p className="text-[10px] text-slate-400 capitalize">{profile?.role || 'designer'}</p>
              </div>
              <button onClick={handleLogout}
                className="flex-shrink-0 p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                title="Sign out">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button onClick={handleLogout}
              className="w-full flex justify-center p-2 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
              title="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>
    </>
  )
}
