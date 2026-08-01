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

    findById(id: string) {
      return prisma.organization.findUnique({ where: { id } })
    },

    /** El responsable es el primer miembro (orden de creación) — hoy toda
     * organización se crea con exactamente uno vía createWithResponsible(). */
    listFull() {
      return prisma.organization.findMany({
        select: {
          id: true,
          nombre: true,
          nit: true,
          contactEmail: true,
          isActive: true,
          primaryColor: true,
          secondaryColor: true,
          services: {
            select: { isActive: true, service: { select: { slug: true, nombre: true } } },
          },
          users: {
            select: {
              user: {
                select: {
                  id: true,
                  nombre: true,
                  documentType: true,
                  documentNumber: true,
                  email: true,
                  accountStatus: true,
                  suspendReason: true,
                },
              },
            },
            orderBy: { createdAt: 'asc' },
            take: 1,
          },
        },
        orderBy: { nombre: 'asc' },
      })
    },

    update(id: string, data: { nombre?: string; nit?: string; contactEmail?: string }) {
      return prisma.organization.update({ where: { id }, data })
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
      logoBase64?: string
      primaryColor?: string
      secondaryColor?: string
      responsable: {
        documentType: DocumentType
        documentNumber: string
        nombre: string
        cargo: string
        telefono: string
      }
    }) {
      const clienteRole = await prisma.role.findUnique({ where: { name: 'cliente' } })
      if (!clienteRole) {
        throw new Error('Rol "cliente" no existe — corre el seed (npm run prisma:seed) antes de crear empresas.')
      }

      return prisma.$transaction(async (tx) => {
        const organization = await tx.organization.create({
          data: {
            nombre: input.nombre,
            nit: input.nit,
            contactEmail: input.contactEmail,
            logoBase64: input.logoBase64,
            primaryColor: input.primaryColor,
            secondaryColor: input.secondaryColor,
          },
        })
        await tx.organizationService.create({
          data: { organizationId: organization.id, serviceId: input.serviceId, isActive: true },
        })
        const responsable = await tx.user.create({
          data: {
            documentType: input.responsable.documentType,
            documentNumber: input.responsable.documentNumber,
            // Un solo correo por empresa — el mismo contactEmail de la
            // organización (ver nota en organizations.schema.ts).
            email: input.contactEmail,
            nombre: input.responsable.nombre,
            cargo: input.responsable.cargo,
            telefono: input.responsable.telefono,
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
      action: 'USER_CREATED_BY_ADMIN' | 'ORGANIZATION_UPDATED'
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
