<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { X } from 'lucide-vue-next'
import FormField from '@/components/ui/FormField.vue'
import SubmitButton from '@/components/ui/SubmitButton.vue'
import ModalAccentStrip from '@/components/ui/ModalAccentStrip.vue'
import { changeMyPassword, MyProfileValidationError, MyProfileRequestError } from '@/services/myProfile.service'

const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()

const currentPassword = ref('')
const newPassword = ref('')
const confirmNewPassword = ref('')

const errors = ref<Record<string, string>>({})
const status = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
const errorMessage = ref('')

async function submit() {
  errors.value = {}
  errorMessage.value = ''

  if (newPassword.value !== confirmNewPassword.value) {
    errorMessage.value = t('myProfile.passwordMismatch')
    return
  }

  status.value = 'loading'
  try {
    await changeMyPassword({ currentPassword: currentPassword.value, newPassword: newPassword.value })
    status.value = 'success'
    currentPassword.value = ''
    newPassword.value = ''
    confirmNewPassword.value = ''
  } catch (err) {
    status.value = 'error'
    if (err instanceof MyProfileValidationError) {
      errors.value = err.fieldErrors
      errorMessage.value = Object.values(err.fieldErrors)[0] ?? t('myProfile.genericError')
    } else if (err instanceof MyProfileRequestError) {
      errorMessage.value = err.message
    } else {
      errorMessage.value = t('myProfile.genericError')
    }
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 px-4" @click.self="emit('close')">
    <div class="w-full max-w-md overflow-hidden rounded-md bg-white shadow-xl">
      <ModalAccentStrip />
      <div class="p-5 sm:p-6">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 class="text-base font-bold text-navy-900">{{ t('myProfile.passwordTitle') }}</h2>
            <p class="mt-1 text-sm text-navy-700/70">{{ t('myProfile.passwordSubtitle') }}</p>
          </div>
          <button
            type="button"
            class="rounded-sm p-1 text-navy-700/60 hover:bg-cream"
            :aria-label="t('myProfile.closeModal')"
            @click="emit('close')"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <form class="mt-5 grid gap-4" novalidate @submit.prevent="submit">
          <FormField
            id="change-password-current"
            v-model="currentPassword"
            type="password"
            autocomplete="current-password"
            :label="t('myProfile.currentPassword')"
            :error="errors.currentPassword"
          />
          <FormField
            id="change-password-new"
            v-model="newPassword"
            type="password"
            autocomplete="new-password"
            :label="t('myProfile.newPassword')"
            :error="errors.newPassword"
          />
          <FormField
            id="change-password-confirm"
            v-model="confirmNewPassword"
            type="password"
            autocomplete="new-password"
            :label="t('myProfile.confirmNewPassword')"
          />

          <p
            v-if="status === 'success'"
            class="rounded-sm border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
          >
            {{ t('myProfile.passwordChanged') }}
          </p>
          <p v-if="errorMessage" class="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {{ errorMessage }}
          </p>

          <SubmitButton :loading="status === 'loading'">{{ t('myProfile.changePassword') }}</SubmitButton>
        </form>
      </div>
    </div>
  </div>
</template>
