import type { FastifyReply, FastifyRequest } from 'fastify'
import { createReportsService, ReportsError } from './reports.service.js'
import { generatePdfSchema, generateCsvSchema, formatFieldErrors } from './reports.schema.js'

function sendError(reply: FastifyReply, err: unknown) {
  if (err instanceof ReportsError) return reply.code(404).send({ message: err.message })
  throw err
}

/** Resuelve la organización del usuario autenticado — misma simplificación
 * que el resto del dashboard cliente (primera membresía). */
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

function sendPdf(reply: FastifyReply, buffer: Buffer, filename: string) {
  return reply
    .code(200)
    .header('Content-Type', 'application/pdf')
    .header('Content-Disposition', `attachment; filename="${filename}"`)
    .send(buffer)
}

function sendCsv(reply: FastifyReply, csv: string, filename: string) {
  return reply
    .code(200)
    .header('Content-Type', 'text/csv; charset=utf-8')
    .header('Content-Disposition', `attachment; filename="${filename}"`)
    .send(csv)
}

export async function clientGeneratePdfHandler(
  request: FastifyRequest<{ Params: { serviceSlug: string } }>,
  reply: FastifyReply,
) {
  const organizationId = await resolveClientOrganizationId(request, reply)
  if (!organizationId) return
  const parsed = generatePdfSchema.safeParse(request.body)
  if (!parsed.success) return reply.code(422).send({ errors: formatFieldErrors(parsed.error) })

  const service = createReportsService(request.server.prisma)
  try {
    const buffer = await service.generatePdf(organizationId, request.params.serviceSlug, request.user.sub, parsed.data)
    return sendPdf(reply, buffer, `reporte-${parsed.data.tipo}-${request.params.serviceSlug}.pdf`)
  } catch (err) {
    return sendError(reply, err)
  }
}

export async function adminGeneratePdfHandler(
  request: FastifyRequest<{ Params: { organizationId: string; serviceSlug: string } }>,
  reply: FastifyReply,
) {
  const parsed = generatePdfSchema.safeParse(request.body)
  if (!parsed.success) return reply.code(422).send({ errors: formatFieldErrors(parsed.error) })

  const service = createReportsService(request.server.prisma)
  try {
    const buffer = await service.generatePdf(
      request.params.organizationId,
      request.params.serviceSlug,
      request.user.sub,
      parsed.data,
    )
    return sendPdf(reply, buffer, `reporte-${parsed.data.tipo}-${request.params.serviceSlug}.pdf`)
  } catch (err) {
    return sendError(reply, err)
  }
}

export async function clientGenerateCsvHandler(
  request: FastifyRequest<{ Params: { serviceSlug: string } }>,
  reply: FastifyReply,
) {
  const organizationId = await resolveClientOrganizationId(request, reply)
  if (!organizationId) return
  const parsed = generateCsvSchema.safeParse(request.body ?? {})
  if (!parsed.success) return reply.code(422).send({ errors: formatFieldErrors(parsed.error) })

  const service = createReportsService(request.server.prisma)
  try {
    const csv = await service.generateCsv(organizationId, request.params.serviceSlug, parsed.data.uploadId)
    return sendCsv(reply, csv, `reporte-tecnico-${request.params.serviceSlug}.csv`)
  } catch (err) {
    return sendError(reply, err)
  }
}

export async function adminGenerateCsvHandler(
  request: FastifyRequest<{ Params: { organizationId: string; serviceSlug: string } }>,
  reply: FastifyReply,
) {
  const parsed = generateCsvSchema.safeParse(request.body ?? {})
  if (!parsed.success) return reply.code(422).send({ errors: formatFieldErrors(parsed.error) })

  const service = createReportsService(request.server.prisma)
  try {
    const csv = await service.generateCsv(request.params.organizationId, request.params.serviceSlug, parsed.data.uploadId)
    return sendCsv(reply, csv, `reporte-tecnico-${request.params.serviceSlug}.csv`)
  } catch (err) {
    return sendError(reply, err)
  }
}
