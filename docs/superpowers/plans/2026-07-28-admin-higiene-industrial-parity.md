# Panel operativo admin (Higiene Industrial): encabezado + corrección de lecturas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar un encabezado de contexto operativo al panel admin de Higiene Industrial, y una capacidad nueva para que el admin corrija el valor de una lectura puntual ya procesada (con motivo obligatorio, semáforo recalculado, y registro de auditoría), sin tocar la vista cliente.

**Architecture:** `DashboardShell.vue` ya es compartido entre `ClientDashboardView.vue` y `HigieneIndustrialPanel.vue` (admin). Se le agregan dos props opcionales retrocompatibles (`editableReadings`, `correctReading`) que solo el admin pasa — el cliente nunca los pasa, así que su comportamiento no cambia en absoluto. La corrección viaja hasta `CategoryTab.vue` (la tabla pivotada por punto de trabajo × variable, que ya existe), donde cada celda gana un ícono de edición condicional.

**Tech Stack:** Vue 3 + `<script setup>` + TypeScript, Tailwind, Pinia, vue-i18n, VeeValidate + Zod (frontend); Fastify + Prisma + Zod (backend, MySQL).

## Global Constraints

- Spec de referencia: `docs/superpowers/specs/2026-07-28-admin-higiene-industrial-parity-design.md`.
- **Sin commits durante la ejecución de este plan.** Ningún paso de este plan incluye `git commit` — es una regla explícita de esta sesión/proyecto. Acumular todos los cambios sin commitear; el commit final se hace en un solo paso, y solo cuando el usuario lo confirme explícitamente después de la verificación en navegador (Task 7).
- No inventar normas ni variables nuevas — el catálogo real son 3 categorías (Iluminación/Ruido/Confort Térmico), no se tocan.
- La vista cliente (`ClientDashboardView.vue`) no se modifica en ningún paso.
- `correctionReason` es nullable en el esquema, pero el service exige mínimo 10 caracteres antes de aplicar el cambio (validación de negocio, no de esquema).
- Permiso nuevo y separado `platform.variables.correct` (no reusar `platform.variables.upload`).
- Migraciones vía el flujo no interactivo ya establecido en este proyecto: `npx prisma migrate diff --from-schema-datasource=prisma/schema.prisma --to-schema-datamodel=prisma/schema.prisma --script > prisma/migrations/<timestamp>_<nombre>/migration.sql`, revisar el SQL generado, `npx prisma db execute --file <path> --schema prisma/schema.prisma`, `npx prisma migrate resolve --applied <nombre>`, `npx prisma generate`. `prisma migrate dev` no funciona en este entorno (sin TTY).
- Este proyecto no tiene suite de tests automatizados para este módulo — la verificación establecida toda la sesión es: `npm run typecheck` (backend y frontend) + verificación manual en navegador (Claude Preview tools). Seguir ese mismo patrón, no introducir un framework de test nuevo.

---

## Task 1: Migración Prisma — campos de corrección en VariableReading

**Files:**
- Modify: `backend/prisma/schema.prisma` (modelo `VariableReading`, modelo `User`, enum `AuditAction`)
- Create: `backend/prisma/migrations/<timestamp>_variable_reading_correction/migration.sql`

**Interfaces:**
- Produces: campos `VariableReading.isCorrected: Boolean`, `VariableReading.correctedAt: DateTime?`, `VariableReading.correctedById: String?`, `VariableReading.correctionReason: String?`; relación `VariableReading.correctedBy: User?`; `User.correctedReadings: VariableReading[]`; valor de enum `AuditAction.VARIABLE_READING_CORRECTED`. Todas las tareas siguientes dependen de que estos nombres existan exactamente así.

- [ ] **Step 1: Editar el modelo `VariableReading` en `backend/prisma/schema.prisma`**

Ubicar el modelo actual (busca `model VariableReading {`):

```prisma
model VariableReading {
  id           String          @id @default(cuid())
  uploadId     String          @map("upload_id")
  workPointId  String          @map("work_point_id")
  definitionId String          @map("definition_id")
  valor        Float
  semaforo     SemaphoreStatus
  createdAt    DateTime        @default(now()) @map("created_at")

  upload     VariableUpload     @relation(fields: [uploadId], references: [id], onDelete: Cascade)
  workPoint  WorkPoint          @relation(fields: [workPointId], references: [id], onDelete: Cascade)
  definition VariableDefinition @relation(fields: [definitionId], references: [id], onDelete: Restrict)

  @@unique([uploadId, workPointId, definitionId])
  @@index([workPointId])
  @@index([definitionId])
  @@map("variable_readings")
}
```

Reemplazar por (agrega 4 campos + 1 relación, nada más cambia):

```prisma
/// Corrección manual de una lectura ya procesada (Fase de paridad admin):
/// el admin puede corregir un valor puntual antes/después de que el
/// cliente lo vea (no hay estado de borrador/publicado — ver spec). El
/// valor anterior queda en AuditLog.metadata, no se duplica acá.
model VariableReading {
  id               String          @id @default(cuid())
  uploadId         String          @map("upload_id")
  workPointId      String          @map("work_point_id")
  definitionId     String          @map("definition_id")
  valor            Float
  semaforo         SemaphoreStatus
  isCorrected      Boolean         @default(false) @map("is_corrected")
  correctedAt      DateTime?       @map("corrected_at")
  correctedById    String?         @map("corrected_by_id")
  correctionReason String?         @map("correction_reason") @db.Text
  createdAt        DateTime        @default(now()) @map("created_at")

  upload      VariableUpload     @relation(fields: [uploadId], references: [id], onDelete: Cascade)
  workPoint   WorkPoint          @relation(fields: [workPointId], references: [id], onDelete: Cascade)
  definition  VariableDefinition @relation(fields: [definitionId], references: [id], onDelete: Restrict)
  correctedBy User?              @relation("VariableReadingCorrectedBy", fields: [correctedById], references: [id], onDelete: SetNull)

  @@unique([uploadId, workPointId, definitionId])
  @@index([workPointId])
  @@index([definitionId])
  @@map("variable_readings")
}
```

- [ ] **Step 2: Agregar la relación inversa en el modelo `User`**

En `backend/prisma/schema.prisma`, ubicar dentro de `model User { ... }` la línea:

```prisma
  auditLogs             AuditLog[]
```

Agregar justo debajo (misma sección de relaciones inversas):

```prisma
  auditLogs             AuditLog[]
  correctedReadings      VariableReading[]      @relation("VariableReadingCorrectedBy")
```

- [ ] **Step 3: Agregar el valor de enum en `AuditAction`**

Ubicar el enum (busca `enum AuditAction {`), que termina así:

```prisma
  PROFILE_UPDATED
  VARIABLES_UPLOADED
  ORGANIZATION_UPDATED
  SERVICE_CREATED
  SERVICE_UPDATED
}
```

