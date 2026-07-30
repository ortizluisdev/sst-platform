# Catálogo de Variables (5 categorías + M/C/I/Instrumento) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reestructurar el catálogo real de Higiene Industrial de 3 a 5 categorías (Iluminación/Sonido/Estrés Térmico/Radiación UV/Vibración), agregar los campos Tipo (M/C/I)/Instrumento/Incertidumbre a cada variable (pendientes hasta que el cliente final los confirme), y dar al admin una pantalla para completarlos.

**Architecture:** Los 3 campos nuevos viven en `VariableDefinition` (nunca en `VariableReading` — la reestructuración de categorías es solo un `UPDATE` sobre filas existentes, sin tocar lecturas ya cargadas). Nuevo módulo backend `variableCatalog` (separado de `variables`, que maneja cargas/lecturas) con 2 endpoints; nueva vista de admin de edición inline.

**Tech Stack:** Fastify + Prisma + Zod (backend), Vue 3 `<script setup>` + Tailwind v4 (frontend), MySQL/MariaDB.

## Global Constraints

- No automated test suite — verificación vía `npm run typecheck` (backend y frontend) + verificación manual en navegador, convención ya establecida en este proyecto.
- No commits durante la ejecución — regla de esta sesión. El controller usa `git add -A` (solo staging) + `git stash create` para generar diffs de revisión, nunca commits reales.
- Non-interactive Prisma migration flow (sin TTY): `prisma migrate diff --from-schema-datasource=prisma/schema.prisma --to-schema-datamodel=prisma/schema.prisma --script > <file>` → revisar → `prisma db execute --file <path> --schema prisma/schema.prisma` → `prisma migrate resolve --applied <name>` → `prisma generate`.
- **No inventar datos técnicos ni normas** — `tipo`/`instrumento`/`incertidumbre` quedan `NULL` para las 20 variables resultantes (12 reestructuradas + 8 nuevas). Solo `unidadMedida`/`comparisonType`/límites se completan para las 8 filas nuevas, usando unidades técnicas estándar del dominio — nunca límites normativos específicos inventados (esos también quedan pendientes: `limiteMin`/`limiteMax` en `null` para las 8 filas nuevas).
- La reestructuración de categorías (`Ruido`→`Sonido`, `Confort Térmico`→`Estrés Térmico`) es un `UPDATE` sobre las filas existentes de `VariableDefinition` — nunca toca `VariableReading`, que no tiene columna `categoria`.
- Spec completo: `docs/superpowers/specs/2026-07-29-variable-catalog-restructure-design.md`.

---

## Task 1: Prisma schema — campos nuevos + enum + reestructuración de categorías + seed

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Modify: `backend/prisma/seed.ts`
- Create: `backend/prisma/migrations/<timestamp>_variable_catalog_restructure/migration.sql`

**Interfaces:**
- Produces: `VariableDefinition.tipo: VariableMeasurementType?`, `.instrumento: String?`, `.incertidumbre: String?`; `AuditAction.VARIABLE_DEFINITION_UPDATED`; permiso `platform.variables.manage` en `PERMISSIONS`; catálogo reestructurado (Sonido/Estrés Térmico) + 8 filas nuevas (Radiación UV/Vibración).

- [ ] **Step 1: Editar el modelo `VariableDefinition`**

En `backend/prisma/schema.prisma`, encontrar el modelo `VariableDefinition` (actualmente termina con `normativaRef` antes de `isActive`) y agregar 3 campos:

```prisma
model VariableDefinition {
  id               String                 @id @default(cuid())
  serviceId        String                 @map("service_id")
  /// Libre, no enum: cada servicio define sus propias categorías (para
  /// Higiene Industrial: Iluminación/Sonido/Estrés Térmico/Radiación UV/
  /// Vibración; otro servicio tendría categorías completamente distintas).
  categoria        String                 @db.VarChar(100)
  codigo           String                 @db.VarChar(50)
  nombre           String                 @db.VarChar(255)
  unidadMedida     String                 @map("unidad_medida") @db.VarChar(50)
  comparisonType   VariableComparisonType @default(RANGE) @map("comparison_type")
  limiteMin        Float?                 @map("limite_min")
  limiteMax        Float?                 @map("limite_max")
  toleranciaAlerta Float                  @default(0.1) @map("tolerancia_alerta")
  normativaRef     String?                @map("normativa_ref") @db.VarChar(255)
  /// Pendientes hasta que el cliente final confirme el dato técnico real —
  /// nunca se infieren/inventan (ver spec 2026-07-29-variable-catalog-restructure-design.md).
  tipo             VariableMeasurementType?
  instrumento      String?                @map("instrumento") @db.VarChar(255)
  incertidumbre    String?                @map("incertidumbre") @db.VarChar(100)
  isActive         Boolean                @default(true) @map("is_active")
  createdAt        DateTime               @default(now()) @map("created_at")
  updatedAt        DateTime               @updatedAt @map("updated_at")

  service  Service           @relation(fields: [serviceId], references: [id], onDelete: Restrict)
  readings VariableReading[]

  @@unique([serviceId, codigo])
  @@index([serviceId])
  @@map("variable_definitions")
}
```

