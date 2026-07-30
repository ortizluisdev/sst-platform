# Importador del reporte Excel completo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que el admin suba el workbook completo `variablesdash1.xlsx` (Reporte Hoja 2) directamente, sin reformatear nada, y que la carga se procese siempre sin error — las filas sin variable equivalente en el catálogo o con resultado no numérico se omiten y se reportan, nunca bloquean el archivo completo.

**Architecture:** Detección automática de formato en `uploadVariables()`: si el archivo `.xlsx` contiene una hoja llamada "Reporte Hoja 2", se usa un parser nuevo (`parseVariableReportWorkbook`) en vez del parser plano existente. La fecha de evaluación pasa a ser la fecha de la subida (no se pide/parsea del Excel). Un único puesto de trabajo representa la evaluación completa por organización.

**Tech Stack:** Fastify + Prisma + ExcelJS (backend), Vue 3 + vue-i18n (frontend, cambio mínimo).

## Global Constraints

- Las filas sin variable equivalente en el catálogo, o con "Resultado" no numérico (`Number(resultado)` es `NaN`), se omiten y se reportan — **nunca rechazan el archivo completo**.
- La fecha de evaluación para este formato es `new Date()` (fecha de la subida) — no se pide al admin ni se parsea del Excel para este caso.
- El puesto de trabajo es uno solo por organización (código fijo `EVAL-GENERAL`), nombre derivado de "Empresa / Razón social" en Reporte Hoja 1 si está disponible.
- El emparejamiento de nombres usa EXCLUSIVAMENTE la tabla de equivalencias del spec (`docs/superpowers/specs/2026-07-30-report-workbook-import-design.md`) — no inventar reglas de coincidencia difusa (fuzzy matching) ni intentar resolver las filas ambiguas (alturas de iluminancia, percentiles).
- Sin suite de tests automatizada — verificación vía `npm run typecheck` + subir el archivo real del usuario contra el backend + verificación en navegador.
- No crear ningún commit sin que el usuario vea y confirme el mensaje exacto primero (regla de la sesión).

---

## Task 1: Migración Prisma — enum `VariableUploadOrigen` + campo `origen`

**Files:**
- Modify: `backend/prisma/schema.prisma` (nuevo enum + campo en `VariableUpload`)
- Create: `backend/prisma/migrations/<timestamp>_variable_upload_origen/migration.sql`

**Interfaces:**
- Produces: `VariableUpload.origen: 'CSV' | 'REPORTE_EXCEL'` (default `CSV`), usado por Task 3.

- [ ] **Step 1: Agregar el enum y el campo en `schema.prisma`**

Ubica el modelo `VariableUpload` en `backend/prisma/schema.prisma` (contiene los campos `id`, `organizationId`, `serviceId`, `uploadedById`, `originalFile`, `fechaEvaluacion`, `status`, `errorMessage`, `createdAt`). Agrega el campo `origen` justo después de `status`:

```prisma
  status          UploadStatus @default(PENDIENTE)
  /// De dónde vino la carga: CSV (formato plano de siempre) o
  /// REPORTE_EXCEL (el workbook completo de 6 hojas, Reporte Hoja 2) —
  /// para que Historial pueda distinguir el mecanismo de origen.
  origen          VariableUploadOrigen @default(CSV)
```

Agrega el enum nuevo justo antes de `enum UploadStatus` (o en cualquier punto entre enums existentes, siguiendo el orden ya usado en el archivo):

```prisma
enum VariableUploadOrigen {
  CSV
  REPORTE_EXCEL
}
```

- [ ] **Step 2: Generar el SQL de la migración**

```bash
cd /home/laortiz937/Documentos/sst-platform/backend
TS=$(date +%Y%m%d%H%M%S)
mkdir -p "prisma/migrations/${TS}_variable_upload_origen"
npx prisma migrate diff \
  --from-schema-datasource=prisma/schema.prisma \
  --to-schema-datamodel=prisma/schema.prisma \
  --script > "prisma/migrations/${TS}_variable_upload_origen/migration.sql"
cat "prisma/migrations/${TS}_variable_upload_origen/migration.sql"
```

