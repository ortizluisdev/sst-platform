# Rediseño de la vista cliente de Seguridad Vial (Hoja 1 nueva + Vehículos/Personas/Rutograma) — diseño

## Contexto

El cliente (Transportes IMA, vía el módulo MSSV de Seguridad Vial) envió un HTML de referencia (`dashboard_TransportesIMA_MSSV.html`) que especifica cómo quiere ver su panel: tarjetas KPI, gráficos de barras horizontales, donuts, tarjetas de ruta con chips de riesgo. Ese HTML es la fuente de verdad del diseño visual solicitado — no fue definido por RoMa, sino por el cliente.

Actualmente en la plataforma, el menú de "Seguridad Vial" tiene un problema de navegación: el ítem "Dashboard" es un link con contenido propio (KPIs básicos: % PESV, conteos de vehículos/conductores/rutas, anillo de cumplimiento, 4 contadores de alerta), y el menú salta directo a "Hoja 2" sin que exista una "Hoja 1" visible. Esto rompe el patrón que sí sigue correctamente "Higiene Industrial", donde "Dashboard" es una etiqueta de agrupación pura (sin ruta ni contenido propio) que se expande en Hoja 1, Hoja 2, Hoja 3.

## Hallazgo de investigación: la "Hoja 1" del Excel ya existe, solo está mal ubicada

El archivo Excel de origen (`registro_seguridad_vial_MSSV_1.xlsx`) tiene 4 hojas de captura que ya se parsean y guardan correctamente en el backend: **Hoja 1 · Generalidad** (PESV 24 pasos + inventario de actores viales/parque automotor/cobertura operacional), **Hoja 2 · Vehículos**, **Hoja 3 · Personas**, **Hoja 4 · Rutograma**. Los datos de "Hoja 1 · Generalidad" del Excel SÍ se guardan (tablas `RoadSafetyPesvStep` y `RoadSafetyInventoryItem`) y ya se sirven vía el endpoint `/api/road-safety/hoja1` — el problema es puramente de organización del menú/frontend, no de datos faltantes.

Hoy esos datos de "Hoja 1" del Excel se muestran en DOS lugares del menú, mal etiquetados:
- El ítem de menú "Dashboard" (componente `RoadSafetyDashboardTab.vue`): vista resumen con tarjetas KPI básicas.
- El ítem de menú etiquetado **"Hoja 2 · Generalidad"** (componente `RoadSafetyHoja1Tab.vue`, clave interna `hoja1`): tabla cruda de los 24 pasos PESV (con evidencia/observaciones) + tablas de inventario.

Es decir, la etiqueta visible de cada hoja está desfasada +1 respecto al número real de la hoja del Excel que representa (lo que se ve como "Hoja 2 · Generalidad" en realidad corresponde a la Hoja 1 del Excel; "Hoja 3 · Vehículos" a la Hoja 2 del Excel, etc.).

## Alcance

**Frontend únicamente.** Sin cambios de backend, Prisma, ni base de datos — se confirmó que todos los datos que pide el HTML del cliente ya están disponibles en las respuestas actuales de `/api/road-safety/hoja1`, `/hoja2`, `/hoja3`, `/hoja4` y `/alertas`; solo falta agregarlos/presentarlos distinto en el cliente.

**No se toca:** el flujo de carga de Excel (parser, endpoints de upload), el guardado en historial, "Panel de alertas", "Historial", "Informes" (quedan como hermanos independientes de "Dashboard", sin cambios), ni el módulo de Higiene Industrial (es la referencia del patrón correcto, ya está bien).

## 1. Nueva estructura de menú

"Dashboard" deja de ser un link con contenido propio y pasa a ser una etiqueta de agrupación pura (sin ruta, sin click funcional, siempre expandida) — el mismo patrón exacto que ya usa Higiene Industrial. El menú de Seguridad Vial queda:

```
Dashboard (etiqueta, sin contenido propio)
  ├─ Hoja 1 · Generalidad   ← NUEVO diseño rico (reemplaza el contenido actual de "Dashboard")
  ├─ Hoja 2 · Generalidad   ← SIN CAMBIOS (tabla cruda 24 pasos PESV + inventario, componente RoadSafetyHoja1Tab.vue existente)
  ├─ Hoja 3 · Vehículos     ← rediseño visual (componente RoadSafetyHoja2Tab.vue)
  ├─ Hoja 4 · Personas      ← rediseño visual (componente RoadSafetyHoja3Tab.vue)
  └─ Hoja 5 · Rutograma     ← rediseño visual (componente RoadSafetyHoja4Tab.vue)
Panel de alertas   (sin cambios)
Historial          (sin cambios)
Informes           (sin cambios)
```

