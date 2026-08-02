<script setup lang="ts">
import { computed, inject, ref, watch, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ClipboardCheck, Truck, Users, Map, AlertTriangle } from 'lucide-vue-next'
import SectionTitleBanner from '@/components/dashboard/SectionTitleBanner.vue'
import RoadSafetyUploadCard from '@/components/dashboard/roadSafety/RoadSafetyUploadCard.vue'
import RoadSafetyHoja1Tab from '@/components/dashboard/roadSafety/RoadSafetyHoja1Tab.vue'
import RoadSafetyHoja2Tab from '@/components/dashboard/roadSafety/RoadSafetyHoja2Tab.vue'
import RoadSafetyHoja3Tab from '@/components/dashboard/roadSafety/RoadSafetyHoja3Tab.vue'
import RoadSafetyHoja4Tab from '@/components/dashboard/roadSafety/RoadSafetyHoja4Tab.vue'
import RoadSafetyAlertasTab from '@/components/dashboard/roadSafety/RoadSafetyAlertasTab.vue'
import RoadSafetyReportModal from '@/components/dashboard/roadSafety/RoadSafetyReportModal.vue'
import type { TabDef } from '@/types/dashboardTabs'
import type { OrganizationListItem } from '@/types/organization'
import type { RoadSafetyReportTipo } from '@/types/roadSafety'

const props = defineProps<{ organizationId: string }>()

const { t } = useI18n()

const organizations = inject<Ref<OrganizationListItem[]>>('operacionOrganizations', ref([]))
const selectOrg = inject<(id: string) => void>('operacionSelectOrg', () => {})

function handleOrgChange(event: Event) {
  selectOrg((event.target as HTMLSelectElement).value)
}

// Mismo patrón de acordeón compartido que HigieneIndustrialPanel.vue — ver
// AdminShell.vue (posee estas refs, es el ancestro común con AdminNavSidebar).
const sharedActiveTab = inject<Ref<string>>('operacionActiveTab', ref('hoja1'))
const sharedServiceTabs = inject<Ref<TabDef[]>>('operacionServiceTabs', ref([]))

const tabs = computed<TabDef[]>(() => [
  { key: 'hoja1', label: t('roadSafety.tabs.hoja1'), icon: ClipboardCheck },
  { key: 'hoja2', label: t('roadSafety.tabs.hoja2'), icon: Truck },
  { key: 'hoja3', label: t('roadSafety.tabs.hoja3'), icon: Users },
  { key: 'hoja4', label: t('roadSafety.tabs.hoja4'), icon: Map },
  { key: 'alertas', label: t('roadSafety.tabs.alertas'), icon: AlertTriangle },
])

// Reactivo (no una asignación única): así las etiquetas se actualizan solas
// al cambiar de idioma, y si sharedActiveTab trae una clave de otro panel
// (ej. 'cat:Iluminación' de Higiene Industrial) se resetea a 'hoja1' — mismo
// chequeo que HigieneIndustrialPanel.vue, evita el panel en blanco.
// No se limpia sharedServiceTabs en onUnmounted: la visibilidad del
// acordeón ya está condicionada por expandedSlug (AdminNavSidebar.vue), así
// que un valor "viejo" nunca se llega a mostrar — y limpiarlo acá competía
// en una carrera con el watch({immediate:true}) del panel que entra al
// cambiar de servicio (el onUnmounted del panel saliente podía correr
// DESPUÉS y dejar el array en blanco, ver bug reportado).
watch(
  tabs,
  (value) => {
    sharedServiceTabs.value = value
    if (!value.some((tab) => tab.key === sharedActiveTab.value)) {
      sharedActiveTab.value = 'hoja1'
    }
  },
  { immediate: true },
)

