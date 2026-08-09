<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Eye, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-vue-next'
import type { VariableSummary, NonConformity, NonConformityPriority, GlobalCompliance } from '@/types/dashboard'
import type { Locale } from '@/i18n'
import { categoryLabel } from '@/utils/categoryLabel'
import { variableLabel } from '@/utils/variableLabel'
import { formatRange } from '@/utils/formatRange'
import { SEMAPHORE_STYLES, SEMAPHORE_LABEL_KEY } from '@/utils/semaphoreStyles'
import { resolveDisplayStatus } from '@/utils/resolveDisplayStatus'
import { PRIORITY_STYLES } from '@/utils/nonConformityStyles'
import { categoriaEnumFromLabel } from '@/utils/higieneCategorias'
import { roundDisplay } from '@/utils/formatNumber'
import Modal from '@/components/ui/Modal.vue'
import ComplianceRing from './ComplianceRing.vue'
import {
  getClientHeatmap,
  getAdminHeatmap,
  saveHeatmap,
  getClientNonConformities,
  getAdminNonConformitiesPaginated,
  getNonConformityVariableOptions,
  createNonConformity,
  DashboardRequestError,
  type HeatmapImage,
  type HigieneCategoria,
  type NonConformityVariableOption,
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
  /** Labels de las categorías habilitadas de esta organización — ver
   * comentario en ResumenTab.vue/ClientDashboardTab.vue. El carrusel de
   * mapas de calor solo muestra imágenes de estas categorías, y el
   * selector de subida del admin solo ofrece estas — si se habilita una
   * categoría nueva, la opción de subir su imagen aparece de una, sin
   * paso adicional (misma prop reactiva). */
  enabledCategorias: string[]
  /** Para el donut de "Cumplimiento global" junto a la tabla Comparativo —
   * mismo dato que ya alimenta la tarjeta compacta de Hoja 1
   * (dashboard.globalCompliance), sin cálculo nuevo. Antes vivía como un
   * <ComplianceRing> suelto en ResumenTab.vue (admin), reposicionado acá
   * (2026-08) para que quede junto a la tabla en ambos lados — cliente
   * nunca lo tuvo. */
  globalCompliance: GlobalCompliance
}>()

const emit = defineEmits<{ viewAllNonConformities: [] }>()

const { t, locale } = useI18n()
const isAdmin = computed(() => !!props.organizationId)

// --- Comparativo vs. norma (resumen de cada valor cabecera) -------------
// `headlineCards` (prop) siempre trae las 5 entradas — lo arma el padre
// (ResumenTab.vue/ClientDashboardTab.vue) iterando el mapa fijo de 5
// categorías, buscando la variable de cabecera en dashboard.categories (ya
// filtrado por habilitadas) y dejando `variable: undefined` si no la
// encuentra — pero eso pasa TANTO si la categoría está deshabilitada COMO
// si solo le falta esa variable puntual, así que no sirve para decidir si
// la fila se debe mostrar. Filtrar acá, contra enabledCategorias (que sí
// es la lista real de habilitadas), es lo único que evita mostrar una fila
// vacía de una categoría que el cliente ya no tiene contratada.
const filteredHeadlineCards = computed(() =>
  props.headlineCards.filter((card) => props.enabledCategorias.includes(card.categoria)),
)

// --- Mapa de calor (imágenes subidas por el admin, no calculadas) -------
// Una imagen por combinación categoría+zona (2026-08, antes era una sola
// imagen por empresa+servicio — ver ServiceHeatmapImage en el schema).
// Carrusel (2026-08, "carrusel de mapas de calor y filtrado por servicios
// contratados"): antes una lista vertical de tarjetas por categoría, sin
// filtrar por categorías habilitadas.
const enabledCategoriaEnums = computed(() => {
  const set = new Set<HigieneCategoria>()
  for (const label of props.enabledCategorias) {
    const enumValue = categoriaEnumFromLabel(label)
    if (enumValue) set.add(enumValue)
  }
  return set
})