- [ ] **Step 2: Agregar el enum `VariableMeasurementType`**

Justo después del modelo `VariableDefinition` (antes de `enum UploadStatus`), agregar:

```prisma
enum VariableMeasurementType {
  MEDICION
  CALCULO
  INSPECCION
}
```

- [ ] **Step 3: Agregar el nuevo `AuditAction`**

En `enum AuditAction` (termina en `ORGANIZATION_BRANDING_SET`), agregar una línea:

```prisma
enum AuditAction {
  LOGIN
  LOGIN_FAILED
  LOGOUT
  PASSWORD_RESET_REQUESTED
  PASSWORD_RESET_COMPLETED
  ROLE_CHANGED
  ORG_SERVICE_GRANTED
  ORG_SERVICE_REVOKED
  DASHBOARD_ACCESSED
  USER_CREATED_BY_ADMIN
  ACTIVATION_INVITE_RESENT
  ACCOUNT_ACTIVATED
  USER_SUSPENDED
  USER_REACTIVATED
  PROFILE_UPDATED
  VARIABLES_UPLOADED
  ORGANIZATION_UPDATED
  SERVICE_CREATED
  SERVICE_UPDATED
  VARIABLE_READING_CORRECTED
  ORGANIZATION_BRANDING_SET
  /// Admin completa Tipo/Instrumento/Incertidumbre de una variable del
  /// catálogo (2026-07-29).
  VARIABLE_DEFINITION_UPDATED
}
```

- [ ] **Step 4: Generar, revisar y aplicar la migración**

```bash
cd backend
npx prisma migrate diff --from-schema-datasource=prisma/schema.prisma --to-schema-datamodel=prisma/schema.prisma --script > /tmp/variable_catalog_migration.sql
cat /tmp/variable_catalog_migration.sql
```

Expected: `ALTER TABLE variable_definitions ADD COLUMN tipo ENUM('MEDICION','CALCULO','INSPECCION') NULL, ADD COLUMN instrumento VARCHAR(255) NULL, ADD COLUMN incertidumbre VARCHAR(100) NULL;` más el `ALTER TABLE audit_logs MODIFY action ENUM(...)` incluyendo `VARIABLE_DEFINITION_UPDATED`.

```bash
TS=$(date +%Y%m%d%H%M%S)
mkdir -p "prisma/migrations/${TS}_variable_catalog_restructure"
cp /tmp/variable_catalog_migration.sql "prisma/migrations/${TS}_variable_catalog_restructure/migration.sql"
npx prisma db execute --file "prisma/migrations/${TS}_variable_catalog_restructure/migration.sql" --schema prisma/schema.prisma
npx prisma migrate resolve --applied "${TS}_variable_catalog_restructure"
npx prisma generate
```

- [ ] **Step 5: Reestructurar las categorías existentes en `seed.ts`**

En `backend/prisma/seed.ts`, dentro del array `HIGIENE_VARIABLES` (busca el comentario `// --- Ruido (ISO 9612:2009) ---`), cambiar el valor de `categoria` en las 4 variables de Ruido de `'Ruido'` a `'Sonido'`, y en las 4 variables de Confort Térmico de `'Confort Térmico'` a `'Estrés Térmico'` — el resto de cada objeto (código, nombre, unidad, límites, normativaRef) queda exactamente igual:

```typescript
  // --- Sonido (ISO 9612:2009) ---
  {
    codigo: 'RUI-01',
    categoria: 'Sonido',
    nombre: 'Nivel sonoro promedio (LAeq,8h)',
    unidadMedida: 'dB(A)',
    comparisonType: 'MAX_LIMIT',
    limiteMin: null,
    limiteMax: 85,
    normativaRef: 'ISO 9612:2009',
  },
  {
    codigo: 'RUI-02',
    categoria: 'Sonido',
    nombre: 'Nivel pico (LCpeak)',
    unidadMedida: 'dB(C)',
    comparisonType: 'MAX_LIMIT',
    limiteMin: null,
    limiteMax: 140,
    normativaRef: 'ISO 9612:2009',
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
  },
  // --- Estrés térmico (ISO 7243 / ISO 7730) ---
  {
    codigo: 'TER-01',
    categoria: 'Estrés Térmico',
    nombre: 'Temperatura del aire',
    unidadMedida: '°C',
    comparisonType: 'RANGE',
    limiteMin: 18,
    limiteMax: 28,
    normativaRef: 'ISO 7730',
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
  },
  {
    codigo: 'TER-03',
    categoria: 'Estrés Térmico',
    nombre: 'WBGT (carga metabólica moderada)',
    unidadMedida: '°C',
    comparisonType: 'MAX_LIMIT',
    limiteMin: null,
    limiteMax: 30,
    normativaRef: 'ISO 7243',
  },
  {
    codigo: 'TER-04',
    categoria: 'Estrés Térmico',
    nombre: 'Índice PMV',
    unidadMedida: 'PMV',
    comparisonType: 'RANGE',
    limiteMin: -0.5,
    limiteMax: 0.5,
    normativaRef: 'ISO 7730',
  },
```

