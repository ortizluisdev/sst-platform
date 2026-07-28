<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { X } from 'lucide-vue-next'
import type { CatalogService } from '@/types/serviceCatalog'

const props = defineProps<{ service: CatalogService | null }>()
const emit = defineEmits<{
  submit: [values: { nombre: string; descripcion: string }]
  cancel: []
}>()

const { t } = useI18n()

const nombre = ref(props.service?.nombre ?? '')
const descripcion = ref(props.service?.descripcion ?? '')
const touched = ref(false)
const MIN_NOMBRE_LENGTH = 2

function handleSubmit() {
  touched.value = true
  if (nombre.value.trim().length < MIN_NOMBRE_LENGTH) return
  emit('submit', { nombre: nombre.value.trim(), descripcion: descripcion.value.trim() })
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 px-4" @click.self="emit('cancel')">
    <div class="w-full max-w-md rounded-md bg-white p-5 shadow-xl">
      <div class="flex items-start justify-between gap-3">
        <h2 class="text-base font-bold text-navy-900">
          {{ props.service ? t('dashboard.servicesManagement.modal.editTitle') : t('dashboard.servicesManagement.modal.createTitle') }}
        </h2>
        <button
          type="button"
          class="rounded-sm p-1 text-navy-700/60 hover:bg-cream"
          :aria-label="t('dashboard.servicesManagement.modal.close')"
          @click="emit('cancel')"
        >
          <X class="h-4 w-4" />
        </button>
      </div>

      <div class="mt-4">
        <label for="service-nombre" class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy-700">
          {{ t('dashboard.servicesManagement.modal.nombreLabel') }}
        </label>
        <input
          id="service-nombre"
          v-model="nombre"
          type="text"
          class="w-full rounded-sm border border-line-strong bg-white px-4 py-2.5 text-sm text-navy-900 outline-none transition-colors focus:border-sky-400"
          :aria-invalid="touched && nombre.trim().length < MIN_NOMBRE_LENGTH"
          aria-describedby="service-nombre-error"
        />
        <p
          v-if="touched && nombre.trim().length < MIN_NOMBRE_LENGTH"
          id="service-nombre-error"
          class="mt-1.5 text-xs text-red-600"
        >
          {{ t('dashboard.servicesManagement.modal.nombreError') }}
        </p>
      </div>

      <div class="mt-4">
        <label for="service-descripcion" class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy-700">
          {{ t('dashboard.servicesManagement.modal.descripcionLabel') }}
        </label>
        <textarea
          id="service-descripcion"
          v-model="descripcion"
          rows="3"
          class="w-full rounded-sm border border-line-strong bg-white px-4 py-2.5 text-sm text-navy-900 outline-none transition-colors focus:border-sky-400"
        />
      </div>

      <p v-if="props.service" class="mt-3 text-xs text-navy-700/60">
        {{ t('dashboard.servicesManagement.modal.slugNotice', { slug: props.service.slug }) }}
      </p>

      <div class="mt-5 flex justify-end gap-2">
        <button
          type="button"
          class="rounded-sm border border-line-strong px-4 py-2 text-sm font-medium text-navy-700 hover:border-navy-900"
          @click="emit('cancel')"
        >
          {{ t('dashboard.servicesManagement.modal.cancel') }}
        </button>
        <button
          type="button"
          class="rounded-sm bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-700"
          @click="handleSubmit"
        >
          {{ t('dashboard.servicesManagement.modal.save') }}
        </button>
      </div>
    </div>
  </div>
</template>
