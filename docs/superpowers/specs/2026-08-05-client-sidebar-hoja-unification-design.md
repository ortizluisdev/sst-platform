# Unificación de sidebar/header "Hoja N" en la vista Cliente (Higiene Industrial + Seguridad Vial)

**Fecha:** 2026-08-05
**Estado:** Aprobado
**Alcance:** primer sub-proyecto de una uniformización más grande pedida por el product owner (RoMa — Ciencia Aplicada). Cubre SOLO la vista Cliente: sidebar (ítem "Dashboard" como padre expandible con Hoja 1…N anidadas) y encabezado ("Hoja N · Nombre"), para Higiene Industrial y Seguridad Vial. Los demás sub-proyectos (Dashboard Admin de Seguridad Vial con tarjetas de métricas, "Configuración" Admin de Seguridad Vial, generalización de componentes admin) quedan fuera — se abordan en specs separadas.

## Contexto

El pedido original describía 4 subsistemas independientes (sidebar/header cliente, dashboard admin de Seguridad Vial, configuración admin de Seguridad Vial, generalización de componentes) bajo un solo prompt. Se decompuso explícitamente con el usuario, que priorizó este sub-proyecto primero por ser el único requisito "literal, no omitir nada" del product owner, ser 100% frontend (sin backend nuevo) y ser la base que los demás sub-proyectos van a heredar.

**Hallazgo clave que cambia el diagnóstico original:** al leer el código real (no asumir), Higiene Industrial ya cumple casi todo el requisito literal — "Dashboard" ya se expande a Hoja 1/2/3 en el sidebar, y el header ya dice "Hoja 1 · Dashboard" (`dashboard.clientTabs.hoja1` en ambos idiomas). El trabajo real está casi todo del lado de Seguridad Vial, y es más un fix de un bug de anidación + un prefijo faltante que una reconstrucción.

**Bug real identificado en Seguridad Vial** (`DashboardSidebar.vue:25` cruzado con `ClientDashboardView.vue:105-114`): el submenú anidado bajo "Dashboard" incluye por error Alertas/Historial/Informes (deberían ser ítems hermanos sueltos, igual que en Higiene Industrial, no hojas). La causa: `roadSafetyHojaTabs = tabs.filter(tab => tab.key !== 'dashboard')` agarra todo lo que no sea "dashboard", no solo las hojas reales (hoja1-4).

**Verificado antes de tocar números:** no existe ningún estado persistido (localStorage, query params, campo de backend, test e2e) que referencie las hojas de Seguridad Vial por su key o número actual — solo existe `roma-sidebar-collapsed` en localStorage (booleano de colapsado, sin relación). No hay suite e2e en el repo. Renumerar es seguro.

**Verificado i18n:** `en.json` ya tiene el mismo patrón "Sheet N · Nombre" en `dashboard.clientTabs.*` y `roadSafety.tabs.hoja1..4` — no hace falta crear traducciones nuevas para las hojas ya numeradas, solo agregar el prefijo faltante a `roadSafety.tabs.dashboard` y las nuevas claves cortas de sidebar (`hoja1Short..hoja4Short`).

## Decisiones explícitas (aprobadas una por una con el usuario)

