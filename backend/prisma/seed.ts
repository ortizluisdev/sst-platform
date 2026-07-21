import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import argon2 from 'argon2'

const prisma = new PrismaClient()

/** Nunca hardcodear contraseñas reales en este archivo — se sube a git.
 * Las lee de .env (gitignorado). Falla explícitamente si falta alguna,
 * en vez de inventar un valor. */
function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Falta ${name} en .env — ver .env.example para las variables SEED_*`)
  return value
}

/**
 * Catálogo de los 5 servicios de RoMa. Nombres tomados de
 * frontend/src/i18n/locales/es.json → servicios.items (fuente de verdad
 * del sitio en producción).
 */
const SERVICES = [
  {
    slug: 'higiene-industrial',
    nombre: 'Higiene Industrial',
    descripcion:
      'Modelo de sistemas de estudios higiénicos: mapas de sonido, mapas de iluminación y estrés térmico.',
  },
  {
    slug: 'seguridad-vial',
    nombre: 'Seguridad Vial',
    descripcion: 'PESV clásico y Modelo Sistémico de Seguridad Vial (MSSV).',
  },
  {
    slug: 'riesgo-mecanico-locativo',
    nombre: 'Riesgo Mecánico y Locativo',
    descripcion: 'Modelo Sistémico de Intervención sobre operación, herramientas y maquinaria.',
  },
  {
    slug: 'mantenimiento-basado-en-riesgo',
    nombre: 'Mantenimiento Basado en Riesgo',
    descripcion: 'Estrategias de mantenimiento basadas en riesgo (RBI/RCM) para reducir siniestralidad.',
  },
  {
    slug: 'modelado-cientifico-comportamiento-social',
    nombre: 'Modelado Científico del Comportamiento Social',
    descripcion: 'Modelo Sistémico de Comportamiento a partir de entornos fijos y variables.',
  },
] as const

/**
 * Catálogo inicial de permisos. Se controla acceso por estas claves, no por
 * el nombre del rol — un rol es solo un paquete reutilizable de estas claves.
 * "*" es especial: significa "todos los permisos" (ver utils/permissions.ts).
 * Todavía ningún controlador las revisa (ver requirePermission en
 * plugins/auth-guard.ts) — quedan listas para cuando existan rutas de
 * dashboard/administración reales.
 */
const PERMISSIONS = [
  { key: '*', description: 'Acceso total — todos los permisos, sin excepción.' },
  { key: 'dashboard.higiene-industrial.view', description: 'Ver el dashboard de Higiene Industrial.' },
  { key: 'dashboard.seguridad-vial.view', description: 'Ver el dashboard de Seguridad Vial.' },
  {
    key: 'dashboard.riesgo-mecanico-locativo.view',
    description: 'Ver el dashboard de Riesgo Mecánico y Locativo.',
  },
  {
    key: 'dashboard.mantenimiento-basado-en-riesgo.view',
    description: 'Ver el dashboard de Mantenimiento Basado en Riesgo.',
  },
  {
    key: 'dashboard.modelado-cientifico-comportamiento-social.view',
    description: 'Ver el dashboard de Modelado Científico del Comportamiento Social.',
  },
  { key: 'dashboard.metrics.view', description: 'Ver tabla comparativa y gráfica de tendencia por variable.' },
  { key: 'menu.perfil.view', description: 'Ver y editar el perfil propio.' },
  { key: 'menu.notificaciones.view', description: 'Ver notificaciones propias.' },
  { key: 'org.usuarios.manage', description: 'Invitar, editar o quitar usuarios dentro de su organización.' },
  { key: 'org.variables.upload', description: 'Cargar el archivo semanal de variables de un servicio.' },
  { key: 'landing.anuncios.manage', description: 'CRUD de anuncios/guías de la landing page pública.' },
  { key: 'platform.users.approve', description: 'Aprobar cuentas nuevas de clientes autorregistrados.' },
] as const

/**
 * Únicos 3 roles del sistema por ahora:
 * - super-admin / adminsystem: mismo nivel de acceso (*), dos cuentas de
 *   plataforma distintas (equipo RoMa y desarrollo).
 * - cliente: rol de organización, sin permisos todavía — se define más
 *   adelante qué puede ver/hacer un cliente.
 */
const ROLES = [
  {
    name: 'super-admin',
    description: 'Equipo RoMa. Acceso total a la plataforma.',
    isSystem: true,
    permissionKeys: ['*'],
  },
  {
    name: 'adminsystem',
    description: 'Cuenta de desarrollo. Acceso total a la plataforma.',
    isSystem: true,
    permissionKeys: ['*'],
  },
  {
    name: 'cliente',
    description: 'Rol de organización cliente. Sin permisos asignados todavía.',
    isSystem: true,
    permissionKeys: [],
  },
] as const

/** Usuarios de plataforma (roleId directo en User, no ligados a una organización).
 * Las contraseñas se leen de .env — nunca en texto plano aquí. */
function buildPlatformUsers() {
  return [
    {
      email: 'ortiz.luis.dev@gmail.com',
      password: requireEnv('SEED_SUPERADMIN_PASSWORD'),
      nombre: 'Luis Ortiz',
      roleName: 'super-admin',
    },
    {
      email: 'luisangel930115@gmail.com',
      password: requireEnv('SEED_ADMINSYSTEM_PASSWORD'),
      nombre: 'Luis Angel (Dev)',
      roleName: 'adminsystem',
    },
  ] as const
}

/** Usuario cliente: crea su propia organización y queda como miembro con rol "cliente". */
function buildClientUser() {
  return {
    email: 'LAOR14548662@soy.sena.edu.co',
    password: requireEnv('SEED_CLIENTE_PASSWORD'),
    nombre: 'Usuario Organización 1',
    organizationName: 'Organizacion 1',
  } as const
}

async function main() {
  const PLATFORM_USERS = buildPlatformUsers()
  const CLIENT_USER = buildClientUser()

  for (const service of SERVICES) {
    await prisma.service.upsert({
      where: { slug: service.slug },
      update: { nombre: service.nombre, descripcion: service.descripcion },
      create: service,
    })
  }

  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: { description: permission.description },
      create: permission,
    })
  }

  // Deja el catálogo de roles exactamente en estos 3 — borra cualquier otro
  // rol del sistema que haya quedado de una versión anterior del seed.
  await prisma.role.deleteMany({
    where: { isSystem: true, name: { notIn: ROLES.map((r) => r.name) } },
  })

  for (const role of ROLES) {
    const created = await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description, isSystem: role.isSystem },
      create: { name: role.name, description: role.description, isSystem: role.isSystem },
    })

    // Deja el set de permisos del rol exactamente igual al definido arriba
    // (borra y re-crea las relaciones) — así el seed es idempotente incluso
    // si el catálogo de permisos de un rol cambia entre corridas.
    await prisma.rolePermission.deleteMany({ where: { roleId: created.id } })
    if (role.permissionKeys.length > 0) {
      const permissionRows = await prisma.permission.findMany({
        where: { key: { in: [...role.permissionKeys] } },
      })
      await prisma.rolePermission.createMany({
        data: permissionRows.map((p) => ({ roleId: created.id, permissionId: p.id })),
      })
    }
  }

  for (const platformUser of PLATFORM_USERS) {
    const role = await prisma.role.findUniqueOrThrow({ where: { name: platformUser.roleName } })
    const passwordHash = await argon2.hash(platformUser.password)
    await prisma.user.upsert({
      where: { email: platformUser.email },
      update: { roleId: role.id, nombre: platformUser.nombre },
      create: {
        email: platformUser.email,
        passwordHash,
        nombre: platformUser.nombre,
        roleId: role.id,
      },
    })
  }

  const clienteRole = await prisma.role.findUniqueOrThrow({ where: { name: 'cliente' } })
  const clientPasswordHash = await argon2.hash(CLIENT_USER.password)
  await prisma.$transaction(async (tx) => {
    // Organization.nombre no es @unique en el schema — find-or-create manual
    // en vez de upsert (que requiere una clave única para el `where`).
    const existingOrg = await tx.organization.findFirst({ where: { nombre: CLIENT_USER.organizationName } })
    const organization = existingOrg ?? (await tx.organization.create({ data: { nombre: CLIENT_USER.organizationName } }))
    const user = await tx.user.upsert({
      where: { email: CLIENT_USER.email },
      update: { nombre: CLIENT_USER.nombre },
      create: { email: CLIENT_USER.email, passwordHash: clientPasswordHash, nombre: CLIENT_USER.nombre },
    })
    await tx.userOrganization.upsert({
      where: { userId_organizationId: { userId: user.id, organizationId: organization.id } },
      update: { roleId: clienteRole.id },
      create: { userId: user.id, organizationId: organization.id, roleId: clienteRole.id },
    })
  })

  console.log(`Seed completo: ${SERVICES.length} servicios, ${PERMISSIONS.length} permisos, ${ROLES.length} roles.`)
  console.log(`Usuarios de plataforma: ${PLATFORM_USERS.map((u) => u.email).join(', ')}`)
  console.log(`Usuario cliente: ${CLIENT_USER.email} (organización: ${CLIENT_USER.organizationName})`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