Expected: un `ALTER TABLE variable_uploads ADD COLUMN origen ENUM('CSV', 'REPORTE_EXCEL') NOT NULL DEFAULT 'CSV'` (el nombre exacto de columna/tipo puede variar levemente, confirma que agrega la columna con default `CSV`, sin tocar ninguna otra tabla).

- [ ] **Step 3: Aplicar la migración**

```bash
cd /home/laortiz937/Documentos/sst-platform/backend
npx prisma db execute --file "prisma/migrations/${TS}_variable_upload_origen/migration.sql" --schema prisma/schema.prisma
npx prisma migrate resolve --applied "${TS}_variable_upload_origen"
```

Expected: sin errores; confirmación `Migration ... marked as applied.`

- [ ] **Step 4: Regenerar cliente + typecheck**

```bash
cd /home/laortiz937/Documentos/sst-platform/backend
npx prisma generate
npm run typecheck
```

Expected: ambos sin errores.

- [ ] **Step 5: Verificar en la base de datos**

```bash
cd /home/laortiz937/Documentos/sst-platform/backend
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const one = await prisma.variableUpload.findFirst();
  console.log('origen de una carga existente (debe ser CSV por default):', one ? one.origen : 'sin cargas');
  await prisma.\$disconnect();
})();
"
```

Expected: `origen de una carga existente (debe ser CSV por default): CSV`.

---

## Task 2: Backend — parser `parseVariableReportWorkbook` + tabla de equivalencias

**Files:**
- Create: `backend/src/utils/variableReportWorkbookParser.ts`

**Interfaces:**
- Consumes: `ExcelJS.Workbook` ya cargado (no un buffer — evita parsear el archivo dos veces; Task 3 carga el workbook una sola vez y lo pasa aquí).
- Produces: `parseVariableReportWorkbook(workbook: ExcelJS.Workbook): ReportWorkbookParseResult` con `{ empresa: string | null; rows: { codigoVariable: string; valor: number }[]; omitidas: { nombre: string; motivo: 'sin_variable_equivalente' | 'valor_no_numerico' }[] }`, usado por Task 3.

- [ ] **Step 1: Crear el archivo del parser**

Crea `backend/src/utils/variableReportWorkbookParser.ts` con este contenido exacto:

