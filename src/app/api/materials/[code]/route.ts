import { NextResponse } from 'next/server'
import { getMaterialByCode } from '@/lib/google-sheets'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, { params }: { params: { code: string } }) {
  try {
    const code = decodeURIComponent(params.code)
    const material = await getMaterialByCode(code)

    if (!material) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 })
    }

    return NextResponse.json({ material })
  } catch (error) {
    console.error('Material detail API error:', error)
    return NextResponse.json({ error: 'Failed to fetch material' }, { status: 500 })
  }
}
