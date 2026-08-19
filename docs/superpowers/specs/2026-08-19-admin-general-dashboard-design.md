# Dashboard general de Administración — diseño

## Contexto

Hoy, al iniciar sesión como Admin (super-admin/adminsystem), la ruta por defecto de `/dashboard/admin` redirige a `admin-operacion`: el dashboard de un servicio específico de una empresa específica (primer org, primer servicio del catálogo). No hay ninguna vista que dé al admin una foto general de la plataforma (cuántos clientes, cuántos servicios, estado de cuentas).

## Objetivo

Nueva vista "Dashboard" que se convierte en la pantalla de entrada del admin, con métricas generales de la plataforma. El sidebar se reordena para que "Administración" quede antes de "Operación", con "Dashboard" como primer ítem de Administración (encima de "Clientes").

## Alcance de datos — cero endpoints nuevos

`AdminShell.vue` ya pide, en `onMounted`, `listOrganizationsFull()` (empresas no borradas, cada una con su array `services: {slug, nombre, isActive}[]` y su `responsable: {accountStatus: 'PENDING_ACTIVATION'|'ACTIVE'|'SUSPENDED', ...} | null`) y `listActiveServices()` (catálogo con `isActive: true`), y los provee (`provide('operacionOrganizations', ...)`, `provide('operacionServices', ...)`) a cualquier vista hija vía `router-view`. La nueva vista consume esos mismos `inject()` — no se agrega ninguna petición nueva, ni ruta backend nueva.

Métricas mostradas, todas derivadas client-side:

1. **Clientes registrados**: `operacionOrganizations.length`.
2. **Servicios activos**: `operacionServices.length`.
3. **Clientes por servicio**: una tarjeta por cada servicio del catálogo, contando cuántas organizaciones tienen ese slug en `services` con `isActive: true`.
4. **Estado de cuenta de responsables**: cuenta de organizaciones agrupadas por `responsable.accountStatus` (ACTIVE / PENDING_ACTIVATION / SUSPENDED). Una organización con `responsable: null` (no debería ocurrir en el flujo normal de creación, que siempre crea responsable en la misma transacción) simplemente no se cuenta en este desglose.

No hay notificaciones en este dashboard (ya están en la campana del navbar, visible en toda la sección admin). No hay drill-down ni links desde las tarjetas — solo lectura.

## Componentes reutilizados (sin componentes nuevos)

- `ClientStatCard.vue` — tarjetas de conteo con ícono (mismo componente que ya usa el panel cliente).
- `SEMAPHORE_STYLES` — color verde/amarillo/rojo para el desglose de estado de cuenta (activo/pendiente/suspendido), mismo sistema de color usado en toda la plataforma.
- `iconForService()` / `serviceLabel()` — ícono y nombre localizado por servicio, ya usados en sidebars y checklists.
- `SectionTitleBanner.vue` — encabezado de página, igual que `ClientsListView.vue`/`ServicesListView.vue`.

## Archivo nuevo

`frontend/src/modules/dashboard/views/AdminDashboardView.vue` — única vista nueva. `inject()` de `operacionOrganizations`/`operacionServices` (con fallback a `ref([])` si algún día se monta fuera de `AdminShell.vue`, aunque hoy nunca ocurre). Sin estado propio de carga/error: los datos ya vienen resueltos por `AdminShell.vue` antes de que cualquier vista hija se muestre.

## Ruteo

En `router/index.ts`, dentro de los children de `/:locale(es|en)/dashboard/admin`:

- Nueva entrada: `{ path: 'dashboard', name: 'admin-dashboard', component: () => import('@/modules/dashboard/views/AdminDashboardView.vue'), meta: { permission: 'platform.variables.upload' } }` (mismo permiso que ya gatea `admin-operacion` hoy, para no restringir a nadie que ya podía entrar).
- El redirect vacío `{ path: '', redirect: { name: 'admin-operacion' } }` cambia a `redirect: { name: 'admin-dashboard' }`.

`admin-operacion` no se toca — sigue existiendo y navegable desde "Operación" en el sidebar, solo deja de ser la pantalla de entrada.

## Sidebar (`AdminNavSidebar.vue`)

- Se invierte el orden de los dos `<div>` de secciones: el bloque "Administración" (con su `<p>` de encabezado y su `<ul>`) pasa a renderizarse ANTES que el bloque "Operación". Sin cambios de estilo, solo de orden en el template.
- Nuevo `<li>` al inicio del `<ul>` de Administración (antes del `<li>` de "Clientes"): link a `admin-dashboard`, ícono `LayoutDashboard` (de `lucide-vue-next`, no usado hoy en este archivo), mismas clases de active-state (`border-l-[3px] border-sky-400 bg-white/5 ...`) que los demás links de esa sección — copiando el patrón exacto del `<li>` de "Clientes" que ya existe.
- Nueva clave i18n `dashboard.adminShell.dashboardLink` (es/en) para el label.

## i18n nuevo

Bajo `dashboard.adminGeneralDashboard` (es.json/en.json), claves para: título de página, títulos de cada bloque de tarjetas ("Resumen", "Clientes por servicio", "Estado de cuentas"), y labels de los 3 estados de cuenta. Reutiliza labels de servicio existentes vía `serviceLabel()` (no se agregan nombres de servicio nuevos).

## Fuera de alcance (explícito)

- Sin nuevo endpoint backend, sin cambio de schema.
- Sin gráficos/series temporales — solo conteos puntuales.
- Sin notificaciones embebidas en el dashboard.
- Sin drill-down clicable desde las tarjetas hacia Clientes filtrado.
- `admin-operacion` sigue existiendo tal cual, solo deja de ser el destino por defecto.

## Testing

- Test unitario del cálculo de agregados (función pura extraída, ej. `computeAdminDashboardStats(organizations, services)`), cubriendo: conteo total, conteo por servicio con mezcla de activos/inactivos, desglose por estado de cuenta con los 3 valores presentes y con alguno ausente (0 casos, no debe romper).
- Regresión: confirmar que `admin-operacion` sigue accesible y funcional desde "Operación" en el sidebar, y que el login admin ahora aterriza en `admin-dashboard`.
