<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-vue-next'
import {
  getAdminNonConformitiesPaginated,
  createNonConformity,
  updateNonConformity,
  deleteNonConformity,
  DashboardRequestError,
} from '@/services/dashboard.service'
import { PRIORITY_STYLES, STATUS_STYLES } from '@/utils/nonConformityStyles'
import { formatDate } from '@/utils/formatDate'
import type { Locale } from '@/i18n'
import type {
  NonConformity,
  NonConformityInput,
  NonConformityOrigin,
  NonConformityPriority,
  NonConformityStatus,
  NonConformityUpdateInput,
} from '@/types/dashboard'
import NonConformityFormModal from './NonConformityFormModal.vue'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'

const props = defineProps<{ organizationId: string; serviceSlug: string }>()
const { t, locale } = useI18n()

const activeTab = ref<'active' | 'history'>('active')
const status = ref<'loading' | 'ready' | 'error'>('loading')
const items = ref<NonConformity[]>([])
const page = ref(1)
const totalPages = ref(1)

const filterEstado = ref<NonConformityStatus | ''>('')
const filterPrioridad = ref<NonConformityPriority | ''>('')
const filterOrigen = ref<NonConformityOrigin | ''>('')

const showFormModal = ref(false)
const editingItem = ref<NonConformity | null>(null)

async function load() {
  status.value = 'loading'
  try {
    const result = await getAdminNonConformitiesPaginated(props.organizationId, props.serviceSlug, {
      page: page.value,
      pageSize: 20,
      deletedOnly: activeTab.value === 'history',
      estado: filterEstado.value || undefined,
      prioridad: filterPrioridad.value || undefined,
      origen: filterOrigen.value || undefined,
    })
    items.value = result.items
    totalPages.value = result.totalPages
    status.value = 'ready'
  } catch (err) {
    status.value = 'error'
    useToast().error(err instanceof DashboardRequestError ? err.message : t('dashboard.nonConformitiesAdmin.loadError'))
  }
}

onMounted(load)
watch(activeTab, () => {
  page.value = 1
  load()
})
watch([filterEstado, filterPrioridad, filterOrigen], () => {
  page.value = 1
  load()
})
watch(page, load)
watch(() => props.organizationId, () => {
  page.value = 1
  load()
})

function openCreate() {
  editingItem.value = null
  showFormModal.value = true
}

function openEdit(item: NonConformity) {
  editingItem.value = item
  showFormModal.value = true
}

async function handleSubmitCreate(input: NonConformityInput) {
  await createNonConformity(props.organizationId, props.serviceSlug, input)
  showFormModal.value = false
  await load()
}

async function handleSubmitEdit(input: NonConformityUpdateInput) {
  if (!editingItem.value) return
  await updateNonConformity(props.organizationId, props.serviceSlug, editingItem.value.id, input)
  showFormModal.value = false
  await load()
}

async function handleDelete(item: NonConformity) {
  const confirmed = await useConfirm().confirm({
    title: t('dashboard.nonConformitiesAdmin.delete'),
    message: t('dashboard.nonConformitiesAdmin.deleteConfirm'),
    confirmLabel: t('dashboard.nonConformitiesAdmin.delete'),
  })
  if (!confirmed) return
  try {
    await deleteNonConformity(props.organizationId, props.serviceSlug, item.id)
    await load()
  } catch {
    useToast().error(t('dashboard.nonConformitiesAdmin.deleteError'))
  }
}
</script>

