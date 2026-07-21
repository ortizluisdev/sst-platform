import type { AuditAction, PrismaClient } from '@prisma/client'
import { REFRESH_TOKEN_TTL_MS } from '../../utils/tokens.js'

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000 // 1 hora

export function createAuthRepository(prisma: PrismaClient) {
  return {
    findUserByEmail(email: string) {
      return prisma.user.findUnique({ where: { email } })
    },

    findUserById(id: string) {
      return prisma.user.findUnique({ where: { id } })
    },

/** Crea Organization + User (sin rol de plataforma, INACTIVO) +
     * UserOrganization (rol "cliente") atómicamente. isActive queda en false
     * a propósito: un super-admin/adminsystem debe aprobar la cuenta antes
     * de que pueda iniciar sesión (ver users.repository.ts). El rol
     * "cliente" debe existir — lo crea el seed. */
    async registerClient(input: { email: string; passwordHash: string; nombre: string; organizationName: string }) {
      const clienteRole = await prisma.role.findUnique({ where: { name: 'cliente' } })
      if (!clienteRole) {
        throw new Error('Rol "cliente" no existe — corre el seed (npm run prisma:seed) antes de registrar clientes.')
      }

      return prisma.$transaction(async (tx) => {
        const organization = await tx.organization.create({
          data: { nombre: input.organizationName },
        })
        const user = await tx.user.create({
          data: {
            email: input.email,
            passwordHash: input.passwordHash,
            nombre: input.nombre,
            isActive: false,
          },
        })
        await tx.userOrganization.create({
          data: { userId: user.id, organizationId: organization.id, roleId: clienteRole.id },
        })
        return { user, organization }
      })
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
