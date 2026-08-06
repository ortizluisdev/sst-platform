# Sistema de Toast/Confirmación/Modal — error, éxito y confirmación

**Fecha:** 2026-08-06
**Estado:** Aprobado
**Alcance:** construir el sistema de componentes reutilizables (Modal base, Toast de éxito/error, diálogo de confirmación) Y migrar las pantallas existentes que hoy repiten el banner de error a mano, no muestran feedback de éxito, o ejecutan acciones destructivas sin confirmar — todo en una sola pasada (decisión explícita del usuario, distinto al patrón de sub-proyectos separados usado en Cliente/Admin).

## Contexto

Exploración del estado real antes de diseñar (no asumido):
- **34 archivos** repiten a mano el mismo banner de error (`border-red-200 bg-red-50 ... text-red-700`), sin componente compartido.
- **4 archivos** muestran feedback de éxito (`CreateOrganizationForm.vue`, `VariableUploadForm.vue`, `ClientsListView.vue`, `ServicesListView.vue`) — la gran mayoría de acciones no muestran nada cuando funcionan.
- **1 solo `window.confirm()`** nativo en toda la app (`ClientsListView.vue`, reactivar usuario) — sin estilo, inconsistente.
- **14 modales existentes**, cada uno reconstruye a mano el mismo backdrop/franja de acento/botón de cierre — no hay un componente `Modal` base (confirmado: todos comparten `ModalAccentStrip.vue` como única pieza compartida, el resto del shell está duplicado).
- Backend/BD **no tienen este problema** — 15 módulos, cada uno con su propia clase `XxxError extends Error`, traducida a JSON estructurado en el controlador. No requiere cambios estructurales.
- Acciones destructivas identificadas sin confirmación hoy: `HigieneConfigTab.vue::deactivate()` (catálogos Zona/Sección/Cargo/Trabajador), `NotificationsAdminPanel.vue::handleDelete()`, `ServicesListView.vue::handleToggleActive()` (dirección desactivar), y el `window.confirm()` de `ClientsListView.vue::handleReactivate()` a reemplazar. `ClientsListView.vue::handleSuspend()` ya pide un motivo vía `SuspendUserModal.vue` — no necesita `useConfirm()` adicional, ya tiene una barrera de confirmación propia.

**Corrección hecha durante el diseño:** se asumió que `FormField.vue` ya resalta el campo en rojo cuando hay error — verificado que NO lo hace, solo muestra un `<p>` de texto debajo. Este trabajo agrega el borde rojo (no existía) además de quitar el texto duplicado.

## Decisiones (aprobadas)

1. **Colores de marca, no un tema nuevo.** Franja superior del Modal/ConfirmDialog en `var(--org-secondary)`; botones primarios en `var(--org-primary)` con `useOrgPrimaryTextClass()` para contraste — mismas variables que ya usa el resto del dashboard. El navbar (color, logo) **no se toca** — queda exactamente como está.
2. **100% Tailwind, sin CSS personalizado** — mismas clases utilitarias ya usadas en el proyecto (`rounded-md`, `shadow-xl`, `border-line-strong`, arbitrary values `bg-[var(--org-primary,...)]`).
3. **Confirmación solo para acciones destructivas/irreversibles** (eliminar, desactivar, suspender) — crear/editar no la piden, para no generar fatiga de "¿confirmas?" en el uso diario.
4. **Todo error —de campo o de acción general— sale por Toast**, nunca más como banner inline repetido a mano. `FormField.vue` se queda con el resaltado visual (borde rojo, nuevo) pero pierde el texto `<p>` de error — el mensaje vive solo en el Toast.
5. **Auto-cierre del Toast:** 4s éxito, 6s error (más tiempo para leer un mensaje de error) — con botón de cierre manual siempre visible, apilable si hay más de uno.
6. **Migración completa en esta misma pasada** (decisión explícita del usuario) — los 34 banners de error, 4 de éxito, 1 `window.confirm()`, y las 3 acciones destructivas sin confirmación identificadas arriba.

## Diseño

### Componentes nuevos (`frontend/src/components/ui/`)

