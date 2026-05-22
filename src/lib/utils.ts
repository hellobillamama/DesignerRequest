import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date | null) {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date | null) {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(date))
}

export function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
}

export function formatQty(qty: number, unit = '') {
  return `${qty.toLocaleString()} ${unit}`.trim()
}

export function getStockStatus(qty: number, min: number) {
  if (qty <= 0) return 'out'
  if (qty <= min) return 'low'
  return 'in'
}

export function stockStatusLabel(status: string) {
  switch (status) {
    case 'out': return 'Out of Stock'
    case 'low': return 'Low Stock'
    default: return 'In Stock'
  }
}

export function stockStatusColor(status: string) {
  switch (status) {
    case 'out': return 'text-red-500 bg-red-50 dark:bg-red-950/30'
    case 'low': return 'text-amber-500 bg-amber-50 dark:bg-amber-950/30'
    default: return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
  }
}

export function priorityColor(priority: string) {
  switch (priority) {
    case 'urgent': return 'text-red-600 bg-red-50 dark:bg-red-950/30 border-red-200'
    case 'high': return 'text-orange-600 bg-orange-50 dark:bg-orange-950/30 border-orange-200'
    case 'normal': return 'text-blue-600 bg-blue-50 dark:bg-blue-950/30 border-blue-200'
    case 'low': return 'text-slate-600 bg-slate-50 dark:bg-slate-800 border-slate-200'
    default: return 'text-slate-600 bg-slate-50 dark:bg-slate-800 border-slate-200'
  }
}

export function requestStatusColor(status: string) {
  switch (status) {
    case 'pending': return 'text-amber-600 bg-amber-50 dark:bg-amber-950/30'
    case 'approved': return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30'
    case 'rejected': return 'text-red-600 bg-red-50 dark:bg-red-950/30'
    case 'issued': return 'text-blue-600 bg-blue-50 dark:bg-blue-950/30'
    case 'returned': return 'text-purple-600 bg-purple-50 dark:bg-purple-950/30'
    case 'cancelled': return 'text-slate-500 bg-slate-50 dark:bg-slate-800'
    default: return 'text-slate-500 bg-slate-50 dark:bg-slate-800'
  }
}

export function debounce<T extends (...args: unknown[]) => unknown>(fn: T, delay: number) {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

export function generateMockQRData(materialCode: string) {
  return `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/materials/${materialCode}`
}
