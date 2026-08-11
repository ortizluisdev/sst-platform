<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { NonConformity, NonConformityStatus } from '@/types/dashboard'
import type { Locale } from '@/i18n'
import { PRIORITY_STYLES, STATUS_STYLES } from '@/utils/nonConformityStyles'
import { formatDate } from '@/utils/formatDate'
import {
  getClientNonConformities,
  getAdminNonConformitiesPaginated,
  updateNonConformity,
} from '@/services/dashboard.service'

const props = defineProps<{
  serviceSlug: string
  /** Mismo criterio que DashboardRiskSections.vue: presente solo en el uso
   * admin, decide qué endpoint usar y si el estado es editable. */
  organizationId?: string
}>()

const { t, locale } = useI18n()
const isAdmin = computed(() => !!props.organizationId)

const items = ref<NonConformity[]>([])
const status = ref<'loading' | 'ready'>('loading')
const page = ref(1)
const totalPages = ref(1)
const PAGE_SIZE = 20

// Listado completo (sin recortar a "más importantes" ni filtrar por
// ABIERTA) — a diferencia del resumen embebido en Hoja 1
// (DashboardRiskSections.vue), esta pestaña es el destino del botón "Ver
// todas": debe mostrar el histórico completo, cualquier estado.
async function load() {
  status.value = 'loading'
  if (isAdmin.value) {
    const result = await getAdminNonConformitiesPaginated(props.organizationId!, props.serviceSlug, {
      page: page.value,
      pageSize: PAGE_SIZE,
    })
    items.value = result.items
    totalPages.value = result.totalPages
  } else {
    // El endpoint cliente no pagina (mismo comportamiento ya establecido en
    // DashboardRiskSections.vue) — se trae todo y se ordena por fecha.
    const all = await getClientNonConformities(props.serviceSlug)
    items.value = [...all].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    totalPages.value = 1
  }
  status.value = 'ready'
}

onMounted(load)

function goToPage(next: number) {
  page.value = next
  load()
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
</script>

<template>
  <div class="grid min-w-0 gap-4">
    <p class="text-sm text-navy-700 opacity-70">{{ t('dashboard.noConformidadesTab.subtitle') }}</p>

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
            <tr v-for="item in items" :key="item.id" class="border-t border-line align-top">
              <td class="px-4 py-3">
                <span
                  :class="[
                    PRIORITY_STYLES[item.prioridad].bg,
                    PRIORITY_STYLES[item.prioridad].text,
                    PRIORITY_STYLES[item.prioridad].border,
                  ]"
                  class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase"
                >
                  <span :class="PRIORITY_STYLES[item.prioridad].dot" class="h-1.5 w-1.5 shrink-0 rounded-full" />
                  {{ t(`dashboard.riskSections.priority.${item.prioridad}`) }}
                </span>
              </td>
              <td class="px-4 py-3 text-navy-900">{{ item.descripcion }}</td>
              <td class="px-4 py-3 text-navy-900">{{ item.variableNombre }}</td>
              <td class="px-4 py-3 text-navy-700">{{ item.zona ?? '—' }}</td>
              <td class="px-4 py-3 text-navy-700">{{ formatDate(item.fecha, locale as Locale) }}</td>
              <td class="px-4 py-3">
                <select
                  v-if="isAdmin"
                  :value="item.estado"
                  class="rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase"
                  :class="[STATUS_STYLES[item.estado].bg, STATUS_STYLES[item.estado].text, STATUS_STYLES[item.estado].border]"
                  @change="changeEstado(item, ($event.target as HTMLSelectElement).value as NonConformityStatus)"
                >
                  <option value="ABIERTA">{{ t('dashboard.riskSections.status.ABIERTA') }}</option>
                  <option value="EN_SEGUIMIENTO">{{ t('dashboard.riskSections.status.EN_SEGUIMIENTO') }}</option>
                  <option value="CERRADA">{{ t('dashboard.riskSections.status.CERRADA') }}</option>
                </select>
                <span
                  v-else
                  :class="[STATUS_STYLES[item.estado].bg, STATUS_STYLES[item.estado].text, STATUS_STYLES[item.estado].border]"
                  class="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase"
                >
                  {{ t(`dashboard.riskSections.status.${item.estado}`) }}
                </span>
              </td>
            </tr>
            <tr v-if="status === 'ready' && items.length === 0">
              <td colspan="6" class="px-4 py-6 text-center text-sm text-navy-700/60">
                {{ t('dashboard.riskSections.recomendacionesEmpty') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="isAdmin && totalPages > 1" class="flex items-center justify-end gap-3 border-t border-line px-4 py-3">
        <button
          type="button"
          class="rounded-sm border border-line-strong px-3 py-1.5 text-xs font-semibold text-navy-700 disabled:opacity-40"
          :disabled="page <= 1"
          @click="goToPage(page - 1)"
        >
          {{ t('dashboard.noConformidadesTab.prevPage') }}
        </button>
        <span class="text-xs text-navy-700/70">{{ t('dashboard.noConformidadesTab.pageOf', { page, totalPages }) }}</span>
        <button
          type="button"
          class="rounded-sm border border-line-strong px-3 py-1.5 text-xs font-semibold text-navy-700 disabled:opacity-40"
          :disabled="page >= totalPages"
          @click="goToPage(page + 1)"
        >
          {{ t('dashboard.noConformidadesTab.nextPage') }}
        </button>
      </div>
    </div>
  </div>
</template>
