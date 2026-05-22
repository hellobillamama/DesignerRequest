import { NextResponse } from 'next/server'
import { searchMaterials, getCategories, getVendors } from '@/lib/google-sheets'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q') || ''
    const category = searchParams.get('category') || undefined
    const stock = (searchParams.get('stock') as 'in' | 'low' | 'out') || undefined
    const vendor = searchParams.get('vendor') || undefined
    const page = parseInt(searchParams.get('page') || '0')
    const limit = parseInt(searchParams.get('limit') || '24')

    const materials = await searchMaterials(query, { category, stock, vendor })
    const total = materials.length
    const paginated = materials.slice(page * limit, (page + 1) * limit)

    const categories = await getCategories()
    const vendors = await getVendors()

    return NextResponse.json({
      materials: paginated,
      total,
      categories,
      vendors,
    })
  } catch (error) {
    console.error('Materials API error:', error)
    return NextResponse.json({ error: 'Failed to fetch materials' }, { status: 500 })
  }
}
