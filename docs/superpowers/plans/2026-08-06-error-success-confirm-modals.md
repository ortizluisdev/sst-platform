# Sistema de Toast/Confirmación/Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir un sistema compartido de Toast (éxito/error), diálogo de confirmación y shell de Modal, y migrar las 39 pantallas/modales del dashboard que hoy repiten banners de error/éxito a mano, usan `window.confirm()`/`confirm()` nativo, o no piden confirmación en acciones destructivas.

**Architecture:** Dos composables singleton (`useToast`, `useConfirm`, mismo patrón que `frontend/src/i18n/index.ts`) exponen estado reactivo a nivel de módulo. Dos componentes montados una sola vez en `DashboardLayout.vue` (`ToastContainer`, `ConfirmDialog`) leen ese estado y se renderizan sobre toda la app. Un componente `Modal.vue` nuevo encapsula el shell (backdrop + `ModalAccentStrip` + botón cerrar) que hoy duplican 13 modales. La migración reemplaza cada banner `<p v-if="status==='error'">...</p>` por una llamada a `useToast().error(...)` en el mismo punto donde hoy se asigna `errorMessage.value`, y cada `window.confirm()`/`confirm()` por `await useConfirm().confirm({...})`.

**Tech Stack:** Vue 3 `<script setup>` + TypeScript, Tailwind (sin CSS propio), vitest + @vue/test-utils + happy-dom (ya instalados), vue-i18n.

## Global Constraints

- 100% Tailwind — sin `<style>` propio, mismas clases utilitarias del resto del proyecto.
- Colores de marca vía `var(--org-primary)` / `var(--org-secondary)` (ya usados en todo el dashboard) — el navbar (`DashboardLayout.vue` líneas 63-100, color/logo) no se toca.
- `useToast`/`useConfirm` son módulos singleton (no Pinia) — un `ref` a nivel de módulo, mismo patrón que `frontend/src/i18n/index.ts`.
- Auto-cierre del Toast: 4000ms éxito, 6000ms error, con botón de cierre manual siempre visible.
- Confirmación (`useConfirm`) solo para acciones destructivas/irreversibles (eliminar, desactivar, suspender) — nunca para crear/editar.
- Ningún banner de error/éxito nuevo se escribe a mano — todos pasan por `useToast()`.
- Todas las claves i18n nuevas se agregan en **ambos** `frontend/src/i18n/locales/es.json` y `en.json`, misma estructura anidada.
- Cada task que edita un archivo con banners lee el archivo primero (`Read`) para confirmar que el bloque coincide exactamente con lo descrito aquí — si difiere, no hay ambigüedad real porque este plan cita el código verificado línea por línea, pero si algo no calza, se pregunta antes de improvisar.

---

## Task 1: `useToast` composable

**Files:**
- Create: `frontend/src/composables/useToast.ts`
- Test: `frontend/src/composables/useToast.test.ts`

**Interfaces:**
- Produces: `useToast()` → `{ toasts: Readonly<Ref<ToastItem[]>>, success(message: string): void, error(message: string): void, dismiss(id: number): void }`. `ToastItem = { id: number; type: 'success' | 'error'; message: string }`. Consumido por `ToastContainer.vue` (Task 2) y por todas las tasks de migración de banners.

- [ ] **Step 1: Write the failing test**

```typescript
// frontend/src/composables/useToast.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useToast } from './useToast'

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useToast().toasts.value.splice(0)
  })

  it('success() agrega un toast tipo success y lo autodescarta a los 4000ms', () => {
    const { toasts, success } = useToast()
    success('Guardado correctamente')
    expect(toasts.value).toHaveLength(1)
    expect(toasts.value[0]).toMatchObject({ type: 'success', message: 'Guardado correctamente' })
    vi.advanceTimersByTime(3999)
    expect(toasts.value).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(toasts.value).toHaveLength(0)
  })

  it('error() agrega un toast tipo error y lo autodescarta a los 6000ms', () => {
    const { toasts, error } = useToast()
    error('No se pudo guardar')
    expect(toasts.value).toHaveLength(1)
    expect(toasts.value[0]).toMatchObject({ type: 'error', message: 'No se pudo guardar' })
    vi.advanceTimersByTime(5999)
    expect(toasts.value).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(toasts.value).toHaveLength(0)
  })

  it('dismiss(id) quita el toast antes de que expire el timer', () => {
    const { toasts, success, dismiss } = useToast()
    success('X')
    const id = toasts.value[0].id
    dismiss(id)
    expect(toasts.value).toHaveLength(0)
  })

  it('cada toast tiene un id distinto, apilables', () => {
    const { toasts, success, error } = useToast()
    success('A')
    error('B')
    expect(toasts.value).toHaveLength(2)
    expect(toasts.value[0].id).not.toBe(toasts.value[1].id)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/composables/useToast.test.ts`
Expected: FAIL — `Cannot find module './useToast'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// frontend/src/composables/useToast.ts
import { ref } from 'vue'

export interface ToastItem {
  id: number
  type: 'success' | 'error'
  message: string
}

const DURATIONS: Record<ToastItem['type'], number> = { success: 4000, error: 6000 }

const toasts = ref<ToastItem[]>([])
let nextId = 0

function dismiss(id: number) {
  const index = toasts.value.findIndex((toast) => toast.id === id)
  if (index !== -1) toasts.value.splice(index, 1)
}

function push(type: ToastItem['type'], message: string) {
  const id = nextId++
  toasts.value.push({ id, type, message })
  setTimeout(() => dismiss(id), DURATIONS[type])
}

export function useToast() {
  return {
    toasts,
    success: (message: string) => push('success', message),
    error: (message: string) => push('error', message),
    dismiss,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/composables/useToast.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/composables/useToast.ts src/composables/useToast.test.ts && git commit -m "feat: agregar composable useToast (singleton, auto-cierre 4s/6s)"
```

---

## Task 2: `Toast.vue` + `ToastContainer.vue`

**Files:**
- Create: `frontend/src/components/ui/Toast.vue`
- Create: `frontend/src/components/ui/ToastContainer.vue`
- Test: `frontend/src/components/ui/ToastContainer.test.ts`

**Interfaces:**
- Consumes: `useToast()` de Task 1 (`toasts`, `dismiss`).
- Produces: `<ToastContainer />` sin props, se monta una vez en `DashboardLayout.vue` (Task 5).

- [ ] **Step 1: Write the failing test**

```typescript
// frontend/src/components/ui/ToastContainer.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ToastContainer from './ToastContainer.vue'
import { useToast } from '@/composables/useToast'

describe('ToastContainer', () => {
  beforeEach(() => {
    useToast().toasts.value.splice(0)
  })

  it('no renderiza nada cuando no hay toasts', () => {
    const wrapper = mount(ToastContainer)
    expect(wrapper.findAll('[role="status"], [role="alert"]')).toHaveLength(0)
  })

  it('renderiza un toast de éxito con role="status" y el mensaje', () => {
    useToast().success('Guardado correctamente')
    const wrapper = mount(ToastContainer)
    const el = wrapper.get('[role="status"]')
    expect(el.text()).toContain('Guardado correctamente')
  })

  it('renderiza un toast de error con role="alert"', () => {
    useToast().error('No se pudo guardar')
    const wrapper = mount(ToastContainer)
    const el = wrapper.get('[role="alert"]')
    expect(el.text()).toContain('No se pudo guardar')
  })

  it('el botón de cierre manual llama dismiss()', async () => {
    useToast().success('X')
    const wrapper = mount(ToastContainer)
    expect(wrapper.findAll('[role="status"]')).toHaveLength(1)
    await wrapper.get('button').trigger('click')
    expect(wrapper.findAll('[role="status"]')).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/ui/ToastContainer.test.ts`
Expected: FAIL — `Cannot find module './ToastContainer.vue'`

- [ ] **Step 3: Write minimal implementation**

```vue
<!-- frontend/src/components/ui/Toast.vue -->
<script setup lang="ts">
import { CheckCircle2, AlertCircle, X } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import type { ToastItem } from '@/composables/useToast'

defineProps<{ toast: ToastItem }>()
const emit = defineEmits<{ dismiss: [] }>()
const { t } = useI18n()
</script>

<template>
  <div
    class="pointer-events-auto flex w-80 items-start gap-2.5 rounded-md border-l-4 bg-white p-3 shadow-lg"
    :class="toast.type === 'success' ? 'border-emerald-500' : 'border-red-500'"
    :role="toast.type === 'success' ? 'status' : 'alert'"
  >
    <CheckCircle2 v-if="toast.type === 'success'" class="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
    <AlertCircle v-else class="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
    <p class="flex-1 text-sm text-navy-900">{{ toast.message }}</p>
    <button
      type="button"
      class="shrink-0 rounded-sm p-0.5 text-navy-700/50 hover:bg-cream"
      :aria-label="t('common.toastDismiss')"
      @click="emit('dismiss')"
    >
      <X class="h-4 w-4" />
    </button>
  </div>
</template>
```

```vue
<!-- frontend/src/components/ui/ToastContainer.vue -->
<script setup lang="ts">
import Toast from './Toast.vue'
import { useToast } from '@/composables/useToast'

const { toasts, dismiss } = useToast()
</script>

<template>
  <div class="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
    <Toast v-for="toast in toasts" :key="toast.id" :toast="toast" @dismiss="dismiss(toast.id)" />
  </div>
</template>
```

Agregar la clave i18n `common.toastDismiss` en ambos locales:

```json
// frontend/src/i18n/locales/es.json — dentro de un nuevo objeto top-level "common" (agregarlo antes de "meta" o donde el ordenamiento del archivo lo permita, siguiendo el mismo estilo de 2 espacios de indentación que el resto del archivo)
"common": {
  "toastDismiss": "Cerrar aviso"
}
```

```json
// frontend/src/i18n/locales/en.json
"common": {
  "toastDismiss": "Dismiss notification"
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/ui/ToastContainer.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/components/ui/Toast.vue src/components/ui/ToastContainer.vue src/components/ui/ToastContainer.test.ts src/i18n/locales/es.json src/i18n/locales/en.json && git commit -m "feat: agregar Toast.vue + ToastContainer.vue"
```

---

## Task 3: `useConfirm` composable

**Files:**
- Create: `frontend/src/composables/useConfirm.ts`
- Test: `frontend/src/composables/useConfirm.test.ts`

**Interfaces:**
- Produces: `useConfirm()` → `{ pending: Readonly<Ref<ConfirmRequest | null>>, confirm(request: { title: string; message: string; confirmLabel: string }): Promise<boolean>, resolveConfirm(): void, resolveCancel(): void }`. `ConfirmRequest = { title: string; message: string; confirmLabel: string }`. Consumido por `ConfirmDialog.vue` (Task 4) y por todas las tasks que agregan confirmación.

- [ ] **Step 1: Write the failing test**

```typescript
// frontend/src/composables/useConfirm.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useConfirm } from './useConfirm'

describe('useConfirm', () => {
  beforeEach(() => {
    useConfirm().resolveCancel()
  })

  it('confirm() setea pending con la request', () => {
    const { pending, confirm } = useConfirm()
    void confirm({ title: 'Eliminar', message: '¿Seguro?', confirmLabel: 'Eliminar' })
    expect(pending.value).toEqual({ title: 'Eliminar', message: '¿Seguro?', confirmLabel: 'Eliminar' })
  })

  it('resolveConfirm() resuelve la promesa en true y limpia pending', async () => {
    const { pending, confirm, resolveConfirm } = useConfirm()
    const promise = confirm({ title: 'A', message: 'B', confirmLabel: 'C' })
    resolveConfirm()
    await expect(promise).resolves.toBe(true)
    expect(pending.value).toBeNull()
  })

  it('resolveCancel() resuelve la promesa en false y limpia pending', async () => {
    const { pending, confirm, resolveCancel } = useConfirm()
    const promise = confirm({ title: 'A', message: 'B', confirmLabel: 'C' })
    resolveCancel()
    await expect(promise).resolves.toBe(false)
    expect(pending.value).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/composables/useConfirm.test.ts`
Expected: FAIL — `Cannot find module './useConfirm'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// frontend/src/composables/useConfirm.ts
import { ref } from 'vue'

export interface ConfirmRequest {
  title: string
  message: string
  confirmLabel: string
}

const pending = ref<ConfirmRequest | null>(null)
let resolver: ((value: boolean) => void) | null = null

function confirm(request: ConfirmRequest): Promise<boolean> {
  pending.value = request
  return new Promise((resolve) => {
    resolver = resolve
  })
}

function resolveConfirm() {
  resolver?.(true)
  resolver = null
  pending.value = null
}

function resolveCancel() {
  resolver?.(false)
  resolver = null
  pending.value = null
}

export function useConfirm() {
  return { pending, confirm, resolveConfirm, resolveCancel }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/composables/useConfirm.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/composables/useConfirm.ts src/composables/useConfirm.test.ts && git commit -m "feat: agregar composable useConfirm (promise-based)"
```