- [ ] **Step 6: Agregar las 8 variables nuevas al final del array `HIGIENE_VARIABLES`**

Justo antes del `] as const` que cierra `HIGIENE_VARIABLES`, agregar:

```typescript
  // --- Radiación UV (ICNIRP) — límites normativos pendientes de confirmar ---
  {
    codigo: 'RUV-01',
    categoria: 'Radiación UV',
    nombre: 'Índice UV',
    unidadMedida: 'UV Index',
    comparisonType: 'RANGE',
    limiteMin: null,
    limiteMax: null,
    normativaRef: null,
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
  },
  {
    codigo: 'RUV-03',
    categoria: 'Radiación UV',
    nombre: 'Exposición radiante',
    unidadMedida: 'J/m²',
    comparisonType: 'RANGE',
    limiteMin: null,
    limiteMax: null,
    normativaRef: null,
  },
  {
    codigo: 'RUV-04',
    categoria: 'Radiación UV',
    nombre: 'Tiempo máx. de exposición',
    unidadMedida: 'h',
    comparisonType: 'RANGE',
    limiteMin: null,
    limiteMax: null,
    normativaRef: null,
  },
  // --- Vibración (ISO 5349 / ISO 2631) — límites normativos pendientes de confirmar ---
  {
    codigo: 'VIB-01',
    categoria: 'Vibración',
    nombre: 'Mano-brazo (A(8))',
    unidadMedida: 'm/s²',
    comparisonType: 'RANGE',
    limiteMin: null,
    limiteMax: null,
    normativaRef: null,
  },
  {
    codigo: 'VIB-02',
    categoria: 'Vibración',
    nombre: 'Cuerpo entero (A(8))',
    unidadMedida: 'm/s²',
    comparisonType: 'RANGE',
    limiteMin: null,
    limiteMax: null,
    normativaRef: null,
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
  },
```

**Nota:** el `comparisonType: 'RANGE'` con `limiteMin`/`limiteMax` ambos `null` hace que `calculateSemaphore()` devuelva `AMARILLO` para cualquier lectura de estas 8 variables (comportamiento ya existente en `backend/src/utils/semaphore.ts`, verificado en el spec) — correcto y esperado hasta que se confirmen los límites reales.

- [ ] **Step 7: Agregar el nuevo permiso en `PERMISSIONS`**

En `backend/prisma/seed.ts`, en el array `PERMISSIONS` (busca `platform.services.manage`, es la última entrada), agregar después:

```typescript
  {
    key: 'platform.variables.manage',
    description: 'Editar Tipo/Instrumento/Incertidumbre del catálogo de variables. Solo super-admin/adminsystem.',
  },
```

(No hace falta agregarlo a `permissionKeys` de ningún rol explícitamente — `super-admin`/`adminsystem` ya tienen `'*'`, que cubre cualquier permiso nuevo.)

- [ ] **Step 8: Re-ejecutar el seed y verificar**

```bash
npm run prisma:seed 2>&1 | tail -30
```

Expected: sin errores; el seed hace `upsert` sobre `variable_definitions` por `serviceId_codigo` único, así que las 12 filas existentes se actualizan (nueva `categoria`) y las 8 nuevas se crean, sin duplicar nada.

```bash
mysql -u roma_app -p"$DB_PASSWORD" -h localhost roma_db -e "
SELECT categoria, codigo, nombre, tipo, instrumento FROM variable_definitions ORDER BY categoria, codigo;
"
```

Expected: 20 filas, 5 categorías distintas (Iluminación, Sonido, Estrés Térmico, Radiación UV, Vibración), `tipo`/`instrumento` en `NULL` para las 20.

- [ ] **Step 9: Verificar que las lecturas ya cargadas siguen intactas**

```bash
mysql -u roma_app -p"$DB_PASSWORD" -h localhost roma_db -e "
SELECT COUNT(*) AS total_readings FROM variable_readings;
"
```

Expected: el mismo conteo de antes de este cambio (ninguna fila de `variable_readings` se toca en este task).

```bash
cd backend && npm run typecheck
```

Expected: sin errores.

---

## Task 2: Backend — nuevo módulo `variableCatalog`

