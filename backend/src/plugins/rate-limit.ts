import fastifyRateLimit from '@fastify/rate-limit'
import type { FastifyInstance } from 'fastify'

/**
 * Registrado en modo `global: false`: no limita nada por defecto. Las rutas que
 * necesitan límite (como POST /api/contact) lo declaran explícitamente vía
 * `config.rateLimit` en su propia definición de ruta.
 */
export async function registerRateLimit(app: FastifyInstance) {
  await app.register(fastifyRateLimit, {
    global: false,
  })
}
