import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import {
  registerHandler,
  loginHandler,
  refreshHandler,
  logoutHandler,
  passwordResetRequestHandler,
  passwordResetConfirmHandler,
} from './auth.controller.js'

async function assertJsonContentType(request: FastifyRequest, reply: FastifyReply) {
  const contentType = request.headers['content-type'] ?? ''
  if (!contentType.includes('application/json')) {
    await reply.code(415).send({ message: 'Content-Type debe ser application/json' })
  }
}

export async function authRoutes(app: FastifyInstance) {
  app.post(
    '/api/auth/register',
    {
      config: { rateLimit: { max: 3, timeWindow: '1 hour' } },
      preHandler: assertJsonContentType,
    },
    registerHandler,
  )

  app.post(
    '/api/auth/login',
    {
      config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
      preHandler: assertJsonContentType,
    },
    loginHandler,
  )

  app.post(
    '/api/auth/refresh',
    { config: { rateLimit: { max: 20, timeWindow: '15 minutes' } } },
    refreshHandler,
  )

  app.post('/api/auth/logout', {}, logoutHandler)

  app.post(
    '/api/auth/password-reset/request',
    {
      config: { rateLimit: { max: 3, timeWindow: '1 hour' } },
      preHandler: assertJsonContentType,
    },
    passwordResetRequestHandler,
  )

  app.post(
    '/api/auth/password-reset/confirm',
    {
      config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
      preHandler: assertJsonContentType,
    },
    passwordResetConfirmHandler,
  )
}
