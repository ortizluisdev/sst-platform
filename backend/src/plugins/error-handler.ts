import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { env } from '../config/env.js'

/**
 * Red de seguridad para errores NO manejados: cada módulo ya captura sus
 * propios errores de dominio (AuthError, VariablesError, UsersError, etc.) y
 * decide qué mensaje mostrar. Esto solo entra en juego para lo inesperado —
 * un bug, una caída de la base de datos, un error de Prisma sin capturar —
 * donde `err.message` puede traer detalles internos (nombres de tabla,
 * rutas de archivo, fragmentos de query). Sin este handler, Fastify por
 * defecto devuelve ese `err.message` tal cual en el body de la respuesta.
 *
 * El error completo (con stack) siempre se loguea server-side — solo el
 * cliente recibe una respuesta genérica en producción. En desarrollo se
 * conserva el mensaje real para no entorpecer el debugging local.
 */
export async function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    request.log.error({ err: error, reqId: request.id }, 'Error no manejado')

    // Errores de validación de Fastify (ej. JSON malformado) sí son seguros
    // de mostrar tal cual — no filtran nada interno, solo dicen qué vino mal.
    if (error.validation) {
      return reply.code(400).send({ message: 'Solicitud inválida', errors: error.validation })
    }

    const statusCode = error.statusCode && error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 500

    if (env.NODE_ENV === 'production' && statusCode >= 500) {
      return reply.code(statusCode).send({ message: 'Ocurrió un error interno. Intenta de nuevo más tarde.' })
    }

    return reply.code(statusCode).send({ message: error.message })
  })
}