**Files:**
- Create: `backend/src/modules/variableCatalog/variableCatalog.schema.ts`
- Create: `backend/src/modules/variableCatalog/variableCatalog.repository.ts`
- Create: `backend/src/modules/variableCatalog/variableCatalog.service.ts`
- Create: `backend/src/modules/variableCatalog/variableCatalog.controller.ts`
- Create: `backend/src/modules/variableCatalog/variableCatalog.routes.ts`
- Modify: `backend/src/app.ts`

**Interfaces:**
- Consumes: `VariableDefinition.tipo/instrumento/incertidumbre` (Task 1).
- Produces: `GET /api/admin/services/:serviceSlug/variables` → `{ categories: { categoria: string, variables: {...}[] }[] }`. `PATCH /api/admin/services/:serviceSlug/variables/:variableId` → `{ variable: {...} }`.

- [ ] **Step 1: Schema**

```typescript
import { z } from 'zod'

export const updateVariableDefinitionSchema = z
  .object({
    tipo: z.enum(['MEDICION', 'CALCULO', 'INSPECCION']).optional(),
    instrumento: z.string().trim().min(1, 'Ingresa el instrumento').max(255).optional(),
    incertidumbre: z.string().trim().min(1, 'Ingresa la incertidumbre').max(100).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No hay cambios para aplicar' })

export type UpdateVariableDefinitionInput = z.infer<typeof updateVariableDefinitionSchema>

export function formatFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors = error.flatten().fieldErrors
  const errors: Record<string, string> = {}
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (messages?.[0]) errors[field] = messages[0]
  }
  return errors
}
```

- [ ] **Step 2: Repository**

```typescript
import type { Prisma, PrismaClient, VariableMeasurementType } from '@prisma/client'

export function createVariableCatalogRepository(prisma: PrismaClient) {
  return {
    findServiceBySlug(slug: string) {
      return prisma.service.findUnique({ where: { slug } })
    },

    findDefinitionsByService(serviceId: string) {
      return prisma.variableDefinition.findMany({
        where: { serviceId, isActive: true },
        orderBy: [{ categoria: 'asc' }, { codigo: 'asc' }],
      })
    },

    findDefinitionById(id: string) {
      return prisma.variableDefinition.findUnique({ where: { id } })
    },

    update(
      id: string,
      data: { tipo?: VariableMeasurementType; instrumento?: string; incertidumbre?: string },
    ) {
      return prisma.variableDefinition.update({ where: { id }, data })
    },

    createAuditLog(input: {
      userId: string
      action: 'VARIABLE_DEFINITION_UPDATED'
      metadata: Prisma.InputJsonObject
      ipAddress?: string
    }) {
      return prisma.auditLog.create({
        data: { userId: input.userId, action: input.action, metadata: input.metadata, ipAddress: input.ipAddress },
      })
    },
  }
}

export type VariableCatalogRepository = ReturnType<typeof createVariableCatalogRepository>
```

- [ ] **Step 3: Service**

```typescript
import type { PrismaClient } from '@prisma/client'
import { createVariableCatalogRepository } from './variableCatalog.repository.js'
import type { UpdateVariableDefinitionInput } from './variableCatalog.schema.js'

export class VariableCatalogError extends Error {
  constructor(
    public code: 'SERVICE_NOT_FOUND' | 'VARIABLE_NOT_FOUND',
    message: string,
  ) {
    super(message)
  }
}

export function createVariableCatalogService(prisma: PrismaClient) {
  const repository = createVariableCatalogRepository(prisma)

  return {
    async listByService(serviceSlug: string) {
      const service = await repository.findServiceBySlug(serviceSlug)
      if (!service) throw new VariableCatalogError('SERVICE_NOT_FOUND', 'Servicio no encontrado')

      const definitions = await repository.findDefinitionsByService(service.id)

      const byCategory = new Map<string, typeof definitions>()
      for (const def of definitions) {
        const list = byCategory.get(def.categoria) ?? []
        list.push(def)
        byCategory.set(def.categoria, list)
      }

      return [...byCategory.entries()].map(([categoria, variables]) => ({
        categoria,
        variables: variables.map((v) => ({
          id: v.id,
          codigo: v.codigo,
          nombre: v.nombre,
          unidadMedida: v.unidadMedida,
          tipo: v.tipo,
          instrumento: v.instrumento,
          incertidumbre: v.incertidumbre,
        })),
      }))
    },

    async update(
      variableId: string,
      input: UpdateVariableDefinitionInput,
      updatedByUserId: string,
      ipAddress: string,
    ) {
      const existing = await repository.findDefinitionById(variableId)
      if (!existing) throw new VariableCatalogError('VARIABLE_NOT_FOUND', 'Variable no encontrada')

      const updated = await repository.update(variableId, input)

      await repository.createAuditLog({
        userId: updatedByUserId,
        action: 'VARIABLE_DEFINITION_UPDATED',
        metadata: { variableId, codigo: existing.codigo, changes: input },
        ipAddress,
      })

      return updated
    },
  }
}

export type VariableCatalogService = ReturnType<typeof createVariableCatalogService>
```