```typescript
import type ExcelJS from 'exceljs'

export interface ReportWorkbookRow {
  codigoVariable: string
  valor: number
}

export interface ReportWorkbookOmittedRow {
  nombre: string
  motivo: 'sin_variable_equivalente' | 'valor_no_numerico'
}

export interface ReportWorkbookParseResult {
  empresa: string | null
  rows: ReportWorkbookRow[]
  omitidas: ReportWorkbookOmittedRow[]
}

const CATEGORIAS = ['Iluminación', 'Sonido', 'Estrés térmico', 'Radiación UV', 'Vibración'] as const

/** Alias: nombre tal como aparece en "Reporte Hoja 2" → código real del
 * catálogo, para los casos donde el texto no coincide exacto (ver spec
 * 2026-07-30-report-workbook-import-design.md, tabla de equivalencias).
 * Todo lo que no está aquí se busca en NOMBRE_EXACTO_POR_CATEGORIA. */
const ALIAS_POR_CATEGORIA: Record<string, Record<string, string>> = {
  Iluminación: {
    'Deslumbramiento unificado': 'ILU-03',
    'Luminancia superficie': 'ILU-11',
    'Reflectancia pared (vertical)': 'ILU-09',
  },
  Sonido: {
    'Nivel pico (C)': 'RUI-02',
    'Atenuación de protector': 'RUI-10',
  },
  'Estrés térmico': {
    'Temperatura del aire': 'TER-01',
    'Bulbo húmedo natural': 'TER-06',
    'Voto medio previsto': 'TER-04',
    Insatisfechos: 'TER-09',
  },
  'Radiación UV': {},
  Vibración: {
    'Exposición diaria mano-brazo': 'VIB-06',
    'Exposición diaria cuerpo entero': 'VIB-08',
    'Valor de dosis de vibración': 'VIB-09',
  },
}

/** Nombre exacto de "Reporte Hoja 2" → código de catálogo, por categoría
 * (coinciden tal cual, sin necesitar alias). */
const NOMBRE_EXACTO_POR_CATEGORIA: Record<string, Record<string, string>> = {
  Iluminación: {
    'Iluminancia horizontal media': 'ILU-01',
    Uniformidad: 'ILU-02',
    'Reflectancia piso': 'ILU-08',
    'Reflectancia techo': 'ILU-10',
    'Iluminancia cilíndrica': 'ILU-07',
  },
  Sonido: {
    'Nivel continuo equivalente (A)': 'RUI-05',
    'Nivel de exposición diaria': 'RUI-06',
    'Dosis de ruido': 'RUI-04',
    'Tiempo de exposición': 'RUI-03',
  },
  'Estrés térmico': {
    'Temperatura de globo': 'TER-05',
    'Velocidad del aire': 'TER-08',
    'Humedad relativa': 'TER-02',
    'Temperatura radiante media': 'TER-07',
    'Índice WBGT': 'TER-03',
    'Tasa metabólica': 'TER-10',
    'Aislamiento de vestimenta': 'TER-11',
  },
  'Radiación UV': {
    'Irradiancia efectiva': 'RUV-02',
    'Exposición radiante efectiva': 'RUV-03',
    'Índice UV': 'RUV-01',
    'Tiempo máximo de exposición': 'RUV-04',
  },
  Vibración: {
    'Aceleración ponderada mano-brazo': 'VIB-05',
    'Aceleración ponderada cuerpo entero': 'VIB-07',
    'Frecuencia dominante': 'VIB-03',
    'Tiempo de exposición': 'VIB-04',
  },
}

/**
 * Lee la hoja "Reporte Hoja 2" de un workbook ya cargado. No lanza error
 * si hay filas sin variable equivalente o con resultado no numérico — se
 * reportan en `omitidas`, nunca bloquean el resto de la carga (el
 * objetivo es que el archivo real del cliente siempre se pueda subir).
 */
export function parseVariableReportWorkbook(workbook: ExcelJS.Workbook): ReportWorkbookParseResult {
  const empresa = readEmpresa(workbook)
  const hoja2 = workbook.getWorksheet('Reporte Hoja 2')
  if (!hoja2) {
    throw new Error('El archivo no contiene la hoja "Reporte Hoja 2".')
  }

  const rows: ReportWorkbookRow[] = []
  const omitidas: ReportWorkbookOmittedRow[] = []
  let categoriaActual: string | null = null
  let esFilaDeEncabezado = false
  let terminado = false

  hoja2.eachRow((row) => {
    if (terminado) return
    const primeraCelda = String(row.getCell(1).value ?? '').trim()

    if ((CATEGORIAS as readonly string[]).includes(primeraCelda)) {
      categoriaActual = primeraCelda
      esFilaDeEncabezado = true // la próxima fila es "Variable/Símbolo/.../Estado", se salta
      return
    }
    if (esFilaDeEncabezado) {
      esFilaDeEncabezado = false
      return
    }
    if (!categoriaActual) return // filas de título/metadata antes de la primera categoría

    const nombre = primeraCelda
    if (!nombre) {
      terminado = true // fila en blanco = fin de la tabla de datos (antes de la leyenda)
      return
    }

    const resultadoRaw = row.getCell(3).value
    const valor = typeof resultadoRaw === 'number' ? resultadoRaw : Number(String(resultadoRaw ?? '').trim())

    const codigo = ALIAS_POR_CATEGORIA[categoriaActual]?.[nombre] ?? NOMBRE_EXACTO_POR_CATEGORIA[categoriaActual]?.[nombre]

    if (!codigo) {
      omitidas.push({ nombre, motivo: 'sin_variable_equivalente' })
      return
    }
    if (Number.isNaN(valor)) {
      omitidas.push({ nombre, motivo: 'valor_no_numerico' })
      return
    }

    rows.push({ codigoVariable: codigo, valor })
  })

  return { empresa, rows, omitidas }
}

function readEmpresa(workbook: ExcelJS.Workbook): string | null {
  const hoja1 = workbook.getWorksheet('Reporte Hoja 1')
  if (!hoja1) return null
  const valor = hoja1.getCell('B5').value
  const texto = String(valor ?? '').trim()
  return texto.length > 0 ? texto : null
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /home/laortiz937/Documentos/sst-platform/backend
npm run typecheck
```

