<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const logoBase64 = defineModel<string>('logoBase64', { required: true })
const primaryColor = defineModel<string>('primaryColor', { required: true })
const secondaryColor = defineModel<string>('secondaryColor', { required: true })

const { t } = useI18n()

const fileError = ref('')

// SVG (escala sin pixelarse) + PNG/JPG como respaldo — el SVG-only exigía
// que un cliente con logo raster (ej. con degradados/fotografía) lo pasara
// por un conversor automático antes de subirlo, y esos conversores suelen
// dejar paths sin `fill` (negro por defecto del spec SVG) — se veía oscuro
// en vez de a color (2026-08, feedback de cliente).
const ALLOWED_TYPES = ['image/svg+xml', 'image/png', 'image/jpeg']
const MAX_BYTES = 500 * 1024

const logoInput = ref<HTMLInputElement | null>(null)
const logoFilename = ref('')

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

  logoFilename.value = file.name

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
        ref="logoInput"
        type="file"
        accept="image/svg+xml,image/png,image/jpeg"
        class="hidden"
        @change="handleFileChange"
      />
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="rounded-sm border border-line-strong bg-white px-4 py-2.5 text-sm font-semibold text-navy-700 hover:bg-cream"
          @click="logoInput?.click()"
        >
          {{ t('branding.fields.logoChooseButton') }}
        </button>
        <span class="truncate text-sm text-navy-700/70">{{
          logoFilename || t('branding.fields.logoNoFile')
        }}</span>
      </div>
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
        <label
          for="branding-secondary"
          class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy-700"
        >
          {{ t('branding.fields.secondaryColorLabel') }}
        </label>
        <input
          id="branding-secondary"
          v-model="secondaryColor"
          type="color"
          class="h-11 w-full rounded-sm border border-line-strong bg-white p-1"
        />
        <p class="mt-1 text-xs text-navy-700/60">{{ t('branding.fields.secondaryColorHint') }}</p>
      </div>
    </div>

    <div class="grid gap-3 sm:grid-cols-2">
      <div>
        <p class="mb-1.5 text-xs font-semibold uppercase tracking-wide text-navy-700">
          {{ t('branding.fields.previewLabel') }}
        </p>
        <div
          class="flex items-center gap-3 rounded-md border border-line-strong px-4 py-3"
          :style="{ backgroundColor: primaryColor }"
        >
          <img v-if="logoBase64" :src="logoBase64" alt="" class="h-6 w-auto" />
          <span class="text-sm font-semibold text-cream">{{ t('branding.fields.previewText') }}</span>
        </div>
      </div>
      <div>
        <p class="mb-1.5 text-xs font-semibold uppercase tracking-wide text-navy-700">
          {{ t('branding.fields.previewModalLabel') }}
        </p>
        <div class="overflow-hidden rounded-md border border-line-strong">
          <div class="h-1.5" :style="{ backgroundColor: secondaryColor }" />
          <div class="bg-white px-4 py-3 text-sm text-navy-700/60">{{ t('branding.fields.previewModalText') }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
