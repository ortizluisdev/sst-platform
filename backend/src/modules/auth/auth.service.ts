import argon2 from 'argon2'
import type { PrismaClient } from '@prisma/client'
import type { FastifyInstance } from 'fastify'
import { createAuthRepository } from './auth.repository.js'
import { generateRefreshToken, hashToken } from '../../utils/tokens.js'
import { sendPasswordResetEmail } from '../../utils/mailer.js'
import { env } from '../../config/env.js'
import type { LoginInput, UpdateProfileInput } from './auth.schema.js'

export class AuthError extends Error {
  constructor(
    public code:
      | 'INVALID_CREDENTIALS'
      | 'ACCOUNT_PENDING_ACTIVATION'
      | 'ACCOUNT_SUSPENDED'
      | 'INVALID_TOKEN'
      | 'TOKEN_EXPIRED',
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
    async login(input: LoginInput, ctx: RequestContext) {
      const user = await repository.findUserByDocument(input.documentNumber)

      // Mismo mensaje de error para "no existe" y "contraseña incorrecta" —
      // no se debe revelar si un documento está registrado. Una cuenta
      // PENDING_ACTIVATION no tiene passwordHash todavía — cae en el mismo
      // camino (credenciales inválidas), no revela que el documento existe.
      if (!user || !user.passwordHash) {
        await repository.createAuditLog({ action: 'LOGIN_FAILED', ipAddress: ctx.ipAddress })
        throw new AuthError('INVALID_CREDENTIALS', 'Documento o contraseña incorrectos')
      }

      const validPassword = await argon2.verify(user.passwordHash, input.password)
      if (!validPassword) {
        await repository.createAuditLog({
          userId: user.id,
          action: 'LOGIN_FAILED',
          ipAddress: ctx.ipAddress,
        })
        throw new AuthError('INVALID_CREDENTIALS', 'Documento o contraseña incorrectos')
      }

      if (user.accountStatus === 'PENDING_ACTIVATION') {
        throw new AuthError(
          'ACCOUNT_PENDING_ACTIVATION',
          'Tu cuenta todavía no está activada. Revisa el correo de invitación que te enviamos.',
        )
      }
      if (user.accountStatus === 'SUSPENDED') {
        const reason = user.suspendReason?.trim()
        throw new AuthError(
          'ACCOUNT_SUSPENDED',
          reason
            ? `Tu cuenta fue suspendida. Motivo: ${reason}. Si crees que esto es un error, contáctanos.`
            : 'Tu cuenta fue suspendida. Si crees que esto es un error, contáctanos.',
        )
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
      if (!user || user.accountStatus !== 'ACTIVE') {
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

    /** Siempre resuelve sin error — el llamador responde 200 exista o no el documento. */
    async requestPasswordReset(documentNumber: string) {
      const user = await repository.findUserByDocument(documentNumber)
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

    /** Fase B.5 — completa cargo/teléfono obligatorios en el primer login.
     * No valida `mustUpdateProfile` acá: si ya está en false, sobrescribir
     * de nuevo es inofensivo (el usuario simplemente está editando su perfil). */
    async updateProfile(userId: string, input: UpdateProfileInput, ipAddress: string) {
      const updated = await repository.updateProfile(userId, input)
      await repository.createAuditLog({ userId, action: 'PROFILE_UPDATED', ipAddress })
      return updated
    },
  }
}

export type AuthService = ReturnType<typeof createAuthService>