Expected: cero errores (este archivo no tiene consumidor todavía — Task 3 lo conecta).

---

## Task 3: Backend — wiring en `uploadVariables()`

**Files:**
- Modify: `backend/src/modules/variables/variables.service.ts`
- Modify: `backend/src/modules/variables/variables.repository.ts` (agregar `origen` al `createUploadTransaction`)

**Interfaces:**
- Consumes: `parseVariableReportWorkbook` de Task 2; `VariableUploadOrigen` de Task 1 (vía `@prisma/client`).
- Produces: `uploadVariables()` sigue devolviendo `{ uploadId, filasProcesadas, puestosAfectados, filasNuevas, filasActualizadas, filasOmitidas }`, donde `filasOmitidas` ahora puede incluir tanto el formato antiguo (`{ workPointCodigo, codigoVariable }`, de la re-carga del sub-proyecto 1) como el nuevo (`{ nombre, motivo }`, de este sub-proyecto) — son dos causas de omisión distintas, cada carga solo produce uno de los dos formatos según cuál camino tomó.

- [ ] **Step 1: Agregar `origen` al `createUploadTransaction` del repositorio**

En `backend/src/modules/variables/variables.repository.ts`, ubica `createUploadTransaction` (el `input` type y el `tx.variableUpload.create({ data: {...} })` dentro de él). Agrega `origen` al tipo del parámetro `input` y al `data` de creación:

```typescript
    async createUploadTransaction(input: {
      organizationId: string
      serviceId: string
      uploadedById: string
      originalFile: string
      fechaEvaluacion: Date
      origen: 'CSV' | 'REPORTE_EXCEL'
      rows: {
        codigoPuesto: string
        nombrePuesto: string
        areaPlanta: string
        procesoActividad: string
        jornada: WorkShift
        definitionId: string
        valor: number
        semaforo: 'VERDE' | 'AMARILLO' | 'ROJO'
      }[]
    }) {
      return prisma.$transaction(async (tx) => {
        const upload = await tx.variableUpload.create({
          data: {
            organizationId: input.organizationId,
            serviceId: input.serviceId,
            uploadedById: input.uploadedById,
            originalFile: input.originalFile,
            fechaEvaluacion: input.fechaEvaluacion,
            origen: input.origen,
            status: 'PROCESADO',
          },
        })
```

(El resto de la función, desde `const workPointIdByCodigo = ...` en adelante, no cambia.)

- [ ] **Step 2: Agregar el import de ExcelJS y del nuevo parser en `variables.service.ts`**

En `backend/src/modules/variables/variables.service.ts`, ubica la línea de imports (línea 1-5):

```typescript
import type { PrismaClient, VariableMeasurementType, WorkShift } from '@prisma/client'
import { createVariablesRepository } from './variables.repository.js'
import { parseVariableFile, VariableFileParseError } from '../../utils/variableFileParser.js'
import { calculateSemaphore, type SemaphoreThresholds } from '../../utils/semaphore.js'
import { createNotificationService } from '../notifications/notifications.service.js'
```

Reemplázala por (agrega `ExcelJS` y el nuevo parser):

