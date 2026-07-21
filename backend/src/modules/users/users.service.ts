import type { PrismaClient } from '@prisma/client'
import { createUsersRepository } from './users.repository.js'

export class UsersError extends Error {
  constructor(
    public code: 'NOT_FOUND' | 'ALREADY_ACTIVE',
    message: string,
  ) {
    super(message)
  }
}

export function createUsersService(prisma: PrismaClient) {
  const repository = createUsersRepository(prisma)

  return {
    listPending() {
      return repository.findPendingUsers()
    },

    async approve(userId: string, approvedByUserId: string, ipAddress: string) {
      const user = await repository.findUserById(userId)
      if (!user) throw new UsersError('NOT_FOUND', 'Usuario no encontrado')
      if (user.isActive) throw new UsersError('ALREADY_ACTIVE', 'Este usuario ya está activo')

      const approved = await repository.approveUser(userId)
      await repository.createAuditLog({
        userId: approvedByUserId,
        action: 'USER_APPROVED',
        ipAddress,
      })
      return approved
    },
  }
}

export type UsersService = ReturnType<typeof createUsersService>