const heatmapImages = ref<HeatmapImage[]>([])
const heatmapZonas = ref<CatalogItem[]>([])
const heatmapUploading = ref(false)
const heatmapInput = ref<HTMLInputElement | null>(null)
const newHeatmapCategoria = ref<HigieneCategoria | ''>(categoriaEnumFromLabel(props.enabledCategorias[0] ?? '') ?? '')
const newHeatmapZonaId = ref('')
const viewingImage = ref<HeatmapImage | null>(null)
const carouselTrack = ref<HTMLElement | null>(null)

/** Solo las categorías contratadas vigentes — una imagen de una categoría
 * recién deshabilitada deja de mostrarse, sin necesidad de eliminarla (si
 * la categoría se vuelve a habilitar, la imagen sigue ahí). */
const carouselImages = computed(() => heatmapImages.value.filter((img) => enabledCategoriaEnums.value.has(img.categoria)))

/** Mismo orden que HIGIENE_CATEGORIAS de siempre, pero recortado a lo
 * habilitado — usado por el selector de "categoría" al subir una imagen
 * nueva. */
const uploadableCategorias = computed(() =>
  (['ESTRES_TERMICO', 'ILUMINACION', 'SONIDO', 'RADIACION_UV', 'VIBRACION'] as HigieneCategoria[]).filter((cat) =>
    enabledCategoriaEnums.value.has(cat),
  ),
)

// Antes se desplazaba un 90% del ancho visible del track — con tarjetas de
// ancho fijo eso casi nunca coincidía con el borde de una tarjeta (scroll-
// snap peleando contra un desplazamiento arbitrario), así que "Continuar"
// a veces se sentía como que no hacía nada o se quedaba a medio camino.
// Ahora se mueve exactamente el ancho de una tarjeta (+ el gap real del
// contenedor, leído del propio DOM en vez de asumir el valor de gap-4).
function scrollCarousel(direction: 'prev' | 'next') {
  const el = carouselTrack.value
  const firstCard = el?.firstElementChild as HTMLElement | null
  if (!el || !firstCard) return
  const gap = parseFloat(getComputedStyle(el).columnGap || '0')
  const step = firstCard.offsetWidth + gap
  el.scrollBy({ left: step * (direction === 'next' ? 1 : -1), behavior: 'smooth' })
}

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
  if (!newHeatmapCategoria.value || !newHeatmapZonaId.value) {
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
        categoria: newHeatmapCategoria.value as HigieneCategoria,
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
const newVariableDefinitionId = ref('')
const newPrioridad = ref<NonConformityPriority>('MEDIA')
const newZona = ref('')
const variableOptions = ref<NonConformityVariableOption[]>([])

async function loadVariableOptions() {
  if (!isAdmin.value) return
  variableOptions.value = await getNonConformityVariableOptions(props.organizationId!, props.serviceSlug)
}

async function submitNew() {
  if (!newDescripcion.value.trim() || !newVariableDefinitionId.value) return
  savingNew.value = true
  try {
    await createNonConformity(props.organizationId!, props.serviceSlug, {
      descripcion: newDescripcion.value.trim(),
      variableDefinitionId: newVariableDefinitionId.value,
      prioridad: newPrioridad.value,
      zona: newZona.value.trim() || undefined,
      estado: 'ABIERTA',
    })
    newDescripcion.value = ''
    newVariableDefinitionId.value = ''
    newZona.value = ''
    newPrioridad.value = 'MEDIA'
    showAddForm.value = false
    await loadNonConformities()
  } finally {
    savingNew.value = false
  }
}


function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString(locale.value === 'en' ? 'en-US' : 'es-CO')
}

onMounted(() => {
  loadHeatmap()
  loadHeatmapZonas()
  loadNonConformities()
  loadVariableOptions()
})
</script>

