import type { FastifyReply, FastifyRequest } from 'fastify'
import { createNotificationService } from './notifications.service.js'
import {
  listNotificationsQuerySchema,
  notificationParamsSchema,
  adminListNotificationsQuerySchema,
  createNotificationSchema,
  updateNotificationSchema,
  formatFieldErrors,
} from './notifications.schema.js'

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

// --- CRUD admin ----------------------------------------------------------

export async function adminListHandler(request: FastifyRequest, reply: FastifyReply) {
  const parsed = adminListNotificationsQuerySchema.safeParse(request.query)
  if (!parsed.success) return reply.code(422).send({ message: 'Parámetros de consulta inválidos' })

  const service = createNotificationService(request.server.prisma)
  const result = await service.listAdmin(parsed.data)
  return reply.code(200).send(result)
}

export async function createNotificationHandler(request: FastifyRequest, reply: FastifyReply) {
  const parsed = createNotificationSchema.safeParse(request.body)
  if (!parsed.success) return reply.code(422).send({ errors: formatFieldErrors(parsed.error) })

  const { recipientMode, recipientId, organizationId, message, severity, sendEmail } = parsed.data
  const service = createNotificationService(request.server.prisma)
  const rows = await service.createManual({
    senderId: request.user.sub,
    message,
    severity,
    forceEmail: sendEmail,
    recipientIds: recipientMode === 'user' ? [recipientId!] : undefined,
    organizationId: recipientMode === 'organization' ? organizationId : undefined,
    toAdmins: recipientMode === 'admins',
    allClients: recipientMode === 'all_clients',
  })
  if (rows.length === 0) return reply.code(422).send({ message: 'No se encontraron destinatarios para ese criterio' })

  return reply.code(201).send({ count: rows.length })
}

export async function updateNotificationHandler(
  request: FastifyRequest<{ Params: { notificationId: string } }>,
  reply: FastifyReply,
) {
  const paramsParsed = notificationParamsSchema.safeParse(request.params)
  if (!paramsParsed.success) return reply.code(422).send({ message: 'Identificador inválido' })

  const bodyParsed = updateNotificationSchema.safeParse(request.body)
  if (!bodyParsed.success) return reply.code(422).send({ errors: formatFieldErrors(bodyParsed.error) })

  const service = createNotificationService(request.server.prisma)
  await service.update(paramsParsed.data.notificationId, bodyParsed.data)
  return reply.code(200).send({ ok: true })
}

export async function deleteNotificationHandler(
  request: FastifyRequest<{ Params: { notificationId: string } }>,
  reply: FastifyReply,
) {
  const parsed = notificationParamsSchema.safeParse(request.params)
  if (!parsed.success) return reply.code(422).send({ message: 'Identificador inválido' })

  const service = createNotificationService(request.server.prisma)
  await service.softDelete(parsed.data.notificationId)
  return reply.code(200).send({ ok: true })
}
