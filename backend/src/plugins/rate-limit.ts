import fastifyRateLimit from '@fastify/rate-limit'
import type { FastifyInstance } from 'fastify'

/**
 * `global: true` con un default generoso: toda ruta queda protegida contra
 * abuso/DoS aunque nadie le haya puesto un límite explícito (ej. GET
 * /api/auth/me, GET /api/dashboard/:serviceSlug — requieren sesión, pero una
 * sesión robada o un bug en el frontend no debería poder martillar la API sin
 * límite). Las rutas sensibles (login, registro, reset de contraseña,
 * contacto) siguen declarando su propio `config.rateLimit`, más estricto,
 * que sobreescribe este default por ruta.
 */
export async function registerRateLimit(app: FastifyInstance) {
  await app.register(fastifyRateLimit, {
    global: true,
    max: 100,
    timeWindow: '1 minute',
  })
}
