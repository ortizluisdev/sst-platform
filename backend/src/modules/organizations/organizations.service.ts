import type { PrismaClient } from '@prisma/client'
import { createOrganizationsRepository } from './organizations.repository.js'
import { createActivationService } from '../activation/activation.service.js'
import type { CreateOrganizationInput, UpdateOrganizationInput } from './organizations.schema.js'

export class OrganizationsError extends Error {
  constructor(
    public code: 'NIT_TAKEN' | 'DOCUMENT_TAKEN' | 'SERVICE_NOT_FOUND' | 'NOT_FOUND',
    message: string,
  ) {
    super(message)
  }
}

export function createOrganizationsService(prisma: PrismaClient) {
  const repository = createOrganizationsRepository(prisma)
  const activation = createActivationService(prisma)

  return {
    async create(input: CreateOrganizationInput, createdByUserId: string, ipAddress: string) {
      const existingOrg = await repository.findByNit(input.nit)
      if (existingOrg) throw new OrganizationsError('NIT_TAKEN', 'Ya existe una empresa registrada con ese NIT')

      const existingUser = await repository.findUserByDocument(input.responsable.documentNumber)
      if (existingUser) {
        throw new OrganizationsError('DOCUMENT_TAKEN', 'Ya existe una cuenta con ese número de documento')
      }

      // Todos los slugs deben existir — si uno no se encuentra, se rechaza el
      // alta completa (no se crea la empresa con solo algunos servicios).
      const services = await Promise.all(input.serviceSlugs.map((slug) => repository.findServiceBySlug(slug)))
      const missingIndex = services.findIndex((s) => !s)
      if (missingIndex !== -1) throw new OrganizationsError('SERVICE_NOT_FOUND', 'Servicio no encontrado')
      const serviceIds = services.map((s) => s!.id)

      const { organization, responsable } = await repository.createWithResponsible({
        nombre: input.nombre,
        nit: input.nit,
        contactEmail: input.contactEmail,
        serviceIds,
        logoBase64: input.logoBase64,
        primaryColor: input.primaryColor,
        secondaryColor: input.secondaryColor,
        responsable: input.responsable,
      })

      await repository.createAuditLog({
        userId: createdByUserId,
        organizationId: organization.id,
        action: 'USER_CREATED_BY_ADMIN',
        metadata: { targetUserId: responsable.id, serviceSlugs: input.serviceSlugs },
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

    async list() {
      const organizations = await repository.listFull()
      return organizations.map((org) => ({
        id: org.id,
        nombre: org.nombre,
        nit: org.nit,
        contactEmail: org.contactEmail,
        isActive: org.isActive,
        primaryColor: org.primaryColor,
        secondaryColor: org.secondaryColor,
        services: org.services.map((s) => ({ slug: s.service.slug, nombre: s.service.nombre, isActive: s.isActive })),
        responsable: org.users[0]?.user ?? null,
      }))
    },

    async update(
      organizationId: string,
      input: UpdateOrganizationInput,
      updatedByUserId: string,
      ipAddress: string,
    ) {
      const existing = await repository.findById(organizationId)
      if (!existing) throw new OrganizationsError('NOT_FOUND', 'Empresa no encontrada')

      if (input.nit) {
        const nitOwner = await repository.findByNit(input.nit)
        if (nitOwner && nitOwner.id !== organizationId) {
          throw new OrganizationsError('NIT_TAKEN', 'Ya existe una empresa registrada con ese NIT')
        }
      }

      const updated = await repository.update(organizationId, input)

      await repository.createAuditLog({
        userId: updatedByUserId,
        organizationId,
        action: 'ORGANIZATION_UPDATED',
        metadata: { changes: input },
        ipAddress,
      })

      return updated
    },
  }
}

export type OrganizationsService = ReturnType<typeof createOrganizationsService>
