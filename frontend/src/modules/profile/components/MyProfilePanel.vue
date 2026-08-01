<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useHead } from '@unhead/vue'
import { useI18n } from 'vue-i18n'
import { User as UserIcon } from 'lucide-vue-next'
import FormField from '@/components/ui/FormField.vue'
import SubmitButton from '@/components/ui/SubmitButton.vue'
import SectionTitleBanner from '@/components/dashboard/SectionTitleBanner.vue'
import ChangePasswordModal from './ChangePasswordModal.vue'
import {
  getMyProfile,
  updateMyProfile,
  updateMyAvatar,
  updateMyFirma,
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
const fotoBase64 = ref<string | null>(null)
const firmaBase64 = ref<string | null>(null)

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
    fotoBase64.value = profile.fotoBase64
    firmaBase64.value = profile.firmaBase64
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
    await updateMyProfile({ nombre: nombre.value, cargo: cargo.value, telefono: telefono.value })
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

// --- Foto de perfil -------------------------------------------------
const AVATAR_TYPES = ['image/png', 'image/jpeg']
const AVATAR_MAX_BYTES = 500 * 1024
const avatarInput = ref<HTMLInputElement | null>(null)
const avatarUploading = ref(false)
const avatarError = ref('')

function onAvatarFileChange(event: Event) {
  avatarError.value = ''
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (!AVATAR_TYPES.includes(file.type)) {
    avatarError.value = t('myProfile.avatar.typeError')
    input.value = ''
    return
  }
  if (file.size > AVATAR_MAX_BYTES) {
    avatarError.value = t('myProfile.avatar.sizeError')
    input.value = ''
    return
  }

  const reader = new FileReader()
  reader.onload = async () => {
    const dataUri = reader.result as string
    avatarUploading.value = true
    try {
      const updated = await updateMyAvatar(dataUri)
      fotoBase64.value = updated.fotoBase64
    } catch {
      avatarError.value = t('myProfile.avatar.uploadError')
    } finally {
      avatarUploading.value = false
      if (avatarInput.value) avatarInput.value.value = ''
    }
  }
  reader.readAsDataURL(file)
}

// --- Firma para reportes -------------------------------------------------
const FIRMA_TYPES = ['image/png', 'image/jpeg']
const FIRMA_MAX_BYTES = 500 * 1024
const firmaInput = ref<HTMLInputElement | null>(null)
const firmaUploading = ref(false)
const firmaError = ref('')

function onFirmaFileChange(event: Event) {
  firmaError.value = ''
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (!FIRMA_TYPES.includes(file.type)) {
    firmaError.value = t('myProfile.firma.typeError')
    input.value = ''
    return
  }
  if (file.size > FIRMA_MAX_BYTES) {
    firmaError.value = t('myProfile.firma.sizeError')
    input.value = ''
    return
  }

  const reader = new FileReader()
  reader.onload = async () => {
    const dataUri = reader.result as string
    firmaUploading.value = true
    try {
      const updated = await updateMyFirma(dataUri)
      firmaBase64.value = updated.firmaBase64
    } catch {
      firmaError.value = t('myProfile.firma.uploadError')
    } finally {
      firmaUploading.value = false
      if (firmaInput.value) firmaInput.value.value = ''
    }
  }
  reader.readAsDataURL(file)
}

// --- Cambiar contraseña (modal) -------------------------------------------------
const showPasswordModal = ref(false)
</script>

<template>
  <div class="grid max-w-3xl gap-6">
    <SectionTitleBanner :title="t('myProfile.sidebarLink')" />

    <p v-if="loadStatus === 'loading'" class="text-sm text-navy-700">{{ t('myProfile.loading') }}</p>
    <p
      v-else-if="loadStatus === 'error'"
      class="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      {{ t('myProfile.loadError') }}
    </p>

    <template v-else>
      <!-- Cabecera: foto, nombre, y acceso a cambiar contraseña -->
      <div
        class="flex flex-col items-center gap-4 rounded-md border border-line-strong bg-white p-6 sm:flex-row sm:items-center sm:p-8"
      >
        <div class="relative shrink-0">
          <div class="h-24 w-24 overflow-hidden rounded-full border border-line-strong bg-cream">
            <img
              v-if="fotoBase64"
              :src="fotoBase64"
              :alt="t('myProfile.avatar.alt')"
              class="h-full w-full object-cover"
            />
            <div v-else class="flex h-full w-full items-center justify-center text-navy-700/40">
              <UserIcon class="h-10 w-10" />
            </div>
          </div>
          <input
            ref="avatarInput"
            type="file"
            accept="image/png,image/jpeg"
            class="hidden"
            @change="onAvatarFileChange"
          />
          <button
            type="button"
            class="absolute -bottom-1 -right-1 rounded-full border border-line-strong bg-white px-2 py-1 text-[10px] font-semibold text-navy-700 shadow-sm hover:bg-cream disabled:opacity-50"
            :disabled="avatarUploading"
            @click="avatarInput?.click()"
          >
            {{ avatarUploading ? '…' : t('myProfile.avatar.changeLabel') }}
          </button>
        </div>

        <div class="min-w-0 flex-1 text-center sm:text-left">
          <h1 class="truncate text-lg font-bold text-navy-900">{{ nombre }}</h1>
          <p class="truncate text-sm text-navy-700/70">{{ email }}</p>
          <p v-if="avatarError" class="mt-1 text-xs text-red-600">{{ avatarError }}</p>
          <p v-else class="mt-1 text-xs text-navy-700/50">{{ t('myProfile.avatar.hint') }}</p>
        </div>

        <button
          type="button"
          class="w-full shrink-0 rounded-sm border border-line-strong px-4 py-2.5 text-sm font-semibold text-navy-700 hover:bg-cream sm:w-auto"
          @click="showPasswordModal = true"
        >
          {{ t('myProfile.changePasswordButton') }}
        </button>
      </div>

      <!-- Datos personales -->
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

          <div class="grid gap-5 sm:grid-cols-2">
            <FormField
              id="my-profile-nombre"
              v-model="nombre"
              :label="t('myProfile.fields.nombre')"
              :error="profileErrors.nombre"
            />
            <div>
              <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy-700">{{
                t('myProfile.fields.email')
              }}</label>
              <input
                :value="email"
                disabled
                class="w-full cursor-not-allowed rounded-sm border border-line-strong bg-cream px-4 py-3 text-sm text-navy-700/70"
              />
              <p class="mt-1.5 text-xs text-navy-700/60">{{ t('myProfile.emailHint') }}</p>
            </div>
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
          </div>

          <p
            v-if="profileStatus === 'success'"
            class="rounded-sm border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
          >
            {{ t('myProfile.profileSaved') }}
          </p>
          <p
            v-if="profileStatus === 'error'"
            class="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {{ profileErrorMessage }}
          </p>

          <SubmitButton :loading="profileStatus === 'loading'">
            {{ t('myProfile.saveProfile') }}
          </SubmitButton>
        </form>
      </div>

      <!-- Firma para reportes -->
      <div class="rounded-md border border-line-strong bg-white p-6 sm:p-8">
        <h2 class="text-base font-bold text-navy-900">{{ t('myProfile.firma.title') }}</h2>
        <p class="mt-1 text-sm text-navy-700/70">{{ t('myProfile.firma.subtitle') }}</p>

        <div class="mt-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <div
            class="flex h-20 w-40 shrink-0 items-center justify-center rounded-sm border border-dashed border-line-strong bg-cream"
          >
            <img
              v-if="firmaBase64"
              :src="firmaBase64"
              :alt="t('myProfile.firma.alt')"
              class="h-full w-full object-contain p-2"
            />
            <span v-else class="px-2 text-center text-xs text-navy-700/40">{{ t('myProfile.firma.empty') }}</span>
          </div>

          <div>
            <input
              ref="firmaInput"
              type="file"
              accept="image/png,image/jpeg"
              class="hidden"
              @change="onFirmaFileChange"
            />
            <button
              type="button"
              class="rounded-sm border border-line-strong px-4 py-2 text-sm font-semibold text-navy-700 hover:bg-cream disabled:opacity-50"
              :disabled="firmaUploading"
              @click="firmaInput?.click()"
            >
              {{ firmaUploading ? '…' : t('myProfile.firma.changeLabel') }}
            </button>
            <p v-if="firmaError" class="mt-1.5 text-xs text-red-600">{{ firmaError }}</p>
            <p v-else class="mt-1.5 text-xs text-navy-700/50">{{ t('myProfile.firma.hint') }}</p>
          </div>
        </div>
      </div>
    </template>

    <ChangePasswordModal v-if="showPasswordModal" @close="showPasswordModal = false" />
  </div>
</template>
