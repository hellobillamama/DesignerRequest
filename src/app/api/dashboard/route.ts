import { NextResponse } from 'next/server'
import { getDashboardStats } from '@/lib/google-sheets'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const stats = await getDashboardStats()
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}
