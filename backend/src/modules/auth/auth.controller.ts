import type { FastifyReply, FastifyRequest } from 'fastify'
import {
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
      INVALID_CREDENTIALS: 401,
      ACCOUNT_PENDING_ACTIVATION: 403,
      ACCOUNT_SUSPENDED: 403,
      INVALID_TOKEN: 401,
      TOKEN_EXPIRED: 401,
    } as const
    return reply.code(statusByCode[err.code]).send({ message: err.message })
  }
  throw err
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
      user: { id: user.id, documentNumber: user.documentNumber, nombre: user.nombre },
      mustUpdateProfile: user.mustUpdateProfile,
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
  await service.requestPasswordReset(parsed.data.documentNumber)
  // Siempre 200, exista o no el documento — evita que el endpoint sirva para
  // enumerar qué documentos están registrados en la plataforma.
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

/** El frontend nunca puede leer las cookies httpOnly de sesión — este
 * endpoint es cómo sabe "quién soy" al cargar la app o navegar a una ruta
 * protegida (guard de router). Requiere requireAuth en la ruta. */
export async function meHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = await request.server.prisma.user.findUnique({ where: { id: request.user.sub } })
  if (!user || user.accountStatus !== 'ACTIVE') return reply.code(401).send({ message: 'No autenticado' })

  const membership = await request.server.prisma.userOrganization.findFirst({
    where: { userId: user.id },
    select: { organizationId: true },
  })

  const permissions = await resolveUserPermissions(request.server.prisma, user.id, membership?.organizationId)

  let branding: { primaryColor: string; secondaryColor: string } | null = null
  if (membership?.organizationId) {
    const organization = await request.server.prisma.organization.findUnique({
      where: { id: membership.organizationId },
      select: { primaryColor: true, secondaryColor: true },
    })
    if (organization?.primaryColor && organization?.secondaryColor) {
      branding = { primaryColor: organization.primaryColor, secondaryColor: organization.secondaryColor }
    }
  }

  return reply.code(200).send({
    user: { id: user.id, documentNumber: user.documentNumber, nombre: user.nombre, fotoBase64: user.fotoBase64 },
    organizationId: membership?.organizationId ?? null,
    mustUpdateProfile: user.mustUpdateProfile,
    permissions: [...permissions],
    branding,
  })
}
