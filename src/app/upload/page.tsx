'use client'

export const dynamic = 'force-dynamic'


import { useState, useCallback } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { createClient } from '@/lib/supabase/client'
import { useStore } from '@/store/useStore'
import { useDropzone } from 'react-dropzone'
import {
  Upload, FileSpreadsheet, CheckCircle2, XCircle,
  AlertTriangle, Loader2, Download, Eye, RefreshCw,
  Table, ChevronDown, ArrowRight
} from 'lucide-react'
import { cn, formatDateTime } from '@/lib/utils'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'

interface RowData {
  material_code: string
  material_name: string
  category?: string
  color?: string
  size?: string
  price?: number
  balance_qty?: number
  unit?: string
  vendor?: string
  rack_location?: string
  barcode?: string
  description?: string
  min_stock_level?: number
}

interface UploadResult {
  total: number
  created: number
  updated: number
  failed: number
  errors: { row: number; code: string; error: string }[]
}

const REQUIRED_COLUMNS = ['material_code', 'material_name']
const COLUMN_ALIASES: Record<string, string> = {
  'code': 'material_code',
  'item code': 'material_code',
  'material code': 'material_code',
  'article no': 'material_code',
  'article number': 'material_code',
  'name': 'material_name',
  'material name': 'material_name',
  'description': 'material_name',
  'item name': 'material_name',
  'qty': 'balance_qty',
  'quantity': 'balance_qty',
  'stock qty': 'balance_qty',
  'balance': 'balance_qty',
  'available qty': 'balance_qty',
  'unit price': 'price',
  'rate': 'price',
  'cost': 'price',
  'location': 'rack_location',
  'rack': 'rack_location',
  'supplier': 'vendor',
  'vendor name': 'vendor',
  'supplier name': 'vendor',
}

function normalizeRow(raw: Record<string, unknown>): RowData {
  const normalized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(raw)) {
    const lk = key.toLowerCase().trim()
    const mappedKey = COLUMN_ALIASES[lk] || lk.replace(/\s+/g, '_')
    normalized[mappedKey] = value
  }
  return {
    material_code: String(normalized.material_code || '').trim().toUpperCase(),
    material_name: String(normalized.material_name || '').trim(),
    category: normalized.category ? String(normalized.category).trim() : undefined,
    color: normalized.color ? String(normalized.color).trim() : undefined,
    size: normalized.size ? String(normalized.size).trim() : undefined,
    price: normalized.price ? parseFloat(String(normalized.price).replace(/[^0-9.]/g, '')) : undefined,
    balance_qty: normalized.balance_qty !== undefined ? parseFloat(String(normalized.balance_qty).replace(/[^0-9.]/g, '')) : undefined,
    unit: normalized.unit ? String(normalized.unit).trim() : undefined,
    vendor: normalized.vendor ? String(normalized.vendor).trim() : undefined,
    rack_location: normalized.rack_location ? String(normalized.rack_location).trim() : undefined,
    barcode: normalized.barcode ? String(normalized.barcode).trim() : undefined,
    description: normalized.description ? String(normalized.description).trim() : undefined,
    min_stock_level: normalized.min_stock_level ? parseFloat(String(normalized.min_stock_level)) : undefined,
  }
}