```typescript
import type { PrismaClient, VariableMeasurementType, WorkShift } from '@prisma/client'
import ExcelJS from 'exceljs'
import { createVariablesRepository } from './variables.repository.js'
import { parseVariableFile, VariableFileParseError } from '../../utils/variableFileParser.js'
import { parseVariableReportWorkbook } from '../../utils/variableReportWorkbookParser.js'
import { calculateSemaphore, type SemaphoreThresholds } from '../../utils/semaphore.js'
import { createNotificationService } from '../notifications/notifications.service.js'
```

- [ ] **Step 3: Reemplazar el bloque de parseo de archivo en `uploadVariables()`**

Ubica este bloque (dentro de `uploadVariables()`, justo después de la validación de `orgService`):

```typescript
      let rows
      try {
        rows = await parseVariableFile(input.fileBuffer, input.filename)
      } catch (err) {
        if (err instanceof VariableFileParseError) {
          await notifications.notify({
            type: 'CARGA_CON_ERROR',
            recipientIds: [input.uploadedById],
            toAdmins: true,
            message: `La carga de "${input.filename}" para "${organization.nombre}" falló: ${err.message}`,
            metadata: { filename: input.filename, serviceSlug: input.serviceSlug, error: err.message },
          })
          throw new VariablesError('INVALID_FILE', err.message)
        }
        throw err
      }
```

Reemplázalo por:

```typescript
      const esXlsx = !input.filename.toLowerCase().endsWith('.csv')
      let rows: { codigoPuesto: string; nombrePuesto: string; areaPlanta: string; procesoActividad: string; jornada: string; codigoVariable: string; valor: number }[]
      let origen: 'CSV' | 'REPORTE_EXCEL' = 'CSV'
      let fechaEvaluacionFinal = input.fechaEvaluacion
      let filasOmitidasFormato: { nombre: string; motivo: 'sin_variable_equivalente' | 'valor_no_numerico' }[] = []

      try {
        let esReporteExcel = false
        let workbookCargado: ExcelJS.Workbook | null = null
        if (esXlsx) {
          workbookCargado = new ExcelJS.Workbook()
          await workbookCargado.xlsx.load(input.fileBuffer as any)
          esReporteExcel = workbookCargado.worksheets.some((ws) => ws.name === 'Reporte Hoja 2')
        }

        if (esReporteExcel && workbookCargado) {
          const parsed = parseVariableReportWorkbook(workbookCargado)
          const nombrePuesto = parsed.empresa ? `Evaluación general — ${parsed.empresa}` : 'Evaluación general'
          rows = parsed.rows.map((r) => ({
            codigoPuesto: 'EVAL-GENERAL',
            nombrePuesto,
            areaPlanta: 'General',
            procesoActividad: 'Evaluación higiénica general',
            jornada: 'DIURNA',
            codigoVariable: r.codigoVariable,
            valor: r.valor,
          }))
          origen = 'REPORTE_EXCEL'
          // Trunca a medianoche (solo la fecha, no la hora exacta) — así,
          // si se sube este mismo formato dos veces el mismo día, la
          // restricción única (organización+servicio+fecha) hace que la
          // segunda carga actualice la primera en vez de duplicarla,
          // igual que ya pasa con el formato CSV plano.
          fechaEvaluacionFinal = new Date(new Date().toISOString().slice(0, 10))
          filasOmitidasFormato = parsed.omitidas
        } else {
          rows = await parseVariableFile(input.fileBuffer, input.filename)
        }
      } catch (err) {
        if (err instanceof VariableFileParseError) {
          await notifications.notify({
            type: 'CARGA_CON_ERROR',
            recipientIds: [input.uploadedById],
            toAdmins: true,
            message: `La carga de "${input.filename}" para "${organization.nombre}" falló: ${err.message}`,
            metadata: { filename: input.filename, serviceSlug: input.serviceSlug, error: err.message },
          })
          throw new VariablesError('INVALID_FILE', err.message)
        }
        throw err
      }
```

