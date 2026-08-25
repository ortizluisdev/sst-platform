# Rediseño de Mi Perfil (Admin + Cliente) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar visualmente `MyProfilePanel.vue` (compartido por Admin y Cliente) para que se sienta más profesional: cabecera con acento de marca y badges de rol/empresa, íconos por sección, y tarjetas con más peso visual — sin tocar lógica de negocio, endpoints, ni campos de formulario.

**Architecture:** Un único componente Vue existente (`MyProfilePanel.vue`) se edita en su totalidad — cambios de clases Tailwind y markup nuevo (badges), reutilizando datos ya disponibles en `useAuthStore()` (`roleLabelKey`, `organizationNombre`, `organizationNit`) y el composable de contraste ya existente `useOrgPrimaryTextClass()`. Ningún archivo nuevo, ningún endpoint nuevo.

**Tech Stack:** Vue 3 `<script setup>` + TypeScript, Tailwind CSS, vue-i18n, Pinia (`useAuthStore`), lucide-vue-next (íconos).

## Global Constraints

- Alcance solo visual/contenido: sin backend nuevo, sin campos de formulario nuevos, sin lógica de negocio nueva (spec §Alcance).
- Se mantienen exactamente los mismos 3 bloques (cabecera, datos personales, firma) — sin pestañas (spec §Alcance, decisión explícita del usuario).
- Badge de empresa solo visible si `auth.organizationNombre` no es null (rol cliente) — nunca para Admin (spec §1).
- No se muestra badge de "estado de cuenta" — descartado explícitamente por el usuario (spec §Alcance).
- `FormField.vue` NO se modifica — es compartido por Login, Recuperar contraseña, modales de organización y otras pantallas; solo cambian los `<label>` inline de "Número de documento" y "Email" (que no usan `FormField.vue`) (spec §2).
- Fondo de cabecera usa el mismo token `var(--org-primary,#0b1a33)` que ya usa `SectionTitleBanner.vue`, y el contraste de texto usa el composable existente `useOrgPrimaryTextClass()` (spec §1) — ambos ya existen, no se crean.

---

### Task 1: Rediseño visual de `MyProfilePanel.vue`

**Files:**
- Modify: `frontend/src/modules/profile/components/MyProfilePanel.vue`

**Interfaces:**
- Consumes: `useAuthStore()` (ya importado en el archivo) — específicamente los getters/estado `auth.roleLabelKey: string` (clave i18n, ya existente en `stores/auth.ts`), `auth.organizationNombre: string | null`, `auth.organizationNit: string | null` (ya existentes, sin cambios). Consume también `useOrgPrimaryTextClass()` de `@/composables/useOrgPrimaryContrast` (ya existente, sin cambios) — devuelve un `ComputedRef<{ text: string; hoverText: string }>` con clases Tailwind completas.
- Produce: nada consumido por otro archivo — este es el único componente que renderiza "Mi Perfil" para Admin y Cliente.

- [ ] **Step 1: Agregar los imports nuevos**

En `frontend/src/modules/profile/components/MyProfilePanel.vue`, la línea de import de íconos (línea 5) actual:

```typescript
import { User as UserIcon } from 'lucide-vue-next'
```

pasa a:

```typescript
import { Building2, IdCard, PenTool, User as UserIcon } from 'lucide-vue-next'
```

Y se agrega, junto a los demás imports de composables (después de la línea `import { useToast } from '@/composables/useToast'`):

```typescript
import { useOrgPrimaryTextClass } from '@/composables/useOrgPrimaryContrast'
```

- [ ] **Step 2: Agregar el computed de contraste**

Justo después de la línea `const auth = useAuthStore()` (línea 22), agregar:

```typescript
const primaryTextClass = useOrgPrimaryTextClass()
```

- [ ] **Step 3: Reescribir el bloque de cabecera (foto + nombre + badges + botón)**

