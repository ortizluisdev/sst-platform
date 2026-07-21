import fastifyCookie from '@fastify/cookie'
import type { FastifyInstance } from 'fastify'
import { env } from '../config/env.js'

export async function registerCookie(app: FastifyInstance) {
  await app.register(fastifyCookie, {
    secret: env.COOKIE_SECRET,
    hook: 'onRequest',
  })
}
