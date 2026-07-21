import type { PrismaClient } from '@prisma/client'

export const WILDCARD_PERMISSION = '*'

/**
 * Une los permisos del rol de plataforma del usuario (si tiene uno, ej.
 * super-admin) con los del rol que tiene dentro de `organizationId` (si se
 * pasa). Un usuario sin rol de plataforma y sin membresía en esa organización
 * termina con un Set vacío — sin acceso a nada, por diseño.
 */
export async function resolveUserPermissions(
  prisma: PrismaClient,
  userId: string,
  organizationId?: string,
): Promise<Set<string>> {
  const permissions = new Set<string>()

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  })
  if (!user) return permissions

  for (const rp of user.role?.permissions ?? []) {
    permissions.add(rp.permission.key)
  }

  if (organizationId) {
    const membership = await prisma.userOrganization.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    })
    for (const rp of membership?.role.permissions ?? []) {
      permissions.add(rp.permission.key)
    }
  }

  return permissions
}

/** `*` en el set concede cualquier permiso, sin importar la clave pedida. */
export function hasPermission(permissions: Set<string>, key: string): boolean {
  return permissions.has(WILDCARD_PERMISSION) || permissions.has(key)
}
