# Rediseño de la vista cliente de Seguridad Vial (Hoja 1 nueva + Vehículos/Personas/Rutograma) — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganizar el menú cliente de "Seguridad Vial" para que "Dashboard" sea un acordeón puro (igual que Higiene Industrial) que expande a 5 hojas, con una nueva "Hoja 1 · Generalidad" que reemplaza el contenido actual de "Dashboard" con un diseño rico (KPIs, gráficos) calcado del HTML del cliente, y rediseñar visualmente Vehículos/Personas/Rutograma con gráficos adicionales — sin tocar backend, BD, ni el panel de administración.

**Architecture:** Todo el trabajo es frontend puro (Vue 3 + TypeScript). Se agrega un nuevo componente `RoadSafetyResumenTab.vue` (independiente de `RoadSafetyDashboardTab.vue`, que sigue existiendo sin tocar porque lo usa el panel admin), un componente compartido `HorizontalBarChart.vue`, y dos funciones puras nuevas (`buildPesvByFaseCompliance`, `buildRoadSafetyAlerts`). Los tres componentes existentes de captura (Hoja2/Hoja3/Hoja4) se amplían con gráficos y CSV, conservando sus tablas y lógica de corrección de campos intactas.

**Tech Stack:** Vue 3 `<script setup>` + TypeScript, vue-i18n, Tailwind v4, Chart.js/vue-chartjs (ya en el proyecto), Vitest.

## Global Constraints

- Ningún cambio a Prisma schema, backend, ni al parser de Excel de road safety (spec, sección "Alcance").
- `RoadSafetyDashboardTab.vue` y `RoadSafetyAdminPanel.vue` (panel de administración) **no se tocan** — el panel admin sigue usando `RoadSafetyDashboardTab.vue` para su tab "Dashboard" (aloja el selector de empresa + carga de Excel, contenido admin-only que no existe en la vista cliente).
- La tabla de "Puntos de la ruta" en Hoja 4 conserva sus 6 columnas actuales — no se reduce a 3 como en el HTML del cliente.
- El total de hojas de Seguridad Vial pasa a ser 6 en `clientSheets.config.ts` (dashboard + resumen + hoja1 + hoja2 + hoja3 + hoja4), numeradas 1-6 contiguas — el test `clientSheets.config.test.ts` ya exige números contiguos empezando en 1 para cada servicio.
- Nunca interpolar clases de Tailwind (`bg-${color}-500`) — siempre clases literales completas, mismo criterio que el resto del proyecto (ver comentario en `semaphoreStyles.ts`).
- Todas las claves de i18n nuevas van en `es.json` y `en.json` en el mismo commit que las usa.

---

### Task 1: Reestructurar el menú — clientSheets.config.ts + i18n

**Files:**
- Modify: `frontend/src/config/clientSheets.config.ts`
- Modify: `frontend/src/config/clientSheets.config.test.ts`
- Modify: `frontend/src/i18n/locales/es.json`
- Modify: `frontend/src/i18n/locales/en.json`

**Interfaces:**
- Produces: nueva entrada `{ key: 'resumen', ... }` en `CLIENT_SHEETS_CONFIG['seguridad-vial'].sheets`, entre `dashboard` y `hoja1`. Las claves i18n `roadSafety.tabs.resumen` / `roadSafety.tabs.resumenShort` que las Tasks 5-6 usarán para el nuevo componente.

- [ ] **Step 1: Actualizar el test para el nuevo estado esperado (falla primero)**

En `frontend/src/config/clientSheets.config.test.ts`, reemplazar el bloque final:

```typescript
  it('seguridad-vial: dashboard + hoja1..4 (5 sheets), mode realtabs, numerado 1..5', () => {
    const config = CLIENT_SHEETS_CONFIG['seguridad-vial']!
    expect(config.mode).toBe('realtabs')
    expect(config.sheets.map((s) => s.key)).toEqual(['dashboard', 'hoja1', 'hoja2', 'hoja3', 'hoja4'])
    expect(config.sheets.map((s) => s.number)).toEqual([1, 2, 3, 4, 5])
  })
```

por:

```typescript
  it('seguridad-vial: dashboard + resumen + hoja1..4 (6 sheets), mode realtabs, numerado 1..6', () => {
    const config = CLIENT_SHEETS_CONFIG['seguridad-vial']!
    expect(config.mode).toBe('realtabs')
    expect(config.sheets.map((s) => s.key)).toEqual(['dashboard', 'resumen', 'hoja1', 'hoja2', 'hoja3', 'hoja4'])
    expect(config.sheets.map((s) => s.number)).toEqual([1, 2, 3, 4, 5, 6])
  })
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `cd frontend && npx vitest run src/config/clientSheets.config.test.ts`
Expected: FAIL — `expected [...] to equal ['dashboard', 'hoja1', 'hoja2', 'hoja3', 'hoja4']` (el nuevo test todavía no tiene su config, y también fallará "every labelKey and shortLabelKey resolves" porque `roadSafety.tabs.resumen`/`resumenShort` no existen aún).

- [ ] **Step 3: Insertar la nueva hoja en la config**

En `frontend/src/config/clientSheets.config.ts`, reemplazar el bloque `'seguridad-vial': { ... }` completo:

```typescript
  'seguridad-vial': {
    serviceSlug: 'seguridad-vial',
    mode: 'realtabs',
    sheets: [
      { key: 'dashboard', number: 1, labelKey: 'roadSafety.tabs.dashboard', shortLabelKey: 'roadSafety.tabs.dashboardShort' },
      { key: 'hoja1', number: 2, labelKey: 'roadSafety.tabs.hoja1', shortLabelKey: 'roadSafety.tabs.hoja1Short' },
      { key: 'hoja2', number: 3, labelKey: 'roadSafety.tabs.hoja2', shortLabelKey: 'roadSafety.tabs.hoja2Short' },
      { key: 'hoja3', number: 4, labelKey: 'roadSafety.tabs.hoja3', shortLabelKey: 'roadSafety.tabs.hoja3Short' },
      { key: 'hoja4', number: 5, labelKey: 'roadSafety.tabs.hoja4', shortLabelKey: 'roadSafety.tabs.hoja4Short' },
    ],
  },
```

por:

```typescript
  'seguridad-vial': {
    serviceSlug: 'seguridad-vial',
    mode: 'realtabs',
    sheets: [
      { key: 'dashboard', number: 1, labelKey: 'roadSafety.tabs.dashboard', shortLabelKey: 'roadSafety.tabs.dashboardShort' },
      { key: 'resumen', number: 2, labelKey: 'roadSafety.tabs.resumen', shortLabelKey: 'roadSafety.tabs.resumenShort' },
      { key: 'hoja1', number: 3, labelKey: 'roadSafety.tabs.hoja1', shortLabelKey: 'roadSafety.tabs.hoja1Short' },
      { key: 'hoja2', number: 4, labelKey: 'roadSafety.tabs.hoja2', shortLabelKey: 'roadSafety.tabs.hoja2Short' },
      { key: 'hoja3', number: 5, labelKey: 'roadSafety.tabs.hoja3', shortLabelKey: 'roadSafety.tabs.hoja3Short' },
      { key: 'hoja4', number: 6, labelKey: 'roadSafety.tabs.hoja4', shortLabelKey: 'roadSafety.tabs.hoja4Short' },
    ],
  },
```

- [ ] **Step 4: Actualizar i18n — es.json**

En `frontend/src/i18n/locales/es.json`, dentro de `roadSafety.tabs`, el bloque actual:

```json
    "dashboard": "Hoja 1 · Dashboard",
    "dashboardShort": "Dashboard",
    "hoja1": "Hoja 2 · Generalidad",
```

pasa a:

```json
    "dashboard": "Dashboard",
    "dashboardShort": "Dashboard",
    "resumen": "Hoja 1 · Generalidad",
    "resumenShort": "Hoja 1",
    "hoja1": "Hoja 2 · Generalidad",
```

(el resto de `roadSafety.tabs` — `hoja1Short`, `hoja2`, `hoja2Short`, `hoja3`, `hoja3Short`, `hoja4`, `hoja4Short`, `alertas`, `historial`, `reportes`, `configuracion` — queda exactamente igual, sin tocar).

- [ ] **Step 5: Actualizar i18n — en.json**

En `frontend/src/i18n/locales/en.json`, dentro de `roadSafety.tabs`, el bloque actual:

```json
    "dashboard": "Sheet 1 · Dashboard",
    "dashboardShort": "Dashboard",
    "hoja1": "Sheet 2 · General",
```

pasa a:

```json
    "dashboard": "Dashboard",
    "dashboardShort": "Dashboard",
    "resumen": "Sheet 1 · General",
    "resumenShort": "Sheet 1",
    "hoja1": "Sheet 2 · General",
```

- [ ] **Step 6: Correr el test para verificar que pasa**

Run: `cd frontend && npx vitest run src/config/clientSheets.config.test.ts`
Expected: PASS (3/3 tests) — incluyendo el test de Higiene Industrial (sin cambios, debe seguir pasando).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/config/clientSheets.config.ts frontend/src/config/clientSheets.config.test.ts frontend/src/i18n/locales/es.json frontend/src/i18n/locales/en.json
git commit -m "feat: agregar hoja 'resumen' (Hoja 1) a la config de Seguridad Vial"
```

---

### Task 2: Función pura buildPesvByFaseCompliance (TDD)

**Files:**
- Modify: `frontend/src/utils/roadSafetyCompliance.ts`
- Modify: `frontend/src/utils/roadSafetyCompliance.test.ts`

**Interfaces:**
- Consumes: `RoadSafetyPesvPaso` de `@/types/roadSafety` (campos `fase: string`, `porcentajeAvance: number | null`).
- Produces: `export interface PesvFaseCompliance { fase: string; promedioAvance: number }` y `export function buildPesvByFaseCompliance(pasos: RoadSafetyPesvPaso[]): PesvFaseCompliance[]` — Task 5 lo consume.

- [ ] **Step 1: Escribir los tests que fallan**

Agregar al final de `frontend/src/utils/roadSafetyCompliance.test.ts` (después del último `describe('buildPesvGlobalCompliance', ...)`, reutilizando la función helper `paso(...)` ya definida en ese archivo — pero esa helper no acepta `fase`/`porcentajeAvance` como parámetros, así que se agrega una nueva helper local):

