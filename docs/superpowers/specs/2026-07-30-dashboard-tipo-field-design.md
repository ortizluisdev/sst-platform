# Exponer `tipo` (M/C/I) en la respuesta del dashboard (Paso 3, sub-proyecto 2 de 4)

**Fecha:** 2026-07-30
**Estado:** Aprobado
**Sub-proyecto:** 2 de 4 (ver "Contexto y descomposición" abajo)

## Contexto y descomposición

Continuación de Paso 3 (importador de Excel + endpoints de lectura + generación de reportes), descompuesto en 4 sub-proyectos:

- **1:** re-carga de Excel con actualización en el mismo lote — completo (commits `0a77ae9`, `40f8d1e`).
- **2 (este documento):** endpoints de lectura para Resumen/Detalle técnico.
- **3:** Análisis (Hoja 3) — pendiente.
- **4:** generación de Reporte Hoja 1/Hoja 2 — pendiente, depende de 1-3.

## Hallazgo que redujo el alcance

Al explorar `getDashboard()` (ya existente) se confirmó que casi todo lo que Resumen y Detalle técnico necesitan ya está expuesto: nombre, unidad, límites, `normativaRef`, promedio, y un estado de 4 niveles (`VERDE`/`AMARILLO`/`ROJO`/`SIN_DATOS`) ya calculado. No se necesita ningún endpoint nuevo.

Dos decisiones ya tomadas que acotan el alcance a un solo cambio:

1. **"Estado" del Excel (Cumple/No cumple/Informativo) se deriva 1:1 del semáforo existente**: VERDE→Cumple, ROJO→No cumple, AMARILLO→Informativo. Sin campo ni cálculo nuevo en el backend — es un mapeo de presentación para cuando exista un consumidor (sub-proyecto 4, reportes).
2. **Lo único que falta realmente es `tipo` (M/C/I)**: existe en `VariableDefinition` (agregado en la reestructuración del catálogo) pero no se expone en la respuesta del dashboard.

## Alcance de este sub-proyecto

Agregar `tipo` a la respuesta de dos funciones en `backend/src/modules/variables/variables.service.ts`:

- `buildVariableSummary()` (línea ~471): agregar `tipo` al tipo del parámetro `definition` y al objeto retornado.
- `buildEmptyVariableSummary()` (línea ~539): mismo agregado, para las tarjetas placeholder SIN_DATOS.

**No se toca el repositorio.** Las queries que ya traen `definition` (`findReadingsByUpload`, `findDefinitionsByService` en `variables.repository.ts`) no usan `select` para acotar campos — ya traen la fila completa de `VariableDefinition`, incluido `tipo`. Solo falta pasarlo al objeto de respuesta final.

**Sin cambios de frontend.** Agregar un campo nuevo a la respuesta JSON no rompe ningún consumidor existente (nadie lo lee todavía); queda disponible para cuando el sub-proyecto 4 (reportes) lo necesite.

## Fuera de alcance

- Cualquier endpoint nuevo — no hace falta.
- El mapeo de "Estado" a etiquetas Cumple/No cumple/Informativo en el frontend — se hará cuando exista un consumidor real (sub-proyecto 4).
- Análisis (Hoja 3) y generación de reportes — sub-proyectos 3 y 4.

## Verificación

Sin suite de tests automatizada (convención ya establecida) — `npm run typecheck` + verificación manual:

1. Confirmar que `tipo` aparece en la respuesta de `GET /api/dashboard/:serviceSlug` (o el endpoint admin equivalente) para variables con datos cargados, con el valor correcto por variable (ej. `MEDICION` para Iluminancia horizontal media).
2. Confirmar que `tipo` aparece también en el estado SIN_DATOS (organización sin cargas) para variables activas del catálogo.
3. Confirmar que variables deprecadas (`isActive: false`) siguen sin aparecer en ninguna de las dos respuestas — comportamiento ya existente, sin cambios.
