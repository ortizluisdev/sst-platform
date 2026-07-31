/**
 * Reset a solo 3 usuarios limpios (super-admin, adminsystem, cliente) —
 * NO es el seed completo (ese trae organizaciones/lecturas de demo falsas).
 * Borra todos los usuarios/organizaciones/datos operativos existentes;
 * conserva el catálogo (permissions/roles/services/variable_definitions) y
 * contact_submissions (datos reales del formulario público).
 *
 * Uso: DATABASE_URL=... SEED_SUPERADMIN_PASSWORD=... SEED_ADMINSYSTEM_PASSWORD=... SEED_CLIENTE_PASSWORD=... npx tsx prisma/reset-clean-users.ts
 */
import { PrismaClient } from '@prisma/client'
import argon2 from 'argon2'

const prisma = new PrismaClient()

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Falta la variable de entorno ${name}`)
  return value
}

async function main() {
  console.log('Borrando datos operativos existentes (usuarios, organizaciones, cargas)...')

  // Orden respetando FKs — de hijo a padre. Catálogo (permissions, roles,
  // role_permissions, services, variable_definitions) y contact_submissions
  // NUNCA se tocan acá.
  await prisma.variableReading.deleteMany()
  await prisma.variableUpload.deleteMany()
  await prisma.workPoint.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.announcement.deleteMany()
  await prisma.refreshToken.deleteMany()
  await prisma.passwordResetToken.deleteMany()
  await prisma.activationToken.deleteMany()
  await prisma.organizationService.deleteMany()
  await prisma.userOrganization.deleteMany()
  await prisma.user.deleteMany()
  await prisma.organization.deleteMany()

  console.log('Creando los 3 usuarios limpios...')

  const superAdminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'super-admin' } })
  const adminsystemRole = await prisma.role.findUniqueOrThrow({ where: { name: 'adminsystem' } })
  const clienteRole = await prisma.role.findUniqueOrThrow({ where: { name: 'cliente' } })
  const higieneIndustrial = await prisma.service.findUniqueOrThrow({ where: { slug: 'higiene-industrial' } })

  const superAdminPasswordHash = await argon2.hash(requireEnv('SEED_SUPERADMIN_PASSWORD'))
  await prisma.user.create({
    data: {
      documentNumber: '1000000001',
      email: 'ortiz.luis.dev@gmail.com',
      passwordHash: superAdminPasswordHash,
      nombre: 'Luis Ortiz',
      roleId: superAdminRole.id,
      accountStatus: 'ACTIVE',
    },
  })

  const adminsystemPasswordHash = await argon2.hash(requireEnv('SEED_ADMINSYSTEM_PASSWORD'))
  await prisma.user.create({
    data: {
      documentNumber: '1000000002',
      email: 'luisangel930115@gmail.com',
      passwordHash: adminsystemPasswordHash,
      nombre: 'Luis Angel (Dev)',
      roleId: adminsystemRole.id,
      accountStatus: 'ACTIVE',
    },
  })

  const clienteOrg = await prisma.organization.create({
    data: { nombre: 'Cliente Demo', nit: '900000000-1' },
  })

  await prisma.organizationService.create({
    data: { organizationId: clienteOrg.id, serviceId: higieneIndustrial.id, isActive: true },
  })

  const clientePasswordHash = await argon2.hash(requireEnv('SEED_CLIENTE_PASSWORD'))
  const clienteUser = await prisma.user.create({
    data: {
      documentNumber: '1000000003',
      email: 'cliente.demo@romascience.com',
      passwordHash: clientePasswordHash,
      nombre: 'Cliente Demo',
      accountStatus: 'ACTIVE',
    },
  })

  await prisma.userOrganization.create({
    data: { userId: clienteUser.id, organizationId: clienteOrg.id, roleId: clienteRole.id },
  })

  console.log('Listo: super-admin (1000000001), adminsystem (1000000002), cliente (1000000003).')
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
