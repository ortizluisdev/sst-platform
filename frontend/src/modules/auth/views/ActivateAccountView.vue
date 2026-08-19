<script setup lang="ts">
import { computed, watch } from 'vue'
import { useHead } from '@unhead/vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import AuthCard from '@/components/ui/AuthCard.vue'
import FormField from '@/components/ui/FormField.vue'
import PasswordRequirementsList from '@/components/ui/PasswordRequirementsList.vue'
import SubmitButton from '@/components/ui/SubmitButton.vue'
import { useActivationForm } from '@/composables/useActivationForm'
import { useToast } from '@/composables/useToast'

const { t, locale } = useI18n()
const route = useRoute()

const tokenFromUrl = computed(() => {
  const raw = route.query.token
  return typeof raw === 'string' ? raw : ''
})

const { status, errorMessage, errors, newPassword, newPasswordAttrs, submit } = useActivationForm(tokenFromUrl.value)

watch(status, (value) => {
  if (value === 'error') useToast().error(errorMessage.value)
})

useHead(() => ({ title: `${t('auth.activation.title')} — RoMa`, meta: [{ name: 'robots', content: 'noindex' }] }))
</script>

<template>
  <AuthCard :title="t('auth.activation.title')" :subtitle="t('auth.activation.subtitle')">
    <!-- Enlace sin token (URL manipulada o incompleta) — nada que enviar. -->
    <template v-if="!tokenFromUrl">
      <p class="text-center text-sm leading-relaxed text-navy-700">{{ t('auth.activation.missingToken') }}</p>
    </template>

    <template v-else-if="status === 'success'">
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
        <p class="text-sm leading-relaxed text-navy-700">{{ t('auth.activation.successBody') }}</p>
        <router-link :to="`/${locale}/ingresar`" class="text-sm font-semibold text-sky-500 underline underline-offset-4">
          {{ t('auth.activation.goToLogin') }}
        </router-link>
      </div>
    </template>

    <form v-else class="grid gap-5" novalidate @submit.prevent="submit">
      <FormField
        id="newPassword"
        v-model="newPassword"
        v-bind="newPasswordAttrs"
        type="password"
        :label="t('auth.activation.newPassword')"
        :placeholder="t('auth.form.passwordHint')"
        autocomplete="new-password"
        :error="errors.newPassword"
      />
      <PasswordRequirementsList :password="newPassword ?? ''" />

      <SubmitButton :loading="status === 'loading'" :loading-label="t('auth.form.submitting')">
        {{ t('auth.activation.submit') }}
      </SubmitButton>
    </form>
  </AuthCard>
</template>
