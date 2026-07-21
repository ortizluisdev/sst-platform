import fastifyJwt from '@fastify/jwt'
import type { FastifyInstance } from 'fastify'
import { env } from '../config/env.js'

/**
 * Deliberadamente mínimo: solo el id de usuario. Los permisos NUNCA se leen
 * del token — se resuelven en cada request contra la base de datos (ver
 * utils/permissions.ts), para que un cambio de rol/permiso tenga efecto
 * inmediato sin esperar a que expire un access token ya emitido.
 */
export interface AccessTokenPayload {
  sub: string
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AccessTokenPayload
    user: AccessTokenPayload
  }
}

/**
 * Solo firma/verifica el access token (vida corta, 15 min). El refresh token
 * NO es un JWT: es un valor aleatorio opaco, guardado hasheado en la base de
 * datos (ver utils/tokens.ts) — así se puede revocar server-side, algo que un
 * JWT autocontenido no permite sin una lista de revocación aparte.
 */
export async function registerJwt(app: FastifyInstance) {
  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: '15m' },
    cookie: {
      cookieName: 'roma_access_token',
      signed: true,
    },
  })
}
