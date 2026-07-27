import type { AuditAction, PrismaClient } from '@prisma/client'
import { REFRESH_TOKEN_TTL_MS } from '../../utils/tokens.js'

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000 // 1 hora

export function createAuthRepository(prisma: PrismaClient) {
  return {
    findUserByDocument(documentNumber: string) {
      return prisma.user.findUnique({ where: { documentNumber } })
    },

    findUserById(id: string) {
      return prisma.user.findUnique({ where: { id } })
    },

    createRefreshToken(input: {
      userId: string
      tokenHash: string
      userAgent?: string | null
      ipAddress?: string | null
    }) {
      return prisma.refreshToken.create({
        data: {
          userId: input.userId,
          tokenHash: input.tokenHash,
          expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
          userAgent: input.userAgent,
          ipAddress: input.ipAddress,
        },
      })
    },

    findRefreshTokenByHash(tokenHash: string) {
      return prisma.refreshToken.findUnique({ where: { tokenHash } })
    },

    revokeRefreshToken(id: string, replacedByTokenId?: string) {
      return prisma.refreshToken.update({
        where: { id },
        data: { revokedAt: new Date(), replacedByTokenId },
      })
    },

    revokeAllRefreshTokensForUser(userId: string) {
      return prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      })
    },

    createPasswordResetToken(userId: string, tokenHash: string) {
      return prisma.passwordResetToken.create({
        data: {
          userId,
          tokenHash,
          expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
        },
      })
    },

    findPasswordResetTokenByHash(tokenHash: string) {
      return prisma.passwordResetToken.findUnique({ where: { tokenHash } })
    },

    markPasswordResetTokenUsed(id: string) {
      return prisma.passwordResetToken.update({ where: { id }, data: { usedAt: new Date() } })
    },

    updateUserPassword(userId: string, passwordHash: string) {
      return prisma.user.update({ where: { id: userId }, data: { passwordHash } })
    },

    /** Completa el perfil obligatorio (Fase B.5) y limpia `mustUpdateProfile`
     * — el guard de rutas del frontend deja de forzar esta pantalla apenas
     * el backend confirma el guardado. */
    updateProfile(userId: string, input: { cargo: string; telefono: string }) {
      return prisma.user.update({
        where: { id: userId },
        data: { cargo: input.cargo, telefono: input.telefono, mustUpdateProfile: false },
      })
    },

    createAuditLog(input: {
      userId?: string | null
      organizationId?: string | null
      action: AuditAction
      ipAddress?: string | null
    }) {
      return prisma.auditLog.create({
        data: {
          userId: input.userId,
          organizationId: input.organizationId,
          action: input.action,
          ipAddress: input.ipAddress,
        },
      })
    },
  }
}

export type AuthRepository = ReturnType<typeof createAuthRepository>
