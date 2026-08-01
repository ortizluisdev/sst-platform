export type NotificationType =
  | 'SEMAFORO_CRITICO'
  | 'CARGA_PROCESADA'
  | 'CARGA_CON_ERROR'
  | 'CUENTA_SUSPENDIDA'
  | 'CUENTA_REACTIVADA'
  | 'REGISTRO_PENDIENTE'
  | 'CONTACTO_RECIBIDO'
  | 'LECTURA_CORREGIDA'

export type NotificationSeverity = 'CRITICAL' | 'WARNING' | 'INFO'

export interface AppNotification {
  id: string
  recipientId: string
  senderId: string | null
  organizationId: string | null
  type: NotificationType
  severity: NotificationSeverity
  message: string
  metadata: Record<string, unknown> | null
  link: string | null
  entityType: string | null
  entityId: string | null
  isRead: boolean
  readAt: string | null
  emailRequested: boolean
  emailSentAt: string | null
  emailError: string | null
  createdAt: string
}

export interface NotificationListResult {
  items: AppNotification[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface NotificationListFilters {
  page?: number
  pageSize?: number
  isRead?: boolean
  type?: NotificationType
  severity?: NotificationSeverity
}
