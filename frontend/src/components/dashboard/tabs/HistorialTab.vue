<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { UploadHistoryEntry, UploadDetail } from '@/types/dashboard'
import type { Locale } from '@/i18n'
import { SEMAPHORE_STYLES, SEMAPHORE_LABEL_KEY } from '@/utils/semaphoreStyles'
import { formatDateTime } from '@/utils/formatDate'

const props = defineProps<{
  fetchHistory: () => Promise<UploadHistoryEntry[]>
  fetchUploadDetail: (uploadId: string) => Promise<UploadDetail>
}>()

const { t, locale } = useI18n()

const status = ref<'loading' | 'ready' | 'error'>('loading')
const uploads = ref<UploadHistoryEntry[]>([])
const desde = ref('')
const hasta = ref('')
const zona = ref('')
const seccion = ref('')
const cargo = ref('')
const trabajador = ref('')

const expandedId = ref<string | null>(null)
const detailByUpload = ref<Record<string, UploadDetail>>({})
const detailLoading = ref(false)

function uniqueNombres(key: 'zonaNombre' | 'seccionNombre' | 'cargoNombre' | 'trabajadorNombre') {
  return [...new Set(uploads.value.map((u) => u[key]).filter((v): v is string => !!v))].sort()
}
const zonaOptions = computed(() => uniqueNombres('zonaNombre'))
const seccionOptions = computed(() => uniqueNombres('seccionNombre'))
const cargoOptions = computed(() => uniqueNombres('cargoNombre'))
const trabajadorOptions = computed(() => uniqueNombres('trabajadorNombre'))

const filteredUploads = computed(() =>
  uploads.value.filter((u) => {
    const fecha = u.fechaEvaluacion.slice(0, 10)
    if (desde.value && fecha < desde.value) return false
    if (hasta.value && fecha > hasta.value) return false
    if (zona.value && u.zonaNombre !== zona.value) return false
    if (seccion.value && u.seccionNombre !== seccion.value) return false
    if (cargo.value && u.cargoNombre !== cargo.value) return false
    if (trabajador.value && u.trabajadorNombre !== trabajador.value) return false
    return true
  }),
)

onMounted(async () => {
  try {
    uploads.value = await props.fetchHistory()
    status.value = 'ready'
  } catch {
    status.value = 'error'
  }
})

async function toggleExpand(upload: UploadHistoryEntry) {
  if (expandedId.value === upload.id) {
    expandedId.value = null
    return
  }
  expandedId.value = upload.id
  if (detailByUpload.value[upload.id]) return
  detailLoading.value = true
  try {
    detailByUpload.value[upload.id] = await props.fetchUploadDetail(upload.id)
  } finally {
    detailLoading.value = false
  }
}

function statusLabel(s: UploadHistoryEntry['status']): string {
  if (s === 'PROCESADO') return t('dashboard.historial.statusProcesado')
  if (s === 'ERROR') return t('dashboard.historial.statusError')
  return t('dashboard.historial.statusPendiente')
}
</script>

