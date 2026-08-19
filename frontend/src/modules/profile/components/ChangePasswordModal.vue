<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import FormField from '@/components/ui/FormField.vue'
import PasswordRequirementsList from '@/components/ui/PasswordRequirementsList.vue'
import SubmitButton from '@/components/ui/SubmitButton.vue'
import Modal from '@/components/ui/Modal.vue'
import { useToast } from '@/composables/useToast'
import { changeMyPassword, MyProfileValidationError, MyProfileRequestError } from '@/services/myProfile.service'

const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()

const currentPassword = ref('')
const newPassword = ref('')
const confirmNewPassword = ref('')

const errors = ref<Record<string, string>>({})
const status = ref<'idle' | 'loading' | 'success' | 'error'>('idle')

async function submit() {
  errors.value = {}

  if (newPassword.value !== confirmNewPassword.value) {
    useToast().error(t('myProfile.passwordMismatch'))
    return
  }

  status.value = 'loading'
  try {
    await changeMyPassword({ currentPassword: currentPassword.value, newPassword: newPassword.value })
    status.value = 'success'
    currentPassword.value = ''
    newPassword.value = ''
    confirmNewPassword.value = ''
    useToast().success(t('myProfile.passwordChanged'))
  } catch (err) {
    status.value = 'error'
    if (err instanceof MyProfileValidationError) {
      errors.value = err.fieldErrors
      useToast().error(Object.values(err.fieldErrors)[0] ?? t('myProfile.genericError'))
    } else if (err instanceof MyProfileRequestError) {
      useToast().error(err.message)
    } else {
      useToast().error(t('myProfile.genericError'))
    }
  }
}
</script>

<template>
  <Modal title="" @close="emit('close')">
    <template #header>
      <div>
        <h2 class="text-base font-bold text-navy-900">{{ t('myProfile.passwordTitle') }}</h2>
        <p class="mt-1 text-sm text-navy-700/70">{{ t('myProfile.passwordSubtitle') }}</p>
      </div>
    </template>

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
      <PasswordRequirementsList :password="newPassword" />
      <FormField
        id="change-password-confirm"
        v-model="confirmNewPassword"
        type="password"
        autocomplete="new-password"
        :label="t('myProfile.confirmNewPassword')"
      />

      <SubmitButton :loading="status === 'loading'">{{ t('myProfile.changePassword') }}</SubmitButton>
    </form>
  </Modal>
</template>
