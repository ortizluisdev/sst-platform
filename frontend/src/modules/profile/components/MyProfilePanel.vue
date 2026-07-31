<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useHead } from '@unhead/vue'
import { useI18n } from 'vue-i18n'
import FormField from '@/components/ui/FormField.vue'
import SubmitButton from '@/components/ui/SubmitButton.vue'
import {
  getMyProfile,
  updateMyProfile,
  changeMyPassword,
  MyProfileValidationError,
  MyProfileRequestError,
} from '@/services/myProfile.service'

const { t } = useI18n()

useHead(() => ({ title: `${t('myProfile.sidebarLink')} — RoMa+`, meta: [{ name: 'robots', content: 'noindex' }] }))

// --- Datos personales -------------------------------------------------
const loadStatus = ref<'loading' | 'ready' | 'error'>('loading')
const documentNumber = ref('')
const nombre = ref('')
const email = ref('')
const cargo = ref('')
const telefono = ref('')

const profileErrors = ref<Record<string, string>>({})
const profileStatus = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
const profileErrorMessage = ref('')

onMounted(async () => {
  try {
    const profile = await getMyProfile()
    documentNumber.value = profile.documentNumber
    nombre.value = profile.nombre
    email.value = profile.email
    cargo.value = profile.cargo ?? ''
    telefono.value = profile.telefono ?? ''
    loadStatus.value = 'ready'
  } catch {
    loadStatus.value = 'error'
  }
})

async function submitProfile() {
  profileErrors.value = {}
  profileStatus.value = 'loading'
  profileErrorMessage.value = ''
  try {
    await updateMyProfile({ nombre: nombre.value, email: email.value, cargo: cargo.value, telefono: telefono.value })
    profileStatus.value = 'success'
  } catch (err) {
    profileStatus.value = 'error'
    if (err instanceof MyProfileValidationError) {
      profileErrors.value = err.fieldErrors
      profileErrorMessage.value = Object.values(err.fieldErrors)[0] ?? t('myProfile.genericError')
    } else if (err instanceof MyProfileRequestError) {
      profileErrorMessage.value = err.message
    } else {
      profileErrorMessage.value = t('myProfile.genericError')
    }
  }
}

// --- Cambiar contraseña -------------------------------------------------
const currentPassword = ref('')
const newPassword = ref('')
const confirmNewPassword = ref('')

const passwordErrors = ref<Record<string, string>>({})
const passwordStatus = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
const passwordErrorMessage = ref('')

async function submitPassword() {
  passwordErrors.value = {}
  passwordErrorMessage.value = ''

  if (newPassword.value !== confirmNewPassword.value) {
    passwordErrorMessage.value = t('myProfile.passwordMismatch')
    return
  }

  passwordStatus.value = 'loading'
  try {
    await changeMyPassword({ currentPassword: currentPassword.value, newPassword: newPassword.value })
    passwordStatus.value = 'success'
    currentPassword.value = ''
    newPassword.value = ''
    confirmNewPassword.value = ''
  } catch (err) {
    passwordStatus.value = 'error'
    if (err instanceof MyProfileValidationError) {
      passwordErrors.value = err.fieldErrors
      passwordErrorMessage.value = Object.values(err.fieldErrors)[0] ?? t('myProfile.genericError')
    } else if (err instanceof MyProfileRequestError) {
      passwordErrorMessage.value = err.message
    } else {
      passwordErrorMessage.value = t('myProfile.genericError')
    }
  }
}
</script>

<template>
  <div class="mx-auto grid max-w-2xl gap-6">
    <h1 class="text-lg font-bold text-navy-900">{{ t('myProfile.sidebarLink') }}</h1>

    <p v-if="loadStatus === 'loading'" class="text-sm text-navy-700">{{ t('myProfile.loading') }}</p>
    <p v-else-if="loadStatus === 'error'" class="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {{ t('myProfile.loadError') }}
    </p>

    <template v-else>
      <div class="rounded-md border border-line-strong bg-white p-6 sm:p-8">
        <h2 class="text-base font-bold text-navy-900">{{ t('myProfile.personalDataTitle') }}</h2>
        <p class="mt-1 text-sm text-navy-700/70">{{ t('myProfile.personalDataSubtitle') }}</p>

        <form class="mt-6 grid gap-5" novalidate @submit.prevent="submitProfile">
          <div>
            <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy-700">{{
              t('myProfile.fields.documentNumber')
            }}</label>
            <input
              :value="documentNumber"
              disabled
              class="w-full cursor-not-allowed rounded-sm border border-line-strong bg-cream px-4 py-3 text-sm text-navy-700/70"
            />
            <p class="mt-1.5 text-xs text-navy-700/60">{{ t('myProfile.documentNumberHint') }}</p>
          </div>

          <FormField
            id="my-profile-nombre"
            v-model="nombre"
            :label="t('myProfile.fields.nombre')"
            :error="profileErrors.nombre"
          />
          <FormField
            id="my-profile-email"
            v-model="email"
            type="email"
            :label="t('myProfile.fields.email')"
            :error="profileErrors.email"
          />
          <FormField
            id="my-profile-cargo"
            v-model="cargo"
            :label="t('myProfile.fields.cargo')"
            :error="profileErrors.cargo"
          />
          <FormField
            id="my-profile-telefono"
            v-model="telefono"
            :label="t('myProfile.fields.telefono')"
            :error="profileErrors.telefono"
          />

          <p v-if="profileStatus === 'success'" class="rounded-sm border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {{ t('myProfile.profileSaved') }}
          </p>
          <p v-if="profileStatus === 'error'" class="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {{ profileErrorMessage }}
          </p>

          <SubmitButton :loading="profileStatus === 'loading'">
            {{ t('myProfile.saveProfile') }}
          </SubmitButton>
        </form>
      </div>

      <div class="rounded-md border border-line-strong bg-white p-6 sm:p-8">
        <h2 class="text-base font-bold text-navy-900">{{ t('myProfile.passwordTitle') }}</h2>
        <p class="mt-1 text-sm text-navy-700/70">{{ t('myProfile.passwordSubtitle') }}</p>

        <form class="mt-6 grid gap-5" novalidate @submit.prevent="submitPassword">
          <FormField
            id="my-profile-current-password"
            v-model="currentPassword"
            type="password"
            autocomplete="current-password"
            :label="t('myProfile.currentPassword')"
            :error="passwordErrors.currentPassword"
          />
          <FormField
            id="my-profile-new-password"
            v-model="newPassword"
            type="password"
            autocomplete="new-password"
            :label="t('myProfile.newPassword')"
            :error="passwordErrors.newPassword"
          />
          <FormField
            id="my-profile-confirm-password"
            v-model="confirmNewPassword"
            type="password"
            autocomplete="new-password"
            :label="t('myProfile.confirmNewPassword')"
          />

          <p v-if="passwordStatus === 'success'" class="rounded-sm border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {{ t('myProfile.passwordChanged') }}
          </p>
          <p v-if="passwordErrorMessage" class="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {{ passwordErrorMessage }}
          </p>

          <SubmitButton :loading="passwordStatus === 'loading'">
            {{ t('myProfile.changePassword') }}
          </SubmitButton>
        </form>
      </div>
    </template>
  </div>
</template>
