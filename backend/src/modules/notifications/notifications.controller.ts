import type { FastifyReply, FastifyRequest } from 'fastify'
import { createNotificationService } from './notifications.service.js'
import { listNotificationsQuerySchema, notificationParamsSchema } from './notifications.schema.js'

export async function listHandler(request: FastifyRequest, reply: FastifyReply) {
  const parsed = listNotificationsQuerySchema.safeParse(request.query)
  if (!parsed.success) return reply.code(422).send({ message: 'Parámetros de consulta inválidos' })

  const service = createNotificationService(request.server.prisma)
  const result = await service.list(request.user.sub, parsed.data)
  return reply.code(200).send(result)
}

export async function unreadCountHandler(request: FastifyRequest, reply: FastifyReply) {
  const service = createNotificationService(request.server.prisma)
  const count = await service.unreadCount(request.user.sub)
  return reply.code(200).send({ count })
}

export async function detailHandler(
  request: FastifyRequest<{ Params: { notificationId: string } }>,
  reply: FastifyReply,
) {
  const parsed = notificationParamsSchema.safeParse(request.params)
  if (!parsed.success) return reply.code(422).send({ message: 'Identificador inválido' })

  const service = createNotificationService(request.server.prisma)
  // IDOR-safe: findByIdForRecipient exige recipientId de la sesión en el
  // WHERE — si es de otro usuario, no existe (404), nunca 403 (no confirma
  // que el recurso existe para un tercero no autorizado).
  const notification = await service.getDetail(parsed.data.notificationId, request.user.sub)
  if (!notification) return reply.code(404).send({ message: 'Notificación no encontrada' })

  return reply.code(200).send({ notification })
}

export async function markReadHandler(
  request: FastifyRequest<{ Params: { notificationId: string } }>,
  reply: FastifyReply,
) {
  const parsed = notificationParamsSchema.safeParse(request.params)
  if (!parsed.success) return reply.code(422).send({ message: 'Identificador inválido' })

  const service = createNotificationService(request.server.prisma)
  const updated = await service.markRead(parsed.data.notificationId, request.user.sub)
  if (!updated) return reply.code(404).send({ message: 'Notificación no encontrada' })

  return reply.code(200).send({ ok: true })
}

export async function markAllReadHandler(request: FastifyRequest, reply: FastifyReply) {
  const service = createNotificationService(request.server.prisma)
  const count = await service.markAllRead(request.user.sub)
  return reply.code(200).send({ ok: true, count })
}
