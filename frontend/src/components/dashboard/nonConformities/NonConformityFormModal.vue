<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { X } from 'lucide-vue-next'
import ModalAccentStrip from '@/components/ui/ModalAccentStrip.vue'
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
const errorMessage = ref('')

async function handleSubmit() {
  errorMessage.value = ''
  if (!descripcion.value.trim()) {
    errorMessage.value = t('dashboard.nonConformitiesAdmin.form.descripcionRequired')
    return
  }
  if (props.mode === 'create' && !variableNombre.value.trim()) {
    errorMessage.value = t('dashboard.nonConformitiesAdmin.form.variableRequired')
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
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 px-4" @click.self="emit('close')">
    <div class="w-full max-w-lg overflow-hidden rounded-md bg-white shadow-xl">
      <ModalAccentStrip />
      <div class="p-5">
        <div class="flex items-start justify-between gap-3">
          <h2 class="text-base font-bold text-navy-900">
            {{
              mode === 'create'
                ? t('dashboard.nonConformitiesAdmin.form.createTitle')
                : t('dashboard.nonConformitiesAdmin.form.editTitle')
            }}
          </h2>
          <button
            type="button"
            class="rounded-sm p-1 text-navy-700/60 hover:bg-cream"
            :aria-label="t('dashboard.nonConformitiesAdmin.form.cancel')"
            @click="emit('close')"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

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

          <p v-if="errorMessage" class="rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {{ errorMessage }}
          </p>

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
      </div>
    </div>
  </div>
</template>
