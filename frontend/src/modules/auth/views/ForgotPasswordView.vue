<script setup lang="ts">
import { watch } from 'vue'
import { useHead } from '@unhead/vue'
import { useI18n } from 'vue-i18n'
import AuthCard from '@/components/ui/AuthCard.vue'
import FormField from '@/components/ui/FormField.vue'
import SubmitButton from '@/components/ui/SubmitButton.vue'
import { useForgotPasswordForm } from '@/composables/useForgotPasswordForm'
import { useToast } from '@/composables/useToast'

const { t, locale } = useI18n()
const { status, errorMessage, errors, documentNumber, documentNumberAttrs, submit } = useForgotPasswordForm()

watch(status, (value) => {
  if (value === 'error') useToast().error(errorMessage.value)
})

useHead(() => ({ title: `${t('auth.forgotPassword.title')} — RoMa`, meta: [{ name: 'robots', content: 'noindex' }] }))
</script>

<template>
  <AuthCard :title="t('auth.forgotPassword.title')" :subtitle="t('auth.forgotPassword.subtitle')">
    <template v-if="status === 'success'">
      <div class="flex flex-col items-center gap-3 text-center">
        <svg class="h-10 w-10 text-sky-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M4 6l8 6 8-6M4 6h16v12H4V6z"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <p class="text-sm leading-relaxed text-navy-700">{{ t('auth.forgotPassword.successBody') }}</p>
      </div>
    </template>

    <form v-else class="grid gap-5" novalidate @submit.prevent="submit">
      <FormField
        id="documentNumber"
        v-model="documentNumber"
        v-bind="documentNumberAttrs"
        type="text"
        inputmode="numeric"
        :label="t('auth.form.documentNumber')"
        :placeholder="t('auth.form.documentNumberPlaceholder')"
        autocomplete="username"
        :error="errors.documentNumber"
      />

      <SubmitButton :loading="status === 'loading'" :loading-label="t('auth.form.submitting')">
        {{ t('auth.forgotPassword.submit') }}
      </SubmitButton>
    </form>

    <template #footer>
      <router-link :to="`/${locale}/ingresar`" class="font-semibold text-sky-500 underline underline-offset-2">
        {{ t('auth.forgotPassword.backToLogin') }}
      </router-link>
    </template>
  </AuthCard>
</template>