El bloque de cabecera actual (dentro del `<template>`, inmediatamente después de `<!-- Cabecera: foto, nombre, y acceso a cambiar contraseña -->`) es:

```vue
      <div
        class="flex flex-col items-center gap-4 rounded-md border border-line-strong bg-white p-6 sm:flex-row sm:items-center sm:p-8"
      >
        <div class="relative shrink-0">
          <div class="h-24 w-24 overflow-hidden rounded-full border border-line-strong bg-cream">
            <img
              v-if="fotoBase64"
              :src="fotoBase64"
              :alt="t('myProfile.avatar.alt')"
              class="h-full w-full object-cover"
            />
            <div v-else class="flex h-full w-full items-center justify-center text-navy-700/40">
              <UserIcon class="h-10 w-10" />
            </div>
          </div>
          <input
            ref="avatarInput"
            type="file"
            accept="image/png,image/jpeg"
            class="hidden"
            @change="onAvatarFileChange"
          />
          <button
            type="button"
            class="absolute -bottom-1 -right-1 rounded-full border border-line-strong bg-white px-2 py-1 text-[10px] font-semibold text-navy-700 shadow-sm hover:bg-cream disabled:opacity-50"
            :disabled="avatarUploading"
            @click="avatarInput?.click()"
          >
            {{ avatarUploading ? '…' : t('myProfile.avatar.changeLabel') }}
          </button>
        </div>

        <div class="min-w-0 flex-1 text-center sm:text-left">
          <h1 class="truncate text-lg font-bold text-navy-900">{{ nombre }}</h1>
          <p class="truncate text-sm text-navy-700/70">{{ email }}</p>
          <p v-if="avatarError" class="mt-1 text-xs text-red-600">{{ avatarError }}</p>
          <p v-else class="mt-1 text-xs text-navy-700/50">{{ t('myProfile.avatar.hint') }}</p>
        </div>

        <button
          type="button"
          class="w-full shrink-0 rounded-sm border border-line-strong px-4 py-2.5 text-sm font-semibold text-navy-700 hover:bg-cream sm:w-auto"
          @click="showPasswordModal = true"
        >
          {{ t('myProfile.changePasswordButton') }}
        </button>
      </div>
```

Reemplazarlo por (nota: el botón del avatar y su borde/fondo NO cambian — son blancos sobre el círculo de la foto, no sobre el fondo oscuro de la cabecera, así que se quedan legibles sin cambios):

