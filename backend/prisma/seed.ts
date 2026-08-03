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
    key: 'platform.variables.correct',
    description: 'Corregir el valor de una lectura ya procesada de CUALQUIER organización. Solo super-admin/adminsystem.',
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
  {
    key: 'platform.services.manage',
    description: 'CRUD del catálogo de servicios (Fase C). Solo super-admin/adminsystem.',
  },
  {
    key: 'platform.variables.manage',
    description: 'Editar Tipo/Instrumento/Incertidumbre del catálogo de variables. Solo super-admin/adminsystem.',
  },
  {
    key: 'platform.workCatalogs.manage',
    description: 'CRUD de zonas/secciones/cargos/trabajadores por empresa. Solo super-admin/adminsystem.',
  },
  {
    key: 'platform.notifications.manage',
    description: 'Redactar, editar y eliminar (borrado suave) notificaciones de cualquier destinatario. Solo super-admin/adminsystem.',
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
    permissionKeys: ['dashboard.higiene-industrial.view', 'dashboard.seguridad-vial.view', 'dashboard.metrics.view'],
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
 * cédula) de su propia organización, con rol "cliente".
 *
 * Fase de pruebas (2026-08): se dejó un solo cliente demo a propósito —
 * antes había una segunda organización ("Organizacion 2", 1000000004) solo
 * para comparar visualmente un perfil de cumplimiento sano vs. uno crítico,
 * pero la nueva fase de pruebas arranca limpia con únicamente los 3
 * usuarios de siempre (1000000001/02/03). Si se necesita ese segundo
 * perfil de comparación más adelante, se puede volver a agregar aquí. */
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

/**
 * Catálogo real de Higiene Industrial — fuente de verdad: `variablesdash1.xlsx`,
 * Hoja 2 · Detalle técnico (2026-07-29). Reestructuración aprobada:
 * - ILU-04, RUI-01, VIB-01, VIB-02 quedan `isActive: false` (deprecadas, NO
 *   se borran): sus definiciones se dividieron en variables más específicas
 *   que el Excel sí distingue. Las lecturas históricas que ya apuntan a
 *   estos 4 códigos NO se remapean — siguen existiendo, sin fusionarse con
 *   las nuevas definiciones. Cargas nuevas usan exclusivamente el catálogo
 *   activo (los códigos deprecados quedan fuera de la validación de carga
 *   y del catálogo admin, vía el mismo `isActive` que ya filtraba ambos).
 * - `tipo` (M/C/I) y límites vienen del Excel; donde el Excel no da un
 *   límite o instrumento específico, quedan `null` (no se inventan normas).
 */
