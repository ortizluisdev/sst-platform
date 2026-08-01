<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useHead } from '@unhead/vue'
import { useI18n } from 'vue-i18n'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import SubmitButton from '@/components/ui/SubmitButton.vue'
import FormField from '@/components/ui/FormField.vue'
import BrandingFields from '@/components/dashboard/organizations/BrandingFields.vue'
import { saveBranding, BrandingValidationError, BrandingRequestError } from '@/services/organizationBranding.service'
import {
  getMyProfile,
  updateMyProfile,
  MyProfileValidationError,
  MyProfileRequestError,
} from '@/services/myProfile.service'
import { useAuthStore } from '@/stores/auth'
import { getDashboardPath } from '@/utils/dashboardRedirect'

const { t, locale } = useI18n()
const router = useRouter()
const auth = useAuthStore()

useHead(() => ({ title: `${t('profile.pageTitle')} — RoMa+`, meta: [{ name: 'robots', content: 'noindex' }] }))

// --- Datos del responsable — precargados desde la cuenta que creó el admin,
// el usuario los confirma o corrige acá mismo (una sola vez, junto al branding). ---
const nombre = ref('')
const cargo = ref('')
const telefono = ref('')
const profileErrors = ref<Record<string, string>>({})

onMounted(async () => {
  try {
    const profile = await getMyProfile()
    nombre.value = profile.nombre
    cargo.value = profile.cargo ?? ''
    telefono.value = profile.telefono ?? ''
  } catch {
    // Si falla la precarga, el usuario igual puede escribir todo desde cero.
  }
})

// Arranca en los colores de RoMa como punto de partida razonable — el
// cliente los personaliza desde ahí, en vez de un negro por defecto.
const logoBase64 = ref('')
const primaryColor = ref('#0b1a33')
const secondaryColor = ref('#5b8dc7')
const touched = ref(false)
const status = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
const errorMessage = ref('')

async function submit() {
  touched.value = true
  profileErrors.value = {}
  if (!logoBase64.value) {
    errorMessage.value = t('branding.activation.logoRequired')
    return
  }

  status.value = 'loading'
  errorMessage.value = ''
  try {
    await updateMyProfile({ nombre: nombre.value, cargo: cargo.value, telefono: telefono.value })
    await saveBranding({
      logoBase64: logoBase64.value,
      primaryColor: primaryColor.value,
      secondaryColor: secondaryColor.value,
    })
    status.value = 'success'
    // Refresca el store desde /auth/me — el guard de rutas solo llama fetchMe()
    // en la carga inicial (isAuthenticated === null), así que sin esto el
    // navbar seguiría mostrando el estado "sin branding" de antes de guardar.
    await auth.fetchMe()
    router.push(getDashboardPath(auth, locale.value))
  } catch (err) {
    status.value = 'error'
    if (err instanceof MyProfileValidationError) {
      profileErrors.value = err.fieldErrors
      errorMessage.value = Object.values(err.fieldErrors)[0] ?? t('branding.activation.genericError')
    } else if (err instanceof MyProfileRequestError) {
      errorMessage.value = err.message
    } else if (err instanceof BrandingValidationError) {
      errorMessage.value = Object.values(err.fieldErrors)[0] ?? t('branding.activation.genericError')
    } else if (err instanceof BrandingRequestError) {
      errorMessage.value = err.message
    } else {
      errorMessage.value = t('branding.activation.genericError')
    }
  }
}
</script>

<template>
  <DashboardLayout>
    <div class="mx-auto max-w-md">
      <div class="rounded-md border border-line-strong bg-white p-6 sm:p-8">
        <h1 class="text-lg font-bold text-navy-900">{{ t('profile.pageTitle') }}</h1>
        <p class="mt-1 text-sm text-navy-700/70">{{ t('profile.pageSubtitle') }}</p>

        <form class="mt-6 grid gap-5" novalidate @submit.prevent="submit">
          <div class="grid gap-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
              {{ t('profile.personalDataTitle') }}
            </p>
            <FormField
              id="onboarding-nombre"
              v-model="nombre"
              :label="t('myProfile.fields.nombre')"
              :error="profileErrors.nombre"
            />
            <div class="grid gap-4 sm:grid-cols-2">
              <FormField
                id="onboarding-cargo"
                v-model="cargo"
                :label="t('myProfile.fields.cargo')"
                :error="profileErrors.cargo"
              />
              <FormField
                id="onboarding-telefono"
                v-model="telefono"
                :label="t('myProfile.fields.telefono')"
                :error="profileErrors.telefono"
              />
            </div>
          </div>

          <div class="grid gap-4 border-t border-line-strong pt-5">
            <p class="text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
              {{ t('profile.brandingSectionTitle') }}
            </p>
            <BrandingFields
              v-model:logo-base64="logoBase64"
              v-model:primary-color="primaryColor"
              v-model:secondary-color="secondaryColor"
            />
          </div>

          <p v-if="touched && !logoBase64 && status !== 'loading'" class="text-xs text-red-600">
            {{ t('branding.activation.logoRequired') }}
          </p>

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
