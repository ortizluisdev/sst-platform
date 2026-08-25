# Rediseño de "Configuración" — diseño

## Contexto

`GeneralSettingsPanel.vue` (`frontend/src/modules/settings/components/GeneralSettingsPanel.vue`) es el **único** componente que renderiza "Configuración" tanto para Admin (ruta `/dashboard/admin/configuracion`) como para Cliente (clave reservada `'configuracion'` del sidebar, dentro de `ClientDashboardView.vue`). Cualquier cambio acá se ve automáticamente en ambos lados.

Hoy la pantalla se siente "muy simple": dos secciones (Notificaciones, y Marca de la empresa solo para clientes) sin tarjetas ni separación visual — solo un `<h2>` y contenido apilado directamente sobre el fondo de la página. La tabla de preferencias de notificaciones es HTML plano sin zebra-striping ni padding generoso.

Esta spec continúa el mismo lenguaje visual introducido en el rediseño de Mi Perfil (`docs/superpowers/specs/2026-08-25-my-profile-redesign-design.md`): tarjetas con borde + sombra sutil, ícono junto a cada título de sección.

## Alcance

**Solo visual/contenido — sin backend nuevo, sin lógica de negocio nueva.** Se mantienen exactamente las mismas 2 secciones y el mismo comportamiento (toggle de preferencias con la regla de que apagar "en la app" apaga también "email"; guardar branding). `BrandingFields.vue` **no se modifica** — solo el contenedor que lo envuelve.

**Fuera de alcance:** ícono distinto por cada uno de los 9 tipos de notificación (no hay precedente en el código para eso — se descartó explícitamente), cualquier campo o sección nueva, cambios a `notificationPreferences.service.ts` u `organizationBranding.service.ts`, cambios a `BrandingFields.vue`.

## 1. Sección "Notificaciones" (Admin y Cliente)

Envuelta en una tarjeta (`rounded-md border border-line-strong bg-white p-6 shadow-sm sm:p-8`, mismo patrón que las tarjetas de Mi Perfil). El `<h2>` va acompañado de un ícono `Bell` (lucide-vue-next) a su izquierda — mismo ícono que ya usa la campana de notificaciones (`NotificationBell.vue`) y el ítem "Notificaciones" del sidebar, reutilizado sin inventar iconografía nueva.

La tabla de preferencias se pule sin cambiar su comportamiento:
- Filas con zebra-striping sutil (fondo alterno `bg-cream/40` en filas pares).
- Más padding vertical por fila (de `py-2.5` a `py-3`).
- Checkboxes con tamaño consistente (`h-4 w-4`, ya así hoy) pero con un acento de color en vez del gris por defecto del navegador (clase `accent-sky-500`, propiedad CSS nativa `accent-color` que Tailwind expone — cambia el color de check/relleno del checkbox nativo del navegador sin reemplazarlo por un componente custom).
- El encabezado de la tabla (`thead`) mantiene su fondo `bg-sky-100` actual — no cambia.

## 2. Sección "Marca de la empresa" (solo Cliente, `v-if="isOrgUser"`)

Misma tarjeta (`rounded-md border border-line-strong bg-white p-6 shadow-sm sm:p-8`). El `<h2>` va acompañado de un ícono `Palette` (lucide-vue-next) a su izquierda.

`BrandingFields.vue` (logo, colores, vista previa) se renderiza exactamente igual dentro de la tarjeta — sin cambios internos al componente.

## Testing

- No se requieren tests nuevos: no hay lógica nueva, solo clases CSS/markup sobre datos y comportamiento ya existentes y ya cubiertos por sus propios servicios.
- Regresión manual: confirmar que Admin ve únicamente la tarjeta de Notificaciones (sin Marca — `isOrgUser` sigue siendo `false` para admin); confirmar que un cliente ve ambas tarjetas; confirmar que los toggles de notificaciones (incluida la regla de apagar email al apagar en-la-app) y el guardado de branding (logo/colores/vista previa) siguen funcionando exactamente igual.
