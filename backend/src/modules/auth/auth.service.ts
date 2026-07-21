import argon2 from 'argon2'
import type { PrismaClient } from '@prisma/client'
import type { FastifyInstance } from 'fastify'
import { createAuthRepository } from './auth.repository.js'
import { generateRefreshToken, hashToken } from '../../utils/tokens.js'
import { sendPasswordResetEmail } from '../../utils/mailer.js'
import { env } from '../../config/env.js'
import type { RegisterInput, LoginInput } from './auth.schema.js'

export class AuthError extends Error {
  constructor(
    public code: 'EMAIL_TAKEN' | 'INVALID_CREDENTIALS' | 'ACCOUNT_INACTIVE' | 'INVALID_TOKEN' | 'TOKEN_EXPIRED',
    message: string,
  ) {
    super(message)
  }
}

interface RequestContext {
  ipAddress: string
  userAgent?: string
}

export function createAuthService(prisma: PrismaClient, app: FastifyInstance) {
  const repository = createAuthRepository(prisma)

  async function issueTokenPair(userId: string, ctx: RequestContext) {
    const accessToken = app.jwt.sign({ sub: userId })
    const refreshToken = generateRefreshToken()
    await repository.createRefreshToken({
      userId,
      tokenHash: hashToken(refreshToken),
      userAgent: ctx.userAgent,
      ipAddress: ctx.ipAddress,
    })
    return { accessToken, refreshToken }
  }

  return {
    async register(input: RegisterInput, ctx: RequestContext) {
      const existing = await repository.findUserByEmail(input.email)
      if (existing) throw new AuthError('EMAIL_TAKEN', 'Ese correo ya está registrado')

      const passwordHash = await argon2.hash(input.password)
      const { user, organization } = await repository.registerClient({
        email: input.email,
        passwordHash,
        nombre: input.nombre,
        organizationName: input.organizationName,
      })

      // Sin login automático: la cuenta queda inactiva hasta que un
      // super-admin/adminsystem la apruebe (ver users.service.ts).
      await repository.createAuditLog({
        userId: user.id,
        organizationId: organization.id,
        action: 'USER_REGISTERED',
        ipAddress: ctx.ipAddress,
      })

      return { user, organization }
    },

    async login(input: LoginInput, ctx: RequestContext) {
      const user = await repository.findUserByEmail(input.email)

      // Mismo mensaje de error para "no existe" y "contraseña incorrecta" —
      // no se debe revelar si un email está registrado.
      if (!user) {
        await repository.createAuditLog({ action: 'LOGIN_FAILED', ipAddress: ctx.ipAddress })
        throw new AuthError('INVALID_CREDENTIALS', 'Correo o contraseña incorrectos')
      }

      const validPassword = await argon2.verify(user.passwordHash, input.password)
      if (!validPassword) {
        await repository.createAuditLog({
          userId: user.id,
          action: 'LOGIN_FAILED',
          ipAddress: ctx.ipAddress,
        })
        throw new AuthError('INVALID_CREDENTIALS', 'Correo o contraseña incorrectos')
      }

      if (!user.isActive) {
        throw new AuthError('ACCOUNT_INACTIVE', 'Esta cuenta está inactiva')
      }

      const tokens = await issueTokenPair(user.id, ctx)
      await repository.createAuditLog({ userId: user.id, action: 'LOGIN', ipAddress: ctx.ipAddress })

      return { user, ...tokens }
    },

    /** Rota el refresh token: revoca el usado y emite un par nuevo. Nunca reutilizable. */
    async refresh(refreshToken: string, ctx: RequestContext) {
      const tokenHash = hashToken(refreshToken)
      const stored = await repository.findRefreshTokenByHash(tokenHash)

      if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
        throw new AuthError('INVALID_TOKEN', 'Sesión inválida o expirada')
      }

      const user = await repository.findUserById(stored.userId)
      if (!user || !user.isActive) {
        throw new AuthError('INVALID_TOKEN', 'Sesión inválida o expirada')
      }

      const tokens = await issueTokenPair(user.id, ctx)
      await repository.revokeRefreshToken(stored.id)

      return { user, ...tokens }
    },

    async logout(refreshToken: string) {
      const stored = await repository.findRefreshTokenByHash(hashToken(refreshToken))
      if (stored && !stored.revokedAt) {
        await repository.revokeRefreshToken(stored.id)
        await repository.createAuditLog({ userId: stored.userId, action: 'LOGOUT' })
      }
    },

    /** Siempre resuelve sin error — el llamador responde 200 exista o no el correo. */
    async requestPasswordReset(email: string) {
      const user = await repository.findUserByEmail(email)
      if (!user) return

      const rawToken = generateRefreshToken()
      await repository.createPasswordResetToken(user.id, hashToken(rawToken))
      await repository.createAuditLog({ userId: user.id, action: 'PASSWORD_RESET_REQUESTED' })

      const resetUrl = `${env.FRONTEND_URL}/restablecer-contrasena?token=${rawToken}`
      await sendPasswordResetEmail(user.email, user.nombre, resetUrl)
    },

    async confirmPasswordReset(rawToken: string, newPassword: string) {
      const stored = await repository.findPasswordResetTokenByHash(hashToken(rawToken))

      if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
        throw new AuthError('INVALID_TOKEN', 'Enlace inválido o expirado')
      }

      const passwordHash = await argon2.hash(newPassword)
      await repository.updateUserPassword(stored.userId, passwordHash)
      await repository.markPasswordResetTokenUsed(stored.id)
      // Un cambio de contraseña invalida cualquier sesión abierta con la clave vieja.
      await repository.revokeAllRefreshTokensForUser(stored.userId)
      await repository.createAuditLog({ userId: stored.userId, action: 'PASSWORD_RESET_COMPLETED' })
    },
  }
}

export type AuthService = ReturnType<typeof createAuthService>