<template>
  <!-- min-w-0: el padre (ResumenTab.vue/ClientDashboardTab.vue) es un
  "grid gap-6" de una sola columna sin ancho fijo — por default un ítem de
  grid tiene min-width:auto (el min-content de su contenido), así que
  cualquier hijo con un ancho mínimo grande (ej. el carrusel de mapas de
  calor) empuja esta columna, y con ella toda la página, más ancha de lo
  que debería. min-w-0 corta esa cascada en la raíz de este componente. -->
  <div class="grid min-w-0 gap-8">
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
            :disabled="uploadableCategorias.length === 0"
          >
            <option v-if="uploadableCategorias.length === 0" value="">{{ t('dashboard.riskSections.heatmapNoCategorias') }}</option>
            <option v-for="cat in uploadableCategorias" :key="cat" :value="cat">
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
            :disabled="heatmapUploading || heatmapZonas.length === 0 || uploadableCategorias.length === 0"
            @click="heatmapInput?.click()"
          >
            {{ heatmapUploading ? t('dashboard.riskSections.heatmapUploading') : t('dashboard.riskSections.heatmapUploadLabel') }}
          </button>
        </div>
      </div>

      <p v-if="carouselImages.length === 0" class="rounded-lg border border-line-strong bg-white p-6 text-center text-sm text-navy-700/60">
        {{ t('dashboard.riskSections.heatmapEmpty') }}
      </p>
      <div v-else class="relative">
        <button
          type="button"
          class="absolute left-0 top-1/2 z-10 -translate-x-3 -translate-y-1/2 rounded-full border border-line-strong bg-white p-1.5 text-navy-700 shadow-sm hover:bg-cream"
          :aria-label="t('dashboard.riskSections.heatmapCarouselPrev')"
          @click="scrollCarousel('prev')"
        >
          <ChevronLeft class="h-4 w-4" />
        </button>
        <div
          ref="carouselTrack"
          class="flex min-w-0 snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-1"
          style="scrollbar-width: none"
        >
          <div
            v-for="img in carouselImages"
            :key="img.id"
            class="w-[calc((100%-2rem)/3)] shrink-0 snap-start overflow-hidden rounded-lg border border-line-strong bg-white"
          >
            <!-- loading="lazy" + decoding="async": estas imágenes pueden
            pesar hasta 3MB crudos (ver heatmapImageSchema) — decodificarlas
            de forma síncrona en el hilo principal podía "congelar" el
            layout un instante y luego saltar al tamaño final una vez
            terminaba, dando la sensación de que la pantalla arranca chica
            y de golpe se agranda. bg-cream reserva el espacio con un color
            neutro mientras decodifica, en vez de quedar en blanco. -->
            <img
              :src="img.imageBase64"
              alt=""
              loading="lazy"
              decoding="async"
              class="h-40 w-full bg-cream object-cover"
            />
            <div class="p-3">
              <p class="text-xs font-semibold uppercase tracking-wide text-navy-700">
                {{ t(`clients.categoryConfig.categorias.${img.categoria}`) }}
              </p>
              <p class="mt-0.5 text-xs text-navy-700/60">{{ img.zonaNombre }}</p>
              <button
                type="button"
                class="mt-2 inline-flex items-center gap-1.5 rounded-sm border border-line-strong px-2.5 py-1.5 text-xs font-semibold text-navy-700 hover:bg-cream"
                @click="viewingImage = img"
              >
                <Eye class="h-3.5 w-3.5" />
                {{ t('dashboard.riskSections.heatmapView') }}
              </button>
            </div>
          </div>
        </div>
        <button
          type="button"
          class="absolute right-0 top-1/2 z-10 -translate-y-1/2 translate-x-3 rounded-full border border-line-strong bg-white p-1.5 text-navy-700 shadow-sm hover:bg-cream"
          :aria-label="t('dashboard.riskSections.heatmapCarouselNext')"
          @click="scrollCarousel('next')"
        >
          <ChevronRight class="h-4 w-4" />
        </button>
      </div>

      <Modal
        v-if="viewingImage"
        :title="t(`clients.categoryConfig.categorias.${viewingImage.categoria}`)"
        max-width="2xl"
        @close="viewingImage = null"
      >
        <img
          :src="viewingImage.imageBase64"
          alt=""
          decoding="async"
          class="mt-4 max-h-[70vh] w-full rounded-sm object-contain"
        />
        <p v-if="viewingImage.zonaNombre" class="mt-3 text-sm text-navy-700">
          <span class="font-semibold text-navy-900">{{ t('dashboard.riskSections.heatmapZonaLabel') }}:</span>
          {{ viewingImage.zonaNombre }}
        </p>
      </Modal>
    </div>

    <!-- Comparativo vs. norma (resumen de cada valor cabecera), con el
    donut de cumplimiento global al lado — mismo dato ya mostrado en la
    tarjeta compacta de indicadores globales, solo reubicado acá para que
    el usuario lo relacione visualmente con el detalle de la tabla. Título
    del anillo AFUERA de su tarjeta (hide-title), igual que el de la tabla
    vecina — adentro (como venía ComplianceRing.vue de por sí) los dos
    títulos quedaban a alturas distintas, desalineados. -->
    <div class="grid gap-4 lg:grid-cols-[240px_1fr] lg:items-start">
      <div>
        <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
          {{ t('dashboard.complianceRing.title') }}
        </p>
        <ComplianceRing :compliance="globalCompliance" hide-title />
      </div>

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
                <tr v-for="{ categoria, variable } in filteredHeadlineCards" :key="categoria" class="border-t border-line">
                  <td class="px-4 py-3 text-navy-900">
                    {{
                      variable
                        ? variableLabel(variable.codigo, variable.nombre, locale as Locale)
                        : categoryLabel(categoria, locale as Locale)
                    }}
                  </td>
                  <td class="px-4 py-3 font-mono text-navy-900">
                    {{ variable ? `${roundDisplay(variable.promedio)} ${variable.unidadMedida}` : '—' }}
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
    </div>

    <!-- Recomendaciones / no conformidades -->
    <div>
      <div class="mb-3 flex items-center justify-between gap-2">
        <p class="text-xs font-semibold uppercase tracking-wide text-navy-700 opacity-70">
          {{ t('dashboard.riskSections.recomendacionesTitle') }}
        </p>
        <div class="flex shrink-0 items-center gap-2">
          <button
            v-if="isAdmin"
            type="button"
            class="rounded-sm border border-line-strong px-3 py-1.5 text-xs font-semibold text-navy-700 hover:bg-cream"
            @click="showAddForm = !showAddForm"
          >
            {{ t('dashboard.riskSections.addButton') }}
          </button>
          <!-- Redirige a la pestaña dedicada "No conformidades" (2026-08) —
          este resumen embebido en Hoja 1 sigue recortado a RESUMEN_LIMIT
          (5, solo ABIERTA); la pestaña dedicada muestra el listado completo,
          sin recortar. -->
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-sm border border-line-strong px-3 py-1.5 text-xs font-semibold text-navy-700 hover:bg-cream"
            @click="emit('viewAllNonConformities')"
          >
            {{ t('dashboard.riskSections.viewAllButton') }}
            <ChevronRight class="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
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
          <select
            v-model="newVariableDefinitionId"
            class="w-full rounded-sm border border-line-strong px-3 py-2 text-sm"
            required
          >
            <option value="" disabled>{{ t('dashboard.nonConformitiesAdmin.form.variablePlaceholder') }}</option>
            <option v-for="option in variableOptions" :key="option.id" :value="option.id">{{ option.nombre }}</option>
          </select>
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

      <!-- Tarjetas en vez de tabla (2026-08, "dejarlo bonito, más visual")
      — este resumen ya viene recortado a lo más urgente (RESUMEN_LIMIT,
      solo ABIERTA); el detalle completo (estado editable para admin,
      histórico, filtros) vive en la pestaña dedicada "No conformidades"
      (botón "Ver todas" arriba). -->
      <div v-if="nonConformities.length > 0" class="flex flex-wrap gap-3">
        <div
          v-for="item in nonConformities"
          :key="item.id"
          class="flex min-w-[240px] flex-1 items-start gap-2.5 rounded-lg border border-line-strong bg-white p-3"
        >
          <span
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
            :class="PRIORITY_STYLES[item.prioridad].bg"
          >
            <AlertTriangle class="h-4 w-4" :class="PRIORITY_STYLES[item.prioridad].text" aria-hidden="true" />
          </span>
          <div class="min-w-0">
            <p class="text-sm text-navy-900">
              <span class="font-semibold">{{ item.variableNombre }}:</span> {{ item.descripcion }}
            </p>
            <p class="mt-0.5 text-[11px] text-navy-700/60">
              {{ item.zona ?? '—' }} · {{ formatFecha(item.fecha) }}
            </p>
          </div>
        </div>
      </div>
      <div v-else class="rounded-lg border border-dashed border-line-strong bg-white px-4 py-6 text-center text-sm text-navy-700/60">
        {{ t('dashboard.riskSections.recomendacionesEmpty') }}
      </div>
    </div>
  </div>
</template>
