import type { NotificationSeverity } from '@/types/notification'

/**
 * Clases Tailwind completas (nunca interpoladas — el scanner de Tailwind v4
 * necesita ver la clase literal en el código fuente). Mismo patrón que
 * semaphoreStyles.ts.
 */
export const NOTIFICATION_SEVERITY_STYLES: Record<
  NotificationSeverity,
  { dot: string; text: string; bg: string; border: string }
> = {
  CRITICAL: { dot: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  WARNING: { dot: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  INFO: { dot: 'bg-sky-500', text: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-200' },
}

/** Claves de i18n — cada sitio de uso llama `t(NOTIFICATION_SEVERITY_LABEL_KEY[severity])`. */
export const NOTIFICATION_SEVERITY_LABEL_KEY: Record<NotificationSeverity, string> = {
  CRITICAL: 'dashboard.notifications.severity.critical',
  WARNING: 'dashboard.notifications.severity.warning',
  INFO: 'dashboard.notifications.severity.info',
}

/** Claves de i18n para el título de cada tipo de notificación (línea corta,
 * usada en la campana/dropdown/historial en vez del `message` crudo del
 * backend, que siempre viene en español). */
export const NOTIFICATION_TYPE_LABEL_KEY: Record<string, string> = {
  SEMAFORO_CRITICO: 'dashboard.notifications.type.semaforoCritico',
  CARGA_PROCESADA: 'dashboard.notifications.type.cargaProcesada',
  CARGA_CON_ERROR: 'dashboard.notifications.type.cargaConError',
  CUENTA_SUSPENDIDA: 'dashboard.notifications.type.cuentaSuspendida',
  CUENTA_REACTIVADA: 'dashboard.notifications.type.cuentaReactivada',
  REGISTRO_PENDIENTE: 'dashboard.notifications.type.registroPendiente',
  CONTACTO_RECIBIDO: 'dashboard.notifications.type.contactoRecibido',
  LECTURA_CORREGIDA: 'dashboard.notifications.type.lecturaCorregida',
  MENSAJE_ADMIN: 'dashboard.notifications.type.mensajeAdmin',
}
