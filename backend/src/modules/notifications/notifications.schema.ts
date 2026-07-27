import { z } from 'zod'

const notificationTypeEnum = z.enum([
  'SEMAFORO_CRITICO',
  'CARGA_PROCESADA',
  'CARGA_CON_ERROR',
  'CUENTA_SUSPENDIDA',
  'CUENTA_REACTIVADA',
  'REGISTRO_PENDIENTE',
  'CONTACTO_RECIBIDO',
])

const notificationSeverityEnum = z.enum(['CRITICAL', 'WARNING', 'INFO'])

export const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  isRead: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  type: notificationTypeEnum.optional(),
  severity: notificationSeverityEnum.optional(),
})

export const notificationParamsSchema = z.object({
  notificationId: z.string().min(1),
})

export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>
