import fastifyMultipart from '@fastify/multipart'
import type { FastifyInstance } from 'fastify'

export async function registerMultipart(app: FastifyInstance) {
  await app.register(fastifyMultipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB — más que suficiente para un CSV/Excel de variables
      files: 1,
    },
  })
}
