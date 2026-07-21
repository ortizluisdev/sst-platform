<script setup lang="ts">
/**
 * Input con label + mensaje de error, mismo look de los campos del
 * formulario de contacto (ContactoSection.vue) pero reutilizable entre las
 * 4 páginas de auth. inheritAttrs: false + v-bind="$attrs" en el <input>:
 * los atributos de vee-validate (onBlur/onInput de fooAttrs) deben caer en
 * el input real, no en el <div> contenedor (que sería el fallback por defecto).
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
      class="w-full rounded-sm border border-line-strong bg-white px-4 py-3 text-sm text-navy-900 outline-none transition-colors placeholder:text-navy-700/40 focus:border-sky-400"
      :aria-invalid="!!error"
      :aria-describedby="error ? `${id}-error` : undefined"
    />
    <p v-if="error" :id="`${id}-error`" class="mt-1.5 text-xs text-red-600">{{ error }}</p>
  </div>
</template>
