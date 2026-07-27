import type { PrismaClient } from '@prisma/client'
import { createOrganizationsRepository } from './organizations.repository.js'
import { createActivationService } from '../activation/activation.service.js'
import type { CreateOrganizationInput } from './organizations.schema.js'

export class OrganizationsError extends Error {
  constructor(
    public code: 'NIT_TAKEN' | 'DOCUMENT_TAKEN' | 'SERVICE_NOT_FOUND',
    message: string,
  ) {
    super(message)
  }
}

export function createOrganizationsService(prisma: PrismaClient) {
  const repository = createOrganizationsRepository(prisma)
  const activation = createActivationService(prisma)

  return {
    listServices() {
      return repository.listActiveServices()
    },

    async create(input: CreateOrganizationInput, createdByUserId: string, ipAddress: string) {
      const existingOrg = await repository.findByNit(input.nit)
      if (existingOrg) throw new OrganizationsError('NIT_TAKEN', 'Ya existe una empresa registrada con ese NIT')

      const existingUser = await repository.findUserByDocument(input.responsable.documentNumber)
      if (existingUser) {
        throw new OrganizationsError('DOCUMENT_TAKEN', 'Ya existe una cuenta con ese número de documento')
      }

      const service = await repository.findServiceBySlug(input.serviceSlug)
      if (!service) throw new OrganizationsError('SERVICE_NOT_FOUND', 'Servicio no encontrado')

      const { organization, responsable } = await repository.createWithResponsible({
        nombre: input.nombre,
        nit: input.nit,
        contactEmail: input.contactEmail,
        serviceId: service.id,
        responsable: input.responsable,
      })

      await repository.createAuditLog({
        userId: createdByUserId,
        organizationId: organization.id,
        action: 'USER_CREATED_BY_ADMIN',
        metadata: { targetUserId: responsable.id, serviceSlug: input.serviceSlug },
        ipAddress,
      })

      await activation.issueAndSendInvite({
        userId: responsable.id,
        email: responsable.email,
        nombre: responsable.nombre,
        organizationNombre: organization.nombre,
      })

      return { organization, responsable }
    },
  }
}

export type OrganizationsService = ReturnType<typeof createOrganizationsService>
