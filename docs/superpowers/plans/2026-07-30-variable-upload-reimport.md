# Re-carga de Excel con actualización en el mismo lote Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que una re-carga de Excel para una fecha de evaluación que ya tiene datos actualice esas lecturas en el mismo lote (`VariableUpload`), en vez de crear un lote duplicado, respetando las lecturas ya corregidas manualmente.

**Architecture:** Se agrega una restricción única (organización+servicio+fecha) en `VariableUpload`, y `uploadVariables()` (backend, módulo `variables`) se extiende con una rama de decisión: si ya existe una carga para esa fecha exacta, actualiza sus lecturas fila por fila (respetando `isCorrected`) en vez de crear una carga nueva. Mismo endpoint, mismo formulario de carga, sin cambios de frontend.

**Tech Stack:** Fastify + Prisma + MySQL/MariaDB (backend), sin cambios de frontend en este plan.

## Global Constraints

- Una carga masiva NUNCA sobrescribe una lectura ya `isCorrected=true` — se omite y se reporta como advertencia, sin bloquear el resto del lote.
- Variables desconocidas o deprecadas (`isActive: false`) siguen rechazando el archivo completo — comportamiento ya existente en `uploadVariables()`, sin cambios.
- Mismo formulario de carga ya existente (selector de archivo + fecha) — CERO cambios de frontend/UI en este plan.
- La respuesta del endpoint debe seguir incluyendo `filasProcesadas` y `puestosAfectados` calculados exactamente igual que hoy — `frontend/src/components/dashboard/VariableUploadForm.vue:75` y `frontend/src/services/dashboard.service.ts:101-102` ya los consumen y no se tocan en este plan.
- Sin suite de tests automatizada (convención ya establecida en este proyecto) — verificación vía `npm run typecheck` + verificación manual en navegador.
- No crear ningún commit sin que el usuario vea y confirme el mensaje exacto primero (regla de la sesión).

---

## Task 1: Migración Prisma — restricción única en VariableUpload

**Files:**
- Modify: `backend/prisma/schema.prisma:473` (el `@@index` de `VariableUpload` pasa a `@@unique`)
- Create: `backend/prisma/migrations/<timestamp>_variable_upload_unique_date/migration.sql`

**Interfaces:**
- Produces: la clave compuesta única `organizationId_serviceId_fechaEvaluacion` en el modelo `VariableUpload`, que Task 2 usa vía `prisma.variableUpload.findUnique({ where: { organizationId_serviceId_fechaEvaluacion: {...} } })`.

- [ ] **Step 1: Confirmar que no hay cargas duplicadas por fecha hoy (pre-condición para que la migración no falle)**

Run:
```bash
cd /home/laortiz937/Documentos/sst-platform/backend
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const groups = await prisma.variableUpload.groupBy({ by: ['organizationId', 'serviceId', 'fechaEvaluacion'], _count: true });
  const dupes = groups.filter(g => g._count > 1);
  console.log('duplicados:', dupes.length);
  await prisma.\$disconnect();
})();
"
```

Expected: `duplicados: 0`. Si el número es mayor que 0, DETENTE y repórtalo — no continúes con la migración (habría que decidir cómo resolver los duplicados primero, fuera del alcance de este plan).

- [ ] **Step 2: Editar el modelo `VariableUpload` en `schema.prisma`**

Ubica esta línea en `backend/prisma/schema.prisma` (dentro de `model VariableUpload`):

```prisma
  @@index([organizationId, serviceId, fechaEvaluacion])
```

Reemplázala por:

```prisma
  @@unique([organizationId, serviceId, fechaEvaluacion])
```

(Un `@@unique` ya funciona como índice — no se necesita mantener ambos.)

- [ ] **Step 3: Generar el SQL de la migración (flujo no interactivo — sin TTY para `prisma migrate dev`)**

```bash
cd /home/laortiz937/Documentos/sst-platform/backend
TS=$(date +%Y%m%d%H%M%S)
mkdir -p "prisma/migrations/${TS}_variable_upload_unique_date"
npx prisma migrate diff \
  --from-schema-datasource=prisma/schema.prisma \
  --to-schema-datamodel=prisma/schema.prisma \
  --script > "prisma/migrations/${TS}_variable_upload_unique_date/migration.sql"
cat "prisma/migrations/${TS}_variable_upload_unique_date/migration.sql"
```

Expected output (contenido del SQL, revisa que sea similar a):
```sql
-- DropIndex
DROP INDEX `variable_uploads_organization_id_service_id_fecha_evaluacion_idx` ON `variable_uploads`;

-- CreateIndex
CREATE UNIQUE INDEX `variable_uploads_organization_id_service_id_fecha_evaluacion_key` ON `variable_uploads`(`organization_id`, `service_id`, `fecha_evaluacion`);
```