---

## Task 4: `ConfirmDialog.vue`

**Files:**
- Create: `frontend/src/components/ui/ConfirmDialog.vue`
- Test: `frontend/src/components/ui/ConfirmDialog.test.ts`

**Interfaces:**
- Consumes: `useConfirm()` de Task 3 (`pending`, `resolveConfirm`, `resolveCancel`).
- Produces: `<ConfirmDialog />` sin props, se monta una vez en `DashboardLayout.vue` (Task 5).

- [ ] **Step 1: Write the failing test**

```typescript
// frontend/src/components/ui/ConfirmDialog.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import ConfirmDialog from './ConfirmDialog.vue'
import { useConfirm } from '@/composables/useConfirm'

const i18n = createI18n({
  legacy: false,
  locale: 'es',
  messages: { es: { common: { cancel: 'Cancelar' } } },
})

function mountDialog() {
  return mount(ConfirmDialog, { global: { plugins: [i18n] } })
}

describe('ConfirmDialog', () => {
  beforeEach(() => {
    useConfirm().resolveCancel()
  })

  it('no renderiza nada cuando no hay confirmación pendiente', () => {
    const wrapper = mountDialog()
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
  })

  it('renderiza título, mensaje y texto del botón cuando hay una pendiente', () => {
    void useConfirm().confirm({ title: 'Desactivar', message: '¿Seguro?', confirmLabel: 'Desactivar' })
    const wrapper = mountDialog()
    const dialog = wrapper.get('[role="alertdialog"]')
    expect(dialog.text()).toContain('Desactivar')
    expect(dialog.text()).toContain('¿Seguro?')
  })

  it('clic en confirmar resuelve la promesa en true', async () => {
    const promise = useConfirm().confirm({ title: 'A', message: 'B', confirmLabel: 'Sí, eliminar' })
    const wrapper = mountDialog()
    await wrapper.get('[data-testid="confirm-accept"]').trigger('click')
    await expect(promise).resolves.toBe(true)
  })

  it('clic en cancelar resuelve la promesa en false', async () => {
    const promise = useConfirm().confirm({ title: 'A', message: 'B', confirmLabel: 'Sí, eliminar' })
    const wrapper = mountDialog()
    await wrapper.get('[data-testid="confirm-cancel"]').trigger('click')
    await expect(promise).resolves.toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/ui/ConfirmDialog.test.ts`
Expected: FAIL — `Cannot find module './ConfirmDialog.vue'`

- [ ] **Step 3: Write minimal implementation**

```vue
<!-- frontend/src/components/ui/ConfirmDialog.vue -->
<script setup lang="ts">
import { AlertTriangle } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import ModalAccentStrip from './ModalAccentStrip.vue'
import { useConfirm } from '@/composables/useConfirm'

const { pending, resolveConfirm, resolveCancel } = useConfirm()
const { t } = useI18n()
</script>

<template>
  <div
    v-if="pending"
    class="fixed inset-0 z-[70] flex items-center justify-center bg-navy-900/50 px-4"
    @click.self="resolveCancel"
  >
    <div class="w-full max-w-sm overflow-hidden rounded-md bg-white shadow-xl">
      <ModalAccentStrip />
      <div class="p-5" role="alertdialog" aria-modal="true" :aria-label="pending.title">
        <div class="flex items-start gap-3">
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50">
            <AlertTriangle class="h-5 w-5 text-red-600" aria-hidden="true" />
          </div>
          <div>
            <h2 class="text-base font-bold text-navy-900">{{ pending.title }}</h2>
            <p class="mt-1 text-sm text-navy-700">{{ pending.message }}</p>
          </div>
        </div>
        <div class="mt-5 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-sm border border-line-strong px-3.5 py-2 text-sm font-semibold text-navy-700 hover:bg-cream"
            data-testid="confirm-cancel"
            @click="resolveCancel"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            type="button"
            class="rounded-sm bg-red-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-red-700"
            data-testid="confirm-accept"
            @click="resolveConfirm"
          >
            {{ pending.confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
```

Agregar `common.cancel` en ambos locales (dentro del mismo objeto `"common"` creado en Task 2):

```json
// es.json
"common": {
  "toastDismiss": "Cerrar aviso",
  "cancel": "Cancelar"
}
```

```json
// en.json
"common": {
  "toastDismiss": "Dismiss notification",
  "cancel": "Cancel"
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/ui/ConfirmDialog.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/components/ui/ConfirmDialog.vue src/components/ui/ConfirmDialog.test.ts src/i18n/locales/es.json src/i18n/locales/en.json && git commit -m "feat: agregar ConfirmDialog.vue"
```

---

## Task 5: Montar `ToastContainer` y `ConfirmDialog` en `DashboardLayout.vue`

**Files:**
- Modify: `frontend/src/layouts/DashboardLayout.vue:1-12` (imports), `:148-161` (template)

**Interfaces:**
- Consumes: `ToastContainer` (Task 2), `ConfirmDialog` (Task 4).

- [ ] **Step 1: Agregar imports**

En `frontend/src/layouts/DashboardLayout.vue`, después de la línea `import NotificationBell from '@/components/dashboard/notifications/NotificationBell.vue'` (línea 10), agregar:

```typescript
import ToastContainer from '@/components/ui/ToastContainer.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
```

- [ ] **Step 2: Montar los componentes en el template**

Reemplazar el cierre del template (líneas 159-161):

```html
    </footer>
  </div>
</template>
```

por:

```html
    </footer>

    <ToastContainer />
    <ConfirmDialog />
  </div>
</template>
```

- [ ] **Step 3: Verificar tipos**

Run: `cd frontend && npx vue-tsc -b --noEmit`
Expected: sin errores nuevos

- [ ] **Step 4: Commit**

```bash
cd frontend && git add src/layouts/DashboardLayout.vue && git commit -m "feat: montar ToastContainer y ConfirmDialog en DashboardLayout"
```

---

## Task 6: `FormField.vue` — borde rojo, sin texto de error duplicado

**Files:**
- Modify: `frontend/src/components/ui/FormField.vue` (contenido completo abajo)
- Test: `frontend/src/components/ui/FormField.test.ts`

**Interfaces:**
- Sin cambios en la prop pública `error?: string` — sigue existiendo (controla el borde + `aria-invalid`), pero deja de renderizarse como texto.

- [ ] **Step 1: Write the failing test**

```typescript
// frontend/src/components/ui/FormField.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FormField from './FormField.vue'

describe('FormField', () => {
  it('sin error: borde normal, sin aria-invalid, sin texto de error', () => {
    const wrapper = mount(FormField, { props: { id: 'f1', label: 'Nombre' } })
    const input = wrapper.get('input')
    expect(input.classes()).not.toContain('border-red-400')
    expect(input.attributes('aria-invalid')).toBe('false')
    expect(wrapper.find('p').exists()).toBe(false)
  })

  it('con error: agrega border-red-400, aria-invalid true, y NO renderiza texto de error', () => {
    const wrapper = mount(FormField, { props: { id: 'f1', label: 'Nombre', error: 'Campo requerido' } })
    const input = wrapper.get('input')
    expect(input.classes()).toContain('border-red-400')
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(wrapper.text()).not.toContain('Campo requerido')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/ui/FormField.test.ts`
Expected: FAIL — el test de "con error" falla porque hoy SÍ renderiza el `<p>` con el texto (`wrapper.text()` contiene `'Campo requerido'`), y porque no existe la clase `border-red-400`.

- [ ] **Step 3: Reemplazar el contenido completo de `FormField.vue`**

```vue
<script setup lang="ts">
/**
 * Input con label, mismo look de los campos del formulario de contacto
 * (ContactoSection.vue) pero reutilizable entre las 4 páginas de auth.
 * inheritAttrs: false + v-bind="$attrs" en el <input>: los atributos de
 * vee-validate (onBlur/onInput de fooAttrs) deben caer en el input real, no
 * en el <div> contenedor (que sería el fallback por defecto). El mensaje de
 * error ya no se renderiza acá — sale por useToast() desde el formulario
 * que usa este campo; acá solo queda el resaltado visual (borde rojo) para
 * que el usuario ubique qué campo falló.
 */
defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    id: string
    label: string
    type?: 'text' | 'email' | 'password'
    placeholder?: string
    error?: string
    autocomplete?: string
  }>(),
  { type: 'text', placeholder: '', error: '', autocomplete: 'off' },
)

const modelValue = defineModel<string>({ default: '' })
</script>

<template>
  <div>
    <label :for="id" class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy-700">{{
      label
    }}</label>
    <input
      :id="id"
      v-model="modelValue"
      v-bind="$attrs"
      :type="type"
      :placeholder="placeholder"
      :autocomplete="autocomplete"
      class="w-full rounded-sm border bg-white px-4 py-3 text-sm text-navy-900 outline-none transition-colors placeholder:text-navy-700/40"
      :class="error ? 'border-red-400 focus:border-red-500' : 'border-line-strong focus:border-sky-400'"
      :aria-invalid="!!error"
    />
  </div>
</template>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/ui/FormField.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Verificar tipos**

Run: `cd frontend && npx vue-tsc -b --noEmit`
Expected: sin errores nuevos (los formularios que usan `FormField` no dependen de `${id}-error`)

- [ ] **Step 6: Commit**

```bash
cd frontend && git add src/components/ui/FormField.vue src/components/ui/FormField.test.ts && git commit -m "feat: FormField.vue resalta error con borde rojo, deja de duplicar el texto"
```

---

## Task 7: `Modal.vue` — shell base compartido

**Files:**
- Create: `frontend/src/components/ui/Modal.vue`
- Test: `frontend/src/components/ui/Modal.test.ts`

**Interfaces:**
- Produces: `<Modal :max-width="'md'|'lg'|'2xl'" :scrollable="boolean" @close="...">` con slots `default` (contenido) y `header` (opcional, para los 4 casos con subtítulo — si no se usa, se pasa `title` como prop y se renderiza un `<h2>` simple). Consumido por las Tasks 8-11 (migración de los 13 modales existentes).

- [ ] **Step 1: Write the failing test**

```typescript
// frontend/src/components/ui/Modal.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Modal from './Modal.vue'

