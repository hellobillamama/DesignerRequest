'use client'

export const dynamic = 'force-dynamic'


import { useEffect, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/database'
import { Users, Shield, Edit, Check, X, Search, UserPlus, Loader2 } from 'lucide-react'
import { cn, formatDateTime } from '@/lib/utils'
import toast from 'react-hot-toast'

const ROLES = ['admin', 'designer', 'viewer'] as const

export default function UsersPage() {
  const supabase = createClient()
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editRole, setEditRole] = useState<'admin' | 'designer' | 'viewer'>('designer')
  const [editDept, setEditDept] = useState('')

  const load = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    setUsers(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filteredUsers = users.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  const startEdit = (u: Profile) => {
    setEditingId(u.id)
    setEditRole(u.role)
    setEditDept(u.department || '')
  }

  const saveEdit = async (id: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('profiles') as any).update({
      role: editRole,
      department: editDept || null,
    }).eq('id', id)
    if (error) { toast.error('Failed to update user'); return }
    toast.success('User updated!')
    setEditingId(null)
    load()
  }

  const toggleActive = async (u: Profile) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('profiles') as any).update({ is_active: !u.is_active }).eq('id', u.id)
    toast.success(`User ${u.is_active ? 'deactivated' : 'activated'}`)
    load()
  }

  const roleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-50 dark:bg-red-950/30 text-red-600'
      case 'designer': return 'bg-blue-50 dark:bg-blue-950/30 text-blue-600'
      default: return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
    }
  }

  return (
    <AppLayout title="Users">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">{users.length} users registered</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search users..." className="input pl-9" />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-blue-600" /></div>
      ) : (
        <div className="table-wrapper">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">User</th>
                <th className="th hidden md:table-cell">Department</th>
                <th className="th">Role</th>
                <th className="th hidden lg:table-cell">Joined</th>
                <th className="th">Status</th>
                <th className="th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => (
                <tr key={u.id} className="table-row">
                  <td className="td">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-semibold">
                          {u.full_name?.charAt(0) || u.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white text-xs">{u.full_name || '(No name)'}</p>
                        <p className="text-[10px] text-slate-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="td hidden md:table-cell text-slate-600 dark:text-slate-400 text-xs">
                    {editingId === u.id ? (
                      <input value={editDept} onChange={e => setEditDept(e.target.value)}
                        className="input text-xs py-1" placeholder="Department" />
                    ) : (u.department || '—')}
                  </td>
                  <td className="td">
                    {editingId === u.id ? (
                      <select value={editRole} onChange={e => setEditRole(e.target.value as typeof editRole)}
                        className="input text-xs py-1">
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    ) : (
                      <span className={cn('badge text-[10px]', roleColor(u.role))}>
                        {u.role === 'admin' && <Shield className="w-2.5 h-2.5" />}
                        {u.role}
                      </span>
                    )}
                  </td>
                  <td className="td hidden lg:table-cell text-slate-400 text-xs">{formatDateTime(u.created_at)}</td>
                  <td className="td">
                    <div className={cn('w-2 h-2 rounded-full inline-block', u.is_active ? 'bg-emerald-500' : 'bg-slate-300')} />
                    <span className="text-xs text-slate-500 ml-1.5">{u.is_active ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td className="td">
                    {editingId === u.id ? (
                      <div className="flex gap-1.5">
                        <button onClick={() => saveEdit(u.id)}
                          className="p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 hover:bg-emerald-100">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setEditingId(null)}
                          className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-1.5">
                        <button onClick={() => startEdit(u)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  )
}