Reemplazar por:

```prisma
  PROFILE_UPDATED
  VARIABLES_UPLOADED
  ORGANIZATION_UPDATED
  SERVICE_CREATED
  SERVICE_UPDATED
  VARIABLE_READING_CORRECTED
}
```

- [ ] **Step 4: Generar el SQL de la migración**

Run:
```bash
cd backend
mkdir -p "prisma/migrations/$(date +%Y%m%d%H%M%S)_variable_reading_correction"
```

Anota el nombre exacto de carpeta creado (con el timestamp real), lo necesitas en los próximos comandos. Luego:

```bash
npx prisma migrate diff --from-schema-datasource=prisma/schema.prisma --to-schema-datamodel=prisma/schema.prisma --script > "prisma/migrations/<carpeta_creada>/migration.sql"
cat "prisma/migrations/<carpeta_creada>/migration.sql"
```

Expected: el SQL generado son solo `ALTER TABLE variable_readings ADD COLUMN ...` (4 columnas nuevas, todas nullable o con default) y `ALTER TABLE audit_logs MODIFY action ENUM(...)` agregando `VARIABLE_READING_CORRECTED` a la lista. Si aparece cualquier `DROP` o `ALTER` sobre columnas existentes, deténte y revisa el schema antes de continuar — no debería haber ninguno en un cambio puramente aditivo.

- [ ] **Step 5: Aplicar la migración**

```bash
npx prisma db execute --file "prisma/migrations/<carpeta_creada>/migration.sql" --schema prisma/schema.prisma
npx prisma migrate resolve --applied "<carpeta_creada>"
npx prisma generate
```

Expected: los 3 comandos terminan sin error. El último debe imprimir algo como `Generated Prisma Client`.

- [ ] **Step 6: Verificar que el cliente de Prisma expone los campos nuevos**

```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | tail -20
```

Expected: sin errores (todavía no hay código que use los campos nuevos, así que esto solo confirma que `prisma generate` corrió bien y el resto del proyecto sigue compilando).

---

## Task 2: Backend — endpoint de corrección de lectura

**Files:**
- Modify: `backend/src/modules/variables/variables.repository.ts`
- Modify: `backend/src/modules/variables/variables.schema.ts`
- Modify: `backend/src/modules/variables/variables.service.ts`
- Modify: `backend/src/modules/variables/variables.controller.ts`
- Modify: `backend/src/modules/variables/variables.routes.ts`
- Modify: `backend/prisma/seed.ts`

**Interfaces:**
- Consumes: `calculateSemaphore(valor, thresholds)` de `backend/src/utils/semaphore.ts` (ya existe, sin cambios); campos de Task 1.
- Produces: `PATCH /api/admin/organizations/:organizationId/services/:serviceSlug/readings/:readingId`, permiso `platform.variables.correct`. Body: `{ valor: number, reason: string }`. Respuestas: `200 { reading: {...} }`, `404` (lectura o servicio no encontrado / no pertenece a esa organización), `422` (motivo corto o valor inválido).

- [ ] **Step 1: Agregar el permiso al catálogo del seed**

En `backend/prisma/seed.ts`, ubicar (dentro del array `PERMISSIONS`):

```typescript
  {
    key: 'platform.variables.upload',
    description: 'Cargar el archivo de variables de CUALQUIER organización. Solo super-admin/adminsystem.',
  },
```

Agregar justo después:

```typescript
  {
    key: 'platform.variables.upload',
    description: 'Cargar el archivo de variables de CUALQUIER organización. Solo super-admin/adminsystem.',
  },
  {
    key: 'platform.variables.correct',
    description: 'Corregir el valor de una lectura ya procesada de CUALQUIER organización. Solo super-admin/adminsystem.',
  },
```

- [ ] **Step 2: Agregar métodos al repositorio**

En `backend/src/modules/variables/variables.repository.ts`, ubicar el método `findReadingsByUpload` (dentro de `createVariablesRepository`):

```typescript
    findReadingsByUpload(uploadId: string) {
      return prisma.variableReading.findMany({
        where: { uploadId },
        include: { definition: true, workPoint: true },
      })
    },
```

Agregar justo después (mismo objeto retornado por `createVariablesRepository`):

```typescript
    findReadingsByUpload(uploadId: string) {
      return prisma.variableReading.findMany({
        where: { uploadId },
        include: { definition: true, workPoint: true },
      })
    },

    /** Trae la lectura con su definición (para recalcular el semáforo) y el
     * organizationId real de su carga (para la verificación anti-IDOR en el
     * servicio — nunca confiar en el organizationId de la ruta sin cruzarlo). */
    findReadingById(readingId: string) {
      return prisma.variableReading.findUnique({
        where: { id: readingId },
        include: {
          definition: true,
          upload: { select: { organizationId: true } },
        },
      })
    },

    correctReading(
      readingId: string,
      data: {
        valor: number
        semaforo: 'VERDE' | 'AMARILLO' | 'ROJO'
        correctedById: string
        correctionReason: string
      },
    ) {
      return prisma.variableReading.update({
        where: { id: readingId },
        data: {
          valor: data.valor,
          semaforo: data.semaforo,
          isCorrected: true,
          correctedAt: new Date(),
          correctedById: data.correctedById,
          correctionReason: data.correctionReason,
        },
      })
    },
```

Ubicar también, en el mismo archivo, el método `createAuditLog`:

```typescript
    createAuditLog(input: {
      userId: string
      organizationId: string
      action: 'VARIABLES_UPLOADED'
      metadata: Prisma.InputJsonObject
      ipAddress?: string
    }) {
      return prisma.auditLog.create({
        data: {
          userId: input.userId,
          organizationId: input.organizationId,
          action: input.action,
          metadata: input.metadata,
          ipAddress: input.ipAddress,
        },
      })
    },
```

Reemplazar la línea `action: 'VARIABLES_UPLOADED'` por (amplía la unión literal para aceptar también el valor nuevo, sin tocar nada más del método):

```typescript
    createAuditLog(input: {
      userId: string
      organizationId: string
      action: 'VARIABLES_UPLOADED' | 'VARIABLE_READING_CORRECTED'
      metadata: Prisma.InputJsonObject
      ipAddress?: string
    }) {
      return prisma.auditLog.create({
        data: {
          userId: input.userId,
          organizationId: input.organizationId,
          action: input.action,
          metadata: input.metadata,
          ipAddress: input.ipAddress,
        },
      })
    },
```

- [ ] **Step 3: Agregar el schema de validación**

En `backend/src/modules/variables/variables.schema.ts`, agregar al final del archivo (antes de `formatFieldErrors`, después del último `export const ...Schema`):

