'use client'

import AppLayout from '@/components/layout/AppLayout'
import { useStore } from '@/store/useStore'
import { Settings, User, Shield } from 'lucide-react'

export default function SettingsPage() {
  const { profile } = useStore()

  return (
    <AppLayout title="Settings">
      <div className="max-w-xl mx-auto">
        <div className="mb-5"><h1 className="page-title">Settings</h1><p className="page-subtitle">Your account information</p></div>

        <div className="card p-5 mb-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><User className="w-4 h-4 text-slate-400" /> Profile</h3>
          <div className="space-y-3">
            <div><label className="label">Name</label><input disabled value={profile?.name || ''} className="input opacity-60" /></div>
            <div><label className="label">Email</label><input disabled value={profile?.email || ''} className="input opacity-60" /></div>
            <div><label className="label">Role</label><div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200"><Shield className="w-4 h-4 text-slate-400" /><span className="text-sm font-medium capitalize">{profile?.role}</span><span className="text-xs text-slate-400 ml-auto">Contact admin to change</span></div></div>
            <div><label className="label">Department</label><input disabled value={profile?.department || 'Not set'} className="input opacity-60" /></div>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><Settings className="w-4 h-4 text-slate-400" /> App Info</h3>
          <div className="space-y-2">
            {[{ label: 'App', value: 'MateriX v2.0' }, { label: 'Database', value: 'Google Sheets' }, { label: 'Auth', value: 'Google OAuth' }, { label: 'Framework', value: 'Next.js 14' }].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0">
                <span className="text-xs text-slate-500">{label}</span><span className="text-xs font-medium">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
