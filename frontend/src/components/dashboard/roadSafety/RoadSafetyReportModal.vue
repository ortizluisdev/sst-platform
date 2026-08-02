<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { X } from 'lucide-vue-next'
import ModalAccentStrip from '@/components/ui/ModalAccentStrip.vue'
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
const errorMessage = ref('')

async function handleGeneratePdf() {
  errorMessage.value = ''
  generandoPdf.value = true
  try {
    await generateRoadSafetyReportPdf({ organizationId: props.organizationId }, props.tipo, metadata.value)
  } catch (err) {
    errorMessage.value = err instanceof RoadSafetyRequestError ? err.message : t('roadSafety.reports.genericError')
  } finally {
    generandoPdf.value = false
  }
}

async function handleGenerateCsv() {
  errorMessage.value = ''
  generandoCsv.value = true
  try {
    await generateRoadSafetyReportCsv({ organizationId: props.organizationId }, props.tipo)
  } catch (err) {
    errorMessage.value = err instanceof RoadSafetyRequestError ? err.message : t('roadSafety.reports.genericError')
  } finally {
    generandoCsv.value = false
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 px-4" @click.self="emit('close')">
    <div class="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-md bg-white shadow-xl">
      <ModalAccentStrip />

      <div class="overflow-y-auto p-5 sm:p-6">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 class="text-base font-bold text-navy-900">{{ t(`roadSafety.reports.titulo.${tipo}`) }}</h2>
            <p class="mt-1 text-sm text-navy-700/70">{{ t('roadSafety.reports.subtitulo') }}</p>
          </div>
          <button
            type="button"
            class="rounded-sm p-1 text-navy-700/60 hover:bg-cream"
            :aria-label="t('roadSafety.reports.close')"
            @click="emit('close')"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

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

          <p
            v-if="errorMessage"
            class="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:col-span-2"
          >
            {{ errorMessage }}
          </p>

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
      </div>
    </div>
  </div>
</template>
