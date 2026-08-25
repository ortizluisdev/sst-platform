# Rediseño de Configuración (Admin + Cliente) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar visualmente `GeneralSettingsPanel.vue` (compartido por Admin y Cliente) con el mismo lenguaje visual ya usado en Mi Perfil: tarjetas con borde+sombra por sección, íconos junto a cada título, y una tabla de preferencias de notificaciones más pulida — sin tocar lógica de negocio, endpoints, ni comportamiento.

**Architecture:** Un único componente Vue existente (`GeneralSettingsPanel.vue`) se edita en su totalidad — cambios de clases Tailwind y dos íconos nuevos (`Bell`, `Palette` de lucide-vue-next). `BrandingFields.vue` no se toca.

**Tech Stack:** Vue 3 `<script setup>` + TypeScript, Tailwind CSS, vue-i18n, lucide-vue-next.

## Global Constraints

- Alcance solo visual/contenido: sin backend nuevo, sin lógica de negocio nueva (spec §Alcance).
- Se mantienen exactamente las mismas 2 secciones (Notificaciones, Marca de la empresa) y el mismo comportamiento — incluida la regla de que apagar "en la app" apaga también "email" (spec §Alcance).
- `BrandingFields.vue` NO se modifica — solo el contenedor que lo envuelve (spec §2).
- Sin ícono distinto por cada uno de los 9 tipos de notificación — descartado explícitamente, no hay precedente en el código (spec §Alcance).
- Admin sigue viendo únicamente la tarjeta de Notificaciones (sin Marca — `isOrgUser` sigue siendo `false` para admin) (spec §2, §Testing).
- El encabezado de la tabla (`thead`, fondo `bg-sky-100`) no cambia (spec §1).

---

### Task 1: Rediseño visual de `GeneralSettingsPanel.vue`

**Files:**
- Modify: `frontend/src/modules/settings/components/GeneralSettingsPanel.vue`

**Interfaces:**
- Consumes: nada nuevo — el archivo ya importa todo lo que necesita (`useAuthStore`, servicios de preferencias y branding). Solo se agregan dos íconos de `lucide-vue-next`.
- Produce: nada consumido por otro archivo — este es el único componente que renderiza "Configuración" para Admin y Cliente.

- [ ] **Step 1: Agregar el import de íconos**

En `frontend/src/modules/settings/components/GeneralSettingsPanel.vue`, después de la línea `import { useI18n } from 'vue-i18n'` (línea 3), agregar:

```typescript
import { Bell, Palette } from 'lucide-vue-next'
```

- [ ] **Step 2: Envolver la sección "Notificaciones" en tarjeta, agregar ícono, pulir la tabla**

El bloque actual (dentro del `<template>`, primera `<section>`):

```vue
    <section>
      <h2 class="mb-1 text-base font-bold text-navy-900">{{ t('settings.notifications.title') }}</h2>
      <p class="mb-3 text-xs text-navy-700/60">{{ t('settings.notifications.hint') }}</p>

      <p v-if="prefsStatus === 'loading'" class="text-sm text-navy-700">{{ t('settings.loading') }}</p>
      <p
        v-else-if="prefsStatus === 'error'"
        class="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      >
        {{ prefsErrorMessage }}
      </p>
      <div v-else class="overflow-hidden rounded-lg border border-line-strong bg-white">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="bg-sky-100 text-left text-[11px] uppercase tracking-wide text-navy-700">
              <th class="px-4 py-2.5 font-semibold">{{ t('settings.notifications.colType') }}</th>
              <th class="px-4 py-2.5 text-center font-semibold">{{ t('settings.notifications.colInApp') }}</th>
              <th class="px-4 py-2.5 text-center font-semibold">{{ t('settings.notifications.colEmail') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in preferences" :key="item.type" class="border-t border-line">
              <td class="px-4 py-2.5 text-navy-900">{{ t(NOTIFICATION_TYPE_LABEL_KEY[item.type]) }}</td>
              <td class="px-4 py-2.5 text-center">
                <input
                  type="checkbox"
                  class="h-4 w-4 rounded-sm border-line-strong"
                  :checked="item.inAppEnabled"
                  :disabled="togglingKey === `${item.type}-inAppEnabled`"
                  @change="toggle(item, 'inAppEnabled')"
                />
              </td>
              <td class="px-4 py-2.5 text-center">
                <input
                  type="checkbox"
                  class="h-4 w-4 rounded-sm border-line-strong"
                  :checked="item.emailEnabled"
                  :disabled="!item.inAppEnabled || togglingKey === `${item.type}-emailEnabled`"
                  @change="toggle(item, 'emailEnabled')"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="prefsStatus === 'ready' && prefsErrorMessage" class="mt-2 text-sm text-red-700">
        {{ prefsErrorMessage }}
      </p>
    </section>
```

pasa a (cambia la clase del `<section>`, se envuelve el `<h2>` en un `div flex` con el ícono `Bell`, las filas del `<tbody>` ganan zebra-striping vía `index`, más padding vertical `py-3`, y los checkboxes ganan `accent-sky-500`):