```vue
      <div
        class="flex flex-col items-center gap-4 rounded-md border border-line-strong bg-[var(--org-primary,#0b1a33)] p-6 shadow-sm sm:flex-row sm:items-center sm:p-8"
      >
        <div class="relative shrink-0">
          <div class="h-24 w-24 overflow-hidden rounded-full border border-white/20 bg-cream">
            <img
              v-if="fotoBase64"
              :src="fotoBase64"
              :alt="t('myProfile.avatar.alt')"
              class="h-full w-full object-cover"
            />
            <div v-else class="flex h-full w-full items-center justify-center text-navy-700/40">
              <UserIcon class="h-10 w-10" />
            </div>
          </div>
          <input
            ref="avatarInput"
            type="file"
            accept="image/png,image/jpeg"
            class="hidden"
            @change="onAvatarFileChange"
          />
          <button
            type="button"
            class="absolute -bottom-1 -right-1 rounded-full border border-line-strong bg-white px-2 py-1 text-[10px] font-semibold text-navy-700 shadow-sm hover:bg-cream disabled:opacity-50"
            :disabled="avatarUploading"
            @click="avatarInput?.click()"
          >
            {{ avatarUploading ? '…' : t('myProfile.avatar.changeLabel') }}
          </button>
        </div>

        <div class="min-w-0 flex-1 text-center sm:text-left">
          <h1 class="truncate text-lg font-bold" :class="primaryTextClass.text">{{ nombre }}</h1>
          <p class="truncate text-sm opacity-80" :class="primaryTextClass.text">{{ email }}</p>
          <!-- Fila de badges: rol siempre, empresa solo si es cliente
          (organizationNombre es null para admin, ver stores/auth.ts).
          flex-wrap para que no se recorten en móvil si no caben en una
          línea (mismo criterio que ya documenta SectionTitleBanner.vue
          sobre truncamiento en pantallas angostas). -->
          <div class="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <span
              class="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-[11px] font-semibold"
              :class="primaryTextClass.text"
            >
              {{ t(auth.roleLabelKey) }}
            </span>
            <span
              v-if="auth.organizationNombre"
              class="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-[11px] font-semibold"
              :class="primaryTextClass.text"
            >
              <Building2 class="h-3 w-3 shrink-0" aria-hidden="true" />
              {{ auth.organizationNombre }} · NIT {{ auth.organizationNit }}
            </span>
          </div>
          <p v-if="avatarError" class="mt-1 text-xs text-red-300">{{ avatarError }}</p>
          <p v-else class="mt-1 text-xs opacity-60" :class="primaryTextClass.text">
            {{ t('myProfile.avatar.hint') }}
          </p>
        </div>

        <button
          type="button"
          class="w-full shrink-0 rounded-sm border border-white/25 px-4 py-2.5 text-sm font-semibold hover:bg-white/10 sm:w-auto"
          :class="primaryTextClass.text"
          @click="showPasswordModal = true"
        >
          {{ t('myProfile.changePasswordButton') }}
        </button>
      </div>
```

- [ ] **Step 4: Agregar ícono a la sección "Datos personales" y oscurecer los labels inline**

El bloque actual:

```vue
      <!-- Datos personales -->
      <div class="rounded-md border border-line-strong bg-white p-6 sm:p-8">
        <h2 class="text-base font-bold text-navy-900">{{ t('myProfile.personalDataTitle') }}</h2>
        <p class="mt-1 text-sm text-navy-700/70">{{ t('myProfile.personalDataSubtitle') }}</p>

        <form class="mt-6 grid gap-5" novalidate @submit.prevent="submitProfile">
          <div>
            <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy-700">{{
              t('myProfile.fields.documentNumber')
            }}</label>
```

pasa a (cambia la clase del `<div>` contenedor, se agrega el ícono con un wrapper `flex` alrededor del `<h2>`, y el `<label>` de documento pasa de `text-navy-700` a `text-navy-900`):

```vue
      <!-- Datos personales -->
      <div class="rounded-md border border-line-strong bg-white p-6 shadow-sm sm:p-8">
        <div class="flex items-center gap-2">
          <IdCard class="h-5 w-5 shrink-0 text-navy-700/70" aria-hidden="true" />
          <h2 class="text-base font-bold text-navy-900">{{ t('myProfile.personalDataTitle') }}</h2>
        </div>
        <p class="mt-1 text-sm text-navy-700/70">{{ t('myProfile.personalDataSubtitle') }}</p>

        <form class="mt-6 grid gap-5" novalidate @submit.prevent="submitProfile">
          <div>
            <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy-900">{{
              t('myProfile.fields.documentNumber')
            }}</label>
```

Más abajo, dentro del mismo bloque, el `<label>` de email:

```vue
            <div>
              <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy-700">{{
                t('myProfile.fields.email')
              }}</label>
```

pasa a:

```vue
            <div>
              <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy-900">{{
                t('myProfile.fields.email')
              }}</label>
```

Los campos `FormField` (Nombre, Cargo, Teléfono) **no se tocan** — se quedan exactamente igual, sin cambios de clase.

- [ ] **Step 5: Agregar ícono y sombra a la sección "Firma para reportes"**

El bloque actual:

```vue
      <!-- Firma para reportes -->
      <div class="rounded-md border border-line-strong bg-white p-6 sm:p-8">
        <h2 class="text-base font-bold text-navy-900">{{ t('myProfile.firma.title') }}</h2>
        <p class="mt-1 text-sm text-navy-700/70">{{ t('myProfile.firma.subtitle') }}</p>
```