const hoja1Ref = ref<InstanceType<typeof RoadSafetyHoja1Tab> | null>(null)
const hoja2Ref = ref<InstanceType<typeof RoadSafetyHoja2Tab> | null>(null)
const hoja3Ref = ref<InstanceType<typeof RoadSafetyHoja3Tab> | null>(null)
const hoja4Ref = ref<InstanceType<typeof RoadSafetyHoja4Tab> | null>(null)
const alertasRef = ref<InstanceType<typeof RoadSafetyAlertasTab> | null>(null)

function reloadAll() {
  hoja1Ref.value?.reload()
  hoja2Ref.value?.reload()
  hoja3Ref.value?.reload()
  hoja4Ref.value?.reload()
  alertasRef.value?.reload()
}

const showReportModal = ref(false)
const reportTipo = computed<RoadSafetyReportTipo>(() => {
  if (sharedActiveTab.value === 'hoja2') return 'h2'
  if (sharedActiveTab.value === 'hoja3') return 'h3'
  if (sharedActiveTab.value === 'hoja4') return 'h4'
  return 'h1'
})
const showReportButton = computed(() => sharedActiveTab.value !== 'alertas')
</script>

<template>
  <div class="grid gap-6">
    <SectionTitleBanner :title="`Seguridad Vial (MSSV) — ${t(`roadSafety.tabs.${sharedActiveTab}`)}`" />

    <section class="overflow-hidden rounded-lg border border-line-strong bg-white print:hidden">
      <div class="grid gap-3 p-3 sm:grid-cols-[minmax(0,240px)_1fr] sm:items-start sm:p-4">
        <div>
          <label
            for="roadsafety-org-select"
            class="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700"
          >
            {{ t('dashboard.adminShell.orgSelectorLabel') }}
          </label>
          <select
            id="roadsafety-org-select"
            :value="props.organizationId"
            class="w-full rounded-sm border border-line-strong bg-white px-3 py-2 text-sm text-navy-900"
            @change="handleOrgChange"
          >
            <option v-for="org in organizations" :key="org.id" :value="org.id">{{ org.nombre }}</option>
          </select>
        </div>
        <div class="border-t border-line-strong pt-3 sm:border-t-0 sm:border-l sm:pl-4 sm:pt-0">
          <RoadSafetyUploadCard :organization-id="props.organizationId" @uploaded="reloadAll" />
        </div>
      </div>
    </section>

    <div v-if="showReportButton" class="flex justify-end">
      <button
        type="button"
        class="rounded-sm bg-[var(--org-primary,#0b1a33)] px-4 py-2 text-sm font-semibold text-cream hover:opacity-90"
        @click="showReportModal = true"
      >
        {{ t('roadSafety.reports.generarReporte') }}
      </button>
    </div>

    <!-- Sin <Transition>: mode="out-in" quedaba "atascado" a medio animar y
    mostraba contenido de la pestaña anterior con el banner ya cambiado —
    mismo problema que el acordeón del sidebar (ver AdminNavSidebar.vue). -->
    <RoadSafetyHoja1Tab v-if="sharedActiveTab === 'hoja1'" ref="hoja1Ref" :organization-id="props.organizationId" />
    <RoadSafetyHoja2Tab
      v-else-if="sharedActiveTab === 'hoja2'"
      ref="hoja2Ref"
      :organization-id="props.organizationId"
    />
    <RoadSafetyHoja3Tab
      v-else-if="sharedActiveTab === 'hoja3'"
      ref="hoja3Ref"
      :organization-id="props.organizationId"
    />
    <RoadSafetyHoja4Tab
      v-else-if="sharedActiveTab === 'hoja4'"
      ref="hoja4Ref"
      :organization-id="props.organizationId"
    />
    <RoadSafetyAlertasTab
      v-else-if="sharedActiveTab === 'alertas'"
      ref="alertasRef"
      :organization-id="props.organizationId"
    />

    <RoadSafetyReportModal
      v-if="showReportModal"
      :organization-id="props.organizationId"
      :tipo="reportTipo"
      @close="showReportModal = false"
    />
  </div>
</template>
