# Rediseño visual del dashboard cliente (Hoja 1/2/3) — Higiene Industrial

**Goal:** Elevar la percepción de calidad de la vista cliente (Dashboard/Detalle
técnico/Análisis) extendiendo y mejorando el lenguaje visual ya construido
para el panel admin (2026-08-09, tarjetas KPI/badges/paleta de color),
rediseñando filtros y botones, y reemplazando la carga abrupta actual por
skeletons por componente.

**Alcance:** Solo frontend, vista cliente (`ClientDashboardTab.vue`,
`ClientDetalleTecnicoTab.vue`, `ClientAnalisisTab.vue`, `ClientStatCard.vue`,
y los componentes compartidos con admin que ya tienen la variante `enhanced`
— `SummaryCard.vue`, `DashboardRiskSections.vue`). No se toca backend, datos
almacenados, ni la lógica de qué se considera "fuera de norma".

## A) Lenguaje visual (tarjetas, badges, colores)

- `ClientDashboardTab.vue`/`ClientAnalisisTab.vue` pasan `enhanced` a
  `SummaryCard` (mismo tratamiento que admin: valor grande/negrita + unidad
  aparte + badge pill de estado).
- Se quita el gating `v-if="isAdmin"` de los puntos de color en la sección
  Recomendaciones de `DashboardRiskSections.vue` — el cliente los recibe
  también (antes solo admin).
- `ClientStatCard.vue` (hoy sin color de estado — un "33% cumplimiento" se ve
  igual que un "100%") gana un ícono con color de estado semáforo cuando
  tenga uno aplicable (cumplimiento global, variables en incumplimiento,
  riesgo/prioridad calculados) — reutiliza `SEMAPHORE_STYLES`.

## B) Filtros (Hoja 2, `ClientDetalleTecnicoTab.vue`)

7 `<select>` idénticos en una sola fila hoy. Se agrupan en 3 secciones
visuales dentro de la misma tarjeta de filtros ("Cuándo": fecha; "Dónde":
zona/sección/cargo/trabajador; "Qué": área/proceso), con una etiqueta de
grupo y separación clara. El botón "Limpiar filtros" pasa a ser una acción
secundaria visualmente distinta de los selects (no parte de la grilla).

## C) Botones

"Generar reporte" (Hoja 1) y "Limpiar filtros" (Hoja 2) migran a la misma
familia de estilos (primario sólido / secundario con borde) ya usada en el
resto de la app, con estados hover/disabled consistentes.

## D) Carga con skeletons por componente

**Decisión:** skeletons que imitan la forma real de cada sección (tarjeta,
fila de tabla), en vez de un overlay único de página completa o solo un
spinner — la carga inicial del dashboard y el "filtrando..." de Hoja 2 usan
el mismo patrón.

Componentes nuevos, en `frontend/src/components/ui/`:
- `SkeletonCard.vue` — rectángulo con shimmer del tamaño aproximado de una
  `SummaryCard`/`ClientStatCard` (props: `lines?: number` para controlar
  cuántas barras internas simula).
- `SkeletonTableRow.vue` — una fila de tabla con celdas shimmer, mismo
  número de columnas que la tabla real donde se usa.

Ambos comparten la animación shimmer vía una clase Tailwind reutilizable
(`animate-pulse` + gradiente, o keyframe custom si `animate-pulse` no da el
efecto deseado — se decide en implementación).

**Dónde se usan:**
- `ClientDashboardView.vue` (carga inicial, `status === 'loading'`): grilla
  de `SkeletonCard` en vez del texto "Cargando...".
- `ClientDetalleTecnicoTab.vue` (`filtering === true`): las filas de la
  tabla se reemplazan por `SkeletonTableRow` en vez del texto "Filtrando...".
- `ClientAnalisisTab.vue`: si en el futuro tiene su propio estado de carga
  independiente, mismo patrón — hoy carga junto con el dashboard completo,
  así que hereda el skeleton de `ClientDashboardView.vue`.

## Fuera de alcance

- No se toca la vista admin (ya rediseñada en la sesión anterior).
- No se agregan animaciones/transiciones más allá del shimmer de carga
  (ej. no se anima la entrada de cada tarjeta individualmente).
- No se cambia la lógica de negocio, cálculos, ni datos — solo presentación.
