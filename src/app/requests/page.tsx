'use client'

import { useEffect, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { useStore } from '@/store/useStore'
import { ClipboardList, CheckCircle2, XCircle, Clock, Package, Loader2, Search, Check, X } from 'lucide-react'
import { cn, formatDateTime } from '@/lib/utils'
import toast from 'react-hot-toast'

const STATUS_TABS = [
  { value: '', label: 'All', icon: ClipboardList },
  { value: 'pending', label: 'Pending', icon: Clock },
  { value: 'approved', label: 'Approved', icon: CheckCircle2 },
  { value: 'rejected', label: 'Rejected', icon: XCircle },
  { value: 'issued', label: 'Issued', icon: Package },
]

interface Request {
  request_id: string
  request_number: string
  material_code: string
  material_name: string
  requested_by_email: string
  requested_by_name: string
  department: string
  requested_qty: string
  approved_qty: string
  purpose: string
  priority: string
  status: string
  notes: string
  admin_notes: string
  created_at: string
}

export default function RequestsPage() {
  const { profile } = useStore()
  const isAdmin = profile?.role === 'admin'

  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [selectedReq, setSelectedReq] = useState<Request | null>(null)
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve')
  const [adminNote, setAdminNote] = useState('')
  const [approvedQty, setApprovedQty] = useState('')

  const fetchRequests = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter) params.set('status', statusFilter)
    if (!isAdmin && profile?.email) params.set('email', profile.email)

    fetch(`/api/requests?${params}`)
      .then(r => r.json())
      .then(data => { setRequests(data.requests || []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { fetchRequests() }, [statusFilter, profile])

  const filteredRequests = requests.filter(r =>
    !search || r.material_name.toLowerCase().includes(search.toLowerCase()) || r.request_number.toLowerCase().includes(search.toLowerCase())
  )

  const handleAction = async () => {
    if (!selectedReq) return
    const status = actionType === 'approve' ? 'approved' : 'rejected'
    try {
      const res = await fetch('/api/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: selectedReq.request_id,
          status,
          admin_notes: adminNote,
          approved_qty: actionType === 'approve' ? parseFloat(approvedQty || selectedReq.requested_qty) : undefined,
          reviewed_by: profile?.name,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Request ${status}!`)
        setSelectedReq(null)
        setAdminNote('')
        fetchRequests()
      } else { toast.error('Failed to update') }
    } catch { toast.error('Failed to update') }
  }

  const pendingCount = requests.filter(r => r.status === 'pending').length

  return (
    <AppLayout title="Requests">
      <div className="mb-5">
        <h1 className="page-title">Material Requests</h1>
        <p className="page-subtitle">{isAdmin ? `${pendingCount} pending review` : 'Track your material requests'}</p>
      </div>

      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-4 overflow-x-auto">
        {STATUS_TABS.map(({ value, label, icon: Icon }) => (
          <button key={value} onClick={() => setStatusFilter(value)}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all',
              statusFilter === value ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by material or request #..." className="input pl-9" />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-blue-600" /></div>
      ) : filteredRequests.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-3">
          <ClipboardList className="w-10 h-10 text-slate-300" />
          <p className="text-slate-500 font-medium">No requests found</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Request #</th>
                <th className="th">Material</th>
                {isAdmin && <th className="th hidden md:table-cell">Requester</th>}
                <th className="th hidden sm:table-cell">Qty</th>
                <th className="th hidden md:table-cell">Purpose</th>
                <th className="th">Priority</th>
                <th className="th">Status</th>
                <th className="th hidden md:table-cell">Date</th>
                {isAdmin && <th className="th">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map(req => (
                <tr key={req.request_id} className="table-row">
                  <td className="td font-mono text-xs text-slate-500">{req.request_number}</td>
                  <td className="td">
                    <p className="font-medium text-slate-900 dark:text-white text-xs">{req.material_name}</p>
                    <p className="text-[10px] text-slate-400">{req.material_code}</p>
                  </td>
                  {isAdmin && <td className="td hidden md:table-cell text-xs">{req.requested_by_name}<br /><span className="text-slate-400">{req.department}</span></td>}
                  <td className="td hidden sm:table-cell font-semibold text-xs">{req.requested_qty}</td>
                  <td className="td hidden md:table-cell text-xs text-slate-600 max-w-[180px] truncate">{req.purpose}</td>
                  <td className="td">
                    <span className={cn('badge text-[10px] border',
                      req.priority === 'urgent' ? 'text-red-600 bg-red-50 border-red-200' :
                      req.priority === 'high' ? 'text-orange-600 bg-orange-50 border-orange-200' :
                      'text-blue-600 bg-blue-50 border-blue-200')}>{req.priority}</span>
                  </td>
                  <td className="td">
                    <span className={cn('badge text-[10px]',
                      req.status === 'pending' ? 'text-amber-600 bg-amber-50' :
                      req.status === 'approved' ? 'text-emerald-600 bg-emerald-50' :
                      req.status === 'rejected' ? 'text-red-600 bg-red-50' :
                      'text-blue-600 bg-blue-50')}>{req.status}</span>
                  </td>
                  <td className="td hidden md:table-cell text-xs text-slate-500">{req.created_at ? new Date(req.created_at).toLocaleDateString() : '—'}</td>
                  {isAdmin && (
                    <td className="td">
                      {req.status === 'pending' && (
                        <div className="flex gap-1.5">
                          <button onClick={() => { setSelectedReq(req); setActionType('approve'); setApprovedQty(req.requested_qty) }}
                            className="p-1.5 rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100" title="Approve">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => { setSelectedReq(req); setActionType('reject') }}
                            className="p-1.5 rounded-md bg-red-50 text-red-500 hover:bg-red-100" title="Reject">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Action Modal */}
      {selectedReq && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-2xl p-5 animate-slide-up">
            <h3 className="font-bold text-slate-900 dark:text-white mb-1">
              {actionType === 'approve' ? 'Approve Request' : 'Reject Request'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">{selectedReq.material_name} — {selectedReq.request_number}</p>

            {actionType === 'approve' && (
              <div className="mb-4">
                <label className="label">Approved Quantity</label>
                <input type="number" value={approvedQty} onChange={e => setApprovedQty(e.target.value)} className="input" />
                <p className="text-[10px] text-slate-400 mt-1">Requested: {selectedReq.requested_qty}</p>
              </div>
            )}

            <div className="mb-4">
              <label className="label">Admin Note (optional)</label>
              <textarea value={adminNote} onChange={e => setAdminNote(e.target.value)} rows={2} className="input resize-none" placeholder="Add a note..." />
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setSelectedReq(null); setAdminNote('') }} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button onClick={handleAction}
                className={cn('flex-1 btn justify-center', actionType === 'reject' ? 'btn-danger' : 'btn-success')}>
                {actionType === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
