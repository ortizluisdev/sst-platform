<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import SectionTitleBanner from '@/components/dashboard/SectionTitleBanner.vue'
import SubmitButton from '@/components/ui/SubmitButton.vue'
import BrandingFields from '@/components/dashboard/organizations/BrandingFields.vue'
import {
  listNotificationPreferences,
  updateNotificationPreference,
  NotificationPreferencesRequestError,
  type NotificationPreferenceItem,
} from '@/services/notificationPreferences.service'
import {
  getBranding,
  updateBranding,
  BrandingValidationError,
  BrandingRequestError,
} from '@/services/organizationBranding.service'
import { NOTIFICATION_TYPE_LABEL_KEY } from '@/utils/notificationSeverityStyles'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const auth = useAuthStore()

// --- Preferencias de notificaciones ---------------------------------------
const prefsStatus = ref<'loading' | 'ready' | 'error'>('loading')
const prefsErrorMessage = ref('')
const preferences = ref<NotificationPreferenceItem[]>([])
const togglingKey = ref<string | null>(null)

async function loadPreferences() {
  prefsStatus.value = 'loading'
  try {
    preferences.value = await listNotificationPreferences()
    prefsStatus.value = 'ready'
  } catch (err) {
    prefsStatus.value = 'error'
    prefsErrorMessage.value =
      err instanceof NotificationPreferencesRequestError ? err.message : t('settings.notifications.loadError')
  }
}

async function toggle(item: NotificationPreferenceItem, field: 'inAppEnabled' | 'emailEnabled') {
  const key = `${item.type}-${field}`
  togglingKey.value = key
  prefsErrorMessage.value = ''
  const previous = item[field]
  const next = !previous
  item[field] = next
  // Desactivar el canal "en la app" implícitamente también apaga el de
  // correo (no tiene sentido recibir por correo algo que no llega a la
  // bandeja) — mismo criterio que el backend aplicaría al no crear la fila.
  if (field === 'inAppEnabled' && !next) item.emailEnabled = false
  try {
    await updateNotificationPreference(item.type, {
      inAppEnabled: item.inAppEnabled,
      emailEnabled: item.emailEnabled,
    })
  } catch (err) {
    item[field] = previous
    if (field === 'inAppEnabled' && !next) item.emailEnabled = true
    prefsErrorMessage.value =
      err instanceof NotificationPreferencesRequestError ? err.message : t('settings.notifications.actionError')
  } finally {
    togglingKey.value = null
  }
}

// --- Marca de la empresa (solo usuarios con organización) -----------------
const isOrgUser = !!auth.organizationId
const brandingStatus = ref<'loading' | 'ready' | 'error'>('loading')
const brandingErrorMessage = ref('')
const brandingSuccess = ref(false)
const brandingSaving = ref(false)
const logoBase64 = ref('')
const primaryColor = ref('#0b1a33')
const secondaryColor = ref('#5b8dc7')

async function loadBranding() {
  if (!isOrgUser) return
  brandingStatus.value = 'loading'
  try {
    const current = await getBranding()
    logoBase64.value = current.logoBase64 ?? ''
    primaryColor.value = current.primaryColor ?? '#0b1a33'
    secondaryColor.value = current.secondaryColor ?? '#5b8dc7'
    brandingStatus.value = 'ready'
  } catch (err) {
    brandingStatus.value = 'error'
    brandingErrorMessage.value = err instanceof BrandingRequestError ? err.message : t('settings.branding.loadError')
  }
}