- [ ] **Step 4: Usar `fechaEvaluacionFinal` en vez de `input.fechaEvaluacion` para el resto de la función**

Busca las 2 apariciones restantes de `input.fechaEvaluacion` en `uploadVariables()` (dentro de la llamada a `repository.findUploadByDate` y dentro de `repository.createUploadTransaction`) y reemplázalas por `fechaEvaluacionFinal`.

- [ ] **Step 5: Pasar `origen` a `createUploadTransaction` y agregar `filasOmitidasFormato` a la respuesta final**

Ubica la llamada a `repository.createUploadTransaction` dentro de la rama `if (!existingUpload)` de `uploadVariables()` (ya existente desde el sub-proyecto de re-carga) y agrega `origen: origen` a su objeto de argumentos:

```typescript
        const upload = await repository.createUploadTransaction({
          organizationId: input.organizationId,
          serviceId: service.id,
          uploadedById: input.uploadedById,
          originalFile: input.filename,
          fechaEvaluacion: fechaEvaluacionFinal,
          origen,
          rows: preparedRows,
        })
```

Ubica el `return` final de `uploadVariables()` (el que arma `{ uploadId, filasProcesadas, puestosAfectados, filasNuevas, filasActualizadas, filasOmitidas }`) y cambia la última línea para incluir las omitidas por formato:

```typescript
      return {
        uploadId,
        filasProcesadas: preparedRows.length,
        puestosAfectados,
        filasNuevas,
        filasActualizadas,
        filasOmitidas: [...filasOmitidas, ...filasOmitidasFormato],
      }
```

- [ ] **Step 6: Typecheck**

```bash
cd /home/laortiz937/Documentos/sst-platform/backend
npm run typecheck
```

Expected: cero errores. Si el tipo de `filasOmitidas` (el que ya devuelve `updateUploadTransaction` del sub-proyecto de re-carga) no admite unión con el nuevo shape `{ nombre, motivo }`, ajusta la anotación de tipo del array combinado a `({ workPointCodigo: string; codigoVariable: string } | { nombre: string; motivo: 'sin_variable_equivalente' | 'valor_no_numerico' })[]` explícitamente en el `return`.

**Nota importante:** como `fechaEvaluacionFinal` se trunca a medianoche (Step 3), si alguien sube el formato Reporte Excel DOS veces el mismo día para la misma organización, la segunda carga entra por la rama de actualización (`updateUploadTransaction`, ya construida en el sub-proyecto de re-carga) — en ese caso `filasOmitidas` puede contener una MEZCLA de ambos formatos de omisión (`{ workPointCodigo, codigoVariable }` de lecturas ya corregidas, y `{ nombre, motivo }` de filas sin variable equivalente). Esto es válido y esperado — el frontend (Task 4) debe manejar ambas formas.

- [ ] **Step 7: Subir el archivo real del usuario contra el backend (verificación funcional antes del checkpoint final)**

Requiere que `backend` y `frontend` estén corriendo (`npm run dev` en cada uno, o los servidores de preview ya activos). Este script busca la organización "Organizacion 1" de los datos de prueba, hace login como super-admin y sube el archivo real:

```bash
cd /home/laortiz937/Documentos/sst-platform
node -e "
(async () => {
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documentNumber: '1000000001', password: 'superAdmin123*' }),
  });
  const cookies = loginRes.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');

  const { PrismaClient } = require('./backend/node_modules/@prisma/client');
  const prisma = new PrismaClient();
  const org = await prisma.organization.findFirst({ where: { nombre: 'Organizacion 1' } });
  await prisma.\$disconnect();

  const fs = require('fs');
  const buffer = fs.readFileSync('/home/laortiz937/Descargas/variablesdash1 (1).xlsx');
  const form = new FormData();
  form.append('fechaEvaluacion', '2026-07-30');
  form.append('file', new Blob([buffer]), 'variablesdash1 (1).xlsx');

  const res = await fetch(\`http://localhost:3000/api/admin/organizations/\${org.id}/services/higiene-industrial/variables/upload\`, {
    method: 'POST',
    headers: { Cookie: cookies },
    body: form,
  });
  console.log(JSON.stringify({ status: res.status, body: await res.json() }, null, 2));
})();
"
```

