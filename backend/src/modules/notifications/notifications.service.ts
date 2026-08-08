import type { NotificationSeverity, NotificationType, PrismaClient } from '@prisma/client'
import { createNotificationsRepository } from './notifications.repository.js'
import { NOTIFICATION_TYPE_CONFIG } from './notification-types.js'
import { createNotificationPreferencesRepository } from '../notificationPreferences/notificationPreferences.repository.js'
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
  /** Fan-out a todos los usuarios cliente de cualquier organización — usado
   * por el CRUD admin ("enviar a todos los clientes"), ningún tipo
   * automático lo necesita hoy. */
  allClients?: boolean
  senderId?: string | null
  message: string
  /** Override puntual de la severidad fija del tipo — solo lo usa el CRUD
   * admin (MENSAJE_ADMIN), donde el admin la elige por mensaje. */
  severity?: NotificationSeverity
  /** Override puntual de si se intenta enviar correo, además de
   * emailForced/emailByDefault del tipo — el checkbox "también enviar por
   * correo" del CRUD admin. */
  forceEmail?: boolean
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
  const preferencesRepository = createNotificationPreferencesRepository(prisma)

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
    if (input.allClients) {
      const clientIds = await repository.findAllClientUserIds()
      clientIds.forEach((id) => ids.add(id))
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

      const baseData = {
        senderId: input.senderId ?? null,
        organizationId: input.organizationId ?? null,
        type: input.type,
        severity: input.severity ?? config.severity,
        message: input.message,
        metadata: input.metadata,
        link: input.link,
        entityType: input.entityType,
        entityId: input.entityId,
      }

      let rows: Awaited<ReturnType<typeof repository.createForRecipients>>

      if (config.emailForced) {
        // Crítico: nunca se filtra por preferencia — ver comentario del tipo
        // en notification-types.ts, no puede depender de que el cliente
        // haya entrado alguna vez a apagarlo.
        rows = await repository.createForRecipients({ recipientIds, ...baseData, emailRequested: true })
      } else {
        const shouldEmailByType = config.emailByDefault || (input.forceEmail ?? false)
        const prefs = await preferencesRepository.findManyForUsers(recipientIds, input.type)
        const prefByUser = new Map(prefs.map((p) => [p.userId, p]))

        // Ausencia de fila = habilitado (ver comentario de NotificationPreference
        // en schema.prisma) — nunca se interpreta como "apagado".
        const included = recipientIds.filter((id) => prefByUser.get(id)?.inAppEnabled ?? true)
        if (included.length === 0) return []

        const withEmail = shouldEmailByType ? included.filter((id) => prefByUser.get(id)?.emailEnabled ?? true) : []
        const withoutEmail = included.filter((id) => !withEmail.includes(id))

        const [emailedRows, silentRows] = await Promise.all([
          withEmail.length > 0
            ? repository.createForRecipients({ recipientIds: withEmail, ...baseData, emailRequested: true })
            : Promise.resolve([]),
          withoutEmail.length > 0
            ? repository.createForRecipients({ recipientIds: withoutEmail, ...baseData, emailRequested: false })
            : Promise.resolve([]),
        ])
        rows = [...emailedRows, ...silentRows]
      }

      const rowsToEmail = rows.filter((row) => row.emailRequested)
      if (rowsToEmail.length > 0) {
        await Promise.all(
          rowsToEmail.map(async (row) => {
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

    /** CRUD admin: todas las notificaciones de cualquier destinatario (no
     * solo las propias) — usado por la pantalla de gestión, nunca por la
     * bandeja personal. `deletedOnly` alterna entre la vista "Activas" y
     * el historial de borradas. */
    async listAdmin(filters: {
      type?: NotificationType
      severity?: NotificationSeverity
      deletedOnly?: boolean
      page: number
      pageSize: number
    }) {
      const { items, total } = await repository.findManyAdmin(filters)
      return {
        items,
        page: filters.page,
        pageSize: filters.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / filters.pageSize)),
      }
    },

    /** Redacta y envía una notificación manual — reusa `notify()` con
     * type: MENSAJE_ADMIN, así que hereda gratis el fan-out por
     * organización/todos-los-clientes/admins y el envío de correo. */
    createManual(input: {
      senderId: string
      message: string
      severity: NotificationSeverity
      forceEmail: boolean
      recipientIds?: string[]
      organizationId?: string
      toAdmins?: boolean
      allClients?: boolean
    }) {
      return this.notify({
        type: 'MENSAJE_ADMIN',
        senderId: input.senderId,
        message: input.message,
        severity: input.severity,
        forceEmail: input.forceEmail,
        recipientIds: input.recipientIds,
        organizationId: input.organizationId,
        toAdmins: input.toAdmins,
        allClients: input.allClients,
        emailSubject: 'Nuevo mensaje de RoMa+',
        emailTitle: 'Nuevo mensaje de RoMa+',
      })
    },

    /** Edición de contenido — solo message/severity, nunca destinatario ni
     * tipo (eso requeriría volver a resolver el fan-out y el envío de
     * correo desde cero, es más simple pedir borrar + crear de nuevo). */
    update(id: string, data: { message?: string; severity?: NotificationSeverity }) {
      return repository.update(id, data)
    },

    softDelete(id: string) {
      return repository.softDelete(id)
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