(Los nombres exactos de índice pueden variar ligeramente — lo importante es que haga DROP del índice viejo no-único y CREATE de uno único sobre las mismas 3 columnas.)

- [ ] **Step 4: Aplicar la migración a la base de datos**

```bash
cd /home/laortiz937/Documentos/sst-platform/backend
npx prisma db execute --file "prisma/migrations/${TS}_variable_upload_unique_date/migration.sql" --schema prisma/schema.prisma
npx prisma migrate resolve --applied "${TS}_variable_upload_unique_date"
```

Expected: sin errores; el segundo comando confirma `Migration ... marked as applied.`

- [ ] **Step 5: Regenerar el cliente de Prisma**

```bash
cd /home/laortiz937/Documentos/sst-platform/backend
npx prisma generate
npm run typecheck
```

Expected: ambos comandos terminan sin errores (el `typecheck` seguirá pasando porque nada más se tocó todavía — este paso solo confirma que el cliente regenerado no rompe nada existente).

- [ ] **Step 6: Verificar la restricción directamente en la base de datos**

```bash
cd /home/laortiz937/Documentos/sst-platform/backend
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const rows = await prisma.\$queryRaw\`SHOW INDEX FROM variable_uploads WHERE Non_unique = 0\`;
  console.log(JSON.stringify(rows, null, 2));
  await prisma.\$disconnect();
})();
"
```

Expected: la salida incluye un índice único que cubre `organization_id`, `service_id`, `fecha_evaluacion` (3 filas con el mismo `Key_name`, una por columna, en `Seq_in_index` 1/2/3).

---

## Task 2: Backend — lógica de actualización en el mismo lote

**Files:**
- Modify: `backend/src/modules/variables/variables.repository.ts` (agregar `findUploadByDate` y `updateUploadTransaction`)
- Modify: `backend/src/modules/variables/variables.service.ts:145-227` (branching logic en `uploadVariables`)

**Interfaces:**
- Consumes: la clave única `organizationId_serviceId_fechaEvaluacion` de Task 1; `calculateSemaphore()` de `backend/src/utils/semaphore.ts` (ya usado, sin cambios); `notifications.notify()` de `backend/src/modules/notifications/notifications.service.ts` (ya usado, sin cambios de firma).
- Produces: `uploadVariables()` sigue devolviendo `{ uploadId, filasProcesadas, puestosAfectados }` (sin cambios de esos 3 campos) MÁS 3 campos nuevos: `filasNuevas: number`, `filasActualizadas: number`, `filasOmitidas: { workPointCodigo: string; codigoVariable: string }[]`.

- [ ] **Step 1: Agregar `findUploadByDate` al repositorio**

En `backend/src/modules/variables/variables.repository.ts`, agrega esta función dentro del objeto que retorna `createVariablesRepository` (junto a `findLatestUpload`, alrededor de la línea 130):

```typescript
    /** Busca la carga exacta para esta fecha (org+servicio+fecha) — la
     * clave única de Task 1 garantiza que hay a lo sumo una. Si existe,
     * uploadVariables() actualiza sus lecturas en vez de crear una carga
     * nueva. */
    findUploadByDate(organizationId: string, serviceId: string, fechaEvaluacion: Date) {
      return prisma.variableUpload.findUnique({
        where: { organizationId_serviceId_fechaEvaluacion: { organizationId, serviceId, fechaEvaluacion } },
      })
    },
```

- [ ] **Step 2: Agregar `updateUploadTransaction` al repositorio**

En el mismo archivo, justo después de `createUploadTransaction` (después de la línea 110), agrega:

