<script setup lang="ts">
import { computed, inject, ref, watch, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  ClipboardCheck,
  Truck,
  IdCard,
  Map,
  AlertTriangle,
  History,
  FileText,
  Home,
  SlidersHorizontal,
} from 'lucide-vue-next'
import SectionTitleBanner from '@/components/dashboard/SectionTitleBanner.vue'
import RoadSafetyUploadModal from '@/components/dashboard/roadSafety/RoadSafetyUploadModal.vue'
import RoadSafetyDashboardTab from '@/components/dashboard/roadSafety/RoadSafetyDashboardTab.vue'
import RoadSafetyHoja1Tab from '@/components/dashboard/roadSafety/RoadSafetyHoja1Tab.vue'
import RoadSafetyHoja2Tab from '@/components/dashboard/roadSafety/RoadSafetyHoja2Tab.vue'
import RoadSafetyHoja3Tab from '@/components/dashboard/roadSafety/RoadSafetyHoja3Tab.vue'
import RoadSafetyHoja4Tab from '@/components/dashboard/roadSafety/RoadSafetyHoja4Tab.vue'
import RoadSafetyAlertasTab from '@/components/dashboard/roadSafety/RoadSafetyAlertasTab.vue'
import RoadSafetyHistorialTab from '@/components/dashboard/roadSafety/RoadSafetyHistorialTab.vue'
import RoadSafetyReportesTab from '@/components/dashboard/roadSafety/RoadSafetyReportesTab.vue'
import RoadSafetyConfigTab from '@/components/dashboard/roadSafety/RoadSafetyConfigTab.vue'
import type { TabDef } from '@/types/dashboardTabs'
import type { OrganizationListItem } from '@/types/organization'
import type { Locale } from '@/i18n'
import { serviceLabel } from '@/utils/serviceLabel'

const props = defineProps<{ organizationId: string }>()

const { t, locale } = useI18n()

const organizations = inject<Ref<OrganizationListItem[]>>('operacionOrganizations', ref([]))
const selectOrg = inject<(id: string) => void>('operacionSelectOrg', () => {})

function handleOrgChange(event: Event) {
  selectOrg((event.target as HTMLSelectElement).value)
}

const showUploadModal = ref(false)

// Mismo patrón de acordeón compartido que HigieneIndustrialPanel.vue — ver
// AdminShell.vue (posee estas refs, es el ancestro común con AdminNavSidebar).
const sharedActiveTab = inject<Ref<string>>('operacionActiveTab', ref('dashboard'))
const sharedServiceTabs = inject<Ref<TabDef[]>>('operacionServiceTabs', ref([]))

// "Dashboard" (selector de empresa + carga de Excel) y "Configuración" son
// admin-only, mismo criterio que HigieneIndustrialPanel.vue — se agregan acá
// como primera y última pestaña respectivamente, uniforme con ese panel.
// Hoja1-4 usan `tabsAdmin.*` (nombres descriptivos: Generalidad, Vehículos,
// Personas, Rutograma), NO `tabs.hoja1-4` (que tienen el número "Hoja N ·"
// pensado para el sidebar de CLIENTE) — mismo criterio que Higiene
// Industrial, cuyo sidebar admin nunca numera sus categorías.
const tabs = computed<TabDef[]>(() => [
  { key: 'dashboard', label: t('roadSafety.tabs.dashboardShort'), icon: Home },
  { key: 'hoja1', label: t('roadSafety.tabsAdmin.hoja1'), icon: ClipboardCheck },
  { key: 'hoja2', label: t('roadSafety.tabsAdmin.hoja2'), icon: Truck },
  { key: 'hoja3', label: t('roadSafety.tabsAdmin.hoja3'), icon: IdCard },
  { key: 'hoja4', label: t('roadSafety.tabsAdmin.hoja4'), icon: Map },
  { key: 'alertas', label: t('roadSafety.tabs.alertas'), icon: AlertTriangle },
  { key: 'historial', label: t('roadSafety.tabs.historial'), icon: History },
  { key: 'reportes', label: t('roadSafety.tabs.reportes'), icon: FileText },
  { key: 'configuracion', label: t('roadSafety.tabs.configuracion'), icon: SlidersHorizontal },
])

// Título del banner: mismo criterio que `tabs` arriba (nombres admin sin
// número para hoja1-4). Aparte de `tabs` porque el banner necesita el label
// aunque `sharedActiveTab` no coincida con ningún tab.icon renderizado.
const bannerTabLabel = computed(() => tabs.value.find((tab) => tab.key === sharedActiveTab.value)?.label ?? '')

