<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import type { VariableSummary, NonConformity, NonConformityPriority, NonConformityStatus } from '@/types/dashboard'
import type { Locale } from '@/i18n'
import { categoryLabel } from '@/utils/categoryLabel'
import { variableLabel } from '@/utils/variableLabel'
import { formatRange } from '@/utils/formatRange'
import { SEMAPHORE_STYLES, SEMAPHORE_LABEL_KEY } from '@/utils/semaphoreStyles'
import { resolveDisplayStatus } from '@/utils/resolveDisplayStatus'
import { PRIORITY_STYLES, STATUS_STYLES } from '@/utils/nonConformityStyles'
import {
  getClientHeatmap,
  getAdminHeatmap,
  saveHeatmap,
  getClientNonConformities,
  getAdminNonConformitiesPaginated,
  createNonConformity,
  updateNonConformity,
  DashboardRequestError,
  type HeatmapImage,
  type HigieneCategoria,
} from '@/services/dashboard.service'
import { listOrgCatalog, type CatalogItem } from '@/services/orgCatalogs.service'
import { useToast } from '@/composables/useToast'

const NON_CONFORMITY_PRIORITY_RANK: Record<NonConformityPriority, number> = { ALTA: 0, MEDIA: 1, BAJA: 2 }
const RESUMEN_LIMIT = 5

const props = defineProps<{
  serviceSlug: string
  /** Presente solo en el uso admin (HigieneIndustrialPanel.vue) — su sola
   * presencia decide qué endpoints (cliente vs admin) usar y si la sección
   * es editable. El cliente nunca lo pasa. */
  organizationId?: string
  headlineCards: { categoria: string; variable?: VariableSummary }[]
}>()

const { t, locale } = useI18n()
const isAdmin = computed(() => !!props.organizationId)

// --- Mapa de calor (imágenes subidas por el admin, no calculadas) -------
// Una imagen por combinación categoría+zona (2026-08, antes era una sola
// imagen por empresa+servicio — ver ServiceHeatmapImage en el schema).
const HIGIENE_CATEGORIAS: HigieneCategoria[] = ['ESTRES_TERMICO', 'ILUMINACION', 'SONIDO', 'RADIACION_UV', 'VIBRACION']

const heatmapImages = ref<HeatmapImage[]>([])
const heatmapZonas = ref<CatalogItem[]>([])
const heatmapUploading = ref(false)
const heatmapInput = ref<HTMLInputElement | null>(null)
const newHeatmapCategoria = ref<HigieneCategoria>('ESTRES_TERMICO')
const newHeatmapZonaId = ref('')

const heatmapByCategoria = computed(() => {
  const map = new Map<HigieneCategoria, HeatmapImage[]>()
  for (const cat of HIGIENE_CATEGORIAS) map.set(cat, [])
  for (const img of heatmapImages.value) map.get(img.categoria)?.push(img)
  return map
})

async function loadHeatmap() {
  heatmapImages.value = isAdmin.value
    ? await getAdminHeatmap(props.organizationId!, props.serviceSlug)
    : await getClientHeatmap(props.serviceSlug)
}

async function loadHeatmapZonas() {
  if (!isAdmin.value) return
  heatmapZonas.value = await listOrgCatalog(props.organizationId!, 'zona')
  if (heatmapZonas.value.length > 0 && !newHeatmapZonaId.value) newHeatmapZonaId.value = heatmapZonas.value[0].id
}

function onHeatmapFileChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (!newHeatmapZonaId.value) {
    useToast().error(t('dashboard.riskSections.heatmapZonaRequired'))
    if (heatmapInput.value) heatmapInput.value.value = ''
    return
  }
  const reader = new FileReader()
  reader.onload = async () => {
    const dataUri = reader.result as string
    heatmapUploading.value = true
    try {
      await saveHeatmap(props.organizationId!, props.serviceSlug, {
        categoria: newHeatmapCategoria.value,
        zonaId: newHeatmapZonaId.value,
        imageBase64: dataUri,
      })
      await loadHeatmap()
      useToast().success(t('dashboard.riskSections.heatmapSaved'))
    } catch (err) {
      useToast().error(err instanceof DashboardRequestError ? err.message : t('dashboard.riskSections.heatmapError'))
    } finally {
      heatmapUploading.value = false
      if (heatmapInput.value) heatmapInput.value.value = ''
    }
  }
  reader.readAsDataURL(file)
}

// --- Recomendaciones / no conformidades ----------------------------------
const nonConformities = ref<NonConformity[]>([])

