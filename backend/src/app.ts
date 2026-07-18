import Fastify from 'fastify'
import { registerCors } from './plugins/cors.js'
import { registerRateLimit } from './plugins/rate-limit.js'
import { registerPrisma } from './plugins/prisma.js'
import { contactRoutes } from './modules/contact/contact.routes.js'
import { env } from './config/env.js'

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
  })

  await registerPrisma(app)
  await registerCors(app)
  await registerRateLimit(app)

  app.get('/health', async () => ({ status: 'ok' }))

  await app.register(contactRoutes)

  return app
}
