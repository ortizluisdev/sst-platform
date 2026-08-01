import type { FastifyReply, FastifyRequest } from 'fastify'
import { createUsersService, UsersError } from './users.service.js'
import {
  reactivateUserParamsSchema,
  suspendUserParamsSchema,
  suspendUserBodySchema,
  resendInvitationParamsSchema,
  updateOwnProfileSchema,
  updateOwnAvatarSchema,
  updateOwnFirmaSchema,
  changeOwnPasswordSchema,
  formatFieldErrors,
} from './users.schema.js'

function sendUsersError(reply: FastifyReply, err: unknown) {
  if (err instanceof UsersError) {
    const statusByCode = {
      NOT_FOUND: 404,
      ALREADY_ACTIVE: 409,
      ALREADY_SUSPENDED: 409,
      NOT_PENDING_ACTIVATION: 409,
      INVALID_CURRENT_PASSWORD: 401,
    } as const
    return reply.code(statusByCode[err.code]).send({ message: err.message })
  }
  throw err
}

/** GET — perfil PERSONAL del usuario autenticado (nunca datos de la
 * organización, eso vive en /api/dashboard/organization/branding). */
export async function getOwnProfileHandler(request: FastifyRequest, reply: FastifyReply) {
  const service = createUsersService(request.server.prisma)
  try {
    const user = await service.getOwnProfile(request.user.sub)
    return reply.code(200).send({ user })
  } catch (err) {
    return sendUsersError(reply, err)
  }
}

export async function updateOwnProfileHandler(request: FastifyRequest, reply: FastifyReply) {
  const parsed = updateOwnProfileSchema.safeParse(request.body)
  if (!parsed.success) return reply.code(422).send({ errors: formatFieldErrors(parsed.error) })

  const service = createUsersService(request.server.prisma)
  try {
    const user = await service.updateOwnProfile(request.user.sub, parsed.data)
    return reply.code(200).send({ user })
  } catch (err) {
    return sendUsersError(reply, err)
  }
}

export async function updateOwnAvatarHandler(request: FastifyRequest, reply: FastifyReply) {
  const parsed = updateOwnAvatarSchema.safeParse(request.body)
  if (!parsed.success) return reply.code(422).send({ errors: formatFieldErrors(parsed.error) })

  const service = createUsersService(request.server.prisma)
  try {
    const user = await service.updateOwnAvatar(request.user.sub, parsed.data.fotoBase64)
    return reply.code(200).send({ user })
  } catch (err) {
    return sendUsersError(reply, err)
  }
}

export async function updateOwnFirmaHandler(request: FastifyRequest, reply: FastifyReply) {
  const parsed = updateOwnFirmaSchema.safeParse(request.body)
  if (!parsed.success) return reply.code(422).send({ errors: formatFieldErrors(parsed.error) })

  const service = createUsersService(request.server.prisma)
  try {
    const user = await service.updateOwnFirma(request.user.sub, parsed.data.firmaBase64)
    return reply.code(200).send({ user })
  } catch (err) {
    return sendUsersError(reply, err)
  }
}

export async function changeOwnPasswordHandler(request: FastifyRequest, reply: FastifyReply) {
  const parsed = changeOwnPasswordSchema.safeParse(request.body)
  if (!parsed.success) return reply.code(422).send({ errors: formatFieldErrors(parsed.error) })

  const service = createUsersService(request.server.prisma)
  try {
    await service.changeOwnPassword(request.user.sub, parsed.data.currentPassword, parsed.data.newPassword)
    return reply.code(200).send({ ok: true })
  } catch (err) {
    return sendUsersError(reply, err)
  }
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
