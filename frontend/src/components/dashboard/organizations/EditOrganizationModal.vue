<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { z } from 'zod'
import FormField from '@/components/ui/FormField.vue'
import Modal from '@/components/ui/Modal.vue'
import type { OrganizationListItem } from '@/types/organization'
import { useOrgPrimaryTextClass } from '@/composables/useOrgPrimaryContrast'

const props = defineProps<{
  organization: OrganizationListItem
  serverErrors?: Record<string, string>
}>()
const emit = defineEmits<{
  submit: [values: { nombre: string; nit: string; contactEmail: string }]
  cancel: []
}>()

const { t } = useI18n()
const primaryTextClass = useOrgPrimaryTextClass()

const nombre = ref(props.organization.nombre)
const nit = ref(props.organization.nit ?? '')
const contactEmail = ref(props.organization.contactEmail ?? '')
const touched = ref(false)

const nitRegex = /^\d{5,20}$/
// z.string().email() — mismo validador que usa el backend (organizations.schema.ts).
// Un regex hecho a mano no es equivalente: acepta/rechaza un set distinto de casos límite.
const emailSchema = z.string().email()

const nombreLocalError = computed(() => {
  if (!touched.value) return undefined
  if (nombre.value.trim().length < 2) return t('organizations.validation.nombreRequired')
  // Mismo chequeo que noNewlines() en backend/src/utils/zodHelpers.ts.
  if (/[\r\n]/.test(nombre.value)) return t('organizations.validation.nombreNewlines')
  return undefined
})
const nitLocalError = computed(() =>
  touched.value && !nitRegex.test(nit.value) ? t('organizations.validation.nitInvalid') : undefined,
)
const contactEmailLocalError = computed(() =>
  touched.value && !emailSchema.safeParse(contactEmail.value).success
    ? t('organizations.validation.contactEmailInvalid')
    : undefined,
)

// Errores del backend (ej. "ese NIT ya está en uso") se muestran hasta el
// próximo intento de envío, sin pisar un error de formato local si lo hay.
const nombreError = computed(() => nombreLocalError.value ?? props.serverErrors?.nombre)
const nitError = computed(() => nitLocalError.value ?? props.serverErrors?.nit)
const contactEmailError = computed(() => contactEmailLocalError.value ?? props.serverErrors?.contactEmail)

function handleSubmit() {
  touched.value = true
  if (nombreLocalError.value || nitLocalError.value || contactEmailLocalError.value) return
  emit('submit', {
    nombre: nombre.value.trim(),
    nit: nit.value.trim(),
    contactEmail: contactEmail.value.trim(),
  })
}
</script>

<template>
  <Modal :title="t('organizations.editModal.title')" scrollable @close="emit('cancel')">
    <div class="mt-4 grid gap-4">
      <FormField
        id="edit-org-nombre"
        v-model="nombre"
        :label="t('organizations.form.nombre')"
        :error="nombreError"
      />
      <FormField
        id="edit-org-nit"
        v-model="nit"
        type="text"
        inputmode="numeric"
        :label="t('organizations.form.nit')"
        :error="nitError"
      />
      <FormField
        id="edit-org-contact-email"
        v-model="contactEmail"
        type="email"
        :label="t('organizations.form.contactEmail')"
        :error="contactEmailError"
      />
    </div>

    <p class="mt-3 text-xs text-navy-700/60">{{ t('organizations.editModal.responsableNotice') }}</p>
    <p class="mt-1 text-xs text-navy-700/60">{{ t('organizations.editModal.brandingNotice') }}</p>

    <div class="mt-5 flex justify-end gap-2">
      <button
        type="button"
        class="rounded-sm border border-line-strong px-4 py-2 text-sm font-medium text-navy-700 hover:border-navy-900"
        @click="emit('cancel')"
      >
        {{ t('dashboard.servicesManagement.modal.cancel') }}
      </button>
      <button
        type="button"
        class="rounded-sm bg-[var(--org-primary,#0b1a33)] px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--org-primary,#0b1a33)]"
        :class="primaryTextClass.text"
        @click="handleSubmit"
      >
        {{ t('dashboard.servicesManagement.modal.save') }}
      </button>
    </div>
  </Modal>
</template>
