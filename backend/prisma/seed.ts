import 'dotenv/config'
import { PrismaClient, type WorkShift } from '@prisma/client'
import argon2 from 'argon2'
import { calculateSemaphore } from '../src/utils/semaphore.js'

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
  {
    key: 'platform.variables.upload',
    description: 'Cargar el archivo de variables de CUALQUIER organización. Solo super-admin/adminsystem.',
  },
  {
    key: 'platform.dashboards.view',
    description: 'Ver el dashboard de CUALQUIER organización (para verificar cargas). Solo super-admin/adminsystem.',
  },
  { key: 'landing.anuncios.manage', description: 'CRUD de anuncios/guías de la landing page pública.' },
  { key: 'platform.users.approve', description: 'Suspender/reactivar cuentas de responsables de empresa.' },
  {
    key: 'platform.organizations.manage',
    description: 'Crear empresas y su responsable (Fase B). Solo super-admin/adminsystem.',
  },
] as const

/**
 * Únicos 3 roles del sistema por ahora:
 * - super-admin / adminsystem: mismo nivel de acceso (*), dos cuentas de
 *   plataforma distintas (equipo RoMa y desarrollo).
 * - cliente: rol de organización. Solo lectura de dashboards de servicios
 *   contratados — NUNCA carga.variables.upload (regla de negocio explícita:
 *   solo super-admin/adminsystem pueden cargar variables).
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
    description: 'Rol de organización cliente. Solo lectura de sus dashboards contratados.',
    isSystem: true,
    permissionKeys: ['dashboard.higiene-industrial.view', 'dashboard.metrics.view'],
  },
] as const

/** Usuarios de plataforma (roleId directo en User, no ligados a una
 * organización). Las contraseñas se leen de .env — nunca en texto plano
 * acá. Cuentas creadas directamente ACTIVE (no pasan por el flujo de
 * invitación/activación — son cuentas de equipo/desarrollo, no clientes). */
function buildPlatformUsers() {
  return [
    {
      documentNumber: '1000000001',
      email: 'ortiz.luis.dev@gmail.com',
      password: requireEnv('SEED_SUPERADMIN_PASSWORD'),
      nombre: 'Luis Ortiz',
      roleName: 'super-admin',
    },
    {
      documentNumber: '1000000002',
      email: 'luisangel930115@gmail.com',
      password: requireEnv('SEED_ADMINSYSTEM_PASSWORD'),
      nombre: 'Luis Angel (Dev)',
      roleName: 'adminsystem',
    },
  ] as const
}

type ComplianceProfile = 'saludable' | 'critico'

interface ClientOrgSeed {
  documentNumber: string
  email: string
  password: string
  nombre: string
  organizationName: string
  organizationNit: string
  workPointCount: number
  complianceProfile: ComplianceProfile
}

/** Usuarios cliente de prueba: cada uno es el responsable (login por
 * cédula) de su propia organización, con rol "cliente". Perfiles de
 * cumplimiento distintos a propósito — para poder comparar visualmente
 * cómo se comporta el dashboard (semáforo, cumplimiento global, tendencia)
 * entre una organización sana y una con hallazgos críticos frecuentes. */
function buildClientUsers(): ClientOrgSeed[] {
  return [
    {
      documentNumber: '1000000003',
      email: 'LAOR14548662@soy.sena.edu.co',
      password: requireEnv('SEED_CLIENTE_PASSWORD'),
      nombre: 'Usuario Organización 1',
      organizationName: 'Organizacion 1',
      organizationNit: '900000001-1',
      workPointCount: 20,
      complianceProfile: 'saludable',
    },
    {
      documentNumber: '1000000004',
      email: 'dimigaar1990@gmail.com',
      password: requireEnv('SEED_CLIENTE2_PASSWORD'),
      nombre: 'Usuario Organización 2',
      organizationName: 'Organizacion 2',
      organizationNit: '900000002-1',
      workPointCount: 14,
      complianceProfile: 'critico',
    },
  ]
}

// ============================================================
// HIGIENE INDUSTRIAL: catálogo de variables + datos de prueba
//
// IMPORTANTE: los rangos normativos de abajo son de referencia técnica real
// (ISO 8995-1/RETILAP, ISO 9612:2009, ISO 7243/ISO 7730) pero NO están
// auditados formalmente contra la ficha técnica oficial de cada norma —
// deben validarse antes de usarse en producción real.
// ============================================================

