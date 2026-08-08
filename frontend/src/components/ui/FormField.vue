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
import { computed, ref } from 'vue'
import { Eye, EyeOff } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
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
const { t } = useI18n()

// El ícono de mostrar/ocultar solo aplica a type="password" — el resto de
// campos (text/email) nunca lo necesita. `revealed` empieza en false: el
// valor por defecto de cualquier campo de contraseña es estar oculto.
const revealed = ref(false)
const isPasswordField = computed(() => props.type === 'password')
const effectiveType = computed(() => (isPasswordField.value && revealed.value ? 'text' : props.type))
</script>

<template>
  <div>
    <label :for="id" class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy-700">{{
      label
    }}</label>
    <div class="relative">
      <input
        :id="id"
        v-model="modelValue"
        v-bind="$attrs"
        :type="effectiveType"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        class="w-full rounded-sm border bg-white px-4 py-3 text-sm text-navy-900 outline-none transition-colors placeholder:text-navy-700/40"
        :class="[error ? 'border-red-400 focus:border-red-500' : 'border-line-strong focus:border-sky-400', isPasswordField ? 'pr-11' : '']"
        :aria-invalid="!!error"
      />
      <button
        v-if="isPasswordField"
        type="button"
        class="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-navy-700/50 transition-colors hover:text-navy-700"
        :aria-label="revealed ? t('common.hidePassword') : t('common.showPassword')"
        tabindex="-1"
        @click="revealed = !revealed"
      >
        <EyeOff v-if="revealed" class="h-4 w-4" aria-hidden="true" />
        <Eye v-else class="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>
