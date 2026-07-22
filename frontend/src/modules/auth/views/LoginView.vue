<script setup lang="ts">
import { watch } from 'vue'
import { useRouter } from 'vue-router'
import { useHead } from '@unhead/vue'
import { useI18n } from 'vue-i18n'
import AuthCard from '@/components/ui/AuthCard.vue'
import FormField from '@/components/ui/FormField.vue'
import SubmitButton from '@/components/ui/SubmitButton.vue'
import { useLoginForm } from '@/composables/useLoginForm'
import { useAuthStore } from '@/stores/auth'

const { t, locale } = useI18n()
const router = useRouter()
const auth = useAuthStore()
const { status, errorMessage, user, errors, email, emailAttrs, password, passwordAttrs, submit } = useLoginForm()

// noindex: página funcional, no de contenido — no debe competir en buscadores.
useHead(() => ({ title: `${t('auth.login.title')} — RoMa`, meta: [{ name: 'robots', content: 'noindex' }] }))

// Tras login exitoso, la cookie de sesión ya está puesta — /auth/me revela
// los permisos reales para decidir a qué dashboard enviar al usuario.
watch(status, async (value) => {
  if (value !== 'success') return
  await auth.fetchMe()
  if (auth.hasPermission('platform.variables.upload')) {
    router.push(`/${locale.value}/admin/higiene-industrial`)
  } else if (auth.hasPermission('dashboard.higiene-industrial.view')) {
    router.push(`/${locale.value}/dashboard/higiene-industrial`)
  }
})
</script>

<template>
  <AuthCard :title="t('auth.login.title')" :subtitle="t('auth.login.subtitle')">
    <template v-if="status === 'success' && user">
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
        <p class="text-sm leading-relaxed text-navy-700">
          {{ t('auth.login.successGreeting', { nombre: user.nombre }) }}
        </p>
        <p class="text-xs leading-relaxed text-navy-700 opacity-75">{{ t('auth.login.successPending') }}</p>
      </div>
    </template>

    <form v-else class="grid gap-5" novalidate @submit.prevent="submit">
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
        :placeholder="t('auth.form.passwordPlaceholder')"
        autocomplete="current-password"
        :error="errors.password"
      />

      <router-link
        :to="`/${locale}/recuperar-contrasena`"
        class="-mt-2 text-right text-xs font-medium text-sky-500 underline underline-offset-2"
      >
        {{ t('auth.login.forgotPassword') }}
      </router-link>

      <p v-if="status === 'error'" class="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {{ errorMessage }}
      </p>

      <SubmitButton :loading="status === 'loading'" :loading-label="t('auth.form.submitting')">
        {{ t('auth.login.submit') }}
      </SubmitButton>
    </form>

    <template #footer>
      {{ t('auth.login.noAccount') }}
      <router-link :to="`/${locale}/registro`" class="font-semibold text-sky-500 underline underline-offset-2">
        {{ t('auth.login.registerLink') }}
      </router-link>
    </template>
  </AuthCard>
</template>
