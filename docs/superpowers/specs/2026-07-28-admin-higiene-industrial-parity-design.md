# Panel operativo admin (Higiene Industrial): encabezado de contexto + corrección de lecturas

## Contexto y hallazgo de auditoría

Se pidió inicialmente "llevar la profundidad de la vista cliente a la vista admin", con 3 capturas de referencia (2 mockups de cliente + descripción de la vista admin actual) que muestran 5 variables (Iluminación, Sonido, Estrés Térmico/WBGT, Radiación UV, Vibración), tabla de detalle con columnas Parámetro/Resultado/Tipo (M/C/I)/Ref-Norma/Instrumento, KPIs (Total mediciones, Riesgo global promedio, Alertas activas), panel de Recomendaciones, mapas de calor renderizados, e incertidumbre expandida (U, GUM).

**Auditoría del código real** (no de las capturas) encontró que:

- La vista admin (`HigieneIndustrialPanel.vue`) y la vista cliente (`ClientDashboardView.vue`) **ya comparten el mismo componente** `DashboardShell.vue` (con sus hijos `SummaryCard`, `ComplianceRing`, `TrendChart`, `ComparisonTable`, `CategoryTab`). No hay duplicación de sistema de diseño entre las dos vistas — admin ya tiene el mismo nivel de detalle que cliente para lo que existe hoy.
- El catálogo real de variables (`backend/prisma/seed.ts`) tiene **3 categorías** (Iluminación, Ruido, Confort Térmico — 12 variables en total), no 5. "WBGT" existe como una de las 4 sub-variables de Confort Térmico, no como categoría propia. Seguridad Vial, Riesgo Mecánico y Locativo, Mantenimiento Basado en Riesgo y Modelado Científico del Comportamiento Social son servicios reales del catálogo, pero sin dashboard implementado (paneles "en construcción", Fase C).
- No existe en el modelo de datos ningún campo `tipo` (Medición/Cálculo/Inspección), `instrumento`, ni incertidumbre expandida (U, GUM).
- No existen los KPIs "Total mediciones / Riesgo global promedio / Alertas activas" ni un panel de "Recomendaciones" — ni en cliente ni en admin.
- El mapa de calor ya está reconocido como pendiente en el propio código, con un placeholder honesto (`dashboard.category.heatmapPlaceholder`: *"disponible cuando se definan coordenadas de planta"*).
- No existe ningún cliente "Safehand" en el seed; es un nombre de ejemplo del mockup.

**Conclusión**: las capturas describen una propuesta de producto más ambiciosa que lo que existe hoy en cualquiera de las dos vistas — no una brecha admin-vs-cliente. Construir eso significaría agregar categorías nuevas con normas reales (no inventadas), campos nuevos al modelo de datos, KPIs y un motor de recomendaciones, en ambas vistas. Es un proyecto sustancialmente más grande, y no es lo que se decidió construir en esta iteración.

## Alcance decidido para esta iteración

1. **Encabezado de contexto operativo** en el panel admin — puramente visual, sin cambios de datos.
2. **Corrección de lecturas** — nueva capacidad (no existía en ningún lado): permitir al admin corregir el valor de una lectura puntual ya procesada, antes de que quede como el dato "vigente" que ve el cliente.

Explícitamente **fuera de alcance** de esta iteración (quedan para un proyecto aparte si se decide construirlos): las 5 categorías del mockup, campos Tipo/Instrumento/Incertidumbre, KPIs de resumen, panel de Recomendaciones, mapas de calor renderizados, branding con logo de cliente.

## Diseño

### A. Encabezado de contexto operativo

En `HigieneIndustrialPanel.vue`, arriba de la tarjeta del selector de empresa: un encabezado "Panel operativo — Higiene Industrial — {nombre de la empresa activa}", con el mismo estilo navy/sky ya usado en el resto del admin (mismo patrón visual que el banner "Zona de administración" de fases anteriores). La empresa activa se resuelve del mismo `organizations` ya inyectado (`operacionOrganizations`) buscando por `props.organizationId`. Sin cambios de datos ni de backend.

### B. Corrección de lecturas

**Enfoque**: ícono de edición inline por celda dentro de la tabla ya existente de `CategoryTab.vue` (no una vista aparte, no un modo de edición masiva — ver comparación de enfoques discutida y descartada por YAGNI).

**Modelo de datos** (migración aditiva sobre `VariableReading`):

```prisma
model VariableReading {
  // ...campos existentes sin cambios...
  isCorrected      Boolean   @default(false) @map("is_corrected")
  correctedAt      DateTime? @map("corrected_at")
  correctedById    String?   @map("corrected_by_id")
  correctionReason String?   @map("correction_reason") @db.Text

  correctedBy User? @relation("VariableReadingCorrectedBy", fields: [correctedById], references: [id], onDelete: SetNull)
}
```

Agregar la relación inversa en `User` (`correctedReadings VariableReading[]`, misma convención que `variableUploads`).

El valor anterior a la corrección **no** se duplica en `VariableReading` — vive en `AuditLog.metadata` (`{ readingId, definitionId, workPointId, oldValue, newValue, reason }`), siguiendo el mismo patrón ya usado para el resto de acciones sensibles del sistema.

Nuevo valor de enum: `AuditAction.VARIABLE_READING_CORRECTED`.

**Permiso nuevo**: `platform.variables.correct` — separado de `platform.variables.upload`, aunque hoy ambos los tenga el mismo rol (super-admin/adminsystem vía wildcard `*`). Se agrega al catálogo de `seed.ts` como entrada nueva. Separar el permiso de corrección del de carga es barato ahora (una entrada más en el seed) y caro de introducir después si en algún momento se quiere que quien sube datos no sea necesariamente quien puede sobrescribir una lectura ya reportada al cliente.

