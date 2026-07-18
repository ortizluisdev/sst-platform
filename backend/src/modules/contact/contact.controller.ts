import type { FastifyReply, FastifyRequest } from 'fastify'
import { contactSchema, formatFieldErrors } from './contact.schema.js'
import { createContactService } from './contact.service.js'

export async function submitContactHandler(request: FastifyRequest, reply: FastifyReply) {
  const parsed = contactSchema.safeParse(request.body)

  if (!parsed.success) {
    return reply.code(422).send({ errors: formatFieldErrors(parsed.error) })
  }

  const { website, ...data } = parsed.data

  // Honeypot lleno => casi seguro es un bot. Respondemos éxito falso (sin dar
  // pistas de que fue detectado) pero no guardamos nada ni gastamos envíos de correo.
  if (website && website.trim() !== '') {
    request.log.warn({ ip: request.ip }, 'Honeypot de contacto activado — request descartado')
    return reply.code(200).send({ success: true, id: 0 })
  }

  const service = createContactService(request.server.prisma)
  const submission = await service.submit(data, request.ip)

  return reply.code(201).send({ success: true, id: submission.id })
}
