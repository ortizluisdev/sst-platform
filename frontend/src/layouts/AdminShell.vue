<script setup lang="ts">
import { onMounted, provide, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AdminNavSidebar from '@/components/dashboard/admin/AdminNavSidebar.vue'
import { listOrganizationsFull } from '@/services/organizations.service'
import { listOrgServices, type ContractedService } from '@/services/dashboard.service'
import type { OrganizationListItem } from '@/types/organization'
import type { TabDef } from '@/types/dashboardTabs'

const route = useRoute()
const router = useRouter()

const lastSync = ref<string | null>(null)
provide('adminLastSync', lastSync)

const organizations = ref<OrganizationListItem[]>([])
const operacionServices = ref<ContractedService[]>([])
provide('operacionServices', operacionServices)

// Estado del acordeón de Higiene Industrial (única con sub-vistas reales
// hoy) — lo posee AdminShell (ancestro común de AdminNavSidebar y del
// router-view) porque provide/inject no puede subir de un hijo profundo
// (HigieneIndustrialPanel, varios niveles abajo del router-view) a un
// hermano (AdminNavSidebar). HigieneIndustrialPanel rellena/limpia estas
// refs; AdminNavSidebar solo las lee/escribe para el acordeón.
const operacionActiveTab = ref('resumen')
const operacionServiceTabs = ref<TabDef[]>([])
provide('operacionActiveTab', operacionActiveTab)
provide('operacionServiceTabs', operacionServiceTabs)

// Estado propio del sidebar (empresa/servicio seleccionados) — independiente
// de la ruta activa, para que el selector siga siendo útil aunque el admin
// esté viendo Empresas/Cuentas/Servicios, no solo Operación.
const selectedOrgId = ref((route.params.orgId as string) || '')
const selectedServiceSlug = ref((route.params.serviceSlug as string) || '')

// true solo cuando el cambio vino de una interacción explícita del admin en
// el sidebar (elegir empresa/servicio) — eso SIEMPRE navega a Operación. La
// resolución automática del default al montar (o al cambiar de empresa) NO
// debe sacar al admin de Empresas/Cuentas/Servicios si es ahí donde está.
const pendingForceNavigate = ref(false)

/** Único punto que efectivamente navega — se llama después de que
 * selectedOrgId Y selectedServiceSlug ya están resueltos, para nunca hacer
 * un push con parámetros incompletos. */
function navigateOrCanonicalize() {
  if (!selectedOrgId.value || !selectedServiceSlug.value) return

  const alreadyThere =
    route.name === 'admin-operacion' &&
    route.params.orgId === selectedOrgId.value &&
    route.params.serviceSlug === selectedServiceSlug.value
  if (alreadyThere) {
    pendingForceNavigate.value = false
    return
  }

  const shouldNavigate = pendingForceNavigate.value || route.name === 'admin-operacion'
  pendingForceNavigate.value = false
  if (!shouldNavigate) return

  router.push({
    name: 'admin-operacion',
    params: { orgId: selectedOrgId.value, serviceSlug: selectedServiceSlug.value },
  })
}

onMounted(async () => {
  organizations.value = await listOrganizationsFull()
  if (!selectedOrgId.value && organizations.value.length > 0) {
    selectedOrgId.value = organizations.value[0]!.id
  }
})

watch(
  selectedOrgId,
  async (id) => {
    if (!id) {
      operacionServices.value = []
      return
    }
    operacionServices.value = await listOrgServices(id)
    if (!operacionServices.value.some((s) => s.slug === selectedServiceSlug.value)) {
      selectedServiceSlug.value = operacionServices.value[0]?.slug ?? ''
    }
    navigateOrCanonicalize()
  },
  { immediate: true },
)

watch(selectedServiceSlug, navigateOrCanonicalize)

// Sincroniza los refs locales si el usuario navega directamente por URL
// (link con :orgId/:serviceSlug, botón atrás/adelante) mientras ya está en
// Operación — evita que el sidebar quede desincronizado de la ruta real.
watch(
  () => [route.params.orgId, route.params.serviceSlug],
  ([newOrgId, newServiceSlug]) => {
    if (route.name !== 'admin-operacion') return
    if (newOrgId && newOrgId !== selectedOrgId.value) selectedOrgId.value = newOrgId as string
    if (newServiceSlug && newServiceSlug !== selectedServiceSlug.value) selectedServiceSlug.value = newServiceSlug as string
  },
)

function selectOrg(id: string) {
  pendingForceNavigate.value = true
  selectedOrgId.value = id
}

function selectService(slug: string) {
  pendingForceNavigate.value = true
  selectedServiceSlug.value = slug
  // Si slug es igual al ya seleccionado (ej. el admin reabre Higiene
  // Industrial tras ver Empresas sin haber cambiado de servicio), el watcher
  // de selectedServiceSlug NO se dispara (Vue no reacciona a una asignación
  // sin cambio real) — sin esto, el clic no navegaría a Operación.
  navigateOrCanonicalize()
}
</script>

<template>
  <DashboardLayout :last-sync="lastSync">
    <div class="flex flex-col gap-6 lg:flex-row lg:items-start">
      <AdminNavSidebar
        :selected-org-id="selectedOrgId"
        :selected-service-slug="selectedServiceSlug"
        :organizations="organizations"
        :services="operacionServices"
        v-model:active-tab="operacionActiveTab"
        :service-tabs="operacionServiceTabs"
        @update:selected-org-id="selectOrg"
        @update:selected-service-slug="selectService"
      />
      <div class="min-w-0 flex-1">
        <router-view />
      </div>
    </div>
  </DashboardLayout>
</template>
