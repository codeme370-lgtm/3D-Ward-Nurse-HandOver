import { NextResponse } from 'next/server'
import { clearSessionCookie, clearWardSession } from '@/lib/authHelpers'

export async function POST(request) {
  try {
    await clearWardSession(request)
    const response = NextResponse.json({ message: 'Logged out' })
    response.headers.set('Set-Cookie', clearSessionCookie())
    return response
  } catch (error) {
    console.error('Unable to revoke Ward 3D session:', error)
    return NextResponse.json({ error: 'Unable to end your session.' }, { status: 500 })
  }
}