const HIGIENE_VARIABLES = [
  // --- Iluminación (ISO 8995-1 / RETILAP) ---
  {
    codigo: 'ILU-01',
    categoria: 'Iluminación',
    nombre: 'Iluminancia promedio',
    unidadMedida: 'lux',
    comparisonType: 'RANGE',
    limiteMin: 300,
    limiteMax: 500,
    normativaRef: 'ISO 8995-1 / RETILAP',
  },
  {
    codigo: 'ILU-02',
    categoria: 'Iluminación',
    nombre: 'Uniformidad (Emin/Eprom)',
    unidadMedida: 'ratio',
    comparisonType: 'MIN_LIMIT',
    limiteMin: 0.6,
    limiteMax: null,
    normativaRef: 'ISO 8995-1 / RETILAP',
  },
  {
    codigo: 'ILU-03',
    categoria: 'Iluminación',
    nombre: 'Deslumbramiento (UGR)',
    unidadMedida: 'UGR',
    comparisonType: 'MAX_LIMIT',
    limiteMin: null,
    limiteMax: 19,
    normativaRef: 'ISO 8995-1 / RETILAP',
  },
  {
    codigo: 'ILU-04',
    categoria: 'Iluminación',
    nombre: 'Reflectancia superficie de trabajo',
    unidadMedida: '%',
    comparisonType: 'RANGE',
    limiteMin: 20,
    limiteMax: 50,
    normativaRef: 'ISO 8995-1 / RETILAP',
  },
  // --- Ruido (ISO 9612:2009) ---
  {
    codigo: 'RUI-01',
    categoria: 'Ruido',
    nombre: 'Nivel sonoro promedio (LAeq,8h)',
    unidadMedida: 'dB(A)',
    comparisonType: 'MAX_LIMIT',
    limiteMin: null,
    limiteMax: 85,
    normativaRef: 'ISO 9612:2009',
  },
  {
    codigo: 'RUI-02',
    categoria: 'Ruido',
    nombre: 'Nivel pico (LCpeak)',
    unidadMedida: 'dB(C)',
    comparisonType: 'MAX_LIMIT',
    limiteMin: null,
    limiteMax: 140,
    normativaRef: 'ISO 9612:2009',
  },
  {
    codigo: 'RUI-03',
    categoria: 'Ruido',
    nombre: 'Tiempo de exposición',
    unidadMedida: 'h',
    comparisonType: 'MAX_LIMIT',
    limiteMin: null,
    limiteMax: 8,
    normativaRef: 'ISO 9612:2009',
  },
  {
    codigo: 'RUI-04',
    categoria: 'Ruido',
    nombre: 'Dosis de ruido',
    unidadMedida: '%',
    comparisonType: 'MAX_LIMIT',
    limiteMin: null,
    limiteMax: 100,
    normativaRef: 'ISO 9612:2009',
  },
  // --- Confort térmico (ISO 7243 / ISO 7730) ---
  {
    codigo: 'TER-01',
    categoria: 'Confort Térmico',
    nombre: 'Temperatura del aire',
    unidadMedida: '°C',
    comparisonType: 'RANGE',
    limiteMin: 18,
    limiteMax: 28,
    normativaRef: 'ISO 7730',
  },
  {
    codigo: 'TER-02',
    categoria: 'Confort Térmico',
    nombre: 'Humedad relativa',
    unidadMedida: '%',
    comparisonType: 'RANGE',
    limiteMin: 30,
    limiteMax: 70,
    normativaRef: 'ISO 7730',
  },
  {
    codigo: 'TER-03',
    categoria: 'Confort Térmico',
    nombre: 'WBGT (carga metabólica moderada)',
    unidadMedida: '°C',
    comparisonType: 'MAX_LIMIT',
    limiteMin: null,
    limiteMax: 30,
    normativaRef: 'ISO 7243',
  },
  {
    codigo: 'TER-04',
    categoria: 'Confort Térmico',
    nombre: 'Índice PMV',
    unidadMedida: 'PMV',
    comparisonType: 'RANGE',
    limiteMin: -0.5,
    limiteMax: 0.5,
    normativaRef: 'ISO 7730',
  },
] as const

const AREAS = ['Planta Principal', 'Planta de Ensamble', 'Bodega de Materiales', 'Área de Mantenimiento']
const PROCESOS = ['Mantenimiento Mecánico', 'Ensamble de Piezas', 'Control de Calidad', 'Almacenamiento', 'Soldadura', 'Empaque']
const JORNADAS: WorkShift[] = ['DIURNA', 'DIURNA', 'DIURNA', 'NOCTURNA', 'MIXTA']
const EVALUATION_DATES = ['2026-06-30', '2026-07-07', '2026-07-14', '2026-07-21']

