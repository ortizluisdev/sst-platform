import type { NotificationSeverity, NotificationType } from '@prisma/client'

export type NotificationAudience = 'CLIENTE' | 'ADMIN' | 'AMBOS'

export interface NotificationTypeConfig {
  severity: NotificationSeverity
  emailByDefault: boolean
  /** true = el envío por email no se puede desactivar por llamada — hoy solo
   * aplica a SEMAFORO_CRITICO (ver diagnóstico Fase 0, es el caso de negocio
   * que no puede depender de que el cliente entre al dashboard por su cuenta). */
  emailForced?: boolean
  audience: NotificationAudience
  /** Asunto de correo por defecto. Los call sites pueden pasar uno más
   * específico (ej. incluyendo el nombre de la variable fuera de norma) vía
   * NotifyInput.emailSubject — esto es solo el fallback genérico por tipo. */
  defaultEmailSubject: string
}

/**
 * Única fuente de verdad de severidad/canal/audiencia por tipo de evento.
 * Agregar un tipo nuevo es: una entrada acá + un valor en el enum
 * NotificationType (schema.prisma) + una llamada a NotificationService.notify()
 * desde el módulo de origen — nunca tocar notifications.service.ts.
 */
export const NOTIFICATION_TYPE_CONFIG: Record<NotificationType, NotificationTypeConfig> = {
  SEMAFORO_CRITICO: {
    severity: 'CRITICAL',
    emailByDefault: true,
    emailForced: true,
    audience: 'AMBOS',
    defaultEmailSubject: 'Alerta crítica: resultados fuera de norma en tu dashboard',
  },
  CARGA_CON_ERROR: {
    severity: 'WARNING',
    emailByDefault: true,
    audience: 'AMBOS',
    defaultEmailSubject: 'Error al procesar tu carga de variables',
  },
  CUENTA_REACTIVADA: {
    severity: 'INFO',
    emailByDefault: true,
    audience: 'CLIENTE',
    defaultEmailSubject: 'Tu cuenta en RoMa+ fue reactivada',
  },
  CUENTA_SUSPENDIDA: {
    severity: 'WARNING',
    emailByDefault: true,
    audience: 'CLIENTE',
    defaultEmailSubject: 'Tu cuenta en RoMa+ fue suspendida',
  },
  CARGA_PROCESADA: {
    severity: 'INFO',
    emailByDefault: false,
    audience: 'CLIENTE',
    defaultEmailSubject: 'Tu carga de variables fue procesada',
  },
  REGISTRO_PENDIENTE: {
    severity: 'INFO',
    emailByDefault: false,
    audience: 'ADMIN',
    defaultEmailSubject: 'Nueva cuenta pendiente de aprobación',
  },
  CONTACTO_RECIBIDO: {
    severity: 'INFO',
    emailByDefault: false,
    audience: 'ADMIN',
    defaultEmailSubject: 'Nuevo mensaje de contacto recibido',
  },
  LECTURA_CORREGIDA: {
    severity: 'INFO',
    emailByDefault: false,
    audience: 'CLIENTE',
    defaultEmailSubject: 'Se corrigió una lectura en tu dashboard',
  },
}
