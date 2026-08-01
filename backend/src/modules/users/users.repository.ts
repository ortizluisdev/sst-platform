import type { AccountStatus, Prisma, PrismaClient } from '@prisma/client'

export function createUsersRepository(prisma: PrismaClient) {
  return {
    /** Usado por el panel de gestión de cuentas — pestañas Activas/Suspendidas.
     * Nunca incluye cuentas de plataforma (roleId: null filtra a solo
     * responsables de empresa/clientes independientes). */
    findUsersByStatus(status: AccountStatus) {
      return prisma.user.findMany({
        where: { accountStatus: status, roleId: null },
        select: {
          id: true,
          documentType: true,
          documentNumber: true,
          email: true,
          nombre: true,
          cargo: true,
          accountStatus: true,
          suspendReason: true,
          createdAt: true,
          updatedAt: true,
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

    /** Selección acotada a los campos PERSONALES editables desde "Mi perfil"
     * — nunca password_hash ni nada de la organización. */
    findOwnProfile(id: string) {
      return prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          nombre: true,
          email: true,
          cargo: true,
          telefono: true,
          documentNumber: true,
          fotoBase64: true,
          firmaBase64: true,
        },
      })
    },

    updateOwnProfile(id: string, data: { nombre: string; email: string; cargo: string | null; telefono: string | null }) {
      return prisma.user.update({
        where: { id },
        data,
        select: {
          id: true,
          nombre: true,
          email: true,
          cargo: true,
          telefono: true,
          documentNumber: true,
          fotoBase64: true,
          firmaBase64: true,
        },
      })
    },

    updateOwnAvatar(id: string, fotoBase64: string) {
      return prisma.user.update({
        where: { id },
        data: { fotoBase64 },
        select: {
          id: true,
          nombre: true,
          email: true,
          cargo: true,
          telefono: true,
          documentNumber: true,
          fotoBase64: true,
          firmaBase64: true,
        },
      })
    },

    updateOwnFirma(id: string, firmaBase64: string) {
      return prisma.user.update({
        where: { id },
        data: { firmaBase64 },
        select: {
          id: true,
          nombre: true,
          email: true,
          cargo: true,
          telefono: true,
          documentNumber: true,
          fotoBase64: true,
          firmaBase64: true,
        },
      })
    },

    updatePassword(id: string, passwordHash: string) {
      return prisma.user.update({ where: { id }, data: { passwordHash } })
    },

    reactivateUser(id: string) {
      return prisma.user.update({
        where: { id },
        data: { accountStatus: 'ACTIVE', suspendReason: null },
      })
    },

    suspendUser(id: string, suspendReason: string) {
      return prisma.user.update({
        where: { id },
        data: { accountStatus: 'SUSPENDED', suspendReason },
      })
    },

    /** Nombre de la primera organización a la que pertenece — usado solo
     * para personalizar el correo de reenvío de invitación, no crítico si
     * el usuario no tiene membresía todavía. */
    async findOrganizationNombreForUser(userId: string): Promise<string | null> {
      const membership = await prisma.userOrganization.findFirst({
        where: { userId },
        select: { organization: { select: { nombre: true } } },
      })
      return membership?.organization.nombre ?? null
    },

    createAuditLog(input: {
      userId?: string | null
      organizationId?: string | null
      action: 'USER_SUSPENDED' | 'USER_REACTIVATED' | 'ACTIVATION_INVITE_RESENT'
      metadata?: Record<string, unknown>
      ipAddress?: string | null
    }) {
      return prisma.auditLog.create({
        data: {
          userId: input.userId,
          organizationId: input.organizationId,
          action: input.action,
          metadata: input.metadata as Prisma.InputJsonValue | undefined,
          ipAddress: input.ipAddress,
        },
      })
    },
  }
}

export type UsersRepository = ReturnType<typeof createUsersRepository>