```typescript
import { buildPesvByFaseCompliance } from './roadSafetyCompliance'

function pasoFase(fase: string, porcentajeAvance: number | null): RoadSafetyPesvPaso {
  return {
    fase,
    paso: 1,
    elemento: 'Elemento de prueba',
    nivelAplicable: null,
    cumplimiento: null,
    porcentajeAvance,
    evidencia: null,
    observaciones: null,
  }
}

describe('buildPesvByFaseCompliance', () => {
  it('agrupa por fase y promedia porcentajeAvance', () => {
    const pasos = [pasoFase('F1', 100), pasoFase('F1', 50), pasoFase('F2', 80)]
    const result = buildPesvByFaseCompliance(pasos)
    expect(result).toEqual([
      { fase: 'F1', promedioAvance: 75 },
      { fase: 'F2', promedioAvance: 80 },
      { fase: 'F3', promedioAvance: 0 },
      { fase: 'F4', promedioAvance: 0 },
    ])
  })

  it('siempre devuelve las 4 fases en orden F1-F4, aunque falten pasos de alguna', () => {
    const result = buildPesvByFaseCompliance([pasoFase('F3', 60)])
    expect(result.map((f) => f.fase)).toEqual(['F1', 'F2', 'F3', 'F4'])
  })

  it('ignora pasos con porcentajeAvance null al promediar', () => {
    const pasos = [pasoFase('F1', 100), pasoFase('F1', null)]
    const result = buildPesvByFaseCompliance(pasos)
    expect(result.find((f) => f.fase === 'F1')).toEqual({ fase: 'F1', promedioAvance: 100 })
  })

  it('fase sin ningún paso con dato → promedioAvance 0 (no división por cero)', () => {
    const result = buildPesvByFaseCompliance([pasoFase('F1', null)])
    expect(result.find((f) => f.fase === 'F1')).toEqual({ fase: 'F1', promedioAvance: 0 })
  })

  it('arreglo vacío → las 4 fases en 0', () => {
    const result = buildPesvByFaseCompliance([])
    expect(result).toEqual([
      { fase: 'F1', promedioAvance: 0 },
      { fase: 'F2', promedioAvance: 0 },
      { fase: 'F3', promedioAvance: 0 },
      { fase: 'F4', promedioAvance: 0 },
    ])
  })
})
```

- [ ] **Step 2: Correr los tests para verificar que fallan**

Run: `cd frontend && npx vitest run src/utils/roadSafetyCompliance.test.ts`
Expected: FAIL con `buildPesvByFaseCompliance is not a function` (o error de import).

- [ ] **Step 3: Implementar la función**

Agregar al final de `frontend/src/utils/roadSafetyCompliance.ts`:

```typescript
export interface PesvFaseCompliance {
  fase: string
  promedioAvance: number
}

/** Agrupa los pasos PESV por fase (F1-F4) y promedia su `porcentajeAvance`
 * — a diferencia de `buildPesvGlobalCompliance` (que usa el campo
 * `cumplimiento`), esta usa el % de avance numérico porque el HTML de
 * referencia del cliente pide un promedio por fase, no un conteo de
 * estados. Pasos sin `porcentajeAvance` (null) se excluyen del promedio de
 * su fase — mismo criterio de "sin dato distinto de 0" que el resto del
 * sistema. Fases sin ningún paso con dato quedan con promedioAvance: 0 (no
 * hay división por cero) y aparecen igual en el resultado, en el orden fijo
 * F1-F4 (no el orden en que aparecen en `pasos`, que puede variar). */
export function buildPesvByFaseCompliance(pasos: RoadSafetyPesvPaso[]): PesvFaseCompliance[] {
  const FASES = ['F1', 'F2', 'F3', 'F4']
  return FASES.map((fase) => {
    const conDato = pasos.filter((p) => p.fase === fase && p.porcentajeAvance != null)
    const promedioAvance =
      conDato.length > 0
        ? Math.round(conDato.reduce((sum, p) => sum + (p.porcentajeAvance ?? 0), 0) / conDato.length)
        : 0
    return { fase, promedioAvance }
  })
}
```

- [ ] **Step 4: Correr los tests para verificar que pasan**

Run: `cd frontend && npx vitest run src/utils/roadSafetyCompliance.test.ts`
Expected: PASS (todos los tests, incluidos los ya existentes de `classifyPesvCompliance`/`buildPesvGlobalCompliance`).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/roadSafetyCompliance.ts frontend/src/utils/roadSafetyCompliance.test.ts
git commit -m "feat: buildPesvByFaseCompliance para el gráfico PESV por fase de Hoja 1"
```

---

### Task 3: Función pura buildRoadSafetyAlerts + i18n (TDD)

**Files:**
- Create: `frontend/src/utils/roadSafetyAlerts.ts`
- Create: `frontend/src/utils/roadSafetyAlerts.test.ts`
- Modify: `frontend/src/i18n/locales/es.json`
- Modify: `frontend/src/i18n/locales/en.json`

**Interfaces:**
- Consumes: `RoadSafetyVehiculo`, `RoadSafetyConductor` de `@/types/roadSafety` (campos `alerta`, `diasSoat`, `diasRtm`, `comparendos`, `kmActual`, `kmProxMant`, `anomaliaConsumoPct`, `llantasLabradoMm`, `placa`; y `diasLicencia`, `icc`, `nombre`).
- Produces: `export interface RoadSafetyAlertItem { severity: 'critical' | 'warning'; title: string; detail: string }` y `export function buildRoadSafetyAlerts(vehiculos: RoadSafetyVehiculo[], conductores: RoadSafetyConductor[], t: (key: string, params?: Record<string, unknown>) => string): RoadSafetyAlertItem[]` — Task 5 lo consume, pasándole el `t` de `useI18n()`.

- [ ] **Step 1: Escribir el test que falla**

Crear `frontend/src/utils/roadSafetyAlerts.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { buildRoadSafetyAlerts } from './roadSafetyAlerts'
import type { RoadSafetyVehiculo, RoadSafetyConductor } from '@/types/roadSafety'

// Fake `t`: devuelve la clave sola, o "clave:{...params}" si hay params —
// suficiente para verificar QUÉ clave se llamó y con qué datos, sin
// depender del texto final traducido (eso lo cubre clientSheets.config.test.ts
// para otras claves, y aquí no aporta nada probar contra texto en español).
function fakeT(key: string, params?: Record<string, unknown>): string {
  return params ? `${key}:${JSON.stringify(params)}` : key
}

function vehiculo(overrides: Partial<RoadSafetyVehiculo>): RoadSafetyVehiculo {
  return {
    id: '1',
    placa: 'ABC123',
    tipo: null,
    marcaLinea: null,
    modeloAnio: null,
    ciudad: null,
    zona: null,
    sede: null,
    rutasAsignadas: null,
    conductoresAsignados: null,
    soatVence: null,
    diasSoat: null,
    rtmVence: null,
    diasRtm: null,
    polizaRcVence: null,
    tarjetaOperacionVence: null,
    comparendos: 0,
    ultMantenimiento: null,
    kmActual: null,
    kmProxMant: null,
    cambioAceite: null,
    pruebaFrenado: null,
    alineacionBalanceo: null,
    llantasLabradoMm: null,
    lucesSenales: null,
    preoperacionalUlt: null,
    consumoGalMes: null,
    rendimientoKmGal: null,
    rendimientoBaseKmGal: null,
    anomaliaConsumoPct: null,
    seguridadActiva: null,
    seguridadPasiva: null,
    gpsTelemetria: null,
    alerta: 'OK',
    correctedFields: null,
    ...overrides,
  }
}

function conductor(overrides: Partial<RoadSafetyConductor>): RoadSafetyConductor {
  return {
    id: '1',
    documento: '123',
    nombre: 'Test Conductor',
    cargo: null,
    actorVial: null,
    ciudad: null,
    sede: null,
    vehiculosAsignados: null,
    licCategoria: null,
    licenciaVence: null,
    diasLicencia: null,
    psicosensometricoVence: null,
    estadoSalud: null,
    nCursosSv: null,
    horasFormacion: null,
    ultimaCapacitacion: null,
    reentrenamientoProgramado: null,
    scoreConduccionSegura: null,
    scoreManejoDefensivo: null,
    scoreManejoComentadoDiurno: null,
    scoreManejoComentadoNocturno: null,
    scoreConocimientoVehiculo: null,
    scoreNormasTransito: null,
    scoreGestionFatiga: null,
    scoreInvestigacionSiniestros: null,
    scorePrimerosAuxilios: null,
    icc: null,
    resultado: null,
    alerta: 'OK',
    correctedFields: null,
    ...overrides,
  }
}

describe('buildRoadSafetyAlerts', () => {
  it('vehículo OK y conductor OK no generan ninguna alerta', () => {
    const result = buildRoadSafetyAlerts([vehiculo({})], [conductor({})], fakeT)
    expect(result).toEqual([])
  })

  it('vehículo VENCIDO genera alerta critical', () => {
    const result = buildRoadSafetyAlerts([vehiculo({ alerta: 'VENCIDO', diasSoat: -5 })], [], fakeT)
    expect(result).toHaveLength(1)
    expect(result[0]!.severity).toBe('critical')
  })

  it('vehículo ALERTA genera alerta warning', () => {
    const result = buildRoadSafetyAlerts([vehiculo({ alerta: 'ALERTA', diasSoat: 10 })], [], fakeT)
    expect(result).toHaveLength(1)
    expect(result[0]!.severity).toBe('warning')
  })

  it('conductor LICENCIA_VENCIDA genera alerta critical', () => {
    const result = buildRoadSafetyAlerts([], [conductor({ alerta: 'LICENCIA_VENCIDA', diasLicencia: -3 })], fakeT)
    expect(result).toHaveLength(1)
    expect(result[0]!.severity).toBe('critical')
  })

  it('conductor ALERTA genera alerta warning', () => {
    const result = buildRoadSafetyAlerts([], [conductor({ alerta: 'ALERTA', icc: 60 })], fakeT)
    expect(result).toHaveLength(1)
    expect(result[0]!.severity).toBe('warning')
  })

  it('ordena critical antes que warning', () => {
    const result = buildRoadSafetyAlerts(
      [vehiculo({ alerta: 'ALERTA', diasSoat: 10 }), vehiculo({ id: '2', placa: 'XYZ789', alerta: 'VENCIDO', diasSoat: -1 })],
      [],
      fakeT,
    )
    expect(result.map((a) => a.severity)).toEqual(['critical', 'warning'])
  })

  it('vehículo ALERTA por comparendos incluye la razón con la cantidad', () => {
    const result = buildRoadSafetyAlerts([vehiculo({ alerta: 'ALERTA', comparendos: 2 })], [], fakeT)
    expect(result[0]!.detail).toContain('"cantidad":2')
  })
})
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `cd frontend && npx vitest run src/utils/roadSafetyAlerts.test.ts`
Expected: FAIL — `Cannot find module './roadSafetyAlerts'`.

- [ ] **Step 3: Implementar la función**

Crear `frontend/src/utils/roadSafetyAlerts.ts`:

