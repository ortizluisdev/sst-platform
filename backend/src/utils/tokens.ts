import { randomBytes, createHash } from 'node:crypto'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { env } from '../config/env.js'

const REFRESH_TOKEN_BYTES = 32
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 días
const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000 // 15 min, debe coincidir con plugins/jwt.ts

/** Token opaco de alta entropía — nunca se guarda tal cual, solo su hash. */
export function generateRefreshToken(): string {
  return randomBytes(REFRESH_TOKEN_BYTES).toString('base64url')
}

/**
 * SHA-256 (no argon2): el refresh token ya tiene 256 bits de entropía propia,
 * a diferencia de una contraseña elegida por un humano — no necesita un KDF
 * lento para resistir fuerza bruta, y un hash rápido evita costo innecesario
 * en cada refresh.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

const isProd = env.NODE_ENV === 'production'

/**
 * SameSite=Lax es suficiente aquí: el navegador nunca adjunta estas cookies
 * en un POST cross-site (el vector real de CSRF), solo en navegaciones GET
 * de nivel superior. Combinado con la lista blanca de orígenes en CORS y que
 * todas las rutas de auth exigen Content-Type: application/json, esto cubre
 * CSRF sin necesitar un token de doble envío aparte.
 */
function baseCookieOptions() {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    signed: true,
    path: '/',
  }
}

export function setAuthCookies(reply: FastifyReply, accessToken: string, refreshToken: string) {
  reply.setCookie('roma_access_token', accessToken, {
    ...baseCookieOptions(),
    maxAge: ACCESS_TOKEN_TTL_MS / 1000,
  })
  reply.setCookie('roma_refresh_token', refreshToken, {
    ...baseCookieOptions(),
    maxAge: REFRESH_TOKEN_TTL_MS / 1000,
  })
}

export function clearAuthCookies(reply: FastifyReply) {
  reply.clearCookie('roma_access_token', { path: '/' })
  reply.clearCookie('roma_refresh_token', { path: '/' })
}

/** Las cookies de auth van firmadas (signed: true) — el valor crudo en
 * request.cookies incluye la firma y no sirve tal cual, hay que desfirmarlo. */
export function getUnsignedCookie(request: FastifyRequest, name: string): string | null {
  const raw = request.cookies[name]
  if (!raw) return null
  const result = request.unsignCookie(raw)
  return result.valid ? result.value : null
}
