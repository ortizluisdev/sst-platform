import type { NotificationType, PrismaClient } from '@prisma/client'
import { createNotificationPreferencesRepository } from './notificationPreferences.repository.js'
import { NOTIFICATION_TYPE_CONFIG } from '../notifications/notification-types.js'
import type { UpdatePreferenceInput } from './notificationPreferences.schema.js'

const TOGGLEABLE_TYPES = Object.entries(NOTIFICATION_TYPE_CONFIG)
  .filter(([, config]) => !config.emailForced)
  .map(([type]) => type as NotificationType)

export function createNotificationPreferencesService(prisma: PrismaClient) {
  const repository = createNotificationPreferencesRepository(prisma)

  return {
    /** Devuelve los tipos configurables con su preferencia actual — ausencia
     * de fila en NotificationPreference significa "habilitado en ambos
     * canales" (comportamiento de siempre, antes de que existiera esta
     * preferencia), nunca "deshabilitado". */
    async list(userId: string) {
      const saved = await repository.findAllForUser(userId)
      const savedByType = new Map(saved.map((row) => [row.type, row]))

      return TOGGLEABLE_TYPES.map((type) => {
        const row = savedByType.get(type)
        return {
          type,
          inAppEnabled: row?.inAppEnabled ?? true,
          emailEnabled: row?.emailEnabled ?? true,
        }
      })
    },

    update(userId: string, type: NotificationType, data: UpdatePreferenceInput) {
      return repository.upsert(userId, type, data)
    },
  }
}

export type NotificationPreferencesService = ReturnType<typeof createNotificationPreferencesService>
