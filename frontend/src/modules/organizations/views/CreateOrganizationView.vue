<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { useI18n } from 'vue-i18n'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import FormField from '@/components/ui/FormField.vue'
import SubmitButton from '@/components/ui/SubmitButton.vue'
import { useCreateOrganizationForm } from '@/composables/useCreateOrganizationForm'

const { t } = useI18n()
useHead(() => ({ title: t('organizations.form.pageTitle'), meta: [{ name: 'robots', content: 'noindex' }] }))

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
  serviceSlug,
  serviceSlugAttrs,
  responsableDocumentType,
  responsableDocumentTypeAttrs,
  responsableDocumentNumber,
  responsableDocumentNumberAttrs,
  responsableNombre,
  responsableNombreAttrs,
  responsableEmail,
  responsableEmailAttrs,
  responsableCargo,
  responsableCargoAttrs,
  submit,
} = useCreateOrganizationForm()
</script>

<template>
  <DashboardLayout>
    <div class="mx-auto max-w-2xl">
      <h1 class="text-xl font-bold text-navy-900">{{ t('organizations.form.pageTitle') }}</h1>
      <p class="mt-1 text-sm text-navy-700/70">{{ t('organizations.form.pageSubtitle') }}</p>

      <template v-if="status === 'success'">
        <div class="mt-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
          {{ t('organizations.form.successBody') }}
        </div>
      </template>

      <form v-else class="mt-6 grid gap-6" novalidate @submit.prevent="submit">
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
            <label for="org-service" class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy-700">
              {{ t('organizations.form.service') }}
            </label>
            <select
              id="org-service"
              v-model="serviceSlug"
              v-bind="serviceSlugAttrs"
              class="w-full rounded-sm border border-line-strong bg-white px-4 py-3 text-sm text-navy-900"
            >
              <option value="" disabled>{{ t('organizations.form.servicePlaceholder') }}</option>
              <option v-for="service in services" :key="service.slug" :value="service.slug">
                {{ service.nombre }}
              </option>
            </select>
            <p v-if="errors.serviceSlug" class="mt-1.5 text-xs text-red-600">{{ errors.serviceSlug }}</p>
            <p v-if="servicesLoadError" class="mt-1.5 text-xs text-red-600">{{ servicesLoadError }}</p>
          </div>
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
          <FormField
            id="responsable-email"
            v-model="responsableEmail"
            v-bind="responsableEmailAttrs"
            type="email"
            :label="t('organizations.form.responsableEmail')"
            :placeholder="t('organizations.form.responsableEmailPlaceholder')"
            :error="errors['responsable.email']"
          />
          <FormField
            id="responsable-cargo"
            v-model="responsableCargo"
            v-bind="responsableCargoAttrs"
            :label="t('organizations.form.responsableCargo')"
            :placeholder="t('organizations.form.responsableCargoPlaceholder')"
            :error="errors['responsable.cargo']"
          />
        </fieldset>

        <p v-if="status === 'error'" class="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {{ errorMessage }}
        </p>

        <SubmitButton :loading="status === 'loading'" :loading-label="t('auth.form.submitting')">
          {{ t('organizations.form.submit') }}
        </SubmitButton>
      </form>
    </div>
  </DashboardLayout>
</template>
