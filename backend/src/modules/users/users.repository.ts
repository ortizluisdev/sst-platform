import type { PrismaClient } from '@prisma/client'

export function createUsersRepository(prisma: PrismaClient) {
  return {
    findPendingUsers() {
      return prisma.user.findMany({
        where: { isActive: false, roleId: null }, // solo clientes autorregistrados, nunca cuentas de plataforma
        select: {
          id: true,
          email: true,
          nombre: true,
          createdAt: true,
          organizations: {
            select: { organization: { select: { id: true, nombre: true } }, role: { select: { name: true } } },
          },
        },
        orderBy: { createdAt: 'asc' },
      })
    },

    findUserById(id: string) {
      return prisma.user.findUnique({ where: { id } })
    },

    approveUser(id: string) {
      return prisma.user.update({ where: { id }, data: { isActive: true } })
    },

    createAuditLog(input: {
      userId?: string | null
      organizationId?: string | null
      action: 'USER_APPROVED'
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

export type UsersRepository = ReturnType<typeof createUsersRepository>
