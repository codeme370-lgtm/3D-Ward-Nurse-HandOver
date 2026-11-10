import { NextResponse } from 'next/server'
import { getWardUser } from '@/lib/wardAuth'

export async function GET(request) {
  try {
    const user = await getWardUser(request)
    return NextResponse.json({ user })
  } catch (error) {
    console.error('Unable to verify Ward 3D session:', error)
    return NextResponse.json({ error: 'Unable to verify your Ward 3D session.' }, { status: 500 })
  }
}
