import { isAxiosError } from 'axios'
import { apiClient } from './api'
import type {
  AdminNotificationListFilters,
  AppNotification,
  CreateNotificationInput,
  NotificationListFilters,
  NotificationListResult,
  UpdateNotificationInput,
} from '@/types/notification'

export class NotificationRequestError extends Error {
  status: number
  fieldErrors?: Record<string, string>

  constructor(status: number, message: string, fieldErrors?: Record<string, string>) {
    super(message)
    this.name = 'NotificationRequestError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

function rethrow(err: unknown): never {
  if (isAxiosError(err) && err.response) {
    const { status, data } = err.response as {
      status: number
      data: { message?: string; errors?: Record<string, string> }
    }
    throw new NotificationRequestError(status, data.message ?? 'Ocurrió un error', data.errors)
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

// --- CRUD admin ------------------------------------------------------

export interface AdminNotificationListResult {
  items: AppNotification[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export async function listAdminNotifications(
  filters: AdminNotificationListFilters = {},
): Promise<AdminNotificationListResult> {
  try {
    const { data } = await apiClient.get('/admin/notifications', { params: filters })
    return data
  } catch (err) {
    rethrow(err)
  }
}

export async function createNotification(input: CreateNotificationInput): Promise<number> {
  try {
    const { data } = await apiClient.post('/admin/notifications', input)
    return data.count
  } catch (err) {
    rethrow(err)
  }
}

export async function updateNotification(id: string, input: UpdateNotificationInput): Promise<void> {
  try {
    await apiClient.patch(`/admin/notifications/${id}`, input)
  } catch (err) {
    rethrow(err)
  }
}

export async function deleteNotification(id: string): Promise<void> {
  try {
    await apiClient.delete(`/admin/notifications/${id}`)
  } catch (err) {
    rethrow(err)
  }
}