```typescript
export const correctReadingParamsSchema = z.object({
  organizationId: z.string().min(1),
  serviceSlug: z.string().min(1),
  readingId: z.string().min(1),
})

export const correctReadingBodySchema = z.object({
  valor: z.number({ invalid_type_error: 'El valor debe ser un número' }),
  reason: z
    .string()
    .trim()
    .min(10, 'El motivo de la corrección debe tener al menos 10 caracteres'),
})
```

- [ ] **Step 4: Agregar el método al servicio**

En `backend/src/modules/variables/variables.service.ts`, agregar `'READING_NOT_FOUND'` a la unión de códigos de `VariablesError`. Ubicar:

```typescript
export class VariablesError extends Error {
  constructor(
    public code:
      | 'SERVICE_NOT_FOUND'
      | 'ORG_NOT_FOUND'
      | 'SERVICE_NOT_CONTRACTED'
      | 'INVALID_FILE'
      | 'UNKNOWN_VARIABLES'
      | 'UPLOAD_NOT_FOUND',
    message: string,
  ) {
    super(message)
  }
}
```

Reemplazar por:

```typescript
export class VariablesError extends Error {
  constructor(
    public code:
      | 'SERVICE_NOT_FOUND'
      | 'ORG_NOT_FOUND'
      | 'SERVICE_NOT_CONTRACTED'
      | 'INVALID_FILE'
      | 'UNKNOWN_VARIABLES'
      | 'UPLOAD_NOT_FOUND'
      | 'READING_NOT_FOUND',
    message: string,
  ) {
    super(message)
  }
}
```

Luego, dentro de `export function createVariablesService(prisma: PrismaClient) { ... return { ... } }`, ubicar el método `getUploadDetail` (el último del objeto retornado) y agregar un método nuevo justo después, dentro del mismo `return { ... }`:

```typescript
    /** Corrige el valor de una lectura ya procesada. Recalcula el semáforo
     * con el mismo util que usa la carga original — nunca se recibe el
     * semáforo del frontend. organizationId viene siempre de la ruta
     * (validado por el permiso), nunca del cliente: se cruza contra el
     * organizationId real de la carga para evitar que un admin corrija una
     * lectura de una organización distinta a la que tiene abierta. */
    async correctReading(input: {
      readingId: string
      organizationId: string
      valor: number
      reason: string
      correctedByUserId: string
    }) {
      const reading = await repository.findReadingById(input.readingId)
      if (!reading || reading.upload.organizationId !== input.organizationId) {
        throw new VariablesError('READING_NOT_FOUND', 'Lectura no encontrada')
      }

      const semaforo = calculateSemaphore(input.valor, {
        comparisonType: reading.definition.comparisonType,
        limiteMin: reading.definition.limiteMin,
        limiteMax: reading.definition.limiteMax,
        toleranciaAlerta: reading.definition.toleranciaAlerta,
      })

      const updated = await repository.correctReading(input.readingId, {
        valor: input.valor,
        semaforo,
        correctedById: input.correctedByUserId,
        correctionReason: input.reason,
      })

      await repository.createAuditLog({
        userId: input.correctedByUserId,
        organizationId: input.organizationId,
        action: 'VARIABLE_READING_CORRECTED',
        metadata: {
          readingId: input.readingId,
          definitionId: reading.definitionId,
          workPointId: reading.workPointId,
          oldValue: reading.valor,
          newValue: input.valor,
          reason: input.reason,
        },
      })

      return updated
    },
```

`createAuditLog` ya acepta `'VARIABLE_READING_CORRECTED'` — se amplió su firma en el Step 2 de este mismo task.

- [ ] **Step 5: Agregar el handler y mapear el código de error nuevo**

En `backend/src/modules/variables/variables.controller.ts`, ubicar `sendVariablesError`:

```typescript
function sendVariablesError(reply: FastifyReply, err: unknown) {
  if (err instanceof VariablesError) {
    const statusByCode = {
      SERVICE_NOT_FOUND: 404,
      ORG_NOT_FOUND: 404,
      SERVICE_NOT_CONTRACTED: 403,
      INVALID_FILE: 422,
      UNKNOWN_VARIABLES: 422,
      UPLOAD_NOT_FOUND: 404,
    } as const
    return reply.code(statusByCode[err.code]).send({ message: err.message })
  }
  throw err
}
```

Reemplazar por (agrega `READING_NOT_FOUND: 404`):

```typescript
function sendVariablesError(reply: FastifyReply, err: unknown) {
  if (err instanceof VariablesError) {
    const statusByCode = {
      SERVICE_NOT_FOUND: 404,
      ORG_NOT_FOUND: 404,
      SERVICE_NOT_CONTRACTED: 403,
      INVALID_FILE: 422,
      UNKNOWN_VARIABLES: 422,
      UPLOAD_NOT_FOUND: 404,
      READING_NOT_FOUND: 404,
    } as const
    return reply.code(statusByCode[err.code]).send({ message: err.message })
  }
  throw err
}
```

Actualizar el import al inicio del archivo (agregar los dos schemas nuevos):

```typescript
import {
  uploadVariablesParamsSchema,
  dashboardParamsSchema,
  adminDashboardParamsSchema,
  uploadDetailParamsSchema,
  adminUploadDetailParamsSchema,
  correctReadingParamsSchema,
  correctReadingBodySchema,
  formatFieldErrors,
} from './variables.schema.js'
```

Agregar el handler al final del archivo:

```typescript
/** PATCH — exclusivo super-admin/adminsystem (permiso platform.variables.correct,
 * distinto de platform.variables.upload). organizationId viene de la ruta
 * (nunca confiado del body), y el servicio lo cruza contra la carga real. */
export async function correctReadingHandler(
  request: FastifyRequest<{
    Params: { organizationId: string; serviceSlug: string; readingId: string }
    Body: { valor: number; reason: string }
  }>,
  reply: FastifyReply,
) {
  const paramsParsed = correctReadingParamsSchema.safeParse(request.params)
  if (!paramsParsed.success) return reply.code(422).send({ errors: formatFieldErrors(paramsParsed.error) })

  const bodyParsed = correctReadingBodySchema.safeParse(request.body)
  if (!bodyParsed.success) return reply.code(422).send({ errors: formatFieldErrors(bodyParsed.error) })

  const service = createVariablesService(request.server.prisma)
  try {
    const reading = await service.correctReading({
      readingId: paramsParsed.data.readingId,
      organizationId: paramsParsed.data.organizationId,
      valor: bodyParsed.data.valor,
      reason: bodyParsed.data.reason,
      correctedByUserId: request.user.sub,
    })
    return reply.code(200).send({ reading })
  } catch (err) {
    return sendVariablesError(reply, err)
  }
}
```

- [ ] **Step 6: Registrar la ruta**

En `backend/src/modules/variables/variables.routes.ts`, agregar `correctReadingHandler` al import:

```typescript
import {
  uploadVariablesHandler,
  clientDashboardHandler,
  adminDashboardHandler,
  listOrganizationsHandler,
  listOrgServicesHandler,
  clientHistoryHandler,
  adminHistoryHandler,
  clientUploadDetailHandler,
  adminUploadDetailHandler,
  correctReadingHandler,
} from './variables.controller.js'
```

Agregar la ruta dentro de `export async function variablesRoutes(app: FastifyInstance) { ... }`, después del bloque de `uploadVariablesHandler`:

```typescript
  app.patch<{
    Params: { organizationId: string; serviceSlug: string; readingId: string }
    Body: { valor: number; reason: string }
  }>(
    '/api/admin/organizations/:organizationId/services/:serviceSlug/readings/:readingId',
    { preHandler: [requireAuth, requirePermission('platform.variables.correct')] },
    correctReadingHandler,
  )
```

- [ ] **Step 7: Volver a correr el seed y typecheck**

```bash
cd backend
npx tsx prisma/seed.ts
npm run typecheck
```

Expected: el seed termina con el mensaje de siempre (`Seed completo: 5 servicios, 17 permisos, 3 roles.` — un permiso más que antes), typecheck sin errores.

- [ ] **Step 8: Smoke test manual del endpoint con curl**

Necesitas una cookie de sesión válida (ya logueado como super-admin en el navegador) o generar un token de prueba como se hizo en fases anteriores de esta sesión. Como mínimo, confirma con:

```bash
curl -i -X PATCH "http://localhost:3000/api/admin/organizations/FAKE_ID/services/higiene-industrial/readings/FAKE_ID" \
  -H "Content-Type: application/json" \
  -d '{"valor": 100, "reason": "prueba"}'
```

Expected: `401` (sin cookie de sesión) — confirma que la ruta existe y está protegida, no un `404` de ruta inexistente. La prueba end-to-end real con datos válidos se hace en el navegador en Task 7.

---

## Task 3: Backend — exponer id/isCorrected/correctionReason en el payload del dashboard

**Files:**
- Modify: `backend/src/modules/variables/variables.service.ts`

**Interfaces:**
- Consumes: campos de Task 1 (ya incluidos automáticamente por Prisma en cualquier `include`, sin cambios de query necesarios en el repositorio).
- Produces: cada objeto dentro de `CategorySummary.variables[].readings[]` (respuesta de `GET .../dashboard/:serviceSlug`) gana `id: string`, `isCorrected: boolean`, `correctionReason: string | null`.

- [ ] **Step 1: Ampliar la firma de `buildVariableSummary`**

En `backend/src/modules/variables/variables.service.ts`, ubicar la función `buildVariableSummary`:

```typescript
function buildVariableSummary(
  definition: {
    id: string
    codigo: string
    nombre: string
    unidadMedida: string
    limiteMin: number | null
    limiteMax: number | null
    normativaRef: string | null
    comparisonType: SemaphoreThresholds['comparisonType']
    toleranciaAlerta: number
  },
  readings: {
    valor: number
    semaforo: 'VERDE' | 'AMARILLO' | 'ROJO'
    workPoint: { codigo: string; nombre: string; areaPlanta: string }
  }[],
) {
```

Reemplazar la firma de `readings` por (agrega los 3 campos nuevos, tipados igual que en el modelo de Prisma):

```typescript
function buildVariableSummary(
  definition: {
    id: string
    codigo: string
    nombre: string
    unidadMedida: string
    limiteMin: number | null
    limiteMax: number | null
    normativaRef: string | null
    comparisonType: SemaphoreThresholds['comparisonType']
    toleranciaAlerta: number
  },
  readings: {
    id: string
    valor: number
    semaforo: 'VERDE' | 'AMARILLO' | 'ROJO'
    isCorrected: boolean
    correctionReason: string | null
    workPoint: { codigo: string; nombre: string; areaPlanta: string }
  }[],
) {
```

- [ ] **Step 2: Incluir los campos nuevos en el mapeo de salida**

En la misma función, ubicar el `return`:

```typescript
  return {
    definitionId: definition.id,
    codigo: definition.codigo,
    nombre: definition.nombre,
    unidadMedida: definition.unidadMedida,
    limiteMin: definition.limiteMin,
    limiteMax: definition.limiteMax,
    normativaRef: definition.normativaRef,
    promedio,
    cumplimientoPct,
    estado,
    // Detalle por puesto de trabajo — alimenta la tabla de la pestaña de
    // categoría (ej. Iluminación), donde un higienista necesita ver cada
    // punto evaluado individualmente, no solo el promedio de la organización.
    readings: readings
      .map((r) => ({
        workPointCodigo: r.workPoint.codigo,
        workPointNombre: r.workPoint.nombre,
        areaPlanta: r.workPoint.areaPlanta,
        valor: r.valor,
        semaforo: r.semaforo,
      }))
      .sort((a, b) => a.workPointCodigo.localeCompare(b.workPointCodigo)),
  }
}
```

Reemplazar el `.map(...)` interno por:

```typescript
    readings: readings
      .map((r) => ({
        id: r.id,
        workPointCodigo: r.workPoint.codigo,
        workPointNombre: r.workPoint.nombre,
        areaPlanta: r.workPoint.areaPlanta,
        valor: r.valor,
        semaforo: r.semaforo,
        isCorrected: r.isCorrected,
        correctionReason: r.correctionReason,
      }))
      .sort((a, b) => a.workPointCodigo.localeCompare(b.workPointCodigo)),
  }
}
```

- [ ] **Step 3: Confirmar que las llamadas a `buildVariableSummary` siguen tipando bien**

`buildVariableSummary` se llama dentro de `getDashboard` pasándole directamente los objetos que vienen de `repository.findReadingsByUpload(...)` (vía `include: { definition: true, workPoint: true }`), que con los campos de Task 1 ya incluyen `id`, `isCorrected`, `correctionReason` automáticamente — no hace falta tocar esa parte de `getDashboard`.

```bash
cd backend
npm run typecheck
```

Expected: sin errores. Si aparece un error de tipo en la llamada a `buildVariableSummary`, es porque el objeto que le llega no incluye alguno de los 3 campos nuevos — revisa que `findReadingsByUpload` use `include` (no `select`) como ya está.

---

## Task 4: Frontend — tipos y servicio de API

**Files:**
- Modify: `frontend/src/types/dashboard.ts`
- Modify: `frontend/src/services/dashboard.service.ts`

**Interfaces:**
- Produces: `WorkPointReading` gana `id`, `isCorrected`, `correctionReason`; función `correctReading(organizationId, serviceSlug, readingId, valor, reason): Promise<void>`.

- [ ] **Step 1: Ampliar `WorkPointReading` en `frontend/src/types/dashboard.ts`**

Ubicar:

```typescript
export interface WorkPointReading {
  workPointCodigo: string
  workPointNombre: string
  areaPlanta: string
  valor: number
  semaforo: SemaphoreStatus
}
```