Expected: `status: 201` (no 422), `filasNuevas` reflejando ~36 lecturas, y `filasOmitidas` con ~9 entradas del formato `{ nombre, motivo }` (las 3 alturas de iluminancia vertical, los 3 percentiles L10/L50/L90, y las 3 filas de resultado no numérico: bandas de octava, régimen trabajo/descanso, irradiancia UV-A/B/C).

---

## Task 4: Frontend — mostrar `filasOmitidas` + actualizar texto de ayuda

**Files:**
- Modify: `frontend/src/services/dashboard.service.ts` (tipo `UploadResult`)
- Modify: `frontend/src/components/dashboard/VariableUploadForm.vue`
- Modify: `frontend/src/i18n/locales/es.json`
- Modify: `frontend/src/i18n/locales/en.json`

**Interfaces:**
- Consumes: la respuesta ampliada de `uploadVariables()` (Task 3), específicamente el nuevo shape de `filasOmitidas` con `{ nombre, motivo }`.

- [ ] **Step 1: Ampliar `UploadResult` en `dashboard.service.ts`**

Ubica la interfaz `UploadResult` (líneas 99-103):

```typescript
export interface UploadResult {
  uploadId: string
  filasProcesadas: number
  puestosAfectados: number
}
```

Reemplázala por (la unión cubre las dos causas de omisión posibles — lecturas ya corregidas del sub-proyecto de re-carga, y filas sin variable equivalente/valor no numérico de este sub-proyecto; una carga puede mezclar ambas si es una actualización de un Reporte Excel re-subido el mismo día):

```typescript
export interface UploadResult {
  uploadId: string
  filasProcesadas: number
  puestosAfectados: number
  filasOmitidas?: (
    | { workPointCodigo: string; codigoVariable: string }
    | { nombre: string; motivo: 'sin_variable_equivalente' | 'valor_no_numerico' }
  )[]
}
```

- [ ] **Step 2: Actualizar el texto de ayuda y mostrar las filas omitidas en `VariableUploadForm.vue`**

Ubica la línea del texto de ayuda (línea 52-54):

```vue
    <p class="mb-4 text-xs text-navy-700 opacity-70">
      {{ t('dashboard.uploadForm.columnsHint') }}
    </p>
```

Déjala igual (el texto en sí se actualiza en el paso de i18n, no en la plantilla). Ubica el bloque del resultado exitoso (líneas 74-76):

```vue
    <p v-if="lastResult" class="mt-3 rounded-sm border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
      {{ t('dashboard.uploadForm.successPrefix') }}{{ lastResult.filasProcesadas }}{{ t('dashboard.uploadForm.successRows') }}{{ lastResult.puestosAfectados }}{{ t('dashboard.uploadForm.successSuffix') }}
    </p>
```

Reemplázalo por (agrega el bloque de filas omitidas justo después):

```vue
    <p v-if="lastResult" class="mt-3 rounded-sm border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
      {{ t('dashboard.uploadForm.successPrefix') }}{{ lastResult.filasProcesadas }}{{ t('dashboard.uploadForm.successRows') }}{{ lastResult.puestosAfectados }}{{ t('dashboard.uploadForm.successSuffix') }}
    </p>
    <div v-if="lastResult?.filasOmitidas?.length" class="mt-3 rounded-sm border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
      <p class="font-semibold">{{ t('dashboard.uploadForm.omittedHeading') }}</p>
      <ul class="mt-1 list-disc pl-5">
        <li v-for="(omitida, i) in lastResult.filasOmitidas" :key="i">
          <template v-if="'nombre' in omitida">
            {{ omitida.nombre }} — {{ t(`dashboard.uploadForm.omittedReason.${omitida.motivo}`) }}
          </template>
          <template v-else>
            {{ omitida.workPointCodigo }} / {{ omitida.codigoVariable }} — {{ t('dashboard.uploadForm.omittedReason.ya_corregida') }}
          </template>
        </li>
      </ul>
    </div>
```

