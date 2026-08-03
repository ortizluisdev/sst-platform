import type { FastifyReply, FastifyRequest } from 'fastify'
import {
  categoryConfigParamsSchema,
  categoryConfigItemParamsSchema,
  updateCategoryConfigSchema,
  formatFieldErrors,
} from './orgCategoryConfig.schema.js'
import { createOrgCategoryConfigService, OrgCategoryConfigError } from './orgCategoryConfig.service.js'

function statusForError(_code: OrgCategoryConfigError['code']): number {
  return 404
}

export async function listCategoryConfigHandler(request: FastifyRequest, reply: FastifyReply) {
  const parsed = categoryConfigParamsSchema.safeParse(request.params)
  if (!parsed.success) return reply.code(422).send({ errors: formatFieldErrors(parsed.error) })

  const service = createOrgCategoryConfigService(request.server.prisma)
  try {
    const items = await service.list(parsed.data.organizationId)
    return reply.code(200).send({ items })
  } catch (err) {
    if (err instanceof OrgCategoryConfigError) return reply.code(statusForError(err.code)).send({ message: err.message })
    throw err
  }
}

export async function updateCategoryConfigHandler(request: FastifyRequest, reply: FastifyReply) {
  const paramsParsed = categoryConfigItemParamsSchema.safeParse(request.params)
  if (!paramsParsed.success) return reply.code(422).send({ errors: formatFieldErrors(paramsParsed.error) })

  const bodyParsed = updateCategoryConfigSchema.safeParse(request.body)
  if (!bodyParsed.success) return reply.code(422).send({ errors: formatFieldErrors(bodyParsed.error) })

  const service = createOrgCategoryConfigService(request.server.prisma)
  try {
    await service.setHabilitada(paramsParsed.data.organizationId, paramsParsed.data.categoria, bodyParsed.data.habilitada)
    return reply.code(204).send()
  } catch (err) {
    if (err instanceof OrgCategoryConfigError) return reply.code(statusForError(err.code)).send({ message: err.message })
    throw err
  }
}
