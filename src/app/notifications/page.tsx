'use client'

export const dynamic = 'force-dynamic'


import { useEffect, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { createClient } from '@/lib/supabase/client'
import { useStore } from '@/store/useStore'
import type { Notification } from '@/types/database'
import { Bell, CheckCheck, Info, CheckCircle2, AlertTriangle, XCircle, Loader2, Trash2 } from 'lucide-react'
import { cn, formatDateTime } from '@/lib/utils'
import Link from 'next/link'
import toast from 'react-hot-toast'

const typeConfig = {
  info: { icon: Info, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/30' },
  success: { icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' },
  warning: { icon: AlertTriangle, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/30' },
  error: { icon: XCircle, color: 'text-red-500 bg-red-50 dark:bg-red-950/30' },
}

export default function NotificationsPage() {
  const supabase = createClient()
  const { profile, setNotifications } = useStore()
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    if (!profile) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setNotifs(data || [])
    setLoading(false)
    setNotifications(0)
  }

  useEffect(() => { load() }, [profile])

  const markAll = async () => {
    if (!profile) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('notifications') as any).update({ is_read: true }).eq('user_id', profile.id).eq('is_read', false)
    setNotifs(n => n.map(x => ({ ...x, is_read: true })))
    toast.success('All marked as read')
  }

  const markOne = async (id: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('notifications') as any).update({ is_read: true }).eq('id', id)
    setNotifs(n => n.map(x => x.id === id ? { ...x, is_read: true } : x))
  }

  const deleteNotif = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id)
    setNotifs(n => n.filter(x => x.id !== id))
  }

  const unread = notifs.filter(n => !n.is_read).length

  return (
    <AppLayout title="Notifications">
      <div className="max-w-2xl mx-auto">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="page-title">Notifications</h1>
            <p className="page-subtitle">{unread > 0 ? `${unread} unread` : 'All caught up!'}</p>
          </div>
          {unread > 0 && (
            <button onClick={markAll} className="btn-secondary text-xs gap-2">
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-blue-600" /></div>
        ) : notifs.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <Bell className="w-10 h-10 text-slate-300" />
            <p className="text-slate-500 font-medium">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifs.map(n => {
              const { icon: Icon, color } = typeConfig[n.type] || typeConfig.info
              return (
                <div key={n.id}
                  className={cn('card p-4 flex items-start gap-3 transition-all', !n.is_read && 'ring-1 ring-blue-200 dark:ring-blue-800')}
                  onClick={() => !n.is_read && markOne(n.id)}>
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', color)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn('text-sm font-medium', n.is_read ? 'text-slate-600 dark:text-slate-400' : 'text-slate-900 dark:text-white')}>
                        {n.title}
                      </p>
                      {!n.is_read && <div className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0 mt-1" />}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] text-slate-400">{formatDateTime(n.created_at)}</span>
                      {n.link && (
                        <Link href={n.link} className="text-[10px] text-blue-600 hover:underline">View →</Link>
                      )}
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); deleteNotif(n.id) }}
                    className="flex-shrink-0 p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
