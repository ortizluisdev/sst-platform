import Fastify from 'fastify'
import { registerCors } from './plugins/cors.js'
import { registerRateLimit } from './plugins/rate-limit.js'
import { registerPrisma } from './plugins/prisma.js'
import { registerCookie } from './plugins/cookie.js'
import { registerJwt } from './plugins/jwt.js'
import { contactRoutes } from './modules/contact/contact.routes.js'
import { authRoutes } from './modules/auth/auth.routes.js'
import { usersRoutes } from './modules/users/users.routes.js'
import { env } from './config/env.js'

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
    // Render (y la mayoría de PaaS) pone la app detrás de un proxy inverso —
    // sin esto, request.ip siempre sería la IP interna del proxy en vez de la
    // del visitante real, lo que rompe la trazabilidad anti-spam de ip_address
    // y el rate-limit por IP.
    trustProxy: true,
  })

  await registerPrisma(app)
  await registerCors(app)
  await registerRateLimit(app)
  await registerCookie(app)
  await registerJwt(app)

  app.get('/health', async () => ({ status: 'ok' }))

  await app.register(contactRoutes)
  await app.register(authRoutes)
  await app.register(usersRoutes)

  return app
}