pasa a:

```vue
      <!-- Firma para reportes -->
      <div class="rounded-md border border-line-strong bg-white p-6 shadow-sm sm:p-8">
        <div class="flex items-center gap-2">
          <PenTool class="h-5 w-5 shrink-0 text-navy-700/70" aria-hidden="true" />
          <h2 class="text-base font-bold text-navy-900">{{ t('myProfile.firma.title') }}</h2>
        </div>
        <p class="mt-1 text-sm text-navy-700/70">{{ t('myProfile.firma.subtitle') }}</p>
```

El resto del bloque (input de firma, botón "Cambiar firma", hints de error) no cambia.

- [ ] **Step 6: Typecheck**

Run: `cd frontend && npx vue-tsc -b --noEmit`
Expected: sin errores.

- [ ] **Step 7: Lint y formato**

Run: `cd frontend && npm run lint && npm run format:check`
Expected: sin errores (mismos checks que corre `frontend-ci.yml`).

- [ ] **Step 8: Suite completa de tests**

Run: `cd frontend && npx vitest run`
Expected: todos los test files pasan, sin regresiones (86/86 tests era la línea base antes de este cambio; puede haber 2 "Unhandled Rejection" preexistentes de axios-abort en `ClientDashboardHojas.test.ts`, no relacionados, ya documentados en runs anteriores de este proyecto).

- [ ] **Step 9: Commit**

```bash
git add frontend/src/modules/profile/components/MyProfilePanel.vue
git commit -m "feat: rediseñar visualmente Mi Perfil con cabecera de marca y badges de rol/empresa"
```

---

### Task 2: Verificación final de regresión

**Files:** ninguno (solo verificación).

- [ ] **Step 1: Verificación manual — Admin**

Con backend y frontend corriendo localmente, iniciar sesión como super-admin (o adminsystem) y navegar a Mi Perfil (`/dashboard/admin/mi-perfil` desde el sidebar de Admin, ítem "My profile"):

1. La cabecera tiene fondo oscuro (`#0b1a33`, o el color de marca configurado si aplica) con texto legible.
2. Aparece el badge de rol ("Super-Admin"), con contraste legible.
3. **NO** aparece badge de empresa (Admin no pertenece a ninguna organización — `organizationNombre` debe ser `null`).
4. El botón "Cambiar contraseña" es legible sobre el fondo oscuro y sigue abriendo el modal correctamente.
5. Las secciones "Datos personales" y "Firma para reportes" muestran su ícono junto al título, y tienen sombra sutil.
6. Guardar el formulario de datos personales (nombre/cargo/teléfono) sigue funcionando y muestra el toast de éxito.

- [ ] **Step 2: Verificación manual — Cliente**

Iniciar sesión como cliente (con organización y branding configurados) y navegar a Mi Perfil (ítem "Mi perfil" del sidebar cliente, dentro de GENERAL):

1. La cabecera refleja el color de marca del cliente si tiene uno configurado (`--org-primary`), o el fallback oscuro si no.
2. Aparece el badge de rol ("Cliente") **y** el badge de empresa con el nombre y NIT correctos de la organización.
3. Repetir con un cliente que **no** tenga branding configurado (color por defecto) — confirmar que el texto sigue siendo legible sobre el fondo de respaldo.
4. Subir una foto de perfil nueva y confirmar que sigue actualizándose correctamente (círculo de avatar, navbar).
5. Subir una firma nueva y confirmar que sigue actualizándose correctamente.

- [ ] **Step 3: Reportar resultados**

Resumir aprobado/fallado de cada punto de los Steps 1-2, además de la confirmación de typecheck/lint/tests del Task 1. No dar el plan por completo si algún punto falla — corregir y volver a verificar antes.
