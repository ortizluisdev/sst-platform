import type { PrismaClient } from '@prisma/client'
import { env } from '../../config/env.js'

export function createActivationRepository(prisma: PrismaClient) {
  return {
    createToken(userId: string, tokenHash: string) {
      return prisma.activationToken.create({
        data: {
          userId,
          tokenHash,
          expiresAt: new Date(Date.now() + env.ACTIVATION_TOKEN_TTL_HOURS * 60 * 60 * 1000),
        },
      })
    },

    findTokenByHash(tokenHash: string) {
      return prisma.activationToken.findUnique({ where: { tokenHash } })
    },

    markTokenUsed(id: string) {
      return prisma.activationToken.update({ where: { id }, data: { usedAt: new Date() } })
    },

    /** Invalida (marca usados) todos los tokens sin usar de un usuario —
     * se llama antes de emitir uno nuevo (creación inicial o reenvío), para
     * que un link viejo nunca quede vivo en paralelo con uno nuevo. */
    invalidateActiveTokensForUser(userId: string) {
      return prisma.activationToken.updateMany({
        where: { userId, usedAt: null },
        data: { usedAt: new Date() },
      })
    },

    findUserById(id: string) {
      return prisma.user.findUnique({ where: { id } })
    },

    activateUser(userId: string, passwordHash: string) {
      return prisma.user.update({
        where: { id: userId },
        data: { passwordHash, accountStatus: 'ACTIVE', mustUpdateProfile: true },
      })
    },

    createAuditLog(input: { userId: string; action: 'ACCOUNT_ACTIVATED'; ipAddress?: string | null }) {
      return prisma.auditLog.create({
        data: { userId: input.userId, action: input.action, ipAddress: input.ipAddress },
      })
    },
  }
}

export type ActivationRepository = ReturnType<typeof createActivationRepository>
