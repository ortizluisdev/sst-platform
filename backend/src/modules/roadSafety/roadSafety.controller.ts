import type { FastifyReply, FastifyRequest } from 'fastify'
import { createRoadSafetyService, RoadSafetyError } from './roadSafety.service.js'
import { organizationParamsSchema, correctFieldParamsSchema, correctFieldBodySchema, formatFieldErrors } from './roadSafety.schema.js'

function sendError(reply: FastifyReply, err: unknown) {
  if (err instanceof RoadSafetyError) {
    const status = err.code === 'PARSE_ERROR' || err.code === 'FIELD_INVALID' ? 422 : 404
    return reply.code(status).send({ message: err.message })
  }
  throw err
}

/** Mismo criterio que el resto del dashboard cliente: primera membresía
 * del usuario logueado (ver reports.controller.ts). */
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

async function handleUpload(request: FastifyRequest, reply: FastifyReply, organizationId: string) {
  const data = await request.file()
  if (!data) return reply.code(422).send({ message: 'Falta el archivo (campo "file")' })

  const buffer = await data.toBuffer()
  const service = createRoadSafetyService(request.server.prisma)
  try {
    const upload = await service.uploadWorkbook(organizationId, request.user.sub, { buffer, filename: data.filename })
    return reply.code(201).send({ upload })
  } catch (err) {
    return sendError(reply, err)
  }
}

export async function adminUploadHandler(
  request: FastifyRequest<{ Params: { organizationId: string } }>,
  reply: FastifyReply,
) {
  const parsed = organizationParamsSchema.safeParse(request.params)
  if (!parsed.success) return reply.code(422).send({ errors: formatFieldErrors(parsed.error) })
  return handleUpload(request, reply, parsed.data.organizationId)
}

export async function clientUploadHandler(request: FastifyRequest, reply: FastifyReply) {
  const organizationId = await resolveClientOrganizationId(request, reply)
  if (!organizationId) return
  return handleUpload(request, reply, organizationId)
}

function makeGetHandler<T>(
  getData: (service: ReturnType<typeof createRoadSafetyService>, organizationId: string) => Promise<T>,
) {
  return {
    admin: async (request: FastifyRequest<{ Params: { organizationId: string } }>, reply: FastifyReply) => {
      const parsed = organizationParamsSchema.safeParse(request.params)
      if (!parsed.success) return reply.code(422).send({ errors: formatFieldErrors(parsed.error) })
      const service = createRoadSafetyService(request.server.prisma)
      try {
        return reply.code(200).send(await getData(service, parsed.data.organizationId))
      } catch (err) {
        return sendError(reply, err)
      }
    },
    client: async (request: FastifyRequest, reply: FastifyReply) => {
      const organizationId = await resolveClientOrganizationId(request, reply)
      if (!organizationId) return
      const service = createRoadSafetyService(request.server.prisma)
      try {
        return reply.code(200).send(await getData(service, organizationId))
      } catch (err) {
        return sendError(reply, err)
      }
    },
  }
}

export const uploadHistoryHandlers = makeGetHandler(async (service, organizationId) => ({
  uploads: await service.getUploadHistory(organizationId),
}))

export const hoja1Handlers = makeGetHandler(async (service, organizationId) => service.getDashboardHoja1(organizationId))
export const hoja2Handlers = makeGetHandler(async (service, organizationId) => ({
  vehiculos: await service.getDashboardHoja2(organizationId),
}))
export const hoja3Handlers = makeGetHandler(async (service, organizationId) => ({
  conductores: await service.getDashboardHoja3(organizationId),
}))
export const hoja4Handlers = makeGetHandler(async (service, organizationId) => ({
  rutas: await service.getDashboardHoja4(organizationId),
}))
export const alertasHandlers = makeGetHandler((service, organizationId) => service.getAlertasPanel(organizationId))

function makeCorrectFieldHandler(
  correct: (
    service: ReturnType<typeof createRoadSafetyService>,
    input: {
      organizationId: string
      entityId: string
      field: string
      value: string | number | boolean | null
      reason: string
      correctedByUserId: string
    },
  ) => Promise<unknown>,
) {
  return async (
    request: FastifyRequest<{ Params: { organizationId: string; entityId: string } }>,
    reply: FastifyReply,
  ) => {
    const paramsParsed = correctFieldParamsSchema.safeParse(request.params)
    if (!paramsParsed.success) return reply.code(422).send({ errors: formatFieldErrors(paramsParsed.error) })

    const bodyParsed = correctFieldBodySchema.safeParse(request.body)
    if (!bodyParsed.success) return reply.code(422).send({ errors: formatFieldErrors(bodyParsed.error) })

    const service = createRoadSafetyService(request.server.prisma)
    try {
      const updated = await correct(service, {
        organizationId: paramsParsed.data.organizationId,
        entityId: paramsParsed.data.entityId,
        field: bodyParsed.data.field,
        value: bodyParsed.data.value,
        reason: bodyParsed.data.reason,
        correctedByUserId: request.user.sub,
      })
      return reply.code(200).send(updated)
    } catch (err) {
      return sendError(reply, err)
    }
  }
}

export const correctVehiculoFieldHandler = makeCorrectFieldHandler((service, input) => service.correctVehiculoField(input))
export const correctConductorFieldHandler = makeCorrectFieldHandler((service, input) => service.correctConductorField(input))