Se elige mantener el total en 5 hojas (no renumerar/colapsar a 4) para preservar la tabla cruda de detalle de los 24 pasos PESV como vista aparte — decisión explícita del usuario tras evaluar la alternativa de renumerar a 4 hojas y descartarla por pérdida de ese detalle.

Al entrar al servicio "Seguridad Vial", la vista por defecto pasa a ser **Hoja 1** (nueva), igual que Higiene Industrial hoy aterriza en su Hoja 1.

**Implementación:** se agrega una nueva entrada al inicio del arreglo `sheets` en `clientSheets.config.ts` para `seguridad-vial` (con una clave interna nueva, p.ej. `resumen`), sin modificar las claves ni componentes de las hojas existentes (`hoja1` a `hoja4` siguen siendo el mismo componente, mismo endpoint, misma posición relativa entre sí — solo se les antepone la nueva). El ítem "Dashboard" deja de tener componente/contenido asociado; su click no navega a ningún lado (el mismo comportamiento que ya tiene Higiene Industrial hoy — se replica el patrón existente, no se inventa uno nuevo).

## 2. Contenido de la nueva "Hoja 1"

Nuevo componente Vue (reemplaza el uso actual de `RoadSafetyDashboardTab.vue` en el menú — ese componente se retira del menú y su lógica de fetch se reutiliza/migra al nuevo). Construido enteramente con datos que YA se obtienen hoy en el fetch paralelo que hace el Dashboard actual (`getRoadSafetyHoja1`, `getRoadSafetyHoja2`, `getRoadSafetyHoja3`, `getRoadSafetyHoja4`, `getRoadSafetyAlertas`) — ningún endpoint nuevo.

Secciones (siguiendo el HTML del cliente, tab "Resumen ejecutivo"):

- **4 tarjetas KPI:**
  - % cumplimiento PESV global — ya existe (`buildPesvGlobalCompliance`).
  - Vehículos con alerta (X / total) — cuenta de `hoja2` donde `alerta !== 'OK'`.
  - **Conductores sin aprobar** (X / total) — cuenta de `hoja3` donde `resultado === 'No aprobado'`. Dato ya calculado por backend, solo se agrega el conteo en frontend.
  - **ICC promedio de la flota** — promedio de `icc` en `hoja3`. Dato ya calculado por backend, solo se agrega el promedio en frontend.
- **Cumplimiento PESV por fase** (gráfico de barras horizontales F1-F4): nueva función pura `buildPesvByFaseCompliance(pasos)` en `roadSafetyCompliance.ts` que agrupa `data.pasos` por `fase` y promedia `porcentajeAvance` por grupo.
- **Alertas activas** (lista con detalle, no solo contadores): se construye combinando los arreglos ya cargados de `hoja2` (vehículos) y `hoja3` (conductores), usando los mismos campos que ya usa `RoadSafetyAlertasTab.vue` para clasificar (días SOAT/RTM, comparendos, km de mantenimiento, anomalía de consumo, llantas, licencia, ICC) — sin endpoint nuevo, función pura nueva en el frontend que arma la lista de alertas con título+descripción por ítem.
- **Inventario — actores viales** y **Parque automotor**: gráfico de barras horizontales (nuevo componente reutilizable, ver sección 4) usando `data.inventario.ACTORES_VIALES.items` y `data.inventario.PARQUE_AUTOMOTOR.items` (mismos datos que hoy se ven como tabla en "Hoja 2 · Generalidad", solo cambia la presentación en esta vista nueva).
- **Cobertura operacional**: 4 tarjetas (sedes, ciudades, rutas, km/mes) usando `data.inventario.COBERTURA_OPERACIONAL.items`.

## 3. Rediseño de Vehículos, Personas y Rutograma

Estas tres vistas mantienen sus componentes/claves/endpoints actuales (`RoadSafetyHoja2Tab.vue`, `RoadSafetyHoja3Tab.vue`, `RoadSafetyHoja4Tab.vue`) — solo se rediseña su presentación visual, agregando gráficos antes de la tabla existente (que se conserva).

### Vehículos (`RoadSafetyHoja2Tab.vue`)
- Donut por tipo de vehículo — agrupación cliente-side de `tipo` en el arreglo de vehículos ya cargado.
- Barras de estado de flota (OK / Alerta / Vencido) — conteo cliente-side del campo `alerta` ya calculado por backend.
- Barras comparativas de rendimiento (actual vs. base) por vehículo — usa `rendimientoKmGal` y `rendimientoBaseKmGal`, ambos ya existentes en `RoadSafetyVehiculo`.
- Barras de vencimiento SOAT/RTM — usa `diasSoat`/`diasRtm`, ya calculados por backend.
- Tabla detallada existente se conserva debajo, sin cambios de columnas.
- Botón "Descargar CSV" (nuevo, ver sección 4).

