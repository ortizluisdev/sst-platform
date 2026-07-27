import type { FastifyReply, FastifyRequest } from 'fastify'
import { confirmActivationSchema } from './activation.schema.js'
import { formatFieldErrors } from '../auth/auth.schema.js'
import { createActivationService, ActivationError } from './activation.service.js'

export async function confirmActivationHandler(request: FastifyRequest, reply: FastifyReply) {
  const parsed = confirmActivationSchema.safeParse(request.body)
  if (!parsed.success) return reply.code(422).send({ errors: formatFieldErrors(parsed.error) })

  const service = createActivationService(request.server.prisma)
  try {
    await service.confirm(parsed.data.token, parsed.data.newPassword, request.ip)
    return reply.code(200).send({ success: true })
  } catch (err) {
    if (err instanceof ActivationError) {
      const status = err.code === 'NOT_PENDING' ? 409 : 401
      return reply.code(status).send({ message: err.message })
    }
    throw err
  }
}
