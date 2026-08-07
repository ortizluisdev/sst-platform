<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CatalogService } from '@/types/serviceCatalog'
import { useOrgPrimaryTextClass } from '@/composables/useOrgPrimaryContrast'
import Modal from '@/components/ui/Modal.vue'

const props = defineProps<{ service: CatalogService | null }>()
const emit = defineEmits<{
  submit: [values: { nombre: string; descripcion: string }]
  cancel: []
}>()

const { t } = useI18n()
const primaryTextClass = useOrgPrimaryTextClass()

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
  <Modal
    :title="
      props.service
        ? t('dashboard.servicesManagement.modal.editTitle')
        : t('dashboard.servicesManagement.modal.createTitle')
    "
    @close="emit('cancel')"
  >
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
          <label
            for="service-descripcion"
            class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy-700"
          >
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
            class="rounded-sm bg-[var(--org-primary,#0b1a33)] px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--org-primary,#0b1a33)]"
            :class="primaryTextClass.text"
            @click="handleSubmit"
          >
            {{ t('dashboard.servicesManagement.modal.save') }}
          </button>
        </div>
  </Modal>
</template>
