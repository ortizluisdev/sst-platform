<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { useI18n } from 'vue-i18n'
import AuthCard from '@/components/ui/AuthCard.vue'
import FormField from '@/components/ui/FormField.vue'
import SubmitButton from '@/components/ui/SubmitButton.vue'
import { useRegisterForm } from '@/composables/useRegisterForm'

const { t, locale } = useI18n()
const {
  status,
  errorMessage,
  successMessage,
  errors,
  nombre,
  nombreAttrs,
  email,
  emailAttrs,
  organizationName,
  organizationNameAttrs,
  password,
  passwordAttrs,
  submit,
} = useRegisterForm()

useHead(() => ({ title: `${t('auth.register.title')} — RoMa`, meta: [{ name: 'robots', content: 'noindex' }] }))
</script>

<template>
  <AuthCard :title="t('auth.register.title')" :subtitle="t('auth.register.subtitle')">
    <template v-if="status === 'success'">
      <div class="flex flex-col items-center gap-3 text-center">
        <svg class="h-10 w-10 text-sky-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" />
          <path
            d="M8 12.5l2.5 2.5L16 9.5"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <p class="text-sm leading-relaxed text-navy-700">{{ successMessage }}</p>
        <router-link :to="`/${locale}/ingresar`" class="text-sm font-semibold text-sky-500 underline underline-offset-4">
          {{ t('auth.register.backToLogin') }}
        </router-link>
      </div>
    </template>

    <form v-else class="grid gap-5" novalidate @submit.prevent="submit">
      <FormField
        id="nombre"
        v-model="nombre"
        v-bind="nombreAttrs"
        :label="t('auth.form.nombre')"
        :placeholder="t('auth.form.nombrePlaceholder')"
        autocomplete="name"
        :error="errors.nombre"
      />
      <FormField
        id="organizationName"
        v-model="organizationName"
        v-bind="organizationNameAttrs"
        :label="t('auth.form.organizationName')"
        :placeholder="t('auth.form.organizationNamePlaceholder')"
        autocomplete="organization"
        :error="errors.organizationName"
      />
      <FormField
        id="email"
        v-model="email"
        v-bind="emailAttrs"
        type="email"
        :label="t('auth.form.email')"
        :placeholder="t('auth.form.emailPlaceholder')"
        autocomplete="email"
        :error="errors.email"
      />
      <FormField
        id="password"
        v-model="password"
        v-bind="passwordAttrs"
        type="password"
        :label="t('auth.form.password')"
        :placeholder="t('auth.form.passwordHint')"
        autocomplete="new-password"
        :error="errors.password"
      />

      <p v-if="status === 'error'" class="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {{ errorMessage }}
      </p>

      <SubmitButton :loading="status === 'loading'" :loading-label="t('auth.form.submitting')">
        {{ t('auth.register.submit') }}
      </SubmitButton>
    </form>

    <template #footer>
      {{ t('auth.register.haveAccount') }}
      <router-link :to="`/${locale}/ingresar`" class="font-semibold text-sky-500 underline underline-offset-2">
        {{ t('auth.register.loginLink') }}
      </router-link>
    </template>
  </AuthCard>
</template>
