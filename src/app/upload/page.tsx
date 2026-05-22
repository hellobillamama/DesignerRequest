'use client'

import { useState, useCallback } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { useDropzone } from 'react-dropzone'
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Loader2, Download, RefreshCw, ArrowRight, XCircle, Table } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'

interface RowData {
  material_code: string
  material_name: string
  category?: string
  color?: string
  size?: string
  price?: string
  balance_qty?: string
  unit?: string
  vendor?: string
  rack_location?: string
  barcode?: string
  description?: string
  min_stock_level?: string
}

interface UploadResult {
  total: number
  created: number
  updated: number
  failed: number
  errors: { row: number; code: string; error: string }[]
}

const COLUMN_ALIASES: Record<string, string> = {
  'code': 'material_code', 'item code': 'material_code', 'material code': 'material_code', 'article no': 'material_code',
  'name': 'material_name', 'material name': 'material_name', 'item name': 'material_name',
  'qty': 'balance_qty', 'quantity': 'balance_qty', 'stock qty': 'balance_qty', 'balance': 'balance_qty', 'available qty': 'balance_qty',
  'unit price': 'price', 'rate': 'price', 'cost': 'price',
  'location': 'rack_location', 'rack': 'rack_location',
  'supplier': 'vendor', 'vendor name': 'vendor',
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
    price: normalized.price ? String(normalized.price).replace(/[^0-9.]/g, '') : undefined,
    balance_qty: normalized.balance_qty !== undefined ? String(normalized.balance_qty).replace(/[^0-9.]/g, '') : undefined,
    unit: normalized.unit ? String(normalized.unit).trim() : undefined,
    vendor: normalized.vendor ? String(normalized.vendor).trim() : undefined,
    rack_location: normalized.rack_location ? String(normalized.rack_location).trim() : undefined,
    barcode: normalized.barcode ? String(normalized.barcode).trim() : undefined,
    description: normalized.description ? String(normalized.description).trim() : undefined,
    min_stock_level: normalized.min_stock_level ? String(normalized.min_stock_level) : undefined,
  }
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<RowData[]>([])
  const [allRows, setAllRows] = useState<RowData[]>([])
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)

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
      setAllRows(rows)
      setPreview(rows.slice(0, 10))
      toast.success(`Parsed ${rows.length} rows. Review and upload.`)
    } catch { toast.error('Failed to parse file') }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'text/csv': ['.csv'], 'application/vnd.ms-excel': ['.xls'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
    maxFiles: 1
  })

  const handleUpload = async () => {
    if (!allRows.length) return
    setUploading(true)
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: allRows }),
      })
      const data = await res.json()
      setResult(data)
      if (data.failed === 0) toast.success(`Upload complete! ${data.created} new, ${data.updated} updated.`)
      else toast.error(`Upload finished with ${data.failed} errors`)
    } catch { toast.error('Upload failed') }
    setUploading(false)
  }

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['material_code', 'material_name', 'category', 'color', 'size', 'price', 'balance_qty', 'unit', 'vendor', 'rack_location', 'barcode', 'description', 'min_stock_level'],
      ['FAB-001', 'Cotton Twill 100%', 'Fabric', 'Navy Blue', '60"', '12.50', '500', 'meters', 'ABC Textiles', 'A-1-2', '1234567890', 'Premium cotton twill', '50'],
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
            <p className="page-subtitle">Upload your Excel or CSV stock report to update Google Sheet</p>
          </div>
          <button onClick={downloadTemplate} className="btn-secondary text-xs gap-2">
            <Download className="w-3.5 h-3.5" /> Template
          </button>
        </div>

        <div {...getRootProps()}
          className={cn('card p-8 flex flex-col items-center gap-4 cursor-pointer border-2 border-dashed transition-all',
            isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300')}>
          <input {...getInputProps()} />
          <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center', isDragActive ? 'bg-blue-100' : 'bg-slate-100')}>
            <FileSpreadsheet className={cn('w-8 h-8', isDragActive ? 'text-blue-600' : 'text-slate-400')} />
          </div>
          <div className="text-center">
            <p className="font-semibold text-slate-900 dark:text-white">{isDragActive ? 'Drop your file here' : 'Drag & drop your stock file'}</p>
            <p className="text-sm text-slate-500 mt-1">Supports .xlsx, .xls, .csv files</p>
            {!isDragActive && <button className="btn-primary text-xs mt-3 px-4"><Upload className="w-3.5 h-3.5" /> Browse Files</button>}
          </div>
        </div>

        <div className="card p-4 mt-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
            <Table className="w-4 h-4 text-slate-400" /> Auto-detected Column Names
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(COLUMN_ALIASES).slice(0, 12).map(([alias, field]) => (
              <span key={alias} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">"{alias}" → {field}</span>
            ))}
          </div>
        </div>

        {file && !result && (
          <div className="card mt-4 overflow-hidden animate-slide-up">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-medium">{file.name}</span>
                <span className="text-xs text-slate-400">({allRows.length} rows)</span>
              </div>
              <button onClick={() => { setFile(null); setPreview([]); setAllRows([]) }} className="text-slate-400 hover:text-red-500"><XCircle className="w-4 h-4" /></button>
            </div>

            {preview.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50"><tr>{['Code', 'Name', 'Category', 'Color', 'Price', 'Qty', 'Unit'].map(h => <th key={h} className="px-3 py-2 text-left text-slate-500 font-medium">{h}</th>)}</tr></thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-t border-slate-100">
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
            )}

            <div className="p-4 border-t border-slate-100">
              <button onClick={handleUpload} disabled={uploading} className="btn-primary w-full justify-center text-sm py-2.5 gap-2">
                {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : <><Upload className="w-4 h-4" /> Upload & Update Google Sheet</>}
              </button>
            </div>
          </div>
        )}

        {result && (
          <div className="card mt-4 p-5 animate-slide-up">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              {result.failed === 0 ? <><CheckCircle2 className="w-5 h-5 text-emerald-500" /> Upload Successful</> : <><AlertTriangle className="w-5 h-5 text-amber-500" /> Completed with Errors</>}
            </h3>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { label: 'Total', value: result.total, color: 'text-slate-900' },
                { label: 'New', value: result.created, color: 'text-emerald-600' },
                { label: 'Updated', value: result.updated, color: 'text-blue-600' },
                { label: 'Failed', value: result.failed, color: 'text-red-500' },
              ].map(({ label, value, color }) => (
                <div key={label} className="p-3 bg-slate-50 rounded-xl text-center">
                  <p className={cn('text-2xl font-bold', color)}>{value}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
            {result.errors.length > 0 && (
              <div className="max-h-32 overflow-y-auto space-y-1 mb-4">
                {result.errors.slice(0, 10).map((e, i) => (
                  <div key={i} className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">Row {e.row} ({e.code}): {e.error}</div>
                ))}
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => { setFile(null); setPreview([]); setAllRows([]); setResult(null) }} className="btn-secondary flex-1 justify-center text-sm">
                <RefreshCw className="w-4 h-4" /> Upload Another
              </button>
              <a href="/materials" className="btn-primary flex-1 justify-center text-sm"><ArrowRight className="w-4 h-4" /> View Materials</a>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
