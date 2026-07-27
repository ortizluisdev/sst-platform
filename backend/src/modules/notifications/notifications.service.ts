import type { NotificationType, PrismaClient } from '@prisma/client'
import { createNotificationsRepository } from './notifications.repository.js'
import { NOTIFICATION_TYPE_CONFIG } from './notification-types.js'
import { sendNotificationEmail } from '../../utils/mailer.js'
import { env } from '../../config/env.js'

export interface NotifyInput {
  type: NotificationType
  /** Destinatarios explícitos — si se pasa, tiene prioridad sobre
   * organizationId/toAdmins (usado ej. para CUENTA_REACTIVADA a un solo
   * cliente puntual). */
  recipientIds?: string[]
  /** Fan-out a todos los miembros de la organización. */
  organizationId?: string
  /** Fan-out a todos los usuarios con rol de plataforma "*". */
  toAdmins?: boolean
  senderId?: string | null
  message: string
  metadata?: Record<string, unknown>
  /** Ruta relativa del frontend (ej. "/dashboard/historial/abc123"). */
  link?: string | null
  entityType?: string | null
  entityId?: string | null
  /** Título y asunto específicos del evento — si no se pasan, se usa el
   * default del registro (notification-types.ts). */
  emailSubject?: string
  emailTitle?: string
  /** HTML del cuerpo del correo — si no se pasa, se usa `message` como texto plano. */
  emailBodyHtml?: string
  emailLinkLabel?: string
}

export function createNotificationService(prisma: PrismaClient) {
  const repository = createNotificationsRepository(prisma)

  async function resolveRecipients(input: NotifyInput): Promise<string[]> {
    if (input.recipientIds && input.recipientIds.length > 0) return [...new Set(input.recipientIds)]

    const ids = new Set<string>()
    if (input.organizationId) {
      const orgUserIds = await repository.findOrgUserIds(input.organizationId)
      orgUserIds.forEach((id) => ids.add(id))
    }
    if (input.toAdmins) {
      const adminIds = await repository.findPlatformAdminIds()
      adminIds.forEach((id) => ids.add(id))
    }
    return [...ids]
  }

  return {
    /**
     * Punto único de entrada para disparar cualquier notificación del
     * sistema. Nunca lanza por un fallo de email — ese canal es aditivo, ver
     * dispatchEmail. Si no hay destinatarios resueltos, no hace nada (no
     * debe romper el flujo del módulo que llamó).
     */
    async notify(input: NotifyInput) {
      const config = NOTIFICATION_TYPE_CONFIG[input.type]
      const recipientIds = await resolveRecipients(input)
      if (recipientIds.length === 0) return []

      const shouldEmail = config.emailForced || config.emailByDefault

      const rows = await repository.createForRecipients({
        recipientIds,
        senderId: input.senderId ?? null,
        organizationId: input.organizationId ?? null,
        type: input.type,
        severity: config.severity,
        message: input.message,
        metadata: input.metadata,
        link: input.link,
        entityType: input.entityType,
        entityId: input.entityId,
        emailRequested: shouldEmail,
      })

      if (shouldEmail) {
        await Promise.all(
          rows.map(async (row) => {
            const sent = await sendNotificationEmail({
              to: row.recipient.email,
              nombre: row.recipient.nombre,
              subject: input.emailSubject ?? config.defaultEmailSubject,
              title: input.emailTitle ?? config.defaultEmailSubject,
              bodyHtml: input.emailBodyHtml ?? `<p style="white-space: pre-wrap;">${escapeForEmail(input.message)}</p>`,
              severity: config.severity,
              linkUrl: input.link ? `${env.FRONTEND_URL}${input.link}` : null,
              linkLabel: input.emailLinkLabel,
            })
            await repository.updateEmailResult(row.id, sent ? { sentAt: new Date() } : { error: 'send_failed' })
          }),
        )
      }

      return rows
    },

    async list(recipientId: string, filters: { isRead?: boolean; type?: NotificationType; severity?: 'CRITICAL' | 'WARNING' | 'INFO'; page: number; pageSize: number }) {
      const { items, total } = await repository.findManyForRecipient(recipientId, filters)
      return {
        items,
        page: filters.page,
        pageSize: filters.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / filters.pageSize)),
      }
    },

    unreadCount(recipientId: string) {
      return repository.countUnread(recipientId)
    },

    /** IDOR-safe por diseño: recipientId siempre de la sesión. */
    getDetail(id: string, recipientId: string) {
      return repository.findByIdForRecipient(id, recipientId)
    },

    markRead(id: string, recipientId: string) {
      return repository.markRead(id, recipientId)
    },

    markAllRead(recipientId: string) {
      return repository.markAllRead(recipientId)
    },
  }
}

function escapeForEmail(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export type NotificationService = ReturnType<typeof createNotificationService>
