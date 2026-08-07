<script setup lang="ts">
import { watch } from 'vue'
import { useI18n } from 'vue-i18n'
import FormField from '@/components/ui/FormField.vue'
import SubmitButton from '@/components/ui/SubmitButton.vue'
import BrandingFields from './BrandingFields.vue'
import { useCreateOrganizationForm } from '@/composables/useCreateOrganizationForm'
import { useToast } from '@/composables/useToast'
import { serviceLabel } from '@/utils/serviceLabel'
import type { Locale } from '@/i18n'

const emit = defineEmits<{ created: [] }>()

const { t, locale } = useI18n()

const {
  status,
  errorMessage,
  errors,
  services,
  servicesLoadError,
  nombre,
  nombreAttrs,
  nit,
  nitAttrs,
  contactEmail,
  contactEmailAttrs,
  serviceSlugs,
  toggleService,
  logoBase64,
  primaryColor,
  secondaryColor,
  responsableDocumentType,
  responsableDocumentTypeAttrs,
  responsableDocumentNumber,
  responsableDocumentNumberAttrs,
  responsableNombre,
  responsableNombreAttrs,
  responsableCargo,
  responsableCargoAttrs,
  responsableTelefono,
  responsableTelefonoAttrs,
  submit,
} = useCreateOrganizationForm()

watch(status, (value) => {
  if (value === 'error') useToast().error(errorMessage.value)
  if (value === 'success') useToast().success(t('organizations.form.successBody'))
})

watch(status, (value) => {
  if (value === 'success') emit('created')
})
</script>

<template>
  <template v-if="status === 'success'" />

  <form v-else class="grid gap-6" novalidate @submit.prevent="submit">
    <fieldset class="grid gap-4 rounded-md border border-line-strong p-4">
      <legend class="px-1 text-xs font-semibold uppercase tracking-wide text-navy-700">
        {{ t('organizations.form.companySection') }}
      </legend>

      <FormField
        id="org-nombre"
        v-model="nombre"
        v-bind="nombreAttrs"
        :label="t('organizations.form.nombre')"
        :placeholder="t('organizations.form.nombrePlaceholder')"
        :error="errors.nombre"
      />
      <FormField
        id="org-nit"
        v-model="nit"
        v-bind="nitAttrs"
        type="text"
        inputmode="numeric"
        :label="t('organizations.form.nit')"
        :placeholder="t('organizations.form.nitPlaceholder')"
        :error="errors.nit"
      />
      <FormField
        id="org-contact-email"
        v-model="contactEmail"
        v-bind="contactEmailAttrs"
        type="email"
        :label="t('organizations.form.contactEmail')"
        :placeholder="t('organizations.form.contactEmailPlaceholder')"
        :error="errors.contactEmail"
      />

      <div>
        <p class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy-700">
          {{ t('organizations.form.service') }}
        </p>
        <div class="grid gap-2 rounded-sm border border-line-strong bg-white px-4 py-3 sm:grid-cols-2">
          <label v-for="service in services" :key="service.slug" class="flex items-center gap-2 text-sm text-navy-900">
            <input
              type="checkbox"
              :value="service.slug"
              :checked="serviceSlugs.includes(service.slug)"
              class="h-4 w-4 rounded-sm border-line-strong"
              @change="toggleService(service.slug, ($event.target as HTMLInputElement).checked)"
            />
            {{ serviceLabel(service.slug, service.nombre, locale as Locale) }}
          </label>
        </div>
        <p v-if="errors.serviceSlugs" class="mt-1.5 text-xs text-red-600">{{ errors.serviceSlugs }}</p>
        <p v-if="servicesLoadError" class="mt-1.5 text-xs text-red-600">{{ servicesLoadError }}</p>
      </div>
    </fieldset>

    <fieldset class="grid gap-4 rounded-md border border-line-strong p-4">
      <legend class="px-1 text-xs font-semibold uppercase tracking-wide text-navy-700">
        {{ t('organizations.form.brandingSection') }}
      </legend>
      <BrandingFields
        v-model:logo-base64="logoBase64"
        v-model:primary-color="primaryColor"
        v-model:secondary-color="secondaryColor"
      />
    </fieldset>

    <fieldset class="grid gap-4 rounded-md border border-line-strong p-4">
      <legend class="px-1 text-xs font-semibold uppercase tracking-wide text-navy-700">
        {{ t('organizations.form.responsableSection') }}
      </legend>

      <div>
        <label
          for="responsable-document-type"
          class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy-700"
        >
          {{ t('organizations.form.documentType') }}
        </label>
        <select
          id="responsable-document-type"
          v-model="responsableDocumentType"
          v-bind="responsableDocumentTypeAttrs"
          class="w-full rounded-sm border border-line-strong bg-white px-4 py-3 text-sm text-navy-900"
        >
          <option value="CC">{{ t('dashboard.accountManagement.documentType.CC') }}</option>
          <option value="NIT">{{ t('dashboard.accountManagement.documentType.NIT') }}</option>
        </select>
      </div>

      <FormField
        id="responsable-document-number"
        v-model="responsableDocumentNumber"
        v-bind="responsableDocumentNumberAttrs"
        type="text"
        inputmode="numeric"
        :label="t('auth.form.documentNumber')"
        :placeholder="t('auth.form.documentNumberPlaceholder')"
        :error="errors['responsable.documentNumber']"
      />
      <FormField
        id="responsable-nombre"
        v-model="responsableNombre"
        v-bind="responsableNombreAttrs"
        :label="t('organizations.form.responsableNombre')"
        :placeholder="t('organizations.form.responsableNombrePlaceholder')"
        :error="errors['responsable.nombre']"
      />
      <p class="-mt-2 text-xs text-navy-700/60">{{ t('organizations.form.responsableEmailHint') }}</p>
      <FormField
        id="responsable-cargo"
        v-model="responsableCargo"
        v-bind="responsableCargoAttrs"
        :label="t('organizations.form.responsableCargo')"
        :placeholder="t('organizations.form.responsableCargoPlaceholder')"
        :error="errors['responsable.cargo']"
      />
      <FormField
        id="responsable-telefono"
        v-model="responsableTelefono"
        v-bind="responsableTelefonoAttrs"
        type="text"
        :label="t('organizations.form.responsableTelefono')"
        :placeholder="t('organizations.form.responsableTelefonoPlaceholder')"
        :error="errors['responsable.telefono']"
      />
    </fieldset>

    <SubmitButton :loading="status === 'loading'" :loading-label="t('auth.form.submitting')">
      {{ t('organizations.form.submit') }}
    </SubmitButton>
  </form>
</template>