- [ ] **Step 4: Controller**

```typescript
import type { FastifyReply, FastifyRequest } from 'fastify'
import { updateVariableDefinitionSchema, formatFieldErrors } from './variableCatalog.schema.js'
import { createVariableCatalogService, VariableCatalogError } from './variableCatalog.service.js'

function statusForError(code: VariableCatalogError['code']): number {
  return code === 'SERVICE_NOT_FOUND' || code === 'VARIABLE_NOT_FOUND' ? 404 : 409
}

export async function listVariableCatalogHandler(request: FastifyRequest, reply: FastifyReply) {
  const { serviceSlug } = request.params as { serviceSlug: string }
  const service = createVariableCatalogService(request.server.prisma)
  try {
    const categories = await service.listByService(serviceSlug)
    return reply.code(200).send({ categories })
  } catch (err) {
    if (err instanceof VariableCatalogError) return reply.code(statusForError(err.code)).send({ message: err.message })
    throw err
  }
}

export async function updateVariableCatalogHandler(request: FastifyRequest, reply: FastifyReply) {
  const parsed = updateVariableDefinitionSchema.safeParse(request.body)
  if (!parsed.success) return reply.code(422).send({ errors: formatFieldErrors(parsed.error) })

  const { variableId } = request.params as { variableId: string }
  const service = createVariableCatalogService(request.server.prisma)
  try {
    const variable = await service.update(variableId, parsed.data, request.user.sub, request.ip)
    return reply.code(200).send({ variable })
  } catch (err) {
    if (err instanceof VariableCatalogError) return reply.code(statusForError(err.code)).send({ message: err.message })
    throw err
  }
}
```

- [ ] **Step 5: Routes**

```typescript
import type { FastifyInstance } from 'fastify'
import { requireAuth, requirePermission } from '../../plugins/auth-guard.js'
import { listVariableCatalogHandler, updateVariableCatalogHandler } from './variableCatalog.controller.js'

const PERMISSION = 'platform.variables.manage'

export async function variableCatalogRoutes(app: FastifyInstance) {
  app.get<{ Params: { serviceSlug: string } }>(
    '/api/admin/services/:serviceSlug/variables',
    { preHandler: [requireAuth, requirePermission(PERMISSION)] },
    listVariableCatalogHandler,
  )

  app.patch<{ Params: { serviceSlug: string; variableId: string } }>(
    '/api/admin/services/:serviceSlug/variables/:variableId',
    { preHandler: [requireAuth, requirePermission(PERMISSION)] },
    updateVariableCatalogHandler,
  )
}
```

- [ ] **Step 6: Registrar el módulo en `app.ts`**

Agregar el import junto a los demás:

```typescript
import { variableCatalogRoutes } from './modules/variableCatalog/variableCatalog.routes.js'
```

Y el registro junto a los demás `app.register(...)`:

```typescript
  await app.register(variableCatalogRoutes)
```

- [ ] **Step 7: Verificar**

```bash
cd backend && npm run typecheck
```

Expected: sin errores.

---

## Task 3: Frontend — tipos + servicio API

**Files:**
- Create: `frontend/src/types/variableCatalog.ts`
- Create: `frontend/src/services/variableCatalog.service.ts`

**Interfaces:**
- Produces: `VariableCatalogItem`, `VariableCatalogCategory`, `listVariableCatalog(serviceSlug)`, `updateVariableCatalogItem(serviceSlug, variableId, values)`.

- [ ] **Step 1: Tipos**

```typescript
export type MeasurementType = 'MEDICION' | 'CALCULO' | 'INSPECCION'

export interface VariableCatalogItem {
  id: string
  codigo: string
  nombre: string
  unidadMedida: string
  tipo: MeasurementType | null
  instrumento: string | null
  incertidumbre: string | null
}

export interface VariableCatalogCategory {
  categoria: string
  variables: VariableCatalogItem[]
}

export interface UpdateVariableCatalogValues {
  tipo?: MeasurementType
  instrumento?: string
  incertidumbre?: string
}
```

- [ ] **Step 2: Servicio API**

