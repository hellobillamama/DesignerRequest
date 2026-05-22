import { google } from 'googleapis'

// Sheet tab names
export const SHEETS = {
  MATERIALS: 'Materials',
  CATEGORIES: 'Categories',
  REQUESTS: 'Requests',
  USERS: 'Users',
  UPLOAD_HISTORY: 'UploadHistory',
  NOTIFICATIONS: 'Notifications',
  ISSUE_HISTORY: 'IssueHistory',
} as const

// Initialize Google Sheets API
function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!email || !key) {
    throw new Error('Google Sheets credentials not configured')
  }

  return new google.auth.JWT(email, undefined, key, [
    'https://www.googleapis.com/auth/spreadsheets',
  ])
}

function getSheets() {
  const auth = getAuth()
  return google.sheets({ version: 'v4', auth })
}

function getSpreadsheetId() {
  const id = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
  if (!id) throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID not set')
  return id
}

// ============================================================
// GENERIC SHEET OPERATIONS
// ============================================================

export async function getSheetData(sheetName: string): Promise<string[][]> {
  const sheets = getSheets()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: `${sheetName}!A:ZZ`,
  })
  return (res.data.values || []) as string[][]
}

export async function appendRow(sheetName: string, values: string[]) {
  const sheets = getSheets()
  await sheets.spreadsheets.values.append({
    spreadsheetId: getSpreadsheetId(),
    range: `${sheetName}!A:ZZ`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values] },
  })
}