### Personas (`RoadSafetyHoja3Tab.vue`)
- Gráfico de barras del ICC por conductor — usa `icc`, ya calculado por backend.
- Gráfico de promedio de competencias (9 dimensiones: conducción segura, manejo defensivo, manejo comentado diurno/nocturno, conocimiento del vehículo, normas de tránsito, gestión de fatiga, investigación de siniestros, primeros auxilios) — promedio cliente-side de los 9 campos `score*` ya existentes en `RoadSafetyConductor`.
- Tabla detallada existente se conserva debajo, sin cambios de columnas.
- Botón "Descargar CSV" (nuevo).

### Rutograma (`RoadSafetyHoja4Tab.vue`)
- Se conserva el layout de tarjetas existente (ya es tipo tarjeta, no tabla).
- Las condiciones de riesgo (hoy checkboxes de solo lectura) pasan a mostrarse como "chips" visuales (mismo estilo del HTML del cliente) para las condiciones marcadas como verdaderas.
- La tabla de "Puntos de la ruta" **conserva sus 6 columnas actuales** (kmViaReferencia, señalesTransito, aspectosRelevantes, controlesExistentes, recomendacionesSeguridad, riesgoMasRelevante) — el HTML del cliente simplifica a 3 columnas, pero se decide no reducir para no perder datos que ya se capturan desde el Excel. Solo se restylea visualmente para acercarse a la estética de tarjeta del HTML (mismo criterio: nunca quitar datos ya capturados, solo mejorar presentación).

## 4. Piezas técnicas nuevas compartidas

- **`HorizontalBarChart.vue`** (o nombre equivalente): componente reutilizable de barra horizontal inspirado en el patrón `hbar` del HTML del cliente (etiqueta + barra de progreso + valor). Se usa en Hoja 1 (PESV por fase, actores viales, parque automotor), Vehículos (estado de flota, rendimiento, vencimientos) y Personas (ICC, competencias). Sigue la paleta de colores existente del proyecto (`navy`/`sky`/`emerald`/`amber`/`red` de Tailwind, ya definidos en `style.css`) en vez de introducir la paleta custom `--s1..s8` del HTML — se mapean los colores del cliente a los tokens de diseño ya existentes en la plataforma para mantener consistencia visual con el resto de la app.
- **Extensión de `ServiceDistributionDonut.vue`** (o componente nuevo derivado): para el donut de "vehículos por tipo" en la vista Vehículos.
- **Util de exportación CSV cliente-side** (nuevo, no existe hoy): función simple que arma un blob CSV y dispara la descarga — mismo patrón que la función `csvDownload()` del HTML de referencia, adaptada a TypeScript/Vue. Se usa en Vehículos y Personas.
- **`buildPesvByFaseCompliance(pasos)`**: nueva función pura en `roadSafetyCompliance.ts` que agrupa por fase y promedia avance — reutiliza el mismo tipo `GlobalCompliance`-like que ya usa `buildPesvGlobalCompliance`.

## Testing

- Funciones puras nuevas (`buildPesvByFaseCompliance`, agregación de alertas combinadas, promedio de ICC/competencias) llevan tests unitarios, siguiendo el mismo patrón que ya existe para `roadSafetyCompliance.ts`.
- Regresión manual: confirmar que el flujo de carga de Excel sigue guardando y mostrando datos correctamente en las 5 hojas tras el rediseño; confirmar que Higiene Industrial no se vio afectado; confirmar que "Panel de alertas", "Historial" e "Informes" siguen funcionando sin cambios.
- No se requieren tests de componente adicionales más allá de la convención ya usada en el proyecto para vistas de dashboard (los componentes nuevos son composición de piezas visuales sobre datos ya validados por los tests existentes de los endpoints).

## Fuera de alcance (explícito)

- Cualquier cambio a Prisma schema, endpoints backend, o al parser de Excel de road safety.
- Cambios al flujo de guardado en historial o a la lógica de cálculo de alertas/ICC/anomalías (esos cálculos ya existen en backend y se reutilizan tal cual).
- Reducir la tabla de "Puntos de la ruta" de 6 a 3 columnas (se decidió conservar las 6 actuales).
- Renumerar las hojas a un esquema de 4 en vez de 5 (se decidió mantener 5 y preservar la tabla cruda de detalle PESV como "Hoja 2 · Generalidad").
- Cambios a Higiene Industrial, "Panel de alertas", "Historial", "Informes".
