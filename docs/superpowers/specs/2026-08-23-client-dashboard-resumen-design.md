# Dashboard de resumen para cliente + reordenar sidebar — diseño

## Contexto

Hoy, un cliente autenticado nunca ve una pantalla propia de resumen: al iniciar sesión, `getDashboardPath()` (`frontend/src/utils/dashboardRedirect.ts`) lo manda directo a su **primer** servicio contratado (`/dashboard/{primerServicioSlug}`), donde ve el contenido interno de ESE servicio únicamente. Si tiene 2+ servicios contratados, nunca hay un punto de entrada que muestre "todo lo mío de un vistazo" — tiene que navegar servicio por servicio desde el sidebar.

El administrador sí tiene esa vista: `AdminDashboardView.vue` es una pantalla propia (ítem "Dashboard" en el sidebar, separado de "Operación") con tarjetas de resumen agregadas. Esta feature le da al cliente el mismo patrón: una pantalla "Dashboard" propia, separada de cada servicio, con un resumen cruzado de sus servicios contratados + un feed de noticias publicadas por el admin.

Además, el sidebar del cliente tiene hoy el orden `SERVICIOS` (arriba) → `GENERAL` (abajo) — inverso al patrón que ya usa el sidebar de Admin (`ADMINISTRACIÓN`, equivalente a General, arriba → `OPERACIÓN`, los servicios, abajo). Esta feature alinea ambos sidebars al mismo orden.

## Alcance

**Frontend únicamente.** No se crea backend nuevo — todo se arma con endpoints que ya existen:
- El dashboard genérico por servicio (usado hoy por Higiene Industrial) para su métrica de cumplimiento.
- `getRoadSafetyHoja1` (usado hoy por la Hoja 1 de Seguridad Vial) para su métrica de cumplimiento PESV.
- `listNotifications({ type: 'MENSAJE_ADMIN' })` (`frontend/src/services/notification.service.ts:35`, ya soporta filtro por `type`) para el feed de noticias.

**No se toca:** el sidebar de Admin (ya está correcto, es la referencia de orden), el contenido interno de cada servicio (Higiene Industrial, Seguridad Vial — solo se accede a ellos desde el sidebar en vez de aterrizar ahí por defecto), el sistema de notificaciones backend, el panel de Notificaciones ya existente (`NotificationsPanel.vue`).

## 1. Nueva ruta y vista `ClientHomeView.vue`

Nueva ruta cliente, análoga a la ruta admin `/:locale/dashboard/admin/dashboard`:

```
path: '/:locale(es|en)/dashboard/resumen'
name: 'dashboard-resumen'
component: ClientHomeView.vue (nuevo, en frontend/src/modules/dashboard/views/)
meta: { requiresAuth: true }
```

Esta vista **no** recibe `:serviceSlug` — es la landing page del cliente, independiente de cualquier servicio individual. Usa el mismo layout con sidebar que ya usa `ClientDashboardView.vue` (`DashboardLayout` + `DashboardSidebar`), para que el sidebar se vea idéntico entre esta pantalla y las de cada servicio.

**Cambio en `dashboardRedirect.ts`:** el bloque que hoy calcula `firstServicePermission` y redirige a `/dashboard/{slug}` (líneas 15-19) cambia a redirigir siempre a `/${locale}/dashboard/resumen` si el usuario tiene al menos un permiso `dashboard.*.view` (no importa cuál sea "el primero"). Si no tiene ningún servicio contratado, se mantiene el fallback actual a `/${locale}/`.

## 2. Resumen cruzado de servicios contratados

Sección con una tarjeta por cada servicio contratado (mismo criterio de "servicios contratados" que ya usa el sidebar — lista de `ServiceOption` vía `listMyContractedServices()`), reutilizando el componente `SummaryCard`/`ClientStatCard` ya existente (mismo que usa `AdminDashboardView.vue`).

Cada tarjeta muestra: ícono del servicio (reutiliza `iconForService()`), nombre del servicio (reutiliza `serviceLabel()`), su métrica de cumplimiento más importante, y un botón/enlace "Ver detalle" que navega a `/dashboard/{slug}`.

**Adaptador por servicio** (nuevo archivo pequeño, ej. `frontend/src/utils/clientDashboardSummary.ts`): dado un `slug`, resuelve qué endpoint llamar y cómo extraer el número de cumplimiento:
- `higiene-industrial` → llama el mismo endpoint que ya consume el dashboard genérico de ese servicio, usa `globalCompliance.pct`.
- `seguridad-vial` → llama `getRoadSafetyHoja1()`, usa `cumplimientoPesvGlobal`.
- Si aparece un slug no contemplado (tercer servicio futuro), la tarjeta se muestra igual (ícono + nombre) pero sin métrica de cumplimiento (solo el enlace "Ver detalle") — nunca se rompe la pantalla por un servicio no mapeado en el adaptador.