const HIGIENE_VARIABLES = [
  // --- Iluminación (ISO 8995-1 / RETILAP) ---
  {
    codigo: 'ILU-01',
    categoria: 'Iluminación',
    nombre: 'Iluminancia horizontal media',
    unidadMedida: 'lux',
    comparisonType: 'MIN_LIMIT',
    limiteMin: 500,
    limiteMax: null,
    normativaRef: 'ISO 8995-1',
    tipo: 'MEDICION',
    isActive: true,
  },
  {
    codigo: 'ILU-02',
    categoria: 'Iluminación',
    nombre: 'Uniformidad',
    unidadMedida: 'adimensional',
    comparisonType: 'MIN_LIMIT',
    limiteMin: 0.6,
    limiteMax: null,
    normativaRef: 'ISO 8995-1',
    tipo: 'CALCULO',
    isActive: true,
  },
  {
    codigo: 'ILU-03',
    categoria: 'Iluminación',
    nombre: 'Deslumbramiento unificado (UGR)',
    unidadMedida: 'adimensional',
    comparisonType: 'MAX_LIMIT',
    limiteMin: null,
    limiteMax: 22,
    normativaRef: 'ISO 8995-1',
    tipo: 'CALCULO',
    isActive: true,
  },
  // Deprecada: dividida en ILU-08/09/10 (reflectancia por superficie, en
  // decimal 0–1) — el Excel las trata como 3 variables, no 1 sola en %.
  {
    codigo: 'ILU-04',
    categoria: 'Iluminación',
    nombre: 'Reflectancia superficie de trabajo',
    unidadMedida: '%',
    comparisonType: 'RANGE',
    limiteMin: 20,
    limiteMax: 50,
    normativaRef: 'ISO 8995-1 / RETILAP',
    tipo: null,
    isActive: false,
  },
  {
    codigo: 'ILU-05',
    categoria: 'Iluminación',
    nombre: 'Iluminancia horizontal (por punto)',
    unidadMedida: 'lux',
    comparisonType: 'RANGE',
    limiteMin: null,
    limiteMax: null,
    normativaRef: null,
    tipo: 'MEDICION',
    isActive: true,
  },
  // Deprecada: dividida en ILU-14/15/16 (iluminancia vertical a 0.0/1.0/1.5 m)
  // — son 3 puntos de referencia distintos (piso, plano de trabajo, altura de
  // ojos), no la misma medición repetida; el Excel ya las trata como 3 filas.
  {
    codigo: 'ILU-06',
    categoria: 'Iluminación',
    nombre: 'Iluminancia vertical (por altura)',
    unidadMedida: 'lux',
    comparisonType: 'RANGE',
    limiteMin: null,
    limiteMax: null,
    normativaRef: null,
    tipo: null,
    isActive: false,
  },
  {
    codigo: 'ILU-07',
    categoria: 'Iluminación',
    nombre: 'Iluminancia cilíndrica',
    unidadMedida: 'lux',
    comparisonType: 'RANGE',
    limiteMin: null,
    limiteMax: null,
    normativaRef: null,
    tipo: 'CALCULO',
    isActive: true,
  },
  {
    codigo: 'ILU-08',
    categoria: 'Iluminación',
    nombre: 'Reflectancia piso',
    unidadMedida: 'adimensional (0–1)',
    comparisonType: 'RANGE',
    limiteMin: 0.2,
    limiteMax: 0.4,
    normativaRef: null,
    tipo: 'CALCULO',
    isActive: true,
  },
  {
    codigo: 'ILU-09',
    categoria: 'Iluminación',
    nombre: 'Reflectancia pared',
    unidadMedida: 'adimensional (0–1)',
    comparisonType: 'RANGE',
    limiteMin: 0.5,
    limiteMax: 0.8,
    normativaRef: null,
    tipo: 'CALCULO',
    isActive: true,
  },
  {
    codigo: 'ILU-10',
    categoria: 'Iluminación',
    nombre: 'Reflectancia techo',
    unidadMedida: 'adimensional (0–1)',
    comparisonType: 'RANGE',
    limiteMin: 0.7,
    limiteMax: 0.9,
    normativaRef: null,
    tipo: 'CALCULO',
    isActive: true,
  },
  {
    codigo: 'ILU-11',
    categoria: 'Iluminación',
    nombre: 'Luminancia',
    unidadMedida: 'cd/m²',
    comparisonType: 'RANGE',
    limiteMin: null,
    limiteMax: null,
    normativaRef: null,
    tipo: 'MEDICION',
    isActive: true,
  },
  {
    // Excel marca esta variable como "Medición/Cálculo" (ambiguo) — se
    // clasifica como Cálculo porque el índice del local se deriva de las
    // dimensiones del espacio, no de una lectura directa de instrumento.
    codigo: 'ILU-12',
    categoria: 'Iluminación',
    nombre: 'Índice del local',
    unidadMedida: 'adimensional',
    comparisonType: 'RANGE',
    limiteMin: null,
    limiteMax: null,
    normativaRef: null,
    tipo: 'CALCULO',
    isActive: true,
  },
  {
    codigo: 'ILU-13',
    categoria: 'Iluminación',
    nombre: 'Factor de luz día',
    unidadMedida: '%',
    comparisonType: 'RANGE',
    limiteMin: null,
    limiteMax: null,
    normativaRef: null,
    tipo: 'CALCULO',
    isActive: true,
  },
  {
    codigo: 'ILU-14',
    categoria: 'Iluminación',
    nombre: 'Iluminancia vertical (0.0 m)',
    unidadMedida: 'lux',
    comparisonType: 'RANGE',
    limiteMin: null,
    limiteMax: null,
    normativaRef: null,
    tipo: 'MEDICION',
    isActive: true,
  },
  {
    codigo: 'ILU-15',
    categoria: 'Iluminación',
    nombre: 'Iluminancia vertical (1.0 m)',
    unidadMedida: 'lux',
    comparisonType: 'RANGE',
    limiteMin: null,
    limiteMax: null,
    normativaRef: null,
    tipo: 'MEDICION',
    isActive: true,
  },
  {
    codigo: 'ILU-16',
    categoria: 'Iluminación',
    nombre: 'Iluminancia vertical (1.5 m)',
    unidadMedida: 'lux',
    comparisonType: 'RANGE',
    limiteMin: null,
    limiteMax: null,
    normativaRef: null,
    tipo: 'MEDICION',
    isActive: true,
  },
  // --- Sonido (ISO 9612:2009) ---
  // Deprecada: dividida en RUI-05 (LAeq, medición cruda) y RUI-06 (LEX,8h,
  // exposición diaria calculada) — el Excel ya las trata como 2 variables.
  {
    codigo: 'RUI-01',
    categoria: 'Sonido',
    nombre: 'Nivel sonoro promedio (LAeq,8h)',
    unidadMedida: 'dB(A)',
    comparisonType: 'MAX_LIMIT',
    limiteMin: null,
    limiteMax: 85,
    normativaRef: 'ISO 9612:2009',
    tipo: null,
    isActive: false,
  },
  {
    codigo: 'RUI-02',
    categoria: 'Sonido',
    nombre: 'Nivel pico (LC,pico)',
    unidadMedida: 'dB(C)',
    comparisonType: 'MAX_LIMIT',
    limiteMin: null,
    limiteMax: 140,
    normativaRef: 'ISO 9612:2009',
    tipo: 'MEDICION',
    isActive: true,
  },
  {
    codigo: 'RUI-03',
    categoria: 'Sonido',
    nombre: 'Tiempo de exposición',
    unidadMedida: 'h',
    comparisonType: 'MAX_LIMIT',
    limiteMin: null,
    limiteMax: 8,
    normativaRef: 'ISO 9612:2009',
    tipo: 'INSPECCION',
    isActive: true,
  },
  {
    codigo: 'RUI-04',
    categoria: 'Sonido',
    nombre: 'Dosis de ruido',
    unidadMedida: '%',
    comparisonType: 'MAX_LIMIT',
    limiteMin: null,
    limiteMax: 100,
    normativaRef: 'ISO 9612:2009',
    tipo: 'CALCULO',
    isActive: true,
  },
  {
    codigo: 'RUI-05',
    categoria: 'Sonido',
    nombre: 'Nivel continuo equivalente (A)',
    unidadMedida: 'dB(A)',
    comparisonType: 'MAX_LIMIT',
    limiteMin: null,
    limiteMax: 85,
    normativaRef: 'ISO 9612:2009',
    tipo: 'MEDICION',
    isActive: true,
  },
  {
    codigo: 'RUI-06',
    categoria: 'Sonido',
    nombre: 'Nivel de exposición diaria',
    unidadMedida: 'dB(A)',
    comparisonType: 'MAX_LIMIT',
    limiteMin: null,
    limiteMax: 85,
    normativaRef: 'ISO 9612:2009',
    tipo: 'CALCULO',
    isActive: true,
  },
  {
    codigo: 'RUI-07',
    categoria: 'Sonido',
    nombre: 'Nivel de presión sonora',
    unidadMedida: 'dB',
    comparisonType: 'RANGE',
    limiteMin: null,
    limiteMax: null,
    normativaRef: null,
    tipo: 'MEDICION',
    isActive: true,
  },
  // Deprecada: dividida en RUI-11/12/13 (L10/L50/L90) — son 3 descriptores
  // acústicos estándar (ISO 1996-2) con significado distinto (picos, nivel
  // típico, ruido de fondo), no la misma medición repetida.
  {
    codigo: 'RUI-08',
    categoria: 'Sonido',
    nombre: 'Percentiles estadísticos (L10/L50/L90)',
    unidadMedida: 'dB(A)',
    comparisonType: 'RANGE',
    limiteMin: null,
    limiteMax: null,
    normativaRef: null,
    tipo: null,
    isActive: false,
  },
  // Deprecada: dividida en RUI-14 a RUI-22 (una por banda de octava
  // estándar, 31.5 Hz a 8 kHz) — el análisis espectral real es una medición
  // por banda, no un solo valor.
  {
    codigo: 'RUI-09',
    categoria: 'Sonido',
    nombre: 'Análisis en bandas de octava',
    unidadMedida: 'dB (por banda)',
    comparisonType: 'RANGE',
    limiteMin: null,
    limiteMax: null,
    normativaRef: '31.5 Hz – 8 kHz',
    tipo: null,
    isActive: false,
  },
  {
    codigo: 'RUI-10',
    categoria: 'Sonido',
    nombre: 'Atenuación de protector auditivo',
    unidadMedida: 'dB',
    comparisonType: 'RANGE',
    limiteMin: null,
    limiteMax: null,
    normativaRef: 'ISO 4869',
    tipo: 'CALCULO',
    isActive: true,
  },
  {
    codigo: 'RUI-11',
    categoria: 'Sonido',
    nombre: 'Percentil L10',
    unidadMedida: 'dB(A)',
    comparisonType: 'RANGE',
    limiteMin: null,
    limiteMax: null,
    normativaRef: null,
    tipo: 'CALCULO',
    isActive: true,
  },
  {
    codigo: 'RUI-12',
    categoria: 'Sonido',
    nombre: 'Percentil L50',
    unidadMedida: 'dB(A)',
    comparisonType: 'RANGE',
    limiteMin: null,
    limiteMax: null,
    normativaRef: null,
    tipo: 'CALCULO',
    isActive: true,
  },
  {
    codigo: 'RUI-13',
    categoria: 'Sonido',
    nombre: 'Percentil L90',
    unidadMedida: 'dB(A)',
    comparisonType: 'RANGE',
    limiteMin: null,
    limiteMax: null,
    normativaRef: null,
    tipo: 'CALCULO',
    isActive: true,
  },
  {
    codigo: 'RUI-14',
    categoria: 'Sonido',
    nombre: 'Nivel banda 31.5 Hz',
    unidadMedida: 'dB',
    comparisonType: 'RANGE',
    limiteMin: null,
    limiteMax: null,
    normativaRef: null,
    tipo: 'MEDICION',
    isActive: true,
  },
  {
    codigo: 'RUI-15',
    categoria: 'Sonido',
    nombre: 'Nivel banda 63 Hz',
    unidadMedida: 'dB',
    comparisonType: 'RANGE',
    limiteMin: null,
    limiteMax: null,
    normativaRef: null,
    tipo: 'MEDICION',
    isActive: true,
  },
  {
    codigo: 'RUI-16',
    categoria: 'Sonido',
    nombre: 'Nivel banda 125 Hz',
    unidadMedida: 'dB',
    comparisonType: 'RANGE',
    limiteMin: null,
    limiteMax: null,
    normativaRef: null,
    tipo: 'MEDICION',
    isActive: true,
  },
  {
    codigo: 'RUI-17',
    categoria: 'Sonido',
    nombre: 'Nivel banda 250 Hz',
    unidadMedida: 'dB',
    comparisonType: 'RANGE',
    limiteMin: null,
    limiteMax: null,
    normativaRef: null,
    tipo: 'MEDICION',
    isActive: true,
  },
  {
    codigo: 'RUI-18',
    categoria: 'Sonido',
    nombre: 'Nivel banda 500 Hz',
    unidadMedida: 'dB',
    comparisonType: 'RANGE',
    limiteMin: null,
    limiteMax: null,
    normativaRef: null,
    tipo: 'MEDICION',
    isActive: true,
  },
  {
    codigo: 'RUI-19',
    categoria: 'Sonido',
    nombre: 'Nivel banda 1000 Hz',
    unidadMedida: 'dB',
    comparisonType: 'RANGE',
    limiteMin: null,
    limiteMax: null,
    normativaRef: null,
    tipo: 'MEDICION',
    isActive: true,
  },
  {
    codigo: 'RUI-20',
    categoria: 'Sonido',
    nombre: 'Nivel banda 2000 Hz',
    unidadMedida: 'dB',
    comparisonType: 'RANGE',
    limiteMin: null,
    limiteMax: null,
    normativaRef: null,
    tipo: 'MEDICION',
    isActive: true,
  },
  {
    codigo: 'RUI-21',
    categoria: 'Sonido',
    nombre: 'Nivel banda 4000 Hz',
    unidadMedida: 'dB',
    comparisonType: 'RANGE',
    limiteMin: null,
    limiteMax: null,
    normativaRef: null,
    tipo: 'MEDICION',
    isActive: true,
  },
  {
    codigo: 'RUI-22',
    categoria: 'Sonido',
    nombre: 'Nivel banda 8000 Hz',
    unidadMedida: 'dB',
    comparisonType: 'RANGE',
    limiteMin: null,
    limiteMax: null,
    normativaRef: null,
    tipo: 'MEDICION',
    isActive: true,
  },
  // --- Estrés térmico (ISO 7243 / ISO 7730 / ISO 8996 / ISO 9920) ---
  {
    codigo: 'TER-01',
    categoria: 'Estrés Térmico',
    nombre: 'Temperatura del aire (bulbo seco)',
    unidadMedida: '°C',
    comparisonType: 'RANGE',
    limiteMin: null,
    limiteMax: null,
    normativaRef: null,
    tipo: 'MEDICION',
    isActive: true,
  },
  {
    codigo: 'TER-02',
    categoria: 'Estrés Térmico',
    nombre: 'Humedad relativa',
    unidadMedida: '%',
    comparisonType: 'RANGE',
    limiteMin: 30,
    limiteMax: 70,
    normativaRef: 'ISO 7730',
    tipo: 'MEDICION',
    isActive: true,
  },
  {
    codigo: 'TER-03',
    categoria: 'Estrés Térmico',
    nombre: 'Índice WBGT',
    unidadMedida: '°C',
    comparisonType: 'MAX_LIMIT',
    limiteMin: null,
    limiteMax: 28,
    normativaRef: 'ISO 7243',
    tipo: 'CALCULO',
    isActive: true,
  },
  {
    codigo: 'TER-04',
    categoria: 'Estrés Térmico',
    nombre: 'Voto medio previsto (PMV)',
    unidadMedida: 'adimensional',
    comparisonType: 'RANGE',
    limiteMin: -0.5,
    limiteMax: 0.5,
    normativaRef: 'ISO 7730',
    tipo: 'CALCULO',
    isActive: true,
  },
  {
    codigo: 'TER-05',
    categoria: 'Estrés Térmico',
    nombre: 'Temperatura de globo',
    unidadMedida: '°C',
    comparisonType: 'RANGE',
    limiteMin: null,
    limiteMax: null,
    normativaRef: null,
    tipo: 'MEDICION',
    isActive: true,
  },
  {
    codigo: 'TER-06',
    categoria: 'Estrés Térmico',
    nombre: 'Temperatura de bulbo húmedo natural',
    unidadMedida: '°C',
    comparisonType: 'RANGE',
    limiteMin: null,
    limiteMax: null,
    normativaRef: null,
    tipo: 'MEDICION',
    isActive: true,
  },
  {
    codigo: 'TER-07',
    categoria: 'Estrés Térmico',
    nombre: 'Temperatura radiante media',
    unidadMedida: '°C',
    comparisonType: 'RANGE',
    limiteMin: null,
    limiteMax: null,
    normativaRef: null,
    tipo: 'CALCULO',
    isActive: true,
  },
  {
    codigo: 'TER-08',
    categoria: 'Estrés Térmico',
    nombre: 'Velocidad del aire',
    unidadMedida: 'm/s',
    comparisonType: 'RANGE',
    limiteMin: null,
    limiteMax: null,
    normativaRef: null,
    tipo: 'MEDICION',
    isActive: true,
  },
  {
    codigo: 'TER-09',
    categoria: 'Estrés Térmico',
    nombre: 'Porcentaje previsto de insatisfechos (PPD)',
    unidadMedida: '%',
    comparisonType: 'MAX_LIMIT',
    limiteMin: null,
    limiteMax: 10,
    normativaRef: null,
    tipo: 'CALCULO',
    isActive: true,
  },
  {
    codigo: 'TER-10',
    categoria: 'Estrés Térmico',
    nombre: 'Tasa metabólica',
    unidadMedida: 'W/m²',
    comparisonType: 'RANGE',
    limiteMin: null,
    limiteMax: null,
    normativaRef: 'ISO 8996',
    tipo: 'INSPECCION',
    isActive: true,
  },
  {
    codigo: 'TER-11',
    categoria: 'Estrés Térmico',
    nombre: 'Aislamiento de vestimenta',
    unidadMedida: 'clo',
    comparisonType: 'RANGE',
    limiteMin: null,
    limiteMax: null,
    normativaRef: 'ISO 9920',
    tipo: 'INSPECCION',
    isActive: true,
  },
  // Deprecada: dividida en TER-13/14 (tiempo de trabajo, tiempo de
  // descanso) — el "45/15" del Excel son 2 cantidades escalares reales, no
  // un solo dato.
  {
    codigo: 'TER-12',
    categoria: 'Estrés Térmico',
    nombre: 'Régimen trabajo/descanso',
    unidadMedida: 'min/min',
    comparisonType: 'RANGE',
    limiteMin: null,
    limiteMax: null,
    normativaRef: 'ISO 7243',
    tipo: null,
    isActive: false,
  },
  {
    codigo: 'TER-13',
    categoria: 'Estrés Térmico',
    nombre: 'Tiempo de trabajo permitido',
    unidadMedida: 'min',
    comparisonType: 'RANGE',
    limiteMin: null,
    limiteMax: null,
    normativaRef: 'ISO 7243',
    tipo: 'CALCULO',
    isActive: true,
  },
  {
    codigo: 'TER-14',
    categoria: 'Estrés Térmico',
    nombre: 'Tiempo de descanso requerido',
    unidadMedida: 'min',
    comparisonType: 'RANGE',
    limiteMin: null,
    limiteMax: null,
    normativaRef: 'ISO 7243',
    tipo: 'CALCULO',
    isActive: true,
  },
  // --- Radiación UV (ICNIRP / ACGIH) ---
  {
    codigo: 'RUV-01',
    categoria: 'Radiación UV',
    nombre: 'Índice UV',
    unidadMedida: 'UV Index',
    comparisonType: 'MAX_LIMIT',
    limiteMin: null,
    limiteMax: 3.0,
    normativaRef: null,
    tipo: 'MEDICION',
    isActive: true,
  },
  {
    codigo: 'RUV-02',
    categoria: 'Radiación UV',
    nombre: 'Irradiancia efectiva',
    unidadMedida: 'W/m²',
    comparisonType: 'RANGE',
    limiteMin: null,
    limiteMax: null,
    normativaRef: null,
    tipo: 'MEDICION',
    isActive: true,
  },
  {
    codigo: 'RUV-03',
    categoria: 'Radiación UV',
    nombre: 'Exposición radiante efectiva',
    unidadMedida: 'J/m²',
    comparisonType: 'MAX_LIMIT',
    limiteMin: null,
    limiteMax: 30,
    normativaRef: 'ICNIRP',
    tipo: 'CALCULO',
    isActive: true,
  },
  {
    codigo: 'RUV-04',
    categoria: 'Radiación UV',
    nombre: 'Tiempo máximo de exposición',
    unidadMedida: 'h',
    comparisonType: 'RANGE',
    limiteMin: null,
    limiteMax: null,
    normativaRef: null,
    tipo: 'CALCULO',
    isActive: true,
  },
  // Deprecada: dividida en RUV-06/07/08 (UV-A/UV-B/UV-C) — cada banda tiene
  // efectos biológicos distintos (ICNIRP/ACGIH), no es un solo valor.
  {
    codigo: 'RUV-05',
    categoria: 'Radiación UV',
    nombre: 'Irradiancia por banda (UV-A/B/C)',
    unidadMedida: 'W/m²',
    comparisonType: 'RANGE',
    limiteMin: null,
    limiteMax: null,
    normativaRef: null,
    tipo: null,
    isActive: false,
  },
  {
    codigo: 'RUV-06',
    categoria: 'Radiación UV',
    nombre: 'Irradiancia UV-A',
    unidadMedida: 'W/m²',
    comparisonType: 'RANGE',
    limiteMin: null,
    limiteMax: null,
    normativaRef: null,
    tipo: 'MEDICION',
    isActive: true,
  },
  {
    codigo: 'RUV-07',
    categoria: 'Radiación UV',
    nombre: 'Irradiancia UV-B',
    unidadMedida: 'W/m²',
    comparisonType: 'RANGE',
    limiteMin: null,
    limiteMax: null,
    normativaRef: null,
    tipo: 'MEDICION',
    isActive: true,
  },
  {
    codigo: 'RUV-08',
    categoria: 'Radiación UV',
    nombre: 'Irradiancia UV-C',
    unidadMedida: 'W/m²',
    comparisonType: 'RANGE',
    limiteMin: null,
    limiteMax: null,
    normativaRef: null,
    tipo: 'MEDICION',
    isActive: true,
  },
  // --- Vibración (ISO 5349 / ISO 2631) ---
  // Deprecada: dividida en VIB-05 (ahv, medición cruda) y VIB-06 (A(8) HAV,
  // exposición diaria calculada, ≤5 m/s² — el límite real que hoy faltaba).
  {
    codigo: 'VIB-01',
    categoria: 'Vibración',
    nombre: 'Mano-brazo (A(8))',
    unidadMedida: 'm/s²',
    comparisonType: 'RANGE',
    limiteMin: null,
    limiteMax: null,
    normativaRef: null,
    tipo: null,
    isActive: false,
  },
  // Deprecada: dividida en VIB-07 (aw, medición cruda) y VIB-08 (A(8) WBV,
  // exposición diaria calculada, ≤1.15 m/s² — el límite real que hoy faltaba).
  {
    codigo: 'VIB-02',
    categoria: 'Vibración',
    nombre: 'Cuerpo entero (A(8))',
    unidadMedida: 'm/s²',
    comparisonType: 'RANGE',
    limiteMin: null,
    limiteMax: null,
    normativaRef: null,
    tipo: null,
    isActive: false,
  },
  {
    codigo: 'VIB-03',
    categoria: 'Vibración',
    nombre: 'Frecuencia dominante',
    unidadMedida: 'Hz',
    comparisonType: 'RANGE',
    limiteMin: null,
    limiteMax: null,
    normativaRef: null,
    tipo: 'CALCULO',
    isActive: true,
  },
  {
    codigo: 'VIB-04',
    categoria: 'Vibración',
    nombre: 'Tiempo de exposición',
    unidadMedida: 'h',
    comparisonType: 'RANGE',
    limiteMin: null,
    limiteMax: null,
    normativaRef: null,
    tipo: 'INSPECCION',
    isActive: true,
  },
  {
    codigo: 'VIB-05',
    categoria: 'Vibración',
    nombre: 'Aceleración ponderada mano-brazo',
    unidadMedida: 'm/s²',
    comparisonType: 'RANGE',
    limiteMin: null,
    limiteMax: null,
    normativaRef: null,
    tipo: 'MEDICION',
    isActive: true,
  },
  {
    codigo: 'VIB-06',
    categoria: 'Vibración',
    nombre: 'Exposición diaria mano-brazo (A(8))',
    unidadMedida: 'm/s²',
    comparisonType: 'MAX_LIMIT',
    limiteMin: null,
    limiteMax: 5,
    normativaRef: 'ISO 5349',
    tipo: 'CALCULO',
    isActive: true,
  },
  {
    codigo: 'VIB-07',
    categoria: 'Vibración',
    nombre: 'Aceleración ponderada cuerpo entero',
    unidadMedida: 'm/s²',
    comparisonType: 'RANGE',
    limiteMin: null,
    limiteMax: null,
    normativaRef: null,
    tipo: 'MEDICION',
    isActive: true,
  },
  {
    codigo: 'VIB-08',
    categoria: 'Vibración',
    nombre: 'Exposición diaria cuerpo entero (A(8))',
    unidadMedida: 'm/s²',
    comparisonType: 'MAX_LIMIT',
    limiteMin: null,
    limiteMax: 1.15,
    normativaRef: 'ISO 2631',
    tipo: 'CALCULO',
    isActive: true,
  },
  {
    codigo: 'VIB-09',
    categoria: 'Vibración',
    nombre: 'Valor de dosis de vibración (VDV)',
    unidadMedida: 'm/s^1.75',
    comparisonType: 'MAX_LIMIT',
    limiteMin: null,
    limiteMax: 21,
    normativaRef: null,
    tipo: 'CALCULO',
    isActive: true,
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
    if (def.limiteMin == null || def.limiteMax == null) {
      // Variable informativa, sin límite normativo (el semáforo ya devuelve
      // AMARILLO en este caso) — un valor 0–100 evita que randomInRange(0,0)
      // devuelva siempre 0 en el dato de demo, sin inventar ninguna norma.
      return randomInRange(0, 100)
    }
    const min = def.limiteMin
    const max = def.limiteMax
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
        tipo: v.tipo,
        isActive: v.isActive,
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
        tipo: v.tipo,
        isActive: v.isActive,
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
      // Las definiciones deprecadas (isActive: false) no reciben lecturas
      // nuevas — el catálogo nuevo es el único destino de cargas a partir
      // de este deploy (ver comentario sobre HIGIENE_VARIABLES arriba).
      HIGIENE_VARIABLES.filter((v) => v.isActive).map((v) => {
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

  const activeVariableCount = HIGIENE_VARIABLES.filter((v) => v.isActive).length
  console.log(
    `Higiene Industrial (perfil ${complianceProfile}): ${activeVariableCount} variables activas (+${HIGIENE_VARIABLES.length - activeVariableCount} deprecadas), ${workPoints.length} puestos de trabajo, ${EVALUATION_DATES.length} cargas históricas.`,
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
      // passwordHash también en el update: antes solo se fijaba al crear, así
      // que cambiar SEED_*_PASSWORD y volver a correr el seed no rotaba la
      // contraseña de un usuario ya existente (había que borrarlo primero).
      update: { roleId: role.id, nombre: platformUser.nombre, email: platformUser.email, passwordHash },
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
        update: { nombre: clientUser.nombre, email: clientUser.email, passwordHash: clientPasswordHash },
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
