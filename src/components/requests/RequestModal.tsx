'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { useStore } from '@/store/useStore'
import type { MaterialWithDetails } from '@/types/database'
import { X, Package, AlertCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

const schema = z.object({
  requested_qty: z.number({ required_error: 'Quantity is required' }).positive('Must be greater than 0'),
  purpose: z.string().min(3, 'Purpose is required'),
  design_name: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  notes: z.string().optional(),
  due_date: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  material: MaterialWithDetails
  onClose: () => void
}

export default function RequestModal({ material, onClose }: Props) {
  const supabase = createClient()
  const { profile } = useStore()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { priority: 'normal', requested_qty: 1 },
  })

  const onSubmit = async (data: FormData) => {
    if (!profile) { toast.error('Not authenticated'); return }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('material_requests') as any).insert({
      material_id: material.id,
      requested_by: profile.id,
      requested_qty: data.requested_qty,
      purpose: data.purpose,
      design_name: data.design_name || null,
      priority: data.priority,
      notes: data.notes || null,
      due_date: data.due_date || null,
    })

    if (error) {
      toast.error('Failed to submit request: ' + error.message)
      return
    }

    // Create notification for admins
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('notifications') as any).insert({
      user_id: profile.id,
      title: 'Request Submitted',
      message: `Your request for "${material.material_name}" has been submitted and is pending review.`,
      type: 'info',
      link: '/requests',
    })

    toast.success('Request submitted successfully!')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white">Request Material</h2>
            <p className="text-xs text-slate-500 mt-0.5">Fill in the details below</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Material info */}
        <div className="p-4 mx-5 mt-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">{material.material_name}</p>
              <p className="text-xs text-slate-500">{material.material_code} · {material.balance_qty} {material.unit} available</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          {/* Auto-filled (read-only) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Requested By</label>
              <input disabled value={profile?.full_name || profile?.email || ''} className="input bg-slate-50 dark:bg-slate-800 opacity-70" />
            </div>
            <div>
              <label className="label">Department</label>
              <input disabled value={profile?.department || 'N/A'} className="input bg-slate-50 dark:bg-slate-800 opacity-70" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Material Code</label>
              <input disabled value={material.material_code} className="input bg-slate-50 dark:bg-slate-800 opacity-70 font-mono text-xs" />
            </div>
            <div>
              <label className="label">Required Qty *</label>
              <input
                type="number" step="0.01" min="0.01"
                {...register('requested_qty', { valueAsNumber: true })}
                placeholder={`Max: ${material.balance_qty}`}
                className={cn('input', errors.requested_qty && 'ring-1 ring-red-500')}
              />
              {errors.requested_qty && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />{errors.requested_qty.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="label">Purpose / Design Name *</label>
            <input {...register('purpose')} placeholder="e.g. Summer Collection 2025 — Dress lining"
              className={cn('input', errors.purpose && 'ring-1 ring-red-500')} />
            {errors.purpose && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />{errors.purpose.message}
              </p>
            )}
          </div>

          <div>
            <label className="label">Design / Style Name</label>
            <input {...register('design_name')} placeholder="Optional: Style number or collection name" className="input" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Priority</label>
              <select {...register('priority')} className="input">
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">🚨 Urgent</option>
              </select>
            </div>
            <div>
              <label className="label">Required By</label>
              <input type="date" {...register('due_date')} className="input"
                min={new Date().toISOString().split('T')[0]} />
            </div>
          </div>

          <div>
            <label className="label">Additional Notes</label>
            <textarea {...register('notes')} rows={2}
              placeholder="Any special instructions or notes for the admin..."
              className="input resize-none" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 justify-center">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Submit Request
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
