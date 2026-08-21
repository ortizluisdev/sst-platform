import type { PrismaClient } from '@prisma/client'
import { createOrganizationsRepository } from './organizations.repository.js'
import { createActivationService } from '../activation/activation.service.js'
import type { CreateOrganizationInput, UpdateOrganizationInput, UpdateOrganizationServicesInput } from './organizations.schema.js'

export class OrganizationsError extends Error {
  constructor(
    public code: 'NIT_TAKEN' | 'DOCUMENT_TAKEN' | 'SERVICE_NOT_FOUND' | 'NOT_FOUND' | 'HAS_ACTIVE_RESPONSABLE',
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

    async list(options?: { deletedOnly?: boolean }) {
      const organizations = await repository.listFull(options)
      return organizations.map((org) => ({
        id: org.id,
        nombre: org.nombre,
        nit: org.nit,
        contactEmail: org.contactEmail,
        isActive: org.isActive,
        createdAt: org.createdAt.toISOString(),
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

    /** Agrega/quita servicios contratados — nunca borra filas ni datos
     * históricos, ver Global Constraints. Un log de auditoría por servicio
     * que cambia (ORG_SERVICE_GRANTED/ORG_SERVICE_REVOKED, valores ya
     * existentes en el enum pero sin uso hasta ahora), no uno genérico por
     * la petición completa. */
    async updateServices(
      organizationId: string,
      input: UpdateOrganizationServicesInput,
      updatedByUserId: string,
      ipAddress: string,
    ) {
      const existing = await repository.findById(organizationId)
      if (!existing) throw new OrganizationsError('NOT_FOUND', 'Empresa no encontrada')

      const services = await Promise.all(input.serviceSlugs.map((slug) => repository.findServiceBySlug(slug)))
      const missingIndex = services.findIndex((s) => !s)
      if (missingIndex !== -1) throw new OrganizationsError('SERVICE_NOT_FOUND', 'Servicio no encontrado')

      const current = await repository.listOrganizationServicesWithSlugs(organizationId)
      const diff = computeServiceDiff(current, input.serviceSlugs)

      const grants = diff.toGrant.map((slug) => ({
        slug,
        serviceId: services[input.serviceSlugs.indexOf(slug)]!.id,
      }))
      // `services` (arriba) solo resuelve los slugs DESEADOS — los que se
      // revocan pueden no estar ahí, por eso se resuelven aparte.
      const revokedServices = diff.toRevoke.length > 0 ? await repository.findServiceIdsBySlugs(diff.toRevoke) : []

      await repository.applyServiceDiff(organizationId, grants, revokedServices.map((s) => s.id))

      for (const grant of grants) {
        await repository.createAuditLog({
          userId: updatedByUserId,
          organizationId,
          action: 'ORG_SERVICE_GRANTED',
          metadata: { serviceSlug: grant.slug },
          ipAddress,
        })
      }
      for (const slug of diff.toRevoke) {
        await repository.createAuditLog({
          userId: updatedByUserId,
          organizationId,
          action: 'ORG_SERVICE_REVOKED',
          metadata: { serviceSlug: slug },
          ipAddress,
        })
      }
    },

    /** Borrado suave — bloqueado mientras el responsable de la empresa tenga
     * cuenta ACTIVE (perdería acceso sin aviso); hay que suspenderla primero
     * desde la pestaña "Activas". Nunca borra datos, solo oculta la fila de
     * los listados normales (ver Organization.deletedAt). */
    async remove(organizationId: string, deletedByUserId: string, ipAddress: string) {
      const existing = await repository.findById(organizationId)
      if (!existing || existing.deletedAt) throw new OrganizationsError('NOT_FOUND', 'Empresa no encontrada')

      const membership = await repository.findResponsable(organizationId)
      if (membership?.user.accountStatus === 'ACTIVE') {
        throw new OrganizationsError(
          'HAS_ACTIVE_RESPONSABLE',
          'No se puede eliminar: la empresa tiene un responsable con cuenta activa. Suspéndela primero.',
        )
      }

      await repository.softDelete(organizationId)

      await repository.createAuditLog({
        userId: deletedByUserId,
        organizationId,
        action: 'ORGANIZATION_DELETED',
        ipAddress,
      })
    },

    async restore(organizationId: string, restoredByUserId: string, ipAddress: string) {
      const existing = await repository.findById(organizationId)
      if (!existing || !existing.deletedAt) throw new OrganizationsError('NOT_FOUND', 'Empresa no encontrada')

      await repository.restore(organizationId)

      await repository.createAuditLog({
        userId: restoredByUserId,
        organizationId,
        action: 'ORGANIZATION_RESTORED',
        ipAddress,
      })
    },
  }
}

export type OrganizationsService = ReturnType<typeof createOrganizationsService>

export interface OrganizationServiceState {
  slug: string
  isActive: boolean
}

/**
 * Diferencia pura entre el estado actual de servicios contratados y el
 * conjunto deseado — separada de cualquier acceso a Prisma para poder
 * testearla sin base de datos (2026-08, "agregar/quitar servicios").
 *
 * - Un slug deseado que hoy no está activo (sea porque nunca existió la
 *   fila, o porque existe pero isActive=false) va a `toGrant` — el
 *   repository decide si eso significa crear la fila o solo reactivarla.
 * - Un slug hoy activo que ya no está en la lista deseada va a `toRevoke`
 *   — nunca se borra la fila, solo se desactiva (ver Global Constraints).
 * - Un slug ya inactivo que tampoco está en la lista deseada no aparece en
 *   ningún lado: ya está en el estado correcto, no hay nada que revocar
 *   dos veces.
 */
export function computeServiceDiff(
  current: OrganizationServiceState[],
  desiredSlugs: string[],
): { toGrant: string[]; toRevoke: string[] } {
  const currentActiveSlugs = new Set(current.filter((s) => s.isActive).map((s) => s.slug))
  const desiredSet = new Set(desiredSlugs)
  const toGrant = desiredSlugs.filter((slug) => !currentActiveSlugs.has(slug))
  const toRevoke = current.filter((s) => s.isActive && !desiredSet.has(s.slug)).map((s) => s.slug)
  return { toGrant, toRevoke }
}
