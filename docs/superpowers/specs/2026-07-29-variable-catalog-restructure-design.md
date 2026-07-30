# Catálogo de variables — reestructuración a 5 categorías + Tipo/Instrumento/Incertidumbre

**Fecha:** 2026-07-29
**Estado:** Aprobado, pendiente de plan de implementación
**Sub-proyecto:** A de 5 (ver "Contexto y descomposición" abajo)

## Contexto y descomposición

El cliente final (quien compra la app a través del usuario de esta sesión) pidió un rediseño del dashboard de Higiene Industrial que coincida con 3 mockups de referencia: una página de KPIs/mapas de calor/comparativo, y una página de "Detalle técnico por variable" con columnas Parámetro/Resultado/Tipo (Medición/Cálculo/Inspección)/Ref-Norma e Instrumento por categoría.

Este pedido se descompuso en 5 sub-proyectos independientes, cada uno con su propio spec y plan:

- **A (este documento):** reestructurar el catálogo real a las 5 categorías del mockup, agregando los campos Tipo/Instrumento/Incertidumbre — es la base de la que dependen las demás piezas.
- **B:** KPIs globales (Total mediciones, Cumplen/No cumplen, Riesgo global, Alertas activas) + Comparativo vs. norma ampliado.
- **C:** mapas de calor como carga de imagen (el admin sube una imagen ya generada externamente; el sistema solo la muestra, no la calcula).
- **D:** Recomendaciones/No conformidades con prioridad y seguimiento de estado.
- **E:** Alertas activas con estado (Abierta/En seguimiento), distinto del sistema de notificaciones ya existente.

La vista de cliente "Detalle técnico por variable" (página 2 de los mockups) que consume los campos de este sub-proyecto A se diseñará en un sub-proyecto posterior, una vez el catálogo esté reestructurado.

## Alcance de este sub-proyecto (A)

1. El catálogo real de Higiene Industrial pasa de 3 categorías (Iluminación, Ruido, Confort Térmico) a 5 (Iluminación, Sonido, Estrés Térmico, Radiación UV, Vibración):
   - `Ruido` → renombrada a `Sonido` (mismas 4 variables, sin cambios de nombre/unidad/límites).
   - `Confort Térmico` → renombrada a `Estrés Térmico` (mismas 4 variables: Temperatura del aire, Humedad relativa, WBGT, Índice PMV — se mueven juntas, sin fragmentar).
   - `Iluminación`: sin cambios.
   - `Radiación UV` (nueva): 4 variables — Índice UV, Irradiancia efectiva, Exposición radiante, Tiempo máx. de exposición.
   - `Vibración` (nueva): 4 variables — Mano-brazo (A(8)), Cuerpo entero (A(8)), Frecuencia dominante, Tiempo de exposición.
2. `VariableDefinition` gana 3 campos nuevos, todos opcionales: `tipo` (enum Medición/Cálculo/Inspección), `instrumento` (texto), `incertidumbre` (texto).
3. Estos 3 campos quedan **pendientes** (`null`) para las 20 variables resultantes — no se inventan datos técnicos (instrumento real, tipo de medición, incertidumbre expandida) sin que el cliente final los provea.
4. El admin puede completar estos 3 campos después, desde una vista nueva y sencilla de edición del catálogo — no existe hoy ninguna pantalla para editar `VariableDefinition`.
5. La reestructuración de categorías **no requiere migrar ninguna lectura ya cargada**: `categoria` vive únicamente en `VariableDefinition`, no en `VariableReading` — renombrar la categoría de una definición existente es un simple `UPDATE` sobre esa fila, las lecturas históricas siguen apuntando al mismo `definitionId` sin cambios.

## Fuera de alcance (explícitamente diferido)

- La vista de cliente "Detalle técnico por variable" (consumir/mostrar estos 3 campos nuevos) — sub-proyecto posterior.
- Expandir el catálogo al nivel de detalle completo de los mockups (8 parámetros en Iluminación, 5-6 en Radiación UV/Vibración) — se mantiene el nivel de detalle actual (4 parámetros por categoría) para las 5 categorías.
- Los sub-proyectos B, C, D, E (KPIs, mapas de calor, recomendaciones, alertas) — specs independientes, después de A.

## Modelo de datos

**`VariableDefinition`** (Prisma) — 3 campos nuevos, todos opcionales:

```prisma
tipo          VariableMeasurementType?
instrumento   String?  @map("instrumento") @db.VarChar(255)
incertidumbre String?  @map("incertidumbre") @db.VarChar(100)
```

Nuevo enum:

```prisma
enum VariableMeasurementType {
  MEDICION
  CALCULO
  INSPECCION
}
```

**Migración de datos** (parte de la misma migración de Prisma, ejecutada como script de datos tras el `ALTER TABLE`):