```typescript
import type { RoadSafetyVehiculo, RoadSafetyConductor } from '@/types/roadSafety'

export interface RoadSafetyAlertItem {
  severity: 'critical' | 'warning'
  title: string
  detail: string
}

/** Construye la lista combinada de alertas activas (vehículos + conductores)
 * con detalle legible, para la card "Alertas activas" de Hoja 1 — a
 * diferencia de `RoadSafetyAlertasPanel` (solo contadores), esto arma un
 * título + descripción por cada vehículo/conductor en estado ALERTA o
 * VENCIDO/LICENCIA_VENCIDA, replicando el criterio de clasificación que ya
 * usa el backend (ver roadSafetyCalculations.ts) sin volver a calcularlo —
 * solo lee los campos `alerta`/`dias*`/`comparendos`/etc. ya calculados que
 * llegan en `hoja2`/`hoja3`. Recibe `t` como parámetro (mismo patrón que
 * `buildDashboardTabs`) para que el texto final respete el idioma activo
 * sin acoplar este archivo a Vue/vue-i18n. */
export function buildRoadSafetyAlerts(
  vehiculos: RoadSafetyVehiculo[],
  conductores: RoadSafetyConductor[],
  t: (key: string, params?: Record<string, unknown>) => string,
): RoadSafetyAlertItem[] {
  const items: RoadSafetyAlertItem[] = []

  for (const v of vehiculos) {
    if (v.alerta === 'VENCIDO') {
      items.push({
        severity: 'critical',
        title: t('roadSafety.resumen.alertVehiculoVencidoTitle', { placa: v.placa }),
        detail: [
          v.diasSoat != null && v.diasSoat <= 0 ? t('roadSafety.resumen.alertSoatVencido') : null,
          v.diasRtm != null && v.diasRtm <= 0 ? t('roadSafety.resumen.alertRtmVencido') : null,
        ]
          .filter((x): x is string => x != null)
          .join(' · '),
      })
    } else if (v.alerta === 'ALERTA') {
      items.push({
        severity: 'warning',
        title: t('roadSafety.resumen.alertVehiculoAlertaTitle', { placa: v.placa }),
        detail: [
          v.diasSoat != null && v.diasSoat > 0 && v.diasSoat <= 30
            ? t('roadSafety.resumen.alertSoatPorVencer', { dias: v.diasSoat })
            : null,
          v.diasRtm != null && v.diasRtm > 0 && v.diasRtm <= 30
            ? t('roadSafety.resumen.alertRtmPorVencer', { dias: v.diasRtm })
            : null,
          v.comparendos > 0 ? t('roadSafety.resumen.alertComparendos', { cantidad: v.comparendos }) : null,
          v.kmActual != null && v.kmProxMant != null && v.kmActual >= v.kmProxMant
            ? t('roadSafety.resumen.alertMantenimiento')
            : null,
          v.anomaliaConsumoPct != null && v.anomaliaConsumoPct >= 15
            ? t('roadSafety.resumen.alertAnomalia', { pct: v.anomaliaConsumoPct })
            : null,
          v.llantasLabradoMm != null && v.llantasLabradoMm < 2
            ? t('roadSafety.resumen.alertLlantas', { mm: v.llantasLabradoMm })
            : null,
        ]
          .filter((x): x is string => x != null)
          .join(' · '),
      })
    }
  }

  for (const c of conductores) {
    if (c.alerta === 'LICENCIA_VENCIDA') {
      items.push({
        severity: 'critical',
        title: t('roadSafety.resumen.alertConductorVencidoTitle', { nombre: c.nombre }),
        detail: t('roadSafety.resumen.alertLicenciaVencida', { dias: Math.abs(c.diasLicencia ?? 0) }),
      })
    } else if (c.alerta === 'ALERTA') {
      items.push({
        severity: 'warning',
        title: t('roadSafety.resumen.alertConductorAlertaTitle', { nombre: c.nombre }),
        detail: [
          c.diasLicencia != null && c.diasLicencia > 0 && c.diasLicencia <= 30
            ? t('roadSafety.resumen.alertLicenciaPorVencer', { dias: c.diasLicencia })
            : null,
          c.icc != null && c.icc < 70 ? t('roadSafety.resumen.alertIccBajo', { icc: c.icc }) : null,
        ]
          .filter((x): x is string => x != null)
          .join(' · '),
      })
    }
  }

  const severityOrder: Record<RoadSafetyAlertItem['severity'], number> = { critical: 0, warning: 1 }
  return items.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `cd frontend && npx vitest run src/utils/roadSafetyAlerts.test.ts`
Expected: PASS (7/7 tests).

- [ ] **Step 5: Agregar las claves i18n usadas (es.json)**

En `frontend/src/i18n/locales/es.json`, dentro del objeto `roadSafety`, agregar una nueva clave `resumen` (hermana de `tabs`, `dashboard`, `hoja1`, etc.) con este contenido — en este paso solo se agregan las claves de alertas; el resto de `resumen` (KPIs, títulos de sección) se agrega en la Task 5, que es quien las usa primero. Insertar el objeto `resumen` completo ahora para no reabrir el archivo dos veces:

```json
  "resumen": {
    "kpiPesv": "Cumplimiento PESV global",
    "kpiVehiculosAlerta": "Vehículos con alerta",
    "kpiConductoresSinAprobar": "Conductores sin aprobar",
    "kpiIccPromedio": "ICC promedio de la flota",
    "pillAlerta": "Alerta",
    "pillOk": "OK",
    "pillNoAprobado": "No aprobado",
    "pillAprobado": "Aprobado",
    "pesvPorFaseTitle": "Cumplimiento PESV por fase",
    "alertasTitle": "Alertas activas",
    "alertasEmpty": "Sin alertas activas en la selección actual.",
    "fase": {
      "F1": "F1 · Compromiso y diagnóstico",
      "F2": "F2 · Plan y gestión",
      "F3": "F3 · Seguimiento",
      "F4": "F4 · Mejora continua"
    },
    "alertVehiculoVencidoTitle": "{placa} — documento vencido",
    "alertSoatVencido": "SOAT vencido",
    "alertRtmVencido": "RTM vencido",
    "alertVehiculoAlertaTitle": "{placa} — requiere atención",
    "alertSoatPorVencer": "SOAT vence en {dias} d",
    "alertRtmPorVencer": "RTM vence en {dias} d",
    "alertComparendos": "{cantidad} comparendo(s)",
    "alertMantenimiento": "mantenimiento vencido por km",
    "alertAnomalia": "anomalía de consumo {pct}%",
    "alertLlantas": "labrado de llantas {mm} mm",
    "alertConductorVencidoTitle": "{nombre} — licencia vencida",
    "alertLicenciaVencida": "venció hace {dias} d",
    "alertConductorAlertaTitle": "{nombre} — requiere atención",
    "alertLicenciaPorVencer": "licencia vence en {dias} d",
    "alertIccBajo": "ICC {icc} (bajo el umbral de 70)"
  },
```

Ubicarlo como hermano de `"dashboard": { ... }` dentro del objeto `roadSafety` (por ejemplo, justo después del bloque `"dashboard"` y antes de `"upload"`).

- [ ] **Step 6: Agregar las mismas claves i18n en inglés (en.json)**

En `frontend/src/i18n/locales/en.json`, en la misma posición relativa dentro de `roadSafety`:

```json
  "resumen": {
    "kpiPesv": "Global PESV compliance",
    "kpiVehiculosAlerta": "Vehicles with alerts",
    "kpiConductoresSinAprobar": "Drivers not approved",
    "kpiIccPromedio": "Fleet average ICC",
    "pillAlerta": "Alert",
    "pillOk": "OK",
    "pillNoAprobado": "Not approved",
    "pillAprobado": "Approved",
    "pesvPorFaseTitle": "PESV compliance by phase",
    "alertasTitle": "Active alerts",
    "alertasEmpty": "No active alerts in the current selection.",
    "fase": {
      "F1": "F1 · Commitment and diagnosis",
      "F2": "F2 · Plan and management",
      "F3": "F3 · Monitoring",
      "F4": "F4 · Continuous improvement"
    },
    "alertVehiculoVencidoTitle": "{placa} — expired document",
    "alertSoatVencido": "SOAT expired",
    "alertRtmVencido": "RTM expired",
    "alertVehiculoAlertaTitle": "{placa} — needs attention",
    "alertSoatPorVencer": "SOAT expires in {dias} d",
    "alertRtmPorVencer": "RTM expires in {dias} d",
    "alertComparendos": "{cantidad} ticket(s)",
    "alertMantenimiento": "maintenance overdue by km",
    "alertAnomalia": "fuel consumption anomaly {pct}%",
    "alertLlantas": "tire tread {mm} mm",
    "alertConductorVencidoTitle": "{nombre} — expired license",
    "alertLicenciaVencida": "expired {dias} d ago",
    "alertConductorAlertaTitle": "{nombre} — needs attention",
    "alertLicenciaPorVencer": "license expires in {dias} d",
    "alertIccBajo": "ICC {icc} (below the 70 threshold)"
  },
```

- [ ] **Step 7: Validar JSON y correr toda la suite de frontend**

Run: `cd frontend && node -e "JSON.parse(require('fs').readFileSync('src/i18n/locales/es.json'))" && node -e "JSON.parse(require('fs').readFileSync('src/i18n/locales/en.json'))" && echo OK`
Expected: `OK` (ambos archivos siguen siendo JSON válido).

Run: `cd frontend && npx vitest run`
Expected: todos los test files pasan, sin regresiones.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/utils/roadSafetyAlerts.ts frontend/src/utils/roadSafetyAlerts.test.ts frontend/src/i18n/locales/es.json frontend/src/i18n/locales/en.json
git commit -m "feat: buildRoadSafetyAlerts para la lista de alertas detalladas de Hoja 1"
```

---

### Task 4: Componente compartido HorizontalBarChart.vue

**Files:**
- Create: `frontend/src/components/dashboard/HorizontalBarChart.vue`

**Interfaces:**
- Produces: `export interface HorizontalBarItem { label: string; value: number; display?: string; colorClass?: string }`, componente con props `{ items: HorizontalBarItem[]; max?: number }` — lo consumen Task 5 (Hoja 1), Task 7 (Hoja 2) y Task 8 (Hoja 3).

- [ ] **Step 1: Crear el componente**

Crear `frontend/src/components/dashboard/HorizontalBarChart.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'

export interface HorizontalBarItem {
  label: string
  value: number
  /** Texto a mostrar a la derecha de la barra — si no se pasa, se usa
   * `value` tal cual. */
  display?: string
  /** Clase Tailwind completa para el color de relleno (nunca interpolada:
   * 'bg-sky-400', no `bg-${color}-400`) — por defecto 'bg-sky-400'. */
  colorClass?: string
}

const props = defineProps<{ items: HorizontalBarItem[]; max?: number }>()

/** Sin `max` explícito, se usa el mayor valor del propio arreglo (mínimo 1
 * para evitar dividir por cero) — mismo criterio que el patrón `hbar()` del
 * HTML de referencia del cliente (`Math.max(...items.map(i=>i.value), 1)`). */
const effectiveMax = computed(() => props.max ?? Math.max(...props.items.map((i) => i.value), 1))

function widthPct(value: number): number {
  // Piso de 2%: un valor de 0 (o muy chico frente al resto) sigue mostrando
  // una franja de color visible en vez de desaparecer — mismo criterio que
  // el HTML de referencia (`Math.max(2, Math.min(100, ...))`).
  return Math.max(2, Math.min(100, (value / effectiveMax.value) * 100))
}
</script>

<template>
  <div class="grid gap-2.5">
    <div v-for="item in items" :key="item.label" class="flex items-center gap-3 text-[13px]">
      <p class="w-[45%] min-w-0 shrink-0 truncate font-medium text-navy-900" :title="item.label">
        {{ item.label }}
      </p>
      <div class="h-3.5 flex-1 overflow-hidden rounded-full bg-line" role="presentation">
        <div
          class="h-full rounded-full transition-[width]"
          :class="item.colorClass ?? 'bg-sky-400'"
          :style="{ width: `${widthPct(item.value)}%` }"
        />
      </div>
      <p class="w-14 shrink-0 text-right font-mono text-xs font-bold tabular-nums text-navy-900">
        {{ item.display ?? item.value }}
      </p>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx vue-tsc -b --noEmit`
