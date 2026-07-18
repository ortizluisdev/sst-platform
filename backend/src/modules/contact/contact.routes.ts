import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { submitContactHandler } from './contact.controller.js'

async function assertJsonContentType(request: FastifyRequest, reply: FastifyReply) {
  const contentType = request.headers['content-type'] ?? ''
  if (!contentType.includes('application/json')) {
    await reply.code(415).send({ message: 'Content-Type debe ser application/json' })
  }
}

export async function contactRoutes(app: FastifyInstance) {
  app.post(
    '/api/contact',
    {
      config: {
        rateLimit: {
          max: 3,
          timeWindow: '10 minutes',
        },
      },
      preHandler: assertJsonContentType,
    },
    submitContactHandler,
  )
}