<template>
  <div class="grid gap-4">
    <p class="text-sm text-navy-700 opacity-70">{{ t('dashboard.nonConformitiesAdmin.subtitle') }}</p>

    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex gap-2">
        <button
          type="button"
          class="rounded-sm px-3 py-1.5 text-sm font-medium transition-colors"
          :class="activeTab === 'active' ? 'bg-navy-900 text-cream' : 'border border-line-strong text-navy-700'"
          @click="activeTab = 'active'"
        >
          {{ t('dashboard.nonConformitiesAdmin.tabActive') }}
        </button>
        <button
          type="button"
          class="rounded-sm px-3 py-1.5 text-sm font-medium transition-colors"
          :class="activeTab === 'history' ? 'bg-navy-900 text-cream' : 'border border-line-strong text-navy-700'"
          @click="activeTab = 'history'"
        >
          {{ t('dashboard.nonConformitiesAdmin.tabHistory') }}
        </button>
      </div>

      <button
        type="button"
        class="rounded-sm bg-[var(--org-primary,#0b1a33)] px-4 py-2 text-sm font-semibold text-cream hover:opacity-90"
        @click="openCreate"
      >
        {{ t('dashboard.nonConformitiesAdmin.newButton') }}
      </button>
    </div>

    <div class="flex flex-wrap gap-3 rounded-lg border border-line-strong bg-white p-3">
      <select v-model="filterEstado" class="rounded-sm border border-line-strong bg-white px-3 py-2 text-sm text-navy-900">
        <option value="">{{ t('dashboard.nonConformitiesAdmin.filterEstadoAll') }}</option>
        <option value="ABIERTA">{{ t('dashboard.riskSections.status.ABIERTA') }}</option>
        <option value="EN_SEGUIMIENTO">{{ t('dashboard.riskSections.status.EN_SEGUIMIENTO') }}</option>
        <option value="CERRADA">{{ t('dashboard.riskSections.status.CERRADA') }}</option>
      </select>
      <select v-model="filterPrioridad" class="rounded-sm border border-line-strong bg-white px-3 py-2 text-sm text-navy-900">
        <option value="">{{ t('dashboard.nonConformitiesAdmin.filterPrioridadAll') }}</option>
        <option value="ALTA">{{ t('dashboard.riskSections.priority.ALTA') }}</option>
        <option value="MEDIA">{{ t('dashboard.riskSections.priority.MEDIA') }}</option>
        <option value="BAJA">{{ t('dashboard.riskSections.priority.BAJA') }}</option>
      </select>
      <select v-model="filterOrigen" class="rounded-sm border border-line-strong bg-white px-3 py-2 text-sm text-navy-900">
        <option value="">{{ t('dashboard.nonConformitiesAdmin.filterOrigenAll') }}</option>
        <option value="AUTO">{{ t('dashboard.nonConformitiesAdmin.origenAuto') }}</option>
        <option value="MANUAL">{{ t('dashboard.nonConformitiesAdmin.origenManual') }}</option>
      </select>
    </div>

    <p v-if="status === 'loading'" class="text-sm text-navy-700">{{ t('dashboard.notifications.loading') }}</p>
    <p v-else-if="items.length === 0" class="text-sm text-navy-700/60">
      {{ activeTab === 'active' ? t('dashboard.nonConformitiesAdmin.empty') : t('dashboard.nonConformitiesAdmin.emptyHistory') }}
    </p>

    <div v-else class="overflow-hidden rounded-lg border border-line-strong bg-white">
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="bg-sky-100 text-left text-[11px] uppercase tracking-wide text-navy-700">
              <th class="px-4 py-2.5 font-semibold">{{ t('dashboard.riskSections.prioridad') }}</th>
              <th class="px-4 py-2.5 font-semibold">{{ t('dashboard.riskSections.descripcion') }}</th>
              <th class="px-4 py-2.5 font-semibold">{{ t('dashboard.comparisonTable.variable') }}</th>
              <th class="px-4 py-2.5 font-semibold">{{ t('dashboard.riskSections.zona') }}</th>
              <th class="px-4 py-2.5 font-semibold">{{ t('dashboard.nonConformitiesAdmin.colOrigen') }}</th>
              <th class="px-4 py-2.5 font-semibold">{{ t('dashboard.riskSections.fecha') }}</th>
              <th class="px-4 py-2.5 font-semibold">{{ t('dashboard.comparisonTable.estado') }}</th>
              <th v-if="activeTab === 'active'" class="px-4 py-2.5 font-semibold">
                {{ t('dashboard.nonConformitiesAdmin.colActions') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.id" class="border-t border-line align-top">
              <td class="px-4 py-3">
                <span
                  :class="[PRIORITY_STYLES[item.prioridad].bg, PRIORITY_STYLES[item.prioridad].text, PRIORITY_STYLES[item.prioridad].border]"
                  class="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase"
                >
                  {{ t(`dashboard.riskSections.priority.${item.prioridad}`) }}
                </span>
              </td>
              <td class="max-w-xs px-4 py-3 text-navy-900">{{ item.descripcion }}</td>
              <td class="px-4 py-3 text-navy-900">{{ item.variableNombre }}</td>
              <td class="px-4 py-3 text-navy-700">{{ item.zona ?? '—' }}</td>
              <td class="px-4 py-3 text-navy-700">
                {{ item.origen === 'AUTO' ? t('dashboard.nonConformitiesAdmin.origenAuto') : t('dashboard.nonConformitiesAdmin.origenManual') }}
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-navy-700">{{ formatDate(item.fecha, locale as Locale) }}</td>
              <td class="px-4 py-3">
                <span
                  :class="[STATUS_STYLES[item.estado].bg, STATUS_STYLES[item.estado].text, STATUS_STYLES[item.estado].border]"
                  class="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase"
                >
                  {{ t(`dashboard.riskSections.status.${item.estado}`) }}
                </span>
              </td>
              <td v-if="activeTab === 'active'" class="px-4 py-3">
                <div class="flex gap-2">
                  <button
                    type="button"
                    class="rounded-sm p-1.5 text-navy-700 hover:bg-sky-100"
                    :aria-label="t('dashboard.nonConformitiesAdmin.edit')"
                    @click="openEdit(item)"
                  >
                    <Pencil class="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    class="rounded-sm p-1.5 text-red-600 hover:bg-red-50"
                    :aria-label="t('dashboard.nonConformitiesAdmin.delete')"
                    @click="handleDelete(item)"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="status === 'ready' && totalPages > 1" class="flex items-center justify-between text-sm">
      <button
        type="button"
        class="inline-flex items-center gap-1 rounded-sm border border-line-strong px-3 py-1.5 text-navy-700 disabled:opacity-40"
        :disabled="page <= 1"
        @click="page -= 1"
      >
        <ChevronLeft class="h-4 w-4" />
        {{ t('dashboard.notifications.pagination.prev') }}
      </button>
      <span class="text-navy-700/70">{{ t('dashboard.notifications.pagination.pageOf', { page, totalPages }) }}</span>
      <button
        type="button"
        class="inline-flex items-center gap-1 rounded-sm border border-line-strong px-3 py-1.5 text-navy-700 disabled:opacity-40"
        :disabled="page >= totalPages"
        @click="page += 1"
      >
        {{ t('dashboard.notifications.pagination.next') }}
        <ChevronRight class="h-4 w-4" />
      </button>
    </div>

    <NonConformityFormModal
      v-if="showFormModal"
      :mode="editingItem ? 'edit' : 'create'"
      :initial="editingItem ?? undefined"
      @close="showFormModal = false"
      @submit-create="handleSubmitCreate"
      @submit-edit="handleSubmitEdit"
    />
  </div>
</template>