- [ ] **Step 3: Agregar las claves de i18n en `es.json`**

En `frontend/src/i18n/locales/es.json`, ubica el bloque `dashboard.uploadForm` (busca `"columnsHint":`). Actualiza `columnsHint` y agrega las claves nuevas junto a las existentes:

```json
      "columnsHint": "Columnas requeridas: codigo_puesto, nombre_puesto, area_planta, proceso_actividad, jornada, codigo_variable, valor. También acepta el reporte completo de Excel (Reporte Hoja 2).",
      "omittedHeading": "Filas omitidas (no se cargaron):",
      "omittedReason": {
        "sin_variable_equivalente": "sin variable equivalente en el catálogo",
        "valor_no_numerico": "valor no numérico",
        "ya_corregida": "ya estaba corregida manualmente"
      },
```

- [ ] **Step 4: Mismo bloque en `en.json`**

```json
      "columnsHint": "Required columns: codigo_puesto, nombre_puesto, area_planta, proceso_actividad, jornada, codigo_variable, valor. Also accepts the full Excel report (Reporte Hoja 2).",
      "omittedHeading": "Skipped rows (not loaded):",
      "omittedReason": {
        "sin_variable_equivalente": "no matching catalog variable",
        "valor_no_numerico": "non-numeric value",
        "ya_corregida": "already manually corrected"
      },
```

- [ ] **Step 5: Verificar paridad de claves**

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

- [ ] **Step 6: Typecheck frontend**

```bash
cd /home/laortiz937/Documentos/sst-platform/frontend && npx vue-tsc -b
```

Expected: cero errores.

---

## Task 5: Checkpoint — typecheck completo + verificación en navegador con el archivo real

**Files:** ninguno (solo verificación).

- [ ] **Step 1: Typecheck completo**

```bash
cd /home/laortiz937/Documentos/sst-platform/backend && npm run typecheck
cd /home/laortiz937/Documentos/sst-platform/frontend && npx vue-tsc -b
```

Expected: cero errores en ambos.

- [ ] **Step 2: Subir el archivo real desde el navegador**

Login como super-admin (`1000000001`), ir a Operación → Higiene Industrial, seleccionar cualquier organización de prueba, subir `/home/laortiz937/Descargas/variablesdash1 (1).xlsx` desde el formulario existente (cualquier fecha en el selector — se ignora para este formato). Confirmar:
- La carga se procesa sin error (mensaje de éxito, no de error).
- Aparece el bloque de "Filas omitidas" con ~9 entradas y su motivo.
- El dashboard de esa organización (categoría por categoría) muestra los valores del Excel — ej. Iluminación: Iluminancia horizontal media = 485 lux.
- El puesto de trabajo "Evaluación general — SAFEHAND S.A.S." aparece en el detalle por punto de trabajo de cada categoría.

- [ ] **Step 3: Confirmar `origen` en base de datos**

```bash
cd /home/laortiz937/Documentos/sst-platform/backend
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const upload = await prisma.variableUpload.findFirst({ where: { originalFile: { contains: 'variablesdash1' } }, orderBy: { createdAt: 'desc' } });
  console.log('origen:', upload ? upload.origen : 'no encontrada');
  await prisma.\$disconnect();
})();
"
```

Expected: `origen: REPORTE_EXCEL`.

- [ ] **Step 4: Confirmar que una carga CSV plana sigue funcionando exactamente igual**

Subir cualquier archivo CSV plano ya usado antes en esta sesión (ej. `plantilla_carga_higiene_industrial.csv`) — confirmar que se procesa exactamente como siempre (sin bloque de "Filas omitidas" si no aplica, `origen: CSV` en la base de datos).
