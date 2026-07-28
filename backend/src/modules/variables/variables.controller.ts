import type { FastifyReply, FastifyRequest } from 'fastify'
import {
  uploadVariablesParamsSchema,
  dashboardParamsSchema,
  adminDashboardParamsSchema,
  uploadDetailParamsSchema,
  adminUploadDetailParamsSchema,
  formatFieldErrors,
} from './variables.schema.js'
import { createVariablesService, VariablesError } from './variables.service.js'
import { hasPermission, resolveUserPermissions } from '../../utils/permissions.js'

function sendVariablesError(reply: FastifyReply, err: unknown) {
  if (err instanceof VariablesError) {
    const statusByCode = {
      SERVICE_NOT_FOUND: 404,
      ORG_NOT_FOUND: 404,
      SERVICE_NOT_CONTRACTED: 403,
      INVALID_FILE: 422,
      UNKNOWN_VARIABLES: 422,
      UPLOAD_NOT_FOUND: 404,
    } as const
    return reply.code(statusByCode[err.code]).send({ message: err.message })
  }
  throw err
}

/** GET — lista de organizaciones con el servicio contratado, para el
 * selector del super-admin. Protegido por requirePermission en la ruta. */
export async function listOrganizationsHandler(
  request: FastifyRequest<{ Querystring: { serviceSlug?: string } }>,
  reply: FastifyReply,
) {
  const serviceSlug = request.query.serviceSlug
  if (!serviceSlug) return reply.code(422).send({ message: 'Falta el parámetro serviceSlug' })

  const service = createVariablesService(request.server.prisma)
  try {
    const organizations = await service.listOrganizationsForService(serviceSlug)
    return reply.code(200).send({ organizations })
  } catch (err) {
    return sendVariablesError(reply, err)
  }
}

/** GET — servicios contratados de una organización, para los sub-tabs de
 * "Operación" (Fase C). Protegido por requirePermission en la ruta. */
export async function listOrgServicesHandler(
  request: FastifyRequest<{ Params: { organizationId: string } }>,
  reply: FastifyReply,
) {
  const service = createVariablesService(request.server.prisma)
  try {
    const services = await service.listContractedServices(request.params.organizationId)
    return reply.code(200).send({ services })
  } catch (err) {
    return sendVariablesError(reply, err)
  }
}

/** POST — exclusivo super-admin/adminsystem (verificado por requirePermission
 * en la ruta). Recibe multipart: campo "file" (CSV/Excel) + campo de texto
 * "fechaEvaluacion". */
export async function uploadVariablesHandler(
  request: FastifyRequest<{ Params: { organizationId: string; serviceSlug: string } }>,
  reply: FastifyReply,
) {
  const paramsParsed = uploadVariablesParamsSchema.safeParse(request.params)
  if (!paramsParsed.success) return reply.code(422).send({ errors: formatFieldErrors(paramsParsed.error) })

  const data = await request.file()
  if (!data) return reply.code(422).send({ message: 'Falta el archivo (campo "file")' })

  const fechaEvaluacionRaw = (data.fields.fechaEvaluacion as { value?: string } | undefined)?.value
  if (!fechaEvaluacionRaw || Number.isNaN(Date.parse(fechaEvaluacionRaw))) {
    return reply.code(422).send({ errors: { fechaEvaluacion: 'Fecha de evaluación inválida o faltante' } })
  }

  const buffer = await data.toBuffer()

  const service = createVariablesService(request.server.prisma)
  try {
    const result = await service.uploadVariables({
      organizationId: paramsParsed.data.organizationId,
      serviceSlug: paramsParsed.data.serviceSlug,
      uploadedById: request.user.sub,
      fechaEvaluacion: new Date(fechaEvaluacionRaw),
      fileBuffer: buffer,
      filename: data.filename,
      ipAddress: request.ip,
    })
    return reply.code(201).send(result)
  } catch (err) {
    return sendVariablesError(reply, err)
  }
}

/** GET — cliente: organizationId SIEMPRE derivado de la sesión, nunca de un
 * parámetro externo. Requiere permiso dashboard.{slug}.view Y que la
 * organización tenga el servicio contratado (verificado en el servicio). */
export async function clientDashboardHandler(
  request: FastifyRequest<{ Params: { serviceSlug: string } }>,
  reply: FastifyReply,
) {
  const parsed = dashboardParamsSchema.safeParse(request.params)
  if (!parsed.success) return reply.code(422).send({ errors: formatFieldErrors(parsed.error) })

  // Simplificación actual: toma la primera membresía del usuario. Un
  // selector de organización para usuarios en más de una queda pendiente
  // (el seed de esta tarea solo crea usuarios con una única organización).
  const membership = await request.server.prisma.userOrganization.findFirst({
    where: { userId: request.user.sub },
    select: { organizationId: true },
  })
  if (!membership) return reply.code(403).send({ message: 'No perteneces a ninguna organización' })

  const permissions = await resolveUserPermissions(request.server.prisma, request.user.sub, membership.organizationId)
  if (!hasPermission(permissions, `dashboard.${parsed.data.serviceSlug}.view`)) {
    return reply.code(403).send({ message: 'No tienes permiso para ver este dashboard' })
  }

  const service = createVariablesService(request.server.prisma)
  try {
    const dashboard = await service.getDashboard(membership.organizationId, parsed.data.serviceSlug)
    return reply.code(200).send(dashboard)
  } catch (err) {
    return sendVariablesError(reply, err)
  }
}

