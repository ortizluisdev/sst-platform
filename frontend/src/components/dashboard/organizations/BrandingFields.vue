<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const logoBase64 = defineModel<string>('logoBase64', { required: true })
const primaryColor = defineModel<string>('primaryColor', { required: true })
const secondaryColor = defineModel<string>('secondaryColor', { required: true })

const { t } = useI18n()

const fileError = ref('')

const ALLOWED_TYPES = ['image/png', 'image/svg+xml']
const MAX_BYTES = 500 * 1024

function handleFileChange(event: Event) {
  fileError.value = ''
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (!ALLOWED_TYPES.includes(file.type)) {
    fileError.value = t('branding.fields.logoTypeError')
    input.value = ''
    return
  }
  if (file.size > MAX_BYTES) {
    fileError.value = t('branding.fields.logoSizeError')
    input.value = ''
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    logoBase64.value = reader.result as string
  }
  reader.readAsDataURL(file)
}
</script>

<template>
  <div class="grid gap-4">
    <div>
      <label for="branding-logo" class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy-700">
        {{ t('branding.fields.logoLabel') }}
      </label>
      <input
        id="branding-logo"
        type="file"
        accept="image/png,image/svg+xml"
        class="w-full rounded-sm border border-line-strong bg-white px-4 py-3 text-sm text-navy-900"
        @change="handleFileChange"
      />
      <p class="mt-1 text-xs text-navy-700/60">{{ t('branding.fields.logoHint') }}</p>
      <p v-if="fileError" class="mt-1.5 text-xs text-red-600">{{ fileError }}</p>
      <img v-if="logoBase64" :src="logoBase64" :alt="t('branding.fields.logoPreviewAlt')" class="mt-3 h-10 w-auto" />
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div>
        <label for="branding-primary" class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy-700">
          {{ t('branding.fields.primaryColorLabel') }}
        </label>
        <input
          id="branding-primary"
          v-model="primaryColor"
          type="color"
          class="h-11 w-full rounded-sm border border-line-strong bg-white p-1"
        />
      </div>
      <div>
        <label for="branding-secondary" class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy-700">
          {{ t('branding.fields.secondaryColorLabel') }}
        </label>
        <input
          id="branding-secondary"
          v-model="secondaryColor"
          type="color"
          class="h-11 w-full rounded-sm border border-line-strong bg-white p-1"
        />
      </div>
    </div>

    <div>
      <p class="mb-1.5 text-xs font-semibold uppercase tracking-wide text-navy-700">{{ t('branding.fields.previewLabel') }}</p>
      <div class="flex items-center gap-3 rounded-md border border-line-strong px-4 py-3" :style="{ backgroundColor: primaryColor }">
        <img v-if="logoBase64" :src="logoBase64" alt="" class="h-6 w-auto" />
        <span class="text-sm font-semibold" :style="{ color: secondaryColor }">{{ t('branding.fields.previewText') }}</span>
      </div>
    </div>
  </div>
</template>
