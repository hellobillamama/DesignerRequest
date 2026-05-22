'use client'

import AppLayout from '@/components/layout/AppLayout'
import { Bell } from 'lucide-react'

export default function NotificationsPage() {
  return (
    <AppLayout title="Notifications">
      <div className="max-w-2xl mx-auto">
        <div className="mb-5"><h1 className="page-title">Notifications</h1><p className="page-subtitle">All caught up!</p></div>
        <div className="flex flex-col items-center py-16 gap-3">
          <Bell className="w-10 h-10 text-slate-300" />
          <p className="text-slate-500 font-medium">No notifications yet</p>
          <p className="text-xs text-slate-400">Notifications will appear here when requests are approved or rejected.</p>
        </div>
      </div>
    </AppLayout>
  )
}