/** GET — super-admin/adminsystem: organizationId explícito en la ruta,
 * permitido para cualquier organización, siempre que tenga el permiso de
 * plataforma (nunca confía en el rol reportado por el frontend). */
export async function adminDashboardHandler(
  request: FastifyRequest<{ Params: { organizationId: string; serviceSlug: string } }>,
  reply: FastifyReply,
) {
  const parsed = adminDashboardParamsSchema.safeParse(request.params)
  if (!parsed.success) return reply.code(422).send({ errors: formatFieldErrors(parsed.error) })

  const service = createVariablesService(request.server.prisma)
  try {
    const dashboard = await service.getDashboard(parsed.data.organizationId, parsed.data.serviceSlug)
    return reply.code(200).send(dashboard)
  } catch (err) {
    return sendVariablesError(reply, err)
  }
}

/** Resuelve la organización del usuario autenticado — misma simplificación
 * documentada en clientDashboardHandler (primera membresía). */
async function resolveClientOrganizationId(request: FastifyRequest, reply: FastifyReply): Promise<string | null> {
  const membership = await request.server.prisma.userOrganization.findFirst({
    where: { userId: request.user.sub },
    select: { organizationId: true },
  })
  if (!membership) {
    reply.code(403).send({ message: 'No perteneces a ninguna organización' })
    return null
  }
  return membership.organizationId
}

/** GET — cliente: historial de cargas de su propia organización. */
export async function clientHistoryHandler(
  request: FastifyRequest<{ Params: { serviceSlug: string } }>,
  reply: FastifyReply,
) {
  const parsed = dashboardParamsSchema.safeParse(request.params)
  if (!parsed.success) return reply.code(422).send({ errors: formatFieldErrors(parsed.error) })

  const organizationId = await resolveClientOrganizationId(request, reply)
  if (!organizationId) return

  const service = createVariablesService(request.server.prisma)
  try {
    const uploads = await service.listUploadHistory(organizationId, parsed.data.serviceSlug)
    return reply.code(200).send({ uploads })
  } catch (err) {
    return sendVariablesError(reply, err)
  }
}

/** GET — super-admin/adminsystem: historial de cargas de cualquier organización. */
export async function adminHistoryHandler(
  request: FastifyRequest<{ Params: { organizationId: string; serviceSlug: string } }>,
  reply: FastifyReply,
) {
  const parsed = adminDashboardParamsSchema.safeParse(request.params)
  if (!parsed.success) return reply.code(422).send({ errors: formatFieldErrors(parsed.error) })

  const service = createVariablesService(request.server.prisma)
  try {
    const uploads = await service.listUploadHistory(parsed.data.organizationId, parsed.data.serviceSlug)
    return reply.code(200).send({ uploads })
  } catch (err) {
    return sendVariablesError(reply, err)
  }
}

/** GET — cliente: detalle de una carga puntual de su propia organización. */
export async function clientUploadDetailHandler(
  request: FastifyRequest<{ Params: { serviceSlug: string; uploadId: string } }>,
  reply: FastifyReply,
) {
  const parsed = uploadDetailParamsSchema.safeParse(request.params)
  if (!parsed.success) return reply.code(422).send({ errors: formatFieldErrors(parsed.error) })

  const organizationId = await resolveClientOrganizationId(request, reply)
  if (!organizationId) return

  const service = createVariablesService(request.server.prisma)
  try {
    const detail = await service.getUploadDetail(parsed.data.uploadId, organizationId)
    return reply.code(200).send(detail)
  } catch (err) {
    return sendVariablesError(reply, err)
  }
}

/** GET — super-admin/adminsystem: detalle de una carga puntual de cualquier organización. */
export async function adminUploadDetailHandler(
  request: FastifyRequest<{ Params: { organizationId: string; serviceSlug: string; uploadId: string } }>,
  reply: FastifyReply,
) {
  const parsed = adminUploadDetailParamsSchema.safeParse(request.params)
  if (!parsed.success) return reply.code(422).send({ errors: formatFieldErrors(parsed.error) })

  const service = createVariablesService(request.server.prisma)
  try {
    const detail = await service.getUploadDetail(parsed.data.uploadId, parsed.data.organizationId)
    return reply.code(200).send(detail)
  } catch (err) {
    return sendVariablesError(reply, err)
  }
}