**`Modal.vue`** — shell base, reemplaza el backdrop/franja/cierre duplicado de los 14 modales existentes:
```vue
<script setup lang="ts">
import { X } from 'lucide-vue-next'
import ModalAccentStrip from './ModalAccentStrip.vue'

defineProps<{ title: string; maxWidth?: string }>()
defineEmits<{ close: [] }>()
</script>
<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 px-4" @click.self="$emit('close')">
    <div class="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-md bg-white shadow-xl" :class="maxWidth ?? 'max-w-md'">
      <ModalAccentStrip />
      <div class="overflow-y-auto p-5">
        <div class="flex items-start justify-between gap-3">
          <h2 class="text-base font-bold text-navy-900">{{ title }}</h2>
          <button type="button" class="rounded-sm p-1 text-navy-700/60 hover:bg-cream" aria-label="Cerrar" @click="$emit('close')">
            <X class="h-4 w-4" />
          </button>
        </div>
        <slot />
      </div>
    </div>
  </div>
</template>
```
Los 14 modales existentes migran a envolver su contenido propio (formulario, campos) dentro de `<Modal :title="..." @close="...">`, quitando su backdrop/franja/botón-cerrar duplicados. La lógica de negocio de cada uno (validación, submit) no cambia.

**`Toast.vue` + `ToastContainer.vue`** — el contenedor se monta una sola vez en `DashboardLayout.vue` (fuera del `<router-view>`, para sobrevivir a cambios de ruta); posición fija esquina inferior derecha, `flex flex-col gap-2`, cada `Toast` con icono (check verde / alerta roja), franja izquierda de color semántico, auto-cierre por `setTimeout` (4s/6s) + botón manual.

**`ConfirmDialog.vue`** — variante de `Modal.vue` con icono rojo circular, texto de advertencia, botón "Cancelar" (neutro) + botón de acción en rojo (`bg-red-600`). Se renderiza vía el composable, no se importa directamente en cada pantalla.

### Composables nuevos (`frontend/src/composables/`)

**`useToast.ts`** — módulo singleton (mismo patrón que `frontend/src/i18n/index.ts`, no un store de Pinia — no necesita persistencia ni devtools, solo estado compartido entre componentes): un `ref` a nivel de módulo con el array de toasts activos, expuesto como `useToast()` con `.success(mensaje)` / `.error(mensaje)`. `ToastContainer.vue` lee ese mismo `ref` y renderiza la lista.

**`useConfirm.ts`** — patrón promise-based: mantiene un estado reactivo de "diálogo pendiente" (título/mensaje/texto del botón) más una función `resolve` guardada; `confirm({...})` setea el estado y devuelve una `Promise<boolean>` que se resuelve al hacer clic en Cancelar/Confirmar. Un único `<ConfirmDialog>` se monta una vez (junto al `ToastContainer`, en `DashboardLayout.vue`) y lee ese mismo estado.

### `FormField.vue`

- Se agrega `border-red-400 focus:border-red-500` condicionado a `error` (no existe hoy).
- Se quita el `<p v-if="error">{{ error }}</p>`.
- El texto de error se sigue recibiendo por prop `error` (para el borde/`aria-invalid`), pero cada formulario que hoy pone `error.value = '...'` además llama `useToast().error('...')` en el mismo punto — un solo cambio mecánico repetido por formulario, no una reescritura de la validación.

### Migración (34 + 4 + 1 + 3 casos, ver Contexto)

- Los 34 banners de error (`<p v-if="status==='error'">{{ errorMessage }}</p>` con las clases repetidas) se eliminan; el `catch` que hoy asigna `errorMessage.value = ...` pasa a llamar `useToast().error(...)`.
- Los 4 banners de éxito se eliminan igual, reemplazados por `useToast().success(...)`.
- El `window.confirm()` de `ClientsListView.vue` se reemplaza por `await useConfirm().confirm({...})`.
- Se agrega confirmación donde falta: `HigieneConfigTab.vue::deactivate()`, `NotificationsAdminPanel.vue::handleDelete()`, `ServicesListView.vue::handleToggleActive()` (solo al desactivar, no al activar).
- Los 14 modales migran su shell a `Modal.vue` (ver arriba) — su lógica interna de formulario no cambia.

### Explícitamente NO tocado

Color/logo del navbar (`DashboardLayout.vue` líneas 63-100, salvo el uso de `useToast`/`useConfirm` que se monta ahí), clases de error/éxito del backend (`XxxError extends Error` por módulo — ya consistentes), lógica de negocio de cualquier formulario, `SuspendUserModal.vue` (ya tiene su propio flujo de confirmación con motivo, no se envuelve en `useConfirm()` adicional).

## Fuera de alcance

- Rediseño del logo/ícono del cliente en el navbar — bug de dato de prueba detectado durante el brainstorming, anotado aparte (no es parte de este sistema).
- Cambios al backend/BD — no los necesitan.

## Verificación

`npm run typecheck` (backend, sin cambios esperados) + `npx vue-tsc -b` (frontend) + verificación manual en navegador (ES/EN): Toast de éxito/error visibles y con auto-cierre correcto, ConfirmDialog aparece en las 4 acciones destructivas identificadas, ningún modal existente perdió funcionalidad tras migrar a `Modal.vue`, `FormField.vue` muestra borde rojo sin duplicar el texto de error.