1. **Alcance de este sub-proyecto: solo Cliente.** El sidebar de Admin no se toca — Admin y Cliente deben quedar tan separados en Seguridad Vial como ya lo están en Higiene Industrial (confirmado explícitamente por el usuario). La config queda en un archivo compartido/importable para que Admin la reutilice en un sub-proyecto futuro, sin que esta pasada lo obligue.
2. **Keys internas de Seguridad Vial no cambian** (`hoja1`, `hoja2`, `hoja3`, `hoja4` siguen siendo esas keys en código/estado) — solo cambia su `number` de visualización (2, 3, 4, 5 en vez de 1, 2, 3, 4).
3. **Se agrega el prefijo faltante** a `roadSafety.tabs.dashboard`: pasa de `"Dashboard"` a `"Hoja 1 · Dashboard"` (y `"Sheet 1 · Dashboard"` en inglés).
4. **Un solo componente de header** (`SectionTitleBanner.vue`, ya compartido hoy por ambos servicios) — no se crea ninguno nuevo. Solo cambia la fuente del texto: de dos mapas hardcodeados separados a una config compartida.
5. **Duplicación no pedida encontrada** (`CategoryConfigModal.vue` vs `HigieneConfigTab.vue`, ambos hacen CRUD de categorías contra el mismo backend) — **NO se toca en esta pasada.** Queda anotada como deuda técnica para un ticket aparte.
6. **Sidebar: las hojas de Seguridad Vial se acortan** a "Hoja N" (sin nombre), igual que ya lo hace Higiene Industrial en su submenú anidado — el nombre completo queda reservado para el encabezado grande.
7. **Mecanismo de estado no se unifica entre servicios** (`mode: 'substate' | 'realtabs'` en la config, ver abajo) — en Higiene, Hoja 1/2/3 son un sub-estado interno de la pestaña "Dashboard" (`v-model:active-hoja`, vistas livianas); en Seguridad Vial, Hoja 1(=Dashboard)…5 son pestañas reales independientes (`v-model` normal, páginas completas). Forzar un único mecanismo sería una reescritura de estado más arriesgada que lo pedido, y no es necesaria para lograr la misma apariencia y la misma regla "Hoja N".

## Diseño

### Config compartida (nueva)

`frontend/src/config/clientSheets.config.ts`:

```ts
export interface ClientSheetDef {
  key: string          // valor interno: activeHoja (Higiene) o activeTab (Seguridad Vial) — NO cambia
  number: number        // 1-based, contiguo, arranca en 1 (incluye el nodo "Dashboard")
  labelKey: string       // clave i18n → "Hoja N · Nombre" completo, para el encabezado
  shortLabelKey: string  // clave i18n → "Hoja N" corto, para el ítem anidado del sidebar
}

export interface ClientServiceSheetsConfig {
  serviceSlug: string
  mode: 'substate' | 'realtabs'
  sheets: ClientSheetDef[]
}

export const CLIENT_SHEETS_CONFIG: Record<string, ClientServiceSheetsConfig> = {
  'higiene-industrial': {
    serviceSlug: 'higiene-industrial',
    mode: 'substate',
    sheets: [
      { key: 'hoja1', number: 1, labelKey: 'dashboard.clientTabs.hoja1', shortLabelKey: 'dashboard.clientTabs.hoja1Short' },
      { key: 'hoja2', number: 2, labelKey: 'dashboard.clientTabs.hoja2', shortLabelKey: 'dashboard.clientTabs.hoja2Short' },
      { key: 'hoja3', number: 3, labelKey: 'dashboard.clientTabs.hoja3', shortLabelKey: 'dashboard.clientTabs.hoja3Short' },
    ],
  },
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
}
```

Para `mode: 'realtabs'`, el primer elemento de `sheets` (`dashboard`) es el nodo padre clickeable del acordeón; el resto (`hoja1..hoja4`) es el submenú anidado. Para `mode: 'substate'`, el nodo padre es la key `'resumen'` que ya arma `buildDashboardTabs()` (no forma parte de `sheets`, que solo cubre las 3 hojas anidadas).

### Cambios por archivo

- **`frontend/src/components/dashboard/DashboardSidebar.vue`**: el `HOJAS` hardcodeado (Higiene) y el filtro buggy `roadSafetyHojaTabs = tabs.filter(tab => tab.key !== 'dashboard')` (Seguridad Vial) se reemplazan por lecturas a `CLIENT_SHEETS_CONFIG[selectedServiceSlug]`. Seguridad Vial usa `shortLabelKey` en el submenú anidado (ya no el label largo que trae `tabs`).
- **`frontend/src/components/dashboard/client/ClientDashboardHojas.vue`**: se elimina el `TITLES` hardcodeado (líneas 25-29); el título sale de `CLIENT_SHEETS_CONFIG['higiene-industrial'].sheets`.
- **`frontend/src/modules/dashboard/views/ClientDashboardView.vue`**: `roadSafetyTabs` deja de incluir `hoja1..hoja4` en el array plano (línea 105-114) — esas ahora vienen exclusivamente de la config; el array plano queda solo con `dashboard`, `alertas`, `historial`, `reportes` (los ítems hermanos sueltos). Además, la entrada `dashboard` de ese array cambia su `label` de `t('roadSafety.tabs.dashboard')` a `t('roadSafety.tabs.dashboardShort')` (ver corrección de auto-revisión abajo).
- **`frontend/src/components/dashboard/roadSafety/RoadSafetyClientPanel.vue`**: sin cambios de código — su título (`t(\`roadSafety.tabs.${activeTab}\`)`) ya resuelve correctamente una vez cambiado el i18n.
- **`frontend/src/i18n/locales/es.json`** y **`en.json`**: `roadSafety.tabs.dashboard` pasa a `"Hoja 1 · Dashboard"` / `"Sheet 1 · Dashboard"` (usado por el encabezado grande); se agrega **`roadSafety.tabs.dashboardShort` = `"Dashboard"`** (nueva clave, usada por el botón del sidebar — ver corrección abajo) y `roadSafety.tabs.hoja1Short..hoja4Short` = `"Hoja 2".."Hoja 5"` / `"Sheet 2".."Sheet 5"`.