```sql
UPDATE variable_definitions SET categoria = 'Sonido' WHERE categoria = 'Ruido';
UPDATE variable_definitions SET categoria = 'Estrés Térmico' WHERE categoria = 'Confort Térmico';
```

**8 filas nuevas** (vía `seed.ts`, mismo patrón que las 12 actuales), con `tipo`/`instrumento`/`incertidumbre` en `NULL`:

| Categoría | Código | Nombre |
|---|---|---|
| Radiación UV | RUV-01 | Índice UV |
| Radiación UV | RUV-02 | Irradiancia efectiva |
| Radiación UV | RUV-03 | Exposición radiante |
| Radiación UV | RUV-04 | Tiempo máx. de exposición |
| Vibración | VIB-01 | Mano-brazo (A(8)) |
| Vibración | VIB-02 | Cuerpo entero (A(8)) |
| Vibración | VIB-03 | Frecuencia dominante |
| Vibración | VIB-04 | Tiempo de exposición |

Cada fila nueva necesita también `unidadMedida`, `comparisonType`, `limiteMin`/`limiteMax`, `toleranciaAlerta` — igual que las 12 existentes, siguiendo el mismo patrón (`RANGE`/`MAX`/`MIN` según corresponda a cada parámetro), usando unidades técnicas estándar de cada dominio (UV Index, W/m², J/m², horas para Radiación UV; m/s² y horas para Vibración) — sin inventar límites normativos específicos: se marcan como el resto de campos técnicos pendientes hasta que el cliente final los confirme, **excepto** `unidadMedida` (necesaria para que la fila sea funcional) y `comparisonType` (requerido por el schema, se usa `RANGE` como valor neutro hasta tener el límite real).

**Caso borde verificado:** si se cargan lecturas para estas 8 variables antes de que el admin complete `limiteMin`/`limiteMax`, `calculateSemaphore()` (`backend/src/utils/semaphore.ts`) ya devuelve `AMARILLO` (estado neutro/de alerta) cuando los límites son `null`, para cualquier `comparisonType` — comportamiento ya existente en el proyecto, no requiere ningún cambio para este sub-proyecto.

## Backend

### Nuevo permiso

`platform.variables.manage` — separado de `platform.variables.upload`/`platform.variables.correct` ya existentes, siguiendo el mismo criterio de separación de responsabilidades ya aplicado en este proyecto (barato de separar ahora, caro después).

### `GET /api/admin/services/:serviceSlug/variables`

- Gated por `platform.variables.manage`.
- Devuelve las variables del servicio agrupadas por categoría: `{ categoria: string, variables: { id, codigo, nombre, unidadMedida, tipo, instrumento, incertidumbre }[] }[]`.

### `PATCH /api/admin/services/:serviceSlug/variables/:variableId`

- Gated por `platform.variables.manage`.
- Body: `{ tipo?: 'MEDICION' | 'CALCULO' | 'INSPECCION', instrumento?: string, incertidumbre?: string }` — todos opcionales, al menos uno requerido (mismo patrón `.refine` que `updateOrganizationSchema`).
- Actualiza únicamente estos 3 campos — nunca `categoria`/`codigo`/`nombre`/límites normativos, que son datos técnicos fijos del catálogo, no editables desde este endpoint.

## Frontend

Nueva vista `VariableCatalogView.vue`:

- Accesible desde la vista "Servicios" existente — un enlace/botón junto a la fila de "Higiene Industrial" (ej. "Ver catálogo de variables").
- Tabla agrupada por las 5 categorías, una fila por variable: Código, Nombre, Unidad (solo lectura) + 3 campos editables (Tipo: `<select>` con las 3 opciones, Instrumento: texto libre, Incertidumbre: texto libre) y un botón "Guardar" por fila.
- Cuando `tipo`/`instrumento`/`incertidumbre` son `null`, se muestra la etiqueta "Pendiente" en gris en vez de un campo vacío — hace obvio qué falta completar sin necesitar leer el código.

## Verificación

Sin suite de tests automatizada (convención ya establecida) — `npm run typecheck` (backend y frontend) + verificación manual en navegador:

1. Confirmar en la base de datos que las 12 variables existentes tienen la categoría correcta (Sonido/Estrés Térmico/Iluminación sin cambios) y que las lecturas ya cargadas (ej. de Organizacion 1) siguen mostrándose correctamente en el dashboard existente, sin ninguna migración de datos de lecturas.
2. Confirmar que las 8 variables nuevas aparecen en el catálogo (aunque sin lecturas todavía, mostrarán el estado SIN_DATOS ya implementado).
3. Admin abre el catálogo de variables desde Servicios, ve las 20 variables agrupadas en 5 categorías, completa Tipo/Instrumento/Incertidumbre de una variable de prueba, guarda, recarga la página y confirma que persistió.
4. Variables sin completar muestran "Pendiente".
