import argon2 from 'argon2'
import type { PrismaClient } from '@prisma/client'
import { createUsersRepository } from './users.repository.js'
import { createNotificationService } from '../notifications/notifications.service.js'
import { createActivationService } from '../activation/activation.service.js'

export class UsersError extends Error {
  constructor(
    public code: 'NOT_FOUND' | 'ALREADY_ACTIVE' | 'ALREADY_SUSPENDED' | 'NOT_PENDING_ACTIVATION' | 'INVALID_CURRENT_PASSWORD',
    message: string,
  ) {
    super(message)
  }
}

export function createUsersService(prisma: PrismaClient) {
  const repository = createUsersRepository(prisma)
  const notifications = createNotificationService(prisma)
  const activation = createActivationService(prisma)

  return {
    listActive() {
      return repository.findUsersByStatus('ACTIVE')
    },

    listSuspended() {
      return repository.findUsersByStatus('SUSPENDED')
    },

    listPendingActivation() {
      return repository.findUsersByStatus('PENDING_ACTIVATION')
    },

    async getOwnProfile(userId: string) {
      const user = await repository.findOwnProfile(userId)
      if (!user) throw new UsersError('NOT_FOUND', 'Usuario no encontrado')
      return user
    },

    async updateOwnProfile(userId: string, data: { nombre: string; cargo?: string; telefono?: string }) {
      const user = await repository.findOwnProfile(userId)
      if (!user) throw new UsersError('NOT_FOUND', 'Usuario no encontrado')
      return repository.updateOwnProfile(userId, {
        nombre: data.nombre,
        cargo: data.cargo || null,
        telefono: data.telefono || null,
      })
    },

    async updateOwnAvatar(userId: string, fotoBase64: string) {
      const user = await repository.findOwnProfile(userId)
      if (!user) throw new UsersError('NOT_FOUND', 'Usuario no encontrado')
      return repository.updateOwnAvatar(userId, fotoBase64)
    },

    /** Firma visual (imagen escaneada/dibujada) para la sección "Firma y
     * sello" de los reportes PDF — no es una firma criptográfica. */
    async updateOwnFirma(userId: string, firmaBase64: string) {
      const user = await repository.findOwnProfile(userId)
      if (!user) throw new UsersError('NOT_FOUND', 'Usuario no encontrado')
      return repository.updateOwnFirma(userId, firmaBase64)
    },

    /** Nunca confía en la sesión para saltarse la verificación — igual que el
     * login, exige la contraseña actual antes de aceptar la nueva. */
    async changeOwnPassword(userId: string, currentPassword: string, newPassword: string) {
      const user = await repository.findUserById(userId)
      if (!user || !user.passwordHash) throw new UsersError('NOT_FOUND', 'Usuario no encontrado')

      const validPassword = await argon2.verify(user.passwordHash, currentPassword)
      if (!validPassword) throw new UsersError('INVALID_CURRENT_PASSWORD', 'La contraseña actual no es correcta')

      const passwordHash = await argon2.hash(newPassword)
      await repository.updatePassword(userId, passwordHash)
    },

    /** Reenvía la invitación de activación sin recrear el usuario — para el
     * caso de que el token de 48h haya vencido antes de que el responsable
     * lo use. Invalida cualquier link viejo (ver activation.service.ts). */
    async resendInvitation(userId: string, resentByUserId: string, ipAddress: string) {
      const user = await repository.findUserById(userId)
      if (!user) throw new UsersError('NOT_FOUND', 'Usuario no encontrado')
      if (user.accountStatus !== 'PENDING_ACTIVATION') {
        throw new UsersError('NOT_PENDING_ACTIVATION', 'Esta cuenta ya fue activada')
      }

      const membership = await repository.findOrganizationNombreForUser(userId)
      await activation.issueAndSendInvite({
        userId: user.id,
        email: user.email,
        nombre: user.nombre,
        organizationNombre: membership,
      })

      await repository.createAuditLog({
        userId: resentByUserId,
        action: 'ACTIVATION_INVITE_RESENT',
        metadata: { targetUserId: userId },
        ipAddress,
      })

      return user
    },

    async reactivate(userId: string, reactivatedByUserId: string, ipAddress: string) {
      const user = await repository.findUserById(userId)
      if (!user) throw new UsersError('NOT_FOUND', 'Usuario no encontrado')
      if (user.accountStatus === 'ACTIVE') throw new UsersError('ALREADY_ACTIVE', 'Este usuario ya está activo')

      const reactivated = await repository.reactivateUser(userId)
      await repository.createAuditLog({
        userId: reactivatedByUserId,
        action: 'USER_REACTIVATED',
        metadata: { targetUserId: userId },
        ipAddress,
      })

      await notifications.notify({
        type: 'CUENTA_REACTIVADA',
        recipientIds: [reactivated.id],
        senderId: reactivatedByUserId,
        message: 'Tu cuenta fue reactivada. Ya puedes iniciar sesión en RoMa+.',
        link: '/ingresar',
      })

      return reactivated
    },

    async suspend(userId: string, suspendReason: string, suspendedByUserId: string, ipAddress: string) {
      const user = await repository.findUserById(userId)
      if (!user) throw new UsersError('NOT_FOUND', 'Usuario no encontrado')
      if (user.accountStatus === 'SUSPENDED') throw new UsersError('ALREADY_SUSPENDED', 'Este usuario ya está suspendido')

      const suspended = await repository.suspendUser(userId, suspendReason)
      await repository.createAuditLog({
        userId: suspendedByUserId,
        action: 'USER_SUSPENDED',
        metadata: { targetUserId: userId, suspendReason },
        ipAddress,
      })

      await notifications.notify({
        type: 'CUENTA_SUSPENDIDA',
        recipientIds: [suspended.id],
        senderId: suspendedByUserId,
        message: `Tu cuenta en RoMa+ fue suspendida. Motivo: ${suspendReason}`,
        metadata: { suspendReason },
      })

      return suspended
    },
  }
}

export type UsersService = ReturnType<typeof createUsersService>
