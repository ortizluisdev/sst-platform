<script setup lang="ts">
import { onMounted, provide, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AdminNavSidebar from '@/components/dashboard/admin/AdminNavSidebar.vue'
import { listOrganizationsFull } from '@/services/organizations.service'
import { listActiveServices } from '@/services/serviceCatalog.service'
import type { OrganizationListItem, ServiceOption } from '@/types/organization'
import type { TabDef } from '@/types/dashboardTabs'

const route = useRoute()
const router = useRouter()

const lastSync = ref<string | null>(null)
provide('adminLastSync', lastSync)

const organizations = ref<OrganizationListItem[]>([])
// Catálogo activo de servicios (no los contratados por la empresa activa):
// el admin hace CRUD de todo, así que "Operación" siempre lista los 5
// servicios del catálogo — es el cliente quien queda acotado a lo que tiene
// contratado, no el admin.
const operacionServices = ref<ServiceOption[]>([])
provide('operacionServices', operacionServices)

// El selector de empresa ya no vive en el sidebar (ver HigieneIndustrialPanel.vue)
// — se provee hacia abajo junto con la función para cambiarla, mismo patrón
// que operacionServices/operacionActiveTab.
provide('operacionOrganizations', organizations)

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
// de la ruta activa, para que la selección siga siendo válida aunque el
// admin esté viendo Clientes/Servicios, no solo Operación.
const selectedOrgId = ref((route.params.orgId as string) || '')
const selectedServiceSlug = ref((route.params.serviceSlug as string) || '')

// true solo cuando el cambio vino de una interacción explícita del admin
// (elegir empresa desde HigieneIndustrialPanel.vue, o servicio desde el
// sidebar) — eso SIEMPRE navega a Operación. La resolución automática del
// default al montar NO debe sacar al admin de Clientes/Servicios si es ahí
// donde está.
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
  const [orgs, services] = await Promise.all([listOrganizationsFull(), listActiveServices()])
  organizations.value = orgs
  operacionServices.value = services
  if (!selectedOrgId.value && organizations.value.length > 0) {
    selectedOrgId.value = organizations.value[0]!.id
  }
  if (!selectedServiceSlug.value && operacionServices.value.length > 0) {
    selectedServiceSlug.value = operacionServices.value[0]!.slug
  }
  navigateOrCanonicalize()
})

// El catálogo no depende de la empresa activa — cambiar de empresa solo
// necesita re-navegar/canonicalizar la URL, no volver a pedir servicios.
watch(selectedOrgId, navigateOrCanonicalize)

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
  // Ver nota en selectService: si id es igual al ya seleccionado, el watcher
  // no se dispara (Vue no reacciona a una asignación sin cambio real).
  navigateOrCanonicalize()
}

provide('operacionSelectOrg', selectOrg)

function selectService(slug: string) {
  pendingForceNavigate.value = true
  selectedServiceSlug.value = slug
  // Si slug es igual al ya seleccionado (ej. el admin reabre Higiene
  // Industrial tras ver Clientes sin haber cambiado de servicio), el watcher
  // de selectedServiceSlug NO se dispara (Vue no reacciona a una asignación
  // sin cambio real) — sin esto, el clic no navegaría a Operación.
  navigateOrCanonicalize()
}
</script>

<template>
  <!-- enhanced + with-sidebar (2026-08, "navbar/sidebar/footer fijos igual
  que la vista cliente"): header/footer quedan fijos y solo el contenido
  hace scroll (ver DashboardLayout.vue). AdminNavSidebar ahora es `fixed`
  (igual que DashboardSidebar.vue del cliente) — ya no reserva columna de
  grid/flex, por eso el wrapper de acá pasó de `flex lg:flex-row` a un
  `<div>` plano: el padding-left que le deja espacio vive en
  DashboardLayout.vue (sidebarOffsetClass), no acá. -->
  <DashboardLayout :last-sync="lastSync" enhanced with-sidebar>
    <AdminNavSidebar
      :selected-service-slug="selectedServiceSlug"
      :services="operacionServices"
      v-model:active-tab="operacionActiveTab"
      :service-tabs="operacionServiceTabs"
      @update:selected-service-slug="selectService"
    />
    <router-view />
  </DashboardLayout>
</template>