export async function updateRow(sheetName: string, rowIndex: number, values: string[]) {
  const sheets = getSheets()
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSpreadsheetId(),
    range: `${sheetName}!A${rowIndex}:ZZ${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values] },
  })
}

export async function deleteRow(sheetName: string, rowIndex: number) {
  const sheets = getSheets()
  // Get sheet ID
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: getSpreadsheetId(),
  })
  const sheet = meta.data.sheets?.find(s => s.properties?.title === sheetName)
  if (!sheet?.properties?.sheetId && sheet?.properties?.sheetId !== 0) return

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: getSpreadsheetId(),
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: sheet.properties.sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex - 1,
            endIndex: rowIndex,
          },
        },
      }],
    },
  })
}

// ============================================================
// HELPER: Convert rows to objects using header row
// ============================================================

export function rowsToObjects<T>(rows: string[][]): T[] {
  if (rows.length < 2) return []
  const headers = rows[0].map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))
  return rows.slice(1).map((row, idx) => {
    const obj: Record<string, string | number> = { _row_index: idx + 2 } // 1-indexed + header
    headers.forEach((h, i) => {
      obj[h] = row[i] || ''
    })
    return obj as unknown as T
  })
}

// ============================================================
// MATERIALS
// ============================================================

export interface SheetMaterial {
  _row_index: number
  material_code: string
  material_name: string
  category: string
  color: string
  size: string
  unit: string
  price: string
  balance_qty: string
  min_stock_level: string
  vendor: string
  rack_location: string
  barcode: string
  description: string
  image_url: string
  last_updated: string
  is_active: string
}

export async function getMaterials(): Promise<SheetMaterial[]> {
  const rows = await getSheetData(SHEETS.MATERIALS)
  return rowsToObjects<SheetMaterial>(rows)
}

export async function getMaterialByCode(code: string): Promise<SheetMaterial | null> {
  const materials = await getMaterials()
  return materials.find(m => m.material_code.toUpperCase() === code.toUpperCase()) || null
}

export async function searchMaterials(query: string, filters?: {
  category?: string
  stock?: 'in' | 'low' | 'out'
  vendor?: string
}): Promise<SheetMaterial[]> {
  let materials = await getMaterials()

  // Filter active only
  materials = materials.filter(m => m.is_active !== 'false')

  // Text search
  if (query) {
    const q = query.toLowerCase()
    materials = materials.filter(m =>
      m.material_name.toLowerCase().includes(q) ||
      m.material_code.toLowerCase().includes(q) ||
      m.color.toLowerCase().includes(q) ||
      m.category.toLowerCase().includes(q) ||
      m.description.toLowerCase().includes(q)
    )
  }

  // Filters
  if (filters?.category) {
    materials = materials.filter(m => m.category.toLowerCase() === filters.category!.toLowerCase())
  }
  if (filters?.vendor) {
    materials = materials.filter(m => m.vendor.toLowerCase() === filters.vendor!.toLowerCase())
  }
  if (filters?.stock === 'in') {
    materials = materials.filter(m => parseFloat(m.balance_qty || '0') > parseFloat(m.min_stock_level || '10'))
  } else if (filters?.stock === 'low') {
    materials = materials.filter(m => {
      const qty = parseFloat(m.balance_qty || '0')
      return qty > 0 && qty <= parseFloat(m.min_stock_level || '10')
    })
  } else if (filters?.stock === 'out') {
    materials = materials.filter(m => parseFloat(m.balance_qty || '0') <= 0)
  }

  return materials
}

export async function upsertMaterial(data: Partial<SheetMaterial>) {
  const materials = await getMaterials()
  const existing = materials.find(m => m.material_code.toUpperCase() === data.material_code?.toUpperCase())

  const row = [
    data.material_code || '',
    data.material_name || '',
    data.category || '',
    data.color || '',
    data.size || '',
    data.unit || 'meters',
    data.price || '0',
    data.balance_qty || '0',
    data.min_stock_level || '10',
    data.vendor || '',
    data.rack_location || '',
    data.barcode || '',
    data.description || '',
    data.image_url || '',
    new Date().toISOString(),
    data.is_active || 'true',
  ]

  if (existing) {
    await updateRow(SHEETS.MATERIALS, existing._row_index, row)
    return 'updated'
  } else {
    await appendRow(SHEETS.MATERIALS, row)
    return 'created'
  }
}

// ============================================================
// REQUESTS
// ============================================================

export interface SheetRequest {
  _row_index: number
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
  design_name: string
  priority: string
  status: string
  notes: string
  admin_notes: string
  reviewed_by: string
  created_at: string
  reviewed_at: string
  issued_at: string
}

export async function getRequests(userEmail?: string): Promise<SheetRequest[]> {
  const rows = await getSheetData(SHEETS.REQUESTS)
  let requests = rowsToObjects<SheetRequest>(rows)
  if (userEmail) {
    requests = requests.filter(r => r.requested_by_email === userEmail)
  }
  return requests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export async function createRequest(data: {
  material_code: string
  material_name: string
  requested_by_email: string
  requested_by_name: string
  department: string
  requested_qty: number
  purpose: string
  design_name?: string
  priority: string
  notes?: string
}) {
  const requests = await getRequests()
  const num = requests.length + 1
  const requestNumber = `REQ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(num).padStart(4, '0')}`
  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  const row = [
    requestId,
    requestNumber,
    data.material_code,
    data.material_name,
    data.requested_by_email,
    data.requested_by_name,
    data.department || '',
    String(data.requested_qty),
    '', // approved_qty
    data.purpose,
    data.design_name || '',
    data.priority,
    'pending',
    data.notes || '',
    '', // admin_notes
    '', // reviewed_by
    new Date().toISOString(),
    '', // reviewed_at
    '', // issued_at
  ]

  await appendRow(SHEETS.REQUESTS, row)
  return { requestId, requestNumber }
}

export async function updateRequestStatus(requestId: string, status: string, extra?: {
  admin_notes?: string
  approved_qty?: number
  reviewed_by?: string
}) {
  const requests = await getRequests()
  const req = requests.find(r => r.request_id === requestId)
  if (!req) return false

  const row = [
    req.request_id,
    req.request_number,
    req.material_code,
    req.material_name,
    req.requested_by_email,
    req.requested_by_name,
    req.department,
    req.requested_qty,
    extra?.approved_qty ? String(extra.approved_qty) : req.approved_qty,
    req.purpose,
    req.design_name,
    req.priority,
    status,
    req.notes,
    extra?.admin_notes || req.admin_notes,
    extra?.reviewed_by || req.reviewed_by,
    req.created_at,
    new Date().toISOString(),
    status === 'issued' ? new Date().toISOString() : req.issued_at,
  ]

  await updateRow(SHEETS.REQUESTS, req._row_index, row)
  return true
}

// ============================================================
// CATEGORIES
// ============================================================

export async function getCategories(): Promise<string[]> {
  const materials = await getMaterials()
  const cats = new Set<string>()
  materials.forEach(m => { if (m.category) cats.add(m.category) })
  return Array.from(cats).sort()
}

export async function getVendors(): Promise<string[]> {
  const materials = await getMaterials()
  const vendors = new Set<string>()
  materials.forEach(m => { if (m.vendor) vendors.add(m.vendor) })
  return Array.from(vendors).sort()
}

// ============================================================
// USERS (from Users sheet tab)
// ============================================================

export interface SheetUser {
  _row_index: number
  email: string
  name: string
  role: string
  department: string
  is_active: string
  created_at: string
}

export async function getUsers(): Promise<SheetUser[]> {
  const rows = await getSheetData(SHEETS.USERS)
  return rowsToObjects<SheetUser>(rows)
}

export async function getUserByEmail(email: string): Promise<SheetUser | null> {
  const users = await getUsers()
  return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null
}

export async function upsertUser(data: { email: string; name: string; role?: string; department?: string }) {
  const users = await getUsers()
  const existing = users.find(u => u.email.toLowerCase() === data.email.toLowerCase())

  if (existing) {
    const row = [
      data.email,
      data.name || existing.name,
      existing.role, // Don't change role on login
      existing.department,
      existing.is_active,
      existing.created_at,
    ]
    await updateRow(SHEETS.USERS, existing._row_index, row)
  } else {
    const row = [
      data.email,
      data.name || '',
      data.role || 'designer',
      data.department || '',
      'true',
      new Date().toISOString(),
    ]
    await appendRow(SHEETS.USERS, row)
  }
}

// ============================================================
// DASHBOARD STATS
// ============================================================

export async function getDashboardStats() {
  const materials = await getMaterials()
  const requests = await getRequests()

  const activeMaterials = materials.filter(m => m.is_active !== 'false')
  const totalMaterials = activeMaterials.length
  const inStock = activeMaterials.filter(m => parseFloat(m.balance_qty || '0') > parseFloat(m.min_stock_level || '10')).length
  const lowStock = activeMaterials.filter(m => {
    const qty = parseFloat(m.balance_qty || '0')
    return qty > 0 && qty <= parseFloat(m.min_stock_level || '10')
  }).length
  const outOfStock = activeMaterials.filter(m => parseFloat(m.balance_qty || '0') <= 0).length
  const pendingRequests = requests.filter(r => r.status === 'pending').length

  const lowStockItems = activeMaterials
    .filter(m => parseFloat(m.balance_qty || '0') <= parseFloat(m.min_stock_level || '10'))
    .sort((a, b) => parseFloat(a.balance_qty || '0') - parseFloat(b.balance_qty || '0'))
    .slice(0, 5)

  const recentRequests = requests.slice(0, 6)

  // Category distribution
  const catCounts: Record<string, number> = {}
  activeMaterials.forEach(m => {
    const cat = m.category || 'Uncategorized'
    catCounts[cat] = (catCounts[cat] || 0) + 1
  })
  const categoryData = Object.entries(catCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  return {
    totalMaterials,
    inStock,
    lowStock,
    outOfStock,
    pendingRequests,
    lowStockItems,
    recentRequests,
    categoryData,
  }
}
