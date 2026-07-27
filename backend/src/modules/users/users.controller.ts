import type { FastifyReply, FastifyRequest } from 'fastify'
import { createUsersService, UsersError } from './users.service.js'
import {
  reactivateUserParamsSchema,
  suspendUserParamsSchema,
  suspendUserBodySchema,
  resendInvitationParamsSchema,
} from './users.schema.js'

function sendUsersError(reply: FastifyReply, err: unknown) {
  if (err instanceof UsersError) {
    const status = err.code === 'NOT_FOUND' ? 404 : 409
    return reply.code(status).send({ message: err.message })
  }
  throw err
}

export async function listActiveHandler(request: FastifyRequest, reply: FastifyReply) {
  const service = createUsersService(request.server.prisma)
  const active = await service.listActive()
  return reply.code(200).send({ users: active })
}

export async function listSuspendedHandler(request: FastifyRequest, reply: FastifyReply) {
  const service = createUsersService(request.server.prisma)
  const suspended = await service.listSuspended()
  return reply.code(200).send({ users: suspended })
}

export async function listPendingActivationHandler(request: FastifyRequest, reply: FastifyReply) {
  const service = createUsersService(request.server.prisma)
  const pending = await service.listPendingActivation()
  return reply.code(200).send({ users: pending })
}

export async function resendInvitationHandler(
  request: FastifyRequest<{ Params: { userId: string } }>,
  reply: FastifyReply,
) {
  const parsed = resendInvitationParamsSchema.safeParse(request.params)
  if (!parsed.success) return reply.code(422).send({ message: 'Identificador de usuario inválido' })

  const service = createUsersService(request.server.prisma)
  try {
    await service.resendInvitation(parsed.data.userId, request.user.sub, request.ip)
    return reply.code(200).send({ ok: true })
  } catch (err) {
    return sendUsersError(reply, err)
  }
}

export async function reactivateHandler(
  request: FastifyRequest<{ Params: { userId: string } }>,
  reply: FastifyReply,
) {
  const parsed = reactivateUserParamsSchema.safeParse(request.params)
  if (!parsed.success) return reply.code(422).send({ message: 'Identificador de usuario inválido' })

  const service = createUsersService(request.server.prisma)
  try {
    const user = await service.reactivate(parsed.data.userId, request.user.sub, request.ip)
    return reply.code(200).send({
      user: { id: user.id, documentNumber: user.documentNumber, nombre: user.nombre, accountStatus: user.accountStatus },
    })
  } catch (err) {
    return sendUsersError(reply, err)
  }
}

export async function suspendHandler(
  request: FastifyRequest<{ Params: { userId: string }; Body: { suspendReason: string } }>,
  reply: FastifyReply,
) {
  const parsedParams = suspendUserParamsSchema.safeParse(request.params)
  if (!parsedParams.success) return reply.code(422).send({ message: 'Identificador de usuario inválido' })

  const parsedBody = suspendUserBodySchema.safeParse(request.body)
  if (!parsedBody.success) {
    return reply.code(422).send({ message: parsedBody.error.issues[0]?.message ?? 'Motivo inválido' })
  }

  const service = createUsersService(request.server.prisma)
  try {
    const user = await service.suspend(
      parsedParams.data.userId,
      parsedBody.data.suspendReason,
      request.user.sub,
      request.ip,
    )
    return reply.code(200).send({
      user: {
        id: user.id,
        documentNumber: user.documentNumber,
        nombre: user.nombre,
        accountStatus: user.accountStatus,
        suspendReason: user.suspendReason,
      },
    })
  } catch (err) {
    return sendUsersError(reply, err)
  }
}