### Corrección de auto-revisión (contradicción detectada y arreglada antes de aprobar)

Al revisar el diseño con ojo crítico encontré una contradicción: `roadSafety.tabs.dashboard` se usa HOY en dos lugares distintos — como texto del botón "Dashboard" del sidebar (corto) y, una vez conectado a la config, como texto del encabezado grande (largo, "Hoja 1 · Dashboard"). Cambiar esa única clave al texto largo (como se aprobó para el encabezado) habría hecho que el botón del sidebar también mostrara el texto largo — rompiendo la paridad visual con Higiene Industrial, cuyo botón "Dashboard" del sidebar SÍ es corto (clave separada `dashboard.tabs.dashboard`, distinta de `dashboard.clientTabs.hoja1` que usa el encabezado). Se corrigió agregando la clave nueva `dashboardShort` exclusiva para el botón del sidebar, dejando `dashboard` (sin sufijo) solo para el encabezado — mismo split de responsabilidades que ya usa Higiene Industrial.

### Explícitamente NO tocado

Rutas del router, `RoadSafetyDashboardTab.vue` y demás tabs de contenido, backend (`roadSafety.routes.ts`, Prisma), `CategoryConfigModal.vue`, `HigieneConfigTab.vue`, cualquier vista o componente de Admin, lógica de negocio/fórmulas de cumplimiento.

## Fuera de alcance (sub-proyectos futuros, specs separadas)

- Dashboard Admin de Seguridad Vial (tarjetas de métricas, badges, dona) — requiere definir primero qué significa "cumplimiento" para un checklist PESV.
- Pantalla "Configuración" Admin de Seguridad Vial (categorías/módulos habilitables, catálogos) — requiere decisiones de negocio sobre qué módulos/catálogos aplican a este dominio.
- Generalización de `SummaryCard`/`ComplianceRing`/`CategoryTab` como componentes reutilizables entre servicios.
- Unificación del sidebar/header entre Admin y Cliente.
- Deuda técnica: unificar `CategoryConfigModal.vue`/`HigieneConfigTab.vue`.

## Verificación

Sin suite e2e en el repo — `npm run typecheck` (backend, no debería tener cambios) + `npx vue-tsc -b` (frontend) + verificación manual en navegador, ambos idiomas:

1. Higiene Industrial (sidebar + header) se ve y navega exactamente igual que antes de este cambio — regresión visual cero.
2. Seguridad Vial: Historial/Informes/Panel de alertas aparecen como ítems sueltos (hermanos), ya NO anidados bajo "Dashboard".
3. Seguridad Vial: submenú anidado bajo "Dashboard" muestra solo Hoja 2/3/4/5, con labels cortos ("Hoja 2", no "Hoja 2 · Generalidad").
4. Seguridad Vial: al entrar al servicio, el header dice "Hoja 1 · Dashboard"; al navegar a cada hoja, dice "Hoja 2 · Generalidad", "Hoja 3 · Vehículos", "Hoja 4 · Personas", "Hoja 5 · Rutograma" — igual en inglés con "Sheet".
5. Correspondencia 1:1 entre lo que muestra el sidebar (colapsado a "Hoja N") y el número que aparece en el header grande, en ambos servicios.
6. Desktop + mobile (drawer), colapsado y expandido.