```typescript
import { isAxiosError } from 'axios'
import { apiClient } from './api'
import type { VariableCatalogCategory, UpdateVariableCatalogValues } from '@/types/variableCatalog'

export class VariableCatalogValidationError extends Error {
  fieldErrors: Record<string, string>

  constructor(fieldErrors: Record<string, string>) {
    super('Variable catalog validation failed')
    this.name = 'VariableCatalogValidationError'
    this.fieldErrors = fieldErrors
  }
}

export class VariableCatalogRequestError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'VariableCatalogRequestError'
    this.status = status
  }
}

function rethrow(err: unknown): never {
  if (isAxiosError(err) && err.response) {
    const { status, data } = err.response as { status: number; data: { message?: string; errors?: Record<string, string> } }
    if (status === 422 && data.errors) throw new VariableCatalogValidationError(data.errors)
    throw new VariableCatalogRequestError(status, data.message ?? 'Ocurrió un error')
  }
  throw err
}

export async function listVariableCatalog(serviceSlug: string): Promise<VariableCatalogCategory[]> {
  try {
    const { data } = await apiClient.get(`/admin/services/${serviceSlug}/variables`)
    return data.categories
  } catch (err) {
    rethrow(err)
  }
}

export async function updateVariableCatalogItem(
  serviceSlug: string,
  variableId: string,
  values: UpdateVariableCatalogValues,
): Promise<void> {
  try {
    await apiClient.patch(`/admin/services/${serviceSlug}/variables/${variableId}`, values)
  } catch (err) {
    rethrow(err)
  }
}
```

- [ ] **Step 3: Verificar**

```bash
cd frontend && npx vue-tsc -b
```

Expected: sin errores (ambos archivos son nuevos, sin consumidor todavía).

---

## Task 4: Frontend — `VariableCatalogView.vue`

**Files:**
- Create: `frontend/src/modules/services/views/VariableCatalogView.vue`

**Interfaces:**
- Consumes: `listVariableCatalog`, `updateVariableCatalogItem`, `VariableCatalogCategory`, `MeasurementType` (Task 3).

- [ ] **Step 1: Escribir la vista**

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useHead } from '@unhead/vue'
import { useI18n } from 'vue-i18n'
import {
  listVariableCatalog,
  updateVariableCatalogItem,
  VariableCatalogRequestError,
} from '@/services/variableCatalog.service'
import type { VariableCatalogCategory, MeasurementType } from '@/types/variableCatalog'

const { t } = useI18n()
const route = useRoute()
const serviceSlug = route.params.serviceSlug as string

useHead(() => ({ title: t('variableCatalog.pageTitle'), meta: [{ name: 'robots', content: 'noindex' }] }))

const status = ref<'loading' | 'ready' | 'error'>('loading')
const errorMessage = ref('')
const categories = ref<VariableCatalogCategory[]>([])
const savingId = ref<string | null>(null)
const drafts = ref<Record<string, { tipo: MeasurementType | ''; instrumento: string; incertidumbre: string }>>({})

async function load() {
  status.value = 'loading'
  try {
    categories.value = await listVariableCatalog(serviceSlug)
    for (const cat of categories.value) {
      for (const v of cat.variables) {
        drafts.value[v.id] = {
          tipo: v.tipo ?? '',
          instrumento: v.instrumento ?? '',
          incertidumbre: v.incertidumbre ?? '',
        }
      }
    }
    status.value = 'ready'
  } catch (err) {
    status.value = 'error'
    errorMessage.value = err instanceof VariableCatalogRequestError ? err.message : t('variableCatalog.loadError')
  }
}

onMounted(load)

async function handleSave(variableId: string) {
  const draft = drafts.value[variableId]
  if (!draft) return
  savingId.value = variableId
  errorMessage.value = ''
  try {
    await updateVariableCatalogItem(serviceSlug, variableId, {
      tipo: draft.tipo || undefined,
      instrumento: draft.instrumento.trim() || undefined,
      incertidumbre: draft.incertidumbre.trim() || undefined,
    })
    await load()
  } catch (err) {
    errorMessage.value = err instanceof VariableCatalogRequestError ? err.message : t('variableCatalog.actionError')
  } finally {
    savingId.value = null
  }
}
</script>