Las tarjetas se cargan en paralelo (una petición por servicio contratado, vía `Promise.all` — con el catálogo típico de 1-5 servicios por cliente esto es liviano, no hace falta un endpoint agregado nuevo).

## 3. Feed de noticias (MENSAJE_ADMIN)

Sección "Noticias" con las **5 más recientes** notificaciones tipo `MENSAJE_ADMIN` dirigidas al cliente autenticado, vía `listNotifications({ type: 'MENSAJE_ADMIN', pageSize: 5 })`. Cada fila reutiliza `NotificationItem.vue` tal cual (mismo componente que ya usa `NotificationsPanel.vue`), sin duplicar su lógica de formato/estado leído-no-leído.

Encabezado de la sección con enlace "Ver todas" que navega al panel de Notificaciones ya existente (`activeTab = 'notificaciones'`, mismo mecanismo que ya usa `NotificationBell.vue` hoy — `ClientDashboardView.vue:82-88` — pero como esta pantalla nueva no es `ClientDashboardView.vue`, el enlace navega por URL a `/dashboard/{primerServicioSlug}?tab=notificaciones`, replicando el mismo patrón de query param que ya interpreta esa vista).

**Si el cliente no tiene noticias:** se muestra un estado vacío simple ("No hay noticias por ahora"), no se oculta la sección completa — mismo criterio de estado vacío explícito que ya usan otras secciones de este proyecto (ej. el catálogo de la sección 5.2 de Seguridad Vial cuando no hay rutas cargadas), nunca una sección que desaparece sin explicación.

**No se marca como leído automáticamente al mostrarse en este feed** — el estado de leído/no leído se maneja igual que hoy, solo al abrir el detalle o desde el panel completo. Esta pantalla es de solo lectura para el feed.

## 4. Reordenar sidebar del cliente

En `DashboardSidebar.vue`, el bloque `GENERAL` (líneas 307-379 hoy) se mueve a **antes** del bloque `SERVICIOS` (líneas 155-305 hoy) en el template — puro cambio de posición del bloque completo, sin tocar su lógica interna de click/estado activo.

Dentro de `GENERAL`, se agrega un nuevo primer ítem **"Dashboard"** (antes de Notificaciones/Mi perfil/Configuración), con ícono `Home` o `LayoutDashboard` (mismo ícono que ya usa Admin para su propio ítem "Dashboard" en `AdminNavSidebar.vue:156-172`, por consistencia visual). Este ítem navega a la ruta `dashboard-resumen` de la sección 1 — a diferencia de Notificaciones/Mi perfil/Configuración (que son claves reservadas de `modelValue` interpretadas dentro de `ClientDashboardView.vue`), "Dashboard" es una navegación real de router (`router.push`), porque `ClientHomeView.vue` es una vista aparte, no un tab dentro de `ClientDashboardView.vue`.

**Resultado final del sidebar cliente (de arriba a abajo):**
```
GENERAL
  Dashboard   ← nuevo
  Notificaciones
  Mi perfil
  Configuración
SERVICIOS
  Higiene Industrial (con sus hojas anidadas)
  Seguridad Vial (con sus hojas anidadas)
```

Mismo orden de bloques que ya usa Admin (`ADMINISTRACIÓN` con Dashboard/Clientes/Notificaciones/etc. arriba, `OPERACIÓN` con los servicios abajo).

## Testing

- No se requieren tests unitarios nuevos más allá de la convención ya usada en el proyecto para vistas de dashboard (composición de piezas ya probadas — `SummaryCard`, `NotificationItem`, los servicios de API ya tienen su propia cobertura).
- Regresión manual: confirmar que un cliente con 1 servicio contratado y un cliente con 2+ ven correctamente sus tarjetas de resumen; confirmar que el feed de noticias funciona con 0 y con varias noticias; confirmar que el sidebar de Admin no cambió; confirmar que navegar a un servicio desde la nueva pantalla "Dashboard" sigue funcionando exactamente igual que hoy (el contenido interno de cada servicio no se toca).

## Fuera de alcance (explícito)

- Cambios al sidebar o dashboard de Admin.
- Cambios al contenido interno de Higiene Industrial o Seguridad Vial.
- Backend nuevo (endpoints, modelos, migraciones) — todo se resuelve con endpoints ya existentes.
- Marcar noticias como leídas automáticamente desde este feed.
- Soporte genérico para "cualquier servicio futuro" más allá del fallback sin-métrica descrito en la sección 2 (si aparece un tercer servicio real, se agrega su caso al adaptador en ese momento, no se sobre-diseña ahora para servicios que no existen).
