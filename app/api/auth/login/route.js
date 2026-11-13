import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createWardSessionCookie, verifyPassword } from '@/lib/authHelpers'
import { normalizeWardRole, writeWardAudit } from '@/lib/wardAuth'

export async function POST(request) {
  try {
    if (!process.env.WARD_SESSION_SECRET) {
      console.error('Sign-in is unavailable because WARD_SESSION_SECRET is not configured.')
      return NextResponse.json(
        { error: 'Sign-in is temporarily unavailable because session security is not configured. Contact your administrator.' },
        { status: 503 },
      )
    }

    const body = await request.json()
    const { email, password } = body

    if (!email?.trim() || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })

    if (!user || !user.password || !verifyPassword(password, user.password) || user.accountStatus !== 'ACTIVE' || !normalizeWardRole(user.role)) {
      await writeWardAudit({
        user: user ? { id: user.id, email: user.email } : null,
        request,
        action: 'Failed sign-in',
        details: { email: normalizedEmail },
      })
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { lastSignInAt: new Date() },
    })
    const { password: _password, ...safeUser } = updatedUser
    await writeWardAudit({ user: updatedUser, request, action: 'Sign-in' })
    const cookie = await createWardSessionCookie(updatedUser)
    const response = NextResponse.json({
      message: 'Login successful',
      user: { ...safeUser, wardRole: normalizeWardRole(updatedUser.role) },
    })
    response.headers.set('Set-Cookie', cookie)
    return response
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Sign-in could not be completed. Check the Ward 3D service configuration.' }, { status: 500 })
  }
}