```typescript
    /** Actualiza una carga EXISTENTE (misma fecha) en vez de crear una
     * nueva: respeta las lecturas ya corregidas manualmente (isCorrected),
     * actualiza las demás, e inserta como nuevas las combinaciones
     * puesto+variable que no existían en la carga original. Todo en una
     * transacción — todo o nada, igual que createUploadTransaction. */
    async updateUploadTransaction(input: {
      uploadId: string
      organizationId: string
      rows: {
        codigoPuesto: string
        nombrePuesto: string
        areaPlanta: string
        procesoActividad: string
        jornada: WorkShift
        codigoVariable: string
        definitionId: string
        valor: number
        semaforo: 'VERDE' | 'AMARILLO' | 'ROJO'
      }[]
    }) {
      return prisma.$transaction(async (tx) => {
        const workPointIdByCodigo = new Map<string, string>()
        const uniqueCodes = [...new Set(input.rows.map((r) => r.codigoPuesto))]
        for (const codigo of uniqueCodes) {
          const row = input.rows.find((r) => r.codigoPuesto === codigo)!
          const workPoint = await tx.workPoint.upsert({
            where: { organizationId_codigo: { organizationId: input.organizationId, codigo } },
            update: {
              nombre: row.nombrePuesto,
              areaPlanta: row.areaPlanta,
              procesoActividad: row.procesoActividad,
              jornada: row.jornada,
            },
            create: {
              organizationId: input.organizationId,
              codigo,
              nombre: row.nombrePuesto,
              areaPlanta: row.areaPlanta,
              procesoActividad: row.procesoActividad,
              jornada: row.jornada,
            },
          })
          workPointIdByCodigo.set(codigo, workPoint.id)
        }

        let filasNuevas = 0
        let filasActualizadas = 0
        const filasOmitidas: { workPointCodigo: string; codigoVariable: string }[] = []

        for (const row of input.rows) {
          const workPointId = workPointIdByCodigo.get(row.codigoPuesto)!
          const existing = await tx.variableReading.findUnique({
            where: {
              uploadId_workPointId_definitionId: {
                uploadId: input.uploadId,
                workPointId,
                definitionId: row.definitionId,
              },
            },
          })

          if (existing?.isCorrected) {
            filasOmitidas.push({ workPointCodigo: row.codigoPuesto, codigoVariable: row.codigoVariable })
            continue
          }

          if (existing) {
            await tx.variableReading.update({
              where: { id: existing.id },
              data: { valor: row.valor, semaforo: row.semaforo },
            })
            filasActualizadas++
          } else {
            await tx.variableReading.create({
              data: {
                uploadId: input.uploadId,
                workPointId,
                definitionId: row.definitionId,
                valor: row.valor,
                semaforo: row.semaforo,
              },
            })
            filasNuevas++
          }
        }

        return { filasNuevas, filasActualizadas, filasOmitidas }
      })
    },
```

- [ ] **Step 3: Confirmar que el repositorio typechecka antes de tocar el servicio**

```bash
cd /home/laortiz937/Documentos/sst-platform/backend
npm run typecheck
```

Expected: cero errores. Si `organizationId_serviceId_fechaEvaluacion` no es reconocido como clave válida, Task 1 no se completó correctamente (regenerar cliente Prisma).

- [ ] **Step 4: Extender `preparedRows` en el servicio para incluir `codigoVariable`**

En `backend/src/modules/variables/variables.service.ts`, dentro de `uploadVariables()`, ubica el `return` dentro del `.map()` de `preparedRows` (alrededor de la línea 166-175):

```typescript
        return {
          codigoPuesto: row.codigoPuesto,
          nombrePuesto: row.nombrePuesto,
          areaPlanta: row.areaPlanta,
          procesoActividad: row.procesoActividad,
          jornada: normalizeShift(row.jornada),
          definitionId: definition.id,
          valor: row.valor,
          semaforo,
        }
```

Reemplázalo por (agrega `codigoVariable: row.codigoVariable` antes de `definitionId`):

```typescript
        return {
          codigoPuesto: row.codigoPuesto,
          nombrePuesto: row.nombrePuesto,
          areaPlanta: row.areaPlanta,
          procesoActividad: row.procesoActividad,
          jornada: normalizeShift(row.jornada),
          codigoVariable: row.codigoVariable,
          definitionId: definition.id,
          valor: row.valor,
          semaforo,
        }
```

- [ ] **Step 5: Reemplazar el bloque de creación de carga por la lógica de branching**

En el mismo archivo, ubica este bloque completo (empieza justo después del `preparedRows.map(...)` que acabas de editar, hasta el final de `uploadVariables()` antes del método siguiente — corresponde aproximadamente a las líneas 178-228 ANTES de este plan; los números de línea exactos habrán corrido +1 por el Step 4):

