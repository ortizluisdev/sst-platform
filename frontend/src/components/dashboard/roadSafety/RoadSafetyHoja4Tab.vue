<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { getRoadSafetyHoja4, RoadSafetyRequestError } from '@/services/roadSafety.service'
import { formatDate } from '@/utils/formatDate'
import type { Locale } from '@/i18n'
import type { RoadSafetyRuta } from '@/types/roadSafety'
import { useToast } from '@/composables/useToast'

const props = defineProps<{ organizationId?: string }>()
const { t, locale } = useI18n()

const status = ref<'loading' | 'ready' | 'error'>('loading')
const rutas = ref<RoadSafetyRuta[]>([])
const rutaSeleccionada = ref<string | null>(null)

async function load() {
  status.value = 'loading'
  try {
    rutas.value = await getRoadSafetyHoja4({ organizationId: props.organizationId })
    rutaSeleccionada.value = rutas.value[0]?.id ?? null
    status.value = 'ready'
  } catch (err) {
    status.value = 'error'
    useToast().error(err instanceof RoadSafetyRequestError ? err.message : t('roadSafety.loadError'))
  }
}

onMounted(load)
watch(() => props.organizationId, load)
defineExpose({ reload: load })

function fecha(value: string | null): string {
  return value ? formatDate(value, locale.value as Locale) : '—'
}
</script>

