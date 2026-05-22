'use client'

export const dynamic = 'force-dynamic'


import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { createClient } from '@/lib/supabase/client'
import { useStore } from '@/store/useStore'
import { Settings, User, Bell, Shield, Save, Loader2, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const supabase = createClient()
  const { profile, setProfile } = useStore()
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [department, setDepartment] = useState(profile?.department || '')
  const [saving, setSaving] = useState(false)

  const saveProfile = async () => {
    if (!profile) return
    setSaving(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('profiles') as any).update({ full_name: fullName, department }).eq('id', profile.id).select().single()
    if (error) { toast.error('Failed to save'); setSaving(false); return }
    setProfile({ ...profile, full_name: fullName, department })
    toast.success('Profile saved!')
    setSaving(false)
  }

  return (
    <AppLayout title="Settings">
      <div className="max-w-xl mx-auto">
        <div className="mb-5">
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your account and preferences</p>
        </div>

        {/* Profile */}
        <div className="card p-5 mb-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-slate-400" />
            Profile Settings
          </h3>
          <div className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input value={fullName} onChange={e => setFullName(e.target.value)} className="input" placeholder="Your full name" />
            </div>
            <div>
              <label className="label">Email</label>
              <input disabled value={profile?.email || ''} className="input opacity-60" />
              <p className="text-[10px] text-slate-400 mt-1">Email cannot be changed here</p>
            </div>
            <div>
              <label className="label">Department</label>
              <input value={department} onChange={e => setDepartment(e.target.value)} className="input" placeholder="e.g. Design, Production" />
            </div>
            <div>
              <label className="label">Role</label>
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <Shield className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium capitalize text-slate-700 dark:text-slate-300">{profile?.role}</span>
                <span className="text-xs text-slate-400 ml-auto">Contact admin to change</span>
              </div>
            </div>
            <button onClick={saveProfile} disabled={saving} className="btn-primary w-full justify-center">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
        </div>

        {/* App info */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Settings className="w-4 h-4 text-slate-400" />
            Application Info
          </h3>
          <div className="space-y-2">
            {[
              { label: 'App Name', value: 'MateriX — Material Management System' },
              { label: 'Version', value: '1.0.0' },
              { label: 'Database', value: 'Supabase PostgreSQL' },
              { label: 'Framework', value: 'Next.js 14 + TypeScript' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
                <span className="text-xs text-slate-500">{label}</span>
                <span className="text-xs font-medium text-slate-900 dark:text-white">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
