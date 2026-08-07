<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '@/components/ui/Modal.vue'
import { useToast } from '@/composables/useToast'
import {
  generateRoadSafetyReportPdf,
  generateRoadSafetyReportCsv,
  RoadSafetyRequestError,
} from '@/services/roadSafety.service'
import type { RoadSafetyReportMetadata, RoadSafetyReportTipo } from '@/types/roadSafety'

const props = defineProps<{
  organizationId?: string
  tipo: RoadSafetyReportTipo
}>()
const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()

const metadata = ref<RoadSafetyReportMetadata>({
  sedePrincipal: '',
  ciudad: '',
  responsablePesv: '',
  nivelPesv: '',
  numeroInforme: '',
  fechaCorte: '',
})

const generandoPdf = ref(false)
const generandoCsv = ref(false)

async function handleGeneratePdf() {
  generandoPdf.value = true
  try {
    await generateRoadSafetyReportPdf({ organizationId: props.organizationId }, props.tipo, metadata.value)
  } catch (err) {
    useToast().error(err instanceof RoadSafetyRequestError ? err.message : t('roadSafety.reports.genericError'))
  } finally {
    generandoPdf.value = false
  }
}

async function handleGenerateCsv() {
  generandoCsv.value = true
  try {
    await generateRoadSafetyReportCsv({ organizationId: props.organizationId }, props.tipo)
  } catch (err) {
    useToast().error(err instanceof RoadSafetyRequestError ? err.message : t('roadSafety.reports.genericError'))
  } finally {
    generandoCsv.value = false
  }
}
</script>

<template>
  <Modal title="" max-width="lg" scrollable @close="emit('close')">
    <template #header>
      <div>
        <h2 class="text-base font-bold text-navy-900">{{ t(`roadSafety.reports.titulo.${tipo}`) }}</h2>
        <p class="mt-1 text-sm text-navy-700/70">{{ t('roadSafety.reports.subtitulo') }}</p>
      </div>
    </template>

    <form class="mt-5 grid gap-4 sm:grid-cols-2" novalidate @submit.prevent="handleGeneratePdf">
          <div v-if="tipo === 'h1'">
            <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700">{{
              t('roadSafety.reports.fields.sedePrincipal')
            }}</label>
            <input
              v-model="metadata.sedePrincipal"
              type="text"
              class="w-full rounded-sm border border-line-strong px-3 py-2 text-sm"
            />
          </div>
          <div v-if="tipo === 'h1'">
            <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700">{{
              t('roadSafety.reports.fields.ciudad')
            }}</label>
            <input
              v-model="metadata.ciudad"
              type="text"
              class="w-full rounded-sm border border-line-strong px-3 py-2 text-sm"
            />
          </div>
          <div v-if="tipo === 'h1'">
            <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700">{{
              t('roadSafety.reports.fields.responsablePesv')
            }}</label>
            <input
              v-model="metadata.responsablePesv"
              type="text"
              class="w-full rounded-sm border border-line-strong px-3 py-2 text-sm"
            />
          </div>
          <div v-if="tipo === 'h1'">
            <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700">{{
              t('roadSafety.reports.fields.nivelPesv')
            }}</label>
            <input
              v-model="metadata.nivelPesv"
              type="text"
              class="w-full rounded-sm border border-line-strong px-3 py-2 text-sm"
            />
          </div>
          <div v-if="tipo === 'h1'">
            <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700">{{
              t('roadSafety.reports.fields.numeroInforme')
            }}</label>
            <input
              v-model="metadata.numeroInforme"
              type="text"
              class="w-full rounded-sm border border-line-strong px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700">{{
              t('roadSafety.reports.fields.fechaCorte')
            }}</label>
            <input
              v-model="metadata.fechaCorte"
              type="text"
              placeholder="dd/mm/aaaa"
              class="w-full rounded-sm border border-line-strong px-3 py-2 text-sm"
            />
          </div>

          <div class="flex flex-wrap justify-end gap-2 sm:col-span-2">
            <button
              type="button"
              class="rounded-sm border border-line-strong px-4 py-2 text-sm font-semibold text-navy-700 hover:bg-cream disabled:opacity-50"
              :disabled="generandoCsv"
              @click="handleGenerateCsv"
            >
              {{ generandoCsv ? t('roadSafety.reports.generando') : t('roadSafety.reports.generarCsv') }}
            </button>
            <button
              type="submit"
              class="rounded-sm bg-[var(--org-primary,#0b1a33)] px-4 py-2 text-sm font-semibold text-cream disabled:opacity-50"
              :disabled="generandoPdf"
            >
              {{ generandoPdf ? t('roadSafety.reports.generando') : t('roadSafety.reports.generarPdf') }}
            </button>
          </div>
    </form>
  </Modal>
</template>
