import type { FastifyReply, FastifyRequest } from 'fastify'
import {
  registerSchema,
  loginSchema,
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
  formatFieldErrors,
} from './auth.schema.js'
import { createAuthService, AuthError } from './auth.service.js'
import { setAuthCookies, clearAuthCookies, getUnsignedCookie } from '../../utils/tokens.js'
import { resolveUserPermissions } from '../../utils/permissions.js'

function requestContext(request: FastifyRequest) {
  return { ipAddress: request.ip, userAgent: request.headers['user-agent'] }
}

function sendAuthError(reply: FastifyReply, err: unknown) {
  if (err instanceof AuthError) {
    const statusByCode = {
      EMAIL_TAKEN: 409,
      INVALID_CREDENTIALS: 401,
      ACCOUNT_INACTIVE: 403,
      INVALID_TOKEN: 401,
      TOKEN_EXPIRED: 401,
    } as const
    return reply.code(statusByCode[err.code]).send({ message: err.message })
  }
  throw err
}

export async function registerHandler(request: FastifyRequest, reply: FastifyReply) {
  const parsed = registerSchema.safeParse(request.body)
  if (!parsed.success) return reply.code(422).send({ errors: formatFieldErrors(parsed.error) })

  const service = createAuthService(request.server.prisma, request.server)
  try {
    const { user, organization } = await service.register(parsed.data, requestContext(request))
    // Sin cookies de sesión: la cuenta queda inactiva hasta que un
    // super-admin/adminsystem la apruebe — no hay login automático.
    return reply.code(201).send({
      user: { id: user.id, email: user.email, nombre: user.nombre },
      organization: { id: organization.id, nombre: organization.nombre },
      message: 'Tu cuenta fue creada. Un administrador debe aprobarla antes de que puedas iniciar sesión.',
    })
  } catch (err) {
    return sendAuthError(reply, err)
  }
}

export async function loginHandler(request: FastifyRequest, reply: FastifyReply) {
  const parsed = loginSchema.safeParse(request.body)
  if (!parsed.success) return reply.code(422).send({ errors: formatFieldErrors(parsed.error) })

  const service = createAuthService(request.server.prisma, request.server)
  try {
    const { user, accessToken, refreshToken } = await service.login(parsed.data, requestContext(request))
    setAuthCookies(reply, accessToken, refreshToken)
    // Permisos globales (rol de plataforma, ej. super-admin). Los permisos
    // específicos de una organización se resuelven aparte cuando el cliente
    // selecciona/entra a esa organización — un usuario puede pertenecer a varias.
    const permissions = await resolveUserPermissions(request.server.prisma, user.id)
    return reply.code(200).send({
      user: { id: user.id, email: user.email, nombre: user.nombre },
      permissions: [...permissions],
    })
  } catch (err) {
    return sendAuthError(reply, err)
  }
}

export async function refreshHandler(request: FastifyRequest, reply: FastifyReply) {
  const refreshToken = getUnsignedCookie(request, 'roma_refresh_token')
  if (!refreshToken) return reply.code(401).send({ message: 'No autenticado' })

  const service = createAuthService(request.server.prisma, request.server)
  try {
    const { accessToken, refreshToken: newRefreshToken } = await service.refresh(
      refreshToken,
      requestContext(request),
    )
    setAuthCookies(reply, accessToken, newRefreshToken)
    return reply.code(200).send({ success: true })
  } catch (err) {
    clearAuthCookies(reply)
    return sendAuthError(reply, err)
  }
}

export async function logoutHandler(request: FastifyRequest, reply: FastifyReply) {
  const refreshToken = getUnsignedCookie(request, 'roma_refresh_token')
  const service = createAuthService(request.server.prisma, request.server)
  if (refreshToken) await service.logout(refreshToken)
  clearAuthCookies(reply)
  return reply.code(200).send({ success: true })
}

export async function passwordResetRequestHandler(request: FastifyRequest, reply: FastifyReply) {
  const parsed = passwordResetRequestSchema.safeParse(request.body)
  if (!parsed.success) return reply.code(422).send({ errors: formatFieldErrors(parsed.error) })

  const service = createAuthService(request.server.prisma, request.server)
  await service.requestPasswordReset(parsed.data.email)
  // Siempre 200, exista o no el correo — evita que el endpoint sirva para
  // enumerar qué emails están registrados en la plataforma.
  return reply.code(200).send({ success: true })
}

export async function passwordResetConfirmHandler(request: FastifyRequest, reply: FastifyReply) {
  const parsed = passwordResetConfirmSchema.safeParse(request.body)
  if (!parsed.success) return reply.code(422).send({ errors: formatFieldErrors(parsed.error) })

  const service = createAuthService(request.server.prisma, request.server)
  try {
    await service.confirmPasswordReset(parsed.data.token, parsed.data.newPassword)
    return reply.code(200).send({ success: true })
  } catch (err) {
    return sendAuthError(reply, err)
  }
}
