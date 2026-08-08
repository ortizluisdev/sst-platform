import { isAxiosError } from 'axios'
import { apiClient } from './api'
import type { NotificationType } from '@/types/notification'

export interface NotificationPreferenceItem {
  type: NotificationType
  inAppEnabled: boolean
  emailEnabled: boolean
}

export class NotificationPreferencesRequestError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'NotificationPreferencesRequestError'
    this.status = status
  }
}

function rethrow(err: unknown): never {
  if (isAxiosError(err) && err.response) {
    const { status, data } = err.response as { status: number; data: { message?: string } }
    throw new NotificationPreferencesRequestError(status, data.message ?? 'Ocurrió un error')
  }
  throw err
}

export async function listNotificationPreferences(): Promise<NotificationPreferenceItem[]> {
  try {
    const { data } = await apiClient.get('/dashboard/notification-preferences')
    return data.items
  } catch (err) {
    rethrow(err)
  }
}

export async function updateNotificationPreference(
  type: NotificationType,
  data: { inAppEnabled?: boolean; emailEnabled?: boolean },
): Promise<void> {
  try {
    await apiClient.patch(`/dashboard/notification-preferences/${type}`, data)
  } catch (err) {
    rethrow(err)
  }
}