<template>
  <div class="grid gap-4">
    <p v-if="status === 'loading'" class="text-sm text-navy-700">{{ t('roadSafety.loading') }}</p>
    <p
      v-else-if="rutas.length === 0"
      class="rounded-lg border border-dashed border-line-strong bg-white p-8 text-center text-sm text-navy-700/60"
    >
      {{ t('roadSafety.hoja4.empty') }}
    </p>
    <template v-else>
      <div v-if="rutas.length > 1">
        <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy-700">{{
          t('roadSafety.hoja4.selectRuta')
        }}</label>
        <select
          v-model="rutaSeleccionada"
          class="w-full max-w-xs rounded-sm border border-line-strong bg-white px-3 py-2 text-sm text-navy-900"
        >
          <option v-for="r in rutas" :key="r.id" :value="r.id">
            {{ r.idRuta }} — {{ r.origen }} → {{ r.destino }}
          </option>
        </select>
      </div>

      <template v-for="ruta in rutas.filter((r) => r.id === rutaSeleccionada)" :key="ruta.id">
        <div class="overflow-hidden rounded-lg border border-line-strong bg-white">
          <p
            class="border-b border-line-strong bg-sky-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-navy-700"
          >
            {{ t('roadSafety.hoja4.encabezado') }}
          </p>
          <div class="grid gap-4 p-4 sm:grid-cols-2">
            <div>
              <p class="text-xs font-semibold uppercase text-navy-700/70">{{ t('roadSafety.hoja4.codigo') }}</p>
              <p>{{ ruta.codigo ?? '—' }}</p>
            </div>
            <div>
              <p class="text-xs font-semibold uppercase text-navy-700/70">{{ t('roadSafety.hoja4.version') }}</p>
              <p>{{ ruta.version ?? '—' }}</p>
            </div>
            <div>
              <p class="text-xs font-semibold uppercase text-navy-700/70">{{ t('roadSafety.hoja4.fecha') }}</p>
              <p>{{ fecha(ruta.fecha) }}</p>
            </div>
            <div>
              <p class="text-xs font-semibold uppercase text-navy-700/70">{{ t('roadSafety.hoja4.idRuta') }}</p>
              <p>{{ ruta.idRuta }}</p>
            </div>
          </div>
        </div>

        <div class="overflow-hidden rounded-lg border border-line-strong bg-white">
          <p
            class="border-b border-line-strong bg-sky-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-navy-700"
          >
            {{ t('roadSafety.hoja4.infoGeneral') }}
          </p>
          <div class="grid gap-4 p-4 sm:grid-cols-2">
            <div>
              <p class="text-xs font-semibold uppercase text-navy-700/70">{{ t('roadSafety.hoja4.origen') }}</p>
              <p>{{ ruta.origen ?? '—' }}</p>
            </div>
            <div>
              <p class="text-xs font-semibold uppercase text-navy-700/70">{{ t('roadSafety.hoja4.destino') }}</p>
              <p>{{ ruta.destino ?? '—' }}</p>
            </div>
            <div>
              <p class="text-xs font-semibold uppercase text-navy-700/70">{{ t('roadSafety.hoja4.rutaAlterna') }}</p>
              <p>{{ ruta.rutaAlterna ?? '—' }}</p>
            </div>
            <div>
              <p class="text-xs font-semibold uppercase text-navy-700/70">{{ t('roadSafety.hoja4.sitiosParada') }}</p>
              <p>{{ ruta.sitiosParada ?? '—' }}</p>
            </div>
            <div>
              <p class="text-xs font-semibold uppercase text-navy-700/70">{{ t('roadSafety.hoja4.kmsRecorridos') }}</p>
              <p>{{ ruta.kmsRecorridos ?? '—' }}</p>
            </div>
            <div>
              <p class="text-xs font-semibold uppercase text-navy-700/70">{{ t('roadSafety.hoja4.duracion') }}</p>
              <p>{{ ruta.duracion ?? '—' }}</p>
            </div>
          </div>
        </div>

        <div class="overflow-hidden rounded-lg border border-line-strong bg-white">
          <p
            class="border-b border-line-strong bg-sky-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-navy-700"
          >
            {{ t('roadSafety.hoja4.organismosApoyo') }}
          </p>
          <div class="overflow-x-auto">
            <table class="w-full border-collapse text-sm">
              <thead>
                <tr class="bg-sky-50 text-left text-[11px] uppercase tracking-wide text-navy-700">
                  <th class="px-3 py-2 font-semibold">{{ t('roadSafety.hoja4.entidad') }}</th>
                  <th class="px-3 py-2 font-semibold">{{ t('roadSafety.hoja4.municipio') }}</th>
                  <th class="px-3 py-2 font-semibold">{{ t('roadSafety.hoja4.telefono1') }}</th>
                  <th class="px-3 py-2 font-semibold">{{ t('roadSafety.hoja4.telefono2') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="o in ruta.organismosApoyoNacionales" :key="o.entidad" class="border-t border-line">
                  <td class="px-3 py-2 text-navy-900">{{ o.entidad }}</td>
                  <td class="px-3 py-2 text-navy-700">{{ o.municipio }}</td>
                  <td class="px-3 py-2 font-mono text-navy-900">{{ o.telefono1 }}</td>
                  <td class="px-3 py-2 font-mono text-navy-700">{{ o.telefono2 ?? '—' }}</td>
                </tr>
                <tr
                  v-for="o in ruta.organismosApoyoLocal"
                  :key="`local-${o.entidad}`"
                  class="border-t border-line bg-cream/40"
                >
                  <td class="px-3 py-2 text-navy-900">{{ o.entidad }}</td>
                  <td class="px-3 py-2 text-navy-700">{{ o.municipio }}</td>
                  <td class="px-3 py-2 font-mono text-navy-900">{{ o.telefono1 || '—' }}</td>
                  <td class="px-3 py-2 font-mono text-navy-700">{{ o.telefono2 || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="overflow-hidden rounded-lg border border-line-strong bg-white">
          <p
            class="border-b border-line-strong bg-sky-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-navy-700"
          >
            {{ t('roadSafety.hoja4.condicionesRiesgo') }}
          </p>
          <div class="flex flex-wrap gap-2 p-4">
            <span
              v-for="c in ruta.condicionesRiesgo.filter((c) => c.marcado)"
              :key="c.clave"
              class="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700"
            >
              {{ c.etiqueta }}
            </span>
            <p v-if="!ruta.condicionesRiesgo.some((c) => c.marcado)" class="text-sm text-navy-700/50">
              {{ t('roadSafety.hoja4.condicionesEmpty') }}
            </p>
          </div>
        </div>

        <div class="overflow-hidden rounded-lg border border-line-strong bg-white">
          <p
            class="border-b border-line-strong bg-sky-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-navy-700"
          >
            {{ t('roadSafety.hoja4.puntosRuta') }}
          </p>
          <div class="overflow-x-auto">
            <table class="w-full border-collapse text-sm">
              <thead>
                <tr class="bg-sky-50 text-left text-[11px] uppercase tracking-wide text-navy-700">
                  <th class="px-3 py-2 font-semibold">{{ t('roadSafety.hoja4.kmVia') }}</th>
                  <th class="px-3 py-2 font-semibold">{{ t('roadSafety.hoja4.senales') }}</th>
                  <th class="px-3 py-2 font-semibold">{{ t('roadSafety.hoja4.aspectos') }}</th>
                  <th class="px-3 py-2 font-semibold">{{ t('roadSafety.hoja4.controles') }}</th>
                  <th class="px-3 py-2 font-semibold">{{ t('roadSafety.hoja4.recomendaciones') }}</th>
                  <th class="px-3 py-2 font-semibold">{{ t('roadSafety.hoja4.riesgo') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in ruta.puntos" :key="p.id" class="border-t border-line">
                  <td class="px-3 py-2 text-navy-900">{{ p.kmViaReferencia }}</td>
                  <td class="px-3 py-2 text-navy-700">{{ p.senalesTransito ?? '—' }}</td>
                  <td class="px-3 py-2 text-navy-700">{{ p.aspectosRelevantes ?? '—' }}</td>
                  <td class="px-3 py-2 text-navy-700">{{ p.controlesExistentes ?? '—' }}</td>
                  <td class="px-3 py-2 text-navy-700">{{ p.recomendacionesSeguridad ?? '—' }}</td>
                  <td class="px-3 py-2 text-navy-700">{{ p.riesgoMasRelevante ?? '—' }}</td>
                </tr>
                <tr v-if="ruta.puntos.length === 0">
                  <td colspan="6" class="px-3 py-6 text-center text-sm text-navy-700/50">
                    {{ t('roadSafety.hoja4.puntosEmpty') }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>
