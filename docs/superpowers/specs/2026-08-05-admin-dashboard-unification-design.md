# Uniformización del Dashboard Admin (Higiene Industrial + Seguridad Vial)

**Fecha:** 2026-08-05
**Estado:** Aprobado
**Alcance:** primer sub-proyecto de la uniformización de la vista Admin (segunda pasada, después de la de Cliente ya mergeada). Cubre SOLO el Dashboard Admin (tarjetas de métricas + badge de cumplimiento + dona) y la tabla "Detalle" de Seguridad Vial (paridad visual de colores, no funcionalidad nueva). Configuración por servicio y CRUD real de variables/indicadores quedan para specs separadas — ver "Fuera de alcance".

## Contexto

El pedido original ("Uniformización de la vista ADMIN") describía 4 subsistemas independientes con perfiles de riesgo muy distintos: Dashboard (bajo riesgo, reutilización de componentes existentes), Configuración de Seguridad Vial (requiere schema nuevo en backend — no existe ningún equivalente de `OrganizationCategoryConfig`/catálogos para este servicio), CRUD real de variables/indicadores (no existe en NINGUNO de los dos servicios hoy — ambos son upload masivo + corrección puntual por campo, feature nueva completa), y "tabla Detalle" (que al investigar resultó no ser una pieza aparte, ya vive dentro de las hojas 2/3 de Seguridad Vial). Se decompuso explícitamente con el usuario: esta spec cubre solo el primero, de menor riesgo, que sienta el patrón de reutilización que las siguientes 2 sub-pasadas van a heredar.

**Hallazgo clave que corrige un supuesto de la exploración inicial:** `DashboardShell.vue` (que arma el Dashboard de Higiene Industrial) ya es un componente **compartido** entre Admin y Cliente — no hay una versión separada para cada rol, solo difieren en props opcionales (`hideSidebar`, `editableReadings`, `orgLabel`, `organizationId`). El obstáculo real no es reconciliar dos arquitecturas de shell — es que Seguridad Vial no usa `DashboardShell` en absoluto: `RoadSafetyDashboardTab.vue` reimplementa a mano (con `div`s + Tailwind) tarjetas de conteo, sin el sistema de semáforo (`CategoryCardStatus`/`SEMAPHORE_STYLES`) que Higiene ya tiene resuelto en `SummaryCard.vue`/`ComplianceRing.vue`.

**Verificado antes de diseñar (no asumido de la pasada anterior):**
- `RoadSafetyHoja1Tab.vue` es de solo lectura (24 pasos PESV) — no tiene endpoint `PATCH`, no se le agrega edición.
- `RoadSafetyHoja2Tab.vue` **ya tiene** edición inline con lápiz + modal de corrección (`RoadSafetyCorrectFieldModal.vue`) — la funcionalidad de "Detalle editable" ya existe, no hay que construirla. Lo que sí tiene: un mapa de colores hardcodeado (`OK/ALERTA/VENCIDO` → clases Tailwind a mano) duplicando `SEMAPHORE_STYLES` en vez de reutilizarlo.
- No existe ningún umbral definido de negocio para clasificar `cumplimientoPesvGlobal` (%) en VERDE/AMARILLO/ROJO — se le preguntó explícitamente al usuario en vez de inventarlo. Aprobado: **≥80% VERDE, 60-79% AMARILLO, <60% ROJO** — convención adoptada para esta feature, documentada en el código como tal (no es un corte de la Resolución 40595, que no define esta escala).

## Decisiones (aprobadas)