describe('Modal', () => {
  it('renderiza el título por defecto y el slot', () => {
    const wrapper = mount(Modal, {
      props: { title: 'Editar cliente' },
      slots: { default: '<p>contenido</p>' },
    })
    expect(wrapper.get('h2').text()).toBe('Editar cliente')
    expect(wrapper.html()).toContain('contenido')
  })

  it('renderiza el slot header en vez del título por defecto, si se pasa', () => {
    const wrapper = mount(Modal, {
      props: { title: 'ignorado' },
      slots: { header: '<div><h2>Custom</h2><p>Subtítulo</p></div>', default: 'x' },
    })
    expect(wrapper.html()).toContain('Custom')
    expect(wrapper.html()).toContain('Subtítulo')
  })

  it('aplica max-width md por defecto y el pasado por prop', () => {
    const wrapper = mount(Modal, { props: { title: 't' } })
    expect(wrapper.find('.max-w-md').exists()).toBe(true)
    const wrapper2 = mount(Modal, { props: { title: 't', maxWidth: '2xl' } })
    expect(wrapper2.find('.max-w-2xl').exists()).toBe(true)
  })

  it('clic en el botón cerrar emite close', async () => {
    const wrapper = mount(Modal, { props: { title: 't' } })
    await wrapper.get('button[aria-label]').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('clic en el backdrop (fuera del panel) emite close', async () => {
    const wrapper = mount(Modal, { props: { title: 't' } })
    await wrapper.get('.fixed.inset-0').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/ui/Modal.test.ts`
Expected: FAIL — `Cannot find module './Modal.vue'`

- [ ] **Step 3: Write minimal implementation**

```vue
<!-- frontend/src/components/ui/Modal.vue -->
<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import ModalAccentStrip from './ModalAccentStrip.vue'

withDefaults(
  defineProps<{
    title: string
    maxWidth?: 'md' | 'lg' | '2xl'
    scrollable?: boolean
  }>(),
  { maxWidth: 'md', scrollable: false },
)
const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()

const MAX_WIDTH_CLASS: Record<'md' | 'lg' | '2xl', string> = {
  md: 'max-w-md',
  lg: 'max-w-lg',
  '2xl': 'max-w-2xl',
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 px-4" @click.self="emit('close')">
    <div
      class="w-full overflow-hidden rounded-md bg-white shadow-xl"
      :class="[MAX_WIDTH_CLASS[maxWidth], scrollable ? 'flex max-h-[90vh] flex-col' : '']"
    >
      <ModalAccentStrip />
      <div class="p-5" :class="scrollable ? 'overflow-y-auto' : ''">
        <div class="flex items-start justify-between gap-3">
          <slot name="header">
            <h2 class="text-base font-bold text-navy-900">{{ title }}</h2>
          </slot>
          <button
            type="button"
            class="shrink-0 rounded-sm p-1 text-navy-700/60 hover:bg-cream"
            :aria-label="t('common.close')"
            @click="emit('close')"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
        <slot />
      </div>
    </div>
  </div>
</template>
```

Agregar `common.close` en ambos locales (mismo objeto `"common"` de las tasks anteriores):

```json
// es.json
"common": {
  "toastDismiss": "Cerrar aviso",
  "cancel": "Cancelar",
  "close": "Cerrar"
}
```

```json
// en.json
"common": {
  "toastDismiss": "Dismiss notification",
  "cancel": "Cancel",
  "close": "Close"
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/ui/Modal.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/components/ui/Modal.vue src/components/ui/Modal.test.ts src/i18n/locales/es.json src/i18n/locales/en.json && git commit -m "feat: agregar Modal.vue (shell base compartido)"
```

---

## Task 8: Migrar 4 modales a `Modal.vue` — lote `max-w-md`, evento `cancel`, sin scroll

**Files:**
- Modify: `frontend/src/components/dashboard/CorrectReadingModal.vue`
- Modify: `frontend/src/components/dashboard/roadSafety/RoadSafetyCorrectFieldModal.vue`
- Modify: `frontend/src/components/dashboard/services/ServiceFormModal.vue`
- Modify: `frontend/src/components/dashboard/notifications/SuspendUserModal.vue`

**Interfaces:**
- Consumes: `Modal.vue` de Task 7 (prop `title`, evento `close`).
- No cambia ninguna prop/evento propio de estos 4 componentes (`submit`/`cancel`, `confirm`/`cancel`) — solo su shell interno.

El patrón de cambio es idéntico en los 4 archivos: quitar el `import { X } from 'lucide-vue-next'` y `import ModalAccentStrip from '@/components/ui/ModalAccentStrip.vue'`, agregar `import Modal from '@/components/ui/Modal.vue'`; en el template, reemplazar el backdrop+wrapper+franja+header+botón-cerrar por `<Modal :title="..." @close="emit('cancel')">`, y su cierre `</div></div></div>` final por `</Modal>`, dejando el contenido interno intacto.

- [ ] **Step 1: `CorrectReadingModal.vue`**

Reemplazar la línea 4 (`import { X } from 'lucide-vue-next'`) y línea 6 (`import ModalAccentStrip from '@/components/ui/ModalAccentStrip.vue'`) por:

```typescript
import Modal from '@/components/ui/Modal.vue'
```

Reemplazar el bloque de template, líneas 34-49:

```html
<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 px-4" @click.self="emit('cancel')">
    <div class="w-full max-w-md overflow-hidden rounded-md bg-white shadow-xl">
      <ModalAccentStrip />
      <div class="p-5">
        <div class="flex items-start justify-between gap-3">
          <h2 class="text-base font-bold text-navy-900">{{ t('dashboard.category.correctModal.title') }}</h2>
          <button
            type="button"
            class="rounded-sm p-1 text-navy-700/60 hover:bg-cream"
            :aria-label="t('dashboard.category.correctModal.close')"
            @click="emit('cancel')"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="mt-4 grid gap-1 text-sm text-navy-700">
```

por:

```html
<template>
  <Modal :title="t('dashboard.category.correctModal.title')" @close="emit('cancel')">
    <div class="mt-4 grid gap-1 text-sm text-navy-700">
```

Y reemplazar el cierre, líneas 122-125:

```html
      </div>
    </div>
  </div>
</template>
```

por:

```html
  </Modal>
</template>
```

- [ ] **Step 2: `RoadSafetyCorrectFieldModal.vue`**

Reemplazar línea 4 (`import { X } from 'lucide-vue-next'`) y línea 5 (`import ModalAccentStrip from '@/components/ui/ModalAccentStrip.vue'`) por:

```typescript
import Modal from '@/components/ui/Modal.vue'
```

Reemplazar el bloque de template, líneas 54-70:

```html
<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 px-4" @click.self="emit('cancel')">
    <div class="w-full max-w-md overflow-hidden rounded-md bg-white shadow-xl">
      <ModalAccentStrip />
      <div class="p-5">
        <div class="flex items-start justify-between gap-3">
          <h2 class="text-base font-bold text-navy-900">{{ t('roadSafety.correct.title') }}</h2>
          <button
            type="button"
            class="rounded-sm p-1 text-navy-700/60 hover:bg-cream"
            :aria-label="t('roadSafety.correct.close')"
            @click="emit('cancel')"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <p class="mt-2 text-sm text-navy-700">
```

por:

```html
<template>
  <Modal :title="t('roadSafety.correct.title')" @close="emit('cancel')">
    <p class="mt-2 text-sm text-navy-700">
```

Y reemplazar el cierre, líneas 144-146:

```html
      </div>
    </div>
  </div>
</template>
```

por:

```html
  </Modal>
</template>
```

- [ ] **Step 3: `ServiceFormModal.vue`**

Reemplazar línea 4 (`import { X } from 'lucide-vue-next'`) y línea 7 (`import ModalAccentStrip from '@/components/ui/ModalAccentStrip.vue'`) por:

```typescript
import Modal from '@/components/ui/Modal.vue'
```

Reemplazar el bloque de template, líneas 30-53:

```html
<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 px-4" @click.self="emit('cancel')">
    <div class="w-full max-w-md overflow-hidden rounded-md bg-white shadow-xl">
      <ModalAccentStrip />
      <div class="p-5">
        <div class="flex items-start justify-between gap-3">
          <h2 class="text-base font-bold text-navy-900">
            {{
              props.service
                ? t('dashboard.servicesManagement.modal.editTitle')
                : t('dashboard.servicesManagement.modal.createTitle')
            }}
          </h2>
          <button
            type="button"
            class="rounded-sm p-1 text-navy-700/60 hover:bg-cream"
            :aria-label="t('dashboard.servicesManagement.modal.close')"
            @click="emit('cancel')"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="mt-4">
```

por:

```html
<template>
  <Modal
    :title="
      props.service
        ? t('dashboard.servicesManagement.modal.editTitle')
        : t('dashboard.servicesManagement.modal.createTitle')
    "
    @close="emit('cancel')"
  >
    <div class="mt-4">
```

Y reemplazar el cierre, líneas 111-113:

```html
      </div>
    </div>
  </div>
</template>
```

por:

```html
  </Modal>
</template>
```

- [ ] **Step 4: `SuspendUserModal.vue`**

Reemplazar línea 4 (`import { X } from 'lucide-vue-next'`) y línea 5 (`import ModalAccentStrip from '@/components/ui/ModalAccentStrip.vue'`) por:

```typescript
import Modal from '@/components/ui/Modal.vue'
```

Reemplazar el bloque de template, líneas 25-42:

```html
<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 px-4" @click.self="emit('cancel')">
    <div class="w-full max-w-md overflow-hidden rounded-md bg-white shadow-xl">
      <ModalAccentStrip />
      <div class="p-5">
        <div class="flex items-start justify-between gap-3">
          <h2 class="text-base font-bold text-navy-900">{{ t('dashboard.accountManagement.suspendModal.title') }}</h2>
          <button
            type="button"
            class="rounded-sm p-1 text-navy-700/60 hover:bg-cream"
            :aria-label="t('dashboard.accountManagement.suspendModal.close')"
            @click="emit('cancel')"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <p class="mt-2 text-sm text-navy-700">
          {{ t('dashboard.accountManagement.suspendModal.description', { nombre: props.nombre, email: props.email }) }}
        </p>
```

por:

```html
<template>
  <Modal :title="t('dashboard.accountManagement.suspendModal.title')" @close="emit('cancel')">
    <p class="mt-2 text-sm text-navy-700">
      {{ t('dashboard.accountManagement.suspendModal.description', { nombre: props.nombre, email: props.email }) }}
    </p>
```

Y reemplazar el cierre, líneas 86-89:

```html
      </div>
    </div>
  </div>
</template>
```

por:

```html
  </Modal>
</template>
```

- [ ] **Step 5: Verificar tipos**

Run: `cd frontend && npx vue-tsc -b --noEmit`
Expected: sin errores nuevos

- [ ] **Step 6: Verificación manual en navegador**

Con el dashboard corriendo (`npm run dev`), abrir: corregir una lectura en una categoría de Higiene Industrial (`CorrectReadingModal`), corregir un campo en Seguridad Vial Hoja 2/3 (`RoadSafetyCorrectFieldModal`), crear/editar un servicio en Admin → Servicios (`ServiceFormModal`), suspender un cliente en Admin → Clientes (`SuspendUserModal`). Confirmar que los 4 se ven idénticos a antes (franja `--org-secondary`, botón cerrar funcional, clic fuera cierra).

- [ ] **Step 7: Commit**

```bash
cd frontend && git add src/components/dashboard/CorrectReadingModal.vue src/components/dashboard/roadSafety/RoadSafetyCorrectFieldModal.vue src/components/dashboard/services/ServiceFormModal.vue src/components/dashboard/notifications/SuspendUserModal.vue && git commit -m "refactor: migrar 4 modales (md/cancel) a Modal.vue compartido"
```

---

## Task 9: Migrar 3 modales a `Modal.vue` (lote `lg`/`2xl`, evento `close`) + banner→Toast en 2 de ellos

**Files:**
- Modify: `frontend/src/components/dashboard/nonConformities/NonConformityFormModal.vue`
- Modify: `frontend/src/modules/notifications/components/NotificationFormModal.vue`
- Modify: `frontend/src/components/dashboard/VariableUploadModal.vue`

**Interfaces:**
- Consumes: `Modal.vue` (Task 7), `useToast()` (Task 1).

- [ ] **Step 1: `NonConformityFormModal.vue` — shell + banner**

Reemplazar línea 4 (`import { X } from 'lucide-vue-next'`) y línea 5 (`import ModalAccentStrip from '@/components/ui/ModalAccentStrip.vue'`) por:

```typescript
import Modal from '@/components/ui/Modal.vue'
import { useToast } from '@/composables/useToast'
```

Quitar la línea 28 (`const errorMessage = ref('')`).

Reemplazar el `handleSubmit` (líneas 30-57):

```typescript
async function handleSubmit() {
  if (!descripcion.value.trim()) {
    useToast().error(t('dashboard.nonConformitiesAdmin.form.descripcionRequired'))
    return
  }
  if (props.mode === 'create' && !variableNombre.value.trim()) {
    useToast().error(t('dashboard.nonConformitiesAdmin.form.variableRequired'))
    return
  }

  submitting.value = true
  try {
    if (props.mode === 'create') {
      emit('submitCreate', {
        descripcion: descripcion.value.trim(),
        variableNombre: variableNombre.value.trim(),
        zona: zona.value.trim() || undefined,
        prioridad: prioridad.value,
        estado: estado.value,
      })
    } else {
      emit('submitEdit', { descripcion: descripcion.value.trim(), prioridad: prioridad.value, estado: estado.value })
    }
  } finally {
    submitting.value = false
  }
}
```

Reemplazar el bloque de template, líneas 60-83:

```html
<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 px-4" @click.self="emit('close')">
    <div class="w-full max-w-lg overflow-hidden rounded-md bg-white shadow-xl">
      <ModalAccentStrip />
      <div class="p-5">
        <div class="flex items-start justify-between gap-3">
          <h2 class="text-base font-bold text-navy-900">
            {{
              mode === 'create'
                ? t('dashboard.nonConformitiesAdmin.form.createTitle')
                : t('dashboard.nonConformitiesAdmin.form.editTitle')
            }}
          </h2>
          <button
            type="button"
            class="rounded-sm p-1 text-navy-700/60 hover:bg-cream"
            :aria-label="t('dashboard.nonConformitiesAdmin.form.cancel')"
            @click="emit('close')"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <form class="mt-4 grid gap-4" @submit.prevent="handleSubmit">
```

por:

```html
<template>
  <Modal
    :title="
      mode === 'create'
        ? t('dashboard.nonConformitiesAdmin.form.createTitle')
        : t('dashboard.nonConformitiesAdmin.form.editTitle')
    "
    max-width="lg"
    @close="emit('close')"
  >
    <form class="mt-4 grid gap-4" @submit.prevent="handleSubmit">
```

Quitar el banner, líneas 146-148:

```html
          <p v-if="errorMessage" class="rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {{ errorMessage }}
          </p>

```

Reemplazar el cierre, líneas 165-169:

```html
        </form>
      </div>
    </div>
  </div>
</template>
```

por:

```html
    </form>
  </Modal>
</template>
```

- [ ] **Step 2: `NotificationFormModal.vue` — shell + banner**

Reemplazar línea 4 (`import { X } from 'lucide-vue-next'`) y línea 5 (`import ModalAccentStrip from '@/components/ui/ModalAccentStrip.vue'`) por:

```typescript
import Modal from '@/components/ui/Modal.vue'
import { useToast } from '@/composables/useToast'
```

Quitar la línea 37 (`const errorMessage = ref('')`).

Reemplazar `handleSubmit` (líneas 51-89), cambiando cada `errorMessage.value = ...; return` por `useToast().error(...); return`:

```typescript
async function handleSubmit() {
  if (!message.value.trim()) {
    useToast().error(t('dashboard.notificationsAdmin.form.messageLabel'))
    return
  }
  if (props.mode === 'edit') {
    emit('submitEdit', { message: message.value.trim(), severity: severity.value })
    return
  }

  if (recipientMode.value === 'user') {
    const org = organizations.value.find((o) => o.id === organizationId.value)
    if (!org?.responsable) {
      useToast().error(t('dashboard.notificationsAdmin.form.organizationPlaceholder'))
      return
    }
    submitting.value = true
    try {
      emit('submitCreate', {
        message: message.value.trim(),
        severity: severity.value,
        sendEmail: sendEmail.value,
        recipientMode: 'user',
        recipientId: org.responsable.id,
      })
    } finally {
      submitting.value = false
    }
    return
  }

  emit('submitCreate', {
    message: message.value.trim(),
    severity: severity.value,
    sendEmail: sendEmail.value,
    recipientMode: recipientMode.value,
  })
}
```

Reemplazar el bloque de template, líneas 92-111:

```html
<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 px-4" @click.self="emit('close')">
    <div class="w-full max-w-lg overflow-hidden rounded-md bg-white shadow-xl">
      <ModalAccentStrip />
      <div class="p-5">
        <div class="flex items-start justify-between gap-3">
          <h2 class="text-base font-bold text-navy-900">
            {{ mode === 'create' ? t('dashboard.notificationsAdmin.form.createTitle') : t('dashboard.notificationsAdmin.form.editTitle') }}
          </h2>
          <button
            type="button"
            class="rounded-sm p-1 text-navy-700/60 hover:bg-cream"
            :aria-label="t('dashboard.notificationsAdmin.form.cancel')"
            @click="emit('close')"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <form class="mt-4 grid gap-4" @submit.prevent="handleSubmit">
```

por:

```html
<template>
  <Modal
    :title="mode === 'create' ? t('dashboard.notificationsAdmin.form.createTitle') : t('dashboard.notificationsAdmin.form.editTitle')"
    max-width="lg"
    @close="emit('close')"
  >
    <form class="mt-4 grid gap-4" @submit.prevent="handleSubmit">
```

Quitar el banner, líneas 172-174:

```html
          <p v-if="errorMessage" class="rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {{ errorMessage }}
          </p>

```

Reemplazar el cierre, líneas 191-195:

```html
        </form>
      </div>
    </div>
  </div>
</template>
```

por:

```html
    </form>
  </Modal>
</template>
```

- [ ] **Step 3: `VariableUploadModal.vue` — solo shell (sin banner propio)**

Reemplazar línea 3 (`import { X } from 'lucide-vue-next'`) y línea 4 (`import ModalAccentStrip from '@/components/ui/ModalAccentStrip.vue'`) por:

```typescript
import Modal from '@/components/ui/Modal.vue'
```

Reemplazar el bloque de template completo (líneas 13-44):

```html
<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 px-4" @click.self="emit('close')">
    <div class="w-full max-w-2xl overflow-hidden rounded-md bg-white shadow-xl">
      <ModalAccentStrip />
      <div class="p-5">
        <div class="flex items-start justify-between gap-3">
          <h2 class="text-base font-bold text-navy-900">{{ t('dashboard.uploadForm.heading') }}</h2>
          <button
            type="button"
            class="rounded-sm p-1 text-navy-700/60 hover:bg-cream"
            :aria-label="t('dashboard.uploadForm.close')"
            @click="emit('close')"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <VariableUploadForm
          class="mt-4"
          :organization-id="organizationId"
          :service-slug="serviceSlug"
          @uploaded="
            () => {
              emit('uploaded')
              emit('close')
            }
          "
        />
      </div>
    </div>
  </div>
</template>
```

por:

```html
<template>
  <Modal :title="t('dashboard.uploadForm.heading')" max-width="2xl" @close="emit('close')">
    <VariableUploadForm
      class="mt-4"
      :organization-id="organizationId"
      :service-slug="serviceSlug"
      @uploaded="
        () => {
          emit('uploaded')
          emit('close')
        }
      "
    />
  </Modal>
</template>
```

- [ ] **Step 4: Verificar tipos**

Run: `cd frontend && npx vue-tsc -b --noEmit`
Expected: sin errores nuevos

- [ ] **Step 5: Verificación manual en navegador**

Crear una no conformidad (Admin → panel de no conformidades), crear/editar una notificación admin, subir un Excel de variables (botón "Subir variables" en Higiene Industrial) — confirmar que los 3 modales se ven igual, y que enviar el formulario de no conformidad/notificación sin descripción/mensaje muestra un Toast rojo (no el banner viejo).

- [ ] **Step 6: Commit**

```bash
cd frontend && git add src/components/dashboard/nonConformities/NonConformityFormModal.vue src/modules/notifications/components/NotificationFormModal.vue src/components/dashboard/VariableUploadModal.vue && git commit -m "refactor: migrar 3 modales (lg/2xl) a Modal.vue + banner de validación a Toast"
```

---

## Task 10: Migrar 3 modales `scrollable` a `Modal.vue` + banner→Toast (incluye éxito)

**Files:**
- Modify: `frontend/src/components/dashboard/organizations/CategoryConfigModal.vue`
- Modify: `frontend/src/components/dashboard/organizations/EditOrganizationModal.vue`
- Modify: `frontend/src/modules/profile/components/ChangePasswordModal.vue`

**Interfaces:**
- Consumes: `Modal.vue` con `scrollable` (Task 7), `useToast()` (Task 1).

- [ ] **Step 1: `CategoryConfigModal.vue` — shell (con subtítulo, usa slot `header`) + banner**

Reemplazar línea 4 (`import { X } from 'lucide-vue-next'`) y línea 5 (`import ModalAccentStrip from '@/components/ui/ModalAccentStrip.vue'`) por:

```typescript
import Modal from '@/components/ui/Modal.vue'
import { useToast } from '@/composables/useToast'
```

Reemplazar `load()` (líneas 24-33):

```typescript
async function load() {
  status.value = 'loading'
  try {
    items.value = await listCategoryConfig(props.organizationId)
    status.value = 'ready'
  } catch (err) {
    status.value = 'error'
    errorMessage.value = err instanceof CategoryConfigRequestError ? err.message : t('clients.categoryConfig.loadError')
    useToast().error(errorMessage.value)
  }
}
```

Reemplazar `handleToggle()` (líneas 37-49):

```typescript
async function handleToggle(item: CategoryConfigItem) {
  togglingCategoria.value = item.categoria
  const nextHabilitada = !item.habilitada
  try {
    await updateCategoryConfig(props.organizationId, item.categoria, nextHabilitada)
    item.habilitada = nextHabilitada
  } catch (err) {
    const message = err instanceof CategoryConfigRequestError ? err.message : t('clients.categoryConfig.actionError')
    useToast().error(message)
  } finally {
    togglingCategoria.value = null
  }
}
```

Quitar la línea 20 (`const errorMessage = ref('')`) — ya no se usa fuera de `load()`, donde se puede declarar localmente. Ajustar `load()` (arriba) para no depender de un `ref` externo:

```typescript
async function load() {
  status.value = 'loading'
  try {
    items.value = await listCategoryConfig(props.organizationId)
    status.value = 'ready'
  } catch (err) {
    status.value = 'error'
    useToast().error(err instanceof CategoryConfigRequestError ? err.message : t('clients.categoryConfig.loadError'))
  }
}
```

Reemplazar el bloque de template, líneas 52-81:

```html
<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 px-4" @click.self="emit('cancel')">
    <div class="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-md bg-white shadow-xl">
      <ModalAccentStrip />

      <div class="overflow-y-auto p-5">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 class="text-base font-bold text-navy-900">{{ t('clients.categoryConfig.title') }}</h2>
            <p class="text-xs text-navy-700/60">{{ props.organizationNombre }}</p>
          </div>
          <button
            type="button"
            class="rounded-sm p-1 text-navy-700/60 hover:bg-cream"
            :aria-label="t('dashboard.servicesManagement.modal.close')"
            @click="emit('cancel')"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <p class="mt-2 text-xs text-navy-700/60">{{ t('clients.categoryConfig.hint') }}</p>

        <p v-if="status === 'loading'" class="mt-4 text-sm text-navy-700">{{ t('clients.categoryConfig.loading') }}</p>
        <p
          v-else-if="status === 'error'"
          class="mt-4 rounded-sm border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700"
        >
          {{ errorMessage }}
        </p>
        <div v-else class="mt-4 grid gap-2">
```

por:

```html
<template>
  <Modal title="" scrollable @close="emit('cancel')">
    <template #header>
      <div>
        <h2 class="text-base font-bold text-navy-900">{{ t('clients.categoryConfig.title') }}</h2>
        <p class="text-xs text-navy-700/60">{{ props.organizationNombre }}</p>
      </div>
    </template>

    <p class="mt-2 text-xs text-navy-700/60">{{ t('clients.categoryConfig.hint') }}</p>

    <p v-if="status === 'loading'" class="mt-4 text-sm text-navy-700">{{ t('clients.categoryConfig.loading') }}</p>
    <div v-else-if="status === 'ready'" class="mt-4 grid gap-2">
```

Reemplazar el cierre, líneas 97-113 (quitando también el banner inline redundante de la línea 99):

```html
        </div>

        <p v-if="status === 'ready' && errorMessage" class="mt-3 text-sm text-red-700">{{ errorMessage }}</p>

        <div class="mt-5 flex justify-end">
          <button
            type="button"
            class="rounded-sm border border-line-strong px-4 py-2 text-sm font-medium text-navy-700 hover:border-navy-900"
            @click="emit('cancel')"
          >
            {{ t('dashboard.servicesManagement.modal.close') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
```

por:

```html
    </div>

    <div class="mt-5 flex justify-end">
      <button
        type="button"
        class="rounded-sm border border-line-strong px-4 py-2 text-sm font-medium text-navy-700 hover:border-navy-900"
        @click="emit('cancel')"
      >
        {{ t('dashboard.servicesManagement.modal.close') }}
      </button>
    </div>
  </Modal>
</template>
```

- [ ] **Step 2: `EditOrganizationModal.vue` — solo shell (con subtítulo, sin banner propio)**

Reemplazar línea 4 (`import { X } from 'lucide-vue-next'`) y línea 6 (`import ModalAccentStrip from '@/components/ui/ModalAccentStrip.vue'`) por:

```typescript
import Modal from '@/components/ui/Modal.vue'
```

Reemplazar el bloque de template, líneas 38-56:

```html
<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 px-4" @click.self="emit('cancel')">
    <div class="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-md bg-white shadow-xl">
      <ModalAccentStrip />

      <div class="overflow-y-auto p-5">
        <div class="flex items-start justify-between gap-3">
          <h2 class="text-base font-bold text-navy-900">{{ t('organizations.editModal.title') }}</h2>
          <button
            type="button"
            class="rounded-sm p-1 text-navy-700/60 hover:bg-cream"
            :aria-label="t('dashboard.servicesManagement.modal.close')"
            @click="emit('cancel')"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="mt-4 grid gap-4">
```

por:

```html
<template>
  <Modal :title="t('organizations.editModal.title')" scrollable @close="emit('cancel')">
    <div class="mt-4 grid gap-4">
```

Reemplazar el cierre, líneas 101-105:

```html
      </div>
    </div>
  </div>
</template>
```

por:

```html
  </Modal>
</template>
```

- [ ] **Step 3: `ChangePasswordModal.vue` — shell (con subtítulo) + banner error/éxito**

Reemplazar línea 4 (`import { X } from 'lucide-vue-next'`) y línea 7 (`import ModalAccentStrip from '@/components/ui/ModalAccentStrip.vue'`) por:

```typescript
import Modal from '@/components/ui/Modal.vue'
import { useToast } from '@/composables/useToast'
```

Reemplazar `submit()` (líneas 22-49):

```typescript
async function submit() {
  errors.value = {}

  if (newPassword.value !== confirmNewPassword.value) {
    useToast().error(t('myProfile.passwordMismatch'))
    return
  }

  status.value = 'loading'
  try {
    await changeMyPassword({ currentPassword: currentPassword.value, newPassword: newPassword.value })
    status.value = 'success'
    currentPassword.value = ''
    newPassword.value = ''
    confirmNewPassword.value = ''
    useToast().success(t('myProfile.passwordChanged'))
  } catch (err) {
    status.value = 'error'
    if (err instanceof MyProfileValidationError) {
      errors.value = err.fieldErrors
      useToast().error(Object.values(err.fieldErrors)[0] ?? t('myProfile.genericError'))
    } else if (err instanceof MyProfileRequestError) {
      useToast().error(err.message)
    } else {
      useToast().error(t('myProfile.genericError'))
    }
  }
}
```

Quitar la línea 20 (`const errorMessage = ref('')`).

Reemplazar el bloque de template, líneas 52-70:

```html
<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 px-4" @click.self="emit('close')">
    <div class="w-full max-w-md overflow-hidden rounded-md bg-white shadow-xl">
      <ModalAccentStrip />
      <div class="p-5 sm:p-6">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 class="text-base font-bold text-navy-900">{{ t('myProfile.passwordTitle') }}</h2>
            <p class="mt-1 text-sm text-navy-700/70">{{ t('myProfile.passwordSubtitle') }}</p>
          </div>
          <button
            type="button"
            class="rounded-sm p-1 text-navy-700/60 hover:bg-cream"
            :aria-label="t('myProfile.closeModal')"
            @click="emit('close')"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <form class="mt-5 grid gap-4" novalidate @submit.prevent="submit">
```

por:

```html
<template>
  <Modal title="" @close="emit('close')">
    <template #header>
      <div>
        <h2 class="text-base font-bold text-navy-900">{{ t('myProfile.passwordTitle') }}</h2>
        <p class="mt-1 text-sm text-navy-700/70">{{ t('myProfile.passwordSubtitle') }}</p>
      </div>
    </template>

    <form class="mt-5 grid gap-4" novalidate @submit.prevent="submit">
```

Quitar los dos banners, líneas 97-105:

```html
          <p
            v-if="status === 'success'"
            class="rounded-sm border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
          >
            {{ t('myProfile.passwordChanged') }}
          </p>
          <p v-if="errorMessage" class="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {{ errorMessage }}
          </p>

```

Reemplazar el cierre, líneas 108-113:

```html
        </form>
      </div>
    </div>
  </div>
</template>
```

por:

```html
    </form>
  </Modal>
</template>
```

- [ ] **Step 4: Verificar tipos**

Run: `cd frontend && npx vue-tsc -b --noEmit`
Expected: sin errores nuevos

- [ ] **Step 5: Verificación manual en navegador**

Abrir "Configurar categorías" desde Admin → Clientes, editar un cliente, y cambiar la contraseña desde Mi Perfil. Confirmar Toast verde al cambiar contraseña con éxito, Toast rojo si las contraseñas no coinciden.

- [ ] **Step 6: Commit**

```bash
cd frontend && git add src/components/dashboard/organizations/CategoryConfigModal.vue src/components/dashboard/organizations/EditOrganizationModal.vue src/modules/profile/components/ChangePasswordModal.vue && git commit -m "refactor: migrar 3 modales scrollable a Modal.vue + banner/éxito a Toast"
```

---

## Task 11: Migrar últimos 3 modales a `Modal.vue` + banner→Toast

**Files:**
- Modify: `frontend/src/components/dashboard/organizations/CreateOrganizationModal.vue`
- Modify: `frontend/src/components/dashboard/ReportGeneratorModal.vue`
- Modify: `frontend/src/components/dashboard/roadSafety/RoadSafetyReportModal.vue`

**Interfaces:**
- Consumes: `Modal.vue` (Task 7), `useToast()` (Task 1).

- [ ] **Step 1: `CreateOrganizationModal.vue` — solo shell (sin banner propio, `CreateOrganizationForm` se migra en Task 14)**

Reemplazar línea 3 (`import { X } from 'lucide-vue-next'`) y línea 4 (`import ModalAccentStrip from '@/components/ui/ModalAccentStrip.vue'`) por:

```typescript
import Modal from '@/components/ui/Modal.vue'
```

Reemplazar el bloque de template completo (líneas 12-37):

```html
<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 px-4" @click.self="emit('cancel')">
    <div class="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-md bg-white shadow-xl">
      <ModalAccentStrip />

      <div class="overflow-y-auto p-5">
        <div class="flex items-start justify-between gap-3">
          <h2 class="text-base font-bold text-navy-900">{{ t('organizations.form.pageTitle') }}</h2>
          <button
            type="button"
            class="rounded-sm p-1 text-navy-700/60 hover:bg-cream"
            :aria-label="t('dashboard.servicesManagement.modal.close')"
            @click="emit('cancel')"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
        <p class="mt-1 text-sm text-navy-700/70">{{ t('organizations.form.pageSubtitle') }}</p>

        <div class="mt-6">
          <CreateOrganizationForm @created="emit('created')" />
        </div>
      </div>
    </div>
  </div>
</template>
```

por:

```html
<template>
  <Modal :title="t('organizations.form.pageTitle')" max-width="2xl" scrollable @close="emit('cancel')">
    <p class="mt-1 text-sm text-navy-700/70">{{ t('organizations.form.pageSubtitle') }}</p>

    <div class="mt-6">
      <CreateOrganizationForm @created="emit('created')" />
    </div>
  </Modal>
</template>
```

- [ ] **Step 2: `ReportGeneratorModal.vue` — shell (con subtítulo) + banner**

Reemplazar línea 4 (`import { X } from 'lucide-vue-next'`) y línea 5 (`import ModalAccentStrip from '@/components/ui/ModalAccentStrip.vue'`) por:

```typescript
import Modal from '@/components/ui/Modal.vue'
import { useToast } from '@/composables/useToast'
```

Reemplazar `handleGeneratePdf`/`handleGenerateCsv` (líneas 37-63):

```typescript
async function handleGeneratePdf() {
  generandoPdf.value = true
  try {
    await generateReportPdf(
      { serviceSlug: props.serviceSlug, organizationId: props.organizationId },
      props.tipo,
      metadata.value,
    )
  } catch (err) {
    useToast().error(err instanceof ReportRequestError ? err.message : t('reports.genericError'))
  } finally {
    generandoPdf.value = false
  }
}

async function handleGenerateCsv() {
  generandoCsv.value = true
  try {
    await generateReportCsv({ serviceSlug: props.serviceSlug, organizationId: props.organizationId })
  } catch (err) {
    useToast().error(err instanceof ReportRequestError ? err.message : t('reports.genericError'))
  } finally {
    generandoCsv.value = false
  }
}
```

Quitar la línea 35 (`const errorMessage = ref('')`).

Reemplazar el bloque de template, líneas 66-89:

```html
<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 px-4" @click.self="emit('close')">
    <div class="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-md bg-white shadow-xl">
      <ModalAccentStrip />

      <div class="overflow-y-auto p-5 sm:p-6">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 class="text-base font-bold text-navy-900">
              {{ tipo === 'basico' ? t('reports.tituloBasico') : t('reports.tituloTecnico') }}
            </h2>
            <p class="mt-1 text-sm text-navy-700/70">{{ t('reports.subtitulo') }}</p>
          </div>
          <button
            type="button"
            class="rounded-sm p-1 text-navy-700/60 hover:bg-cream"
            :aria-label="t('reports.close')"
            @click="emit('close')"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <form class="mt-5 grid gap-4 sm:grid-cols-2" novalidate @submit.prevent="handleGeneratePdf">
```

por:

```html
<template>
  <Modal title="" max-width="lg" scrollable @close="emit('close')">
    <template #header>
      <div>
        <h2 class="text-base font-bold text-navy-900">
          {{ tipo === 'basico' ? t('reports.tituloBasico') : t('reports.tituloTecnico') }}
        </h2>
        <p class="mt-1 text-sm text-navy-700/70">{{ t('reports.subtitulo') }}</p>
      </div>
    </template>

    <form class="mt-5 grid gap-4 sm:grid-cols-2" novalidate @submit.prevent="handleGeneratePdf">
```

Quitar el banner, líneas 162-167:

```html
          <p
            v-if="errorMessage"
            class="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:col-span-2"
          >
            {{ errorMessage }}
          </p>

```

Reemplazar el cierre, líneas 187-191:

```html
        </form>
      </div>
    </div>
  </div>
</template>
```

por:

```html
    </form>
  </Modal>
</template>
```

- [ ] **Step 3: `RoadSafetyReportModal.vue` — mismo patrón que Step 2**

Reemplazar línea 4 (`import { X } from 'lucide-vue-next'`) y línea 5 (`import ModalAccentStrip from '@/components/ui/ModalAccentStrip.vue'`) por:

```typescript
import Modal from '@/components/ui/Modal.vue'
import { useToast } from '@/composables/useToast'
```

Reemplazar `handleGeneratePdf`/`handleGenerateCsv` (líneas 34-56):

```typescript
async function handleGeneratePdf() {
  generandoPdf.value = true
  try {
    await generateRoadSafetyReportPdf({ organizationId: props.organizationId }, props.tipo, metadata.value)
  } catch (err) {
    useToast().error(err instanceof RoadSafetyRequestError ? err.message : t('roadSafety.reports.genericError'))
  } finally {
    generandoPdf.value = false
  }
}

async function handleGenerateCsv() {
  generandoCsv.value = true
  try {
    await generateRoadSafetyReportCsv({ organizationId: props.organizationId }, props.tipo)
  } catch (err) {
    useToast().error(err instanceof RoadSafetyRequestError ? err.message : t('roadSafety.reports.genericError'))
  } finally {
    generandoCsv.value = false
  }
}
```

Quitar la línea 32 (`const errorMessage = ref('')`).

Reemplazar el bloque de template, líneas 59-80:

```html
<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 px-4" @click.self="emit('close')">
    <div class="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-md bg-white shadow-xl">
      <ModalAccentStrip />

      <div class="overflow-y-auto p-5 sm:p-6">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 class="text-base font-bold text-navy-900">{{ t(`roadSafety.reports.titulo.${tipo}`) }}</h2>
            <p class="mt-1 text-sm text-navy-700/70">{{ t('roadSafety.reports.subtitulo') }}</p>
          </div>
          <button
            type="button"
            class="rounded-sm p-1 text-navy-700/60 hover:bg-cream"
            :aria-label="t('roadSafety.reports.close')"
            @click="emit('close')"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <form class="mt-5 grid gap-4 sm:grid-cols-2" novalidate @submit.prevent="handleGeneratePdf">
```

por:

```html
<template>
  <Modal title="" max-width="lg" scrollable @close="emit('close')">
    <template #header>
      <div>
        <h2 class="text-base font-bold text-navy-900">{{ t(`roadSafety.reports.titulo.${tipo}`) }}</h2>
        <p class="mt-1 text-sm text-navy-700/70">{{ t('roadSafety.reports.subtitulo') }}</p>
      </div>
    </template>

    <form class="mt-5 grid gap-4 sm:grid-cols-2" novalidate @submit.prevent="handleGeneratePdf">
```

Quitar el banner, líneas 143-148:

```html
          <p
            v-if="errorMessage"
            class="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:col-span-2"
          >
            {{ errorMessage }}
          </p>

```

Reemplazar el cierre, líneas 168-172:

```html
        </form>
      </div>
    </div>
  </div>
</template>
```

por:

```html
    </form>
  </Modal>
</template>
```

- [ ] **Step 4: Verificar tipos**

Run: `cd frontend && npx vue-tsc -b --noEmit`
Expected: sin errores nuevos

- [ ] **Step 5: Verificación manual en navegador**

Crear una empresa nueva (Admin → Clientes → Nuevo cliente), generar un reporte PDF/CSV desde Higiene Industrial y desde Seguridad Vial — provocar un error (ej. sin conexión) para confirmar que aparece el Toast rojo en vez del banner.

- [ ] **Step 6: Commit**

```bash
cd frontend && git add src/components/dashboard/organizations/CreateOrganizationModal.vue src/components/dashboard/ReportGeneratorModal.vue src/components/dashboard/roadSafety/RoadSafetyReportModal.vue && git commit -m "refactor: migrar últimos 3 modales a Modal.vue + banner a Toast"
```

Con esto quedan migrados los 13 modales existentes (Tasks 8-11). Las Tasks 12-19 migran los banners de error/éxito de las vistas que NO son modal (las que sí eran modal ya quedaron resueltas arriba: `NonConformityFormModal`, `NotificationFormModal`, `CategoryConfigModal`, `ChangePasswordModal`, `ReportGeneratorModal`, `RoadSafetyReportModal`).

---

## Task 12: Banner→Toast en 4 vistas de auth (composable externo)

**Files:**
- Modify: `frontend/src/modules/auth/views/ActivateAccountView.vue`
- Modify: `frontend/src/modules/auth/views/ForgotPasswordView.vue`
- Modify: `frontend/src/modules/auth/views/LoginView.vue`
- Modify: `frontend/src/modules/auth/views/ResetPasswordView.vue`

**Interfaces:**
- Consumes: `useToast()` (Task 1). No modifica los composables `useActivationForm`/`useForgotPasswordForm`/`useLoginForm`/`useResetPasswordForm` (`frontend/src/composables/`) — el `status`/`errorMessage` que exponen (ver `useLoginForm.ts:8,12-13`: `type AuthSubmitStatus = 'idle'|'loading'|'success'|'error'`, `status = ref<AuthSubmitStatus>('idle')`, `errorMessage = ref('')`) se observan desde cada vista con un `watch`, sin tocar el composable.

El patrón es idéntico en los 4 archivos: agregar `import { watch } from 'vue'` (si `watch` no está ya importado de `'vue'`), agregar `import { useToast } from '@/composables/useToast'`, agregar un `watch(status, ...)` justo después de donde se desestructura `status`/`errorMessage` del composable, y quitar el `<p v-if="status === 'error'">...</p>` del template.

- [ ] **Step 1: `LoginView.vue`**

Leer el archivo (`Read frontend/src/modules/auth/views/LoginView.vue`) y ubicar la línea 16, donde se desestructura `useLoginForm()`. Justo después, agregar:

```typescript
watch(status, (value) => {
  if (value === 'error') useToast().error(errorMessage.value)
})
```

Agregar los imports necesarios al inicio del `<script setup>`:

```typescript
import { watch } from 'vue'
import { useToast } from '@/composables/useToast'
```

En el template, quitar el bloque (líneas 82-84):

```html
<p v-if="status === 'error'" class="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
  {{ errorMessage }}
</p>
```

- [ ] **Step 2: `ActivateAccountView.vue`, `ForgotPasswordView.vue`, `ResetPasswordView.vue`**

Mismo patrón que Step 1: leer cada archivo, ubicar dónde se desestructura `status`/`errorMessage` del composable (`useActivationForm()` en `ActivateAccountView.vue:19`, `useForgotPasswordForm()` en `ForgotPasswordView.vue:10`, `useResetPasswordForm()` en `ResetPasswordView.vue:19`), agregar el mismo `watch(status, ...)` + imports, y quitar el banner (bloque idéntico al de Step 1, en `ActivateAccountView.vue:62-64`, `ForgotPasswordView.vue:45-47`, `ResetPasswordView.vue:64-66`).

- [ ] **Step 3: Verificar tipos**

Run: `cd frontend && npx vue-tsc -b --noEmit`
Expected: sin errores nuevos

- [ ] **Step 4: Verificación manual en navegador**

Intentar iniciar sesión con credenciales inválidas, solicitar recuperación de contraseña con un email no registrado, y activar cuenta/resetear contraseña con un token vencido — confirmar que aparece un Toast rojo en vez del banner viejo, en los 4 flujos.

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/modules/auth/views/ActivateAccountView.vue src/modules/auth/views/ForgotPasswordView.vue src/modules/auth/views/LoginView.vue src/modules/auth/views/ResetPasswordView.vue && git commit -m "refactor: banner de error a Toast en las 4 vistas de auth"
```

---

## Task 13: Banner→Toast en `MyProfilePanel.vue` y `UpdateProfileView.vue`

**Files:**
- Modify: `frontend/src/modules/profile/components/MyProfilePanel.vue`
- Modify: `frontend/src/modules/profile/views/UpdateProfileView.vue`

**Interfaces:**
- Consumes: `useToast()` (Task 1).

- [ ] **Step 1: `MyProfilePanel.vue`**

Leer el archivo (`Read frontend/src/modules/profile/components/MyProfilePanel.vue`). Agregar `import { useToast } from '@/composables/useToast'`.

En el `catch` de `submitProfile()` (líneas 62-72), después de asignar `profileErrorMessage.value = ...` en cada rama, agregar la llamada a toast correspondiente — el bloque completo queda:

```typescript
} catch (err) {
  profileStatus.value = 'error'
  if (err instanceof MyProfileValidationError) {
    profileErrors.value = err.fieldErrors
    profileErrorMessage.value = Object.values(err.fieldErrors)[0] ?? t('myProfile.genericError')
  } else if (err instanceof MyProfileRequestError) {
    profileErrorMessage.value = err.message
  } else {
    profileErrorMessage.value = t('myProfile.genericError')
  }
  useToast().error(profileErrorMessage.value)
}
```

En el punto de éxito de `submitProfile()` (justo antes de `profileStatus.value = 'success'`, o inmediatamente después), agregar `useToast().success(t('myProfile.profileSaved'))`.

En el template, quitar el banner de éxito (líneas 274-279):

```html
<p
  v-if="profileStatus === 'success'"
  class="rounded-sm border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
>
  {{ t('myProfile.profileSaved') }}
</p>
```

Y el banner de error de guardado (líneas 280-285):

```html
<p
  v-if="profileStatus === 'error'"
  class="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
>
  {{ profileErrorMessage }}
</p>
```

El banner de error de **carga inicial** (`loadStatus === 'error'`, líneas 167-172) usa un mensaje fijo por i18n (`t('myProfile.loadError')`, sin captura de error real) — dejarlo tal cual, no forma parte del alcance de esta migración (no repite un banner de acción, es el estado vacío de la página cuando falla la carga inicial, análogo al `v-else-if="status==='error'"` de una lista vacía).

- [ ] **Step 2: `UpdateProfileView.vue`**

Leer el archivo (`Read frontend/src/modules/profile/views/UpdateProfileView.vue`). Agregar `import { useToast } from '@/composables/useToast'`.

En el `catch` de las líneas 76-90 (maneja `MyProfileValidationError`, `MyProfileRequestError`, `BrandingValidationError`, `BrandingRequestError`), después de la asignación final de `errorMessage.value = ...` en cada rama, agregar `useToast().error(errorMessage.value)` al final del bloque `catch` (una sola llamada, después de que `errorMessage.value` ya quedó seteado por la rama que corresponda).

En el template, quitar el banner (líneas 143-148):

```html
<p
  v-if="status === 'error'"
  class="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
>
  {{ errorMessage }}
</p>
```

- [ ] **Step 3: Verificar tipos**

Run: `cd frontend && npx vue-tsc -b --noEmit`
Expected: sin errores nuevos

- [ ] **Step 4: Verificación manual en navegador**

Guardar el perfil con éxito (Toast verde), forzar un error de validación (Toast rojo), y editar branding desde "Actualizar mi organización" con datos inválidos.

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/modules/profile/components/MyProfilePanel.vue src/modules/profile/views/UpdateProfileView.vue && git commit -m "refactor: banner de error/éxito a Toast en perfil"
```

---

## Task 14: Banner→Toast en `CreateOrganizationForm.vue` + `ClientsListView.vue` (incluye reemplazo de `window.confirm()`)

**Files:**
- Modify: `frontend/src/components/dashboard/organizations/CreateOrganizationForm.vue`
- Modify: `frontend/src/modules/clients/views/ClientsListView.vue`

**Interfaces:**
- Consumes: `useToast()` (Task 1), `useConfirm()` (Task 3).

- [ ] **Step 1: `CreateOrganizationForm.vue` — banner error/éxito, composable externo**

Leer el archivo. `status`/`errorMessage`/`errors` vienen de `useCreateOrganizationForm()` (líneas 16-43) — mismo patrón que Task 12, sin tocar el composable. Agregar `import { watch } from 'vue'` (si falta) y `import { useToast } from '@/composables/useToast'`, y justo después de desestructurar el composable:

```typescript
watch(status, (value) => {
  if (value === 'error') useToast().error(errorMessage.value)
  if (value === 'success') useToast().success(t('organizations.form.successBody'))
})
```

En el template, quitar el banner de error (líneas 184-186):

```html
<p v-if="status === 'error'" class="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
  {{ errorMessage }}
</p>
```

Y el bloque de éxito (líneas 51-55) — ojo: es un `<template v-if="status === 'success'">` que envuelve el formulario entero (probablemente reemplazando la vista por un mensaje de confirmación, no solo un banner). Leer el contexto completo de ese `v-if`/`v-else` antes de tocarlo: si el bloque de éxito hace algo más que mostrar texto (ej. oculta el formulario y muestra un botón "Crear otra"), **no quitarlo** — solo quitar el `<p>`/`<div>` de texto interno y dejar la estructura de "formulario enviado, ¿qué sigue?" intacta; el Toast es un complemento, no reemplaza un flujo de post-éxito con acciones.

- [ ] **Step 2: `ClientsListView.vue` — banner error inline + `window.confirm()` → `useConfirm()`**

Ya leído completo arriba. Agregar imports:

```typescript
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
```

Reemplazar cada uno de los 5 `catch` que asignan `errorMessage.value = ...` (líneas 56-57, 79-80, 92-93, 106-107, 119-120) agregando `useToast().error(errorMessage.value)` justo después de la asignación. Ejemplo para `load()` (líneas 50-59):

```typescript
async function load() {
  status.value = 'loading'
  try {
    organizations.value = await listOrganizationsFull()
    status.value = 'ready'
  } catch (err) {
    status.value = 'error'
    errorMessage.value = err instanceof OrganizationRequestError ? err.message : t('clients.loadError')
    useToast().error(errorMessage.value)
  }
}
```

Aplicar el mismo agregado (`useToast().error(errorMessage.value)` después de la asignación) en `handleEditSubmit()` (línea 80), `handleSuspend()` (línea 93), `handleResendInvitation()` (línea 120).

Reemplazar `handleReactivate()` (líneas 99-111) — cambia de `window.confirm()` síncrono a `await useConfirm().confirm({...})`:

```typescript
async function handleReactivate(org: OrganizationListItem) {
  if (!org.responsable) return
  const confirmed = await useConfirm().confirm({
    title: t('dashboard.accountManagement.reactivate'),
    message: t('dashboard.accountManagement.confirmReactivate', { nombre: org.responsable.nombre }),
    confirmLabel: t('dashboard.accountManagement.reactivate'),
  })
  if (!confirmed) return
  actioningId.value = org.responsable.id
  try {
    await reactivateUser(org.responsable.id)
    await load()
  } catch (err) {
    errorMessage.value = err instanceof AdminUsersRequestError ? err.message : t('clients.actionError')
    useToast().error(errorMessage.value)
  } finally {
    actioningId.value = null
  }
}
```

En el template, quitar el banner (líneas 189-194):

```html
<p
  v-else-if="status === 'error'"
  class="mt-6 rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
>
  {{ errorMessage }}
</p>
```

- [ ] **Step 3: Verificar tipos**

Run: `cd frontend && npx vue-tsc -b --noEmit`
Expected: sin errores nuevos

- [ ] **Step 4: Verificación manual en navegador**

Crear una empresa (Toast verde), reactivar un usuario suspendido desde Admin → Clientes → pestaña Suspendidos — confirmar que aparece el `ConfirmDialog` nuevo (no el `window.confirm()` nativo del navegador) y que cancelar no reactiva.

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/components/dashboard/organizations/CreateOrganizationForm.vue src/modules/clients/views/ClientsListView.vue && git commit -m "refactor: banner a Toast + window.confirm a useConfirm en Clientes"
```

---

## Task 15: Banner→Toast en `NotificationsAdminPanel.vue` + `NotificationsPanel.vue`, y confirmación en `handleDelete`

**Files:**
- Modify: `frontend/src/modules/notifications/components/NotificationsAdminPanel.vue`
- Modify: `frontend/src/modules/notifications/components/NotificationsPanel.vue`

**Interfaces:**
- Consumes: `useToast()` (Task 1), `useConfirm()` (Task 3).

- [ ] **Step 1: `NotificationsAdminPanel.vue` — banner + `confirm()` nativo → `useConfirm()`**

Ya leído completo arriba. Agregar imports después de la línea 18 (`import type { AppNotification, ... } from '@/types/notification'`):

```typescript
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
```

Reemplazar `load()` (líneas 33-49):

```typescript
async function load() {
  status.value = 'loading'
  try {
    const result = await listAdminNotifications({
      page: page.value,
      pageSize: 20,
      deletedOnly: activeTab.value === 'history',
    })
    items.value = result.items
    totalPages.value = result.totalPages
    status.value = 'ready'
  } catch (err) {
    status.value = 'error'
    errorMessage.value = err instanceof NotificationRequestError ? err.message : t('dashboard.notificationsAdmin.loadError')
    useToast().error(errorMessage.value)
  }
}
```

Reemplazar `handleDelete()` (líneas 81-89):

```typescript
async function handleDelete(notification: AppNotification) {
  const confirmed = await useConfirm().confirm({
    title: t('dashboard.notificationsAdmin.delete'),
    message: t('dashboard.notificationsAdmin.deleteConfirm'),
    confirmLabel: t('dashboard.notificationsAdmin.delete'),
  })
  if (!confirmed) return
  try {
    await deleteNotification(notification.id)
    await load()
  } catch {
    useToast().error(t('dashboard.notificationsAdmin.deleteError'))
  }
}
```

Quitar la línea 26 (`const errorMessage = ref('')`) — sigue usándose dentro de `load()` arriba, así que en realidad se mantiene (la línea declara el `ref`, solo se agrega la llamada a toast en el `catch`; no se elimina la declaración).

En el template, quitar el banner (líneas 127-131, justo debajo de `status === 'loading'`):

```html
<p
  v-else-if="status === 'error'"
  class="mt-6 rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
>
  {{ errorMessage }}
</p>
```

- [ ] **Step 2: `NotificationsPanel.vue` — banner**

Leer el archivo (`Read frontend/src/modules/notifications/components/NotificationsPanel.vue`). `status`/`errorMessage` declarados cerca de la línea 18-19, con el mismo bloque de banner (`border-red-200 bg-red-50 ... text-red-700`) alrededor de la línea 121-126, y el `catch` de `load()` alrededor de la línea 54-57.

Agregar `import { useToast } from '@/composables/useToast'`. En el `catch` de `load()`, después de la asignación de `errorMessage.value = ...`, agregar `useToast().error(errorMessage.value)`. En el template, quitar el `<p v-else-if="status === 'error'">...</p>` completo que envuelve `{{ errorMessage }}`.

- [ ] **Step 3: Verificar tipos**

Run: `cd frontend && npx vue-tsc -b --noEmit`
Expected: sin errores nuevos

- [ ] **Step 4: Verificación manual en navegador**

Eliminar una notificación admin — confirmar que aparece el `ConfirmDialog` nuevo (no el `confirm()` nativo) y que cancelar no borra nada. Abrir el panel de notificaciones del cliente (campana del navbar) para confirmar que sigue funcionando igual.

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/modules/notifications/components/NotificationsAdminPanel.vue src/modules/notifications/components/NotificationsPanel.vue && git commit -m "refactor: banner a Toast + confirmación al eliminar notificación"
```

---

## Task 16: Banner→Toast en `RoadSafetyHoja1Tab.vue`..`RoadSafetyHoja4Tab.vue`

**Files:**
- Modify: `frontend/src/components/dashboard/roadSafety/RoadSafetyHoja1Tab.vue`
- Modify: `frontend/src/components/dashboard/roadSafety/RoadSafetyHoja2Tab.vue`
- Modify: `frontend/src/components/dashboard/roadSafety/RoadSafetyHoja3Tab.vue`
- Modify: `frontend/src/components/dashboard/roadSafety/RoadSafetyHoja4Tab.vue`

**Interfaces:**
- Consumes: `useToast()` (Task 1).

- [ ] **Step 1: `RoadSafetyHoja1Tab.vue`**

Ya leído completo arriba. Agregar `import { useToast } from '@/composables/useToast'` después de la línea 8 (`import { inventoryConceptLabel } from '@/utils/inventoryConceptLabel'`).

Reemplazar `load()` (líneas 17-26):

```typescript
async function load() {
  status.value = 'loading'
  try {
    data.value = await getRoadSafetyHoja1({ organizationId: props.organizationId })
    status.value = 'ready'
  } catch (err) {
    status.value = 'error'
    errorMessage.value = err instanceof RoadSafetyRequestError ? err.message : t('roadSafety.loadError')
    useToast().error(errorMessage.value)
  }
}
```

En el template, quitar la línea 44-46:

```html
<p v-else-if="status === 'error'" class="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
  {{ errorMessage }}
</p>
```

(la línea 43, `<p v-if="status === 'loading'">`, se queda igual — solo se quita la rama de error).

- [ ] **Step 2: `RoadSafetyHoja2Tab.vue` y `RoadSafetyHoja3Tab.vue`**

Ambos comparten el mismo patrón: `status`/`errorMessage` para la carga (banner alrededor de la línea 101-103 en Hoja2, 84-86 en Hoja3, idéntico al de `RoadSafetyHoja1Tab.vue`) MÁS un segundo ref `correctError` para el modal de corrección puntual (banner alrededor de línea 96-98 en Hoja2, 87-89 en Hoja3):

```html
<p v-if="correctError" class="rounded-sm border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
  {{ correctError }}
</p>
```

Leer cada archivo. Agregar `import { useToast } from '@/composables/useToast'`. En el `catch` de `load()` (línea 33-36 en Hoja2, 32-35 en Hoja3), después de asignar `errorMessage.value = ...`, agregar `useToast().error(errorMessage.value)` — mismo patrón que Step 1. En el `catch` de `handleCorrectSubmit()` (línea 82-84 en Hoja2, 75-77 en Hoja3), después de asignar `correctError.value = ...`, agregar `useToast().error(correctError.value)`.

En el template de ambos, quitar el banner de carga (idéntico al de `RoadSafetyHoja1Tab.vue`) y el banner de `correctError` mostrado arriba.

- [ ] **Step 3: `RoadSafetyHoja4Tab.vue`**

Mismo patrón que Step 1 (sin `correctError`): `status`/`errorMessage` (líneas 12-13), banner en líneas 41-43 idéntico, `catch` de `load()` en líneas 23-26. Agregar el import, agregar `useToast().error(errorMessage.value)` en el `catch`, quitar el banner del template.

- [ ] **Step 4: Verificar tipos**

Run: `cd frontend && npx vue-tsc -b --noEmit`
Expected: sin errores nuevos

- [ ] **Step 5: Verificación manual en navegador**

Abrir las 4 hojas de Seguridad Vial (Admin → Seguridad Vial → Generalidad/Vehículos/Personas/Rutograma) con datos reales, y forzar un error de corrección puntual en Hoja2/Hoja3 (razón muy corta) para confirmar que sale el Toast en vez del banner.

- [ ] **Step 6: Commit**

```bash
cd frontend && git add src/components/dashboard/roadSafety/RoadSafetyHoja1Tab.vue src/components/dashboard/roadSafety/RoadSafetyHoja2Tab.vue src/components/dashboard/roadSafety/RoadSafetyHoja3Tab.vue src/components/dashboard/roadSafety/RoadSafetyHoja4Tab.vue && git commit -m "refactor: banner a Toast en las 4 hojas de Seguridad Vial"
```

---

## Task 17: Banner→Toast en `RoadSafetyAlertasTab.vue`, `RoadSafetyConfigTab.vue`, `RoadSafetyDashboardTab.vue`, `RoadSafetyHistorialTab.vue`

**Files:**
- Modify: `frontend/src/components/dashboard/roadSafety/RoadSafetyAlertasTab.vue`
- Modify: `frontend/src/components/dashboard/roadSafety/RoadSafetyConfigTab.vue`
- Modify: `frontend/src/components/dashboard/roadSafety/RoadSafetyDashboardTab.vue`
- Modify: `frontend/src/components/dashboard/roadSafety/RoadSafetyHistorialTab.vue`

**Interfaces:**
- Consumes: `useToast()` (Task 1).

- [ ] **Step 1: `RoadSafetyAlertasTab.vue`**

Leer el archivo. `status`/`errorMessage` (líneas 10-11), banner idéntico al de `RoadSafetyHoja1Tab.vue` en líneas 33-35, `catch` de `load()` en líneas 19-22. Agregar `import { useToast } from '@/composables/useToast'`, agregar `useToast().error(errorMessage.value)` en el `catch` tras la asignación, quitar el banner del template.

- [ ] **Step 2: `RoadSafetyConfigTab.vue`**

Leer el archivo. `status`/`errorMessage` (líneas 11-12). Dos bancos de error: el de carga (líneas 59-64, mismo bloque con `px-4 py-2.5`) y uno de acción inline sin fondo (línea 93: `<p v-if="status === 'ready' && errorMessage" class="mt-2 text-sm text-red-700">{{ errorMessage }}</p>`). `catch` de `load()` en líneas 23-26 y de `changeFrequency()` en líneas 39-41. Agregar el import, agregar `useToast().error(errorMessage.value)` en ambos `catch`, quitar AMBOS banners del template (el de carga y el inline de acción — el inline es redundante con el Toast).

- [ ] **Step 3: `RoadSafetyDashboardTab.vue`**

Leer el archivo. `status`/`errorMessage` (líneas 23-24), banner idéntico en líneas 70-72, `catch` de `load()` en líneas 56-59. Agregar el import, agregar `useToast().error(errorMessage.value)` en el `catch`, quitar el banner.

- [ ] **Step 4: `RoadSafetyHistorialTab.vue`**

Leer el archivo. `status`/`errorMessage` (líneas 12-13), banner idéntico en líneas 37-39, `catch` de `load()` en líneas 22-24. Agregar el import, agregar `useToast().error(errorMessage.value)` en el `catch`, quitar el banner.

- [ ] **Step 5: Verificar tipos**

Run: `cd frontend && npx vue-tsc -b --noEmit`
Expected: sin errores nuevos

- [ ] **Step 6: Verificación manual en navegador**

Abrir Alertas, Configuración, Dashboard e Historial de Seguridad Vial — cambiar la frecuencia de alertas en Configuración para confirmar que un error ahí también sale por Toast.

- [ ] **Step 7: Commit**

```bash
cd frontend && git add src/components/dashboard/roadSafety/RoadSafetyAlertasTab.vue src/components/dashboard/roadSafety/RoadSafetyConfigTab.vue src/components/dashboard/roadSafety/RoadSafetyDashboardTab.vue src/components/dashboard/roadSafety/RoadSafetyHistorialTab.vue && git commit -m "refactor: banner a Toast en Alertas/Config/Dashboard/Historial de Seguridad Vial"
```

---

## Task 18: Banner→Toast + 2 confirmaciones nuevas — `HigieneConfigTab.vue`, `NonConformitiesAdminTab.vue`, `HigieneIndustrialPanel.vue`, `CategoryTab.vue`, `HistorialTab.vue` (tabs)

**Files:**
- Modify: `frontend/src/components/dashboard/higieneConfig/HigieneConfigTab.vue`
- Modify: `frontend/src/components/dashboard/nonConformities/NonConformitiesAdminTab.vue`
- Modify: `frontend/src/components/dashboard/operacion/HigieneIndustrialPanel.vue`
- Modify: `frontend/src/components/dashboard/tabs/CategoryTab.vue`
- Modify: `frontend/src/components/dashboard/tabs/HistorialTab.vue`

**Interfaces:**
- Consumes: `useToast()` (Task 1), `useConfirm()` (Task 3).

- [ ] **Step 1: `HigieneConfigTab.vue` — banners + `confirm()` nativo → `useConfirm()` en `deactivate()`**

Ya leído completo arriba. Agregar imports después de la línea 13 (`import { DashboardRequestError } from '@/services/dashboard.service'`):

```typescript
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
```

Agregar `useToast().error(...)` tras cada asignación de `categoryError.value`/`catalogError.value` en los 6 `catch` (`loadCategories()` líneas 29-32, `toggleCategoria()` líneas 42-44, `loadCatalog()` líneas 69-72, `saveEdit()` líneas 101-103, `deactivate()` líneas 115-117, `submitNew()` líneas 132-134). Ejemplo para `loadCategories()`:

```typescript
async function loadCategories() {
  categoryStatus.value = 'loading'
  try {
    categoryItems.value = await listCategoryConfig(props.organizationId)
    categoryStatus.value = 'ready'
  } catch (err) {
    categoryStatus.value = 'error'
    categoryError.value = err instanceof CategoryConfigRequestError ? err.message : t('dashboard.higieneConfig.categories.loadError')
    useToast().error(categoryError.value)
  }
}
```

Reemplazar `deactivate()` (líneas 108-120), cambiando `confirm()` nativo por `useConfirm()`:

```typescript
async function deactivate(item: CatalogItem) {
  const confirmed = await useConfirm().confirm({
    title: t('dashboard.higieneConfig.catalogs.deactivate'),
    message: t('dashboard.higieneConfig.catalogs.deactivateConfirm', { nombre: item.nombre }),
    confirmLabel: t('dashboard.higieneConfig.catalogs.deactivate'),
  })
  if (!confirmed) return
  savingId.value = item.id
  try {
    await updateOrgCatalogItem(props.organizationId, activeTipo.value, item.id, { isActive: false })
    catalogItems.value = catalogItems.value.filter((i) => i.id !== item.id)
  } catch (err) {
    catalogError.value = err instanceof DashboardRequestError ? err.message : t('dashboard.higieneConfig.catalogs.actionError')
    useToast().error(catalogError.value)
  } finally {
    savingId.value = null
  }
}
```

En el template, quitar los dos banners con fondo (líneas 159-164 de categorías, 205-210 de catálogos, ambos con `border-red-200 bg-red-50 ... px-4 py-2.5`) y el banner inline de categorías (línea 181: `<p v-if="categoryStatus === 'ready' && categoryError" class="mt-2 text-sm text-red-700">{{ categoryError }}</p>`).

- [ ] **Step 2: `NonConformitiesAdminTab.vue` — banner + `confirm()` nativo → `useConfirm()` en `handleDelete()`**

Leer el archivo. `status`/`errorMessage` (líneas 29-30), banner idéntico en líneas 165-167, `catch` de `load()` en líneas 56-59. `handleDelete()` en líneas 105-107 usa `confirm()` nativo.

Agregar imports (`useToast`, `useConfirm`). Agregar `useToast().error(errorMessage.value)` en el `catch` de `load()`. Reemplazar el `confirm()` nativo de `handleDelete()` por `await useConfirm().confirm({...})` con `title`/`message`/`confirmLabel` apropiados (usar las claves i18n de eliminar no conformidad que ya existan en `dashboard.nonConformitiesAdmin.*`, o agregar `dashboard.nonConformitiesAdmin.deleteTitle`/`deleteConfirmLabel` si no existen — verificar en `es.json`/`en.json` antes de asumir). Quitar el banner del template.

- [ ] **Step 3: `HigieneIndustrialPanel.vue`**

Leer el archivo. `status`/`errorMessage` (líneas 60-61), banner idéntico en líneas 139-141, `catch` de `loadDashboard()` en líneas 113-116. Agregar el import, agregar `useToast().error(errorMessage.value)` en el `catch`, quitar el banner.

- [ ] **Step 4: `CategoryTab.vue`**

Leer el archivo. `errorMessage` (línea 31, sin `status` propio), banner en líneas 180-182, `catch` de `handleCorrect()` en líneas 38-46. Agregar el import, agregar `useToast().error(errorMessage.value)` en el `catch`, quitar el banner.

- [ ] **Step 5: `HistorialTab.vue` (tabs)**

Leer el archivo. `status` sin `errorMessage` dinámico — el mensaje es una clave i18n fija (`t('dashboard.historial.loadError')`). Banner en líneas 145-147, `catch` en `onMounted` líneas 53-56. Agregar el import, agregar `useToast().error(t('dashboard.historial.loadError'))` en el `catch`, quitar el banner.

- [ ] **Step 6: Verificar tipos**

Run: `cd frontend && npx vue-tsc -b --noEmit`
Expected: sin errores nuevos

- [ ] **Step 7: Verificación manual en navegador**

Desactivar una zona/sección/cargo/trabajador desde Higiene Industrial → Configuración (confirmar que aparece el `ConfirmDialog`, no el `confirm()` del navegador). Eliminar una no conformidad desde Admin (mismo chequeo). Abrir el resumen de Higiene Industrial, una categoría, y el historial.

- [ ] **Step 8: Commit**

```bash
cd frontend && git add src/components/dashboard/higieneConfig/HigieneConfigTab.vue src/components/dashboard/nonConformities/NonConformitiesAdminTab.vue src/components/dashboard/operacion/HigieneIndustrialPanel.vue src/components/dashboard/tabs/CategoryTab.vue src/components/dashboard/tabs/HistorialTab.vue && git commit -m "refactor: banner a Toast + confirmación al desactivar catálogo/eliminar no conformidad"
```

---

## Task 19: Banner→Toast (+éxito) en `VariableUploadForm.vue`, `ClientDashboardView.vue`, `ContactoSection.vue`, `VariableCatalogView.vue`, y confirmación en `ServicesListView.vue::handleToggleActive`

**Files:**
- Modify: `frontend/src/components/dashboard/VariableUploadForm.vue`
- Modify: `frontend/src/modules/dashboard/views/ClientDashboardView.vue`
- Modify: `frontend/src/modules/landing/components/ContactoSection.vue`
- Modify: `frontend/src/modules/services/views/VariableCatalogView.vue`
- Modify: `frontend/src/modules/services/views/ServicesListView.vue`

**Interfaces:**
- Consumes: `useToast()` (Task 1), `useConfirm()` (Task 3).

- [ ] **Step 1: `VariableUploadForm.vue` — banner error/éxito/amber**

Leer el archivo. `status`/`errorMessage` (líneas 21-22), banner en líneas 132-134, `catch` de `submit()` en líneas 53-56 (y una asignación local sin red en 30-34). Bloque de éxito separado en `lastResult` (líneas 135-137, NO usa `status==='success'`), y un tercer bloque ámbar para `filasOmitidas` (líneas 138-150, NO es error ni éxito — dejarlo tal cual, fuera de alcance).

Agregar `import { useToast } from '@/composables/useToast'`. Agregar `useToast().error(errorMessage.value)` en el `catch` de `submit()` y en la asignación local de las líneas 30-34. Después de que `lastResult.value` se asigna con éxito, agregar:

```typescript
useToast().success(
  `${t('dashboard.uploadForm.successPrefix')}${lastResult.value.filasProcesadas}${t('dashboard.uploadForm.successRows')}${lastResult.value.puestosAfectados}${t('dashboard.uploadForm.successSuffix')}`,
)
```

En el template, quitar el banner de error (líneas 132-134) y el de éxito (líneas 135-137) — **dejar intacto** el bloque ámbar de `filasOmitidas` (líneas 138-150), que no es parte de este sistema (es información adicional, no error/éxito de la acción).

- [ ] **Step 2: `ClientDashboardView.vue`**

Leer el archivo. `status`/`errorMessage` (líneas 36-37), banner idéntico en líneas 132-134, `catch` de `loadDashboard()` en líneas 66-69. Agregar el import, agregar `useToast().error(errorMessage.value)` en el `catch`, quitar el banner.

- [ ] **Step 3: `ContactoSection.vue` — composable externo, banner error (éxito es bloque separado, no se toca)**

Leer el archivo. `status`/`errorMessage` vienen de `useContactForm()` (líneas 8-27) — mismo patrón que Task 12, sin tocar el composable. Agregar `import { watch } from 'vue'` (si falta) y `import { useToast } from '@/composables/useToast'`, y justo después de desestructurar el composable:

```typescript
watch(status, (value) => {
  if (value === 'error') useToast().error(errorMessage.value)
})
```

En el template, quitar el banner (líneas 191-193):

```html
<p v-if="status === 'error'" class="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
  {{ errorMessage }}
</p>
```

El bloque de éxito (`v-else` del `<form v-if="status !== 'success'">`, líneas 220-244) es una vista completa de confirmación, no un banner — **no se toca**, queda fuera de alcance (es la landing pública, no el dashboard; el formulario de contacto no tiene usuario autenticado detrás para justificar un Toast flotante allí, y cambiar ese flujo alteraría la experiencia pública ya validada).

- [ ] **Step 4: `VariableCatalogView.vue`**

Leer el archivo. `status`/`errorMessage` (líneas 19-20), dos apariciones del mismo banner (carga inicial líneas 77-82, y dentro del `v-else` líneas 85-87 tras acciones de guardado fallidas), `catch` de `load()` en líneas 42-44 y `handleSave()` en líneas 63-65. Agregar el import, agregar `useToast().error(errorMessage.value)` en ambos `catch`, quitar AMBAS apariciones del banner del template.

- [ ] **Step 5: `ServicesListView.vue` — banner + confirmación en `handleToggleActive` (solo al desactivar)**

Ya leído completo arriba. Agregar imports después de la línea 13 (`import { useOrgPrimaryTextClass } from '@/composables/useOrgPrimaryContrast'`):

```typescript
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
```

Reemplazar `load()` (líneas 27-36), `handleSubmit()` (líneas 50-62) agregando `useToast().error(errorMessage.value)` tras cada asignación — ejemplo `load()`:

```typescript
async function load() {
  status.value = 'loading'
  try {
    services.value = await listAllServices()
    status.value = 'ready'
  } catch (err) {
    status.value = 'error'
    errorMessage.value = err instanceof ServiceCatalogRequestError ? err.message : t('dashboard.servicesManagement.loadError')
    useToast().error(errorMessage.value)
  }
}
```

Reemplazar `handleToggleActive()` (líneas 64-74) — solo pide confirmación cuando la acción es **desactivar** (`service.isActive === true`, pasa a `false`), no al activar:

```typescript
async function handleToggleActive(service: CatalogService) {
  if (service.isActive) {
    const confirmed = await useConfirm().confirm({
      title: t('dashboard.servicesManagement.deactivate'),
      message: t('dashboard.servicesManagement.deactivateConfirm', { nombre: service.nombre }),
      confirmLabel: t('dashboard.servicesManagement.deactivate'),
    })
    if (!confirmed) return
  }
  togglingId.value = service.id
  try {
    await updateService(service.id, { isActive: !service.isActive })
    await load()
  } catch (err) {
    errorMessage.value = err instanceof ServiceCatalogRequestError ? err.message : t('dashboard.servicesManagement.actionError')
    useToast().error(errorMessage.value)
  } finally {
    togglingId.value = null
  }
}
```

Agregar la clave `dashboard.servicesManagement.deactivateConfirm` en ambos locales (junto a las claves `dashboard.servicesManagement.*` existentes):

```json
// es.json
"deactivateConfirm": "¿Desactivar el servicio \"{nombre}\"? Los clientes ya no podrán acceder a él."
```

```json
// en.json
"deactivateConfirm": "Deactivate the service \"{nombre}\"? Clients will no longer be able to access it."
```

En el template, quitar el banner (líneas 93-98):

```html
<p
  v-else-if="status === 'error'"
  class="mt-6 rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
>
  {{ errorMessage }}
</p>
```

- [ ] **Step 6: Verificar tipos**

Run: `cd frontend && npx vue-tsc -b --noEmit`
Expected: sin errores nuevos

- [ ] **Step 7: Verificación manual en navegador**

Subir un Excel de variables con errores (Toast rojo) y con éxito (Toast verde + revisar que el bloque ámbar de filas omitidas, si aplica, se siga viendo). Abrir el dashboard de cliente, el formulario de contacto público (forzar un error de red), el catálogo de variables, y desactivar un servicio desde Admin → Servicios (confirmar que pide confirmación solo al desactivar, no al activar).

- [ ] **Step 8: Commit**

```bash
cd frontend && git add src/components/dashboard/VariableUploadForm.vue src/modules/dashboard/views/ClientDashboardView.vue src/modules/landing/components/ContactoSection.vue src/modules/services/views/VariableCatalogView.vue src/modules/services/views/ServicesListView.vue src/i18n/locales/es.json src/i18n/locales/en.json && git commit -m "refactor: banner a Toast + confirmación al desactivar servicio"
```

---

## Task 20: Verificación final de regresión

**Files:** ninguno (solo verificación)

- [ ] **Step 1: Typecheck completo**

Run: `cd frontend && npx vue-tsc -b --noEmit`
Expected: 0 errores

- [ ] **Step 2: Suite de tests completa**

Run: `cd frontend && npx vitest run`
Expected: todos los tests pasan, incluidos los 15 nuevos de Tasks 1-7 (`useToast`, `ToastContainer`, `useConfirm`, `ConfirmDialog`, `FormField`, `Modal`) y los ya existentes (`clientSheets.config.test.ts`, `i18n/index.test.ts`, `contact.test.ts`, `roadSafetyCompliance.test.ts`)

- [ ] **Step 3: Grep de regresión — confirmar que no queda ningún banner viejo ni `confirm()`/`window.confirm()` nativo**

Run:
```bash
cd frontend && grep -rn "border-red-200 bg-red-50" src --include=*.vue
grep -rn "border-emerald-200 bg-emerald-50\|border-green-200 bg-green-50" src --include=*.vue
grep -rn "window.confirm(\|[^.]confirm(t(" src --include=*.vue
```
Expected: sin resultados (o solo coincidencias justificadas y explícitamente fuera de alcance, como el bloque ámbar de `filasOmitidas` en `VariableUploadForm.vue`, que no usa esas clases — si el grep encuentra algo, es una migración faltante, no un falso positivo esperado).

- [ ] **Step 4: Verificación manual en navegador — recorrido completo ES/EN**

Con el dashboard corriendo (`npm run dev`), recorrer en español y en inglés: login fallido, crear/editar/suspender/reactivar cliente, subir variables (éxito y error), corregir una lectura, desactivar un ítem de catálogo, eliminar una notificación/no conformidad, generar un reporte, cambiar contraseña, editar perfil — confirmar que cada acción muestra el Toast correcto (verde/rojo, con auto-cierre) y que las acciones destructivas piden confirmación con el `ConfirmDialog` nuevo. Confirmar que el navbar (color, logo) no cambió.

- [ ] **Step 5: Commit final (si quedó algo pendiente de un paso anterior)**

```bash
cd frontend && git status
```
Si hay cambios sin commitear de una verificación que requirió un ajuste menor, commitearlos con un mensaje descriptivo. Si todo quedó limpio, no se necesita commit.