// Bug reportado 2026-08: el prefijo "Seguridad Vial (MSSV)" quedaba
// hardcodeado en español en el template (nunca pasaba por serviceLabel/t()),
// mientras el resto del banner (bannerTabLabel) sí se traducía — mismo
// patrón que ya usa HigieneIndustrialPanel.vue/DashboardShell.vue para su
// SectionTitleBanner. "(MSSV)" se deja literal en ambos idiomas — el
// acrónimo nunca se traduce en el resto del proyecto (ver es.json/en.json,
// roadSafety.upload.hint).
const bannerTitle = computed(
  () => `${serviceLabel('seguridad-vial', 'Seguridad Vial', locale.value as Locale)} (MSSV) — ${bannerTabLabel.value}`,
)

// Reactivo (no una asignación única): así las etiquetas se actualizan solas
// al cambiar de idioma, y si sharedActiveTab trae una clave de otro panel
// (ej. 'cat:Iluminación' de Higiene Industrial) se resetea a 'dashboard' —
// mismo chequeo que HigieneIndustrialPanel.vue, evita el panel en blanco.
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
      sharedActiveTab.value = 'dashboard'
    }
  },
  { immediate: true },
)

const dashboardRef = ref<InstanceType<typeof RoadSafetyDashboardTab> | null>(null)
const hoja1Ref = ref<InstanceType<typeof RoadSafetyHoja1Tab> | null>(null)
const hoja2Ref = ref<InstanceType<typeof RoadSafetyHoja2Tab> | null>(null)
const hoja3Ref = ref<InstanceType<typeof RoadSafetyHoja3Tab> | null>(null)
const hoja4Ref = ref<InstanceType<typeof RoadSafetyHoja4Tab> | null>(null)
const alertasRef = ref<InstanceType<typeof RoadSafetyAlertasTab> | null>(null)
const historialRef = ref<InstanceType<typeof RoadSafetyHistorialTab> | null>(null)

function reloadAll() {
  dashboardRef.value?.reload()
  hoja1Ref.value?.reload()
  hoja2Ref.value?.reload()
  hoja3Ref.value?.reload()
  hoja4Ref.value?.reload()
  alertasRef.value?.reload()
  historialRef.value?.reload()
}
</script>

<template>
  <div class="grid gap-6">
    <!-- Selector de empresa + botón de carga en línea con el banner (2026-08,
    "que quede uniforme con Higiene Industrial") — antes vivían en una
    tarjeta blanca aparte debajo del banner, con la carga como un bloque
    siempre visible en vez de un botón que abre modal (RoadSafetyUploadCard,
    reemplazada por RoadSafetyUploadModal.vue). Mismo tratamiento visual que
    HigieneIndustrialPanel.vue: select compacto + botón blanco sobre el
    fondo oscuro del banner, solo en "Dashboard". -->
    <SectionTitleBanner :title="bannerTitle">
      <template v-if="sharedActiveTab === 'dashboard'" #actions>
        <label for="roadsafety-org-select" class="sr-only">{{ t('dashboard.adminShell.orgSelectorLabel') }}</label>
        <select
          id="roadsafety-org-select"
          :value="props.organizationId"
          class="rounded-sm border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs font-medium text-cream [color-scheme:dark]"
          @change="handleOrgChange"
        >
          <option v-for="org in organizations" :key="org.id" :value="org.id" class="text-navy-900">
            {{ org.nombre }}
          </option>
        </select>
        <button
          type="button"
          class="rounded-sm bg-white px-3 py-1.5 text-xs font-semibold text-navy-900 hover:opacity-90"
          @click="showUploadModal = true"
        >
          {{ t('roadSafety.upload.openButton') }}
        </button>
      </template>
    </SectionTitleBanner>

    <RoadSafetyUploadModal
      v-if="showUploadModal"
      :organization-id="props.organizationId"
      @uploaded="reloadAll"
      @close="showUploadModal = false"
    />

    <!-- Sin <Transition>: mode="out-in" quedaba "atascado" a medio animar y
    mostraba contenido de la pestaña anterior con el banner ya cambiado —
    mismo problema que el acordeón del sidebar (ver AdminNavSidebar.vue). -->
    <RoadSafetyDashboardTab
      v-if="sharedActiveTab === 'dashboard'"
      ref="dashboardRef"
      :organization-id="props.organizationId"
    />
    <RoadSafetyHoja1Tab
      v-else-if="sharedActiveTab === 'hoja1'"
      ref="hoja1Ref"
      :organization-id="props.organizationId"
    />
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
    <RoadSafetyHistorialTab
      v-else-if="sharedActiveTab === 'historial'"
      ref="historialRef"
      :organization-id="props.organizationId"
    />
    <RoadSafetyReportesTab v-else-if="sharedActiveTab === 'reportes'" :organization-id="props.organizationId" />
    <RoadSafetyConfigTab v-else-if="sharedActiveTab === 'configuracion'" />
  </div>
</template>
