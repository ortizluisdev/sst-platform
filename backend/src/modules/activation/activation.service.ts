import argon2 from 'argon2'
import type { PrismaClient } from '@prisma/client'
import { createActivationRepository } from './activation.repository.js'
import { generateRefreshToken, hashToken } from '../../utils/tokens.js'
import { sendActivationInviteEmail, sendAccountActiveEmail } from '../../utils/mailer.js'
import { env } from '../../config/env.js'

export class ActivationError extends Error {
  constructor(
    public code: 'INVALID_TOKEN' | 'NOT_PENDING',
    message: string,
  ) {
    super(message)
  }
}

export function createActivationService(prisma: PrismaClient) {
  const repository = createActivationRepository(prisma)

  return {
    /** Emite un token nuevo e invalida cualquiera previo del mismo usuario —
     * usado tanto al crear la empresa/responsable (Fase B.2/B.3) como al
     * reenviar la invitación manualmente (ver users.service.ts). */
    async issueAndSendInvite(input: {
      userId: string
      email: string
      nombre: string
      organizationNombre?: string | null
    }) {
      await repository.invalidateActiveTokensForUser(input.userId)
      const rawToken = generateRefreshToken()
      await repository.createToken(input.userId, hashToken(rawToken))

      const activationUrl = `${env.FRONTEND_URL}/activar-cuenta?token=${rawToken}`
      await sendActivationInviteEmail({
        to: input.email,
        nombre: input.nombre,
        organizationNombre: input.organizationNombre,
        activationUrl,
        ttlHours: env.ACTIVATION_TOKEN_TTL_HOURS,
      })
    },

    async confirm(rawToken: string, newPassword: string, ipAddress: string) {
      const stored = await repository.findTokenByHash(hashToken(rawToken))
      if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
        throw new ActivationError('INVALID_TOKEN', 'Enlace de activación inválido o expirado')
      }

      const user = await repository.findUserById(stored.userId)
      if (!user || user.accountStatus !== 'PENDING_ACTIVATION') {
        throw new ActivationError('NOT_PENDING', 'Esta cuenta ya fue activada o no está disponible')
      }

      const passwordHash = await argon2.hash(newPassword)
      const hasBranding = await repository.organizationAlreadyHasBranding(user.id)
      const activated = await repository.activateUser(user.id, passwordHash, !hasBranding)
      await repository.markTokenUsed(stored.id)
      await repository.createAuditLog({ userId: user.id, action: 'ACCOUNT_ACTIVATED', ipAddress })

      await sendAccountActiveEmail({
        to: activated.email,
        nombre: activated.nombre,
        documentNumber: activated.documentNumber,
      })

      return activated
    },
  }
}

export type ActivationService = ReturnType<typeof createActivationService>