Expected: sin errores (el componente todavía no lo importa nadie, así que solo se valida que compila solo).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/dashboard/HorizontalBarChart.vue
git commit -m "feat: componente compartido HorizontalBarChart"
```

---

### Task 5: Nuevo componente RoadSafetyResumenTab.vue (contenido de la nueva Hoja 1)

**Files:**
- Create: `frontend/src/components/dashboard/roadSafety/RoadSafetyResumenTab.vue`
- Modify: `frontend/src/i18n/locales/es.json`
- Modify: `frontend/src/i18n/locales/en.json`

**Interfaces:**
- Consumes: `getRoadSafetyHoja1/hoja2/hoja3` y `getRoadSafetyUploadHistory` de `@/services/roadSafety.service`; `classifyPesvCompliance` y `buildPesvByFaseCompliance` de `@/utils/roadSafetyCompliance` (Task 2); `buildRoadSafetyAlerts` de `@/utils/roadSafetyAlerts` (Task 3); `HorizontalBarChart` (Task 4); `SummaryCard` (existente); `inventoryConceptLabel` de `@/utils/inventoryConceptLabel` (existente).
- Produces: componente Vue con props `{ organizationId?: string }` y `defineExpose({ reload })` — mismo contrato que `RoadSafetyDashboardTab.vue` (que NO se toca) — Task 6 lo monta en `RoadSafetyClientPanel.vue`.

- [ ] **Step 1: Crear el componente**

Crear `frontend/src/components/dashboard/roadSafety/RoadSafetyResumenTab.vue`:

```vue
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  getRoadSafetyHoja1,
  getRoadSafetyHoja2,
  getRoadSafetyHoja3,
  getRoadSafetyUploadHistory,
  RoadSafetyRequestError,
} from '@/services/roadSafety.service'
import { formatDate } from '@/utils/formatDate'
import type { Locale } from '@/i18n'
import type { RoadSafetyHoja1Data, RoadSafetyVehiculo, RoadSafetyConductor } from '@/types/roadSafety'
import SummaryCard from '../SummaryCard.vue'
import HorizontalBarChart from '../HorizontalBarChart.vue'
import { classifyPesvCompliance, buildPesvByFaseCompliance } from '@/utils/roadSafetyCompliance'
import { buildRoadSafetyAlerts, type RoadSafetyAlertItem } from '@/utils/roadSafetyAlerts'
import { inventoryConceptLabel } from '@/utils/inventoryConceptLabel'
import { useToast } from '@/composables/useToast'

const props = defineProps<{ organizationId?: string }>()
const { t, locale } = useI18n()

const status = ref<'loading' | 'ready' | 'error'>('loading')

const hoja1 = ref<RoadSafetyHoja1Data | null>(null)
const vehiculos = ref<RoadSafetyVehiculo[]>([])
const conductores = ref<RoadSafetyConductor[]>([])
const lastUpdated = ref<string | null>(null)

async function load() {
  status.value = 'loading'
  try {
    const scope = { organizationId: props.organizationId }
    const [h1, h2, h3, uploads] = await Promise.all([
      getRoadSafetyHoja1(scope),
      getRoadSafetyHoja2(scope),
      getRoadSafetyHoja3(scope),
      getRoadSafetyUploadHistory(scope),
    ])
    hoja1.value = h1
    vehiculos.value = h2
    conductores.value = h3
    lastUpdated.value = uploads[0]?.createdAt ?? null
    status.value = 'ready'
  } catch (err) {
    status.value = 'error'
    useToast().error(err instanceof RoadSafetyRequestError ? err.message : t('roadSafety.loadError'))
  }
}

onMounted(load)
watch(() => props.organizationId, load)
defineExpose({ reload: load })

const pesvGlobalPct = computed(() => hoja1.value?.cumplimientoPesvGlobal ?? null)

const vehiculosConAlerta = computed(() => vehiculos.value.filter((v) => v.alerta !== 'OK').length)
const conductoresSinAprobar = computed(() => conductores.value.filter((c) => c.resultado === 'No aprobado').length)
const iccPromedio = computed(() => {
  const conIcc = conductores.value.filter((c) => c.icc != null)
  if (conIcc.length === 0) return null
  return Math.round(conIcc.reduce((sum, c) => sum + (c.icc ?? 0), 0) / conIcc.length)
})

const FASE_LABEL_KEY: Record<string, string> = {
  F1: 'roadSafety.resumen.fase.F1',
  F2: 'roadSafety.resumen.fase.F2',
  F3: 'roadSafety.resumen.fase.F3',
  F4: 'roadSafety.resumen.fase.F4',
}

const pesvPorFaseItems = computed(() => {
  if (!hoja1.value) return []
  return buildPesvByFaseCompliance(hoja1.value.pasos).map((f) => ({
    label: t(FASE_LABEL_KEY[f.fase] ?? f.fase),
    value: f.promedioAvance,
    display: `${f.promedioAvance}%`,
    colorClass: 'bg-sky-400',
  }))
})

const alertas = computed<RoadSafetyAlertItem[]>(() => buildRoadSafetyAlerts(vehiculos.value, conductores.value, t))

const ALERT_STYLE: Record<RoadSafetyAlertItem['severity'], { bg: string; border: string; text: string }> = {
  critical: { bg: 'bg-red-50', border: 'border-red-500', text: 'text-red-700' },
  warning: { bg: 'bg-amber-50', border: 'border-amber-500', text: 'text-amber-700' },
}

function inventarioItems(grupo: 'ACTORES_VIALES' | 'PARQUE_AUTOMOTOR') {
  if (!hoja1.value) return []
  return [...hoja1.value.inventario[grupo].items]
    .sort((a, b) => b.cantidad - a.cantidad)
    .map((item) => ({
      label: inventoryConceptLabel(item.concepto, locale.value as Locale),
      value: item.cantidad,
      colorClass: 'bg-sky-400',
    }))
}
const actoresItems = computed(() => inventarioItems('ACTORES_VIALES'))
const parqueItems = computed(() => inventarioItems('PARQUE_AUTOMOTOR'))
const coberturaItems = computed(() => hoja1.value?.inventario.COBERTURA_OPERACIONAL.items ?? [])
</script>

