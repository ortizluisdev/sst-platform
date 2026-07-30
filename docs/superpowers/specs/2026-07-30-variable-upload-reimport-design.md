# Re-carga de Excel con actualización en el mismo lote (Paso 3, sub-proyecto 1 de 4)

**Fecha:** 2026-07-30
**Estado:** Aprobado, pendiente de plan de implementación
**Sub-proyecto:** 1 de 4 (ver "Contexto y descomposición" abajo)

## Contexto y descomposición

El cliente final pidió, en un prompt largo ("Paso 3"), tres cosas a la vez: un importador de Excel para carga masiva, endpoints de lectura para las vistas Resumen/Detalle técnico/Análisis, y generación de los Reporte Hoja 1 (ejecutivo) y Reporte Hoja 2 (anexo técnico). Esto se descompuso en 4 sub-proyectos independientes, en este orden (2 y 4 dependen de 1; 4 también depende de 3):

- **1 (este documento):** capacidad de re-cargar un Excel para una fecha de evaluación que ya tiene datos, actualizando esas lecturas en el mismo lote en vez de duplicar.
- **2:** endpoints de lectura para Resumen/Detalle técnico (mayormente ya existen — extensión menor para exponer el campo Estado que pide Reporte Hoja 2).
- **3:** Análisis (Hoja 3) — diseño nuevo: IGHO, matriz riesgo×cumplimiento, tendencia 6 meses, prioridad de intervención.
- **4:** generación de Reporte Hoja 1 (ejecutivo) y Reporte Hoja 2 (anexo técnico) — depende de 1, 2 y 3.

## Decisiones previas de esta sesión que aplican aquí

- El catálogo real (45 variables activas + 4 deprecadas: ILU-04, RUI-01, VIB-01, VIB-02) ya está migrado en `backend/prisma/seed.ts` — ver commit `f51db66` y el spec `2026-07-29-variable-catalog-restructure-design.md`.
- Estrategia de conflicto acordada: una carga masiva **nunca sobrescribe** una lectura ya marcada `isCorrected=true` — la omite y lo reporta como advertencia, sin bloquear el resto del lote.
- El archivo de carga sigue el mismo formato plano ya usado hoy (columnas `codigo_puesto, nombre_puesto, area_planta, proceso_actividad, jornada, codigo_variable, valor`) — el workbook `variablesdash1.xlsx` de 6 hojas es la fuente del catálogo/diseño, no la plantilla de carga.

## Alcance de este sub-proyecto (1)

Hoy, cada carga de archivo crea un `VariableUpload` completamente nuevo e independiente (`variables.repository.ts:createUploadTransaction`) — nunca actualiza lecturas de una carga anterior. Este sub-proyecto agrega:

1. Un `@@unique([organizationId, serviceId, fechaEvaluacion])` en `VariableUpload` — verificado contra la base de datos actual: 0 cargas duplicadas por fecha hoy, se puede aplicar sin conflictos.
2. Detección automática en `uploadVariables()`: si ya existe una carga para (organización, servicio, fecha), entra en modo actualización en vez de crear una carga nueva. Mismo formulario de carga ya existente (selector de archivo + fecha) — sin UI nueva.
3. En modo actualización, por cada fila del archivo:
   - Si existe una lectura previa para ese puesto+variable dentro de la carga, y está `isCorrected=true` → se omite, se cuenta como advertencia (no se escribe nada).
   - Si existe y no está corregida → se actualiza `valor` y se recalcula `semaforo` con el mismo `calculateSemaphore()` ya usado hoy.
   - Si no existe una lectura previa para ese puesto+variable (fila nueva agregada al archivo re-subido) → se inserta como lectura nueva, ligada a la carga existente.
4. La validación de variables desconocidas o deprecadas **no cambia**: sigue rechazando el archivo completo (no fila por fila) si aparece un código fuera del catálogo activo — comportamiento ya existente en `uploadVariables()` (usa `findDefinitionsByService`, que ya filtra `isActive: true`, excluyendo automáticamente los 4 códigos deprecados sin código nuevo).
5. La respuesta de la carga pasa de `{ uploadId, filasProcesadas, puestosAfectados }` a incluir el desglose: `filasNuevas`, `filasActualizadas`, `filasOmitidas` (con el detalle de puesto+variable omitidos por ya estar corregidos).
6. El `AuditLog` de `VARIABLES_UPLOADED` gana un campo `modo: 'nueva' | 'actualizacion'` en su metadata.

