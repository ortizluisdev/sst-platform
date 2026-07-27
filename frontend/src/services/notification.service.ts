import { isAxiosError } from 'axios'
import { apiClient } from './api'
import type { AppNotification, NotificationListFilters, NotificationListResult } from '@/types/notification'

export class NotificationRequestError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'NotificationRequestError'
    this.status = status
  }
}

function rethrow(err: unknown): never {
  if (isAxiosError(err) && err.response) {
    const { status, data } = err.response as { status: number; data: { message?: string } }
    throw new NotificationRequestError(status, data.message ?? 'Ocurrió un error')
  }
  throw err
}

export async function listNotifications(filters: NotificationListFilters = {}): Promise<NotificationListResult> {
  try {
    const { data } = await apiClient.get('/notifications', { params: filters })
    return data
  } catch (err) {
    rethrow(err)
  }
}

export async function getUnreadCount(): Promise<number> {
  try {
    const { data } = await apiClient.get('/notifications/unread-count')
    return data.count
  } catch (err) {
    rethrow(err)
  }
}

export async function getNotificationDetail(id: string): Promise<AppNotification> {
  try {
    const { data } = await apiClient.get(`/notifications/${id}`)
    return data.notification
  } catch (err) {
    rethrow(err)
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  try {
    await apiClient.patch(`/notifications/${id}/read`)
  } catch (err) {
    rethrow(err)
  }
}

export async function markAllNotificationsRead(): Promise<number> {
  try {
    const { data } = await apiClient.post('/notifications/read-all')
    return data.count
  } catch (err) {
    rethrow(err)
  }
}