1. **Solo la tarjeta de `cumplimientoPesvGlobal` usa `SummaryCard` con semáforo.** Los conteos (`totalVehiculos`, `totalConductores`, `totalRutas`) y las 4 tarjetas de alertas (vencidos/enAlerta/licenciasVencidas/enAlertaConductor) son datos correctos tal como están — no tienen semántica de "cumplimiento" y forzarlos dentro de `SummaryCard` (que exige `estado`/`cumplimientoPct`) inventaría un semáforo donde no existe. Se quedan como tarjetas simples, ya visualmente consistentes con el resto del sistema (mismo `border/rounded-lg/p-4`).
2. **La dona de cumplimiento (`ComplianceRing`) se arma agregando los 24 pasos PESV por su propio campo `cumplimiento`** (`Cumple`/`Parcial`/`No cumple`, dato que ya existe y ya se muestra en Hoja 1) → `verde`/`amarillo`/`rojo`. No es un umbral nuevo — es una re-agregación de una clasificación que el dato ya trae, evitando depender del corte 80/60 (que solo aplica al badge de la tarjeta individual).
3. **`RoadSafetyHoja2Tab.vue` reemplaza su mapa de colores hardcodeado por `SEMAPHORE_STYLES`** (mismos colores hoy — `OK`≈`VERDE`, `ALERTA`≈`AMARILLO`, `VENCIDO`≈`ROJO` — una sola fuente de verdad, sin cambiar texto ni lógica de negocio). `RoadSafetyHoja1Tab.vue` y `RoadSafetyHoja4Tab.vue` no se tocan (son de solo lectura por diseño del dominio).
4. **La duplicación del banner en `HigieneIndustrialPanel.vue`** (`SectionTitleBanner` manual para `recomendaciones`/`configuracion`, fuera de `DashboardShell`) y **la duplicación `CategoryConfigModal.vue`/`HigieneConfigTab.vue`** quedan fuera de esta spec — pertenecen a la sub-pasada de "Configuración por servicio" (tocan los mismos archivos).

## Diseño

### `RoadSafetyDashboardTab.vue`

Nueva función pura (ubicación: `frontend/src/utils/roadSafetyCompliance.ts`, nuevo archivo):

```ts
import type { CategoryCardStatus } from '@/types/dashboard'
import type { RoadSafetyPesvPaso } from '@/types/roadSafety'

/** Convención adoptada para esta feature (2026-08) — NO es un corte de la
 * Resolución 40595/2022, que no define esta escala. Confirmado con el
 * usuario en vez de inventado: ≥80% VERDE, 60-79% AMARILLO, <60% ROJO. */
export function classifyPesvCompliance(pct: number | null): CategoryCardStatus {
  if (pct == null) return 'SIN_DATOS'
  if (pct >= 80) return 'VERDE'
  if (pct >= 60) return 'AMARILLO'
  return 'ROJO'
}

/** Re-agrega los pasos PESV por su propio campo `cumplimiento` (ya
 * clasificado — 'Cumple'/'Parcial'/'No cumple', tipo real de
 * RoadSafetyPesvPaso — no requiere ningún umbral nuevo) para alimentar
 * ComplianceRing — mismo shape que `GlobalCompliance` (pct/verde/amarillo/
 * rojo/total). */
export function buildPesvGlobalCompliance(pasos: RoadSafetyPesvPaso[]) {
  const verde = pasos.filter((p) => p.cumplimiento === 'Cumple').length
  const amarillo = pasos.filter((p) => p.cumplimiento === 'Parcial').length
  const rojo = pasos.filter((p) => p.cumplimiento === 'No cumple').length
  const total = verde + amarillo + rojo
  const pct = total > 0 ? Math.round((verde / total) * 100) : 0
  return { pct, verde, amarillo, rojo, total }
}
```

`RoadSafetyDashboardTab.vue` cambia:
- Carga adicional: los 24 `pasos` de `hoja1.pasos` (ya vienen en la respuesta de `getRoadSafetyHoja1`, no requiere endpoint nuevo).
- La tarjeta de `cumplimientoPesvGlobal` pasa de un `div` a mano a `<SummaryCard :titulo="..." :valor="cumplimientoPesvGlobal != null ? `${cumplimientoPesvGlobal}%` : t('roadSafety.noData')" :cumplimiento-pct="cumplimientoPesvGlobal ?? 0" :estado="classifyPesvCompliance(cumplimientoPesvGlobal)" />`.
- Se agrega `<ComplianceRing :compliance="buildPesvGlobalCompliance(hoja1.pasos)" />` junto a la tarjeta (mismo layout que `ResumenTab.vue` — tarjetas + dona lado a lado).
- Las 3 tarjetas de conteo y las 4 de alertas NO cambian de componente (siguen siendo `div`s simples) — solo se revisa que compartan el mismo espaciado que ya tienen hoy (ya lo comparten, sin cambio visual).

