<script setup lang="ts">
import { watch } from 'vue'
import { useRouter } from 'vue-router'
import { useHead } from '@unhead/vue'
import { useI18n } from 'vue-i18n'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import FormField from '@/components/ui/FormField.vue'
import SubmitButton from '@/components/ui/SubmitButton.vue'
import { useUpdateProfileForm } from '@/composables/useUpdateProfileForm'
import { useAuthStore } from '@/stores/auth'
import { getDashboardPath } from '@/utils/dashboardRedirect'

const { t, locale } = useI18n()
const router = useRouter()
const auth = useAuthStore()
const { status, errorMessage, errors, cargo, cargoAttrs, telefono, telefonoAttrs, submit } = useUpdateProfileForm()

useHead(() => ({ title: `${t('profile.pageTitle')} — RoMa+`, meta: [{ name: 'robots', content: 'noindex' }] }))

watch(status, async (value) => {
  if (value !== 'success') return
  auth.mustUpdateProfile = false
  router.push(getDashboardPath(auth, locale.value))
})
</script>

<template>
  <DashboardLayout>
    <div class="mx-auto max-w-md">
      <div class="rounded-md border border-line-strong bg-white p-6 sm:p-8">
        <h1 class="text-lg font-bold text-navy-900">{{ t('profile.pageTitle') }}</h1>
        <p class="mt-1 text-sm text-navy-700/70">{{ t('profile.pageSubtitle') }}</p>

        <form class="mt-6 grid gap-5" novalidate @submit.prevent="submit">
          <FormField
            id="profile-cargo"
            v-model="cargo"
            v-bind="cargoAttrs"
            :label="t('profile.cargo')"
            :placeholder="t('profile.cargoPlaceholder')"
            :error="errors.cargo"
          />
          <FormField
            id="profile-telefono"
            v-model="telefono"
            v-bind="telefonoAttrs"
            type="text"
            :label="t('profile.telefono')"
            :placeholder="t('profile.telefonoPlaceholder')"
            :error="errors.telefono"
          />

          <p
            v-if="status === 'error'"
            class="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {{ errorMessage }}
          </p>

          <SubmitButton :loading="status === 'loading'" :loading-label="t('auth.form.submitting')">
            {{ t('profile.submit') }}
          </SubmitButton>
        </form>
      </div>
    </div>
  </DashboardLayout>
</template>
