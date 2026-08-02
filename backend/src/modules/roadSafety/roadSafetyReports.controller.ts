import type { FastifyReply, FastifyRequest } from 'fastify'
import { createRoadSafetyReportsService, RoadSafetyReportsError } from './roadSafetyReports.service.js'
import { generatePdfSchema, generateCsvSchema, formatFieldErrors } from './roadSafetyReports.schema.js'

function sendError(reply: FastifyReply, err: unknown) {
  if (err instanceof RoadSafetyReportsError) return reply.code(404).send({ message: err.message })
  throw err
}

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
  return reply.code(200).header('Content-Type', 'application/pdf').header('Content-Disposition', `attachment; filename="${filename}"`).send(buffer)
}

function sendCsv(reply: FastifyReply, csv: string, filename: string) {
  return reply.code(200).header('Content-Type', 'text/csv; charset=utf-8').header('Content-Disposition', `attachment; filename="${filename}"`).send(csv)
}

async function handleGeneratePdf(request: FastifyRequest, reply: FastifyReply, organizationId: string) {
  const parsed = generatePdfSchema.safeParse(request.body)
  if (!parsed.success) return reply.code(422).send({ errors: formatFieldErrors(parsed.error) })

  const service = createRoadSafetyReportsService(request.server.prisma)
  try {
    const buffer = await service.generatePdf(organizationId, request.user.sub, parsed.data)
    return sendPdf(reply, buffer, `reporte-seguridad-vial-${parsed.data.tipo}.pdf`)
  } catch (err) {
    return sendError(reply, err)
  }
}

async function handleGenerateCsv(request: FastifyRequest, reply: FastifyReply, organizationId: string) {
  const parsed = generateCsvSchema.safeParse(request.body)
  if (!parsed.success) return reply.code(422).send({ errors: formatFieldErrors(parsed.error) })

  const service = createRoadSafetyReportsService(request.server.prisma)
  try {
    const csv = await service.generateCsv(organizationId, parsed.data.tipo)
    return sendCsv(reply, csv, `reporte-seguridad-vial-${parsed.data.tipo}.csv`)
  } catch (err) {
    return sendError(reply, err)
  }
}

export async function adminGeneratePdfHandler(request: FastifyRequest<{ Params: { organizationId: string } }>, reply: FastifyReply) {
  return handleGeneratePdf(request, reply, request.params.organizationId)
}

export async function clientGeneratePdfHandler(request: FastifyRequest, reply: FastifyReply) {
  const organizationId = await resolveClientOrganizationId(request, reply)
  if (!organizationId) return
  return handleGeneratePdf(request, reply, organizationId)
}

export async function adminGenerateCsvHandler(request: FastifyRequest<{ Params: { organizationId: string } }>, reply: FastifyReply) {
  return handleGenerateCsv(request, reply, request.params.organizationId)
}

export async function clientGenerateCsvHandler(request: FastifyRequest, reply: FastifyReply) {
  const organizationId = await resolveClientOrganizationId(request, reply)
  if (!organizationId) return
  return handleGenerateCsv(request, reply, organizationId)
}