<template>
  <div class="grid gap-6">
    <p v-if="status === 'loading'" class="text-sm text-navy-700">{{ t('roadSafety.loading') }}</p>
    <template v-else>
      <p class="text-xs text-navy-700/60">
        {{ t('roadSafety.dashboard.lastUpdatedPrefix') }}
        {{ lastUpdated ? formatDate(lastUpdated, locale as Locale) : t('roadSafety.dashboard.noUploads') }}
      </p>

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          :titulo="t('roadSafety.resumen.kpiPesv')"
          :valor="pesvGlobalPct != null ? `${pesvGlobalPct}%` : t('roadSafety.noData')"
          :cumplimiento-pct="pesvGlobalPct ?? 0"
          :estado="classifyPesvCompliance(pesvGlobalPct)"
        />
        <div class="rounded-lg border border-line-strong bg-white p-4">
          <p class="text-xs font-semibold uppercase tracking-wide text-navy-700/70">
            {{ t('roadSafety.resumen.kpiVehiculosAlerta') }}
          </p>
          <p class="mt-1 text-2xl font-bold text-navy-900">{{ vehiculosConAlerta }} / {{ vehiculos.length }}</p>
          <span
            class="mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase"
            :class="vehiculosConAlerta > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'"
          >
            {{ t(vehiculosConAlerta > 0 ? 'roadSafety.resumen.pillAlerta' : 'roadSafety.resumen.pillOk') }}
          </span>
        </div>
        <div class="rounded-lg border border-line-strong bg-white p-4">
          <p class="text-xs font-semibold uppercase tracking-wide text-navy-700/70">
            {{ t('roadSafety.resumen.kpiConductoresSinAprobar') }}
          </p>
          <p class="mt-1 text-2xl font-bold text-navy-900">{{ conductoresSinAprobar }} / {{ conductores.length }}</p>
          <span
            class="mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase"
            :class="conductoresSinAprobar > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'"
          >
            {{
              t(conductoresSinAprobar > 0 ? 'roadSafety.resumen.pillNoAprobado' : 'roadSafety.resumen.pillAprobado')
            }}
          </span>
        </div>
        <div class="rounded-lg border border-line-strong bg-white p-4">
          <p class="text-xs font-semibold uppercase tracking-wide text-navy-700/70">
            {{ t('roadSafety.resumen.kpiIccPromedio') }}
          </p>
          <p class="mt-1 text-2xl font-bold text-navy-900">{{ iccPromedio ?? t('roadSafety.noData') }}</p>
        </div>
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <div class="rounded-lg border border-line-strong bg-white p-4">
          <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
            {{ t('roadSafety.resumen.pesvPorFaseTitle') }}
          </p>
          <HorizontalBarChart :items="pesvPorFaseItems" :max="100" />
        </div>
        <div class="rounded-lg border border-line-strong bg-white p-4">
          <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
            {{ t('roadSafety.resumen.alertasTitle') }} ({{ alertas.length }})
          </p>
          <div v-if="alertas.length === 0" class="text-xs text-navy-700/60">
            {{ t('roadSafety.resumen.alertasEmpty') }}
          </div>
          <div v-else class="grid gap-2">
            <div
              v-for="(alerta, i) in alertas"
              :key="i"
              class="rounded-md border-l-4 px-3 py-2 text-xs"
              :class="[ALERT_STYLE[alerta.severity].bg, ALERT_STYLE[alerta.severity].border]"
            >
              <p class="font-semibold text-navy-900">{{ alerta.title }}</p>
              <p class="mt-0.5" :class="ALERT_STYLE[alerta.severity].text">{{ alerta.detail }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <div class="rounded-lg border border-line-strong bg-white p-4">
          <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
            {{ t('roadSafety.hoja1.grupo.ACTORES_VIALES') }}
          </p>
          <HorizontalBarChart :items="actoresItems" />
        </div>
        <div class="rounded-lg border border-line-strong bg-white p-4">
          <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
            {{ t('roadSafety.hoja1.grupo.PARQUE_AUTOMOTOR') }}
          </p>
          <HorizontalBarChart :items="parqueItems" />
        </div>
      </div>

      <div class="rounded-lg border border-line-strong bg-white p-4">
        <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
          {{ t('roadSafety.hoja1.grupo.COBERTURA_OPERACIONAL') }}
        </p>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div v-for="item in coberturaItems" :key="item.concepto">
            <p class="text-xs font-semibold uppercase tracking-wide text-navy-700/70">
              {{ inventoryConceptLabel(item.concepto, locale as Locale) }}
            </p>
            <p class="mt-1 text-2xl font-bold text-navy-900">{{ item.cantidad }}</p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
```

Nota: las claves `roadSafety.hoja1.grupo.ACTORES_VIALES/PARQUE_AUTOMOTOR/COBERTURA_OPERACIONAL`, `roadSafety.dashboard.lastUpdatedPrefix/noUploads`, `roadSafety.loading` y `roadSafety.noData` ya existen (las usa `RoadSafetyHoja1Tab.vue`/`RoadSafetyDashboardTab.vue`) — se reutilizan tal cual, sin duplicar.

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx vue-tsc -b --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/dashboard/roadSafety/RoadSafetyResumenTab.vue
git commit -m "feat: componente RoadSafetyResumenTab (nueva Hoja 1 de Seguridad Vial)"
```

---

### Task 6: Conectar la nueva Hoja 1 al panel cliente

**Files:**
- Modify: `frontend/src/components/dashboard/roadSafety/RoadSafetyClientPanel.vue`
- Modify: `frontend/src/modules/dashboard/views/ClientDashboardView.vue`

**Interfaces:**
- Consumes: `RoadSafetyResumenTab` (Task 5).
- Produces: `activeTab` acepta ahora también `'resumen'` — ningún archivo posterior depende de esto (es el punto final de la cadena de navegación).

**Importante:** este task NO toca `RoadSafetyDashboardTab.vue` ni `RoadSafetyAdminPanel.vue` — ese componente y ese panel siguen existiendo exactamente igual, porque el panel de administración (`RoadSafetyAdminPanel.vue`) sigue usando `RoadSafetyDashboardTab.vue` para su propio tab "Dashboard" (selector de empresa + carga de Excel, contenido que no aplica a la vista cliente). Ese archivo es fuera de alcance.

- [ ] **Step 1: Ampliar RoadSafetyClientPanel.vue**

En `frontend/src/components/dashboard/roadSafety/RoadSafetyClientPanel.vue`, el archivo completo actual:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SectionTitleBanner from '../SectionTitleBanner.vue'
import RoadSafetyDashboardTab from './RoadSafetyDashboardTab.vue'
import RoadSafetyHoja1Tab from './RoadSafetyHoja1Tab.vue'
import RoadSafetyHoja2Tab from './RoadSafetyHoja2Tab.vue'
import RoadSafetyHoja3Tab from './RoadSafetyHoja3Tab.vue'
import RoadSafetyHoja4Tab from './RoadSafetyHoja4Tab.vue'
import RoadSafetyAlertasTab from './RoadSafetyAlertasTab.vue'
import RoadSafetyHistorialTab from './RoadSafetyHistorialTab.vue'
import RoadSafetyReportesTab from './RoadSafetyReportesTab.vue'

// La navegación entre hojas vive en el sidebar (DashboardSidebar.vue), igual
// que "Dashboard" en Higiene Industrial — antes este panel tenía su propia
// barra de pestañas interna, lo que lo hacía verse distinto (dos niveles de
// navegación en vez de uno) y quedaba fuera del acordeón del sidebar.
const props = defineProps<{
  activeTab: 'dashboard' | 'hoja1' | 'hoja2' | 'hoja3' | 'hoja4' | 'alertas' | 'historial' | 'reportes'
}>()

const { t } = useI18n()

const currentTitle = computed(() => t(`roadSafety.tabs.${props.activeTab}`))
</script>

<template>
  <div class="grid gap-6">
    <SectionTitleBanner :title="currentTitle" />

    <RoadSafetyDashboardTab v-if="activeTab === 'dashboard'" />
    <RoadSafetyHoja1Tab v-else-if="activeTab === 'hoja1'" />
    <RoadSafetyHoja2Tab v-else-if="activeTab === 'hoja2'" />
    <RoadSafetyHoja3Tab v-else-if="activeTab === 'hoja3'" />
    <RoadSafetyHoja4Tab v-else-if="activeTab === 'hoja4'" />
    <RoadSafetyAlertasTab v-else-if="activeTab === 'alertas'" />
    <RoadSafetyHistorialTab v-else-if="activeTab === 'historial'" />
    <RoadSafetyReportesTab v-else-if="activeTab === 'reportes'" />
  </div>
</template>
```

reemplazarlo completo por:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SectionTitleBanner from '../SectionTitleBanner.vue'
import RoadSafetyResumenTab from './RoadSafetyResumenTab.vue'
import RoadSafetyHoja1Tab from './RoadSafetyHoja1Tab.vue'
import RoadSafetyHoja2Tab from './RoadSafetyHoja2Tab.vue'
import RoadSafetyHoja3Tab from './RoadSafetyHoja3Tab.vue'
import RoadSafetyHoja4Tab from './RoadSafetyHoja4Tab.vue'
import RoadSafetyAlertasTab from './RoadSafetyAlertasTab.vue'
import RoadSafetyHistorialTab from './RoadSafetyHistorialTab.vue'
import RoadSafetyReportesTab from './RoadSafetyReportesTab.vue'

// La navegación entre hojas vive en el sidebar (DashboardSidebar.vue), igual
// que "Dashboard" en Higiene Industrial — antes este panel tenía su propia
// barra de pestañas interna, lo que lo hacía verse distinto (dos niveles de
// navegación en vez de uno) y quedaba fuera del acordeón del sidebar.
//
// 'dashboard' y 'resumen' muestran EL MISMO componente (RoadSafetyResumenTab)
// — "Dashboard" es ahora la etiqueta de agrupación del acordeón (ver
// DashboardSidebar.vue, sheets[0]), clickeable igual que en Higiene
// Industrial, pero su contenido es idéntico al de "Hoja 1" (el primer hijo)
// en vez de un panel vacío — mismo criterio que Higiene Industrial, donde
// "Dashboard" (key 'resumen') también muestra el sub-estado 'hoja1' por
// defecto. RoadSafetyDashboardTab.vue (el componente viejo) NO se borra:
// sigue siendo usado por RoadSafetyAdminPanel.vue, un panel distinto fuera
// de este alcance.
const props = defineProps<{
  activeTab: 'dashboard' | 'resumen' | 'hoja1' | 'hoja2' | 'hoja3' | 'hoja4' | 'alertas' | 'historial' | 'reportes'
}>()

const { t } = useI18n()

const currentTitle = computed(() => {
  const key = props.activeTab === 'dashboard' ? 'resumen' : props.activeTab
  return t(`roadSafety.tabs.${key}`)
})
</script>

<template>
  <div class="grid gap-6">
    <SectionTitleBanner :title="currentTitle" />

    <RoadSafetyResumenTab v-if="activeTab === 'dashboard' || activeTab === 'resumen'" />
    <RoadSafetyHoja1Tab v-else-if="activeTab === 'hoja1'" />
    <RoadSafetyHoja2Tab v-else-if="activeTab === 'hoja2'" />
    <RoadSafetyHoja3Tab v-else-if="activeTab === 'hoja3'" />
    <RoadSafetyHoja4Tab v-else-if="activeTab === 'hoja4'" />
    <RoadSafetyAlertasTab v-else-if="activeTab === 'alertas'" />
    <RoadSafetyHistorialTab v-else-if="activeTab === 'historial'" />
    <RoadSafetyReportesTab v-else-if="activeTab === 'reportes'" />
  </div>
</template>
```

- [ ] **Step 2: Actualizar ClientDashboardView.vue — icono, tab nuevo, landing por defecto**

En `frontend/src/modules/dashboard/views/ClientDashboardView.vue`, en el import de iconos (línea 6), el actual:

```typescript
import { ClipboardCheck, Truck, IdCard, Map, AlertTriangle, History, FileText, Home } from 'lucide-vue-next'
```

pasa a:

```typescript
import { ClipboardCheck, Truck, IdCard, Map, AlertTriangle, History, FileText, Home, Gauge } from 'lucide-vue-next'
```

En el mismo archivo, dentro de `loadDashboard()`, el bloque actual (alrededor de la línea 51-59):

```typescript
  if (serviceSlug.value === 'seguridad-vial') {
    status.value = 'ready'
    dashboard.value = null
    // Mismo reset que hace Higiene Industrial abajo (activeTab = 'resumen')
    // al entrar a un servicio distinto — acá el primer tab real es
    // 'dashboard', igual que 'resumen' en Higiene Industrial.
    activeTab.value = 'dashboard'
    return
  }
```

pasa a:

```typescript
  if (serviceSlug.value === 'seguridad-vial') {
    status.value = 'ready'
    dashboard.value = null
    // Aterriza en 'resumen' (la nueva Hoja 1), no en 'dashboard' — mismo
    // criterio que Higiene Industrial, que aterriza en 'resumen' y ese tab
    // ya muestra su primera hoja por defecto (activeHoja = 'hoja1').
    activeTab.value = 'resumen'
    return
  }
```

En el mismo archivo, el `roadSafetyTabs` computed actual (alrededor de la línea 107-116):

```typescript
const roadSafetyTabs = computed<TabDef[]>(() => [
  { key: 'dashboard', label: t('roadSafety.tabs.dashboardShort'), icon: Home },
  { key: 'hoja1', label: t('roadSafety.tabs.hoja1'), icon: ClipboardCheck },
  { key: 'hoja2', label: t('roadSafety.tabs.hoja2'), icon: Truck },
  { key: 'hoja3', label: t('roadSafety.tabs.hoja3'), icon: IdCard },
  { key: 'hoja4', label: t('roadSafety.tabs.hoja4'), icon: Map },
  { key: 'alertas', label: t('roadSafety.tabs.alertas'), icon: AlertTriangle },
  { key: 'historial', label: t('roadSafety.tabs.historial'), icon: History },
  { key: 'reportes', label: t('roadSafety.tabs.reportes'), icon: FileText },
])
```

pasa a:

```typescript
const roadSafetyTabs = computed<TabDef[]>(() => [
  { key: 'dashboard', label: t('roadSafety.tabs.dashboardShort'), icon: Home },
  { key: 'resumen', label: t('roadSafety.tabs.resumenShort'), icon: Gauge },
  { key: 'hoja1', label: t('roadSafety.tabs.hoja1'), icon: ClipboardCheck },
  { key: 'hoja2', label: t('roadSafety.tabs.hoja2'), icon: Truck },
  { key: 'hoja3', label: t('roadSafety.tabs.hoja3'), icon: IdCard },
  { key: 'hoja4', label: t('roadSafety.tabs.hoja4'), icon: Map },
  { key: 'alertas', label: t('roadSafety.tabs.alertas'), icon: AlertTriangle },
  { key: 'historial', label: t('roadSafety.tabs.historial'), icon: History },
  { key: 'reportes', label: t('roadSafety.tabs.reportes'), icon: FileText },
])
```

En el `<template>`, el uso actual de `RoadSafetyClientPanel` (alrededor de la línea 160-163):

```vue
        <RoadSafetyClientPanel
          v-else
          :active-tab="(activeTab as 'dashboard' | 'hoja1' | 'hoja2' | 'hoja3' | 'hoja4' | 'alertas' | 'historial' | 'reportes')"
        />
```

pasa a:

```vue
        <RoadSafetyClientPanel
          v-else
          :active-tab="(activeTab as 'dashboard' | 'resumen' | 'hoja1' | 'hoja2' | 'hoja3' | 'hoja4' | 'alertas' | 'historial' | 'reportes')"
        />
```

- [ ] **Step 3: Typecheck**

Run: `cd frontend && npx vue-tsc -b --noEmit`
Expected: sin errores.

- [ ] **Step 4: Correr toda la suite de tests**

Run: `cd frontend && npx vitest run`
Expected: todos los test files pasan, sin regresiones (incluye `clientSheets.config.test.ts` de la Task 1).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/dashboard/roadSafety/RoadSafetyClientPanel.vue frontend/src/modules/dashboard/views/ClientDashboardView.vue
git commit -m "feat: conectar RoadSafetyResumenTab como Hoja 1 en el panel cliente"
```

---

### Task 7: Rediseño de Vehículos (Hoja2Tab) — donut, estado de flota, rendimiento, vencimientos, CSV

**Files:**
- Create: `frontend/src/utils/downloadCsv.ts`
- Modify: `frontend/src/utils/chartTheme.ts`
- Modify: `frontend/src/components/dashboard/roadSafety/RoadSafetyHoja2Tab.vue`
- Modify: `frontend/src/i18n/locales/es.json`
- Modify: `frontend/src/i18n/locales/en.json`

**Interfaces:**
- Produces: `export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]): void` — lo reutiliza Task 8. `export const CHART_CATEGORY_COLORS` en `chartTheme.ts` — también lo reutiliza cualquier gráfico categórico futuro.
- Consumes: `ServiceDistributionDonut` (existente, sin modificar) y `HorizontalBarChart` (Task 4).

- [ ] **Step 1: Crear el util compartido de exportación CSV**

Crear `frontend/src/utils/downloadCsv.ts`:

```typescript
/** Descarga un arreglo de filas como archivo CSV — mismo patrón que
 * `exportCsv()` en ReportesTab.vue (BOM + comillas escapadas + Blob),
 * extraído a un util compartido para los botones "Descargar CSV" de
 * Vehículos y Personas (Seguridad Vial). No reemplaza el `exportCsv()` de
 * ReportesTab.vue (Higiene Industrial) para no tocar código ya probado de
 * un servicio distinto — mismo criterio de "no romper lo que funciona". */
