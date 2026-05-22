'use client'

import { useEffect, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { Users, Shield, Edit, Check, X, Search, Loader2 } from 'lucide-react'
import { cn, formatDateTime } from '@/lib/utils'
import toast from 'react-hot-toast'

interface User { email: string; name: string; role: string; department: string; is_active: string; created_at: string }

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editingEmail, setEditingEmail] = useState<string | null>(null)
  const [editRole, setEditRole] = useState('designer')
  const [editDept, setEditDept] = useState('')

  const load = () => { fetch('/api/users').then(r => r.json()).then(d => { setUsers(d.users || []); setLoading(false) }) }
  useEffect(() => { load() }, [])

  const filtered = users.filter(u => u.name?.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))

  const startEdit = (u: User) => { setEditingEmail(u.email); setEditRole(u.role); setEditDept(u.department) }

  const saveEdit = async () => {
    const res = await fetch('/api/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: editingEmail, role: editRole, department: editDept }) })
    if (res.ok) { toast.success('User updated!'); setEditingEmail(null); load() } else toast.error('Failed')
  }

  return (
    <AppLayout title="Users">
      <div className="mb-5"><h1 className="page-title">User Management</h1><p className="page-subtitle">{users.length} users registered</p></div>
      <div className="relative mb-4 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="input pl-9" /></div>

      {loading ? <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-blue-600" /></div> : (
        <div className="table-wrapper"><table className="w-full"><thead><tr><th className="th">User</th><th className="th hidden md:table-cell">Department</th><th className="th">Role</th><th className="th hidden lg:table-cell">Joined</th><th className="th">Actions</th></tr></thead>
          <tbody>{filtered.map(u => (
            <tr key={u.email} className="table-row">
              <td className="td"><div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center"><span className="text-white text-xs font-semibold">{u.name?.charAt(0) || u.email.charAt(0).toUpperCase()}</span></div><div><p className="font-medium text-xs">{u.name || '(No name)'}</p><p className="text-[10px] text-slate-400">{u.email}</p></div></div></td>
              <td className="td hidden md:table-cell text-xs">{editingEmail === u.email ? <input value={editDept} onChange={e => setEditDept(e.target.value)} className="input text-xs py-1" /> : (u.department || '—')}</td>
              <td className="td">{editingEmail === u.email ? <select value={editRole} onChange={e => setEditRole(e.target.value)} className="input text-xs py-1"><option value="admin">admin</option><option value="designer">designer</option><option value="viewer">viewer</option></select> : <span className={cn('badge text-[10px]', u.role === 'admin' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600')}>{u.role === 'admin' && <Shield className="w-2.5 h-2.5" />}{u.role}</span>}</td>
              <td className="td hidden lg:table-cell text-slate-400 text-xs">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
              <td className="td">{editingEmail === u.email ? <div className="flex gap-1.5"><button onClick={saveEdit} className="p-1.5 rounded-md bg-emerald-50 text-emerald-600"><Check className="w-3.5 h-3.5" /></button><button onClick={() => setEditingEmail(null)} className="p-1.5 rounded-md bg-slate-100 text-slate-500"><X className="w-3.5 h-3.5" /></button></div> : <button onClick={() => startEdit(u)} className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50"><Edit className="w-3.5 h-3.5" /></button>}</td>
            </tr>
          ))}</tbody></table></div>
      )}
    </AppLayout>
  )
}