/** Qué fracción de lecturas cae en verde / amarillo / rojo, por perfil —
 * "saludable" imita una organización con buen control de riesgo higiénico,
 * "critico" una con hallazgos frecuentes fuera de norma. */
const PROFILE_ROLLS: Record<ComplianceProfile, { verde: number; amarillo: number }> = {
  saludable: { verde: 0.75, amarillo: 0.9 },
  critico: { verde: 0.4, amarillo: 0.65 },
}

function randomInRange(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100
}

/** Genera un valor conforme al perfil de cumplimiento de la organización —
 * para que el semáforo del seed refleje una mezcla realista, no 100% verde. */
function generateReadingValue(def: (typeof HIGIENE_VARIABLES)[number], profile: ComplianceProfile): number {
  const roll = Math.random()
  const { verde, amarillo } = PROFILE_ROLLS[profile]
  if (def.comparisonType === 'RANGE') {
    const min = def.limiteMin as number
    const max = def.limiteMax as number
    if (roll < verde) return randomInRange(min, max)
    if (roll < amarillo) return randomInRange(max, max * 1.15)
    return randomInRange(max * 1.15, max * 1.4)
  }
  if (def.comparisonType === 'MAX_LIMIT') {
    const max = def.limiteMax as number
    if (roll < verde) return randomInRange(max * 0.7, max)
    if (roll < amarillo) return randomInRange(max, max * 1.1)
    return randomInRange(max * 1.1, max * 1.3)
  }
  // MIN_LIMIT
  const min = def.limiteMin as number
  if (roll < verde) return randomInRange(min, min * 1.3)
  if (roll < amarillo) return randomInRange(min * 0.9, min)
  return randomInRange(min * 0.7, min * 0.9)
}

async function seedHigieneIndustrialData(
  organizationId: string,
  uploadedById: string,
  workPointCount: number,
  complianceProfile: ComplianceProfile,
) {
  const service = await prisma.service.findUniqueOrThrow({ where: { slug: 'higiene-industrial' } })

  // Asegura que la organización de prueba tenga el servicio contratado —
  // sin esto ni el cliente ni el dashboard verían nada.
  await prisma.organizationService.upsert({
    where: { organizationId_serviceId: { organizationId, serviceId: service.id } },
    update: { isActive: true },
    create: { organizationId, serviceId: service.id, isActive: true },
  })

  const definitionByCode = new Map<string, { id: string; comparisonType: string; limiteMin: number | null; limiteMax: number | null; toleranciaAlerta: number }>()
  for (const v of HIGIENE_VARIABLES) {
    const row = await prisma.variableDefinition.upsert({
      where: { serviceId_codigo: { serviceId: service.id, codigo: v.codigo } },
      update: {
        categoria: v.categoria,
        nombre: v.nombre,
        unidadMedida: v.unidadMedida,
        comparisonType: v.comparisonType,
        limiteMin: v.limiteMin,
        limiteMax: v.limiteMax,
        normativaRef: v.normativaRef,
      },
      create: {
        serviceId: service.id,
        codigo: v.codigo,
        categoria: v.categoria,
        nombre: v.nombre,
        unidadMedida: v.unidadMedida,
        comparisonType: v.comparisonType,
        limiteMin: v.limiteMin,
        limiteMax: v.limiteMax,
        normativaRef: v.normativaRef,
      },
    })
    definitionByCode.set(v.codigo, row)
  }

  // Idempotencia: si ya hay cargas para esta organización/servicio, no
  // duplicar work points ni lecturas en una segunda corrida del seed.
  const existingUpload = await prisma.variableUpload.findFirst({ where: { organizationId, serviceId: service.id } })
  if (existingUpload) {
    console.log('Datos de Higiene Industrial ya sembrados para esta organización — se omite duplicar.')
    return
  }

  const workPoints = await Promise.all(
    Array.from({ length: workPointCount }, (_, i) => {
      const n = i + 1
      const codigo = `PT-${String(n).padStart(4, '0')}`
      return prisma.workPoint.upsert({
        where: { organizationId_codigo: { organizationId, codigo } },
        update: {},
        create: {
          organizationId,
          codigo,
          nombre: `${PROCESOS[n % PROCESOS.length]} — Puesto ${n}`,
          areaPlanta: AREAS[n % AREAS.length]!,
          procesoActividad: PROCESOS[n % PROCESOS.length]!,
          jornada: JORNADAS[n % JORNADAS.length]!,
        },
      })
    }),
  )

  for (const fecha of EVALUATION_DATES) {
    const upload = await prisma.variableUpload.create({
      data: {
        organizationId,
        serviceId: service.id,
        uploadedById,
        originalFile: `higiene_industrial_${fecha}.csv`,
        fechaEvaluacion: new Date(fecha),
        status: 'PROCESADO',
      },
    })

    const readings = workPoints.flatMap((wp) =>
      HIGIENE_VARIABLES.map((v) => {
        const definition = definitionByCode.get(v.codigo)!
        const valor = generateReadingValue(v, complianceProfile)
        const semaforo = calculateSemaphore(valor, {
          comparisonType: definition.comparisonType as never,
          limiteMin: definition.limiteMin,
          limiteMax: definition.limiteMax,
          toleranciaAlerta: definition.toleranciaAlerta,
        })
        return { uploadId: upload.id, workPointId: wp.id, definitionId: definition.id, valor, semaforo }
      }),
    )

    await prisma.variableReading.createMany({ data: readings })
  }

  console.log(
    `Higiene Industrial (perfil ${complianceProfile}): ${HIGIENE_VARIABLES.length} variables, ${workPoints.length} puestos de trabajo, ${EVALUATION_DATES.length} cargas históricas.`,
  )
}