function escapeCsvValue(value: string | number): string {
  const str = String(value)
  return /[",\n;]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvValue).join(';'))
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 2: Agregar la paleta categórica compartida**

En `frontend/src/utils/chartTheme.ts`, agregar al final del archivo:

```typescript
/** Paleta categórica para gráficos con múltiples series sin relación de
 * severidad entre sí (ej. "vehículos por tipo") — a diferencia de
 * SEMAPHORE_HEX (que sí tiene significado semántico verde/amarillo/rojo),
 * esta es solo para diferenciar categorías visualmente. Mismos 8 colores
 * que usa el HTML de referencia del cliente para este propósito. */
export const CHART_CATEGORY_COLORS = [
  '#2a78d6',
  '#eb6834',
  '#1baf7a',
  '#eda100',
  '#e87ba4',
  '#008300',
  '#4a3aa7',
  '#e34948',
] as const
```

- [ ] **Step 3: Ampliar el script de RoadSafetyHoja2Tab.vue**

En `frontend/src/components/dashboard/roadSafety/RoadSafetyHoja2Tab.vue`, el bloque de imports actual (líneas 1-17):

```typescript
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Pencil } from 'lucide-vue-next'
import {
  getRoadSafetyHoja2,
  correctRoadSafetyVehiculoField,
  RoadSafetyRequestError,
  type RoadSafetyFieldValue,
} from '@/services/roadSafety.service'
import { formatDate } from '@/utils/formatDate'
import type { Locale } from '@/i18n'
import type { RoadSafetyVehiculo } from '@/types/roadSafety'
import { SEMAPHORE_STYLES } from '@/utils/semaphoreStyles'
import type { CategoryCardStatus } from '@/types/dashboard'
import RoadSafetyCorrectFieldModal from './RoadSafetyCorrectFieldModal.vue'
import { useToast } from '@/composables/useToast'
```

pasa a:

```typescript
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Pencil } from 'lucide-vue-next'
import {
  getRoadSafetyHoja2,
  correctRoadSafetyVehiculoField,
  RoadSafetyRequestError,
  type RoadSafetyFieldValue,
} from '@/services/roadSafety.service'
import { formatDate } from '@/utils/formatDate'
import type { Locale } from '@/i18n'
import type { RoadSafetyVehiculo } from '@/types/roadSafety'
import { SEMAPHORE_STYLES } from '@/utils/semaphoreStyles'
import type { CategoryCardStatus } from '@/types/dashboard'
import RoadSafetyCorrectFieldModal from './RoadSafetyCorrectFieldModal.vue'
import { useToast } from '@/composables/useToast'
import ServiceDistributionDonut from '../ServiceDistributionDonut.vue'
import HorizontalBarChart from '../HorizontalBarChart.vue'
import { CHART_CATEGORY_COLORS } from '@/utils/chartTheme'
import { downloadCsv } from '@/utils/downloadCsv'
```

Justo después del bloque `const ALERTA_STATUS: Record<...> = { ... }` (líneas 50-54 actuales), agregar estos computeds nuevos (antes de `function fecha(...)`):

```typescript
const tipoDonutSlices = computed(() => {
  const counts = new Map<string, number>()
  for (const v of vehiculos.value) {
    const tipo = v.tipo ?? t('roadSafety.hoja2.sinTipo')
    counts.set(tipo, (counts.get(tipo) ?? 0) + 1)
  }
  return [...counts.entries()].map(([label, value], i) => ({
    label,
    value,
    color: CHART_CATEGORY_COLORS[i % CHART_CATEGORY_COLORS.length],
  }))
})

const estadoFlotaItems = computed(() => [
  {
    label: t('roadSafety.alerta.vehiculo.OK'),
    value: vehiculos.value.filter((v) => v.alerta === 'OK').length,
    colorClass: 'bg-emerald-500',
  },
  {
    label: t('roadSafety.alerta.vehiculo.ALERTA'),
    value: vehiculos.value.filter((v) => v.alerta === 'ALERTA').length,
    colorClass: 'bg-amber-500',
  },
  {
    label: t('roadSafety.alerta.vehiculo.VENCIDO'),
    value: vehiculos.value.filter((v) => v.alerta === 'VENCIDO').length,
    colorClass: 'bg-red-500',
  },
])

const rendimientoItems = computed(() =>
  vehiculos.value
    .filter((v) => v.rendimientoKmGal != null && v.rendimientoBaseKmGal != null)
    .map((v) => {
      const max = Math.max(v.rendimientoKmGal!, v.rendimientoBaseKmGal!, 1) * 1.15
      return {
        placa: v.placa,
        actual: v.rendimientoKmGal!,
        base: v.rendimientoBaseKmGal!,
        pctActual: Math.max(2, (v.rendimientoKmGal! / max) * 100),
        pctBase: Math.max(2, (v.rendimientoBaseKmGal! / max) * 100),
      }
    }),
)

const vencimientosItems = computed(() => {
  const items: { label: string; value: number; display: string; colorClass: string; dias: number }[] = []
  for (const v of vehiculos.value) {
    if (v.diasSoat != null) {
      items.push({
        label: `${v.placa} · SOAT`,
        dias: v.diasSoat,
        value: Math.max(Math.abs(v.diasSoat), 3),
        display: v.diasSoat <= 0 ? t('roadSafety.hoja2.vencido') : `${v.diasSoat} d`,
        colorClass: v.diasSoat <= 0 ? 'bg-red-500' : v.diasSoat <= 30 ? 'bg-amber-500' : 'bg-emerald-500',
      })
    }
    if (v.diasRtm != null) {
      items.push({
        label: `${v.placa} · RTM`,
        dias: v.diasRtm,
        value: Math.max(Math.abs(v.diasRtm), 3),
        display: v.diasRtm <= 0 ? t('roadSafety.hoja2.vencido') : `${v.diasRtm} d`,
        colorClass: v.diasRtm <= 0 ? 'bg-red-500' : v.diasRtm <= 30 ? 'bg-amber-500' : 'bg-emerald-500',
      })
    }
  }
  return items.sort((a, b) => a.dias - b.dias)
})
const vencimientosMax = computed(() => Math.max(...vencimientosItems.value.map((i) => Math.abs(i.dias)), 30))

function exportCsv() {
  const headers = [
    t('roadSafety.hoja2.placa'),
    t('roadSafety.hoja2.tipo'),
    t('roadSafety.hoja2.ciudad'),
    t('roadSafety.hoja2.conductores'),
    t('roadSafety.hoja2.soatVence'),
    t('roadSafety.hoja2.diasSoat'),
    t('roadSafety.hoja2.rtmVence'),
    t('roadSafety.hoja2.diasRtm'),
    t('roadSafety.hoja2.comparendos'),
    t('roadSafety.hoja2.kmActual'),
    t('roadSafety.hoja2.pruebaFrenado'),
    t('roadSafety.hoja2.labrado'),
    t('roadSafety.hoja2.anomalia'),
    t('roadSafety.hoja2.alerta'),
  ]
  const rows = filtrados.value.map((v) => [
    v.placa,
    v.tipo ?? '',
    v.ciudad ?? '',
    v.conductoresAsignados ?? '',
    v.soatVence ?? '',
    v.diasSoat ?? '',
    v.rtmVence ?? '',
    v.diasRtm ?? '',
    v.comparendos,
    v.kmActual ?? '',
    v.pruebaFrenado ?? '',
    v.llantasLabradoMm ?? '',
    v.anomaliaConsumoPct ?? '',
    t(`roadSafety.alerta.vehiculo.${v.alerta}`),
  ])
  downloadCsv(`vehiculos-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows)
}
```

- [ ] **Step 4: Ampliar el template — sección de gráficos antes de la tabla, y botón CSV**

En el `<template>` de `RoadSafetyHoja2Tab.vue`, el bloque actual del filtro:

```vue
<template>
  <div class="grid gap-4">
    <input
      v-model="filtroPlaca"
      type="text"
      :placeholder="t('roadSafety.hoja2.filtroPlaca')"
      class="w-full max-w-xs rounded-sm border border-line-strong bg-white px-3 py-2 text-sm text-navy-900"
    />

    <p v-if="status === 'loading'" class="text-sm text-navy-700">{{ t('roadSafety.loading') }}</p>
    <div v-else class="overflow-hidden rounded-lg border border-line-strong bg-white">