```typescript
      const upload = await repository.createUploadTransaction({
        organizationId: input.organizationId,
        serviceId: service.id,
        uploadedById: input.uploadedById,
        originalFile: input.filename,
        fechaEvaluacion: input.fechaEvaluacion,
        rows: preparedRows,
      })

      await repository.createAuditLog({
        userId: input.uploadedById,
        organizationId: input.organizationId,
        action: 'VARIABLES_UPLOADED',
        metadata: { serviceSlug: input.serviceSlug, uploadId: upload.id, filas: preparedRows.length },
        ipAddress: input.ipAddress,
      })

      await notifications.notify({
        type: 'CARGA_PROCESADA',
        recipientIds: [input.uploadedById],
        message: `Tu carga de ${preparedRows.length} lectura(s) para "${service.nombre}" fue procesada correctamente.`,
        link: `/dashboard/historial/${upload.id}`,
        entityType: 'VARIABLE_UPLOAD',
        entityId: upload.id,
      })

      // Agrupado por CARGA (no por fila individual): una sola notificación
      // crítica por esta carga con todas las variables fuera de norma, para
      // no saturar al cliente/admin si varias lecturas del mismo archivo
      // caen en rojo a la vez (ver diagnóstico Fase 0).
      if (criticalReadings.length > 0) {
        await notifications.notify({
          type: 'SEMAFORO_CRITICO',
          organizationId: input.organizationId,
          toAdmins: true,
          message: `${criticalReadings.length} resultado(s) crítico(s) en "${service.nombre}" para "${organization.nombre}": ${criticalReadings
            .map((r) => `${r.variable} en "${r.puesto}" (${r.valor} ${r.unidadMedida})`)
            .join('; ')}`,
          metadata: { uploadId: upload.id, serviceSlug: input.serviceSlug, criticalReadings },
          link: `/dashboard/historial/${upload.id}`,
          entityType: 'VARIABLE_UPLOAD',
          entityId: upload.id,
          emailSubject: `Alerta crítica — ${criticalReadings.length} resultado(s) fuera de norma en ${service.nombre}`,
          emailTitle: `Resultados críticos detectados en tu evaluación de ${service.nombre}`,
          emailBodyHtml: buildCriticalEmailBody(criticalReadings, service.nombre),
          emailLinkLabel: 'Ver resultados',
        })
      }

      return { uploadId: upload.id, filasProcesadas: preparedRows.length, puestosAfectados: new Set(rows.map((r) => r.codigoPuesto)).size }
    },
```

Reemplázalo por:

```typescript
      const existingUpload = await repository.findUploadByDate(input.organizationId, service.id, input.fechaEvaluacion)

      const puestosAfectados = new Set(rows.map((r) => r.codigoPuesto)).size
      let uploadId: string
      let filasNuevas: number
      let filasActualizadas: number
      let filasOmitidas: { workPointCodigo: string; codigoVariable: string }[]
      let modo: 'nueva' | 'actualizacion'

      if (!existingUpload) {
        const upload = await repository.createUploadTransaction({
          organizationId: input.organizationId,
          serviceId: service.id,
          uploadedById: input.uploadedById,
          originalFile: input.filename,
          fechaEvaluacion: input.fechaEvaluacion,
          rows: preparedRows,
        })
        uploadId = upload.id
        filasNuevas = preparedRows.length
        filasActualizadas = 0
        filasOmitidas = []
        modo = 'nueva'
      } else {
        const result = await repository.updateUploadTransaction({
          uploadId: existingUpload.id,
          organizationId: input.organizationId,
          rows: preparedRows,
        })
        uploadId = existingUpload.id
        filasNuevas = result.filasNuevas
        filasActualizadas = result.filasActualizadas
        filasOmitidas = result.filasOmitidas
        modo = 'actualizacion'
      }

      await repository.createAuditLog({
        userId: input.uploadedById,
        organizationId: input.organizationId,
        action: 'VARIABLES_UPLOADED',
        metadata: { serviceSlug: input.serviceSlug, uploadId, filas: preparedRows.length, modo },
        ipAddress: input.ipAddress,
      })

      const omitidasSuffix =
        filasOmitidas.length > 0 ? ` (${filasOmitidas.length} fila(s) omitida(s): ya corregidas manualmente)` : ''
      await notifications.notify({
        type: 'CARGA_PROCESADA',
        recipientIds: [input.uploadedById],
        message: `Tu carga de ${preparedRows.length} lectura(s) para "${service.nombre}" fue procesada correctamente${omitidasSuffix}.`,
        link: `/dashboard/historial/${uploadId}`,
        entityType: 'VARIABLE_UPLOAD',
        entityId: uploadId,
      })

      // Agrupado por CARGA (no por fila individual): una sola notificación
      // crítica por esta carga con todas las variables fuera de norma, para
      // no saturar al cliente/admin si varias lecturas del mismo archivo
      // caen en rojo a la vez (ver diagnóstico Fase 0).
      if (criticalReadings.length > 0) {
        await notifications.notify({
          type: 'SEMAFORO_CRITICO',
          organizationId: input.organizationId,
          toAdmins: true,
          message: `${criticalReadings.length} resultado(s) crítico(s) en "${service.nombre}" para "${organization.nombre}": ${criticalReadings
            .map((r) => `${r.variable} en "${r.puesto}" (${r.valor} ${r.unidadMedida})`)
            .join('; ')}`,
          metadata: { uploadId, serviceSlug: input.serviceSlug, criticalReadings },
          link: `/dashboard/historial/${uploadId}`,
          entityType: 'VARIABLE_UPLOAD',
          entityId: uploadId,
          emailSubject: `Alerta crítica — ${criticalReadings.length} resultado(s) fuera de norma en ${service.nombre}`,
          emailTitle: `Resultados críticos detectados en tu evaluación de ${service.nombre}`,
          emailBodyHtml: buildCriticalEmailBody(criticalReadings, service.nombre),
          emailLinkLabel: 'Ver resultados',
        })
      }

      return {
        uploadId,
        filasProcesadas: preparedRows.length,
        puestosAfectados,
        filasNuevas,
        filasActualizadas,
        filasOmitidas,
      }
    },
```

