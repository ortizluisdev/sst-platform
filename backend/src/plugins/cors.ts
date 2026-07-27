import fastifyCors from '@fastify/cors'
import type { FastifyInstance } from 'fastify'
import { env } from '../config/env.js'

const LOCAL_DEV_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173']

/**
 * Nunca se usa "*": solo el origen de producción (FRONTEND_URL) y los orígenes
 * de desarrollo local. Un formulario que guarda datos personales y envía correo
 * no debe aceptar requests desde cualquier origen.
 */
export async function registerCors(app: FastifyInstance) {
  const allowedOrigins = new Set([env.FRONTEND_URL, ...LOCAL_DEV_ORIGINS])

  await app.register(fastifyCors, {
    origin(origin, callback) {
      // Sin header Origin (curl, Postman, server-to-server) — se permite.
      // Un origen no permitido se deniega con `false`, no con un Error: así el
      // servidor responde normal (2xx/4xx de la ruta) y es el navegador quien
      // bloquea la respuesta por falta de cabeceras CORS — el comportamiento
      // estándar — en vez de aparentar un 500 de servidor.
      callback(null, !origin || allowedOrigins.has(origin))
    },
    // GET/PATCH ya se usan hoy (dashboard, historial, aprobación de usuarios);
    // PUT/DELETE quedan habilitados para CRUD futuro (ej. anuncios). CORS no
    // es control de acceso — eso lo hacen requireAuth/requirePermission en
    // cada ruta — así que ampliar los métodos aceptados no relaja seguridad,
    // solo evita que el navegador bloquee el preflight de una ruta legítima.
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    // Necesario para que el navegador envíe/reciba las cookies httpOnly de
    // sesión (access/refresh token) en requests cross-origin en dev
    // (localhost:5173 → localhost:3000). Solo es seguro combinado con la
    // lista blanca de orígenes de arriba — nunca junto a origin: "*".
    credentials: true,
  })
}
