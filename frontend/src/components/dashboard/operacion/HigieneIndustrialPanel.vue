<script setup lang="ts">
import { computed, inject, onMounted, ref, watch, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ShieldAlert, SlidersHorizontal } from 'lucide-vue-next'
import DashboardShell from '@/components/dashboard/DashboardShell.vue'
import SectionTitleBanner from '@/components/dashboard/SectionTitleBanner.vue'
import VariableUploadModal from '@/components/dashboard/VariableUploadModal.vue'
import NonConformitiesAdminTab from '@/components/dashboard/nonConformities/NonConformitiesAdminTab.vue'
import HigieneConfigTab from '@/components/dashboard/higieneConfig/HigieneConfigTab.vue'
import {
  getAdminDashboard,
  getAdminUploadHistory,
  getAdminUploadDetail,
  correctReading as correctReadingApi,
  DashboardRequestError,
} from '@/services/dashboard.service'
import type { DashboardData } from '@/types/dashboard'
import type { TabDef } from '@/types/dashboardTabs'
import type { Locale } from '@/i18n'
import type { OrganizationListItem } from '@/types/organization'
import { buildDashboardTabs } from '@/utils/dashboardTabs'
import { serviceLabel } from '@/utils/serviceLabel'
import { useToast } from '@/composables/useToast'

const SERVICE_SLUG = 'higiene-industrial'

const props = defineProps<{ organizationId: string }>()

const { t, locale } = useI18n()

const lastSync = inject<Ref<string | null> | null>('adminLastSync', null)

// El selector de empresa vive acá (no en el sidebar) — es parte del panel
// operativo, no de la navegación. AdminShell posee la lista y la función
// para cambiarla (mismo patrón de provide/inject que el acordeón).
const organizations = inject<Ref<OrganizationListItem[]>>('operacionOrganizations', ref([]))
const selectOrg = inject<(id: string) => void>('operacionSelectOrg', () => {})

function handleOrgChange(event: Event) {
  selectOrg((event.target as HTMLSelectElement).value)
}

const activeOrgNombre = computed(() => organizations.value.find((org) => org.id === props.organizationId)?.nombre ?? '')

// Acordeón del sidebar admin (Fase C): AdminShell posee estas refs porque es
// el ancestro común de AdminNavSidebar y de este panel (varios niveles abajo
// del router-view) — provide/inject no puede subir de este componente a un
// hermano. Este panel las rellena mientras está montado.
//
// NO se limpia sharedServiceTabs en onUnmounted: la visibilidad ya está
// condicionada por expandedSlug en AdminNavSidebar.vue (un valor viejo nunca
// se llega a mostrar), y limpiarlo acá competía en una carrera con el watch
// del panel que entra al cambiar de servicio — el onUnmounted del panel
// saliente podía correr DESPUÉS de que el que entra ya puso su valor,
// dejando el array en blanco y el acordeón sin sub-ítems.
const sharedActiveTab = inject<Ref<string>>('operacionActiveTab', ref('resumen'))
const sharedServiceTabs = inject<Ref<TabDef[]>>('operacionServiceTabs', ref([]))

const showUploadModal = ref(false)

const status = ref<'loading' | 'ready' | 'error'>('loading')
const dashboard = ref<DashboardData | null>(null)

// "Recomendaciones" y "Configuración" son admin-only — se agregan acá, no en
// buildDashboardTabs() (compartida con el cliente), para no tocar la vista
// cliente. DashboardShell no reconoce estas claves (nunca se les agrega su
// v-else-if, ver comentario en el template) — este panel intercepta esas
// claves antes de delegar a DashboardShell.
//
// "no-conformidades" (buildDashboardTabs) se excluye acá específicamente
// para admin: cubre el mismo terreno que "recomendaciones" pero con menos
// capacidad (solo ver + cambiar estado, sin crear/editar/eliminar/
// historial) — mostrar ambas en el sidebar admin era redundante. El
// cliente sigue viéndola sin cambios (buildDashboardTabs() en sí no se
// tocó, solo se filtra el resultado acá).
const tabs = computed<TabDef[]>(() =>
  dashboard.value
    ? [
        ...buildDashboardTabs(dashboard.value, t, locale.value as Locale).filter((tab) => tab.key !== 'no-conformidades'),
        { key: 'recomendaciones', label: t('dashboard.nonConformitiesAdmin.tabLabel'), icon: ShieldAlert },
        { key: 'configuracion', label: t('dashboard.higieneConfig.tabLabel'), icon: SlidersHorizontal },
      ]
    : [],
)

