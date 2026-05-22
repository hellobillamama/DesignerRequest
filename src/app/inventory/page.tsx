'use client'

export const dynamic = 'force-dynamic'


import { useEffect, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { createClient } from '@/lib/supabase/client'
import { History, Package, ArrowUpRight, ArrowDownLeft, Loader2, Search } from 'lucide-react'
import { cn, formatDateTime } from '@/lib/utils'

export default function InventoryPage() {
  const supabase = createClient()
  const [issues, setIssues] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('issue_history')
        .select('*, materials(material_name, material_code, unit), recipient:profiles!issued_to(full_name), issuer:profiles!issued_by(full_name), material_requests(request_number, purpose)')
        .order('issue_date', { ascending: false })
        .limit(100)
      setIssues(data || [])
      setLoading(false)
    }
    load()
  }, [supabase])

  const filtered = (issues as Array<{
    id: string; issued_qty: number; returned_qty: number; issue_date: string; return_date: string | null; notes: string | null;
    materials: { material_name: string; material_code: string; unit: string } | null;
    recipient: { full_name: string | null } | null;
    issuer: { full_name: string | null } | null;
    material_requests: { request_number: string; purpose: string } | null;
  }>).filter(i =>
    !search ||
    i.materials?.material_name?.toLowerCase().includes(search.toLowerCase()) ||
    i.materials?.material_code?.toLowerCase().includes(search.toLowerCase()) ||
    i.recipient?.full_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AppLayout title="Issue History">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="page-title">Issue History</h1>
          <p className="page-subtitle">Track all material issues and returns</p>
        </div>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search material or person..." className="input pl-9" />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-blue-600" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-3">
          <History className="w-10 h-10 text-slate-300" />
          <p className="text-slate-500">No issue history found</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Material</th>
                <th className="th">Issued To</th>
                <th className="th">Issued By</th>
                <th className="th">Qty Issued</th>
                <th className="th hidden md:table-cell">Returned</th>
                <th className="th hidden md:table-cell">Request</th>
                <th className="th">Date</th>
                <th className="th hidden lg:table-cell">Return Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(i => (
                <tr key={i.id} className="table-row">
                  <td className="td">
                    <div>
                      <p className="text-xs font-medium text-slate-900 dark:text-white">{i.materials?.material_name}</p>
                      <p className="text-[10px] font-mono text-slate-400">{i.materials?.material_code}</p>
                    </div>
                  </td>
                  <td className="td text-xs">{i.recipient?.full_name || '—'}</td>
                  <td className="td text-xs text-slate-500">{i.issuer?.full_name || '—'}</td>
                  <td className="td">
                    <div className="flex items-center gap-1 text-blue-600">
                      <ArrowUpRight className="w-3 h-3" />
                      <span className="font-semibold text-xs">{i.issued_qty} {i.materials?.unit}</span>
                    </div>
                  </td>
                  <td className="td hidden md:table-cell">
                    {i.returned_qty > 0 ? (
                      <div className="flex items-center gap-1 text-emerald-600">
                        <ArrowDownLeft className="w-3 h-3" />
                        <span className="text-xs font-semibold">{i.returned_qty}</span>
                      </div>
                    ) : <span className="text-slate-300 text-xs">—</span>}
                  </td>
                  <td className="td hidden md:table-cell text-[10px] text-slate-400 font-mono">
                    {i.material_requests?.request_number || '—'}
                  </td>
                  <td className="td text-xs text-slate-500 whitespace-nowrap">{formatDateTime(i.issue_date)}</td>
                  <td className="td hidden lg:table-cell text-xs text-slate-500">
                    {i.return_date ? formatDateTime(i.return_date) : <span className="text-slate-300">Pending</span>}
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
