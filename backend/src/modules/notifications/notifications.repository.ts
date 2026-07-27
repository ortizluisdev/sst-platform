import type { NotificationSeverity, NotificationType, Prisma, PrismaClient } from '@prisma/client'
import { WILDCARD_PERMISSION } from '../../utils/permissions.js'

export interface CreateNotificationInput {
  recipientIds: string[]
  senderId?: string | null
  organizationId?: string | null
  type: NotificationType
  severity: NotificationSeverity
  message: string
  metadata?: Record<string, unknown>
  link?: string | null
  entityType?: string | null
  entityId?: string | null
  emailRequested: boolean
}

export interface ListFilters {
  isRead?: boolean
  type?: NotificationType
  severity?: NotificationSeverity
  page: number
  pageSize: number
}

export function createNotificationsRepository(prisma: PrismaClient) {
  return {
    /** Una fila por destinatario (fan-out) — createMany de MySQL no
     * devuelve las filas creadas, y las necesitamos con datos del
     * destinatario para el envío de email, así que se crean una por una
     * dentro de una transacción (volumen esperado es de pocas decenas). */
    async createForRecipients(input: CreateNotificationInput) {
      return prisma.$transaction(
        input.recipientIds.map((recipientId) =>
          prisma.notification.create({
            data: {
              recipientId,
              senderId: input.senderId ?? null,
              organizationId: input.organizationId ?? null,
              type: input.type,
              severity: input.severity,
              message: input.message,
              metadata: input.metadata as Prisma.InputJsonValue | undefined,
              link: input.link ?? null,
              entityType: input.entityType ?? null,
              entityId: input.entityId ?? null,
              emailRequested: input.emailRequested,
            },
            include: { recipient: { select: { id: true, email: true, nombre: true } } },
          }),
        ),
      )
    },

    async findManyForRecipient(recipientId: string, filters: ListFilters) {
      const where: Prisma.NotificationWhereInput = {
        recipientId,
        ...(filters.isRead !== undefined ? { isRead: filters.isRead } : {}),
        ...(filters.type ? { type: filters.type } : {}),
        ...(filters.severity ? { severity: filters.severity } : {}),
      }

      const [items, total] = await Promise.all([
        prisma.notification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (filters.page - 1) * filters.pageSize,
          take: filters.pageSize,
        }),
        prisma.notification.count({ where }),
      ])

      return { items, total }
    },

    countUnread(recipientId: string) {
      return prisma.notification.count({ where: { recipientId, isRead: false } })
    },

    /** IDOR-safe: recipientId siempre viene de la sesión, nunca del param —
     * si no coincide, la fila simplemente no aparece (404, no 403). */
    findByIdForRecipient(id: string, recipientId: string) {
      return prisma.notification.findFirst({ where: { id, recipientId } })
    },

    async markRead(id: string, recipientId: string) {
      const result = await prisma.notification.updateMany({
        where: { id, recipientId, isRead: false },
        data: { isRead: true, readAt: new Date() },
      })
      return result.count > 0
    },

    async markAllRead(recipientId: string) {
      const result = await prisma.notification.updateMany({
        where: { recipientId, isRead: false },
        data: { isRead: true, readAt: new Date() },
      })
      return result.count
    },

    updateEmailResult(id: string, result: { sentAt?: Date; error?: string }) {
      return prisma.notification.update({
        where: { id },
        data: {
          emailSentAt: result.sentAt ?? null,
          emailError: result.error ?? null,
        },
      })
    },

    async findOrgUserIds(organizationId: string): Promise<string[]> {
      const memberships = await prisma.userOrganization.findMany({
        where: { organizationId },
        select: { userId: true },
      })
      return memberships.map((m) => m.userId)
    },

    /** "Admin" = usuario con un rol de plataforma que concede el permiso
     * comodín "*" — ver Fase 0: ningún permiso está diferenciado hoy entre
     * super-admin/adminsystem, así que esto cubre ambos sin acoplarse a un
     * nombre de rol específico. */
    async findPlatformAdminIds(): Promise<string[]> {
      const admins = await prisma.user.findMany({
        where: { role: { permissions: { some: { permission: { key: WILDCARD_PERMISSION } } } } },
        select: { id: true },
      })
      return admins.map((a) => a.id)
    },
  }
}

export type NotificationsRepository = ReturnType<typeof createNotificationsRepository>