Reemplazar por:

```typescript
export interface WorkPointReading {
  id: string
  workPointCodigo: string
  workPointNombre: string
  areaPlanta: string
  valor: number
  semaforo: SemaphoreStatus
  isCorrected: boolean
  correctionReason: string | null
}
```

- [ ] **Step 2: Agregar `correctReading` en `frontend/src/services/dashboard.service.ts`**

Agregar al final del archivo (después de `uploadVariablesFile`):

```typescript
/** Super-admin: corrige el valor de una lectura ya procesada. El backend
 * recalcula el semáforo — nunca se envía desde el frontend. */
export async function correctReading(
  organizationId: string,
  serviceSlug: string,
  readingId: string,
  valor: number,
  reason: string,
): Promise<void> {
  try {
    await apiClient.patch(
      `/admin/organizations/${organizationId}/services/${serviceSlug}/readings/${readingId}`,
      { valor, reason },
    )
  } catch (err) {
    rethrow(err)
  }
}
```

- [ ] **Step 3: Typecheck**

```bash
cd frontend
npx vue-tsc -b 2>&1 | tail -60
```

Expected: errores esperados en `CategoryTab.vue` (todavía no usa los campos nuevos de `WorkPointReading` de forma incompatible — probablemente ninguno, ya que son campos adicionales, no removidos). Si hay errores, son de los pasos siguientes (`CategoryTab.vue` aún no ha sido tocado) — confírmalos y sigue: no deberían aparecer errores nuevos todavía porque los campos son aditivos.

---

## Task 5: Frontend — DashboardShell, modal de corrección, y CategoryTab

**Files:**
- Modify: `frontend/src/components/dashboard/DashboardShell.vue`
- Create: `frontend/src/components/dashboard/CorrectReadingModal.vue`
- Modify: `frontend/src/components/dashboard/tabs/CategoryTab.vue`
- Modify: `frontend/src/i18n/locales/es.json`
- Modify: `frontend/src/i18n/locales/en.json`

**Interfaces:**
- Consumes: `correctReading` de Task 4; `WorkPointReading` (con `id`/`isCorrected`/`correctionReason`) de Task 4.
- Produces: `DashboardShell` acepta `editableReadings?: boolean` y `correctReading?: (readingId: string, valor: number, reason: string) => Promise<void>`, reenviados a `CategoryTab`. Componente `CorrectReadingModal.vue` con emits `submit: [valor: number, reason: string]` y `cancel: []`.

- [ ] **Step 1: Agregar las claves de i18n (es.json)**

En `frontend/src/i18n/locales/es.json`, ubicar el objeto `dashboard.category` (busca `"category": {`), que hoy tiene esta forma:

```json
    "category": {
      "detailHeading": "Detalle por punto de trabajo",
      "workPoint": "Punto de trabajo",
      "areaPlant": "Área / Planta",
      "heatmapPlaceholder": "Mapa de calor espacial — disponible cuando se definan coordenadas de planta para los puntos de trabajo.",
      "trendPrefix": "Tendencia — "
    },
```

Reemplazar por (agrega `editLabel` y el objeto `correctModal`):

```json
    "category": {
      "detailHeading": "Detalle por punto de trabajo",
      "workPoint": "Punto de trabajo",
      "areaPlant": "Área / Planta",
      "heatmapPlaceholder": "Mapa de calor espacial — disponible cuando se definan coordenadas de planta para los puntos de trabajo.",
      "trendPrefix": "Tendencia — ",
      "editLabel": "Corregir lectura",
      "correctedTag": "editado",
      "correctModal": {
        "title": "Corregir lectura",
        "close": "Cerrar",
        "workPointLabel": "Punto de trabajo",
        "variableLabel": "Variable",
        "currentValueLabel": "Valor actual",
        "newValueLabel": "Nuevo valor",
        "reasonLabel": "Motivo de la corrección",
        "reasonPlaceholder": "Ej: error de digitación en la carga original",
        "reasonError": "Escribe un motivo de al menos 10 caracteres.",
        "cancel": "Cancelar",
        "confirm": "Guardar cambio",
        "genericError": "No se pudo guardar la corrección."
      }
    },
```

- [ ] **Step 2: Agregar las mismas claves en `en.json` (paridad obligatoria)**

En `frontend/src/i18n/locales/en.json`, ubicar el objeto `dashboard.category` equivalente y aplicar el mismo cambio en inglés:

```json
    "category": {
      "detailHeading": "Detail by work point",
      "workPoint": "Work point",
      "areaPlant": "Area / Plant",
      "heatmapPlaceholder": "Spatial heat map — available once plant coordinates are defined for work points.",
      "trendPrefix": "Trend — ",
      "editLabel": "Correct reading",
      "correctedTag": "edited",
      "correctModal": {
        "title": "Correct reading",
        "close": "Close",
        "workPointLabel": "Work point",
        "variableLabel": "Variable",
        "currentValueLabel": "Current value",
        "newValueLabel": "New value",
        "reasonLabel": "Reason for the correction",
        "reasonPlaceholder": "E.g. data entry error in the original upload",
        "reasonError": "Enter a reason with at least 10 characters.",
        "cancel": "Cancel",
        "confirm": "Save change",
        "genericError": "The correction could not be saved."
      }
    },
```

Nota: los textos exactos de `detailHeading`/`workPoint`/etc. en `en.json` pueden diferir levemente de lo que se muestra arriba — no los toques, solo agrega `editLabel`/`correctedTag`/`correctModal` preservando lo que ya exista.

- [ ] **Step 3: Verificar paridad de claves entre ambos locales**

```bash
cd frontend/src/i18n/locales
python3 -c "
import json
def keys(d, prefix=''):
    s = set()
    if isinstance(d, dict):
        for k, v in d.items():
            path = f'{prefix}.{k}' if prefix else k
            s.add(path)
            s |= keys(v, path)
    return s
es = json.load(open('es.json', encoding='utf-8'))
en = json.load(open('en.json', encoding='utf-8'))
ke, kn = keys(es), keys(en)
print('OK' if ke == kn else 'MISMATCH: ' + str(sorted((ke-kn)|(kn-ke))))
"
```

Expected: `OK`.

- [ ] **Step 4: Crear `CorrectReadingModal.vue`**

Create `frontend/src/components/dashboard/CorrectReadingModal.vue` (mismo patrón visual que `frontend/src/components/dashboard/notifications/SuspendUserModal.vue`, ya existente en el proyecto):

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { X } from 'lucide-vue-next'

const props = defineProps<{
  workPointNombre: string
  variableNombre: string
  currentValue: number
  unidadMedida: string
}>()

const emit = defineEmits<{ submit: [valor: number, reason: string]; cancel: [] }>()

const { t } = useI18n()

const newValue = ref(String(props.currentValue))
const reason = ref('')
const touched = ref(false)
const MIN_REASON_LENGTH = 10

