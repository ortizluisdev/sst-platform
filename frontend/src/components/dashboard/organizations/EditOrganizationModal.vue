<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { X } from 'lucide-vue-next'
import FormField from '@/components/ui/FormField.vue'
import BrandingFields from './BrandingFields.vue'
import type { OrganizationListItem } from '@/types/organization'
import { useOrgPrimaryTextClass } from '@/composables/useOrgPrimaryContrast'

const props = defineProps<{ organization: OrganizationListItem }>()
const emit = defineEmits<{
  submit: [values: { nombre: string; nit: string; contactEmail: string; logoBase64?: string; primaryColor: string; secondaryColor: string }]
  cancel: []
}>()

const { t } = useI18n()
const primaryTextClass = useOrgPrimaryTextClass()

const nombre = ref(props.organization.nombre)
const nit = ref(props.organization.nit ?? '')
const contactEmail = ref(props.organization.contactEmail ?? '')
const touched = ref(false)

// El admin puede tocar solo colores sin resubir el logo — logoBase64 empieza
// vacío y solo se envía si el admin elige un archivo nuevo (el logo actual
// no viaja en el listado de organizaciones, se ve vía el endpoint público).
const logoBase64 = ref('')
const primaryColor = ref(props.organization.primaryColor ?? '#0b1a33')
const secondaryColor = ref(props.organization.secondaryColor ?? '#5b8dc7')

const nitRegex = /^\d{5,20}$/
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function handleSubmit() {
  touched.value = true
  if (nombre.value.trim().length < 2 || !nitRegex.test(nit.value) || !emailRegex.test(contactEmail.value)) return
  emit('submit', {
    nombre: nombre.value.trim(),
    nit: nit.value.trim(),
    contactEmail: contactEmail.value.trim(),
    logoBase64: logoBase64.value || undefined,
    primaryColor: primaryColor.value,
    secondaryColor: secondaryColor.value,
  })
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 px-4" @click.self="emit('cancel')">
    <div class="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-md bg-white p-5 shadow-xl">
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
        <FormField
          id="edit-org-nombre"
          v-model="nombre"
          :label="t('organizations.form.nombre')"
          :error="touched && nombre.trim().length < 2 ? t('organizations.validation.nombreRequired') : undefined"
        />
        <FormField
          id="edit-org-nit"
          v-model="nit"
          type="text"
          inputmode="numeric"
          :label="t('organizations.form.nit')"
          :error="touched && !nitRegex.test(nit) ? t('organizations.validation.nitInvalid') : undefined"
        />
        <FormField
          id="edit-org-contact-email"
          v-model="contactEmail"
          type="email"
          :label="t('organizations.form.contactEmail')"
          :error="touched && !emailRegex.test(contactEmail) ? t('organizations.validation.contactEmailInvalid') : undefined"
        />
      </div>

      <p class="mt-3 text-xs text-navy-700/60">{{ t('organizations.editModal.responsableNotice') }}</p>

      <div class="mt-5 border-t border-line-strong pt-4">
        <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-700">{{ t('organizations.editModal.brandingSectionTitle') }}</p>
        <BrandingFields v-model:logo-base64="logoBase64" v-model:primary-color="primaryColor" v-model:secondary-color="secondaryColor" />
      </div>

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
    </div>
  </div>
</template>