// Resumen "más importantes": top 5, estado ABIERTA, prioridad ALTA primero.
// Admin lo pide ya recortado al backend (pageSize:5, sort:'prioridad') — el
// cliente sigue consumiendo su endpoint sin paginar (intencionalmente no
// tocado) y se recorta en el cliente para llegar al mismo resultado visual.
async function loadNonConformities() {
  if (isAdmin.value) {
    const result = await getAdminNonConformitiesPaginated(props.organizationId!, props.serviceSlug, {
      pageSize: RESUMEN_LIMIT,
      estado: 'ABIERTA',
      sort: 'prioridad',
    })
    nonConformities.value = result.items
    return
  }
  const all = await getClientNonConformities(props.serviceSlug)
  nonConformities.value = all
    .filter((item) => item.estado === 'ABIERTA')
    .sort(
      (a, b) =>
        NON_CONFORMITY_PRIORITY_RANK[a.prioridad] - NON_CONFORMITY_PRIORITY_RANK[b.prioridad] ||
        new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
    )
    .slice(0, RESUMEN_LIMIT)
}

const showAddForm = ref(false)
const savingNew = ref(false)
const newDescripcion = ref('')
const newVariable = ref('')
const newPrioridad = ref<NonConformityPriority>('MEDIA')
const newZona = ref('')

async function submitNew() {
  if (!newDescripcion.value.trim() || !newVariable.value.trim()) return
  savingNew.value = true
  try {
    await createNonConformity(props.organizationId!, props.serviceSlug, {
      descripcion: newDescripcion.value.trim(),
      variableNombre: newVariable.value.trim(),
      prioridad: newPrioridad.value,
      zona: newZona.value.trim() || undefined,
      estado: 'ABIERTA',
    })
    newDescripcion.value = ''
    newVariable.value = ''
    newZona.value = ''
    newPrioridad.value = 'MEDIA'
    showAddForm.value = false
    await loadNonConformities()
  } finally {
    savingNew.value = false
  }
}

async function changeEstado(item: NonConformity, estado: NonConformityStatus) {
  const previous = item.estado
  item.estado = estado
  try {
    await updateNonConformity(props.organizationId!, props.serviceSlug, item.id, { estado })
  } catch {
    item.estado = previous
  }
}

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString(locale.value === 'en' ? 'en-US' : 'es-CO')
}

onMounted(() => {
  loadHeatmap()
  loadHeatmapZonas()
  loadNonConformities()
})
</script>

