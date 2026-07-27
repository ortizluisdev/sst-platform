import fastifyHelmet from '@fastify/helmet'
import type { FastifyInstance } from 'fastify'

/**
 * API pura (solo JSON, nunca sirve HTML) — el CSP por defecto de helmet
 * (default-src 'self') es inofensivo aquí: los navegadores ignoran CSP en
 * respuestas que no son HTML, así que no hay nada que ajustar por el iframe
 * de Power BI ni por ningún otro embed del frontend (eso vive en el servidor
 * que sirve el HTML del sitio, no en esta API).
 */
export async function registerHelmet(app: FastifyInstance) {
  await app.register(fastifyHelmet)
}
