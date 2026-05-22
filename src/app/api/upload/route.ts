import { NextResponse } from 'next/server'
import { upsertMaterial } from '@/lib/google-sheets'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { rows } = body as { rows: Array<Record<string, string>> }

    if (!rows || !Array.isArray(rows)) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }

    const result = { total: rows.length, created: 0, updated: 0, failed: 0, errors: [] as { row: number; code: string; error: string }[] }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      try {
        if (!row.material_code || !row.material_name) {
          result.failed++
          result.errors.push({ row: i + 2, code: row.material_code || '?', error: 'Missing required fields' })
          continue
        }

        const status = await upsertMaterial({
          material_code: row.material_code.trim().toUpperCase(),
          material_name: row.material_name.trim(),
          category: row.category || '',
          color: row.color || '',
          size: row.size || '',
          unit: row.unit || 'meters',
          price: row.price || '0',
          balance_qty: row.balance_qty || '0',
          min_stock_level: row.min_stock_level || '10',
          vendor: row.vendor || '',
          rack_location: row.rack_location || '',
          barcode: row.barcode || '',
          description: row.description || '',
          image_url: row.image_url || '',
          is_active: 'true',
        })

        if (status === 'created') result.created++
        else result.updated++
      } catch (err) {
        result.failed++
        result.errors.push({ row: i + 2, code: row.material_code || '?', error: String(err) })
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Upload API error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
