import type { NotificationType, PrismaClient } from '@prisma/client'

export function createNotificationPreferencesRepository(prisma: PrismaClient) {
  return {
    findAllForUser(userId: string) {
      return prisma.notificationPreference.findMany({ where: { userId } })
    },

    upsert(userId: string, type: NotificationType, data: { inAppEnabled?: boolean; emailEnabled?: boolean }) {
      return prisma.notificationPreference.upsert({
        where: { userId_type: { userId, type } },
        create: { userId, type, ...data },
        update: data,
      })
    },

    /** Usado por notify() para agrupar destinatarios por preferencia antes
     * de crear las filas — un solo query por tipo, no uno por destinatario. */
    findManyForUsers(userIds: string[], type: NotificationType) {
      return prisma.notificationPreference.findMany({ where: { userId: { in: userIds }, type } })
    },
  }
}

export type NotificationPreferencesRepository = ReturnType<typeof createNotificationPreferencesRepository>