### `RoadSafetyHoja2Tab.vue`

Reemplazar:
```ts
const CUMPLIMIENTO_CLASS: Record<string, string> = {
  OK: 'bg-emerald-50 text-emerald-700',
  ALERTA: 'bg-amber-50 text-amber-700',
  VENCIDO: 'bg-red-50 text-red-700',
}
```
por un mapeo a `SEMAPHORE_STYLES` (`OK→VERDE`, `ALERTA→AMARILLO`, `VENCIDO→ROJO`), usando `styles.bg`/`styles.text` en vez de las clases literales — mismo resultado visual, una sola fuente de verdad.

### `RoadSafetyHoja3Tab.vue`

Verificado: tiene el mismo patrón duplicado (`ALERTA_CLASS`, línea 40-43 de ese archivo), con una tercera clave `LICENCIA_VENCIDA` en vez de `VENCIDO` (dominio de conductores, no vehículos). Mismo tratamiento: reemplazar por `SEMAPHORE_STYLES` (`OK→VERDE`, `ALERTA→AMARILLO`, `LICENCIA_VENCIDA→ROJO`), mismos colores, sin cambiar texto ni lógica.

### Explícitamente NO tocado

`DashboardShell.vue`, `ResumenTab.vue`, `CategoryTab.vue`, cualquier ruta backend, `roadSafetyCalculations.ts` (las fórmulas existentes no cambian, solo se agrega una función pura nueva de clasificación), `RoadSafetyHoja1Tab.vue`, `RoadSafetyHoja4Tab.vue`, `RoadSafetyConfigTab.vue`, `CategoryConfigModal.vue`, `HigieneConfigTab.vue`, el banner duplicado de `HigieneIndustrialPanel.vue`, sidebar/header de Cliente (ya mergeado), claves i18n `roadSafety.tabs.*` ya resueltas.

## Fuera de alcance (sub-proyectos futuros, specs separadas)

- **Configuración por servicio** (categorías/módulos habilitables + catálogos de organización para Seguridad Vial) — requiere schema nuevo en backend (no existe hoy ningún equivalente de `OrganizationCategoryConfig`); incluye resolver la duplicación `CategoryConfigModal.vue`/`HigieneConfigTab.vue` y el banner duplicado de `HigieneIndustrialPanel.vue`.
- **CRUD real de variables/indicadores** — no existe en ningún servicio hoy (ambos son upload masivo + corrección puntual); feature nueva completa de backend+frontend para ambos servicios, mayor alcance y riesgo.

## Verificación

Sin suite e2e en el repo — `npm run typecheck` (backend, no debería tener cambios) + `npx vue-tsc -b` (frontend) + tests unitarios de las 2 funciones puras nuevas (`classifyPesvCompliance`, `buildPesvGlobalCompliance`) + verificación manual en navegador, ambos idiomas:

1. Higiene Industrial (Admin): Dashboard se ve y se comporta exactamente igual que antes — regresión visual cero.
2. Seguridad Vial (Admin) → pestaña Dashboard: tarjeta de cumplimiento PESV con badge de color (verde/amarillo/rojo/gris "sin datos"), dona de cumplimiento junto a las tarjetas, conteos y alertas sin cambio visual.
3. Seguridad Vial (Admin) → Hoja 2 (Vehículos): los badges OK/ALERTA/VENCIDO se ven exactamente igual que antes (mismos colores, ahora desde `SEMAPHORE_STYLES`).
4. Sin cambios en Cliente (ni Higiene ni Seguridad Vial) — regresión visual cero ahí también.
