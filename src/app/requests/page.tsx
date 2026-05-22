'use client'

export const dynamic = 'force-dynamic'


import { useEffect, useState, useCallback } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { createClient } from '@/lib/supabase/client'
import { useStore } from '@/store/useStore'
import type { RequestWithDetails } from '@/types/database'
import {
  ClipboardList, CheckCircle2, XCircle, Clock, Package,
  ChevronDown, Loader2, Search, Filter, Eye, Check, X, MoreHorizontal
} from 'lucide-react'
import { cn, formatDateTime, priorityColor, requestStatusColor } from '@/lib/utils'
import toast from 'react-hot-toast'

const STATUS_TABS = [
  { value: '', label: 'All', icon: ClipboardList },
  { value: 'pending', label: 'Pending', icon: Clock },
  { value: 'approved', label: 'Approved', icon: CheckCircle2 },
  { value: 'rejected', label: 'Rejected', icon: XCircle },
  { value: 'issued', label: 'Issued', icon: Package },
]

export default function RequestsPage() {
  const supabase = createClient()
  const { profile } = useStore()
  const isAdmin = profile?.role === 'admin'

  const [requests, setRequests] = useState<RequestWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [selectedReq, setSelectedReq] = useState<RequestWithDetails | null>(null)
  const [adminNote, setAdminNote] = useState('')
  const [approvedQty, setApprovedQty] = useState<number>(0)

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('material_requests')
      .select('*, materials(material_name, material_code, unit, balance_qty), profiles!requested_by(full_name, email, department)')
      .order('created_at', { ascending: false })

    if (!isAdmin) query = query.eq('requested_by', profile?.id || '')
    if (statusFilter) query = query.eq('status', statusFilter)
    if (search) query = query.ilike('materials.material_name', `%${search}%`)

    const { data, error } = await query.limit(100)
    if (!error) setRequests((data || []) as RequestWithDetails[])
    setLoading(false)
  }, [supabase, isAdmin, profile, statusFilter, search])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  const updateStatus = async (id: string, status: string, extra?: object) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('material_requests') as any).update({
      status,
      reviewed_by: profile?.id,
      reviewed_at: new Date().toISOString(),
      admin_notes: adminNote || null,
      ...(extra || {}),
    }).eq('id', id)

    if (error) { toast.error('Failed to update: ' + error.message); return }

    toast.success(`Request ${status}!`)
    setSelectedReq(null)
    setAdminNote('')
    fetchRequests()
  }

  const handleApprove = (req: RequestWithDetails) => {
    setApprovedQty(req.requested_qty)
    setSelectedReq(req)
  }

  const pendingCount = requests.filter(r => r.status === 'pending').length

  return (
    <AppLayout title="Requests">
      <div className="mb-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Material Requests</h1>
            <p className="page-subtitle">
              {isAdmin ? `${pendingCount} pending review` : 'Track your material requests'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-4 overflow-x-auto">
        {STATUS_TABS.map(({ value, label, icon: Icon }) => (
          <button key={value} onClick={() => setStatusFilter(value)}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all',
              statusFilter === value
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300')}>
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by material name..."
          className="input pl-9" />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-3">
          <ClipboardList className="w-10 h-10 text-slate-300" />
          <p className="text-slate-500 font-medium">No requests found</p>
          {!isAdmin && <p className="text-xs text-slate-400">Browse materials and submit a request to get started</p>}
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
                <th className="th hidden lg:table-cell">Priority</th>
                <th className="th">Status</th>
                <th className="th hidden md:table-cell">Date</th>
                <th className="th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(req => (
                <tr key={req.id} className="table-row">
                  <td className="td">
                    <span className="font-mono text-xs text-slate-500">{req.request_number}</span>
                  </td>
                  <td className="td">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white text-xs">
                        {(req as unknown as { materials: { material_name: string } | null }).materials?.material_name || 'Unknown'}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {(req as unknown as { materials: { material_code: string } | null }).materials?.material_code}
                      </p>
                    </div>
                  </td>
                  {isAdmin && (
                    <td className="td hidden md:table-cell">
                      <div>
                        <p className="text-xs font-medium">
                          {(req as unknown as { profiles: { full_name: string | null } | null }).profiles?.full_name || 'Unknown'}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {(req as unknown as { profiles: { department: string | null } | null }).profiles?.department}
                        </p>
                      </div>
                    </td>
                  )}
                  <td className="td hidden sm:table-cell">
                    <span className="font-semibold text-xs">{req.requested_qty}</span>
                    <span className="text-slate-400 text-[10px] ml-1">
                      {(req as unknown as { materials: { unit: string } | null }).materials?.unit}
                    </span>
                  </td>
                  <td className="td hidden md:table-cell">
                    <p className="text-xs text-slate-600 dark:text-slate-400 max-w-[180px] truncate">{req.purpose}</p>
                  </td>
                  <td className="td hidden lg:table-cell">
                    <span className={cn('badge text-[10px] border', priorityColor(req.priority))}>{req.priority}</span>
                  </td>
                  <td className="td">
                    <span className={cn('badge text-[10px]', requestStatusColor(req.status))}>{req.status}</span>
                  </td>
                  <td className="td hidden md:table-cell text-xs text-slate-500">
                    {formatDateTime(req.created_at)}
                  </td>
                  <td className="td">
                    {isAdmin && req.status === 'pending' ? (
                      <div className="flex gap-1.5">
                        <button onClick={() => handleApprove(req)}
                          className="p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 hover:bg-emerald-100 transition-colors" title="Approve">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => {
                          setSelectedReq({ ...req, status: 'rejecting' as typeof req.status })
                        }}
                          className="p-1.5 rounded-md bg-red-50 dark:bg-red-950/30 text-red-500 hover:bg-red-100 transition-colors" title="Reject">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : isAdmin && req.status === 'approved' ? (
                      <button onClick={() => updateStatus(req.id, 'issued', { issued_at: new Date().toISOString() })}
                        className="btn-primary text-[10px] py-1 px-2">Issue</button>
                    ) : (
                      <button className="btn-ghost text-[10px] py-1 px-2">
                        <Eye className="w-3 h-3" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Approve/Reject Modal */}
      {selectedReq && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-2xl p-5 animate-slide-up">
            <h3 className="font-bold text-slate-900 dark:text-white mb-1">
              {(selectedReq.status as string) === 'rejecting' ? 'Reject Request' : 'Approve Request'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {(selectedReq as unknown as { materials: { material_name: string } | null }).materials?.material_name} — {selectedReq.request_number}
            </p>

            {(selectedReq.status as string) !== 'rejecting' && (
              <div className="mb-4">
                <label className="label">Approved Quantity</label>
                <input type="number" value={approvedQty} onChange={e => setApprovedQty(Number(e.target.value))}
                  max={selectedReq.requested_qty} min={0.01} step={0.01} className="input" />
                <p className="text-[10px] text-slate-400 mt-1">Requested: {selectedReq.requested_qty}</p>
              </div>
            )}

            <div className="mb-4">
              <label className="label">Admin Note (optional)</label>
              <textarea value={adminNote} onChange={e => setAdminNote(e.target.value)}
                rows={2} placeholder="Add a note for the requester..." className="input resize-none" />
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setSelectedReq(null); setAdminNote('') }}
                className="btn-secondary flex-1 justify-center">Cancel</button>
              <button
                onClick={() => {
                  if ((selectedReq.status as string) === 'rejecting') {
                    updateStatus(selectedReq.id, 'rejected')
                  } else {
                    updateStatus(selectedReq.id, 'approved', { approved_qty: approvedQty })
                  }
                }}
                className={cn('flex-1 btn justify-center',
                  (selectedReq.status as string) === 'rejecting' ? 'btn-danger' : 'btn-success')}>
                {(selectedReq.status as string) === 'rejecting' ? 'Reject' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
