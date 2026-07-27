import type { PrismaClient } from '@prisma/client'
import { createContactRepository } from './contact.repository.js'
import { sendAutoReply, sendContactNotification } from '../../utils/mailer.js'
import { createNotificationService } from '../notifications/notifications.service.js'

export interface SubmitContactInput {
  nombre: string
  correo: string
  telefono: string
  empresa?: string
  mensaje: string
}

export function createContactService(prisma: PrismaClient) {
  const repository = createContactRepository(prisma)
  const notifications = createNotificationService(prisma)

  return {
    async submit(input: SubmitContactInput, ipAddress: string) {
      const submission = await repository.create({
        nombre: input.nombre,
        correo: input.correo,
        telefono: input.telefono,
        empresa: input.empresa,
        mensaje: input.mensaje,
        ipAddress,
      })

      // El registro ya quedó guardado — eso es lo crítico, un lead no se pierde
      // por un problema de SMTP. El correo es best-effort: si falla, queda
      // logueado en mailer.ts y email_sent se mantiene en false para que un
      // job/cron futuro pueda reintentar el envío.
      const notified = await sendContactNotification(input)

      if (notified) {
        await sendAutoReply(input)
        await repository.markEmailSent(submission.id, true)
      }

      // Notificación in-app además del correo a CONTACT_NOTIFICATION_EMAIL —
      // centraliza la visibilidad en el panel de admin sin duplicar el envío
      // (CONTACTO_RECIBIDO no dispara email propio, ver notification-types.ts).
      await notifications.notify({
        type: 'CONTACTO_RECIBIDO',
        toAdmins: true,
        message: `Nuevo mensaje de contacto de ${input.nombre} (${input.correo}).`,
      })

      return submission
    },
  }
}

export type ContactService = ReturnType<typeof createContactService>