<template>
  <div class="grid gap-6">
    <!-- Tendencia de riesgo — mapas de calor por categoría + zona -->
    <div>
      <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
        {{ t('dashboard.riskSections.heatmapTitle') }}
      </p>

      <div v-if="isAdmin" class="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-line-strong bg-white p-4">
        <div>
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700">
            {{ t('dashboard.riskSections.heatmapCategoriaLabel') }}
          </label>
          <select
            v-model="newHeatmapCategoria"
            class="rounded-sm border border-line-strong px-3 py-2 text-sm text-navy-900"
          >
            <option v-for="cat in HIGIENE_CATEGORIAS" :key="cat" :value="cat">
              {{ t(`clients.categoryConfig.categorias.${cat}`) }}
            </option>
          </select>
        </div>
        <div>
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700">
            {{ t('dashboard.riskSections.heatmapZonaLabel') }}
          </label>
          <select
            v-model="newHeatmapZonaId"
            class="rounded-sm border border-line-strong px-3 py-2 text-sm text-navy-900"
            :disabled="heatmapZonas.length === 0"
          >
            <option v-if="heatmapZonas.length === 0" value="">{{ t('dashboard.riskSections.heatmapNoZonas') }}</option>
            <option v-for="zona in heatmapZonas" :key="zona.id" :value="zona.id">{{ zona.nombre }}</option>
          </select>
        </div>
        <div>
          <input
            ref="heatmapInput"
            type="file"
            accept="image/png,image/jpeg,image/svg+xml"
            class="hidden"
            @change="onHeatmapFileChange"
          />
          <button
            type="button"
            class="rounded-sm border border-line-strong px-3 py-2 text-xs font-semibold text-navy-700 hover:bg-cream disabled:opacity-50"
            :disabled="heatmapUploading || heatmapZonas.length === 0"
            @click="heatmapInput?.click()"
          >
            {{ heatmapUploading ? t('dashboard.riskSections.heatmapUploading') : t('dashboard.riskSections.heatmapUploadLabel') }}
          </button>
        </div>
      </div>

      <div class="grid gap-3">
        <div
          v-for="cat in HIGIENE_CATEGORIAS"
          :key="cat"
          class="overflow-hidden rounded-lg border border-line-strong bg-white"
        >
          <p class="border-b border-line-strong bg-sky-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-navy-700">
            {{ t(`clients.categoryConfig.categorias.${cat}`) }}
          </p>
          <div v-if="(heatmapByCategoria.get(cat)?.length ?? 0) === 0" class="p-4 text-center text-sm text-navy-700/60">
            {{ t('dashboard.riskSections.heatmapEmpty') }}
          </div>
          <div v-else class="grid gap-4 p-4 sm:grid-cols-2">
            <div v-for="img in heatmapByCategoria.get(cat)" :key="img.id">
              <p class="mb-1.5 text-xs font-semibold text-navy-700">{{ img.zonaNombre }}</p>
              <img :src="img.imageBase64" alt="" class="max-h-[320px] w-full rounded-sm border border-line object-contain" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Comparativo vs. norma (resumen de cada valor cabecera) -->
    <div>
      <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
        {{ t('dashboard.riskSections.comparativoTitle') }}
      </p>
      <div class="overflow-hidden rounded-lg border border-line-strong bg-white">
        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-sm">
            <thead>
              <tr class="bg-sky-100 text-left text-[11px] uppercase tracking-wide text-navy-700">
                <th class="px-4 py-3 font-semibold">{{ t('dashboard.comparisonTable.variable') }}</th>
                <th class="px-4 py-3 font-semibold">{{ t('dashboard.comparisonTable.medicion') }}</th>
                <th class="px-4 py-3 font-semibold">{{ t('dashboard.riskSections.incertidumbre') }}</th>
                <th class="px-4 py-3 font-semibold">{{ t('dashboard.comparisonTable.norma') }}</th>
                <th class="px-4 py-3 font-semibold">{{ t('dashboard.comparisonTable.estado') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="{ categoria, variable } in headlineCards" :key="categoria" class="border-t border-line">
                <td class="px-4 py-3 text-navy-900">
                  {{
                    variable
                      ? variableLabel(variable.codigo, variable.nombre, locale as Locale)
                      : categoryLabel(categoria, locale as Locale)
                  }}
                </td>
                <td class="px-4 py-3 font-mono text-navy-900">
                  {{ variable ? `${variable.promedio} ${variable.unidadMedida}` : '—' }}
                </td>
                <td class="px-4 py-3 font-mono text-navy-700">{{ variable?.incertidumbre ?? '—' }}</td>
                <td class="px-4 py-3 font-mono text-navy-700">
                  {{ variable ? formatRange(variable.limiteMin, variable.limiteMax) : '—' }}
                </td>
                <td class="px-4 py-3">
                  <span
                    v-if="variable"
                    :class="[
                      SEMAPHORE_STYLES[resolveDisplayStatus(variable)].bg,
                      SEMAPHORE_STYLES[resolveDisplayStatus(variable)].text,
                      SEMAPHORE_STYLES[resolveDisplayStatus(variable)].border,
                    ]"
                    class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase"
                  >
                    <span
                      :class="SEMAPHORE_STYLES[resolveDisplayStatus(variable)].dot"
                      class="h-1.5 w-1.5 rounded-full"
                    />
                    {{ t(SEMAPHORE_LABEL_KEY[resolveDisplayStatus(variable)]) }}
                  </span>
                  <span v-else class="text-navy-700/50">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Recomendaciones / no conformidades -->
    <div>
      <div class="mb-3 flex items-center justify-between">
        <p class="text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
          {{ t('dashboard.riskSections.recomendacionesTitle') }}
        </p>
        <button
          v-if="isAdmin"
          type="button"
          class="rounded-sm border border-line-strong px-3 py-1.5 text-xs font-semibold text-navy-700 hover:bg-cream"
          @click="showAddForm = !showAddForm"
        >
          {{ t('dashboard.riskSections.addButton') }}
        </button>
      </div>

      <form
        v-if="showAddForm"
        class="mb-3 grid gap-3 rounded-lg border border-line-strong bg-white p-4 sm:grid-cols-2"
        novalidate
        @submit.prevent="submitNew"
      >
        <div>
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700">{{
            t('dashboard.riskSections.form.variable')
          }}</label>
          <input
            v-model="newVariable"
            type="text"
            class="w-full rounded-sm border border-line-strong px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700">{{
            t('dashboard.riskSections.form.prioridad')
          }}</label>
          <select v-model="newPrioridad" class="w-full rounded-sm border border-line-strong px-3 py-2 text-sm">
            <option value="ALTA">{{ t('dashboard.riskSections.priority.ALTA') }}</option>
            <option value="MEDIA">{{ t('dashboard.riskSections.priority.MEDIA') }}</option>
            <option value="BAJA">{{ t('dashboard.riskSections.priority.BAJA') }}</option>
          </select>
        </div>
        <div class="sm:col-span-2">
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700">{{
            t('dashboard.riskSections.form.descripcion')
          }}</label>
          <textarea
            v-model="newDescripcion"
            rows="2"
            class="w-full rounded-sm border border-line-strong px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700">{{
            t('dashboard.riskSections.form.zona')
          }}</label>
          <input v-model="newZona" type="text" class="w-full rounded-sm border border-line-strong px-3 py-2 text-sm" />
        </div>
        <div class="flex items-end justify-end gap-2 sm:col-span-2">
          <button
            type="button"
            class="rounded-sm border border-line-strong px-4 py-2 text-sm font-semibold text-navy-700"
            @click="showAddForm = false"
          >
            {{ t('dashboard.riskSections.form.cancel') }}
          </button>
          <button
            type="submit"
            class="rounded-sm bg-[var(--org-primary,#0b1a33)] px-4 py-2 text-sm font-semibold text-cream disabled:opacity-50"
            :disabled="savingNew"
          >
            {{ savingNew ? t('dashboard.riskSections.form.saving') : t('dashboard.riskSections.form.save') }}
          </button>
        </div>
      </form>

      <div class="overflow-hidden rounded-lg border border-line-strong bg-white">
        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-sm">
            <thead>
              <tr class="bg-sky-100 text-left text-[11px] uppercase tracking-wide text-navy-700">
                <th class="px-4 py-3 font-semibold">{{ t('dashboard.riskSections.prioridad') }}</th>
                <th class="px-4 py-3 font-semibold">{{ t('dashboard.riskSections.descripcion') }}</th>
                <th class="px-4 py-3 font-semibold">{{ t('dashboard.comparisonTable.variable') }}</th>
                <th class="px-4 py-3 font-semibold">{{ t('dashboard.riskSections.zona') }}</th>
                <th class="px-4 py-3 font-semibold">{{ t('dashboard.riskSections.fecha') }}</th>
                <th class="px-4 py-3 font-semibold">{{ t('dashboard.comparisonTable.estado') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in nonConformities" :key="item.id" class="border-t border-line align-top">
                <td class="px-4 py-3">
                  <span
                    :class="[
                      PRIORITY_STYLES[item.prioridad].bg,
                      PRIORITY_STYLES[item.prioridad].text,
                      PRIORITY_STYLES[item.prioridad].border,
                    ]"
                    class="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase"
                  >
                    {{ t(`dashboard.riskSections.priority.${item.prioridad}`) }}
                  </span>
                </td>
                <td class="px-4 py-3 text-navy-900">{{ item.descripcion }}</td>
                <td class="px-4 py-3 text-navy-900">{{ item.variableNombre }}</td>
                <td class="px-4 py-3 text-navy-700">{{ item.zona ?? '—' }}</td>
                <td class="px-4 py-3 text-navy-700">{{ formatFecha(item.fecha) }}</td>
                <td class="px-4 py-3">
                  <select
                    v-if="isAdmin"
                    :value="item.estado"
                    class="rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase"
                    :class="[
                      STATUS_STYLES[item.estado].bg,
                      STATUS_STYLES[item.estado].text,
                      STATUS_STYLES[item.estado].border,
                    ]"
                    @change="changeEstado(item, ($event.target as HTMLSelectElement).value as NonConformityStatus)"
                  >
                    <option value="ABIERTA">{{ t('dashboard.riskSections.status.ABIERTA') }}</option>
                    <option value="EN_SEGUIMIENTO">{{ t('dashboard.riskSections.status.EN_SEGUIMIENTO') }}</option>
                    <option value="CERRADA">{{ t('dashboard.riskSections.status.CERRADA') }}</option>
                  </select>
                  <span
                    v-else
                    :class="[
                      STATUS_STYLES[item.estado].bg,
                      STATUS_STYLES[item.estado].text,
                      STATUS_STYLES[item.estado].border,
                    ]"
                    class="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase"
                  >
                    {{ t(`dashboard.riskSections.status.${item.estado}`) }}
                  </span>
                </td>
              </tr>
              <tr v-if="nonConformities.length === 0">
                <td colspan="6" class="px-4 py-6 text-center text-sm text-navy-700/60">
                  {{ t('dashboard.riskSections.recomendacionesEmpty') }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