function handleSubmit() {
  touched.value = true
  const parsedValue = Number(newValue.value)
  const trimmedReason = reason.value.trim()
  if (Number.isNaN(parsedValue) || trimmedReason.length < MIN_REASON_LENGTH) return
  emit('submit', parsedValue, trimmedReason)
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 px-4" @click.self="emit('cancel')">
    <div class="w-full max-w-md rounded-md bg-white p-5 shadow-xl">
      <div class="flex items-start justify-between gap-3">
        <h2 class="text-base font-bold text-navy-900">{{ t('dashboard.category.correctModal.title') }}</h2>
        <button
          type="button"
          class="rounded-sm p-1 text-navy-700/60 hover:bg-cream"
          :aria-label="t('dashboard.category.correctModal.close')"
          @click="emit('cancel')"
        >
          <X class="h-4 w-4" />
        </button>
      </div>

      <div class="mt-4 grid gap-1 text-sm text-navy-700">
        <p><span class="font-semibold text-navy-900">{{ t('dashboard.category.correctModal.workPointLabel') }}:</span> {{ props.workPointNombre }}</p>
        <p><span class="font-semibold text-navy-900">{{ t('dashboard.category.correctModal.variableLabel') }}:</span> {{ props.variableNombre }}</p>
        <p><span class="font-semibold text-navy-900">{{ t('dashboard.category.correctModal.currentValueLabel') }}:</span> {{ props.currentValue }} {{ props.unidadMedida }}</p>
      </div>

      <label for="correct-new-value" class="mb-1.5 mt-4 block text-xs font-semibold uppercase tracking-wide text-navy-700">
        {{ t('dashboard.category.correctModal.newValueLabel') }}
      </label>
      <input
        id="correct-new-value"
        v-model="newValue"
        type="number"
        step="any"
        class="w-full rounded-sm border border-line-strong bg-white px-4 py-2.5 text-sm text-navy-900 outline-none transition-colors focus:border-sky-400"
      />

      <label for="correct-reason" class="mb-1.5 mt-4 block text-xs font-semibold uppercase tracking-wide text-navy-700">
        {{ t('dashboard.category.correctModal.reasonLabel') }}
      </label>
      <textarea
        id="correct-reason"
        v-model="reason"
        rows="3"
        class="w-full rounded-sm border border-line-strong bg-white px-4 py-2.5 text-sm text-navy-900 outline-none transition-colors focus:border-sky-400"
        :placeholder="t('dashboard.category.correctModal.reasonPlaceholder')"
        :aria-invalid="touched && reason.trim().length < MIN_REASON_LENGTH"
        aria-describedby="correct-reason-error"
      />
      <p
        v-if="touched && reason.trim().length < MIN_REASON_LENGTH"
        id="correct-reason-error"
        class="mt-1.5 text-xs text-red-600"
      >
        {{ t('dashboard.category.correctModal.reasonError') }}
      </p>

      <div class="mt-5 flex justify-end gap-2">
        <button
          type="button"
          class="rounded-sm border border-line-strong px-4 py-2 text-sm font-medium text-navy-700 hover:border-navy-900"
          @click="emit('cancel')"
        >
          {{ t('dashboard.category.correctModal.cancel') }}
        </button>
        <button
          type="button"
          class="rounded-sm bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-700"
          @click="handleSubmit"
        >
          {{ t('dashboard.category.correctModal.confirm') }}
        </button>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 5: Agregar los props opcionales a `DashboardShell.vue`**

En `frontend/src/components/dashboard/DashboardShell.vue`, ubicar el bloque `defineProps`:

```typescript
const props = defineProps<{
  dashboard: DashboardData
  fetchHistory: () => Promise<UploadHistoryEntry[]>
  fetchUploadDetail: (uploadId: string) => Promise<UploadDetail>
  /** Oculta el sidebar interno de pestañas — para cuando este shell se
   * embebe dentro de otro sidebar que ya controla la pestaña activa (ver
   * HigieneIndustrialPanel.vue / AdminNavSidebar.vue, Fase C). Por defecto
   * false: el uso standalone (ClientDashboardView.vue) no cambia. */
  hideSidebar?: boolean
  /** Listado de pestañas ya calculado por el padre — si se omite, se calcula
   * internamente igual que siempre (uso standalone). */
  tabs?: TabDef[]
}>()
```

Reemplazar por (agrega 2 props opcionales, nada más cambia):

```typescript
const props = defineProps<{
  dashboard: DashboardData
  fetchHistory: () => Promise<UploadHistoryEntry[]>
  fetchUploadDetail: (uploadId: string) => Promise<UploadDetail>
  /** Oculta el sidebar interno de pestañas — para cuando este shell se
   * embebe dentro de otro sidebar que ya controla la pestaña activa (ver
   * HigieneIndustrialPanel.vue / AdminNavSidebar.vue, Fase C). Por defecto
   * false: el uso standalone (ClientDashboardView.vue) no cambia. */
  hideSidebar?: boolean
  /** Listado de pestañas ya calculado por el padre — si se omite, se calcula
   * internamente igual que siempre (uso standalone). */
  tabs?: TabDef[]
  /** Habilita el ícono de corrección por celda en CategoryTab — solo el
   * admin lo pasa (HigieneIndustrialPanel.vue). El cliente nunca lo pasa,
   * así que ClientDashboardView.vue no cambia en nada. */
  editableReadings?: boolean
  correctReading?: (readingId: string, valor: number, reason: string) => Promise<void>
}>()
```

Ubicar el template:

```vue
      <CategoryTab v-else-if="activeCategory" :category="activeCategory" :trend="dashboard.trend" />
```

Reemplazar por:

```vue
      <CategoryTab
        v-else-if="activeCategory"
        :category="activeCategory"
        :trend="dashboard.trend"
        :editable="props.editableReadings ?? false"
        :correct-reading="props.correctReading"
      />
```

- [ ] **Step 6: Agregar el ícono de edición y la etiqueta "editado" en `CategoryTab.vue`**

En `frontend/src/components/dashboard/tabs/CategoryTab.vue`, ubicar el bloque de imports e interfaces al inicio:

```typescript
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CategorySummary, TrendPoint, WorkPointReading } from '@/types/dashboard'
import SummaryCard from '../SummaryCard.vue'
import TrendChart from '../TrendChart.vue'
import { SEMAPHORE_STYLES } from '@/utils/semaphoreStyles'

const props = defineProps<{ category: CategorySummary; trend: TrendPoint[] }>()
const { t } = useI18n()
```

Reemplazar por:

```typescript
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Pencil } from 'lucide-vue-next'
import type { CategorySummary, TrendPoint, WorkPointReading } from '@/types/dashboard'
import SummaryCard from '../SummaryCard.vue'
import TrendChart from '../TrendChart.vue'
import CorrectReadingModal from '../CorrectReadingModal.vue'
import { SEMAPHORE_STYLES } from '@/utils/semaphoreStyles'

const props = defineProps<{
  category: CategorySummary
  trend: TrendPoint[]
  /** Solo el admin lo pasa (vía DashboardShell) — el cliente nunca lo ve. */
  editable?: boolean
  correctReading?: (readingId: string, valor: number, reason: string) => Promise<void>
}>()
const { t } = useI18n()

interface EditTarget {
  reading: WorkPointReading
  variableNombre: string
  unidadMedida: string
}

const editTarget = ref<EditTarget | null>(null)
const errorMessage = ref('')

function openEdit(reading: WorkPointReading, variableNombre: string, unidadMedida: string) {
  errorMessage.value = ''
  editTarget.value = { reading, variableNombre, unidadMedida }
}

async function handleCorrect(valor: number, reason: string) {
  if (!editTarget.value || !props.correctReading) return
  try {
    await props.correctReading(editTarget.value.reading.id, valor, reason)
    editTarget.value = null
  } catch {
    errorMessage.value = t('dashboard.category.correctModal.genericError')
  }
}
```

Ubicar la interfaz `WorkPointRow` y su construcción (el `computed` `workPointRows`) — **no cambia**, sigue igual, ya que sigue indexando por `variable.definitionId` y cada `reading` dentro de `row.valores[...]` ahora trae `id`/`isCorrected`/`correctionReason` de más (tipo `WorkPointReading` ya ampliado en Task 4), sin romper nada existente.

Ubicar la celda de la tabla que renderiza cada valor:

```vue
              <td v-for="v in category.variables" :key="v.definitionId" class="px-4 py-3">
                <span v-if="row.valores[v.definitionId]" class="inline-flex items-center gap-1.5 font-mono text-navy-900">
                  <span :class="SEMAPHORE_STYLES[row.valores[v.definitionId]!.semaforo].dot" class="h-1.5 w-1.5 shrink-0 rounded-full" />
                  {{ row.valores[v.definitionId]!.valor }} {{ v.unidadMedida }}
                </span>
                <span v-else class="text-navy-700 opacity-40">—</span>
              </td>
```

Reemplazar por:

```vue
              <td v-for="v in category.variables" :key="v.definitionId" class="px-4 py-3">
                <span v-if="row.valores[v.definitionId]" class="inline-flex items-center gap-1.5 font-mono text-navy-900">
                  <span :class="SEMAPHORE_STYLES[row.valores[v.definitionId]!.semaforo].dot" class="h-1.5 w-1.5 shrink-0 rounded-full" />
                  {{ row.valores[v.definitionId]!.valor }} {{ v.unidadMedida }}
                  <span v-if="row.valores[v.definitionId]!.isCorrected" :title="row.valores[v.definitionId]!.correctionReason ?? ''" class="text-[10px] font-sans italic text-navy-700/60">
                    ({{ t('dashboard.category.correctedTag') }})
                  </span>
                  <button
                    v-if="props.editable"
                    type="button"
                    class="text-navy-700/40 hover:text-navy-900"
                    :aria-label="t('dashboard.category.editLabel')"
                    @click="openEdit(row.valores[v.definitionId]!, v.nombre, v.unidadMedida)"
                  >
                    <Pencil class="h-3.5 w-3.5" />
                  </button>
                </span>
                <span v-else class="text-navy-700 opacity-40">—</span>
              </td>
```

Al final del `<template>`, justo antes del `</template>` de cierre, agregar (fuera de la tabla, como hermano del `<div>` raíz):

```vue
    <p v-if="errorMessage" class="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {{ errorMessage }}
    </p>

    <CorrectReadingModal
      v-if="editTarget"
      :work-point-nombre="editTarget.reading.workPointNombre"
      :variable-nombre="editTarget.variableNombre"
      :current-value="editTarget.reading.valor"
      :unidad-medida="editTarget.unidadMedida"
      @submit="handleCorrect"
      @cancel="editTarget = null"
    />
```

(el `<div class="grid gap-6">` raíz del componente ya envuelve todo lo demás — agrega estos dos bloques como los últimos hijos de ese mismo `<div>`, antes de su `</div>` de cierre).

- [ ] **Step 7: Typecheck**

```bash
cd frontend
npx vue-tsc -b 2>&1 | tail -100
```

Expected: sin errores. Si aparece un error de tipo en `CategoryTab.vue` sobre `row.valores[...]`, revisa que el `computed workPointRows` siga tipando `valores: Record<string, WorkPointReading | undefined>` (no cambia en este task, pero confírmalo).

---

## Task 6: Frontend — encabezado de contexto operativo + wiring final en HigieneIndustrialPanel

**Files:**
- Modify: `frontend/src/components/dashboard/operacion/HigieneIndustrialPanel.vue`
- Modify: `frontend/src/i18n/locales/es.json`
- Modify: `frontend/src/i18n/locales/en.json`

**Interfaces:**
- Consumes: `correctReading` de Task 4; `editableReadings`/`correctReading` props de `DashboardShell` (Task 5); `organizations` ya inyectado (`operacionOrganizations`, existente desde Fase C).

- [ ] **Step 1: Agregar la clave de i18n del encabezado**

En `frontend/src/i18n/locales/es.json`, ubicar el objeto `dashboard.adminShell` (busca `"adminShell": {`) y agregar una clave nueva `operationalHeading` (con placeholder `{empresa}`):

```json
    "adminShell": {
      "navAriaLabel": "Navegación de administración",
      "operacionSection": "Operación",
```

Agregar justo antes de `"navAriaLabel"` (o en cualquier parte del mismo objeto):

```json
    "adminShell": {
      "operationalHeading": "Panel operativo — Higiene Industrial — {empresa}",
      "navAriaLabel": "Navegación de administración",
      "operacionSection": "Operación",
```

En `en.json`, mismo objeto:

```json
    "adminShell": {
      "operationalHeading": "Operations panel — Industrial Hygiene — {empresa}",
      "navAriaLabel": "Admin navigation",
```

Verificar paridad de nuevo (mismo script de Task 5, Step 3). Expected: `OK`.

- [ ] **Step 2: Agregar el encabezado y el wiring en `HigieneIndustrialPanel.vue`**

En `frontend/src/components/dashboard/operacion/HigieneIndustrialPanel.vue`, ubicar el bloque de `organizations`/`selectOrg` ya inyectados:

```typescript
const organizations = inject<Ref<OrganizationListItem[]>>('operacionOrganizations', ref([]))
const selectOrg = inject<(id: string) => void>('operacionSelectOrg', () => {})

function handleOrgChange(event: Event) {
  selectOrg((event.target as HTMLSelectElement).value)
}
```

Agregar justo después (computed para resolver el nombre de la empresa activa):

```typescript
const organizations = inject<Ref<OrganizationListItem[]>>('operacionOrganizations', ref([]))
const selectOrg = inject<(id: string) => void>('operacionSelectOrg', () => {})

function handleOrgChange(event: Event) {
  selectOrg((event.target as HTMLSelectElement).value)
}

const activeOrgNombre = computed(
  () => organizations.value.find((org) => org.id === props.organizationId)?.nombre ?? '',
)
```

Agregar la importación de `correctReading` del servicio y la función wrapper. Ubicar:

```typescript
import {
  getAdminDashboard,
  getAdminUploadHistory,
  getAdminUploadDetail,
  DashboardRequestError,
} from '@/services/dashboard.service'
```

Reemplazar por:

```typescript
import {
  getAdminDashboard,
  getAdminUploadHistory,
  getAdminUploadDetail,
  correctReading as correctReadingApi,
  DashboardRequestError,
} from '@/services/dashboard.service'
```

Ubicar `fetchUploadDetail` (el último método antes del cierre de `<script setup>`):

```typescript
function fetchUploadDetail(uploadId: string) {
  return getAdminUploadDetail(props.organizationId, SERVICE_SLUG, uploadId)
}
```

Agregar justo después:

```typescript
function fetchUploadDetail(uploadId: string) {
  return getAdminUploadDetail(props.organizationId, SERVICE_SLUG, uploadId)
}

async function correctReading(readingId: string, valor: number, reason: string) {
  await correctReadingApi(props.organizationId, SERVICE_SLUG, readingId, valor, reason)
  await loadDashboard()
}
```

En el `<template>`, ubicar el inicio del `<div class="grid gap-6">` con la primera `<section>` (el selector de empresa):

```vue
<template>
  <div class="grid gap-6">
    <section class="overflow-hidden rounded-lg border border-line-strong bg-white p-4 print:hidden sm:p-5">
      <label for="operacion-org-select" class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy-700">
```

Reemplazar por (agrega el encabezado antes de la sección del selector):

```vue
<template>
  <div class="grid gap-6">
    <div class="rounded-lg bg-navy-900 px-4 py-3 print:hidden sm:px-5">
      <p class="text-sm font-semibold text-sky-100">
        {{ t('dashboard.adminShell.operationalHeading', { empresa: activeOrgNombre }) }}
      </p>
    </div>

    <section class="overflow-hidden rounded-lg border border-line-strong bg-white p-4 print:hidden sm:p-5">
      <label for="operacion-org-select" class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy-700">
```

Por último, ubicar el `<DashboardShell>` al final del template:

```vue
    <DashboardShell
      v-else-if="dashboard"
      :key="props.organizationId"
      :dashboard="dashboard"
      :fetch-history="fetchHistory"
      :fetch-upload-detail="fetchUploadDetail"
      hide-sidebar
      :tabs="tabs"
      v-model:active-tab="sharedActiveTab"
    />
```

Reemplazar por (agrega los 2 props nuevos):

```vue
    <DashboardShell
      v-else-if="dashboard"
      :key="props.organizationId"
      :dashboard="dashboard"
      :fetch-history="fetchHistory"
      :fetch-upload-detail="fetchUploadDetail"
      hide-sidebar
      :tabs="tabs"
      v-model:active-tab="sharedActiveTab"
      editable-readings
      :correct-reading="correctReading"
    />
```

- [ ] **Step 3: Typecheck backend + frontend**

```bash
cd backend && npm run typecheck
cd ../frontend && npx vue-tsc -b 2>&1 | tail -100
```

Expected: ambos sin errores.

---

## Task 7: Verificación end-to-end en navegador (checkpoint final)

**Files:** ninguno (solo verificación).

- [ ] **Step 1: Levantar los servidores**

Usar las herramientas de Claude Preview (`preview_start` con los nombres `backend`/`frontend` ya configurados en `.claude/launch.json`), no `npm run dev` a mano.

- [ ] **Step 2: Login como super-admin y navegar al panel operativo**

Documento `1000000001`, contraseña de `backend/.env` (`SEED_SUPERADMIN_PASSWORD`). Navegar a `/es/dashboard/admin/operacion/<orgId>/higiene-industrial`.

Expected: aparece el encabezado navy "Panel operativo — Higiene Industrial — Organizacion 1" (o la empresa que esté activa) arriba del selector de empresa. Cambiar de empresa en el selector y confirmar que el nombre del encabezado cambia también.

- [ ] **Step 3: Corregir una lectura real**

Ir a la pestaña de una categoría (ej. Iluminación). Confirmar que cada celda con valor tiene un ícono de lápiz. Hacer clic en uno, confirmar que abre `CorrectReadingModal` con el punto de trabajo/variable/valor actual correctos. Cambiar el valor a algo que cruce el umbral de esa variable (para ver el semáforo cambiar de color), escribir un motivo de al menos 10 caracteres, guardar.

Expected: el modal cierra, la celda muestra el nuevo valor con el semáforo recalculado y la etiqueta "(editado)" — pasar el mouse por encima debe mostrar el motivo en el tooltip. El resumen (`ResumenTab`) y el comparativo (`ComparativoTab`) deben reflejar el nuevo valor tras la recarga automática.

- [ ] **Step 4: Probar la validación del motivo**

Abrir el modal de nuevo sobre cualquier celda, escribir un motivo de menos de 10 caracteres (o dejarlo vacío) e intentar guardar.

Expected: no se envía la petición, aparece el mensaje de error de validación bajo el textarea (`dashboard.category.correctModal.reasonError`).

- [ ] **Step 5: Confirmar que la vista cliente no cambió**

Cerrar sesión, entrar como cliente (documento `1000000003`, contraseña `SEED_CLIENTE_PASSWORD` de `backend/.env`). Navegar a `/es/dashboard/higiene-industrial`, ir a cualquier categoría.

Expected: **ningún** ícono de lápiz visible en ninguna celda — la vista cliente se ve exactamente igual que antes de este plan.

- [ ] **Step 6: Verificación responsive (mobile)**

Repetir el Step 3 con el viewport en `mobile` (375×812) como admin — confirmar que el modal de corrección se ve bien centrado y usable, y que el encabezado navy no rompe el layout apilado.

- [ ] **Step 7: Limpieza de datos de prueba (si aplica)**

Si al probar se corrigió una lectura de datos reales del seed de forma que deje el dashboard en un estado confuso para pruebas futuras, considera revertir el valor manualmente vía un script de Prisma puntual (mismo patrón usado varias veces en esta sesión para limpiar datos SMOKE TEST) — opcional, a discreción, ya que corregir y luego re-corregir de vuelta es una operación válida del propio sistema.

- [ ] **Step 8: Reporte final**

Correr `git status` y `git diff --stat` y compartir el resumen con el usuario. **No hacer commit** — esperar confirmación explícita del mensaje de commit, igual que en todas las fases anteriores de este proyecto.