```

pasa a:

```vue
<template>
  <div class="grid gap-4">
    <p v-if="status === 'loading'" class="text-sm text-navy-700">{{ t('roadSafety.loading') }}</p>
    <template v-else>
      <div class="grid gap-4 lg:grid-cols-3">
        <div class="rounded-lg border border-line-strong bg-white p-4">
          <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
            {{ t('roadSafety.hoja2.tipoDistribucionTitle') }}
          </p>
          <ServiceDistributionDonut :slices="tipoDonutSlices" />
        </div>
        <div class="rounded-lg border border-line-strong bg-white p-4">
          <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
            {{ t('roadSafety.hoja2.estadoFlotaTitle') }}
          </p>
          <HorizontalBarChart :items="estadoFlotaItems" :max="vehiculos.length" />
        </div>
        <div class="rounded-lg border border-line-strong bg-white p-4">
          <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
            {{ t('roadSafety.hoja2.rendimientoTitle') }}
          </p>
          <div class="grid gap-2.5">
            <div v-for="r in rendimientoItems" :key="r.placa" class="flex items-center gap-3 text-[13px]">
              <p class="w-[30%] shrink-0 truncate font-mono font-semibold text-navy-900">{{ r.placa }}</p>
              <div class="flex flex-1 flex-col gap-1">
                <div class="h-2.5 overflow-hidden rounded-full bg-line">
                  <div class="h-full rounded-full bg-sky-400" :style="{ width: `${r.pctActual}%` }" />
                </div>
                <div class="h-2.5 overflow-hidden rounded-full bg-line">
                  <div class="h-full rounded-full bg-navy-700/40" :style="{ width: `${r.pctBase}%` }" />
                </div>
              </div>
              <p class="w-16 shrink-0 text-right font-mono text-xs font-bold tabular-nums text-navy-900">
                {{ r.actual }}/{{ r.base }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="rounded-lg border border-line-strong bg-white p-4">
        <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
          {{ t('roadSafety.hoja2.vencimientosTitle') }}
        </p>
        <HorizontalBarChart :items="vencimientosItems" :max="vencimientosMax" />
      </div>

      <div class="flex items-center justify-between gap-3">
        <input
          v-model="filtroPlaca"
          type="text"
          :placeholder="t('roadSafety.hoja2.filtroPlaca')"
          class="w-full max-w-xs rounded-sm border border-line-strong bg-white px-3 py-2 text-sm text-navy-900"
        />
        <button
          type="button"
          class="shrink-0 rounded-sm border border-line-strong bg-white px-3 py-2 text-xs font-semibold text-navy-700 hover:bg-cream"
          @click="exportCsv"
        >
          {{ t('roadSafety.hoja2.exportCsv') }}
        </button>
      </div>

      <div class="overflow-hidden rounded-lg border border-line-strong bg-white">
```

Y el cierre del `<template>` — el bloque final actual:

```vue
    <RoadSafetyCorrectFieldModal
      v-if="correcting"
      :field-label="correcting.label"
      :field-type="correcting.type"
      :current-value="(correcting.vehiculo as unknown as Record<string, RoadSafetyFieldValue>)[correcting.field]"
      @submit="handleCorrectSubmit"
      @cancel="correcting = null"
    />
  </div>
</template>
```

pasa a (agrega el `</template>` de cierre del `v-else`, envolviendo lo que antes era el único contenido bajo `v-else`):

```vue
      <RoadSafetyCorrectFieldModal
        v-if="correcting"
        :field-label="correcting.label"
        :field-type="correcting.type"
        :current-value="(correcting.vehiculo as unknown as Record<string, RoadSafetyFieldValue>)[correcting.field]"
        @submit="handleCorrectSubmit"
        @cancel="correcting = null"
      />
    </template>
  </div>
</template>
```

(nota: todo el bloque que antes estaba bajo `v-else` directo del `status === 'loading'` — la tabla completa con su `<div class="overflow-x-auto">...</div>` — queda igual, solo se le agrega una indentación lógica más al quedar dentro del nuevo `<template v-else>` en vez de un `<div v-else>` suelto; el modal de corrección también se mueve dentro de ese mismo `<template>` porque solo tiene sentido mostrarlo cuando ya hay datos cargados).

- [ ] **Step 5: Agregar las claves i18n nuevas — es.json**

En `frontend/src/i18n/locales/es.json`, dentro de `roadSafety.hoja2`, agregar (junto a las claves existentes `placa`, `tipo`, `ciudad`, etc.):

```json
    "sinTipo": "Sin tipo",
    "vencido": "Vencido",
    "exportCsv": "Descargar CSV",
    "tipoDistribucionTitle": "Distribución por tipo de vehículo",
    "estadoFlotaTitle": "Estado de la flota",
    "rendimientoTitle": "Rendimiento de combustible",
    "vencimientosTitle": "Vencimientos SOAT/RTM",
```

- [ ] **Step 6: Agregar las mismas claves en en.json**

En `frontend/src/i18n/locales/en.json`, dentro de `roadSafety.hoja2`:

```json
    "sinTipo": "No type",
    "vencido": "Expired",
    "exportCsv": "Download CSV",
    "tipoDistribucionTitle": "Distribution by vehicle type",
    "estadoFlotaTitle": "Fleet status",
    "rendimientoTitle": "Fuel efficiency",
    "vencimientosTitle": "SOAT/RTM expirations",
```

- [ ] **Step 7: Typecheck y tests**

Run: `cd frontend && npx vue-tsc -b --noEmit`
Expected: sin errores.

Run: `cd frontend && npx vitest run`
Expected: todos los test files pasan.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/utils/downloadCsv.ts frontend/src/utils/chartTheme.ts frontend/src/components/dashboard/roadSafety/RoadSafetyHoja2Tab.vue frontend/src/i18n/locales/es.json frontend/src/i18n/locales/en.json
git commit -m "feat: rediseñar Vehículos (Hoja2) con donut, estado de flota, rendimiento, vencimientos y CSV"
```

---

### Task 8: Rediseño de Personas (Hoja3Tab) — ICC, competencias, CSV

**Files:**
- Modify: `frontend/src/components/dashboard/roadSafety/RoadSafetyHoja3Tab.vue`
- Modify: `frontend/src/i18n/locales/es.json`
- Modify: `frontend/src/i18n/locales/en.json`

**Interfaces:**
- Consumes: `HorizontalBarChart` (Task 4), `downloadCsv` (Task 7).

- [ ] **Step 1: Ampliar el script de RoadSafetyHoja3Tab.vue**

En `frontend/src/components/dashboard/roadSafety/RoadSafetyHoja3Tab.vue`, el bloque de imports actual (líneas 1-17):

```typescript
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Pencil } from 'lucide-vue-next'
import {
  getRoadSafetyHoja3,
  correctRoadSafetyConductorField,
  RoadSafetyRequestError,
  type RoadSafetyFieldValue,
} from '@/services/roadSafety.service'
import { formatDate } from '@/utils/formatDate'
import type { Locale } from '@/i18n'
import type { RoadSafetyConductor } from '@/types/roadSafety'
import RoadSafetyCorrectFieldModal from './RoadSafetyCorrectFieldModal.vue'
import { SEMAPHORE_STYLES } from '@/utils/semaphoreStyles'
import type { CategoryCardStatus } from '@/types/dashboard'
import { useToast } from '@/composables/useToast'
```

pasa a:

```typescript
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Pencil } from 'lucide-vue-next'
import {
  getRoadSafetyHoja3,
  correctRoadSafetyConductorField,
  RoadSafetyRequestError,
  type RoadSafetyFieldValue,
} from '@/services/roadSafety.service'
import { formatDate } from '@/utils/formatDate'
import type { Locale } from '@/i18n'
import type { RoadSafetyConductor } from '@/types/roadSafety'
import RoadSafetyCorrectFieldModal from './RoadSafetyCorrectFieldModal.vue'
import { SEMAPHORE_STYLES } from '@/utils/semaphoreStyles'
import type { CategoryCardStatus } from '@/types/dashboard'
import { useToast } from '@/composables/useToast'
import HorizontalBarChart from '../HorizontalBarChart.vue'
import { downloadCsv } from '@/utils/downloadCsv'
```

Justo después del bloque `const ALERTA_STATUS: Record<...> = { ... }` (líneas 44-48 actuales), agregar (antes de `function fecha(...)`):

```typescript
const iccItems = computed(() =>
  [...conductores.value]
    .filter((c) => c.icc != null)
    .sort((a, b) => (b.icc ?? 0) - (a.icc ?? 0))
    .map((c) => ({
      label: c.nombre,
      value: c.icc!,
      display: `${c.icc}`,
      colorClass: c.icc! >= 70 ? 'bg-emerald-500' : 'bg-red-400',
    })),
)

const COMPETENCIA_FIELDS = [
  { field: 'scoreConduccionSegura', labelKey: 'roadSafety.hoja3.competencia.conduccionSegura' },
  { field: 'scoreManejoDefensivo', labelKey: 'roadSafety.hoja3.competencia.manejoDefensivo' },
  { field: 'scoreManejoComentadoDiurno', labelKey: 'roadSafety.hoja3.competencia.manejoComentadoDiurno' },
  { field: 'scoreManejoComentadoNocturno', labelKey: 'roadSafety.hoja3.competencia.manejoComentadoNocturno' },
  { field: 'scoreConocimientoVehiculo', labelKey: 'roadSafety.hoja3.competencia.conocimientoVehiculo' },
  { field: 'scoreNormasTransito', labelKey: 'roadSafety.hoja3.competencia.normasTransito' },
  { field: 'scoreGestionFatiga', labelKey: 'roadSafety.hoja3.competencia.gestionFatiga' },
  { field: 'scoreInvestigacionSiniestros', labelKey: 'roadSafety.hoja3.competencia.investigacionSiniestros' },
  { field: 'scorePrimerosAuxilios', labelKey: 'roadSafety.hoja3.competencia.primerosAuxilios' },
] as const

const competenciasItems = computed(() => {
  const items = COMPETENCIA_FIELDS.map(({ field, labelKey }) => {
    const valores = conductores.value.map((c) => c[field]).filter((v): v is number => v != null)
    const promedio = valores.length > 0 ? Math.round(valores.reduce((a, b) => a + b, 0) / valores.length) : 0
    return { label: t(labelKey), value: promedio, display: `${promedio}`, colorClass: 'bg-sky-400' }
  })
  return items.sort((a, b) => b.value - a.value)
})

function exportCsv() {
  const headers = [
    t('roadSafety.hoja3.documento'),
    t('roadSafety.hoja3.nombre'),
    t('roadSafety.hoja3.actorVial'),
    t('roadSafety.hoja3.ciudad'),
    t('roadSafety.hoja3.licenciaVence'),
    t('roadSafety.hoja3.diasLicencia'),
    t('roadSafety.hoja3.estadoSalud'),
    t('roadSafety.hoja3.icc'),
    t('roadSafety.hoja3.resultado'),
    t('roadSafety.hoja3.alerta'),
  ]
  const rows = conductores.value.map((c) => [
    c.documento,
    c.nombre,
    c.actorVial ?? '',
    c.ciudad ?? '',
    c.licenciaVence ?? '',
    c.diasLicencia ?? '',
    c.estadoSalud ?? '',
    c.icc ?? '',
    c.resultado ?? '',
    t(`roadSafety.alerta.conductor.${c.alerta}`),
  ])
  downloadCsv(`conductores-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows)
}
```

- [ ] **Step 2: Ampliar el template**

El `<template>` actual de `RoadSafetyHoja3Tab.vue`:

```vue
<template>
  <div class="grid gap-4">
    <p v-if="status === 'loading'" class="text-sm text-navy-700">{{ t('roadSafety.loading') }}</p>
    <div v-else class="overflow-hidden rounded-lg border border-line-strong bg-white">
