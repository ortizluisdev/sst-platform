import type { AccountStatus, DocumentType, Prisma, PrismaClient } from '@prisma/client'

export function createOrganizationsRepository(prisma: PrismaClient) {
  return {
    findByNit(nit: string) {
      return prisma.organization.findUnique({ where: { nit } })
    },

    findUserByDocument(documentNumber: string) {
      return prisma.user.findUnique({ where: { documentNumber } })
    },

    findServiceBySlug(slug: string) {
      return prisma.service.findUnique({ where: { slug } })
    },

    listActiveServices() {
      return prisma.service.findMany({
        where: { isActive: true },
        select: { slug: true, nombre: true },
        orderBy: { nombre: 'asc' },
      })
    },

    /** Crea Organization + OrganizationService (contratado, activo) + User
     * responsable (PENDING_ACTIVATION, sin password todavía) + UserOrganization
     * (rol "cliente") atómicamente — el rol "cliente" debe existir, lo crea
     * el seed. */
    async createWithResponsible(input: {
      nombre: string
      nit: string
      contactEmail: string
      serviceId: string
      responsable: {
        documentType: DocumentType
        documentNumber: string
        nombre: string
        email: string
        cargo: string
      }
    }) {
      const clienteRole = await prisma.role.findUnique({ where: { name: 'cliente' } })
      if (!clienteRole) {
        throw new Error('Rol "cliente" no existe — corre el seed (npm run prisma:seed) antes de crear empresas.')
      }

      return prisma.$transaction(async (tx) => {
        const organization = await tx.organization.create({
          data: { nombre: input.nombre, nit: input.nit, contactEmail: input.contactEmail },
        })
        await tx.organizationService.create({
          data: { organizationId: organization.id, serviceId: input.serviceId, isActive: true },
        })
        const responsable = await tx.user.create({
          data: {
            documentType: input.responsable.documentType,
            documentNumber: input.responsable.documentNumber,
            email: input.responsable.email,
            nombre: input.responsable.nombre,
            cargo: input.responsable.cargo,
            accountStatus: 'PENDING_ACTIVATION' as AccountStatus,
          },
        })
        await tx.userOrganization.create({
          data: { userId: responsable.id, organizationId: organization.id, roleId: clienteRole.id },
        })
        return { organization, responsable }
      })
    },

    createAuditLog(input: {
      userId: string
      organizationId: string
      action: 'USER_CREATED_BY_ADMIN'
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

export type OrganizationsRepository = ReturnType<typeof createOrganizationsRepository>
