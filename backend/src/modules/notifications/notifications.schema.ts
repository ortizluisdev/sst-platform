import { z } from 'zod'
import { noNewlines } from '../../utils/zodHelpers.js'

const notificationTypeEnum = z.enum([
  'SEMAFORO_CRITICO',
  'CARGA_PROCESADA',
  'CARGA_CON_ERROR',
  'CUENTA_SUSPENDIDA',
  'CUENTA_REACTIVADA',
  'REGISTRO_PENDIENTE',
  'CONTACTO_RECIBIDO',
  'LECTURA_CORREGIDA',
  'MENSAJE_ADMIN',
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

// --- CRUD admin ---------------------------------------------------------

export const adminListNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  type: notificationTypeEnum.optional(),
  severity: notificationSeverityEnum.optional(),
  deletedOnly: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
})

/** Exactamente un modo de destinatario — el refine evita, ej., mandar
 * organizationId junto con recipientId por error de UI y que el backend
 * adivine cuál usar. */
export const createNotificationSchema = z
  .object({
    message: noNewlines(z.string().trim().min(1, 'Escribe un mensaje').max(2000)),
    severity: notificationSeverityEnum.default('INFO'),
    sendEmail: z.boolean().default(false),
    recipientMode: z.enum(['user', 'organization', 'admins', 'all_clients']),
    recipientId: z.string().min(1).optional(),
    organizationId: z.string().min(1).optional(),
  })
  .refine((data) => (data.recipientMode === 'user' ? !!data.recipientId : true), {
    message: 'Selecciona un destinatario',
    path: ['recipientId'],
  })
  .refine((data) => (data.recipientMode === 'organization' ? !!data.organizationId : true), {
    message: 'Selecciona una empresa',
    path: ['organizationId'],
  })

export type CreateNotificationBody = z.infer<typeof createNotificationSchema>

export const updateNotificationSchema = z
  .object({
    message: noNewlines(z.string().trim().min(1).max(2000)).optional(),
    severity: notificationSeverityEnum.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No hay cambios para aplicar' })

export type UpdateNotificationBody = z.infer<typeof updateNotificationSchema>

export function formatFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors = error.flatten().fieldErrors
  const errors: Record<string, string> = {}
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (messages?.[0]) errors[field] = messages[0]
  }
  return errors
}