async function main() {
  const PLATFORM_USERS = buildPlatformUsers()
  const CLIENT_USERS = buildClientUsers()

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

  let superAdminUserId = ''
  for (const platformUser of PLATFORM_USERS) {
    const role = await prisma.role.findUniqueOrThrow({ where: { name: platformUser.roleName } })
    const passwordHash = await argon2.hash(platformUser.password)
    const user = await prisma.user.upsert({
      where: { documentNumber: platformUser.documentNumber },
      update: { roleId: role.id, nombre: platformUser.nombre, email: platformUser.email },
      create: {
        documentType: 'CC',
        documentNumber: platformUser.documentNumber,
        email: platformUser.email,
        passwordHash,
        nombre: platformUser.nombre,
        roleId: role.id,
        accountStatus: 'ACTIVE',
      },
    })
    if (platformUser.roleName === 'super-admin') superAdminUserId = user.id
  }

  const clienteRole = await prisma.role.findUniqueOrThrow({ where: { name: 'cliente' } })

  // Limpieza de organizaciones huérfanas de antes de que `nit` existiera en
  // el schema (Fase B) — sin nit no hay forma de que el upsert de abajo las
  // reconozca como la misma fila, así que quedarían duplicadas en cada
  // corrida si no se limpian primero. `users: { none: {} }` las distingue de
  // cualquier organización real (que sí tiene al menos un miembro).
  await prisma.organization.deleteMany({
    where: { nit: null, users: { none: {} } },
  })

  for (const clientUser of CLIENT_USERS) {
    const clientPasswordHash = await argon2.hash(clientUser.password)
    const clientOrganizationId = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.upsert({
        where: { nit: clientUser.organizationNit },
        update: { nombre: clientUser.organizationName },
        create: { nombre: clientUser.organizationName, nit: clientUser.organizationNit },
      })
      const user = await tx.user.upsert({
        where: { documentNumber: clientUser.documentNumber },
        update: { nombre: clientUser.nombre, email: clientUser.email },
        create: {
          documentType: 'CC',
          documentNumber: clientUser.documentNumber,
          email: clientUser.email,
          passwordHash: clientPasswordHash,
          nombre: clientUser.nombre,
          accountStatus: 'ACTIVE',
        },
      })
      await tx.userOrganization.upsert({
        where: { userId_organizationId: { userId: user.id, organizationId: organization.id } },
        update: { roleId: clienteRole.id },
        create: { userId: user.id, organizationId: organization.id, roleId: clienteRole.id },
      })
      return organization.id
    })

    await seedHigieneIndustrialData(clientOrganizationId, superAdminUserId, clientUser.workPointCount, clientUser.complianceProfile)
  }

  console.log(`Seed completo: ${SERVICES.length} servicios, ${PERMISSIONS.length} permisos, ${ROLES.length} roles.`)
  console.log(`Usuarios de plataforma (login por documento): ${PLATFORM_USERS.map((u) => u.documentNumber).join(', ')}`)
  console.log(
    `Usuarios cliente: ${CLIENT_USERS.map((u) => `${u.documentNumber} (${u.organizationName}, perfil ${u.complianceProfile})`).join(', ')}`,
  )
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
