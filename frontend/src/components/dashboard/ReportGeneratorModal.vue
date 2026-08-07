<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '@/components/ui/Modal.vue'
import { useToast } from '@/composables/useToast'
import {
  generateReportPdf,
  generateReportCsv,
  ReportRequestError,
  type ReportMetadata,
} from '@/services/reports.service'

const props = defineProps<{
  serviceSlug: string
  /** Presente solo en uso admin — el cliente nunca lo pasa. */
  organizationId?: string
  tipo: 'basico' | 'tecnico'
}>()
const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()

const metadata = ref<ReportMetadata>({
  direccion: '',
  ciudad: '',
  sede: '',
  area: '',
  periodoEvaluacion: '',
  numeroInforme: '',
  elaboradoPor: '',
})

const generandoPdf = ref(false)
const generandoCsv = ref(false)

async function handleGeneratePdf() {
  generandoPdf.value = true
  try {
    await generateReportPdf(
      { serviceSlug: props.serviceSlug, organizationId: props.organizationId },
      props.tipo,
      metadata.value,
    )
  } catch (err) {
    useToast().error(err instanceof ReportRequestError ? err.message : t('reports.genericError'))
  } finally {
    generandoPdf.value = false
  }
}

async function handleGenerateCsv() {
  generandoCsv.value = true
  try {
    await generateReportCsv({ serviceSlug: props.serviceSlug, organizationId: props.organizationId })
  } catch (err) {
    useToast().error(err instanceof ReportRequestError ? err.message : t('reports.genericError'))
  } finally {
    generandoCsv.value = false
  }
}
</script>

<template>
  <Modal title="" max-width="lg" scrollable @close="emit('close')">
    <template #header>
      <div>
        <h2 class="text-base font-bold text-navy-900">
          {{ tipo === 'basico' ? t('reports.tituloBasico') : t('reports.tituloTecnico') }}
        </h2>
        <p class="mt-1 text-sm text-navy-700/70">{{ t('reports.subtitulo') }}</p>
      </div>
    </template>

    <form class="mt-5 grid gap-4 sm:grid-cols-2" novalidate @submit.prevent="handleGeneratePdf">
          <div>
            <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700">{{
              t('reports.fields.direccion')
            }}</label>
            <input
              v-model="metadata.direccion"
              type="text"
              class="w-full rounded-sm border border-line-strong px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700">{{
              t('reports.fields.ciudad')
            }}</label>
            <input
              v-model="metadata.ciudad"
              type="text"
              class="w-full rounded-sm border border-line-strong px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700">{{
              t('reports.fields.sede')
            }}</label>
            <input
              v-model="metadata.sede"
              type="text"
              class="w-full rounded-sm border border-line-strong px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700">{{
              t('reports.fields.area')
            }}</label>
            <input
              v-model="metadata.area"
              type="text"
              class="w-full rounded-sm border border-line-strong px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700">{{
              t('reports.fields.periodoEvaluacion')
            }}</label>
            <input
              v-model="metadata.periodoEvaluacion"
              type="text"
              class="w-full rounded-sm border border-line-strong px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700">{{
              t('reports.fields.numeroInforme')
            }}</label>
            <input
              v-model="metadata.numeroInforme"
              type="text"
              class="w-full rounded-sm border border-line-strong px-3 py-2 text-sm"
            />
          </div>
          <div class="sm:col-span-2">
            <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700">{{
              t('reports.fields.elaboradoPor')
            }}</label>
            <input
              v-model="metadata.elaboradoPor"
              type="text"
              :placeholder="t('reports.fields.elaboradoPorPlaceholder')"
              class="w-full rounded-sm border border-line-strong px-3 py-2 text-sm placeholder:text-navy-700/40"
            />
          </div>

          <div class="flex flex-wrap justify-end gap-2 sm:col-span-2">
            <button
              v-if="tipo === 'tecnico'"
              type="button"
              class="rounded-sm border border-line-strong px-4 py-2 text-sm font-semibold text-navy-700 hover:bg-cream disabled:opacity-50"
              :disabled="generandoCsv"
              @click="handleGenerateCsv"
            >
              {{ generandoCsv ? t('reports.generando') : t('reports.generarCsv') }}
            </button>
            <button
              type="submit"
              class="rounded-sm bg-[var(--org-primary,#0b1a33)] px-4 py-2 text-sm font-semibold text-cream disabled:opacity-50"
              :disabled="generandoPdf"
            >
              {{ generandoPdf ? t('reports.generando') : t('reports.generarPdf') }}
            </button>
          </div>
    </form>
  </Modal>
</template>
