# Dashboard general de Administración — tarjetas compactas, donuts, tendencia y tabla

## Contexto

El [dashboard general de Administración](2026-08-19-admin-general-dashboard-design.md) (ya en producción) muestra hoy solo tarjetas de conteo (`ClientStatCard.vue`, tamaño normal). El usuario pidió una versión más profesional: tarjetas más chicas, gráficas (donuts de distribución) y una tabla, además de una tendencia temporal de clientes nuevos.

## Alcance de datos

**Un solo cambio de backend, aditivo:** `Organization.createdAt` (ya existe en la tabla, `prisma/schema.prisma:141`) se agrega al `select` de `listFull()` en `organizations.repository.ts`, se propaga por `organizations.service.ts`/`organizations.controller.ts`, y se agrega al tipo frontend `OrganizationListItem` (`types/organization.ts`) y al de respuesta del endpoint `GET /admin/organizations/full`. Ningún endpoint nuevo, ninguna migración (la columna ya existe).

Todo lo demás se deriva en el frontend de datos que `AdminShell.vue` ya provee (`operacionOrganizations`, `operacionServices`) — mismo patrón que el dashboard actual.

## Layout final (de arriba a abajo)

1. **Resumen** — mismas 2 tarjetas de hoy (Clientes registrados, Servicios activos), en variante `compact` de `ClientStatCard.vue` (la misma prop ya usada en el panel cliente — sin tocar el componente).
2. **Clientes por servicio** — tarjetas `compact` (una por servicio, igual que hoy) en una columna, junto a un donut nuevo (`ServiceDistributionDonut.vue`) que visualiza la misma distribución.
3. **Estado de cuentas** — tarjetas `compact` junto a `ComplianceRing.vue` (reutilizado tal cual), alimentado con un `GlobalCompliance` armado a partir de `cuentasPorEstado` (ver mapeo abajo).
4. **Clientes nuevos por mes** — gráfico de barras de los últimos 6 meses (`MonthlyCountChart.vue`, nuevo, Chart.js), alimentado por una función pura de conteo mensual.
5. **Listado de empresas** — tabla de solo lectura (nombre+NIT, servicios contratados, estado de cuenta del responsable), mismos estilos/badges que `ClientsListView.vue`.

## Componentes nuevos y por qué

- **`ServiceDistributionDonut.vue`** (nuevo, pequeño): dona genérica de `{ label, value, color }[]`, sin acoplarse al semáforo verde/amarillo/rojo — `ComplianceRing.vue` está hardcodeado a exactamente esos 3 colores y no sirve para 5 categorías de servicio. Usa la misma base de Chart.js `Doughnut` + `CHART_TOOLTIP_STYLE` que `ComplianceRing.vue`, con una paleta categórica de 5 colores fija (amber-500, sky-500, emerald-500, violet-500, rose-500 — mismo tono de la paleta ya usada en `iconColorForCategory()`).
- **`MonthlyCountChart.vue`** (nuevo, pequeño): barras de `{ label, count }[]`, vía Chart.js `Bar`. `TrendChart.vue` existente está diseñado para una serie de una variable medida (`promedios[codigo]`, valores decimales, línea) — forzar un conteo de eventos por mes ahí sería un uso indebido de su modelo de datos, no una reutilización real.
- **`ComplianceRing.vue`**: reutilizado sin cambios. Mapeo: `verde = cuentasPorEstado.ACTIVE`, `amarillo = cuentasPorEstado.PENDING_ACTIVATION`, `rojo = cuentasPorEstado.SUSPENDED`, `total = totalClientes`, `pct = round(ACTIVE / total * 100)` (0 si `total === 0`, mismo criterio de `hasData` que ya trae el componente).
- **Tabla de empresas**: sin componente nuevo — markup inline en `AdminDashboardView.vue`, mismas clases Tailwind y mismo helper `statusBadgeClass()` que `ClientsListView.vue:184-188` (duplicado localmente, 3 líneas, no amerita extraerlo a un util compartido con un solo consumidor más).

## Funciones puras nuevas (testeables sin montar componentes)

En `frontend/src/utils/adminDashboardStats.ts` (mismo archivo del dashboard actual, no uno nuevo — es la misma responsabilidad: agregar `organizations`/`services` en estadísticas del dashboard):

- `computeMonthlyRegistrations(organizations: OrganizationListItem[], months = 6, now = new Date()): { label: string; count: number }[]` — devuelve exactamente `months` entradas (una por mes, más reciente al final), incluyendo meses con 0 registros, contando por `createdAt` truncado a año-mes. `label` es la clave `YYYY-MM` (el componente de gráfico la traduce a texto localizado con `Intl.DateTimeFormat`, no aquí — esta función no depende de `locale`).
- El mapeo de `cuentasPorEstado` a `GlobalCompliance` es trivial (4 líneas) y vive directo en `AdminDashboardView.vue` como un `computed`, no amerita función separada en el util.

**Aviso de datos reales:** hoy hay 4 organizaciones, todas creadas en agosto — el gráfico de tendencia se verá casi vacío al principio. Es el comportamiento correcto (no un bug); se llena con el uso real de la plataforma.

## i18n nuevo

Bajo `dashboard.adminGeneralDashboard` (es/en): `monthlyRegistrationsTitle`, `organizationsTableTitle`, y las cabeceras de la tabla `table.{nombre,servicios,estado}`. Son claves propias y nuevas (no un alias de `clients.*`/`organizations.list.table.*`): esta pantalla es independiente de "Clientes" y no debe acoplar su copy a la de otra pantalla, aunque el texto visible resulte igual o parecido hoy. El donut de servicios reutiliza el título ya existente `clientesPorServicioTitle`; el de cuentas reutiliza `accountStatusTitle` — ninguno de los dos necesita un título nuevo, van dentro de la misma `<section>` que ya encabeza cada bloque.

## Fuera de alcance (explícito)

- La tabla de empresas es de solo lectura — sin acciones (editar/suspender/eliminar), esas siguen viviendo únicamente en "Clientes".
- Sin filtros ni paginación en la tabla nueva (la cantidad de empresas hoy es pequeña; si crece, es una mejora futura separada).
- Sin drill-down clicable desde los donuts o la barra hacia otras pantallas.
- Sin cambiar el criterio de "solo servicios activos" ya establecido en `computeAdminDashboardStats` — se mantiene igual, los donuts grafican exactamente los mismos números que ya muestran las tarjetas, no una fuente de verdad distinta.

## Testing

- Tests unitarios de `computeMonthlyRegistrations`: 6 meses exactos con datos en 2 de ellos, meses vacíos en 0, orden cronológico correcto, límite de mes (creado el primer/último día del mes cae en el bucket correcto), organizaciones vacías → 6 meses en 0.
- Regresión: `npx vue-tsc -b --noEmit` + `npx vitest run` limpios en frontend y backend.
- Verificación manual en navegador: dashboard admin muestra las 5 secciones, donuts con colores coherentes con las tarjetas, tabla con datos reales de las 4 organizaciones de prueba, tendencia mensual con agosto poblado y el resto en 0.
