# Pestaña "Detalle técnico" en la vista cliente (solo lectura)

**Fecha:** 2026-07-30
**Estado:** Aprobado
**Alcance:** primera de 3 pestañas del rediseño de la vista cliente (Dashboard/Detalle técnico/Análisis) — solo "Detalle técnico" en este cambio. Dashboard y Análisis quedan como placeholder "Próximamente", a construir en rondas separadas una vez resueltas sus piezas faltantes (KPIs globales, fórmulas de Hoja 3).

## Contexto

El archivo fuente `variablesdash1.xlsx` define 3 vistas de cliente: Dashboard (Hoja 1), Detalle técnico (Hoja 2) y Análisis (Hoja 3), cada una con su propio reporte descargable (excepto Análisis). Este cambio construye únicamente "Detalle técnico", la única de las 3 con todos sus datos ya persistidos en BD.

**Restricción explícita del usuario: la vista admin (`HigieneIndustrialPanel.vue`, `DashboardShell.vue`, y todos los componentes de pestañas que usa hoy) no se toca.** Como esos componentes son compartidos entre cliente y admin, este cambio construye un árbol de componentes nuevo y paralelo, exclusivo para el cliente.

## Alcance

### Backend (extensión menor, mismo patrón ya usado para `tipo`)

Agregar `instrumento: string | null` e `incertidumbre: string | null` a la respuesta de `getDashboard()` — ya existen en `VariableDefinition`, faltan en `buildVariableSummary()`/`buildEmptyVariableSummary()` (`backend/src/modules/variables/variables.service.ts`). Sin cambios de repositorio (las queries ya traen la fila completa de `VariableDefinition`).

### Frontend — árbol nuevo, aislado de admin

- `frontend/src/components/dashboard/client/ClientDashboardShell.vue` (nuevo): reemplaza el uso directo de `DashboardShell` en `ClientDashboardView.vue`. Navegación de 3 pestañas fijas: Dashboard, Detalle técnico, Análisis.
- `frontend/src/components/dashboard/client/ClientDetalleTecnicoTab.vue` (nuevo): por cada categoría de `dashboard.categories`, un bloque con:
  - Encabezado de categoría (ícono + nombre, reutilizando `categoryIcon.ts`/`categoryLabel.ts`).
  - Tabla: Parámetro (nombre) | Resultado (promedio + unidad) | Tipo (badge M/C/I) | Incertidumbre (U, o "Pendiente" si es `null`) | Norma/Ref.
  - Metadato de instrumento al pie del bloque (toma el `instrumento` de la primera variable con dato no nulo de esa categoría; si ninguna lo tiene, muestra "Pendiente" — nunca se inventa).
- `frontend/src/components/dashboard/client/ClientDashboardTab.vue` (nuevo, placeholder): tarjeta "Próximamente" — reemplaza temporalmente lo que sería la pestaña Dashboard.
- `frontend/src/components/dashboard/client/ClientAnalisisTab.vue` (nuevo, placeholder): tarjeta "Próximamente" — reemplaza temporalmente lo que sería Análisis.
- Botones de exportación en "Detalle técnico": CSV (Blob, mismo patrón que `ReportesTab.vue`) y PDF (`window.print()`, con clases `print:hidden` en los controles) — cero librerías nuevas.

### Reutilizado sin modificar (piezas genéricas, sin lógica de negocio compartida con admin)

`SummaryCard.vue`, `TrendChart.vue`, `ComplianceRing.vue`, `semaphoreStyles.ts`, `categoryIcon.ts`, `categoryLabel.ts`, `formatSummaryValue.ts`, `formatDate.ts`.

### Explícitamente NO tocado

`DashboardShell.vue`, `ResumenTab.vue`, `CategoryTab.vue`, `ComparativoTab.vue`, `HistorialTab.vue`, `ReportesTab.vue`, `ComparisonTable.vue`, `DashboardSidebar.vue`, `dashboardTabs.ts`, `HigieneIndustrialPanel.vue`, y cualquier ruta/endpoint exclusivo de admin.

## Fuera de alcance

- Pestañas "Dashboard" y "Análisis" con contenido real — sus propias rondas.
- Reporte Hoja 1 descargable — depende de Dashboard.
- Cualquier cambio a la vista admin.

## Verificación

Sin suite de tests automatizada — `npm run typecheck` (backend) + `npx vue-tsc -b` (frontend) + verificación manual en navegador:

1. Confirmar que la vista admin (`HigieneIndustrialPanel.vue`) se ve y funciona exactamente igual que antes (sin cambios visibles).
2. Confirmar que la vista cliente muestra las 3 pestañas nuevas, con "Detalle técnico" mostrando las 5 categorías con datos reales.
3. Confirmar que `instrumento`/`incertidumbre` aparecen correctamente (o "Pendiente" si son `null`).
4. Confirmar que los botones de exportar CSV/PDF funcionan.
5. Confirmar desktop + mobile.
