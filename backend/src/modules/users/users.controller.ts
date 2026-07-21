import type { FastifyReply, FastifyRequest } from 'fastify'
import { createUsersService, UsersError } from './users.service.js'

export async function listPendingHandler(request: FastifyRequest, reply: FastifyReply) {
  const service = createUsersService(request.server.prisma)
  const pending = await service.listPending()
  return reply.code(200).send({ users: pending })
}

export async function approveHandler(
  request: FastifyRequest<{ Params: { userId: string } }>,
  reply: FastifyReply,
) {
  const service = createUsersService(request.server.prisma)
  try {
    const user = await service.approve(request.params.userId, request.user.sub, request.ip)
    return reply.code(200).send({
      user: { id: user.id, email: user.email, nombre: user.nombre, isActive: user.isActive },
    })
  } catch (err) {
    if (err instanceof UsersError) {
      const status = err.code === 'NOT_FOUND' ? 404 : 409
      return reply.code(status).send({ message: err.message })
    }
    throw err
  }
}