export default function UploadPage() {
  const supabase = createClient()
  const { profile } = useStore()

  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<RowData[]>([])
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [uploadHistory, setUploadHistory] = useState<unknown[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const parseFile = async (f: File): Promise<RowData[]> => {
    return new Promise((resolve, reject) => {
      if (f.name.endsWith('.csv')) {
        Papa.parse(f, {
          header: true, skipEmptyLines: true,
          complete: (results) => resolve(results.data.map(r => normalizeRow(r as Record<string, unknown>))),
          error: reject,
        })
      } else {
        const reader = new FileReader()
        reader.onload = (e) => {
          const data = e.target?.result
          const wb = XLSX.read(data, { type: 'binary' })
          const ws = wb.Sheets[wb.SheetNames[0]]
          const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws)
          resolve(rows.map(normalizeRow))
        }
        reader.onerror = reject
        reader.readAsBinaryString(f)
      }
    })
  }

  const onDrop = useCallback(async (accepted: File[]) => {
    const f = accepted[0]
    if (!f) return
    setFile(f)
    setResult(null)
    try {
      const rows = await parseFile(f)
      setPreview(rows.slice(0, 10))
      toast.success(`Parsed ${rows.length} rows. Review and upload.`)
    } catch {
      toast.error('Failed to parse file')
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxFiles: 1
  })

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)

    const rows = await parseFile(file)
    const uploadRes: UploadResult = { total: rows.length, created: 0, updated: 0, failed: 0, errors: [] }

    // Create upload record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: uploadRecord } = await (supabase.from('upload_history') as any).insert({
      filename: file.name,
      uploaded_by: profile?.id,
      total_rows: rows.length,
      status: 'processing',
    }).select().single()

    type CatRow = { id: string; name: string }
    type VendRow = { id: string; name: string }
    // Get existing categories + vendors for lookup
    const { data: cats } = await supabase.from('categories').select('id, name')
    const { data: vends } = await supabase.from('vendors').select('id, name')
    const catMap: Record<string, string> = {}
    const vendMap: Record<string, string> = {}
    ;(cats as CatRow[] | null)?.forEach(c => { catMap[c.name.toLowerCase()] = c.id })
    ;(vends as VendRow[] | null)?.forEach(v => { vendMap[v.name.toLowerCase()] = v.id })

    const BATCH = 50
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH)
      for (let j = 0; j < batch.length; j++) {
        const row = batch[j]
        const rowNum = i + j + 2

        if (!row.material_code || !row.material_name) {
          uploadRes.failed++
          uploadRes.errors.push({ row: rowNum, code: row.material_code || '?', error: 'Missing required fields' })
          continue
        }

        // Resolve category/vendor IDs
        let catId: string | null = null
        let vendId: string | null = null
        if (row.category) {
          catId = catMap[row.category.toLowerCase()] || null
          if (!catId) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: nc } = await (supabase.from('categories') as any).insert({ name: row.category }).select().single()
            if (nc) { catId = (nc as CatRow).id; catMap[row.category.toLowerCase()] = (nc as CatRow).id }
          }
        }
        if (row.vendor) {
          vendId = vendMap[row.vendor.toLowerCase()] || null
          if (!vendId) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: nv } = await (supabase.from('vendors') as any).insert({ name: row.vendor }).select().single()
            if (nv) { vendId = (nv as VendRow).id; vendMap[row.vendor.toLowerCase()] = (nv as VendRow).id }
          }
        }

        const upsertData = {
          material_code: row.material_code,
          material_name: row.material_name,
          ...(row.color !== undefined && { color: row.color }),
          ...(row.size !== undefined && { size: row.size }),
          ...(row.price !== undefined && !isNaN(row.price) && { price: row.price }),
          ...(row.balance_qty !== undefined && !isNaN(row.balance_qty) && { balance_qty: row.balance_qty }),
          ...(row.unit !== undefined && { unit: row.unit }),
          ...(row.rack_location !== undefined && { rack_location: row.rack_location }),
          ...(row.barcode !== undefined && { barcode: row.barcode }),
          ...(row.description !== undefined && { description: row.description }),
          ...(row.min_stock_level !== undefined && !isNaN(row.min_stock_level) && { min_stock_level: row.min_stock_level }),
          ...(catId && { category_id: catId }),
          ...(vendId && { vendor_id: vendId }),
          last_upload_date: new Date().toISOString(),
        }

        const { data: existing } = await supabase.from('materials').select('id').eq('material_code', row.material_code).single()

        if (existing) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error } = await (supabase.from('materials') as any).update(upsertData).eq('material_code', row.material_code)
          if (error) { uploadRes.failed++; uploadRes.errors.push({ row: rowNum, code: row.material_code, error: error.message }) }
          else uploadRes.updated++
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error } = await (supabase.from('materials') as any).insert(upsertData)
          if (error) { uploadRes.failed++; uploadRes.errors.push({ row: rowNum, code: row.material_code, error: error.message }) }
          else uploadRes.created++
        }
      }
    }

    // Update upload record
    if (uploadRecord) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('upload_history') as any).update({
        new_materials: uploadRes.created,
        updated_materials: uploadRes.updated,
        failed_rows: uploadRes.failed,
        status: uploadRes.failed === rows.length ? 'failed' : 'completed',
        error_log: uploadRes.errors.length > 0 ? uploadRes.errors : null,
      }).eq('id', uploadRecord.id)
    }

    setResult(uploadRes)
    setUploading(false)

    if (uploadRes.failed === 0) toast.success(`Upload complete! ${uploadRes.created} new, ${uploadRes.updated} updated.`)
    else toast.error(`Upload finished with ${uploadRes.failed} errors`)
  }

  const loadHistory = async () => {
    setHistoryLoading(true)
    const { data } = await supabase.from('upload_history')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(20)
    setUploadHistory(data || [])
    setHistoryLoading(false)
  }

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['material_code', 'material_name', 'category', 'color', 'size', 'price', 'balance_qty', 'unit', 'vendor', 'rack_location', 'barcode', 'description', 'min_stock_level'],
      ['FAB-001', 'Cotton Twill 100%', 'Fabric', 'Navy Blue', '60"', '12.50', '500', 'meters', 'ABC Textiles', 'A-1-2', '1234567890', 'Premium cotton twill', '50'],
      ['FAB-002', 'Silk Chiffon', 'Fabric', 'Ivory', '45"', '28.00', '120', 'meters', 'XYZ Fabrics', 'A-1-3', '0987654321', 'Light silk chiffon', '20'],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Materials')
    XLSX.writeFile(wb, 'material-upload-template.xlsx')
    toast.success('Template downloaded!')
  }

  return (
    <AppLayout title="Stock Upload">
      <div className="max-w-3xl mx-auto">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="page-title">Daily Stock Upload</h1>
            <p className="page-subtitle">Upload your Excel or CSV stock report to update the database</p>
          </div>
          <button onClick={downloadTemplate} className="btn-secondary text-xs gap-2">
            <Download className="w-3.5 h-3.5" />
            Download Template
          </button>
        </div>

        {/* Upload zone */}
        <div {...getRootProps()}
          className={cn('card p-8 flex flex-col items-center gap-4 cursor-pointer border-2 border-dashed transition-all',
            isDragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600')}>
          <input {...getInputProps()} />
          <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center transition-colors',
            isDragActive ? 'bg-blue-100 dark:bg-blue-950/40' : 'bg-slate-100 dark:bg-slate-800')}>
            <FileSpreadsheet className={cn('w-8 h-8', isDragActive ? 'text-blue-600' : 'text-slate-400')} />
          </div>
          <div className="text-center">
            <p className="font-semibold text-slate-900 dark:text-white">
              {isDragActive ? 'Drop your file here' : 'Drag & drop your stock file'}
            </p>
            <p className="text-sm text-slate-500 mt-1">Supports .xlsx, .xls, .csv files</p>
            {!isDragActive && (
              <button className="btn-primary text-xs mt-3 px-4">
                <Upload className="w-3.5 h-3.5" />
                Browse Files
              </button>
            )}
          </div>
        </div>

        {/* Column mapping info */}
        <div className="card p-4 mt-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
            <Table className="w-4 h-4 text-slate-400" />
            Auto-detected Column Names
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(COLUMN_ALIASES).slice(0, 12).map(([alias, field]) => (
              <span key={alias} className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded">
                "{alias}" → {field}
              </span>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 mt-2">* material_code and material_name are required columns</p>
        </div>

        {/* File selected + preview */}
        {file && !result && (
          <div className="card mt-4 overflow-hidden animate-slide-up">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-medium text-slate-900 dark:text-white">{file.name}</span>
                <span className="text-xs text-slate-400">({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
              <button onClick={() => { setFile(null); setPreview([]) }} className="text-slate-400 hover:text-red-500 transition-colors">
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            {preview.length > 0 && (
              <div>
                <div className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-800/50">
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Preview (first {preview.length} rows)
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                      <tr>
                        {['Code', 'Name', 'Category', 'Color', 'Price', 'Qty', 'Unit'].map(h => (
                          <th key={h} className="px-3 py-2 text-left text-slate-500 font-medium whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, i) => (
                        <tr key={i} className={cn('border-t border-slate-100 dark:border-slate-800',
                          (!row.material_code || !row.material_name) && 'bg-red-50 dark:bg-red-950/20')}>
                          <td className="px-3 py-2 font-mono">{row.material_code || <span className="text-red-500">missing!</span>}</td>
                          <td className="px-3 py-2">{row.material_name || <span className="text-red-500">missing!</span>}</td>
                          <td className="px-3 py-2 text-slate-500">{row.category || '—'}</td>
                          <td className="px-3 py-2 text-slate-500">{row.color || '—'}</td>
                          <td className="px-3 py-2 text-slate-500">{row.price || '—'}</td>
                          <td className="px-3 py-2 font-semibold">{row.balance_qty ?? '—'}</td>
                          <td className="px-3 py-2 text-slate-500">{row.unit || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="p-4 border-t border-slate-100 dark:border-slate-800">
              <button onClick={handleUpload} disabled={uploading}
                className="btn-primary w-full justify-center text-sm py-2.5 gap-2">
                {uploading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Processing upload...</>
                ) : (
                  <><Upload className="w-4 h-4" /> Upload & Update Database</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Upload result */}
        {result && (
          <div className="card mt-4 p-5 animate-slide-up">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              {result.failed === 0
                ? <><CheckCircle2 className="w-5 h-5 text-emerald-500" /> Upload Successful</>
                : <><AlertTriangle className="w-5 h-5 text-amber-500" /> Upload Completed with Errors</>}
            </h3>

            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { label: 'Total Rows', value: result.total, color: 'text-slate-900 dark:text-white' },
                { label: 'New Added', value: result.created, color: 'text-emerald-600' },
                { label: 'Updated', value: result.updated, color: 'text-blue-600' },
                { label: 'Failed', value: result.failed, color: 'text-red-500' },
              ].map(({ label, value, color }) => (
                <div key={label} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-center">
                  <p className={cn('text-2xl font-bold', color)}>{value}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {result.errors.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-red-600 mb-2">Error Details:</p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {result.errors.slice(0, 20).map((e, i) => (
                    <div key={i} className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 px-2 py-1 rounded">
                      Row {e.row} ({e.code}): {e.error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <button onClick={() => { setFile(null); setPreview([]); setResult(null) }} className="btn-secondary flex-1 justify-center text-sm">
                <RefreshCw className="w-4 h-4" />
                Upload Another
              </button>
              <a href="/materials" className="btn-primary flex-1 justify-center text-sm">
                <ArrowRight className="w-4 h-4" />
                View Materials
              </a>
            </div>
          </div>
        )}

        {/* Upload History */}
        <div className="mt-6">
          <button onClick={() => { setShowHistory(!showHistory); if (!showHistory) loadHistory() }}
            className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white mb-3 w-full">
            <Eye className="w-4 h-4 text-slate-400" />
            Upload History
            <ChevronDown className={cn('w-4 h-4 ml-auto transition-transform', showHistory && 'rotate-180')} />
          </button>

          {showHistory && (
            <div className="card overflow-hidden animate-slide-up">
              {historyLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
              ) : uploadHistory.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">No upload history found</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="th">File</th>
                      <th className="th">By</th>
                      <th className="th">Total</th>
                      <th className="th">New</th>
                      <th className="th">Updated</th>
                      <th className="th">Status</th>
                      <th className="th">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploadHistory.map((h) => {
                      const r = h as {
                        id: string; filename: string; total_rows: number;
                        new_materials: number; updated_materials: number; failed_rows: number;
                        status: string; created_at: string;
                        profiles: { full_name: string | null } | null;
                      }
                      return (
                        <tr key={r.id} className="table-row">
                          <td className="td font-medium text-xs">{r.filename}</td>
                          <td className="td text-slate-500 text-xs">{r.profiles?.full_name || 'Unknown'}</td>
                          <td className="td text-center">{r.total_rows}</td>
                          <td className="td text-emerald-600 font-semibold text-center">{r.new_materials}</td>
                          <td className="td text-blue-600 font-semibold text-center">{r.updated_materials}</td>
                          <td className="td">
                            <span className={cn('badge text-[10px]',
                              r.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                              r.status === 'failed' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-600')}>
                              {r.status}
                            </span>
                          </td>
                          <td className="td text-slate-400 text-xs whitespace-nowrap">{formatDateTime(r.created_at)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
