import crypto from 'crypto'
import prisma from '@/lib/prisma'
import { DEFAULT_WARD_SETTINGS, getWardConfiguration } from '@/lib/wardDefaults'

function getSessionSecret() {
  const secret = process.env.WARD_SESSION_SECRET
  if (!secret) {
    throw new Error('WARD_SESSION_SECRET must be configured before issuing or verifying sessions.')
  }
  return secret
}

export function createSessionCookie(user) {
  const sessionPayload = {
    id: user.id,
    role: user.role || 'Ward staff',
    name: user.name,
    email: user.email,
  }

  const encoded = Buffer.from(JSON.stringify(sessionPayload)).toString('base64url')
  const signature = crypto.createHmac('sha256', getSessionSecret()).update(encoded).digest('base64url')
  const secureFlag = process.env.NODE_ENV === 'production' ? 'Secure; ' : ''

  return `session=${encoded}.${signature}; Path=/; ${secureFlag}HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`
}

export async function createWardSessionCookie(user) {
  const token = crypto.randomBytes(32).toString('base64url')
  const session = await prisma.wardSession.create({
    data: {
      userId: user.id,
      tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    select: { id: true },
  })
  return createSessionCookie({ id: user.id, sessionId: session.id, token })
}

export function clearSessionCookie() {
  return 'session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax;'
}

export async function clearWardSession(request) {
  const session = getSessionFromRequest(request)
  if (session?.sessionId) {
    await prisma.wardSession.deleteMany({ where: { id: session.sessionId } })
  }
}

export function getSessionFromRequest(request) {
  const cookieHeader = request.headers.get('cookie')
  if (!cookieHeader) return null
  const sessionCookie = cookieHeader.split(';').map((cookie) => cookie.trim()).find((cookie) => cookie.startsWith('session='))
  if (!sessionCookie) return null

  try {
    const cookieValue = sessionCookie.slice('session='.length)
    const separator = cookieValue.lastIndexOf('.')
    if (separator <= 0) return null
    const encoded = cookieValue.slice(0, separator)
    const providedSignature = Buffer.from(cookieValue.slice(separator + 1), 'base64url')
    const expectedSignature = crypto.createHmac('sha256', getSessionSecret()).update(encoded).digest()
    if (providedSignature.length !== expectedSignature.length || !crypto.timingSafeEqual(providedSignature, expectedSignature)) {
      return null
    }

    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
    return payload
  } catch (error) {
    console.error('Failed to verify session cookie', error)
    return null
  }
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${derivedKey}`
}

export function verifyPassword(password, storedHash) {
  if (!storedHash || typeof storedHash !== 'string') return false
  const [salt, key] = storedHash.split(':')
  if (!salt || !key) return false

  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex')
  const derivedBuffer = Buffer.from(derivedKey, 'hex')
  const keyBuffer = Buffer.from(key, 'hex')
  if (derivedBuffer.length !== keyBuffer.length) return false

  return crypto.timingSafeEqual(derivedBuffer, keyBuffer)
}