// Mismo formato que el bannerTitle interno de DashboardShell.vue — las
// pestañas "Recomendaciones" y "Configuración" se renderizan por fuera del
// shell (ver template) así que nunca reciben su SectionTitleBanner; sin
// esto quedaban sin encabezado de servicio/empresa/pestaña.
const sectionBannerTitle = computed(() => {
  if (!dashboard.value) return ''
  const currentTabLabel = tabs.value.find((tab) => tab.key === sharedActiveTab.value)?.label ?? ''
  return [
    serviceLabel(dashboard.value.service.slug, dashboard.value.service.nombre, locale.value as Locale),
    activeOrgNombre.value,
    currentTabLabel,
  ]
    .filter(Boolean)
    .join(' — ')
})

watch(tabs, (value) => {
  sharedServiceTabs.value = value
  // Si venimos de otro panel (ej. Seguridad Vial) sharedActiveTab puede traer
  // una clave que no existe acá ('hoja1', etc.) — DashboardShell no reconoce
  // esa clave y no renderiza nada. Sin este chequeo el panel queda en blanco
  // al volver a Higiene Industrial desde otro servicio.
  if (value.length > 0 && !value.some((tab) => tab.key === sharedActiveTab.value)) {
    sharedActiveTab.value = 'resumen'
  }
})

async function loadDashboard() {
  status.value = 'loading'
  try {
    dashboard.value = await getAdminDashboard(props.organizationId, SERVICE_SLUG)
    if (lastSync) lastSync.value = dashboard.value.lastUpdated
    status.value = 'ready'
  } catch (err) {
    status.value = 'error'
    useToast().error(err instanceof DashboardRequestError ? err.message : t('dashboard.clientView.loadError'))
  }
}

onMounted(loadDashboard)
watch(() => props.organizationId, loadDashboard)

function fetchHistory() {
  return getAdminUploadHistory(props.organizationId, SERVICE_SLUG)
}

function fetchUploadDetail(uploadId: string) {
  return getAdminUploadDetail(props.organizationId, SERVICE_SLUG, uploadId)
}

async function correctReading(readingId: string, valor: number, reason: string) {
  await correctReadingApi(props.organizationId, SERVICE_SLUG, readingId, valor, reason)
  await loadDashboard()
}
</script>

<template>
  <div class="grid gap-6">
    <p v-if="status === 'loading'" class="text-sm text-navy-700">{{ t('dashboard.clientView.loading') }}</p>
    <div v-else-if="dashboard && sharedActiveTab === 'recomendaciones'" class="grid gap-6">
      <SectionTitleBanner :title="sectionBannerTitle" />
      <NonConformitiesAdminTab :organization-id="props.organizationId" :service-slug="SERVICE_SLUG" />
    </div>
    <div v-else-if="dashboard && sharedActiveTab === 'configuracion'" class="grid gap-6">
      <SectionTitleBanner :title="sectionBannerTitle" />
      <HigieneConfigTab :organization-id="props.organizationId" @categories-changed="loadDashboard" />
    </div>
    <DashboardShell
      v-else-if="dashboard"
      :key="props.organizationId"
      v-model:active-tab="sharedActiveTab"
      :dashboard="dashboard"
      :fetch-history="fetchHistory"
      :fetch-upload-detail="fetchUploadDetail"
      hide-sidebar
      :tabs="tabs"
      editable-readings
      :correct-reading="correctReading"
      :org-label="activeOrgNombre"
      :organization-id="props.organizationId"
    >
      <!-- En línea con el banner de ruta (antes: tarjeta blanca aparte
      debajo, dos filas para lo que cabe en una) — select compacto y botón
      con fondo claro, para que se lean bien sobre el fondo oscuro del
      banner en vez de heredar el mismo tono (el botón antes usaba el mismo
      --org-primary que el banner: quedaba casi invisible ahí). -->
      <template v-if="sharedActiveTab === 'resumen'" #banner-actions>
        <label for="operacion-org-select" class="sr-only">{{ t('dashboard.adminShell.orgSelectorLabel') }}</label>
        <select
          id="operacion-org-select"
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
          {{ t('dashboard.uploadForm.openButton') }}
        </button>
      </template>
    </DashboardShell>

    <VariableUploadModal
      v-if="showUploadModal"
      :organization-id="props.organizationId"
      :service-slug="SERVICE_SLUG"
      @uploaded="loadDashboard"
      @close="showUploadModal = false"
    />
  </div>
</template>