```vue
    <section class="rounded-md border border-line-strong bg-white p-6 shadow-sm sm:p-8">
      <div class="flex items-center gap-2">
        <Bell class="h-5 w-5 shrink-0 text-navy-700/70" aria-hidden="true" />
        <h2 class="text-base font-bold text-navy-900">{{ t('settings.notifications.title') }}</h2>
      </div>
      <p class="mb-3 mt-1 text-xs text-navy-700/60">{{ t('settings.notifications.hint') }}</p>

      <p v-if="prefsStatus === 'loading'" class="text-sm text-navy-700">{{ t('settings.loading') }}</p>
      <p
        v-else-if="prefsStatus === 'error'"
        class="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      >
        {{ prefsErrorMessage }}
      </p>
      <div v-else class="overflow-hidden rounded-lg border border-line-strong bg-white">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="bg-sky-100 text-left text-[11px] uppercase tracking-wide text-navy-700">
              <th class="px-4 py-2.5 font-semibold">{{ t('settings.notifications.colType') }}</th>
              <th class="px-4 py-2.5 text-center font-semibold">{{ t('settings.notifications.colInApp') }}</th>
              <th class="px-4 py-2.5 text-center font-semibold">{{ t('settings.notifications.colEmail') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(item, index) in preferences"
              :key="item.type"
              class="border-t border-line"
              :class="index % 2 === 1 ? 'bg-cream/40' : 'bg-white'"
            >
              <td class="px-4 py-3 text-navy-900">{{ t(NOTIFICATION_TYPE_LABEL_KEY[item.type]) }}</td>
              <td class="px-4 py-3 text-center">
                <input
                  type="checkbox"
                  class="h-4 w-4 rounded-sm border-line-strong accent-sky-500"
                  :checked="item.inAppEnabled"
                  :disabled="togglingKey === `${item.type}-inAppEnabled`"
                  @change="toggle(item, 'inAppEnabled')"
                />
              </td>
              <td class="px-4 py-3 text-center">
                <input
                  type="checkbox"
                  class="h-4 w-4 rounded-sm border-line-strong accent-sky-500"
                  :checked="item.emailEnabled"
                  :disabled="!item.inAppEnabled || togglingKey === `${item.type}-emailEnabled`"
                  @change="toggle(item, 'emailEnabled')"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="prefsStatus === 'ready' && prefsErrorMessage" class="mt-2 text-sm text-red-700">
        {{ prefsErrorMessage }}
      </p>
    </section>
```

Nota: el `toggle(item, field)` handler, el estado `togglingKey`, y toda la lógica de `<script setup>` **no cambian** en este step — solo el markup del `<template>`.

- [ ] **Step 3: Envolver la sección "Marca de la empresa" en tarjeta y agregar ícono**

El bloque actual:

```vue
    <section v-if="isOrgUser">
      <h2 class="mb-1 text-base font-bold text-navy-900">{{ t('settings.branding.title') }}</h2>
      <p class="mb-3 text-xs text-navy-700/60">{{ t('settings.branding.hint') }}</p>

      <p v-if="brandingStatus === 'loading'" class="text-sm text-navy-700">{{ t('settings.loading') }}</p>
```

pasa a:

```vue
    <section v-if="isOrgUser" class="rounded-md border border-line-strong bg-white p-6 shadow-sm sm:p-8">
      <div class="flex items-center gap-2">
        <Palette class="h-5 w-5 shrink-0 text-navy-700/70" aria-hidden="true" />
        <h2 class="text-base font-bold text-navy-900">{{ t('settings.branding.title') }}</h2>
      </div>
      <p class="mb-3 mt-1 text-xs text-navy-700/60">{{ t('settings.branding.hint') }}</p>

      <p v-if="brandingStatus === 'loading'" class="text-sm text-navy-700">{{ t('settings.loading') }}</p>
```

El resto del bloque (formulario, `BrandingFields`, mensajes de éxito/error, botón de guardar) **no cambia**.

- [ ] **Step 4: Typecheck**

Run: `cd frontend && npx vue-tsc -b --noEmit`
Expected: sin errores.

- [ ] **Step 5: Lint y formato**

Run: `cd frontend && npm run lint && npm run format:check`
Expected: sin errores.

- [ ] **Step 6: Suite completa de tests**

Run: `cd frontend && npx vitest run`
Expected: todos los test files pasan, sin regresiones (86/86 tests era la línea base antes de este cambio; puede haber 2 "Unhandled Rejection" preexistentes de axios-abort en `ClientDashboardHojas.test.ts`, no relacionados).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/modules/settings/components/GeneralSettingsPanel.vue
git commit -m "feat: rediseñar visualmente Configuración con tarjetas por sección e íconos"
```

---

### Task 2: Verificación final de regresión

**Files:** ninguno (solo verificación).

- [ ] **Step 1: Verificación manual — Admin**

Con backend y frontend corriendo localmente, iniciar sesión como super-admin (o adminsystem) y navegar a Configuración (`/dashboard/admin/configuracion` desde el sidebar de Admin, ítem "Settings"):

1. Aparece **únicamente** la tarjeta de Notificaciones (con ícono `Bell` junto al título) — **NO** aparece la tarjeta de Marca de la empresa (Admin no pertenece a ninguna organización).
2. La tabla de preferencias tiene zebra-striping visible entre filas y checkboxes con acento de color.
3. Cambiar un toggle "en la app" y confirmar que sigue guardando correctamente (llamada a la API exitosa, estado persiste tras recargar).
4. Apagar un toggle "en la app" que tenga "email" activado y confirmar que "email" se apaga automáticamente (regla existente, sin cambios).

- [ ] **Step 2: Verificación manual — Cliente**

Iniciar sesión como cliente y navegar a Configuración (ítem "Settings" del sidebar cliente, dentro de GENERAL):

1. Aparecen **ambas** tarjetas: Notificaciones y Marca de la empresa (con ícono `Palette` junto al título).
2. El formulario de Marca de la empresa (subir logo, elegir colores, vista previa) sigue funcionando exactamente igual — probar guardar cambios y confirmar el mensaje de éxito.
3. Repetir los puntos 2-4 del Step 1 para la tabla de notificaciones del lado cliente.

- [ ] **Step 3: Reportar resultados**

Resumir aprobado/fallado de cada punto de los Steps 1-2, además de la confirmación de typecheck/lint/tests del Task 1. No dar el plan por completo si algún punto falla — corregir y volver a verificar antes.