```

pasa a:

```vue
<template>
  <div class="grid gap-4">
    <p v-if="status === 'loading'" class="text-sm text-navy-700">{{ t('roadSafety.loading') }}</p>
    <template v-else>
      <div class="grid gap-4 lg:grid-cols-2">
        <div class="rounded-lg border border-line-strong bg-white p-4">
          <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
            {{ t('roadSafety.hoja3.iccTitle') }}
          </p>
          <HorizontalBarChart :items="iccItems" :max="100" />
        </div>
        <div class="rounded-lg border border-line-strong bg-white p-4">
          <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
            {{ t('roadSafety.hoja3.competenciasTitle') }}
          </p>
          <HorizontalBarChart :items="competenciasItems" :max="100" />
        </div>
      </div>

      <div class="flex items-center justify-end">
        <button
          type="button"
          class="rounded-sm border border-line-strong bg-white px-3 py-2 text-xs font-semibold text-navy-700 hover:bg-cream"
          @click="exportCsv"
        >
          {{ t('roadSafety.hoja3.exportCsv') }}
        </button>
      </div>

      <div class="overflow-hidden rounded-lg border border-line-strong bg-white">
```

Y el cierre actual:

```vue
    <RoadSafetyCorrectFieldModal
      v-if="correcting"
      :field-label="correcting.label"
      :field-type="correcting.type"
      :current-value="(correcting.conductor as unknown as Record<string, RoadSafetyFieldValue>)[correcting.field]"
      @submit="handleCorrectSubmit"
      @cancel="correcting = null"
    />
  </div>
</template>
```

pasa a:

```vue
      <RoadSafetyCorrectFieldModal
        v-if="correcting"
        :field-label="correcting.label"
        :field-type="correcting.type"
        :current-value="(correcting.conductor as unknown as Record<string, RoadSafetyFieldValue>)[correcting.field]"
        @submit="handleCorrectSubmit"
        @cancel="correcting = null"
      />
    </template>
  </div>
</template>
```

(igual que en la Task 7: la tabla completa que estaba bajo `v-else` queda dentro del nuevo `<template v-else>`, sin cambios propios más que la indentación).

- [ ] **Step 3: Agregar las claves i18n nuevas — es.json**

En `frontend/src/i18n/locales/es.json`, dentro de `roadSafety.hoja3`, agregar:

```json
    "iccTitle": "Índice de competencia del conductor (ICC)",
    "competenciasTitle": "Competencias — promedio de la flota",
    "exportCsv": "Descargar CSV",
    "competencia": {
      "conduccionSegura": "Conducción segura",
      "manejoDefensivo": "Manejo defensivo",
      "manejoComentadoDiurno": "Manejo comentado diurno",
      "manejoComentadoNocturno": "Manejo comentado nocturno",
      "conocimientoVehiculo": "Conocimiento del vehículo",
      "normasTransito": "Normas de tránsito",
      "gestionFatiga": "Gestión de la fatiga",
      "investigacionSiniestros": "Investigación de siniestros",
      "primerosAuxilios": "Primeros auxilios"
    },
```

- [ ] **Step 4: Agregar las mismas claves en en.json**

En `frontend/src/i18n/locales/en.json`, dentro de `roadSafety.hoja3`:

```json
    "iccTitle": "Driver competency index (ICC)",
    "competenciasTitle": "Competencies — fleet average",
    "exportCsv": "Download CSV",
    "competencia": {
      "conduccionSegura": "Safe driving",
      "manejoDefensivo": "Defensive driving",
      "manejoComentadoDiurno": "Daytime commented driving",
      "manejoComentadoNocturno": "Nighttime commented driving",
      "conocimientoVehiculo": "Vehicle knowledge",
      "normasTransito": "Traffic rules",
      "gestionFatiga": "Fatigue management",
      "investigacionSiniestros": "Incident investigation",
      "primerosAuxilios": "First aid"
    },
```

- [ ] **Step 5: Typecheck y tests**

Run: `cd frontend && npx vue-tsc -b --noEmit`
Expected: sin errores.

Run: `cd frontend && npx vitest run`
Expected: todos los test files pasan.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/dashboard/roadSafety/RoadSafetyHoja3Tab.vue frontend/src/i18n/locales/es.json frontend/src/i18n/locales/en.json
git commit -m "feat: rediseñar Personas (Hoja3) con gráfico ICC, competencias y CSV"
```

---

### Task 9: Rediseño de Rutograma (Hoja4Tab) — chips para condiciones de riesgo

**Files:**
- Modify: `frontend/src/components/dashboard/roadSafety/RoadSafetyHoja4Tab.vue`
- Modify: `frontend/src/i18n/locales/es.json`
- Modify: `frontend/src/i18n/locales/en.json`

- [ ] **Step 1: Reemplazar el bloque de checkboxes por chips**

En `frontend/src/components/dashboard/roadSafety/RoadSafetyHoja4Tab.vue`, el bloque actual de "Condiciones de Riesgo" (líneas 161-177):

```vue
        <div class="overflow-hidden rounded-lg border border-line-strong bg-white">
          <p
            class="border-b border-line-strong bg-sky-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-navy-700"
          >
            {{ t('roadSafety.hoja4.condicionesRiesgo') }}
          </p>
          <div class="grid gap-2 p-4 sm:grid-cols-2">
            <label
              v-for="c in ruta.condicionesRiesgo"
              :key="c.clave"
              class="flex items-center gap-2 text-sm text-navy-900"
            >
              <input type="checkbox" :checked="c.marcado" disabled class="h-4 w-4 rounded-sm border-line-strong" />
              {{ c.etiqueta }}
            </label>
          </div>
        </div>
```

pasa a:

```vue
        <div class="overflow-hidden rounded-lg border border-line-strong bg-white">
          <p
            class="border-b border-line-strong bg-sky-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-navy-700"
          >
            {{ t('roadSafety.hoja4.condicionesRiesgo') }}
          </p>
          <div class="flex flex-wrap gap-2 p-4">
            <span
              v-for="c in ruta.condicionesRiesgo.filter((c) => c.marcado)"
              :key="c.clave"
              class="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700"
            >
              {{ c.etiqueta }}
            </span>
            <p v-if="!ruta.condicionesRiesgo.some((c) => c.marcado)" class="text-sm text-navy-700/50">
              {{ t('roadSafety.hoja4.condicionesEmpty') }}
            </p>
          </div>
        </div>
```

- [ ] **Step 2: Agregar la clave i18n nueva — es.json**

En `frontend/src/i18n/locales/es.json`, dentro de `roadSafety.hoja4`, agregar:

```json
    "condicionesEmpty": "Sin condiciones de riesgo marcadas para esta ruta.",
```

- [ ] **Step 3: Agregar la misma clave en en.json**

En `frontend/src/i18n/locales/en.json`, dentro de `roadSafety.hoja4`:

```json
    "condicionesEmpty": "No risk conditions marked for this route.",
```

- [ ] **Step 4: Typecheck y tests**

Run: `cd frontend && npx vue-tsc -b --noEmit`
Expected: sin errores.

Run: `cd frontend && npx vitest run`
Expected: todos los test files pasan.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/dashboard/roadSafety/RoadSafetyHoja4Tab.vue frontend/src/i18n/locales/es.json frontend/src/i18n/locales/en.json
git commit -m "feat: rediseñar Rutograma (Hoja4) — condiciones de riesgo como chips"
```

---

### Task 10: Verificación final de regresión

**Files:** ninguno (solo verificación).

- [ ] **Step 1: Typecheck completo**

Run: `cd frontend && npx vue-tsc -b --noEmit`
Expected: sin errores.

- [ ] **Step 2: Suite completa de tests**

Run: `cd frontend && npx vitest run`
Expected: todos los test files pasan, incluidos `clientSheets.config.test.ts` (6 hojas), `roadSafetyCompliance.test.ts` (con `buildPesvByFaseCompliance`), `roadSafetyAlerts.test.ts` (nuevo).

- [ ] **Step 3: Verificación manual en el navegador**

Con backend y frontend corriendo localmente, iniciar sesión como cliente con el servicio "Seguridad Vial" contratado (o como admin sobre una organización de prueba con datos de road safety cargados):

1. **Menú**: confirmar que "Dashboard" aparece como encabezado del acordeón (sin resaltarse como pestaña activa al entrar) y que debajo aparecen, en orden: "Hoja 1", "Hoja 2", "Hoja 3", "Hoja 4", "Hoja 5". Al entrar al servicio, la vista debe aterrizar directo en "Hoja 1" (resaltada como activa), no en una pantalla vacía de "Dashboard".
2. **Hoja 1**: confirmar que se ven las 4 tarjetas KPI (incluidas las 2 nuevas: "Conductores sin aprobar" e "ICC promedio de la flota"), el gráfico de barras "Cumplimiento PESV por fase" (4 barras F1-F4), la lista de "Alertas activas" con detalle (no solo contadores), los gráficos de barras de "Actores viales" y "Parque automotor", y las 4 tarjetas de "Cobertura operacional".
3. **Hoja 2 (Vehículos)**: confirmar que aparecen el donut por tipo, las barras de estado de flota, las barras dobles de rendimiento, las barras de vencimiento SOAT/RTM, y que la tabla original + filtro por placa + botón "Descargar CSV" siguen funcionando (descargar el CSV y confirmar que abre con las columnas esperadas).
4. **Hoja 3 (Personas)**: confirmar el gráfico de barras ICC por conductor, el gráfico de competencias promedio, y que la tabla original + botón CSV siguen funcionando.
5. **Hoja 4 (Rutograma)**: confirmar que las condiciones de riesgo se ven como chips (solo las marcadas), y que el resto de la tarjeta (encabezado, info general, organismos de apoyo, puntos de la ruta con sus 6 columnas) sigue exactamente igual que antes.
6. **Regresión — Panel de alertas / Historial / Informes**: confirmar que estos 3 ítems del menú (hermanos de "Dashboard", fuera del acordeón) siguen abriendo y funcionando sin cambios.
7. **Regresión — carga de Excel**: subir el archivo `registro_seguridad_vial_MSSV_1.xlsx` (o uno de prueba) desde el flujo existente y confirmar que el historial registra la carga y que las 5 hojas reflejan los datos nuevos correctamente.
8. **Regresión — Higiene Industrial**: confirmar que el menú y las vistas de Higiene Industrial no cambiaron en nada.
9. **Regresión — Panel de administración (Operación → Seguridad Vial)**: confirmar que el panel admin sigue mostrando su propio "Dashboard" con selector de empresa + carga de Excel exactamente igual que antes (este panel no fue tocado por el plan).

- [ ] **Step 4: Reportar resultados**

Resumir aprobado/fallado de cada uno de los 9 puntos del Step 3, además de la confirmación de typecheck/tests de los Steps 1-2. No dar el plan por completo si algún punto falla — corregir y volver a verificar antes.