<template>
  <div class="grid gap-4">
    <div class="flex flex-wrap items-end gap-4 rounded-lg border border-line-strong bg-white px-5 py-4">
      <div>
        <label for="desde" class="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">{{
          t('dashboard.historial.desde')
        }}</label>
        <input
          id="desde"
          v-model="desde"
          type="date"
          class="rounded-sm border border-line-strong bg-white px-3 py-2 text-sm text-navy-900"
        />
      </div>
      <div>
        <label for="hasta" class="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">{{
          t('dashboard.historial.hasta')
        }}</label>
        <input
          id="hasta"
          v-model="hasta"
          type="date"
          class="rounded-sm border border-line-strong bg-white px-3 py-2 text-sm text-navy-900"
        />
      </div>
      <div>
        <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">{{
          t('dashboard.uploadForm.zonaLabel')
        }}</label>
        <select v-model="zona" class="rounded-sm border border-line-strong bg-white px-3 py-2 text-sm text-navy-900">
          <option value="">{{ t('dashboard.detalleTecnico.filtroTodasZonas') }}</option>
          <option v-for="z in zonaOptions" :key="z" :value="z">{{ z }}</option>
        </select>
      </div>
      <div>
        <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">{{
          t('dashboard.uploadForm.seccionLabel')
        }}</label>
        <select v-model="seccion" class="rounded-sm border border-line-strong bg-white px-3 py-2 text-sm text-navy-900">
          <option value="">{{ t('dashboard.detalleTecnico.filtroTodasSecciones') }}</option>
          <option v-for="s in seccionOptions" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>
      <div>
        <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">{{
          t('dashboard.uploadForm.cargoLabel')
        }}</label>
        <select v-model="cargo" class="rounded-sm border border-line-strong bg-white px-3 py-2 text-sm text-navy-900">
          <option value="">{{ t('dashboard.detalleTecnico.filtroTodosCargos') }}</option>
          <option v-for="c in cargoOptions" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>
      <div>
        <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">{{
          t('dashboard.uploadForm.trabajadorLabel')
        }}</label>
        <select v-model="trabajador" class="rounded-sm border border-line-strong bg-white px-3 py-2 text-sm text-navy-900">
          <option value="">{{ t('dashboard.detalleTecnico.filtroTodosTrabajadores') }}</option>
          <option v-for="tr in trabajadorOptions" :key="tr" :value="tr">{{ tr }}</option>
        </select>
      </div>
    </div>

    <p v-if="status === 'loading'" class="text-sm text-navy-700">{{ t('dashboard.historial.loading') }}</p>
    <p v-else-if="status === 'error'" class="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {{ t('dashboard.historial.loadError') }}
    </p>
    <p
      v-else-if="filteredUploads.length === 0"
      class="rounded-lg border border-dashed border-line-strong bg-white p-10 text-center text-sm text-navy-700"
    >
      {{ t('dashboard.historial.empty') }}
    </p>

    <div v-else class="overflow-hidden rounded-lg border border-line-strong bg-white">
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="bg-sky-100 text-left text-[11px] uppercase tracking-wide text-navy-700">
              <th class="px-4 py-3 font-semibold">{{ t('dashboard.historial.fechaEvaluacion') }}</th>
              <th class="px-4 py-3 font-semibold">{{ t('dashboard.historial.cargadoPor') }}</th>
              <th class="px-4 py-3 font-semibold">{{ t('dashboard.historial.archivo') }}</th>
              <th class="px-4 py-3 font-semibold">{{ t('dashboard.historial.puestos') }}</th>
              <th class="px-4 py-3 font-semibold">{{ t('dashboard.historial.lecturas') }}</th>
              <th class="px-4 py-3 font-semibold">{{ t('dashboard.comparisonTable.estado') }}</th>
              <th class="px-4 py-3 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            <template v-for="upload in filteredUploads" :key="upload.id">
              <tr class="cursor-pointer border-t border-line hover:bg-sky-100/40" @click="toggleExpand(upload)">
                <td class="px-4 py-3 text-navy-900">{{ formatDateTime(upload.fechaEvaluacion, locale as Locale) }}</td>
                <td class="px-4 py-3 text-navy-700">{{ upload.uploadedByNombre }}</td>
                <td class="px-4 py-3 text-navy-700">{{ upload.originalFile }}</td>
                <td class="px-4 py-3 text-navy-700">{{ upload.totalPuestos }}</td>
                <td class="px-4 py-3 text-navy-700">{{ upload.totalLecturas }}</td>
                <td class="px-4 py-3 text-navy-700">{{ statusLabel(upload.status) }}</td>
                <td class="px-4 py-3">
                  <span
                    v-if="upload.hasOmittedRows"
                    class="mr-1.5 inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase text-amber-700"
                  >
                    {{ t('dashboard.historial.hasObservations') }}
                  </span>
                  <span
                    v-if="upload.hasMissingVariables"
                    class="inline-flex items-center rounded-full border border-red-300 bg-red-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase text-red-700"
                  >
                    {{ t('dashboard.historial.hasMissingVariables') }}
                  </span>
                </td>
              </tr>
              <tr v-if="expandedId === upload.id" class="border-t border-line bg-cream">
                <td colspan="7" class="px-4 py-4">
                  <p v-if="detailLoading && !detailByUpload[upload.id]" class="text-xs text-navy-700">
                    {{ t('dashboard.historial.loadingDetail') }}
                  </p>
                  <template v-else-if="detailByUpload[upload.id]">
                    <div
                      v-if="upload.zonaNombre || upload.seccionNombre || upload.cargoNombre || upload.trabajadorNombre"
                      class="mb-3 grid grid-cols-2 gap-x-4 gap-y-1 rounded-sm border border-line-strong bg-white px-3 py-2 text-xs text-navy-700 sm:grid-cols-4"
                    >
                      <p><span class="font-semibold text-navy-900">{{ t('dashboard.uploadForm.zonaLabel') }}:</span> {{ upload.zonaNombre }}</p>
                      <p><span class="font-semibold text-navy-900">{{ t('dashboard.uploadForm.seccionLabel') }}:</span> {{ upload.seccionNombre }}</p>
                      <p><span class="font-semibold text-navy-900">{{ t('dashboard.uploadForm.cargoLabel') }}:</span> {{ upload.cargoNombre }}</p>
                      <p><span class="font-semibold text-navy-900">{{ t('dashboard.uploadForm.trabajadorLabel') }}:</span> {{ upload.trabajadorNombre }}</p>
                    </div>

                    <div
                      v-if="detailByUpload[upload.id]!.omittedRows.length > 0"
                      class="mb-3 rounded-sm border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800"
                    >
                      <p class="mb-1 font-semibold">{{ t('dashboard.historial.omittedHeading') }}</p>
                      <ul class="list-inside list-disc">
                        <li v-for="(o, i) in detailByUpload[upload.id]!.omittedRows" :key="i">
                          {{ o.nombre }} — {{ t(`dashboard.uploadForm.omittedReason.${o.motivo}`) }}
                        </li>
                      </ul>
                    </div>

                    <div
                      v-if="detailByUpload[upload.id]!.missingVariables.length > 0"
                      class="mb-3 rounded-sm border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800"
                    >
                      <p class="mb-1 font-semibold">{{ t('dashboard.historial.missingVariablesHeading') }}</p>
                      <ul class="list-inside list-disc">
                        <li v-for="v in detailByUpload[upload.id]!.missingVariables" :key="v.codigo">
                          {{ v.codigo }} — {{ v.nombre }}
                        </li>
                      </ul>
                    </div>

                    <div class="overflow-x-auto">
                      <table class="w-full border-collapse text-xs">
                        <thead>
                          <tr class="text-left uppercase tracking-wide text-navy-700 opacity-70">
                            <th class="px-3 py-2">{{ t('dashboard.category.workPoint') }}</th>
                            <th class="px-3 py-2">{{ t('dashboard.comparisonTable.variable') }}</th>
                            <th class="px-3 py-2">{{ t('dashboard.historial.valor') }}</th>
                            <th class="px-3 py-2">{{ t('dashboard.comparisonTable.estado') }}</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr
                            v-for="(r, i) in detailByUpload[upload.id]!.readings"
                            :key="i"
                            class="border-t border-line"
                          >
                            <td class="px-3 py-2 text-navy-900">{{ r.workPointNombre }}</td>
                            <td class="px-3 py-2 text-navy-700">
                              {{ r.variableNombre }}
                              <span
                                v-if="r.isCorrected"
                                class="ml-1.5 inline-flex items-center rounded-full border border-sky-300 bg-sky-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-sky-700"
                                :title="
                                  r.correctionReason
                                    ? `${t('dashboard.historial.correctedReasonPrefix')}${r.correctionReason}`
                                    : undefined
                                "
                              >
                                {{ t('dashboard.historial.correctedBadge') }}
                              </span>
                            </td>
                            <td class="px-3 py-2 font-mono text-navy-900">{{ r.valor }} {{ r.unidadMedida }}</td>
                            <td class="px-3 py-2">
                              <span
                                :class="[
                                  SEMAPHORE_STYLES[r.semaforo].bg,
                                  SEMAPHORE_STYLES[r.semaforo].text,
                                  SEMAPHORE_STYLES[r.semaforo].border,
                                ]"
                                class="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase"
                              >
                                <span :class="SEMAPHORE_STYLES[r.semaforo].dot" class="h-1.5 w-1.5 rounded-full" />
                                {{ t(SEMAPHORE_LABEL_KEY[r.semaforo]) }}
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </template>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
