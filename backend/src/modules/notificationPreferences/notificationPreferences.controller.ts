import type { FastifyReply, FastifyRequest } from 'fastify'
import { preferenceTypeParamsSchema, updatePreferenceBodySchema, formatFieldErrors } from './notificationPreferences.schema.js'
import { createNotificationPreferencesService } from './notificationPreferences.service.js'

export async function listPreferencesHandler(request: FastifyRequest, reply: FastifyReply) {
  const service = createNotificationPreferencesService(request.server.prisma)
  const items = await service.list(request.user.sub)
  return reply.code(200).send({ items })
}

export async function updatePreferenceHandler(
  request: FastifyRequest<{ Params: { type: string } }>,
  reply: FastifyReply,
) {
  const paramsParsed = preferenceTypeParamsSchema.safeParse(request.params)
  if (!paramsParsed.success) return reply.code(422).send({ errors: formatFieldErrors(paramsParsed.error) })

  const bodyParsed = updatePreferenceBodySchema.safeParse(request.body)
  if (!bodyParsed.success) return reply.code(422).send({ errors: formatFieldErrors(bodyParsed.error) })

  const service = createNotificationPreferencesService(request.server.prisma)
  await service.update(request.user.sub, paramsParsed.data.type, bodyParsed.data)
  return reply.code(204).send()
}