async function submitBranding() {
  brandingSuccess.value = false
  brandingErrorMessage.value = ''
  if (!logoBase64.value) {
    brandingErrorMessage.value = t('branding.activation.logoRequired')
    return
  }
  brandingSaving.value = true
  try {
    await updateBranding({
      logoBase64: logoBase64.value,
      primaryColor: primaryColor.value,
      secondaryColor: secondaryColor.value,
    })
    auth.setBranding({ primaryColor: primaryColor.value, secondaryColor: secondaryColor.value })
    brandingSuccess.value = true
  } catch (err) {
    if (err instanceof BrandingValidationError) {
      brandingErrorMessage.value = Object.values(err.fieldErrors)[0] ?? t('settings.branding.actionError')
    } else if (err instanceof BrandingRequestError) {
      brandingErrorMessage.value = err.message
    } else {
      brandingErrorMessage.value = t('settings.branding.actionError')
    }
  } finally {
    brandingSaving.value = false
  }
}

onMounted(() => {
  loadPreferences()
  loadBranding()
})
</script>

<template>
  <div class="grid gap-6">
    <SectionTitleBanner :title="t('settings.sidebarLink')" />

    <section>
      <h2 class="mb-1 text-base font-bold text-navy-900">{{ t('settings.notifications.title') }}</h2>
      <p class="mb-3 text-xs text-navy-700/60">{{ t('settings.notifications.hint') }}</p>

      <p v-if="prefsStatus === 'loading'" class="text-sm text-navy-700">{{ t('settings.loading') }}</p>
      <p
        v-else-if="prefsStatus === 'error'"
        class="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      >
        {{ prefsErrorMessage }}
      </p>
      <div v-else class="overflow-hidden rounded-lg border border-line-strong bg-white">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="bg-sky-100 text-left text-[11px] uppercase tracking-wide text-navy-700">
              <th class="px-4 py-2.5 font-semibold">{{ t('settings.notifications.colType') }}</th>
              <th class="px-4 py-2.5 text-center font-semibold">{{ t('settings.notifications.colInApp') }}</th>
              <th class="px-4 py-2.5 text-center font-semibold">{{ t('settings.notifications.colEmail') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in preferences" :key="item.type" class="border-t border-line">
              <td class="px-4 py-2.5 text-navy-900">{{ t(NOTIFICATION_TYPE_LABEL_KEY[item.type]) }}</td>
              <td class="px-4 py-2.5 text-center">
                <input
                  type="checkbox"
                  class="h-4 w-4 rounded-sm border-line-strong"
                  :checked="item.inAppEnabled"
                  :disabled="togglingKey === `${item.type}-inAppEnabled`"
                  @change="toggle(item, 'inAppEnabled')"
                />
              </td>
              <td class="px-4 py-2.5 text-center">
                <input
                  type="checkbox"
                  class="h-4 w-4 rounded-sm border-line-strong"
                  :checked="item.emailEnabled"
                  :disabled="!item.inAppEnabled || togglingKey === `${item.type}-emailEnabled`"
                  @change="toggle(item, 'emailEnabled')"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="prefsStatus === 'ready' && prefsErrorMessage" class="mt-2 text-sm text-red-700">
        {{ prefsErrorMessage }}
      </p>
    </section>

    <section v-if="isOrgUser">
      <h2 class="mb-1 text-base font-bold text-navy-900">{{ t('settings.branding.title') }}</h2>
      <p class="mb-3 text-xs text-navy-700/60">{{ t('settings.branding.hint') }}</p>

      <p v-if="brandingStatus === 'loading'" class="text-sm text-navy-700">{{ t('settings.loading') }}</p>
      <form v-else class="grid gap-4" novalidate @submit.prevent="submitBranding">
        <BrandingFields
          v-model:logo-base64="logoBase64"
          v-model:primary-color="primaryColor"
          v-model:secondary-color="secondaryColor"
        />

        <p
          v-if="brandingSuccess"
          class="rounded-sm border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
        >
          {{ t('settings.branding.saved') }}
        </p>
        <p v-if="brandingErrorMessage" class="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {{ brandingErrorMessage }}
        </p>

        <div class="max-w-xs">
          <SubmitButton :loading="brandingSaving" :loading-label="t('settings.branding.saving')">
            {{ t('settings.branding.save') }}
          </SubmitButton>
        </div>
      </form>
    </section>
  </div>
</template>
