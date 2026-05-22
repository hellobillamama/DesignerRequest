import { NextResponse } from 'next/server'
import { getRequests, createRequest, updateRequestStatus } from '@/lib/google-sheets'
import { getServerSession } from 'next-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || undefined
    const email = searchParams.get('email') || undefined

    let requests = await getRequests()

    if (email) {
      requests = requests.filter(r => r.requested_by_email === email)
    }
    if (status) {
      requests = requests.filter(r => r.status === status)
    }

    return NextResponse.json({ requests })
  } catch (error) {
    console.error('Requests API error:', error)
    return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const result = await createRequest(body)
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('Create request API error:', error)
    return NextResponse.json({ error: 'Failed to create request' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const { requestId, status, admin_notes, approved_qty, reviewed_by } = body

    const success = await updateRequestStatus(requestId, status, {
      admin_notes,
      approved_qty,
      reviewed_by,
    })

    if (!success) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update request API error:', error)
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 })
  }
}
