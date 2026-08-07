<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '@/components/ui/Modal.vue'
import { useToast } from '@/composables/useToast'
import SubmitButton from '@/components/ui/SubmitButton.vue'
import type { NonConformity, NonConformityInput, NonConformityPriority, NonConformityStatus, NonConformityUpdateInput } from '@/types/dashboard'

const props = defineProps<{
  mode: 'create' | 'edit'
  initial?: NonConformity
}>()

const emit = defineEmits<{
  close: []
  submitCreate: [input: NonConformityInput]
  submitEdit: [input: NonConformityUpdateInput]
}>()

const { t } = useI18n()

const descripcion = ref(props.initial?.descripcion ?? '')
const variableNombre = ref(props.initial?.variableNombre ?? '')
const zona = ref(props.initial?.zona ?? '')
const prioridad = ref<NonConformityPriority>(props.initial?.prioridad ?? 'MEDIA')
const estado = ref<NonConformityStatus>(props.initial?.estado ?? 'ABIERTA')
const submitting = ref(false)

async function handleSubmit() {
  if (!descripcion.value.trim()) {
    useToast().error(t('dashboard.nonConformitiesAdmin.form.descripcionRequired'))
    return
  }
  if (props.mode === 'create' && !variableNombre.value.trim()) {
    useToast().error(t('dashboard.nonConformitiesAdmin.form.variableRequired'))
    return
  }

  submitting.value = true
  try {
    if (props.mode === 'create') {
      emit('submitCreate', {
        descripcion: descripcion.value.trim(),
        variableNombre: variableNombre.value.trim(),
        zona: zona.value.trim() || undefined,
        prioridad: prioridad.value,
        estado: estado.value,
      })
    } else {
      emit('submitEdit', { descripcion: descripcion.value.trim(), prioridad: prioridad.value, estado: estado.value })
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <Modal
    :title="
      mode === 'create'
        ? t('dashboard.nonConformitiesAdmin.form.createTitle')
        : t('dashboard.nonConformitiesAdmin.form.editTitle')
    "
    max-width="lg"
    @close="emit('close')"
  >
    <form class="mt-4 grid gap-4" @submit.prevent="handleSubmit">
          <div v-if="mode === 'create'">
            <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy-700">
              {{ t('dashboard.nonConformitiesAdmin.form.variableLabel') }}
            </label>
            <input
              v-model="variableNombre"
              type="text"
              class="w-full rounded-sm border border-line-strong bg-white px-3 py-2.5 text-sm text-navy-900"
            />
          </div>

          <div>
            <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy-700">
              {{ t('dashboard.nonConformitiesAdmin.form.descripcionLabel') }}
            </label>
            <textarea
              v-model="descripcion"
              rows="3"
              class="w-full rounded-sm border border-line-strong bg-white px-3 py-2.5 text-sm text-navy-900"
            />
          </div>

          <div v-if="mode === 'create'">
            <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy-700">
              {{ t('dashboard.nonConformitiesAdmin.form.zonaLabel') }}
            </label>
            <input
              v-model="zona"
              type="text"
              class="w-full rounded-sm border border-line-strong bg-white px-3 py-2.5 text-sm text-navy-900"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy-700">
                {{ t('dashboard.nonConformitiesAdmin.form.prioridadLabel') }}
              </label>
              <select
                v-model="prioridad"
                class="w-full rounded-sm border border-line-strong bg-white px-3 py-2.5 text-sm text-navy-900"
              >
                <option value="ALTA">{{ t('dashboard.riskSections.priority.ALTA') }}</option>
                <option value="MEDIA">{{ t('dashboard.riskSections.priority.MEDIA') }}</option>
                <option value="BAJA">{{ t('dashboard.riskSections.priority.BAJA') }}</option>
              </select>
            </div>
            <div>
              <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy-700">
                {{ t('dashboard.nonConformitiesAdmin.form.estadoLabel') }}
              </label>
              <select
                v-model="estado"
                class="w-full rounded-sm border border-line-strong bg-white px-3 py-2.5 text-sm text-navy-900"
              >
                <option value="ABIERTA">{{ t('dashboard.riskSections.status.ABIERTA') }}</option>
                <option value="EN_SEGUIMIENTO">{{ t('dashboard.riskSections.status.EN_SEGUIMIENTO') }}</option>
                <option value="CERRADA">{{ t('dashboard.riskSections.status.CERRADA') }}</option>
              </select>
            </div>
          </div>

          <div class="flex justify-end gap-2">
            <button
              type="button"
              class="rounded-sm border border-line-strong px-4 py-2 text-sm font-medium text-navy-700 hover:border-navy-900"
              @click="emit('close')"
            >
              {{ t('dashboard.nonConformitiesAdmin.form.cancel') }}
            </button>
            <SubmitButton
              :loading="submitting"
              :loading-label="mode === 'create' ? t('dashboard.nonConformitiesAdmin.form.submitting') : t('dashboard.nonConformitiesAdmin.form.saving')"
            >
              {{ mode === 'create' ? t('dashboard.nonConformitiesAdmin.form.submit') : t('dashboard.nonConformitiesAdmin.form.save') }}
            </SubmitButton>
          </div>
    </form>
  </Modal>
</template>