## Fuera de alcance (explícitamente diferido)

- Endpoints de lectura para Resumen/Detalle técnico/Análisis — sub-proyectos 2 y 3.
- Generación de Reporte Hoja 1 / Hoja 2 — sub-proyecto 4.
- Cualquier UI nueva para elegir "actualizar carga existente" explícitamente (Enfoque 2, descartado) — la detección es automática por fecha.
- Remapear o fusionar lecturas de los 4 códigos deprecados con sus sucesores — ya decidido en el sub-proyecto anterior que esto no se hace nunca.

## Modelo de datos

**`VariableUpload`** (Prisma) — un índice único nuevo, sin campos nuevos:

```prisma
model VariableUpload {
  // ...campos existentes sin cambios...

  @@unique([organizationId, serviceId, fechaEvaluacion])
}
```

Migración aditiva: `ALTER TABLE variable_uploads ADD CONSTRAINT ... UNIQUE (organization_id, service_id, fecha_evaluacion)`. Sin migración de datos (ya se verificó que no hay duplicados que la violen).

## Backend — `uploadVariables()` (extensión, mismo endpoint)

Flujo actual (sin cambios): validar organización/servicio/contrato → parsear archivo → validar variables contra catálogo activo (rechaza archivo completo si hay desconocidas) → calcular semáforo por fila.

Flujo nuevo, después de la validación:

```
existingUpload = buscar VariableUpload por (organizationId, serviceId, fechaEvaluacion)

si NO existe:
  comportamiento actual sin cambios (crear carga nueva vía createUploadTransaction)

si existe:
  para cada fila preparada (con definitionId ya resuelto):
    buscar lectura existente por (uploadId=existingUpload.id, workPointId, definitionId)
      (workPointId se resuelve igual que hoy, vía el mismo upsert por organizationId+codigo;
      la búsqueda es inequívoca por diseño — VariableReading ya tiene
      @@unique([uploadId, workPointId, definitionId]), así que es un findUnique directo)
    si existe la lectura Y isCorrected:
      agregar a filasOmitidas, no tocar nada
    si existe la lectura Y NO está corregida:
      actualizar valor + semaforo recalculado
      agregar a filasActualizadas
    si NO existe la lectura:
      crear lectura nueva ligada a existingUpload.id
      agregar a filasNuevas

  registrar AuditLog VARIABLES_UPLOADED con metadata.modo = 'actualizacion'
  devolver { uploadId: existingUpload.id, filasNuevas, filasActualizadas, filasOmitidas }
```

Las notificaciones (`CARGA_PROCESADA`, `SEMAFORO_CRITICO`) se mantienen igual, ajustando el mensaje para reflejar cuántas filas se omitieron por ya estar corregidas cuando aplique.

## Verificación

Sin suite de tests automatizada (convención ya establecida) — `npm run typecheck` (backend) + verificación manual en navegador:

1. Cargar un archivo para una fecha NUEVA — confirmar que el comportamiento es idéntico al actual (carga nueva, sin cambios visibles).
2. Corregir manualmente una lectura vía `CorrectReadingModal` en una carga existente. Re-cargar un archivo para la MISMA fecha con un valor distinto en esa misma fila — confirmar que la lectura corregida NO cambia, y que el resto de las filas del archivo sí se actualizan.
3. Re-cargar un archivo para una fecha existente que incluye un puesto de trabajo nuevo (no estaba en la carga original) — confirmar que se inserta como lectura nueva dentro de la misma carga, sin crear una carga aparte.
4. Confirmar que subir un archivo con un código de variable deprecado (ej. `ILU-04`) sigue rechazando el archivo completo, igual que con un código inexistente.
5. Confirmar en la pestaña Historial que no aparecen cargas duplicadas por fecha tras una re-carga.