<template>
  <div class="mx-auto max-w-5xl">
    <h1 class="text-xl font-bold text-navy-900">{{ t('variableCatalog.pageTitle') }}</h1>
    <p class="mt-1 text-sm text-navy-700/70">{{ t('variableCatalog.pageSubtitle') }}</p>

    <p v-if="status === 'loading'" class="mt-6 text-sm text-navy-700">{{ t('variableCatalog.loading') }}</p>
    <p v-else-if="status === 'error'" class="mt-6 rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {{ errorMessage }}
    </p>

    <template v-else>
      <p v-if="errorMessage" class="mt-4 rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {{ errorMessage }}
      </p>

      <div v-for="cat in categories" :key="cat.categoria" class="mt-6 overflow-hidden rounded-lg border border-line-strong bg-white">
        <p class="border-b border-line-strong bg-sky-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-navy-700">
          {{ cat.categoria }}
        </p>
        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-sm">
            <thead>
              <tr class="border-b border-line text-left text-[11px] uppercase tracking-wide text-navy-700 opacity-70">
                <th class="px-4 py-2 font-semibold">{{ t('variableCatalog.table.codigo') }}</th>
                <th class="px-4 py-2 font-semibold">{{ t('variableCatalog.table.nombre') }}</th>
                <th class="px-4 py-2 font-semibold">{{ t('variableCatalog.table.tipo') }}</th>
                <th class="px-4 py-2 font-semibold">{{ t('variableCatalog.table.instrumento') }}</th>
                <th class="px-4 py-2 font-semibold">{{ t('variableCatalog.table.incertidumbre') }}</th>
                <th class="px-4 py-2 font-semibold">{{ t('variableCatalog.table.acciones') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="v in cat.variables" :key="v.id" class="border-t border-line">
                <td class="px-4 py-3 font-mono text-xs text-navy-700/60">{{ v.codigo }}</td>
                <td class="px-4 py-3 text-navy-900">{{ v.nombre }}</td>
                <td class="px-4 py-3">
                  <select
                    v-model="drafts[v.id].tipo"
                    class="w-full rounded-sm border border-line-strong bg-white px-2 py-1.5 text-sm text-navy-900"
                  >
                    <option value="">{{ t('variableCatalog.pending') }}</option>
                    <option value="MEDICION">{{ t('variableCatalog.tipo.MEDICION') }}</option>
                    <option value="CALCULO">{{ t('variableCatalog.tipo.CALCULO') }}</option>
                    <option value="INSPECCION">{{ t('variableCatalog.tipo.INSPECCION') }}</option>
                  </select>
                </td>
                <td class="px-4 py-3">
                  <input
                    v-model="drafts[v.id].instrumento"
                    type="text"
                    :placeholder="t('variableCatalog.pending')"
                    class="w-full rounded-sm border border-line-strong bg-white px-2 py-1.5 text-sm text-navy-900 placeholder:text-navy-700/40"
                  />
                </td>
                <td class="px-4 py-3">
                  <input
                    v-model="drafts[v.id].incertidumbre"
                    type="text"
                    :placeholder="t('variableCatalog.pending')"
                    class="w-full rounded-sm border border-line-strong bg-white px-2 py-1.5 text-sm text-navy-900 placeholder:text-navy-700/40"
                  />
                </td>
                <td class="px-4 py-3">
                  <button
                    type="button"
                    class="rounded-sm border border-line-strong px-3 py-1.5 text-xs font-semibold text-navy-700 hover:border-navy-900 disabled:opacity-50"
                    :disabled="savingId === v.id"
                    @click="handleSave(v.id)"
                  >
                    {{ t('variableCatalog.save') }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>
```

- [ ] **Step 2: Verificar**

```bash
cd frontend && npx vue-tsc -b
```

Expected: sin errores (esta vista no tiene ruta todavía — se agrega en Task 5 — así que no hay consumidor aún, pero el archivo debe compilar solo).

---

## Task 5: Frontend — enlace en Servicios + ruta nueva

**Files:**
- Modify: `frontend/src/modules/services/views/ServicesListView.vue`
- Modify: `frontend/src/router/index.ts`

**Interfaces:**
- Consumes: `VariableCatalogView.vue` (Task 4).

- [ ] **Step 1: Agregar la ruta**

En `frontend/src/router/index.ts`, dentro de los `children` de la ruta `/:locale(es|en)/dashboard/admin` (busca la entrada `name: 'admin-servicios'`), agregar justo después:

```typescript
        {
          path: 'servicios',
          name: 'admin-servicios',
          component: () => import('@/modules/services/views/ServicesListView.vue'),
          meta: { permission: 'platform.services.manage' },
        },
        {
          path: 'servicios/:serviceSlug/variables',
          name: 'admin-variable-catalog',
          component: () => import('@/modules/services/views/VariableCatalogView.vue'),
          meta: { permission: 'platform.variables.manage' },
        },
```

- [ ] **Step 2: Agregar el enlace en `ServicesListView.vue`**

En la columna de acciones de la tabla (busca el `<div class="flex gap-2">` dentro de `td` de acciones, que ya tiene el botón "Editar"), agregar un enlace condicional solo para el servicio `higiene-industrial`:

```vue
                  <div class="flex gap-2">
                    <router-link
                      v-if="service.slug === 'higiene-industrial'"
                      :to="{ name: 'admin-variable-catalog', params: { serviceSlug: service.slug } }"
                      class="rounded-sm border border-line-strong px-3 py-1.5 text-xs font-semibold text-navy-700 hover:border-navy-900"
                    >
                      {{ t('dashboard.servicesManagement.viewCatalog') }}
                    </router-link>
                    <button
                      type="button"
                      class="rounded-sm border border-line-strong px-3 py-1.5 text-xs font-semibold text-navy-700 hover:border-navy-900"
                      @click="openEditModal(service)"
                    >
                      {{ t('dashboard.servicesManagement.edit') }}
                    </button>
```

(El resto de la fila de acciones — el botón activar/desactivar — queda exactamente como está, solo se agrega el `router-link` antes del botón "Editar".)

- [ ] **Step 3: Verificar**

```bash
cd frontend && npx vue-tsc -b
```

Expected: sin errores.

---

## Task 6: i18n (es/en) + paridad

**Files:**
- Modify: `frontend/src/i18n/locales/es.json`
- Modify: `frontend/src/i18n/locales/en.json`

- [ ] **Step 1: Agregar `dashboard.servicesManagement.viewCatalog` (es.json)**

En el bloque `dashboard.servicesManagement` (busca `"edit":`), agregar junto a las claves existentes:

```json
      "viewCatalog": "Ver catálogo",
```

- [ ] **Step 2: Agregar el mismo key en en.json**

```json
      "viewCatalog": "View catalog",
```

- [ ] **Step 3: Agregar el nuevo bloque `variableCatalog` (es.json)**

Como nueva clave de nivel superior:

```json
  "variableCatalog": {
    "pageTitle": "Catálogo de variables",
    "pageSubtitle": "Completa el tipo de medición, instrumento e incertidumbre de cada variable — quedan pendientes hasta que se confirmen.",
    "loading": "Cargando catálogo...",
    "loadError": "Error al cargar el catálogo.",
    "actionError": "No se pudo guardar el cambio.",
    "pending": "Pendiente",
    "save": "Guardar",
    "tipo": {
      "MEDICION": "Medición",
      "CALCULO": "Cálculo",
      "INSPECCION": "Inspección"
    },
    "table": {
      "codigo": "Código",
      "nombre": "Nombre",
      "tipo": "Tipo",
      "instrumento": "Instrumento",
      "incertidumbre": "Incertidumbre",
      "acciones": "Acciones"
    }
  },
```

- [ ] **Step 4: Mismo bloque en en.json**

```json
  "variableCatalog": {
    "pageTitle": "Variable catalog",
    "pageSubtitle": "Complete each variable's measurement type, instrument, and uncertainty — they stay pending until confirmed.",
    "loading": "Loading catalog...",
    "loadError": "Failed to load the catalog.",
    "actionError": "Could not save the change.",
    "pending": "Pending",
    "save": "Save",
    "tipo": {
      "MEDICION": "Measurement",
      "CALCULO": "Calculation",
      "INSPECCION": "Inspection"
    },
    "table": {
      "codigo": "Code",
      "nombre": "Name",
      "tipo": "Type",
      "instrumento": "Instrument",
      "incertidumbre": "Uncertainty",
      "acciones": "Actions"
    }
  },
```

- [ ] **Step 5: Verificar paridad**

```bash
cd /home/laortiz937/Documentos/sst-platform
python3 -c "
import json
def keys(d, prefix=''):
    out = set()
    for k, v in d.items():
        p = f'{prefix}.{k}' if prefix else k
        if isinstance(v, dict):
            out |= keys(v, p)
        else:
            out.add(p)
    return out
es = json.load(open('frontend/src/i18n/locales/es.json'))
en = json.load(open('frontend/src/i18n/locales/en.json'))
ke, kn = keys(es), keys(en)
print('only in es:', ke - kn)
print('only in en:', kn - ke)
print('OK' if ke == kn else 'MISMATCH')
"
```

Expected: `OK`.

---

## Task 7: Checkpoint — typecheck + verificación en navegador

**Files:** ninguno (solo verificación).

- [ ] **Step 1: Typecheck completo**

```bash
cd backend && npm run typecheck
cd ../frontend && npx vue-tsc -b
```

Expected: cero errores en ambos.

- [ ] **Step 2: Confirmar en base de datos que el dashboard existente sigue funcionando**

Con datos ya cargados (ej. Organizacion 1), confirmar en el navegador (login como `1000000003`/`Organizacion123**`) que el Dashboard de Higiene Industrial sigue mostrando Iluminación/Sonido/Estrés Térmico con los valores ya cargados — las lecturas históricas no se movieron, solo cambió el nombre de la categoría a la que apuntan.

- [ ] **Step 3: Admin completa el catálogo**

Login como super-admin (`1000000001`), ir a Servicios, click en "Ver catálogo" en la fila de Higiene Industrial. Confirmar que aparecen 5 categorías con 20 variables en total, todas con "Pendiente" en Tipo/Instrumento/Incertidumbre. Completar una variable de prueba (ej. Índice UV: Tipo=Medición, Instrumento="Radiómetro UV-AB Kipp & Zonen", Incertidumbre="± 0.1"), guardar, recargar la página y confirmar que persistió.

- [ ] **Step 4: Confirmar aislamiento de permisos**

Confirmar que un usuario cliente (rol `cliente`, sin `platform.variables.manage`) no puede acceder a `/dashboard/admin/servicios/higiene-industrial/variables` (debe redirigir, per el guard de permisos ya existente en el router).
