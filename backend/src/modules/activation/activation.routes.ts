import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { confirmActivationHandler } from './activation.controller.js'

async function assertJsonContentType(request: FastifyRequest, reply: FastifyReply) {
  const contentType = request.headers['content-type'] ?? ''
  if (!contentType.includes('application/json')) {
    await reply.code(415).send({ message: 'Content-Type debe ser application/json' })
  }
}

export async function activationRoutes(app: FastifyInstance) {
  app.post(
    '/api/activation/confirm',
    {
      config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
      preHandler: assertJsonContentType,
    },
    confirmActivationHandler,
  )
}