**Validación de negocio (a nivel de servicio, no de esquema)**: `correctionReason` es nullable en el esquema (una lectura sin corregir no tiene razón), pero el service **exige** que venga con longitud mínima de 10 caracteres antes de aplicar el `PATCH`, y rechaza la operación si viene vacío o corto — con código `422` y mensaje de campo, mismo patrón que el resto de validaciones Zod del proyecto. Motivo: es un dato de higiene industrial que puede terminar en una auditoría regulatoria; una corrección sin motivo registrado es exactamente el tipo de hueco que un auditor externo encuentra primero.

**Backend** (`backend/src/modules/variables/`):

- `variables.schema.ts`: nuevo `correctReadingSchema` — `{ valor: number, reason: string().min(10, ...) }`, más el schema de params `{ organizationId, serviceSlug, readingId }`.
- `variables.repository.ts`: `findReadingById(readingId)` (incluye `definition` para los umbrales, y `upload.organizationId` para la verificación anti-IDOR), `updateReading(readingId, data)`.
- `variables.service.ts`: nuevo método `correctReading(readingId, organizationId, serviceSlug, valor, reason, correctedByUserId, ipAddress)`:
  1. Busca la lectura; si no existe o su `upload.organizationId` no coincide con `organizationId` → `READING_NOT_FOUND` (404) — misma protección que ya usa el resto del módulo, nunca confía en el organizationId que no sea el validado en la ruta.
  2. Recalcula `semaforo` con `calculateSemaphore()` (el mismo util que ya usa la carga original) contra los límites de la `VariableDefinition` de esa lectura.
  3. Actualiza la fila (`valor`, `semaforo`, `isCorrected: true`, `correctedAt`, `correctedById`, `correctionReason`).
  4. Registra `AuditLog` con `VARIABLE_READING_CORRECTED` y el valor anterior en `metadata`.
- `variables.controller.ts` / `variables.routes.ts`: `PATCH /api/admin/organizations/:organizationId/services/:serviceSlug/readings/:readingId`, protegido por `requirePermission('platform.variables.correct')`.

**Frontend**:

- `DashboardShell.vue` gana dos props opcionales, retrocompatibles (mismo patrón que `hideSidebar`/`tabs` de la Fase C — el cliente nunca los pasa, así que su vista no cambia):
  - `editableReadings?: boolean` (default `false`)
  - `correctReading?: (readingId: string, valor: number, reason: string) => Promise<void>`
  
  Ambos se reenvían tal cual a `CategoryTab.vue`.
- `CategoryTab.vue`: cuando `editableReadings` es `true`, cada celda con lectura muestra un ícono de lápiz (además del punto de semáforo ya existente) que abre el modal de corrección para esa lectura puntual (identificada por `workPointCodigo` + `definitionId`, ya presentes en la fila pivotada).
- `CorrectReadingModal.vue` (nuevo, mismo estilo visual que `SuspendUserModal.vue`): muestra punto de trabajo, variable, valor actual; campos "nuevo valor" (numérico) y "motivo de la corrección" (textarea, obligatorio, mínimo 10 caracteres validado también en el frontend antes de enviar — VeeValidate/Zod, igual que el resto del proyecto); botones Cancelar/Guardar.
- `HigieneIndustrialPanel.vue`: pasa `editable-readings` (siempre `true`, porque solo admin monta este componente — la ruta ya está protegida por permiso a nivel de router) y una función `correctReading` que llama al nuevo endpoint y luego reutiliza `loadDashboard()` (mismo patrón que `@uploaded="loadDashboard"` de la carga de CSV) — así el resumen, comparativo, tendencia e historial se refrescan solos sin lógica adicional.
- Indicador visible: cuando `reading.isCorrected` es `true`, la celda muestra una etiqueta pequeña "(editado)" junto al valor, con tooltip mostrando `correctionReason` — sin necesitar una consulta aparte al log de auditoría para ese caso de uso común.

### Qué NO cambia

- La vista cliente (`ClientDashboardView.vue`) no se toca — los props nuevos de `DashboardShell`/`CategoryTab` son opcionales y ella nunca los pasa.
- No hay estado de borrador/publicado — la corrección se refleja de inmediato en ambas vistas, sin aprobación intermedia (decisión explícita, ver Q&A de brainstorming).
- No se agregan rutas nuevas ni cambios al sidebar admin más allá del encabezado de contexto (sección A).
- No se tocan las 5 categorías/campos/KPIs/recomendaciones del mockup — quedan fuera de alcance explícitamente.

## Plan de verificación

- Typecheck backend + frontend después de cada sub-bloque (igual que el resto de la sesión).
- Migración Prisma aditiva, aplicada contra la BD local (mismo flujo no-interactivo ya usado toda la sesión).
- Verificación en navegador (desktop + mobile) como super-admin:
  - Encabezado de contexto muestra la empresa activa correctamente y cambia al usar el selector.
  - Corregir una lectura real: el semáforo se recalcula, la etiqueta "(editado)" aparece, el tooltip muestra el motivo, el resumen/comparativo/tendencia reflejan el nuevo valor tras la recarga.
  - Intentar guardar sin motivo o con motivo menor a 10 caracteres → error 422 visible en el modal, no se aplica el cambio.
  - Confirmar que la vista cliente (login como usuario cliente) no muestra el ícono de edición en ningún momento.
- Sin commit ni push hasta confirmación explícita (regla de toda la sesión).
