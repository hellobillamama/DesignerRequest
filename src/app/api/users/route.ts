import { NextResponse } from 'next/server'
import { getUsers, updateRow, SHEETS } from '@/lib/google-sheets'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const users = await getUsers()
    return NextResponse.json({ users })
  } catch (error) {
    console.error('Users API error:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const { email, role, department } = body

    const users = await getUsers()
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase())
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const row = [
      user.email,
      user.name,
      role || user.role,
      department !== undefined ? department : user.department,
      user.is_active,
      user.created_at,
    ]

    await updateRow(SHEETS.USERS, user._row_index, row)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update user API error:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}