- [ ] **Step 6: Typecheck completo**

```bash
cd /home/laortiz937/Documentos/sst-platform/backend
npm run typecheck
```

Expected: cero errores.

- [ ] **Step 7: Verificación directa contra la base de datos (sin navegador todavía)**

Confirma que el branching funciona antes del checkpoint visual del Task 3. Usa un script Node ad-hoc que llame al servicio directamente (ajusta `organizationId`/`serviceSlug`/`uploadedById` a valores reales de tu base de datos de desarrollo — consúltalos con una query rápida si no los tienes a mano):

```bash
cd /home/laortiz937/Documentos/sst-platform/backend
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const org = await prisma.organization.findFirst({ where: { nombre: 'Organizacion 1' } });
  const upload = await prisma.variableUpload.findFirst({ where: { organizationId: org.id }, orderBy: { fechaEvaluacion: 'desc' } });
  console.log('org:', org.id, 'fecha existente a re-cargar:', upload.fechaEvaluacion);
  await prisma.\$disconnect();
})();
"
```

Expected: imprime una fecha real ya usada por Organizacion 1 — este dato lo usarás en el checkpoint de Task 3 para forzar el modo "actualización" desde el navegador.

---

## Task 3: Checkpoint — verificación end-to-end en navegador

**Files:** ninguno (solo verificación).

- [ ] **Step 1: Typecheck completo (backend, confirmar una vez más tras ambos tasks)**

```bash
cd /home/laortiz937/Documentos/sst-platform/backend
npm run typecheck
```

Expected: cero errores.

- [ ] **Step 2: Carga para una fecha NUEVA — confirmar que el comportamiento es idéntico al actual**

Login como super-admin (`1000000001`), ir a Operación → Higiene Industrial, seleccionar una organización, subir un archivo CSV/Excel válido con una fecha que NUNCA se haya usado para esa organización+servicio. Confirmar: la carga se procesa (código 201), el mensaje de éxito muestra el conteo de filas/puestos igual que siempre, y aparece como una carga NUEVA en la pestaña Historial (sin mensaje de filas omitidas).

- [ ] **Step 3: Corregir una lectura manualmente, luego re-cargar la misma fecha**

En el dashboard de esa organización, usar el ícono de lápiz (`CorrectReadingModal`) para corregir manualmente UNA lectura de la carga recién creada en el Step 2 (anota qué puesto+variable corregiste). Luego, en el panel de carga, subir OTRO archivo con la MISMA fecha de evaluación, incluyendo un valor DISTINTO para esa misma fila (puesto+variable) que acabas de corregir, y valores distintos para al menos otra fila.

Confirmar en el dashboard:
- La lectura que corregiste manualmente sigue mostrando el valor que TÚ pusiste (no el del archivo re-cargado) y sigue con su etiqueta de "corregido".
- La otra fila SÍ cambió al nuevo valor del archivo.
- En Historial, sigue apareciendo UNA sola carga para esa fecha (no dos).

- [ ] **Step 4: Re-cargar con un puesto de trabajo nuevo**

Subir un tercer archivo para la MISMA fecha del Step 2/3, agregando una fila con un `codigo_puesto` que no estaba en los archivos anteriores. Confirmar que ese puesto nuevo aparece en el dashboard con su lectura, ligado a la MISMA carga (Historial sigue mostrando una sola carga para esa fecha, ahora con un puesto de trabajo más).

- [ ] **Step 5: Confirmar que un código de variable deprecado sigue rechazando el archivo completo**

Subir un archivo (para cualquier fecha, nueva o existente) que incluya una fila con `codigo_variable = ILU-04` (deprecado). Confirmar que la carga se rechaza por completo (HTTP 422, mensaje de variables desconocidas) — comportamiento idéntico al que ya existía para códigos inexistentes, sin cambios.
